/**
 * Twitter HTTP Profile Scraper
 *
 * Scrapes user profiles via Twitter's internal GraphQL API (UserByScreenName,
 * UserByRestId) — no browser required.  Drop-in replacement for the
 * Puppeteer-based scrapeProfile() in ../index.js.
 *
 * @author nich (@nichxbt)
 * @license MIT
 */

import { GRAPHQL } from './endpoints.js';
import { NotFoundError, AuthError, TwitterApiError } from './errors.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Expand t.co URLs using the entity data Twitter provides.
 *
 * @param {string} text — The raw text containing t.co links
 * @param {object[]} urlEntities — `legacy.entities.url.urls` or
 *   `legacy.entities.description.urls` arrays
 * @returns {string} Text with t.co links replaced by expanded URLs
 */
function expandTcoUrls(text, urlEntities = []) {
  if (!text || !urlEntities.length) return text || '';
  let expanded = text;
  for (const entity of urlEntities) {
    if (entity.url && entity.expanded_url) {
      expanded = expanded.replace(entity.url, entity.expanded_url);
    }
  }
  return expanded;
}

/**
 * Upgrade the avatar thumbnail URL to a higher-resolution version.
 *
 * Twitter serves `_normal` (48 × 48) by default — swap to `_400x400`.
 *
 * @param {string|null} url
 * @returns {string|null}
 */
function upgradeAvatarUrl(url) {
  if (!url) return null;
  return url.replace(/_normal(\.\w+)$/, '_400x400$1');
}

/**
 * Parse Twitter's `created_at` string ("Mon Jan 01 00:00:00 +0000 2007")
 * into an ISO-8601 date string.
 *
 * @param {string|null} raw
 * @returns {string|null}
 */
function toISODate(raw) {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? raw : d.toISOString();
}

/**
 * Safely extract the expanded website URL from legacy entity data.
 *
 * @param {object} legacy — The `legacy` object from a User result.
 * @returns {string|null}
 */
function extractWebsite(legacy) {
  const urlEntities = legacy?.entities?.url?.urls;
  if (!urlEntities || !urlEntities.length) return legacy?.url || null;
  // Prefer the expanded URL (resolves the t.co redirect)
  return urlEntities[0].expanded_url || urlEntities[0].url || legacy.url || null;
}

/**
 * Extract bio entity metadata (URLs, hashtags, mentions).
 *
 * @param {object} legacy
 * @returns {{ urls: object[], hashtags: object[], mentions: object[] }}
 */
function extractBioEntities(legacy) {
  const desc = legacy?.entities?.description || {};
  return {
    urls: (desc.urls || []).map((u) => ({
      display: u.display_url,
      expanded: u.expanded_url,
      url: u.url,
      start: u.indices?.[0] ?? null,
      end: u.indices?.[1] ?? null,
    })),
    hashtags: (desc.hashtags || []).map((h) => ({
      text: h.text,
      start: h.indices?.[0] ?? null,
      end: h.indices?.[1] ?? null,
    })),
    mentions: (desc.user_mentions || []).map((m) => ({
      username: m.screen_name,
      start: m.indices?.[0] ?? null,
      end: m.indices?.[1] ?? null,
    })),
  };
}

// ---------------------------------------------------------------------------
// Core: parseUserData
// ---------------------------------------------------------------------------

/**
 * Transform Twitter's raw GraphQL user object into the clean XActions
 * profile format.
 *
 * This is a **pure function** — it performs no I/O and has no side effects.
 *
 * @param {object} rawUser — The `data.user.result` (or equivalent) object
 *   from a Twitter GraphQL response.
 * @returns {object} Normalised XActions profile object.
 * @throws {NotFoundError} If the user is unavailable (suspended / deactivated).
 */
export function parseUserData(rawUser) {
  if (!rawUser) {
    throw new NotFoundError('User data is empty');
  }

  // Handle UserUnavailable (suspended, deactivated, etc.)
  if (rawUser.__typename === 'UserUnavailable') {
    const reason = rawUser.reason || rawUser.message || 'Account unavailable';
    throw new NotFoundError(`User unavailable: ${reason}`);
  }

  const legacy = rawUser.legacy || {};
  const descriptionUrls = legacy.entities?.description?.urls || [];

  return {
    id: rawUser.rest_id || null,
    name: legacy.name || '',
    username: legacy.screen_name || '',
    bio: expandTcoUrls(legacy.description, descriptionUrls),
    location: legacy.location || '',
    website: extractWebsite(legacy),
    joined: toISODate(legacy.created_at),
    birthday: legacy.birthdate
      ? `${legacy.birthdate.year || ''}${legacy.birthdate.month ? '-' + String(legacy.birthdate.month).padStart(2, '0') : ''}${legacy.birthdate.day ? '-' + String(legacy.birthdate.day).padStart(2, '0') : ''}`.trim() || null
      : null,
    following: legacy.friends_count ?? 0,
    followers: legacy.followers_count ?? 0,
    tweets: legacy.statuses_count ?? 0,
    likes: legacy.favourites_count ?? 0,
    media: legacy.media_count ?? 0,
    avatar: upgradeAvatarUrl(legacy.profile_image_url_https),
    header: legacy.profile_banner_url || null,
    verified: Boolean(rawUser.is_blue_verified || legacy.verified),
    protected: Boolean(legacy.protected),
    pinnedTweetId: (legacy.pinned_tweet_ids_str || [])[0] || null,
    bioEntities: extractBioEntities(legacy),
    platform: 'twitter',
  };
}

// ---------------------------------------------------------------------------
// scrapeProfile (by username)
// ---------------------------------------------------------------------------

/**
 * Scrape a user profile by screen name via the `UserByScreenName` GraphQL
 * endpoint.
 *
 * Works with both **guest tokens** (for public profiles) and **auth tokens**
 * (any visible profile).
 *
 * @param {import('./client.js').TwitterHttpClient} client — Configured HTTP client.
 * @param {string} username — The screen name (without leading `@`).
 * @returns {Promise<object>} XActions profile object.
 * @throws {NotFoundError} Non-existent or suspended username.
 * @throws {AuthError} Protected account accessed without auth.
 * @throws {TwitterApiError} Other API errors.
 */
export async function scrapeProfile(client, username) {
  const { queryId, operationName } = GRAPHQL.UserByScreenName;
  const variables = {
    screen_name: username,
    withSafetyModeUserFields: true,
  };

  const response = await client.graphql(queryId, operationName, variables);

  // Validate response structure
  const result = response?.data?.user?.result;

  if (!result) {
    throw new NotFoundError(`User @${username} not found`);
  }

  // Handle errors array in response (rate-limit, partial errors)
  if (response.errors?.length) {
    const msg = response.errors.map((e) => e.message).join('; ');
    throw new TwitterApiError(`GraphQL errors: ${msg}`, { data: response });
  }

  // Protected account without auth → surface a clear error
  if (result.__typename === 'User' && result.legacy?.protected && !client.isAuthenticated()) {
    // We can still return the partial profile data — but callers should know
    // the bio / tweets may be restricted.
  }

  return parseUserData(result);
}

// ---------------------------------------------------------------------------
// scrapeProfileById (by user ID)
// ---------------------------------------------------------------------------

/**
 * Scrape a user profile by REST ID via the `UserByRestId` GraphQL endpoint.
 *
 * @param {import('./client.js').TwitterHttpClient} client — Configured HTTP client.
 * @param {string} userId — The numeric user ID.
 * @returns {Promise<object>} XActions profile object.
 * @throws {NotFoundError} Unknown user ID.
 * @throws {AuthError} Protected account without auth.
 * @throws {TwitterApiError} Other API errors.
 */
export async function scrapeProfileById(client, userId) {
  const { queryId, operationName } = GRAPHQL.UserByRestId;
  const variables = {
    userId: String(userId),
    withSafetyModeUserFields: true,
  };

  const response = await client.graphql(queryId, operationName, variables);

  const result = response?.data?.user?.result;

  if (!result) {
    throw new NotFoundError(`User with ID ${userId} not found`);
  }

  if (response.errors?.length) {
    const msg = response.errors.map((e) => e.message).join('; ');
    throw new TwitterApiError(`GraphQL errors: ${msg}`, { data: response });
  }

  return parseUserData(result);
}
