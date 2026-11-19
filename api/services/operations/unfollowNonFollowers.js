// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
import { prisma } from '../../../src/utils/prisma.js';
import { getTwitterClient } from '../../routes/twitter.js';
import { actionBudget } from './actionBudget.js';

// Your followers are read in full before anyone is unfollowed, up to this many
// pages of 1,000. Past it the run stops rather than guess.
const MAX_FOLLOWER_PAGES = 100;

/**
 * Every follower id of the account, paginated. Any failure, a 429 included,
 * throws: a partial list would make real followers look like non-followers.
 */
async function fetchAllFollowerIds(client, twitterId, isCancelled) {
  const ids = new Set();
  let paginationToken;
  for (let page = 0; page < MAX_FOLLOWER_PAGES; page++) {
    if (isCancelled()) return null;
    const response = await client.get(`/users/${twitterId}/followers`, {
      params: { max_results: 1000, ...(paginationToken ? { pagination_token: paginationToken } : {}) }
    });
    for (const follower of response.data.data || []) ids.add(follower.id);
    paginationToken = response.data.meta?.next_token;
    if (!paginationToken) return ids;
  }
  throw new Error(
    `More than ${MAX_FOLLOWER_PAGES * 1000} followers: the full list could not be read, so nobody was unfollowed.`
  );
}

async function processUnfollowNonFollowers({ operationId, userId, config }, isCancelled = () => false, charge) {
  const budget = actionBudget(charge, isCancelled);
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

    // Who follows back is decided from your own complete follower list, read
    // once. It was decided from the first 1,000 followers of each account you
    // follow (one call each, 429s swallowed), so real mutuals were unfollowed.
    const followerIds = await fetchAllFollowerIds(client, myTwitterId, isCancelled);
    if (!followerIds) {
      return { unfollowedCount: 0, nonFollowersFound: 0, nonFollowers: [], dryRun, cancelled: true, stoppedReason: 'cancelled' };
    }

    for (const followedUser of following) {
      if (unfollowedCount >= maxUnfollows) break;
      if (followerIds.has(followedUser.id)) continue;

      nonFollowers.push({
        id: followedUser.id,
        username: followedUser.username
      });

      if (dryRun) continue;
      if (!(await budget.spend('unfollow'))) break;

      try {
        // Unfollow using Twitter API v2
        await client.delete(`/users/${myTwitterId}/following/${followedUser.id}`);
        unfollowedCount++;

        // Rate limiting: wait 1 second between unfollows
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error unfollowing ${followedUser.username}:`, error.message);
      }
    }

    return {
      unfollowedCount: dryRun ? 0 : unfollowedCount,
      nonFollowersFound: nonFollowers.length,
      nonFollowers: nonFollowers.slice(0, 50), // Return first 50
      dryRun,
      cancelled: isCancelled(),
      stoppedReason: budget.stoppedReason
    };
  } catch (error) {
    console.error('❌ Unfollow non-followers error:', error);
    throw error;
  }
}

export { processUnfollowNonFollowers };
