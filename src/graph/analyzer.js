/**
 * XActions Social Graph Analyzer
 * Graph algorithms for social network analysis
 *
 * Computes: mutual connections, bridge accounts, clusters,
 * influence scores, ghost followers, orbit analysis.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

// ============================================================================
// Adjacency Index (built once, used by all algorithms)
// ============================================================================

/**
 * Build adjacency lists from a graph's edges
 * @returns {{ outgoing: Map, incoming: Map }}
 */
export function buildAdjacency(graph) {
  const outgoing = new Map(); // username → Set of usernames they follow
  const incoming = new Map(); // username → Set of usernames who follow them

  for (const node of graph.nodes.values()) {
    outgoing.set(node.username, new Set());
    incoming.set(node.username, new Set());
  }

  for (const edge of graph.edges) {
    if (edge.type !== 'follows') continue;
    if (!outgoing.has(edge.source)) outgoing.set(edge.source, new Set());
    if (!incoming.has(edge.target)) incoming.set(edge.target, new Set());
    outgoing.get(edge.source).add(edge.target);
    incoming.get(edge.target).add(edge.source);
  }

  return { outgoing, incoming };
}

// ============================================================================
// Mutual Connections
// ============================================================================

/**
 * Find mutual follows (A follows B AND B follows A)
 */
export function findMutualConnections(graph) {
  const { outgoing } = buildAdjacency(graph);
  const mutuals = [];

  for (const [user, follows] of outgoing) {
    for (const target of follows) {
      const targetFollows = outgoing.get(target);
      if (targetFollows && targetFollows.has(user) && user < target) {
        mutuals.push({ a: user, b: target });
      }
    }
  }

  return mutuals;
}

/**
 * For a specific user, get their mutual connections
 */
export function getMutualConnectionsFor(graph, username) {
  const key = username.toLowerCase().replace(/^@/, '');
  const { outgoing } = buildAdjacency(graph);
  const myFollows = outgoing.get(key) || new Set();
  const mutuals = [];

  for (const target of myFollows) {
    const theirFollows = outgoing.get(target);
    if (theirFollows && theirFollows.has(key)) {
      mutuals.push(target);
    }
  }

  return mutuals;
}

// ============================================================================
// Bridge Accounts
// ============================================================================

/**
 * Find bridge accounts — users who connect otherwise separate clusters.
 * Uses betweenness centrality approximation (BFS-based).
 * High betweenness = bridge.
 */
export function findBridgeAccounts(graph, topN = 10) {
  const nodes = Array.from(graph.nodes.keys());
  const { outgoing, incoming } = buildAdjacency(graph);
  const betweenness = new Map();

  for (const node of nodes) {
    betweenness.set(node, 0);
  }

  // Approximate: sample BFS from a subset of nodes for performance
  const sampleSize = Math.min(nodes.length, 50);
  const sampleNodes = nodes.slice(0, sampleSize);

  for (const source of sampleNodes) {
    // BFS for shortest paths
    const dist = new Map();
    const paths = new Map();  // number of shortest paths
    const pred = new Map();   // predecessors
    const queue = [source];
    const stack = [];

    dist.set(source, 0);
    paths.set(source, 1);

    for (const n of nodes) {
      if (!pred.has(n)) pred.set(n, []);
    }

    while (queue.length > 0) {
      const v = queue.shift();
      stack.push(v);

      // Get undirected neighbors (follows in either direction)
      const neighbors = new Set([
        ...(outgoing.get(v) || []),
        ...(incoming.get(v) || []),
      ]);

      for (const w of neighbors) {
        if (!dist.has(w)) {
          dist.set(w, dist.get(v) + 1);
          queue.push(w);
        }
        if (dist.get(w) === dist.get(v) + 1) {
          paths.set(w, (paths.get(w) || 0) + (paths.get(v) || 1));
          pred.get(w)?.push(v);
        }
      }
    }

    // Back-propagation of dependencies
    const delta = new Map();
    for (const n of nodes) delta.set(n, 0);

    while (stack.length > 0) {
      const w = stack.pop();
      const preds = pred.get(w) || [];
      for (const v of preds) {
        const ratio = (paths.get(v) || 1) / (paths.get(w) || 1);
        delta.set(v, (delta.get(v) || 0) + ratio * (1 + (delta.get(w) || 0)));
      }
      if (w !== source) {
        betweenness.set(w, (betweenness.get(w) || 0) + (delta.get(w) || 0));
      }
    }
  }

  // Sort by betweenness and return top N
  return Array.from(betweenness.entries())
    .map(([username, score]) => ({
      username,
      betweenness: Math.round(score * 100) / 100,
      node: graph.nodes.get(username),
    }))
    .sort((a, b) => b.betweenness - a.betweenness)
    .slice(0, topN);
}

// ============================================================================
// Cluster Detection (Label Propagation)
// ============================================================================

/**
 * Detect clusters using label propagation algorithm.
 * Simple, fast, no external deps.
 */
export function detectClusters(graph, maxIterations = 20) {
  const nodes = Array.from(graph.nodes.keys());
  const { outgoing, incoming } = buildAdjacency(graph);

  // Initialize: each node gets its own label
  const labels = new Map();
  for (let i = 0; i < nodes.length; i++) {
    labels.set(nodes[i], i);
  }

  for (let iter = 0; iter < maxIterations; iter++) {
    let changed = false;

    // Shuffle nodes for randomization
    const shuffled = [...nodes].sort(() => Math.random() - 0.5);

    for (const node of shuffled) {
      // Get undirected neighbors
      const neighbors = new Set([
        ...(outgoing.get(node) || []),
        ...(incoming.get(node) || []),
      ]);

      if (neighbors.size === 0) continue;

      // Count label frequencies among neighbors
      const labelCounts = new Map();
      for (const neighbor of neighbors) {
        const label = labels.get(neighbor);
        if (label !== undefined) {
          labelCounts.set(label, (labelCounts.get(label) || 0) + 1);
        }
      }

      // Pick the most frequent label
      let maxCount = 0;
      let bestLabel = labels.get(node);
      for (const [label, count] of labelCounts) {
        if (count > maxCount) {
          maxCount = count;
          bestLabel = label;
        }
      }

      if (bestLabel !== labels.get(node)) {
        labels.set(node, bestLabel);
        changed = true;
      }
    }

    if (!changed) break;
  }

  // Group nodes by cluster label
  const clusters = new Map();
  for (const [node, label] of labels) {
    if (!clusters.has(label)) clusters.set(label, []);
    clusters.get(label).push(node);
  }

  // Convert to array, sorted by size descending
  return Array.from(clusters.values())
    .filter((c) => c.length > 1) // drop singletons
    .sort((a, b) => b.length - a.length)
    .map((members, i) => ({
      id: i,
      size: members.length,
      members,
      // Pick a representative label from first member's bio topics
      label: `Cluster ${i + 1}`,
    }));
}

// ============================================================================
// Influence Scoring (PageRank-style)
// ============================================================================

/**
 * Compute influence scores using simplified PageRank.
 * Runs within the scraped subgraph.
 */
export function computeInfluenceScores(graph, iterations = 20, dampingFactor = 0.85) {
  const nodes = Array.from(graph.nodes.keys());
  const { outgoing } = buildAdjacency(graph);
  const n = nodes.length;
  if (n === 0) return new Map();

  // Initialize scores equally
  const scores = new Map();
  for (const node of nodes) {
    scores.set(node, 1 / n);
  }

  for (let iter = 0; iter < iterations; iter++) {
    const newScores = new Map();

    for (const node of nodes) {
      let incomingScore = 0;

      // Find who links to this node (follows this user)
      for (const [source, targets] of outgoing) {
        if (targets.has(node)) {
          const outDegree = targets.size;
          if (outDegree > 0) {
            incomingScore += (scores.get(source) || 0) / outDegree;
          }
        }
      }

      newScores.set(node, (1 - dampingFactor) / n + dampingFactor * incomingScore);
    }

    // Update scores
    for (const [node, score] of newScores) {
      scores.set(node, score);
    }
  }

  // Normalize to 0-100
  const maxScore = Math.max(...scores.values()) || 1;
  for (const [node, score] of scores) {
    scores.set(node, Math.round((score / maxScore) * 100 * 100) / 100);
  }

  return scores;
}

/**
 * Get ranked influence leaderboard
 */
export function getInfluenceRanking(graph, topN = 20) {
  const scores = computeInfluenceScores(graph);
  return Array.from(scores.entries())
    .map(([username, score]) => ({
      username,
      influenceScore: score,
      node: graph.nodes.get(username),
    }))
    .sort((a, b) => b.influenceScore - a.influenceScore)
    .slice(0, topN);
}

// ============================================================================
// Ghost Followers
// ============================================================================

/**
 * Detect ghost followers — accounts that follow a user but never interact.
 * In our subgraph context: followers who have no other edges (no mutual, no interaction)
 */
export function findGhostFollowers(graph, username) {
  const key = username.toLowerCase().replace(/^@/, '');
  const { outgoing, incoming } = buildAdjacency(graph);

  const followers = incoming.get(key) || new Set();
  const following = outgoing.get(key) || new Set();

  const ghosts = [];
  for (const follower of followers) {
    // Ghost if: follows the user but the user doesn't follow back
    // AND the follower has very few outgoing edges (low engagement)
    const isGhost = !following.has(follower);
    const followerNode = graph.nodes.get(follower);
    const followerOutDegree = (outgoing.get(follower) || new Set()).size;

    if (isGhost && followerOutDegree <= 2) {
      ghosts.push({
        username: follower,
        mutualFollow: false,
        edgesInGraph: followerOutDegree,
        node: followerNode,
      });
    }
  }

  return ghosts.sort((a, b) => a.edgesInGraph - b.edgesInGraph);
}

// ============================================================================
// Orbit Analysis
// ============================================================================

/**
 * Categorize connections into orbits:
 * - inner circle: mutual follows with high interaction density
 * - active: mutual follows
 * - outer ring: one-way follows
 * - periphery: 2+ degrees away
 */
export function analyzeOrbits(graph, username) {
  const key = username.toLowerCase().replace(/^@/, '');
  const { outgoing, incoming } = buildAdjacency(graph);

  const myFollowing = outgoing.get(key) || new Set();
  const myFollowers = incoming.get(key) || new Set();
  const allConnected = new Set([...myFollowing, ...myFollowers]);

  const orbits = {
    innerCircle: [],  // Mutual follows with high graph connectivity
    active: [],       // Mutual follows
    outerRing: [],    // One-way follows (either direction)
    periphery: [],    // Not directly connected (2+ degrees)
  };

  for (const [nodeUsername] of graph.nodes) {
    if (nodeUsername === key) continue;

    const isMutual = myFollowing.has(nodeUsername) && myFollowers.has(nodeUsername);
    const isConnected = allConnected.has(nodeUsername);

    if (isMutual) {
      // Check if inner circle: mutual AND they share many connections with the seed
      const theirFollowing = outgoing.get(nodeUsername) || new Set();
      const sharedFollowing = [...theirFollowing].filter((x) => myFollowing.has(x)).length;
      const overlapRatio = myFollowing.size > 0 ? sharedFollowing / myFollowing.size : 0;

      if (overlapRatio > 0.15) {
        orbits.innerCircle.push({ username: nodeUsername, overlapRatio: Math.round(overlapRatio * 100) / 100 });
      } else {
        orbits.active.push({ username: nodeUsername });
      }
    } else if (isConnected) {
      orbits.outerRing.push({
        username: nodeUsername,
        direction: myFollowing.has(nodeUsername) ? 'following' : 'follower',
      });
    } else {
      orbits.periphery.push({ username: nodeUsername });
    }
  }

  return {
    seed: key,
    orbits,
    summary: {
      innerCircle: orbits.innerCircle.length,
      active: orbits.active.length,
      outerRing: orbits.outerRing.length,
      periphery: orbits.periphery.length,
    },
  };
}

// ============================================================================
// Full Analysis
// ============================================================================

/**
 * Run all analyses on a graph
 */
export function analyzeGraph(graph, seedUsername) {
  const username = seedUsername || graph.seed;

  return {
    graphId: graph.id,
    seed: username,
    nodesCount: graph.nodes.size,
    edgesCount: graph.edges.length,
    mutualConnections: findMutualConnections(graph),
    bridgeAccounts: findBridgeAccounts(graph),
    clusters: detectClusters(graph),
    influenceRanking: getInfluenceRanking(graph, 20),
    ghostFollowers: findGhostFollowers(graph, username),
    orbits: analyzeOrbits(graph, username),
    analyzedAt: new Date().toISOString(),
  };
}

export default {
  buildAdjacency,
  findMutualConnections,
  getMutualConnectionsFor,
  findBridgeAccounts,
  detectClusters,
  computeInfluenceScores,
  getInfluenceRanking,
  findGhostFollowers,
  analyzeOrbits,
  analyzeGraph,
};
