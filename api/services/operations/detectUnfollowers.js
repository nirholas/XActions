const { PrismaClient } = require('@prisma/client');
const { getTwitterClient } = require('../../routes/twitter');

const prisma = new PrismaClient();

async function processDetectUnfollowers({ operationId, userId }) {
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

    // Get authenticated user's Twitter ID
    const meResponse = await client.get('/users/me');
    const myTwitterId = meResponse.data.data.id;

    // Get previous followers snapshot from last operation
    const lastOperation = await prisma.operation.findFirst({
      where: {
        userId,
        type: 'detectUnfollowers',
        status: 'completed'
      },
      orderBy: { createdAt: 'desc' }
    });

    // Get current followers
    const followersResponse = await client.get(`/users/${myTwitterId}/followers`, {
      params: {
        max_results: 1000,
        'user.fields': 'username,name'
      }
    });

    const currentFollowers = followersResponse.data.data || [];
    const currentFollowerIds = new Set(currentFollowers.map(f => f.id));

    let unfollowers = [];

    if (lastOperation && lastOperation.result) {
      const previousFollowerIds = new Set(
        lastOperation.result.followers?.map(f => f.id) || []
      );

      // Find who unfollowed
      const previousFollowers = lastOperation.result.followers || [];
      unfollowers = previousFollowers.filter(
        f => !currentFollowerIds.has(f.id)
      );
    }

    return {
      currentFollowersCount: currentFollowers.length,
      unfollowersCount: unfollowers.length,
      unfollowers: unfollowers.slice(0, 50),
      followers: currentFollowers.map(f => ({
        id: f.id,
        username: f.username,
        name: f.name
      }))
    };
  } catch (error) {
    console.error('Detect unfollowers error:', error);
    throw error;
  }
}

module.exports = { processDetectUnfollowers };
