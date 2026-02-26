/**
 * Twitter/X Relationships Scraper via HTTP (GraphQL)
 *
 * Scrapes follower/following lists, likers, retweeters, and list members
 * via Twitter's internal GraphQL API. Replaces Puppeteer-based scrapers
 * for headless, fast relationship data extraction.
 *
 * Depends on: endpoints.js, client.js, auth.js, profile.js (parseUserData)
 *
 * @author nich (@nichxbt)
 * @license MIT
 */

import {
  GRAPHQL,
  DEFAULT_FEATURES,
  buildGraphQLUrl,
} from './endpoints.js';
import { AuthError, NotFoundError } from './errors.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default max users to scrape per call */
const DEFAULT_LIMIT = 1000;

/** Number of users Twitter returns per GraphQL page (~20-50) */
const PAGE_COUNT = 20;

// ---------------------------------------------------------------------------
// User data parser (inline, consistent with XActions format)
// ---------------------------------------------------------------------------

/**
 * Parse a raw GraphQL user result into the XActions user format.
 *
 * This is intentionally self-contained so relationships.js has no circular
 * dependency on profile.js. The output shape matches the Puppeteer scrapers.
 *
 * @param {object} rawUser — `user_results.result` from GraphQL response
 * @returns {object|null} Parsed user or null if unavailable
 */
export function parseUserEntry(rawUser) {
  if (!rawUser || rawUser.__typename === 'UserUnavailable') return null;

  const legacy = rawUser.legacy ?? {};

  return {
    id: rawUser.rest_id ?? null,
    username: legacy.screen_name ?? null,
    name: legacy.name ?? null,
    bio: legacy.description ?? null,
    verified: rawUser.is_blue_verified ?? legacy.verified ?? false,
    avatar: (legacy.profile_image_url_https ?? '').replace('_normal', '_400x400') || null,
    followersCount: legacy.followers_count ?? 0,
    followingCount: legacy.friends_count ?? 0,
    protected: legacy.protected ?? false,
    platform: 'twitter',
  };
}

// ---------------------------------------------------------------------------
// Timeline instruction parser
// ---------------------------------------------------------------------------

/**
 * Parse timeline instructions that contain user entries.
 *
 * Twitter GraphQL responses for follower/following/liker lists wrap user data
 * in the same `instructions[].entries[]` structure as tweet timelines, but
 * with `user-` prefixed entry IDs.
 *
 * @param {Array} instructions — `timeline.instructions` array from GraphQL
 * @returns {{ users: object[], cursor: string|null }}
 */
export function parseUserList(instructions) {
  const users = [];
  let cursor = null;

  if (!Array.isArray(instructions)) {
    return { users, cursor };
  }

  for (const instruction of instructions) {
    // Handle TimelineAddEntries (primary instruction type for user lists)
    if (
      instruction.type === 'TimelineAddEntries' ||
      instruction.__typename === 'TimelineAddEntries'
    ) {
      const entries = instruction.entries ?? [];
      for (const entry of entries) {
        const entryId = entry.entryId ?? entry.entry_id ?? '';

        // Cursor entries (bottom cursor for pagination)
        if (entryId.startsWith('cursor-bottom-')) {
          cursor =
            entry.content?.value ??
            entry.content?.itemContent?.value ??
            null;
          continue;
        }

        // Top cursor — skip
        if (entryId.startsWith('cursor-top-')) {
          continue;
        }

        // User entries have `user-` prefix
        if (entryId.startsWith('user-')) {
          const userResult =
            entry.content?.itemContent?.user_results?.result ??
            entry.content?.itemContent?.userDisplayType?.user_results?.result ??
            null;

          if (userResult) {
            const parsed = parseUserEntry(userResult);
            if (parsed && parsed.username) {
              users.push(parsed);
            }
          }
        }
      }
    }

    // Handle TimelineAddToModule (sometimes used for user lists in modules)
    if (
      instruction.type === 'TimelineAddToModule' ||
      instruction.__typename === 'TimelineAddToModule'
    ) {
      const moduleItems = instruction.moduleItems ?? [];
      for (const item of moduleItems) {
        const userResult =
          item.item?.itemContent?.user_results?.result ?? null;
        if (userResult) {
          const parsed = parseUserEntry(userResult);
          if (parsed && parsed.username) {
            users.push(parsed);
          }
        }
      }
    }
  }

  return { users, cursor };
}

// ---------------------------------------------------------------------------
// Auth guard helper
// ---------------------------------------------------------------------------

/**
 * Ensure the client is authenticated (has auth_token cookie, not guest-only).
 * Follower/following endpoints require authentication.
 *
 * @param {object} client — TwitterHttpClient instance
 * @param {string} endpoint — Endpoint name for error context
 * @throws {AuthError}
 */
function requireAuth(client, endpoint) {
  if (typeof client.isAuthenticated === 'function' && !client.isAuthenticated()) {
    throw new AuthError(
      `${endpoint} requires authentication. Provide auth_token cookie.`,
      { endpoint },
    );
  }
}

// ---------------------------------------------------------------------------
// User ID resolver
// ---------------------------------------------------------------------------

/**
 * Resolve a Twitter username to a rest_id (user ID).
 *
 * @param {object} client — TwitterHttpClient instance
 * @param {string} username
 * @returns {Promise<string>} — The user's rest_id
 * @throws {NotFoundError}
 */
async function resolveUserId(client, username) {
  const { queryId, operationName } = GRAPHQL.UserByScreenName;
  const variables = { screen_name: username, withSafetyModeUserFields: true };

  const resp = await client.graphql(queryId, operationName, variables, DEFAULT_FEATURES);

  const userResult = resp?.data?.user?.result;
  if (!userResult || userResult.__typename === 'UserUnavailable') {
    throw new NotFoundError(`User @${username} not found or unavailable`, {
      endpoint: operationName,
    });
  }

  return userResult.rest_id;
}

// ---------------------------------------------------------------------------
// Generic user-list scraper (shared logic for followers/following/likers/etc.)
// ---------------------------------------------------------------------------

/**
 * Generic paginated user-list scraper.
 *
 * Handles the common pattern of: build variables → paginate GraphQL →
 * parse user list instructions → deduplicate → respect limit → report progress.
 *
 * @param {object} client — TwitterHttpClient instance
 * @param {object} endpoint — `{ queryId, operationName }` from GRAPHQL map
 * @param {object} baseVariables — Variables for the first page (e.g. `{ userId }`)
 * @param {object} options — `{ limit, cursor, onProgress }`
 * @param {string} responseDataPath — Dot-path to instructions in response
 * @returns {Promise<object[]>} — Array of parsed user objects
 */
async function scrapeUserList(client, endpoint, baseVariables, options = {}, responseDataPath) {
  const { limit = DEFAULT_LIMIT, cursor: initialCursor = null, onProgress } = options;
  const { queryId, operationName } = endpoint;

  const seen = new Map(); // username → user (deduplication)
  let nextCursor = initialCursor;
  let pageNum = 0;

  while (seen.size < limit) {
    const variables = {
      ...baseVariables,
      count: PAGE_COUNT,
      includePromotedContent: false,
    };

    if (nextCursor) {
      variables.cursor = nextCursor;
    }

    const resp = await client.graphql(queryId, operationName, variables, DEFAULT_FEATURES);

    // Navigate to instructions using the response data path
    const instructions = getNestedValue(resp, responseDataPath) ?? [];

    const { users, cursor } = parseUserList(instructions);

    // Deduplicate and collect
    for (const user of users) {
      if (seen.size >= limit) break;
      if (!seen.has(user.username)) {
        seen.set(user.username, user);
      }
    }

    // Report progress
    onProgress?.({ fetched: seen.size, limit, page: pageNum });

    // Stop if no cursor (end of list) or no new users returned
    if (!cursor || users.length === 0) break;

    nextCursor = cursor;
    pageNum++;
  }

  return Array.from(seen.values()).slice(0, limit);
}

/**
 * Navigate a nested object using a dot-separated path.
 * @param {object} obj
 * @param {string} path — e.g. 'data.user.result.timeline.timeline.instructions'
 * @returns {*}
 */
function getNestedValue(obj, path) {
  if (!path) return obj;
  const keys = path.split('.');
  let current = obj;
  for (const key of keys) {
    if (current == null) return undefined;
    current = current[key];
  }
  return current;
}

// ---------------------------------------------------------------------------
// Public API — Follower/Following scraping
// ---------------------------------------------------------------------------

/**
 * Scrape a user's followers via GraphQL.
 *
 * Requires authentication (auth_token cookie). Guest tokens cannot access
 * follower lists.
 *
 * @param {object} client — TwitterHttpClient instance (authenticated)
 * @param {string} username — Twitter username (without @)
 * @param {object} [options]
 * @param {number} [options.limit=1000] — Maximum followers to scrape
 * @param {string} [options.cursor=null] — Resume pagination from cursor
 * @param {Function} [options.onProgress] — Progress callback `({ fetched, limit, page })`
 * @returns {Promise<object[]>} — Array of user objects in XActions format
 * @throws {AuthError} if client is not authenticated
 * @throws {NotFoundError} if username doesn't exist
 *
 * @example
 * ```js
 * const followers = await scrapeFollowers(client, 'elonmusk', { limit: 100 });
 * console.log(followers[0]); // { username, name, bio, verified, avatar, ... }
 * ```
 */
export async function scrapeFollowers(client, username, options = {}) {
  requireAuth(client, 'Followers');

  const userId = await resolveUserId(client, username);

  return scrapeUserList(
    client,
    GRAPHQL.Followers,
    { userId },
    options,
    'data.user.result.timeline.timeline.instructions',
  );
}

/**
 * Scrape accounts a user is following via GraphQL.
 *
 * Requires authentication (auth_token cookie).
 *
 * @param {object} client — TwitterHttpClient instance (authenticated)
 * @param {string} username — Twitter username (without @)
 * @param {object} [options]
 * @param {number} [options.limit=1000] — Maximum accounts to scrape
 * @param {string} [options.cursor=null] — Resume pagination from cursor
 * @param {Function} [options.onProgress] — Progress callback `({ fetched, limit, page })`
 * @returns {Promise<object[]>} — Array of user objects in XActions format
 * @throws {AuthError} if client is not authenticated
 * @throws {NotFoundError} if username doesn't exist
 */
export async function scrapeFollowing(client, username, options = {}) {
  requireAuth(client, 'Following');

  const userId = await resolveUserId(client, username);

  return scrapeUserList(
    client,
    GRAPHQL.Following,
    { userId },
    options,
    'data.user.result.timeline.timeline.instructions',
  );
}

// ---------------------------------------------------------------------------
// Non-Follower Detection
// ---------------------------------------------------------------------------

/**
 * Detect users you follow who don't follow you back.
 *
 * This is XActions' most popular feature. It scrapes both follower and following
 * lists, then performs a set comparison.
 *
 * @param {object} client — TwitterHttpClient instance (authenticated)
 * @param {string} username — Twitter username (without @)
 * @param {object} [options]
 * @param {number} [options.limit=Infinity] — Max users per list (followers & following)
 * @param {Function} [options.onProgress] — Phase-aware progress callback
 * @returns {Promise<{ nonFollowers: object[], mutuals: object[], stats: object }>}
 * @throws {AuthError} if client is not authenticated
 * @throws {NotFoundError} if username doesn't exist
 *
 * @example
 * ```js
 * const result = await scrapeNonFollowers(client, 'myusername', {
 *   onProgress: ({ phase, fetched, limit }) => {
 *     console.log(`${phase}: ${fetched}/${limit}`);
 *   },
 * });
 * console.log(`${result.stats.nonFollowers} people don't follow you back`);
 * ```
 */
export async function scrapeNonFollowers(client, username, options = {}) {
  requireAuth(client, 'NonFollowers');

  const { onProgress, limit: perListLimit } = options;
  const listOptions = {};
  if (perListLimit != null) listOptions.limit = perListLimit;

  // Phase 1: Scrape following list (people you follow)
  onProgress?.({ phase: 'following', fetched: 0, limit: perListLimit ?? DEFAULT_LIMIT });
  const following = await scrapeFollowing(client, username, {
    ...listOptions,
    onProgress: (p) => onProgress?.({ phase: 'following', ...p }),
  });

  // Phase 2: Scrape followers list (people who follow you)
  onProgress?.({ phase: 'followers', fetched: 0, limit: perListLimit ?? DEFAULT_LIMIT });
  const followers = await scrapeFollowers(client, username, {
    ...listOptions,
    onProgress: (p) => onProgress?.({ phase: 'followers', ...p }),
  });

  // Phase 3: Compare sets
  onProgress?.({ phase: 'comparing' });
  const followerSet = new Set(followers.map((f) => f.username));

  const nonFollowers = following.filter((f) => !followerSet.has(f.username));
  const mutuals = following.filter((f) => followerSet.has(f.username));

  const stats = {
    following: following.length,
    followers: followers.length,
    nonFollowers: nonFollowers.length,
    mutuals: mutuals.length,
  };

  onProgress?.({ phase: 'done', stats });

  return { nonFollowers, mutuals, stats };
}

// ---------------------------------------------------------------------------
// Likers / Retweeters (tweet engagement)
// ---------------------------------------------------------------------------

/**
 * Scrape users who liked a specific tweet.
 *
 * Requires authentication.
 *
 * @param {object} client — TwitterHttpClient instance (authenticated)
 * @param {string} tweetId — Tweet ID
 * @param {object} [options]
 * @param {number} [options.limit=1000] — Maximum likers to scrape
 * @param {string} [options.cursor=null] — Resume pagination from cursor
 * @param {Function} [options.onProgress] — Progress callback
 * @returns {Promise<object[]>} — Array of user objects
 * @throws {AuthError} if client is not authenticated
 */
export async function scrapeLikers(client, tweetId, options = {}) {
  requireAuth(client, 'Likes');

  // Note: The GraphQL endpoint for "who liked this tweet" uses the key
  // UserLikes in the GRAPHQL map for "user's liked tweets". The "Likes"
  // key (who liked a specific tweet) may not be in the endpoint map.
  // We use a direct query approach.
  const endpoint = GRAPHQL.UserLikes ?? {
    queryId: 'aOH0MWhJfip_kFVKm2sPbA',
    operationName: 'Likes',
  };

  return scrapeUserList(
    client,
    endpoint,
    { tweetId },
    options,
    'data.favoriters_timeline.timeline.instructions',
  );
}

/**
 * Scrape users who retweeted a specific tweet.
 *
 * Requires authentication.
 *
 * @param {object} client — TwitterHttpClient instance (authenticated)
 * @param {string} tweetId — Tweet ID
 * @param {object} [options]
 * @param {number} [options.limit=1000] — Maximum retweeters to scrape
 * @param {string} [options.cursor=null] — Resume pagination from cursor
 * @param {Function} [options.onProgress] — Progress callback
 * @returns {Promise<object[]>} — Array of user objects
 * @throws {AuthError} if client is not authenticated
 */
export async function scrapeRetweeters(client, tweetId, options = {}) {
  requireAuth(client, 'Retweeters');

  return scrapeUserList(
    client,
    GRAPHQL.Retweeters,
    { tweetId },
    options,
    'data.retweeters_timeline.timeline.instructions',
  );
}

// ---------------------------------------------------------------------------
// List Members
// ---------------------------------------------------------------------------

/**
 * Scrape members of a Twitter list.
 *
 * Requires authentication.
 *
 * @param {object} client — TwitterHttpClient instance (authenticated)
 * @param {string} listId — Twitter list ID
 * @param {object} [options]
 * @param {number} [options.limit=1000] — Maximum members to scrape
 * @param {string} [options.cursor=null] — Resume pagination from cursor
 * @param {Function} [options.onProgress] — Progress callback
 * @returns {Promise<object[]>} — Array of user objects
 * @throws {AuthError} if client is not authenticated
 */
export async function scrapeListMembers(client, listId, options = {}) {
  requireAuth(client, 'ListMembers');

  return scrapeUserList(
    client,
    GRAPHQL.ListMembers,
    { listId },
    options,
    'data.list.members_timeline.timeline.instructions',
  );
}
