/**
 * XActions Social Graph Builder
 * Builds graph data structures from scraper data
 *
 * Crawls N degrees deep from a seed account, creating nodes (accounts)
 * and edges (follow relationships, interactions).
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import crypto from 'crypto';

// ============================================================================
// Graph Data Structure
// ============================================================================

/**
 * Create a new empty graph
 */
export function createGraph(seedUsername) {
  return {
    id: crypto.randomUUID(),
    seed: seedUsername,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    nodes: new Map(),   // username → node
    edges: [],          // { source, target, type, weight }
    metadata: {
      nodesCount: 0,
      edgesCount: 0,
      depth: 0,
      status: 'pending', // pending | crawling | complete | failed
      progress: { phase: '', completed: 0, total: 0 },
    },
  };
}

/**
 * Add a node (account) to the graph
 */
export function addNode(graph, username, data = {}) {
  const key = username.toLowerCase().replace(/^@/, '');
  if (graph.nodes.has(key)) {
    // Merge new data into existing node
    const existing = graph.nodes.get(key);
    graph.nodes.set(key, { ...existing, ...data, username: key });
    return graph.nodes.get(key);
  }

  const node = {
    username: key,
    name: data.name || key,
    bio: data.bio || '',
    followers: data.followers || 0,
    following: data.following || 0,
    tweets: data.tweets || 0,
    verified: data.verified || false,
    profileImage: data.profileImage || '',
    joinDate: data.joinDate || null,
    depth: data.depth ?? 0,
    crawled: false,
    ...data,
  };

  graph.nodes.set(key, node);
  graph.metadata.nodesCount = graph.nodes.size;
  return node;
}

/**
 * Add an edge (relationship) to the graph
 */
export function addEdge(graph, source, target, type = 'follows', weight = 1) {
  const s = source.toLowerCase().replace(/^@/, '');
  const t = target.toLowerCase().replace(/^@/, '');

  // Avoid duplicate edges of the same type
  const exists = graph.edges.some(
    (e) => e.source === s && e.target === t && e.type === type
  );
  if (exists) return;

  graph.edges.push({ source: s, target: t, type, weight });
  graph.metadata.edgesCount = graph.edges.length;
}

// ============================================================================
// Graph Building (Crawl Engine)
// ============================================================================

/**
 * Build a social graph by crawling from a seed account
 *
 * @param {string} seedUsername - Starting account
 * @param {object} options
 * @param {number} [options.depth=2] - How many degrees to crawl (1 = direct connections only)
 * @param {number} [options.maxFollowers=200] - Max followers to scrape per user
 * @param {number} [options.maxFollowing=200] - Max following to scrape per user
 * @param {number} [options.maxNodes=500] - Hard cap on total nodes
 * @param {string} [options.authToken] - X/Twitter session cookie
 * @param {function} [options.onProgress] - Progress callback
 * @param {function} [options.isCancelled] - Cancellation check
 * @param {object} [options.scrapers] - Scraper module (injected for testability)
 * @returns {Promise<object>} - The completed graph
 */
export async function buildGraph(seedUsername, options = {}) {
  const {
    depth = 2,
    maxFollowers = 200,
    maxFollowing = 200,
    maxNodes = 500,
    authToken,
    onProgress = () => {},
    isCancelled = () => false,
  } = options;

  // Lazy-load scrapers
  const scrapers = options.scrapers || (await import('../scrapers/index.js')).default;

  const graph = createGraph(seedUsername);
  graph.metadata.depth = depth;
  graph.metadata.status = 'crawling';

  let browser = null;

  try {
    browser = await scrapers.createBrowser();
    const page = await scrapers.createPage(browser);
    if (authToken) {
      await scrapers.loginWithCookie(page, authToken);
    }

    // BFS queue: [{ username, currentDepth }]
    const queue = [{ username: seedUsername.replace(/^@/, ''), currentDepth: 0 }];
    const visited = new Set();

    while (queue.length > 0) {
      if (isCancelled()) {
        graph.metadata.status = 'cancelled';
        break;
      }

      if (graph.nodes.size >= maxNodes) {
        console.log(`📊 Graph node cap reached (${maxNodes})`);
        break;
      }

      const { username, currentDepth } = queue.shift();
      const key = username.toLowerCase();

      if (visited.has(key)) continue;
      visited.add(key);

      onProgress({
        phase: 'crawling',
        username,
        depth: currentDepth,
        nodesCount: graph.nodes.size,
        edgesCount: graph.edges.length,
        queueSize: queue.length,
      });

      try {
        // 1. Scrape profile
        console.log(`📊 Crawling @${username} (depth ${currentDepth}/${depth})`);
        const profile = await scrapers.scrapeProfile(page, username);
        await sleep(1000 + Math.random() * 1500);

        addNode(graph, username, {
          name: profile.name || username,
          bio: profile.bio || '',
          followers: profile.followers || 0,
          following: profile.following || 0,
          tweets: profile.tweets || 0,
          verified: profile.verified || false,
          profileImage: profile.profileImage || profile.avatar || '',
          joinDate: profile.joinDate || null,
          depth: currentDepth,
          crawled: true,
        });

        // Only crawl connections if we haven't hit max depth
        if (currentDepth < depth) {
          // 2. Scrape followers
          const followerLimit = Math.min(maxFollowers, Math.ceil(maxNodes / 3));
          let followers = [];
          try {
            followers = await scrapers.scrapeFollowers(page, username, { limit: followerLimit });
            await sleep(1000 + Math.random() * 1500);
          } catch (err) {
            console.warn(`⚠️ Could not scrape followers for @${username}: ${err.message}`);
          }

          for (const f of followers) {
            if (graph.nodes.size >= maxNodes) break;
            const fUsername = (f.username || f).toString().toLowerCase();
            if (!fUsername) continue;

            addNode(graph, fUsername, {
              name: f.name || fUsername,
              bio: f.bio || '',
              followers: f.followers || 0,
              following: f.following || 0,
              depth: currentDepth + 1,
            });
            addEdge(graph, fUsername, username, 'follows');

            if (!visited.has(fUsername) && currentDepth + 1 < depth) {
              queue.push({ username: fUsername, currentDepth: currentDepth + 1 });
            }
          }

          // 3. Scrape following
          const followingLimit = Math.min(maxFollowing, Math.ceil(maxNodes / 3));
          let followingList = [];
          try {
            followingList = await scrapers.scrapeFollowing(page, username, { limit: followingLimit });
            await sleep(1000 + Math.random() * 1500);
          } catch (err) {
            console.warn(`⚠️ Could not scrape following for @${username}: ${err.message}`);
          }

          for (const f of followingList) {
            if (graph.nodes.size >= maxNodes) break;
            const fUsername = (f.username || f).toString().toLowerCase();
            if (!fUsername) continue;

            addNode(graph, fUsername, {
              name: f.name || fUsername,
              bio: f.bio || '',
              followers: f.followers || 0,
              following: f.following || 0,
              depth: currentDepth + 1,
            });
            addEdge(graph, username, fUsername, 'follows');

            if (!visited.has(fUsername) && currentDepth + 1 < depth) {
              queue.push({ username: fUsername, currentDepth: currentDepth + 1 });
            }
          }
        }
      } catch (err) {
        console.error(`❌ Error crawling @${username}: ${err.message}`);
        // Continue to next user
      }
    }

    await page.close();

    graph.metadata.status = graph.metadata.status === 'cancelled' ? 'cancelled' : 'complete';
    graph.updatedAt = new Date().toISOString();

    onProgress({
      phase: 'complete',
      nodesCount: graph.nodes.size,
      edgesCount: graph.edges.length,
    });

    return graph;
  } catch (error) {
    graph.metadata.status = 'failed';
    graph.metadata.error = error.message;
    throw error;
  } finally {
    if (browser) {
      try { await browser.close(); } catch {}
    }
  }
}

// ============================================================================
// Serialization
// ============================================================================

/**
 * Serialize a graph to a plain JSON-safe object
 */
export function serializeGraph(graph) {
  return {
    id: graph.id,
    seed: graph.seed,
    createdAt: graph.createdAt,
    updatedAt: graph.updatedAt,
    nodes: Array.from(graph.nodes.values()),
    edges: graph.edges,
    metadata: graph.metadata,
  };
}

/**
 * Deserialize from JSON back to a graph with Map for nodes
 */
export function deserializeGraph(data) {
  const graph = {
    id: data.id,
    seed: data.seed,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    nodes: new Map(),
    edges: data.edges || [],
    metadata: data.metadata || {},
  };

  for (const node of (data.nodes || [])) {
    graph.nodes.set(node.username, node);
  }

  return graph;
}

// ============================================================================
// Helpers
// ============================================================================

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default {
  createGraph,
  addNode,
  addEdge,
  buildGraph,
  serializeGraph,
  deserializeGraph,
};
