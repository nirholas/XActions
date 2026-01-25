import { PrismaClient } from '@prisma/client';
import { getTwitterClient } from '../../routes/twitter.js';

const prisma = new PrismaClient();

/**
 * Auto-comment on tweets matching search criteria or from target users
 * Uses Twitter API when OAuth tokens available
 */
async function processAutoComment({ operationId, userId, config }, isCancelled = () => false) {
  try {
    await prisma.operation.update({
      where: { id: operationId },
      data: { status: 'processing', startedAt: new Date() }
    });

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || !user.twitterAccessToken) {
      throw new Error('User not found or Twitter not connected');
    }

    const client = await getTwitterClient(user);
    const { 
      query,              // Search query for tweets
      targetUsername,     // Or target a specific user's tweets
      comments = [],      // Array of comment templates to rotate
      comment,            // Or single comment
      maxComments = 20,
      dryRun = false 
    } = config;

    // Validate comments
    const commentList = comments.length > 0 ? comments : (comment ? [comment] : []);
    if (commentList.length === 0) {
      throw new Error('At least one comment text must be provided');
    }

    let tweets = [];
    let commentedCount = 0;
    const commentedTweets = [];
    const errors = [];

    if (targetUsername) {
      // Get tweets from a specific user
      const userResponse = await client.get(`/users/by/username/${targetUsername}`);
      const targetUserId = userResponse.data.data.id;

      const tweetsResponse = await client.get(`/users/${targetUserId}/tweets`, {
        params: {
          max_results: Math.min(maxComments * 2, 100),
          'tweet.fields': 'created_at,author_id,conversation_id'
        }
      });
      tweets = tweetsResponse.data.data || [];
    } else if (query) {
      // Search for tweets
      const searchResponse = await client.get('/tweets/search/recent', {
        params: {
          query,
          max_results: Math.min(maxComments * 2, 100),
          'tweet.fields': 'created_at,author_id,conversation_id'
        }
      });
      tweets = searchResponse.data.data || [];
    } else {
      throw new Error('Either query or targetUsername must be provided');
    }

    for (const tweet of tweets) {
      if (isCancelled()) {
        console.log(`🛑 Job ${operationId} cancelled`);
        break;
      }

      if (commentedCount >= maxComments) break;

      try {
        // Rotate through comments
        const commentText = commentList[commentedCount % commentList.length];
        
        if (!dryRun) {
          // Post reply using Twitter API v2
          await client.post('/tweets', {
            text: commentText,
            reply: {
              in_reply_to_tweet_id: tweet.id
            }
          });
          commentedCount++;
          
          commentedTweets.push({
            tweetId: tweet.id,
            tweetText: tweet.text?.substring(0, 100),
            comment: commentText
          });

          // Rate limiting: wait 30-60 seconds between comments (Twitter is strict on this)
          await new Promise(resolve => 
            setTimeout(resolve, 30000 + Math.random() * 30000)
          );
        } else {
          commentedTweets.push({
            tweetId: tweet.id,
            tweetText: tweet.text?.substring(0, 100),
            comment: commentText,
            dryRun: true
          });
        }
      } catch (error) {
        errors.push({
          tweetId: tweet.id,
          error: error.message
        });
      }
    }

    return {
      success: true,
      commentedCount: dryRun ? 0 : commentedCount,
      totalFound: tweets.length,
      commentedTweets: commentedTweets.slice(0, 20),
      errors: errors.slice(0, 10),
      dryRun,
      cancelled: isCancelled()
    };
  } catch (error) {
    console.error('Auto-comment error:', error);
    throw error;
  }
}

export { processAutoComment };
