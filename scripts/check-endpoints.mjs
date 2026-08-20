#!/usr/bin/env node
// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Probe X's GraphQL endpoints and report which query IDs have gone stale.
 *
 * X rotates the query ID of an internal GraphQL operation whenever it ships a
 * new web bundle. The old ID then answers `404 {"message":"Query not found"}`,
 * and whichever feature depended on it stops working. Because the failure is a
 * 404 rather than an error anyone would notice, the usual way this surfaces is
 * a stranger opening an issue weeks later.
 *
 * This checks them directly. It distinguishes three outcomes that all look like
 * failures from the outside:
 *
 *   - **stale**    — `Query not found`. The ID is dead and must be updated.
 *   - **auth**     — the endpoint exists but needs a logged-in session.
 *   - **limited**  — rate limited; inconclusive, run again later.
 *
 * Usage:
 *   node scripts/check-endpoints.mjs
 *   node scripts/check-endpoints.mjs --json
 *
 * With a session, far more endpoints can be checked conclusively:
 *   X_AUTH_TOKEN=... X_CSRF_TOKEN=... node scripts/check-endpoints.mjs
 *
 * Exits non-zero when any endpoint is stale, so it can run on a schedule.
 *
 * When something is stale, follow "Query not found" in
 * docs/troubleshooting.md to find the replacement ID, then update
 * src/scrapers/twitter/http/endpoints.js — the single place query IDs live.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @see https://xactions.app
 * @license Apache-2.0
 */

import { GRAPHQL, BEARER_TOKEN, GRAPHQL_BASE } from '../src/scrapers/twitter/http/endpoints.js';
import { randomUserAgent } from '../src/client/auth/userAgent.js';

const asJson = process.argv.includes('--json');
const USER_AGENT = randomUserAgent();

/**
 * Probe variables per operation. An operation called with the wrong shape can
 * answer 400, which is indistinguishable from a stale ID unless you sent
 * something it would accept.
 */
const PROBES = {
  UserByScreenName: { screen_name: 'nasa', withSafetyModeUserFields: true },
  UserByRestId: { userId: '11348282', withSafetyModeUserFields: true },
  UserTweets: {
    userId: '11348282',
    count: 1,
    includePromotedContent: false,
    withQuickPromoteEligibilityTweetFields: true,
    withVoice: true,
    withV2Timeline: true,
  },
  UserTweetsAndReplies: {
    userId: '11348282',
    count: 1,
    includePromotedContent: false,
    withCommunity: true,
    withVoice: true,
    withV2Timeline: true,
  },
  UserMedia: { userId: '11348282', count: 1, includePromotedContent: false, withVoice: true },
  UserLikes: { userId: '11348282', count: 1, includePromotedContent: false, withVoice: true },
  TweetDetail: {
    focalTweetId: '20',
    referrer: 'profile',
    includePromotedContent: false,
    withVoice: true,
    withV2Timeline: true,
  },
  TweetResultByRestId: {
    tweetId: '20',
    includePromotedContent: false,
    withVoice: true,
    withCommunity: false,
    withBirdwatchNotes: false,
  },
  SearchTimeline: { rawQuery: 'nasa', count: 1, product: 'Latest' },
  Followers: { userId: '11348282', count: 1 },
  Following: { userId: '11348282', count: 1 },
  Likes: { tweetId: '20', count: 1 },
  Retweeters: { tweetId: '20', count: 1 },
  ListMembers: { listId: '1', count: 1 },
  ListTimeline: { listId: '1', count: 1 },
  BookmarkTimeline: { count: 1 },
  HomeTimeline: { count: 1 },
  HomeLatestTimeline: { count: 1 },
};

/**
 * Transport per operation, mirroring the client map in
 * src/client/api/graphqlQueries.js (GRAPHQL_ENDPOINTS `method`).
 *
 * X 404s GET on several GraphQL endpoints (SearchTimeline, Followers, ...),
 * which need POST with a JSON body. Conversely, guest POSTs are rejected, so
 * the endpoints X still serves over GET must be probed with GET or a guest
 * run misreports them as "needs a session".
 */
const GET_OPERATIONS = new Set([
  'UserByScreenName',
  'UserByRestId',
  'UserTweets',
  'TweetDetail',
  'TweetResultByRestId',
]);

const FEATURES = {
  responsive_web_graphql_exclude_directive_enabled: true,
  verified_phone_label_enabled: false,
  responsive_web_graphql_timeline_navigation_enabled: true,
  responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
  creator_subscriptions_tweet_preview_api_enabled: true,
  hidden_profile_likes_enabled: true,
  hidden_profile_subscriptions_enabled: true,
  subscriptions_verification_info_is_identity_verified_enabled: true,
  subscriptions_verification_info_verified_since_enabled: true,
  highlights_tweets_tab_ui_enabled: true,
  responsive_web_twitter_article_notes_tab_enabled: true,
};

/**
 * Activate a guest token.
 *
 * The browser User-Agent is required, not decorative: X answers a UA-less
 * request to this endpoint with a misleading 404.
 *
 * @returns {Promise<string>}
 */
async function guestToken() {
  const res = await fetch('https://api.x.com/1.1/guest/activate.json', {
    method: 'POST',
    headers: { Authorization: `Bearer ${BEARER_TOKEN}`, 'User-Agent': USER_AGENT },
  });

  if (!res.ok) {
    throw new Error(`Could not activate a guest token: HTTP ${res.status}`);
  }

  return (await res.json()).guest_token;
}

/**
 * Probe one operation and classify the result.
 *
 * @param {string} name - Operation name, e.g. UserByScreenName
 * @param {{queryId: string, operationName: string}} endpoint
 * @param {Record<string,string>} headers
 * @returns {Promise<{name: string, queryId: string, status: string, detail: string}>}
 */
async function probe(name, endpoint, headers) {
  const variables = PROBES[name];
  if (!variables) {
    return { name, queryId: endpoint.queryId, status: 'skipped', detail: 'no probe defined' };
  }

  // Transport follows the operation: GET for the endpoints X still serves
  // over GET (works unauthenticated), POST with a JSON body for the rest.
  const url = `${GRAPHQL_BASE}/${endpoint.queryId}/${endpoint.operationName}`;

  let res;
  try {
    if (GET_OPERATIONS.has(name)) {
      const params = new URLSearchParams({
        variables: JSON.stringify(variables),
        features: JSON.stringify(FEATURES),
      });
      res = await fetch(`${url}?${params}`, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(15_000),
      });
    } else {
      res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ variables, features: FEATURES, queryId: endpoint.queryId }),
        signal: AbortSignal.timeout(15_000),
      });
    }
  } catch (error) {
    return { name, queryId: endpoint.queryId, status: 'error', detail: error.message };
  }

  const body = await res.text().catch(() => '');

  if (res.ok) {
    return { name, queryId: endpoint.queryId, status: 'ok', detail: `HTTP ${res.status}` };
  }

  // The distinguishing signal. A rotated ID says so explicitly; an endpoint
  // that merely needs a session answers 404 with an empty body.
  if (body.includes('Query not found')) {
    return { name, queryId: endpoint.queryId, status: 'stale', detail: 'Query not found' };
  }

  // GRAPHQL_VALIDATION_FAILED means the operation was found and the variables
  // were wrong. That still answers the question this script asks: the ID is
  // live. A rotated ID never gets far enough to validate anything.
  if (body.includes('GRAPHQL_VALIDATION_FAILED')) {
    return {
      name,
      queryId: endpoint.queryId,
      status: 'ok',
      detail: `HTTP ${res.status}, ID resolves (probe variables incomplete)`,
    };
  }

  if (res.status === 429) {
    return { name, queryId: endpoint.queryId, status: 'limited', detail: 'HTTP 429' };
  }

  if ([401, 403, 404].includes(res.status)) {
    // With a session these codes mean the endpoint itself is broken or
    // gated, not that a login is missing.
    return {
      name,
      queryId: endpoint.queryId,
      status: authenticated ? 'error' : 'auth',
      detail: `HTTP ${res.status}${authenticated ? ' despite a session — endpoint may be dead or gated' : ', needs a session'}`,
    };
  }

  return {
    name,
    queryId: endpoint.queryId,
    status: 'error',
    detail: `HTTP ${res.status} ${body.slice(0, 80)}`,
  };
}

// ---------------------------------------------------------------------------

const authToken = process.env.X_AUTH_TOKEN;
const csrfToken = process.env.X_CSRF_TOKEN;
const authenticated = Boolean(authToken && csrfToken);

const headers = {
  Authorization: `Bearer ${BEARER_TOKEN}`,
  'User-Agent': USER_AGENT,
  'Content-Type': 'application/json',
  'x-twitter-active-user': 'yes',
  'x-twitter-client-language': 'en',
};

if (authenticated) {
  headers.Cookie = `auth_token=${authToken}; ct0=${csrfToken}`;
  headers['x-csrf-token'] = csrfToken;
  headers['x-twitter-auth-type'] = 'OAuth2Session';
} else {
  headers['x-guest-token'] = await guestToken();
}

const results = [];
for (const [name, endpoint] of Object.entries(GRAPHQL)) {
  if (!PROBES[name]) continue;
  results.push(await probe(name, endpoint, headers));
  // Space the probes out. Hammering these is the fastest way to turn every
  // remaining answer into an inconclusive 429.
  await new Promise((r) => setTimeout(r, 600));
}

if (asJson) {
  console.log(JSON.stringify({ authenticated, results }, null, 2));
} else {
  const MARK = { ok: 'ok     ', stale: 'STALE  ', auth: 'auth   ', limited: 'limited', error: 'error  ' };

  console.log(`\nGraphQL endpoint check — ${authenticated ? 'authenticated' : 'guest token'}\n`);
  for (const r of results) {
    console.log(`  ${MARK[r.status] ?? r.status}  ${r.name.padEnd(24)} ${r.queryId.padEnd(24)} ${r.detail}`);
  }

  if (!authenticated) {
    console.log(
      '\n  Endpoints marked "auth" could not be checked without a session.' +
        '\n  Re-run with X_AUTH_TOKEN and X_CSRF_TOKEN set to cover them.',
    );
  }
}

const stale = results.filter((r) => r.status === 'stale');

if (stale.length > 0) {
  console.error(
    `\n${stale.length} stale query ID(s): ${stale.map((r) => r.name).join(', ')}.` +
      '\nUpdate src/scrapers/twitter/http/endpoints.js — see' +
      ' docs/troubleshooting.md#query-not-found\n',
  );
  process.exit(1);
}

console.log('\nNo stale query IDs.\n');
