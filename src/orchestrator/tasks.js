// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Orchestrator Task Registry
 *
 * Pluggable map of fleet tasks. Every entry is
 * `async (scraper, account, params) => data`, where `scraper` is the object
 * returned by `createHttpScraper()` and `account` is a normalised account
 * record from `accountStore.js`.
 *
 * Read vs write is purely a matter of which task the caller selects —
 * there is no branching on task kind anywhere in here. Tasks validate
 * their own params and let scraper errors propagate untouched: the runner
 * owns error classification (AuthError vs RateLimitError).
 *
 * @author nich (@nichxbt)
 * @license MIT
 */

import { searchTweets as searchTweetsApi } from '../scrapers/twitter/http/search.js';
import { GRAPHQL, buildGraphQLVariables } from '../scrapers/twitter/http/endpoints.js';

/**
 * Recursively collect timeline entry IDs from a GraphQL response body.
 * Tolerant of the response shape, so it does not depend on the scraper's
 * (currently buggy) `resp.data.user.result` unwrapping.
 *
 * @param {*} node
 * @param {string[]} [out]
 * @returns {string[]}
 */
function collectEntryIds(node, out = []) {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node.instructions)) {
    for (const inst of node.instructions) {
      for (const entry of inst.entries ?? inst.moduleItems ?? []) {
        const id = entry.entryId ?? entry.entry_id;
        if (id && !id.startsWith('cursor-')) out.push(id);
      }
    }
  }
  for (const key of Object.keys(node)) collectEntryIds(node[key], out);
  return out;
}

/**
 * Task registry, keyed by task name.
 *
 * @type {Record<string, (scraper: Object, account: Object, params?: Object) => Promise<any>>}
 */
export const TASKS = {
  /**
   * Default read task — the account's OWN home timeline. This is auth-only (a
   * guest is refused), needs no handle, and goes straight through `client.graphql`,
   * so it sidesteps the scraper's broken username→id resolution (`resolveUserId`
   * reads `resp.data.user.result` but the correct path is `resp.data.data.user.result`).
   * Returns the timeline entry IDs — non-empty proves an authenticated read.
   */
  homeTimeline: async (scraper, account, params = {}) => {
    const { queryId, operationName } = GRAPHQL.HomeTimeline;
    const vars = buildGraphQLVariables('HomeTimeline', { count: params.limit ?? 20 });
    const res = await scraper.client.graphql(queryId, operationName, vars);
    return collectEntryIds(res?.data ?? res);
  },

  /**
   * The account's OWN tweets by handle.
   * ⚠️ Currently blocked by the scraper bug above (`resolveUserId`, tweets.js:583) —
   * it throws "User @handle not found" until that one-line path is corrected. Kept
   * so the fix flips it on with no orchestrator change; use `homeTimeline` meanwhile.
   */
  ownTweets: async (scraper, account, params = {}) =>
    scraper.scrapeTweets(account.handle, {
      limit: params.limit ?? 20,
      includeReplies: params.includeReplies ?? false,
      cursor: params.cursor ?? null,
    }),

  /** Profile of `params.username`, defaulting to the account's own handle. */
  scrapeProfile: async (scraper, account, params = {}) =>
    scraper.scrapeProfile(params.username ?? account.handle),

  /** Followers of `params.username`, defaulting to the account's own handle. */
  scrapeFollowers: async (scraper, account, params = {}) =>
    scraper.scrapeFollowers(params.username ?? account.handle, {
      limit: params.limit ?? 100,
      cursor: params.cursor ?? null,
    }),

  /** Search tweets. Uses the raw search module against the scraper's client. */
  searchTweets: async (scraper, account, params = {}) => {
    if (!params.query || typeof params.query !== 'string') {
      throw new Error('❌ searchTweets requires params.query — pass a search string, e.g. --query "javascript"');
    }
    return searchTweetsApi(scraper.client, params.query, {
      limit: params.limit ?? 100,
      type: params.type ?? 'Latest',
    });
  },

  /** Post a tweet. Optional reply target and pre-uploaded media IDs. */
  postTweet: async (scraper, account, params = {}) => {
    if (!params.text || typeof params.text !== 'string') {
      throw new Error('❌ postTweet requires params.text — pass the tweet body, e.g. --text "hello"');
    }
    const options = {};
    const replyTo = params.replyToId ?? params.replyTo;
    if (replyTo) options.replyTo = replyTo;
    if (params.mediaIds) options.mediaIds = params.mediaIds;
    if (params.quoteTweetId) options.quoteTweetId = params.quoteTweetId;
    const result = await scraper.postTweet(params.text, options);

    // X answers a rejected mutation with HTTP 200 + an `errors` array, and
    // `client.request` only throws on status >= 400 — so a rejected tweet would
    // otherwise resolve and look published. Fail loudly, and require a real id.
    if (result?.errors?.length) {
      throw new Error(`❌ tweet rejected by X: ${JSON.stringify(result.errors).slice(0, 300)}`);
    }
    const id = result?.rest_id ?? result?.id_str ?? result?.id ?? null;
    if (!id || !/^\d+$/.test(String(id))) {
      throw new Error(`❌ tweet not confirmed — no numeric id in response: ${JSON.stringify(result).slice(0, 300)}`);
    }
    return { id: String(id), ...(typeof result === 'object' ? result : {}) };
  },

  /** Follow `params.username` (resolved to a user ID by the scraper). */
  followTarget: async (scraper, account, params = {}) => {
    if (!params.username || typeof params.username !== 'string') {
      throw new Error('❌ followTarget requires params.username — pass the handle to follow, e.g. --username elonmusk');
    }
    return scraper.followByUsername(params.username);
  },

  /** Like `params.tweetId`. */
  likeTweet: async (scraper, account, params = {}) => {
    if (!params.tweetId) {
      throw new Error('❌ likeTweet requires params.tweetId — pass the tweet ID, e.g. --tweet-id 1234567890');
    }
    return scraper.likeTweet(String(params.tweetId));
  },
};

/**
 * Sorted list of available task names — used by the CLI for `--task`
 * validation and help text.
 *
 * @returns {string[]}
 */
export function listTasks() {
  return Object.keys(TASKS).sort();
}
