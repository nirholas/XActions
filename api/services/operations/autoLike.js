import { PrismaClient } from '@prisma/client';
import { getTwitterClient } from '../../routes/twitter.js';

const prisma = new PrismaClient();

/**
 * Auto-like tweets based on search query or target user's tweets
 * Uses Twitter API when OAuth tokens available
 */
async function processAutoLike({ operationId, userId, config }, isCancelled = () => false) {
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
      query,           // Search query for tweets
      targetUsername,  // Or target a specific user's tweets
      maxLikes = 50,
      dryRun = false 
    } = config;

    const meResponse = await client.get('/users/me');
    const myTwitterId = meResponse.data.data.id;

    let tweets = [];
    let likedCount = 0;
    const likedTweets = [];
    const errors = [];

    if (targetUsername) {
      // Get tweets from a specific user
      const userResponse = await client.get(`/users/by/username/${targetUsername}`);
      const targetUserId = userResponse.data.data.id;

      const tweetsResponse = await client.get(`/users/${targetUserId}/tweets`, {
        params: {
          max_results: Math.min(maxLikes, 100),
          'tweet.fields': 'created_at,author_id'
        }
      });
      tweets = tweetsResponse.data.data || [];
    } else if (query) {
      // Search for tweets
      const searchResponse = await client.get('/tweets/search/recent', {
        params: {
          query,
          max_results: Math.min(maxLikes, 100),
          'tweet.fields': 'created_at,author_id'
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

      if (likedCount >= maxLikes) break;

      try {
        if (!dryRun) {
          await client.post(`/users/${myTwitterId}/likes`, {
            tweet_id: tweet.id
          });
          likedCount++;
          
          likedTweets.push({
            id: tweet.id,
            text: tweet.text?.substring(0, 100)
          });

          // Rate limiting: wait 2-3 seconds between likes
          await new Promise(resolve => 
            setTimeout(resolve, 2000 + Math.random() * 1000)
          );
        } else {
          likedTweets.push({
            id: tweet.id,
            text: tweet.text?.substring(0, 100),
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
      likedCount: dryRun ? 0 : likedCount,
      totalFound: tweets.length,
      likedTweets: likedTweets.slice(0, 20),
      errors: errors.slice(0, 10),
      dryRun,
      cancelled: isCancelled()
    };
  } catch (error) {
    console.error('Auto-like error:', error);
    throw error;
  }
}

export { processAutoLike };
