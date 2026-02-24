/**
 * XActions Social Graph Recommendations
 * Actionable insights derived from graph analysis
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import {
  buildAdjacency,
  getMutualConnectionsFor,
  computeInfluenceScores,
  findGhostFollowers,
  detectClusters,
} from './analyzer.js';

// ============================================================================
// Recommendation Engine
// ============================================================================

/**
 * Generate all recommendations for a user based on their graph
 */
export function getRecommendations(graph, username) {
  const key = username.toLowerCase().replace(/^@/, '');

  return {
    seed: key,
    followSuggestions: suggestFollows(graph, key),
    engageSuggestions: suggestEngage(graph, key),
    competitorWatch: suggestCompetitorWatch(graph, key),
    safeToUnfollow: suggestSafeUnfollow(graph, key),
    generatedAt: new Date().toISOString(),
  };
}

/**
 * "Follow these people" — well-connected accounts in your niche you don't follow.
 * Looks for accounts that your mutual connections follow but you don't.
 */
function suggestFollows(graph, seedUsername, topN = 15) {
  const { outgoing, incoming } = buildAdjacency(graph);
  const myFollowing = outgoing.get(seedUsername) || new Set();
  const scores = computeInfluenceScores(graph);

  // Get accounts followed by people you follow mutually
  const mutuals = getMutualConnectionsFor(graph, seedUsername);
  const candidateScores = new Map();

  for (const mutual of mutuals) {
    const theirFollowing = outgoing.get(mutual) || new Set();
    for (const candidate of theirFollowing) {
      if (candidate === seedUsername) continue;
      if (myFollowing.has(candidate)) continue; // Already following

      const current = candidateScores.get(candidate) || 0;
      candidateScores.set(candidate, current + 1);
    }
  }

  return Array.from(candidateScores.entries())
    .map(([username, sharedConnections]) => ({
      username,
      reason: `Followed by ${sharedConnections} of your mutual connections`,
      sharedConnections,
      influence: scores.get(username) || 0,
      node: graph.nodes.get(username),
    }))
    .sort((a, b) => b.sharedConnections - a.sharedConnections || b.influence - a.influence)
    .slice(0, topN);
}

/**
 * "Engage with these" — high-influence accounts who follow you but you don't interact with.
 */
function suggestEngage(graph, seedUsername, topN = 10) {
  const { outgoing, incoming } = buildAdjacency(graph);
  const myFollowers = incoming.get(seedUsername) || new Set();
  const myFollowing = outgoing.get(seedUsername) || new Set();
  const scores = computeInfluenceScores(graph);

  const suggestions = [];

  for (const follower of myFollowers) {
    const influence = scores.get(follower) || 0;
    const isMutual = myFollowing.has(follower);

    // High-influence followers you don't follow back or rarely interact with
    if (influence > 20) {
      suggestions.push({
        username: follower,
        reason: isMutual
          ? `Mutual follow — high influence (${influence.toFixed(0)}), engage more to strengthen relationship`
          : `Follows you — high influence (${influence.toFixed(0)}), consider engaging and following back`,
        influence,
        mutual: isMutual,
        node: graph.nodes.get(follower),
      });
    }
  }

  return suggestions
    .sort((a, b) => b.influence - a.influence)
    .slice(0, topN);
}

/**
 * "Watch these" — accounts that many high-influence nodes in your graph follow.
 * Potential competitors or important players.
 */
function suggestCompetitorWatch(graph, seedUsername, topN = 10) {
  const { outgoing } = buildAdjacency(graph);
  const myFollowing = outgoing.get(seedUsername) || new Set();
  const scores = computeInfluenceScores(graph);

  // Find accounts followed by many high-influence people you follow
  const watchCandidates = new Map();

  for (const followed of myFollowing) {
    const theirFollowing = outgoing.get(followed) || new Set();
    for (const candidate of theirFollowing) {
      if (candidate === seedUsername) continue;
      if (myFollowing.has(candidate)) continue; // Already watching

      const followerInfluence = scores.get(followed) || 0;
      if (followerInfluence < 10) continue; // Only count high-influence connections

      const current = watchCandidates.get(candidate) || { count: 0, totalInfluence: 0 };
      watchCandidates.set(candidate, {
        count: current.count + 1,
        totalInfluence: current.totalInfluence + followerInfluence,
      });
    }
  }

  return Array.from(watchCandidates.entries())
    .filter(([, data]) => data.count >= 2) // At least 2 of your connections follow them
    .map(([username, data]) => ({
      username,
      reason: `Followed by ${data.count} influential accounts in your network`,
      followedByCount: data.count,
      aggregateInfluence: Math.round(data.totalInfluence),
      node: graph.nodes.get(username),
    }))
    .sort((a, b) => b.aggregateInfluence - a.aggregateInfluence)
    .slice(0, topN);
}

/**
 * "Safe to unfollow" — accounts with zero engagement overlap.
 * Low influence, not mutual, no shared connections.
 */
function suggestSafeUnfollow(graph, seedUsername, topN = 20) {
  const { outgoing, incoming } = buildAdjacency(graph);
  const myFollowing = outgoing.get(seedUsername) || new Set();
  const myFollowers = incoming.get(seedUsername) || new Set();
  const scores = computeInfluenceScores(graph);

  const candidates = [];

  for (const followed of myFollowing) {
    const isMutual = myFollowers.has(followed);
    if (isMutual) continue; // Don't suggest unfollowing mutuals

    const influence = scores.get(followed) || 0;
    if (influence > 30) continue; // Don't suggest unfollowing influential accounts

    // Check shared connections
    const theirFollowing = outgoing.get(followed) || new Set();
    const sharedFollowing = [...theirFollowing].filter((x) => myFollowing.has(x)).length;

    if (sharedFollowing <= 1) {
      candidates.push({
        username: followed,
        reason: 'Not following back, low influence, minimal shared connections',
        influence,
        sharedConnections: sharedFollowing,
        node: graph.nodes.get(followed),
      });
    }
  }

  return candidates
    .sort((a, b) => a.influence - b.influence) // Least influential first
    .slice(0, topN);
}

export default {
  getRecommendations,
};
