// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * XActions Mastodon Scrapers
 * REST API-based scrapers for Mastodon (any instance)
 * 
 * Uses the public Mastodon REST API with fetch. No Puppeteer needed.
 * Most public data requires no authentication.
 * 
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @see https://xactions.app
 * @license Apache-2.0
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
 * Strip HTML tags and decode the entities Mastodon leaves behind.
 *
 * Mastodon serves bios and post bodies as HTML fragments. Removing the tags
 * without decoding entities leaves raw `&amp;`, `&quot;`, and `&#39;` in what
 * is supposed to be plain text, which then shows up verbatim in exports,
 * dashboards, and anything that cross-posts the result.
 *
 * @param {string|null|undefined} html
 * @returns {string|null} Plain text, or null when there was nothing to convert
 */
function toPlainText(html) {
  if (!html) return null;

  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p>/gi, '\n\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .trim();
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
 * The `rel="next"` URL of an RFC 8288 Link header, or null.
 *
 * @param {string|null|undefined} header
 * @returns {string|null}
 */
export function parseNextLink(header) {
  if (!header) return null;
  for (const part of String(header).split(',')) {
    const match = part.match(/<([^>]+)>\s*;(.*)$/);
    if (!match) continue;
    const rels = match[2].match(/rel\s*=\s*"?([^";]+)"?/i);
    if (rels && rels[1].trim().split(/\s+/).includes('next')) return match[1].trim();
  }
  return null;
}

/**
 * Walk an account list (followers, following) page by page.
 *
 * Mastodon pages these by the id of the follow relationship, not of the
 * account, and only says what that id is in the `Link` header's
 * `rel="next"` URL. Using the last account's id as `max_id` skips or repeats
 * accounts, so the next page is always taken from the header.
 *
 * @param {Object} client
 * @param {string} path - e.g. `/accounts/1/followers`
 * @param {number} limit
 * @param {function} [onProgress]
 * @returns {Promise<Object[]>} Raw Mastodon account objects
 */
async function paginateAccounts(client, path, limit, onProgress) {
  const headers = {};
  if (client.accessToken) {
    headers['Authorization'] = `Bearer ${client.accessToken}`;
  }

  const accounts = [];
  const seen = new Set();
  let url = `${client.instance}/api/v1${path}?limit=${Math.min(80, limit)}`;

  while (url && accounts.length < limit) {
    const res = await fetch(url, { method: 'GET', headers });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Mastodon API error (${res.status}): ${text}`);
    }
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) break;

    let added = 0;
    for (const account of data) {
      if (seen.has(account.id)) continue;
      seen.add(account.id);
      accounts.push(account);
      added++;
    }
    if (onProgress) onProgress({ scraped: accounts.length, limit });
    if (added === 0) break;

    const next = parseNextLink(res.headers?.get?.('link'));
    if (!next) break;
    const nextUrl = new URL(next, client.instance);
    nextUrl.searchParams.set('limit', String(Math.min(80, limit - accounts.length)));
    url = nextUrl.toString();
  }

  return accounts.slice(0, limit);
}

/**
 * Normalize a Mastodon account in a follower/following list.
 * @param {Object} f
 * @returns {Object}
 */
function toListedAccount(f) {
  return {
    username: f.acct,
    id: f.id,
    name: f.display_name || null,
    bio: toPlainText(f.note),
    avatar: f.avatar || null,
    url: f.url || null,
    bot: f.bot || false,
    platform: 'mastodon',
  };
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
    bio: toPlainText(account.note),
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
      value: toPlainText(f.value) || '',
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
  const accounts = await paginateAccounts(client, `/accounts/${account.id}/followers`, limit, onProgress);
  return accounts.map(toListedAccount);
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
  const accounts = await paginateAccounts(client, `/accounts/${account.id}/following`, limit, onProgress);
  return accounts.map(toListedAccount);
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
    text: toPlainText(status.content),
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
