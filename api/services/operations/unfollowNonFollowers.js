const { PrismaClient } = require('@prisma/client');
const { getTwitterClient } = require('../../routes/twitter');

const prisma = new PrismaClient();

async function processUnfollowNonFollowers({ operationId, userId, config }) {
  try {
    // Update operation status
    await prisma.operation.update({
      where: { id: operationId },
      data: { status: 'processing', startedAt: new Date() }
    });

    // Get user with Twitter credentials
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
        max_results: 1000,
        'user.fields': 'username'
      }
    });

    const following = followingResponse.data.data || [];
    const nonFollowers = [];
    let unfollowedCount = 0;

    // Check each following to see if they follow back
    for (const followedUser of following) {
      if (unfollowedCount >= maxUnfollows) break;

      try {
        // Check if they follow me back
        const followersResponse = await client.get(`/users/${followedUser.id}/followers`, {
          params: {
            max_results: 1000
          }
        });

        const followsBack = followersResponse.data.data?.some(
          follower => follower.id === myTwitterId
        );

        if (!followsBack) {
          nonFollowers.push({
            id: followedUser.id,
            username: followedUser.username
          });

          if (!dryRun) {
            // Unfollow using Twitter API v2
            await client.delete(`/users/${myTwitterId}/following/${followedUser.id}`);
            unfollowedCount++;
            
            // Rate limiting: wait 1 second between unfollows
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        // Rate limiting: wait 500ms between checks
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error checking user ${followedUser.username}:`, error.message);
      }
    }

    return {
      unfollowedCount: dryRun ? 0 : unfollowedCount,
      nonFollowersFound: nonFollowers.length,
      nonFollowers: nonFollowers.slice(0, 50), // Return first 50
      dryRun
    };
  } catch (error) {
    console.error('Unfollow non-followers error:', error);
    throw error;
  }
}

module.exports = { processUnfollowNonFollowers };
