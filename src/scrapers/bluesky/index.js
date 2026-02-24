/**
 * XActions Bluesky Scrapers
 * AT Protocol-based scrapers for Bluesky (bsky.social)
 * 
 * Uses the official @atproto/api package. No Puppeteer needed.
 * Public data requires no authentication.
 * 
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @see https://xactions.app
 * @license MIT
 */

// ============================================================================
// AT Protocol Client
// ============================================================================

const DEFAULT_SERVICE = 'https://public.api.bsky.app';

/**
 * Create a Bluesky API agent
 * Uses @atproto/api if installed, otherwise falls back to fetch-based client.
 * @param {Object} options
 * @param {string} [options.service] - PDS URL (default: public API)
 * @param {string} [options.identifier] - Handle or DID for login
 * @param {string} [options.password] - App password for login
 * @returns {Object} Bluesky agent
 */
export async function createAgent(options = {}) {
  const service = options.service || DEFAULT_SERVICE;

  try {
    const { BskyAgent } = await import('@atproto/api');
    const agent = new BskyAgent({ service });

    if (options.identifier && options.password) {
      await agent.login({
        identifier: options.identifier,
        password: options.password,
      });
    }

    return { agent, type: 'sdk' };
  } catch {
    // Fallback to fetch-based client when @atproto/api is not installed
    return {
      service,
      identifier: options.identifier,
      password: options.password,
      type: 'fetch',
    };
  }
}

/**
 * Internal helper — resolve a Bluesky handle to a DID
 */
async function resolveHandle(client, handle) {
  if (handle.startsWith('did:')) return handle;

  if (client.type === 'sdk') {
    const res = await client.agent.resolveHandle({ handle });
    return res.data.did;
  }

  const url = `${client.service}/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to resolve handle: ${handle}`);
  const data = await res.json();
  return data.did;
}

/**
 * Internal helper — call an XRPC method
 */
async function xrpc(client, nsid, params = {}) {
  if (client.type === 'sdk') {
    // Use the SDK agent for the request
    const method = nsid.split('.').reduce((obj, key) => obj?.[key], client.agent.api);
    if (typeof method === 'function') {
      const res = await method(params);
      return res.data;
    }
    // Fallback to generic call
    const res = await client.agent.api.app.bsky.actor.getProfile(params);
    return res.data;
  }

  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');

  const url = `${client.service}/xrpc/${nsid}${qs ? '?' + qs : ''}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Bluesky API error (${res.status}): ${text}`);
  }
  return res.json();
}

// ============================================================================
// Profile Scraper
// ============================================================================

/**
 * Scrape a Bluesky profile
 * @param {Object} client - Bluesky agent from createAgent()
 * @param {string} username - Bluesky handle (e.g. user.bsky.social) or DID
 * @returns {Object} Normalized profile data
 */
export async function scrapeProfile(client, username) {
  const handle = username.replace(/^@/, '');

  const data = await xrpc(client, 'app.bsky.actor.getProfile', { actor: handle });

  return {
    name: data.displayName || null,
    username: data.handle || null,
    did: data.did || null,
    bio: data.description || null,
    avatar: data.avatar || null,
    banner: data.banner || null,
    followers: data.followersCount ?? null,
    following: data.followsCount ?? null,
    posts: data.postsCount ?? null,
    joined: data.createdAt || null,
    labels: (data.labels || []).map((l) => l.val),
    platform: 'bluesky',
  };
}

// ============================================================================
// Followers Scraper
// ============================================================================

/**
 * Scrape followers for a Bluesky user
 * @param {Object} client - Bluesky agent
 * @param {string} username - Bluesky handle
 * @param {Object} options
 * @returns {Array} List of follower objects
 */
export async function scrapeFollowers(client, username, options = {}) {
  const { limit = 100, onProgress } = options;
  const handle = username.replace(/^@/, '');

  const followers = [];
  let cursor;

  while (followers.length < limit) {
    const pageLimit = Math.min(100, limit - followers.length);
    const data = await xrpc(client, 'app.bsky.graph.getFollowers', {
      actor: handle,
      limit: pageLimit,
      cursor,
    });

    if (!data.followers || data.followers.length === 0) break;

    for (const f of data.followers) {
      followers.push({
        username: f.handle,
        did: f.did,
        name: f.displayName || null,
        bio: f.description || null,
        avatar: f.avatar || null,
        platform: 'bluesky',
      });
    }

    if (onProgress) {
      onProgress({ scraped: followers.length, limit });
    }

    cursor = data.cursor;
    if (!cursor) break;
  }

  return followers.slice(0, limit);
}

// ============================================================================
// Following Scraper
// ============================================================================

/**
 * Scrape accounts a user is following on Bluesky
 */
export async function scrapeFollowing(client, username, options = {}) {
  const { limit = 100, onProgress } = options;
  const handle = username.replace(/^@/, '');

  const following = [];
  let cursor;

  while (following.length < limit) {
    const pageLimit = Math.min(100, limit - following.length);
    const data = await xrpc(client, 'app.bsky.graph.getFollows', {
      actor: handle,
      limit: pageLimit,
      cursor,
    });

    if (!data.follows || data.follows.length === 0) break;

    for (const f of data.follows) {
      following.push({
        username: f.handle,
        did: f.did,
        name: f.displayName || null,
        bio: f.description || null,
        avatar: f.avatar || null,
        platform: 'bluesky',
      });
    }

    if (onProgress) {
      onProgress({ scraped: following.length, limit });
    }

    cursor = data.cursor;
    if (!cursor) break;
  }

  return following.slice(0, limit);
}

// ============================================================================
// Posts Scraper (equivalent of tweets)
// ============================================================================

/**
 * Scrape posts from a Bluesky user's feed
 */
export async function scrapeTweets(client, username, options = {}) {
  const { limit = 50, onProgress } = options;
  const handle = username.replace(/^@/, '');

  const did = await resolveHandle(client, handle);
  const posts = [];
  let cursor;

  while (posts.length < limit) {
    const pageLimit = Math.min(100, limit - posts.length);
    const data = await xrpc(client, 'app.bsky.feed.getAuthorFeed', {
      actor: did,
      limit: pageLimit,
      cursor,
    });

    if (!data.feed || data.feed.length === 0) break;

    for (const item of data.feed) {
      const post = item.post;
      const record = post.record || {};

      posts.push({
        id: post.uri || null,
        text: record.text || null,
        timestamp: record.createdAt || null,
        likes: post.likeCount ?? 0,
        reposts: post.repostCount ?? 0,
        replies: post.replyCount ?? 0,
        url: post.uri
          ? `https://bsky.app/profile/${post.author?.handle}/post/${post.uri.split('/').pop()}`
          : null,
        author: post.author?.handle || null,
        media: {
          images: (record.embed?.images || []).map((img) => img.image?.ref?.$link
            ? `https://cdn.bsky.app/img/feed_thumbnail/plain/${post.author?.did}/${img.image.ref.$link}@jpeg`
            : null
          ).filter(Boolean),
          hasVideo: false,
        },
        isRepost: !!item.reason,
        platform: 'bluesky',
      });
    }

    if (onProgress) {
      onProgress({ scraped: posts.length, limit });
    }

    cursor = data.cursor;
    if (!cursor) break;
  }

  return posts.slice(0, limit);
}

// ============================================================================
// Search Posts
// ============================================================================

/**
 * Search Bluesky posts by query
 */
export async function searchTweets(client, query, options = {}) {
  const { limit = 50, onProgress } = options;
  const posts = [];
  let cursor;

  while (posts.length < limit) {
    const pageLimit = Math.min(25, limit - posts.length);
    const data = await xrpc(client, 'app.bsky.feed.searchPosts', {
      q: query,
      limit: pageLimit,
      cursor,
    });

    if (!data.posts || data.posts.length === 0) break;

    for (const post of data.posts) {
      const record = post.record || {};
      posts.push({
        id: post.uri || null,
        text: record.text || null,
        author: post.author?.handle || null,
        timestamp: record.createdAt || null,
        likes: post.likeCount ?? 0,
        reposts: post.repostCount ?? 0,
        url: post.uri
          ? `https://bsky.app/profile/${post.author?.handle}/post/${post.uri.split('/').pop()}`
          : null,
        platform: 'bluesky',
      });
    }

    if (onProgress) {
      onProgress({ scraped: posts.length, limit });
    }

    cursor = data.cursor;
    if (!cursor) break;
  }

  return posts.slice(0, limit);
}

// ============================================================================
// Feeds Scraper
// ============================================================================

/**
 * Get posts from a specific Bluesky feed (custom algorithm)
 */
export async function scrapeFeed(client, feedUri, options = {}) {
  const { limit = 50 } = options;
  const posts = [];
  let cursor;

  while (posts.length < limit) {
    const pageLimit = Math.min(100, limit - posts.length);
    const data = await xrpc(client, 'app.bsky.feed.getFeed', {
      feed: feedUri,
      limit: pageLimit,
      cursor,
    });

    if (!data.feed || data.feed.length === 0) break;

    for (const item of data.feed) {
      const post = item.post;
      const record = post.record || {};
      posts.push({
        id: post.uri || null,
        text: record.text || null,
        author: post.author?.handle || null,
        timestamp: record.createdAt || null,
        likes: post.likeCount ?? 0,
        reposts: post.repostCount ?? 0,
        url: post.uri
          ? `https://bsky.app/profile/${post.author?.handle}/post/${post.uri.split('/').pop()}`
          : null,
        platform: 'bluesky',
      });
    }

    cursor = data.cursor;
    if (!cursor) break;
  }

  return posts.slice(0, limit);
}

// ============================================================================
// Default Export
// ============================================================================

export default {
  createAgent,
  scrapeProfile,
  scrapeFollowers,
  scrapeFollowing,
  scrapeTweets,
  searchTweets,
  scrapeFeed,
};
