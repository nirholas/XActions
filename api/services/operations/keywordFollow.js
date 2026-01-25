import { PrismaClient } from '@prisma/client';
import { getTwitterClient } from '../../routes/twitter.js';

const prisma = new PrismaClient();

/**
 * Follow users who tweet about specific keywords/hashtags
 * Uses Twitter API when OAuth tokens available
 */
async function processKeywordFollow({ operationId, userId, config }, isCancelled = () => false) {
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
      keywords = [],    // Keywords/hashtags to search for
      query,            // Or raw search query
      maxFollows = 50,
      minFollowers = 0, // Minimum follower count filter
      maxFollowers,     // Maximum follower count filter
      dryRun = false,
      whitelist = []    // Users to skip
    } = config;

    const meResponse = await client.get('/users/me');
    const myTwitterId = meResponse.data.data.id;

    // Build search query
    const searchQuery = query || keywords.map(k => 
      k.startsWith('#') ? k : `#${k}`
    ).join(' OR ');

    if (!searchQuery) {
      throw new Error('Either keywords or query must be provided');
    }

    // Search for recent tweets
    const searchResponse = await client.get('/tweets/search/recent', {
      params: {
        query: searchQuery,
        max_results: 100,
        'tweet.fields': 'author_id,created_at',
        expansions: 'author_id',
        'user.fields': 'username,public_metrics'
      }
    });

    const tweets = searchResponse.data.data || [];
    const users = searchResponse.data.includes?.users || [];

    // Create user map
    const userMap = new Map(users.map(u => [u.id, u]));

    // Get unique authors with their metrics
    const uniqueAuthors = [];
    const seenAuthors = new Set();

    for (const tweet of tweets) {
      const author = userMap.get(tweet.author_id);
      if (author && !seenAuthors.has(author.id)) {
        seenAuthors.add(author.id);
        
        // Apply follower filters
        const followers = author.public_metrics?.followers_count || 0;
        if (followers >= minFollowers) {
          if (!maxFollowers || followers <= maxFollowers) {
            uniqueAuthors.push(author);
          }
        }
      }
    }

    // Filter whitelist
    const whitelistLower = whitelist.map(u => u.toLowerCase());
    const filteredAuthors = uniqueAuthors.filter(a => 
      !whitelistLower.includes(a.username.toLowerCase())
    );

    let followedCount = 0;
    const followedUsers = [];
    const errors = [];

    for (const author of filteredAuthors) {
      if (isCancelled()) {
        console.log(`🛑 Job ${operationId} cancelled`);
        break;
      }

      if (followedCount >= maxFollows) break;

      try {
        if (!dryRun) {
          await client.post(`/users/${myTwitterId}/following`, {
            target_user_id: author.id
          });
          followedCount++;
          
          followedUsers.push({
            id: author.id,
            username: author.username,
            followers: author.public_metrics?.followers_count
          });

          // Rate limiting: wait 2-4 seconds between follows
          await new Promise(resolve => 
            setTimeout(resolve, 2000 + Math.random() * 2000)
          );
        } else {
          followedUsers.push({
            id: author.id,
            username: author.username,
            followers: author.public_metrics?.followers_count,
            dryRun: true
          });
        }
      } catch (error) {
        if (error.message?.includes('already')) {
          followedUsers.push({
            id: author.id,
            username: author.username,
            alreadyFollowing: true
          });
        } else {
          errors.push({
            username: author.username,
            error: error.message
          });
        }
      }
    }

    return {
      success: true,
      followedCount: dryRun ? 0 : followedCount,
      totalAuthorsFound: uniqueAuthors.length,
      followedUsers: followedUsers.slice(0, 50),
      errors: errors.slice(0, 10),
      searchQuery,
      dryRun,
      cancelled: isCancelled()
    };
  } catch (error) {
    console.error('Keyword follow error:', error);
    throw error;
  }
}

export { processKeywordFollow };
