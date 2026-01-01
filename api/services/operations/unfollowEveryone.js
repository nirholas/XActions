const { PrismaClient } = require('@prisma/client');
const { getTwitterClient } = require('../../routes/twitter');

const prisma = new PrismaClient();

async function processUnfollowEveryone({ operationId, userId, config }) {
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
    const { maxUnfollows = 100, dryRun = false } = config;

    // Get authenticated user's Twitter ID
    const meResponse = await client.get('/users/me');
    const myTwitterId = meResponse.data.data.id;

    // Get list of users I'm following
    const followingResponse = await client.get(`/users/${myTwitterId}/following`, {
      params: {
        max_results: Math.min(maxUnfollows, 1000),
        'user.fields': 'username'
      }
    });

    const following = followingResponse.data.data || [];
    let unfollowedCount = 0;
    const unfollowedUsers = [];

    for (const followedUser of following) {
      if (unfollowedCount >= maxUnfollows) break;

      try {
        if (!dryRun) {
          await client.delete(`/users/${myTwitterId}/following/${followedUser.id}`);
          unfollowedCount++;
          
          unfollowedUsers.push({
            id: followedUser.id,
            username: followedUser.username
          });

          // Rate limiting: wait 1 second between unfollows
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`Error unfollowing ${followedUser.username}:`, error.message);
      }
    }

    return {
      unfollowedCount: dryRun ? 0 : unfollowedCount,
      totalFound: following.length,
      unfollowedUsers: unfollowedUsers.slice(0, 50),
      dryRun
    };
  } catch (error) {
    console.error('Unfollow everyone error:', error);
    throw error;
  }
}

module.exports = { processUnfollowEveryone };
