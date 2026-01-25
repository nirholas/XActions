import { PrismaClient } from '@prisma/client';
import { getTwitterClient } from '../../routes/twitter.js';

const prisma = new PrismaClient();

/**
 * Follow users who engaged (liked/retweeted) with specific tweets
 * Uses Twitter API when OAuth tokens available
 */
async function processFollowEngagers({ operationId, userId, config }, isCancelled = () => false) {
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
      tweetId,         // Tweet ID to get engagers from
      tweetUrl,        // Or tweet URL (we'll extract ID)
      engagementType = 'likes', // 'likes' or 'retweets'
      maxFollows = 50,
      dryRun = false,
      whitelist = []   // Users to skip
    } = config;

    const meResponse = await client.get('/users/me');
    const myTwitterId = meResponse.data.data.id;

    // Extract tweet ID from URL if needed
    const targetTweetId = tweetId || (tweetUrl ? tweetUrl.split('/status/')[1]?.split('?')[0] : null);
    
    if (!targetTweetId) {
      throw new Error('Either tweetId or tweetUrl must be provided');
    }

    // Get engagers
    let engagers = [];
    const endpoint = engagementType === 'likes' 
      ? `/tweets/${targetTweetId}/liking_users`
      : `/tweets/${targetTweetId}/retweeted_by`;

    const engagersResponse = await client.get(endpoint, {
      params: {
        max_results: 100,
        'user.fields': 'username,public_metrics'
      }
    });
    engagers = engagersResponse.data.data || [];

    // Filter out whitelist and already following
    const whitelistLower = whitelist.map(u => u.toLowerCase());
    const filteredEngagers = engagers.filter(e => 
      !whitelistLower.includes(e.username.toLowerCase())
    );

    let followedCount = 0;
    const followedUsers = [];
    const errors = [];

    for (const engager of filteredEngagers) {
      if (isCancelled()) {
        console.log(`🛑 Job ${operationId} cancelled`);
        break;
      }

      if (followedCount >= maxFollows) break;

      try {
        if (!dryRun) {
          await client.post(`/users/${myTwitterId}/following`, {
            target_user_id: engager.id
          });
          followedCount++;
          
          followedUsers.push({
            id: engager.id,
            username: engager.username
          });

          // Rate limiting: wait 2-4 seconds between follows
          await new Promise(resolve => 
            setTimeout(resolve, 2000 + Math.random() * 2000)
          );
        } else {
          followedUsers.push({
            id: engager.id,
            username: engager.username,
            dryRun: true
          });
        }
      } catch (error) {
        // Check if already following
        if (error.message?.includes('already')) {
          followedUsers.push({
            id: engager.id,
            username: engager.username,
            alreadyFollowing: true
          });
        } else {
          errors.push({
            username: engager.username,
            error: error.message
          });
        }
      }
    }

    return {
      success: true,
      followedCount: dryRun ? 0 : followedCount,
      totalEngagers: engagers.length,
      followedUsers: followedUsers.slice(0, 50),
      errors: errors.slice(0, 10),
      dryRun,
      cancelled: isCancelled()
    };
  } catch (error) {
    console.error('Follow engagers error:', error);
    throw error;
  }
}

export { processFollowEngagers };
