/**
 * XActions Mastodon Scrapers
 * REST API-based scrapers for Mastodon (any instance)
 * 
 * Uses the public Mastodon REST API with fetch. No Puppeteer needed.
 * Most public data requires no authentication.
 * 
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @see https://xactions.app
 * @license MIT
 */

// ============================================================================
// Client
// ============================================================================

const DEFAULT_INSTANCE = 'https://mastodon.social';

/**
 * Create a Mastodon API client
 * @param {Object} options
 * @param {string} [options.instance] - Instance URL (default: mastodon.social)
 * @param {string} [options.accessToken] - OAuth access token for auth-protected endpoints
 * @returns {Object} Mastodon client
 */
export function createClient(options = {}) {
  const instance = (options.instance || DEFAULT_INSTANCE).replace(/\/$/, '');
  return {
    instance,
    accessToken: options.accessToken || null,
  };
}

/**
 * Internal helper — make a Mastodon API request
 */
async function api(client, path, options = {}) {
  const { params = {}, method = 'GET' } = options;

  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');

  const url = `${client.instance}/api/v1${path}${qs ? '?' + qs : ''}`;

  const headers = {};
  if (client.accessToken) {
    headers['Authorization'] = `Bearer ${client.accessToken}`;
  }

  const res = await fetch(url, { method, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Mastodon API error (${res.status}): ${text}`);
  }
  return res.json();
}

/**
 * Internal helper — look up a user by username
 * Returns the account object
 */
async function lookupAccount(client, username) {
  // Strip leading @
  const handle = username.replace(/^@/, '');

  // Try the v1 lookup endpoint first (Mastodon 3.4+)
  try {
    const data = await api(client, '/accounts/lookup', {
      params: { acct: handle },
    });
    return data;
  } catch {
    // Fallback: search for the user
    const results = await api(client, '/accounts/search', {
      params: { q: handle, limit: 5, resolve: true },
    });

    const match = results.find(
      (a) =>
        a.acct.toLowerCase() === handle.toLowerCase() ||
        a.username.toLowerCase() === handle.toLowerCase()
    );

    if (!match) throw new Error(`User not found on ${client.instance}: ${username}`);
    return match;
  }
}

// ============================================================================
// Profile Scraper
// ============================================================================

/**
 * Scrape a Mastodon profile
 * @param {Object} client - Mastodon client from createClient()
 * @param {string} username - Mastodon handle (e.g. user or user@instance.social)
 * @returns {Object} Normalized profile data
 */
export async function scrapeProfile(client, username) {
  const account = await lookupAccount(client, username);

  return {
    name: account.display_name || null,
    username: account.acct || null,
    id: account.id || null,
    bio: account.note ? account.note.replace(/<[^>]*>/g, '') : null,
    avatar: account.avatar || null,
    header: account.header || null,
    followers: account.followers_count ?? null,
    following: account.following_count ?? null,
    posts: account.statuses_count ?? null,
    joined: account.created_at || null,
    url: account.url || null,
    bot: account.bot || false,
    locked: account.locked || false,
    fields: (account.fields || []).map((f) => ({
      name: f.name,
      value: f.value?.replace(/<[^>]*>/g, '') || '',
    })),
    platform: 'mastodon',
    instance: client.instance,
  };
}

// ============================================================================
// Followers Scraper
// ============================================================================

/**
 * Scrape followers for a Mastodon user
 */
export async function scrapeFollowers(client, username, options = {}) {
  const { limit = 100, onProgress } = options;

  const account = await lookupAccount(client, username);
  const followers = [];
  let maxId;

  while (followers.length < limit) {
    const pageLimit = Math.min(80, limit - followers.length);
    const params = { limit: pageLimit };
    if (maxId) params.max_id = maxId;

    const data = await api(client, `/accounts/${account.id}/followers`, { params });
    if (!data || data.length === 0) break;

    for (const f of data) {
      followers.push({
        username: f.acct,
        id: f.id,
        name: f.display_name || null,
        bio: f.note ? f.note.replace(/<[^>]*>/g, '') : null,
        avatar: f.avatar || null,
        url: f.url || null,
        bot: f.bot || false,
        platform: 'mastodon',
      });
    }

    if (onProgress) {
      onProgress({ scraped: followers.length, limit });
    }

    maxId = data[data.length - 1]?.id;
    if (data.length < pageLimit) break;
  }

  return followers.slice(0, limit);
}

// ============================================================================
// Following Scraper
// ============================================================================

/**
 * Scrape accounts a Mastodon user is following
 */
export async function scrapeFollowing(client, username, options = {}) {
  const { limit = 100, onProgress } = options;

  const account = await lookupAccount(client, username);
  const following = [];
  let maxId;

  while (following.length < limit) {
    const pageLimit = Math.min(80, limit - following.length);
    const params = { limit: pageLimit };
    if (maxId) params.max_id = maxId;

    const data = await api(client, `/accounts/${account.id}/following`, { params });
    if (!data || data.length === 0) break;

    for (const f of data) {
      following.push({
        username: f.acct,
        id: f.id,
        name: f.display_name || null,
        bio: f.note ? f.note.replace(/<[^>]*>/g, '') : null,
        avatar: f.avatar || null,
        url: f.url || null,
        bot: f.bot || false,
        platform: 'mastodon',
      });
    }

    if (onProgress) {
      onProgress({ scraped: following.length, limit });
    }

    maxId = data[data.length - 1]?.id;
    if (data.length < pageLimit) break;
  }

  return following.slice(0, limit);
}

// ============================================================================
// Posts (Toots) Scraper
// ============================================================================

/**
 * Scrape posts from a Mastodon user (equivalent of scrapeTweets)
 */
export async function scrapeTweets(client, username, options = {}) {
  const { limit = 50, includeReplies = false, onProgress } = options;

  const account = await lookupAccount(client, username);
  const posts = [];
  let maxId;

  while (posts.length < limit) {
    const pageLimit = Math.min(40, limit - posts.length);
    const params = {
      limit: pageLimit,
      exclude_replies: !includeReplies,
      exclude_reblogs: false,
    };
    if (maxId) params.max_id = maxId;

    const data = await api(client, `/accounts/${account.id}/statuses`, { params });
    if (!data || data.length === 0) break;

    for (const status of data) {
      posts.push(normalizeStatus(status, client.instance));
    }

    if (onProgress) {
      onProgress({ scraped: posts.length, limit });
    }

    maxId = data[data.length - 1]?.id;
    if (data.length < pageLimit) break;
  }

  return posts.slice(0, limit);
}

// ============================================================================
// Search Posts
// ============================================================================

/**
 * Search Mastodon posts by query
 */
export async function searchTweets(client, query, options = {}) {
  const { limit = 50, onProgress } = options;

  // Use v2 search endpoint
  const qs = new URLSearchParams({
    q: query,
    type: 'statuses',
    limit: String(Math.min(40, limit)),
    resolve: 'true',
  });

  const url = `${client.instance}/api/v2/search?${qs}`;
  const headers = {};
  if (client.accessToken) {
    headers['Authorization'] = `Bearer ${client.accessToken}`;
  }

  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`Mastodon search error (${res.status}): ${await res.text()}`);
  }
  const data = await res.json();

  const posts = (data.statuses || []).map((s) => normalizeStatus(s, client.instance));

  if (onProgress) {
    onProgress({ scraped: posts.length, limit });
  }

  return posts.slice(0, limit);
}

// ============================================================================
// Hashtag Timeline
// ============================================================================

/**
 * Scrape posts from a hashtag timeline
 */
export async function scrapeHashtag(client, hashtag, options = {}) {
  const { limit = 50, onProgress } = options;
  const tag = hashtag.replace(/^#/, '');

  const posts = [];
  let maxId;

  while (posts.length < limit) {
    const pageLimit = Math.min(40, limit - posts.length);
    const params = { limit: pageLimit };
    if (maxId) params.max_id = maxId;

    const data = await api(client, `/timelines/tag/${encodeURIComponent(tag)}`, { params });
    if (!data || data.length === 0) break;

    for (const status of data) {
      posts.push(normalizeStatus(status, client.instance));
    }

    if (onProgress) {
      onProgress({ scraped: posts.length, limit });
    }

    maxId = data[data.length - 1]?.id;
    if (data.length < pageLimit) break;
  }

  return posts.slice(0, limit);
}

// ============================================================================
// Trending
// ============================================================================

/**
 * Scrape trending topics from a Mastodon instance
 */
export async function scrapeTrending(client, options = {}) {
  const { limit = 20 } = options;

  // Trending tags
  const tags = await api(client, '/trends/tags', { params: { limit } });

  return (tags || []).map((t) => ({
    topic: `#${t.name}`,
    posts: t.history?.[0]?.uses || '0',
    accounts: t.history?.[0]?.accounts || '0',
    url: t.url || `${client.instance}/tags/${t.name}`,
    platform: 'mastodon',
  }));
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Normalize a Mastodon status to common post format
 */
function normalizeStatus(status, instance) {
  const images = (status.media_attachments || [])
    .filter((m) => m.type === 'image')
    .map((m) => m.url || m.preview_url);

  const hasVideo = (status.media_attachments || []).some(
    (m) => m.type === 'video' || m.type === 'gifv'
  );

  return {
    id: status.id,
    text: status.content ? status.content.replace(/<[^>]*>/g, '') : null,
    timestamp: status.created_at || null,
    likes: status.favourites_count ?? 0,
    reposts: status.reblogs_count ?? 0,
    replies: status.replies_count ?? 0,
    url: status.url || null,
    author: status.account?.acct || null,
    media: {
      images,
      hasVideo,
    },
    isRepost: !!status.reblog,
    sensitive: status.sensitive || false,
    visibility: status.visibility || 'public',
    platform: 'mastodon',
    instance,
  };
}

// ============================================================================
// Default Export
// ============================================================================

export default {
  createClient,
  scrapeProfile,
  scrapeFollowers,
  scrapeFollowing,
  scrapeTweets,
  searchTweets,
  scrapeHashtag,
  scrapeTrending,
};
