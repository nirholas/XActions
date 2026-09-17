// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Resumable scrape checkpoint tests.
 *
 * Exercises the checkpoint file itself and, through a real TwitterHttpClient
 * over a fake fetch, a follower scrape that dies mid-pagination and continues
 * from the saved cursor on the next run.
 *
 * @author nich (@nichxbt)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createCheckpoint, bindCheckpoint } from '../../src/scrapers/twitter/http/checkpoint.js';
import { TwitterHttpClient } from '../../src/scrapers/twitter/http/client.js';
import { scrapeFollowers } from '../../src/scrapers/twitter/http/relationships.js';
import { scrapeTweets } from '../../src/scrapers/twitter/http/tweets.js';
import { searchTweets } from '../../src/scrapers/twitter/http/search.js';
import { NetworkError } from '../../src/scrapers/twitter/http/errors.js';

let dir;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'xactions-ckpt-'));
});
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function userEntry(username) {
  return {
    entryId: `user-${username}`,
    content: {
      entryType: 'TimelineTimelineItem',
      itemContent: {
        itemType: 'TimelineUser',
        user_results: {
          result: {
            __typename: 'User',
            rest_id: `id-${username}`,
            legacy: { screen_name: username, name: username, followers_count: 1, friends_count: 1 },
          },
        },
      },
    },
  };
}

function tweetEntry(id) {
  return {
    entryId: `tweet-${id}`,
    content: {
      entryType: 'TimelineTimelineItem',
      itemContent: {
        itemType: 'TimelineTweet',
        tweet_results: {
          result: {
            __typename: 'Tweet',
            rest_id: id,
            legacy: {
              full_text: `tweet ${id}`,
              created_at: 'Wed Jan 01 00:00:00 +0000 2025',
              favorite_count: 0,
              retweet_count: 0,
              reply_count: 0,
              quote_count: 0,
            },
            core: { user_results: { result: { rest_id: 'u1', legacy: { screen_name: 'someone', name: 'Someone' } } } },
          },
        },
      },
    },
  };
}

function cursorEntry(value) {
  return { entryId: `cursor-bottom-${value}`, content: { entryType: 'TimelineTimelineCursor', value, cursorType: 'Bottom' } };
}

function instructions(entries, bottomCursor) {
  return [{ type: 'TimelineAddEntries', entries: bottomCursor ? [...entries, cursorEntry(bottomCursor)] : entries }];
}

const followersPage = (usernames, cursor) => ({
  data: { user: { result: { timeline: { timeline: { instructions: instructions(usernames.map(userEntry), cursor) } } } } },
});
const tweetsPage = (ids, cursor) => ({
  data: { user: { result: { timeline_v2: { timeline: { instructions: instructions(ids.map(tweetEntry), cursor) } } } } },
});
const searchPage = (ids, cursor) => ({
  data: { search_by_raw_query: { search_timeline: { timeline: { instructions: instructions(ids.map(tweetEntry), cursor) } } } },
});
const userLookup = { data: { user: { result: { __typename: 'User', rest_id: '42', legacy: { screen_name: 'someone' } } } } };

/**
 * The fake fetch serves the full x.com body, envelope included; client.graphql()
 * strips it (the same convention as integration.test.js).
 */
function ok(body) {
  return { status: 200, headers: { get: () => null }, json: async () => body };
}

/**
 * Fake fetch keyed by GraphQL operation + cursor. `pages[op][cursor ?? 'first']`
 * is either a response body or a function that throws.
 */
function fetchFor(pages) {
  const calls = [];
  const fetch = vi.fn(async (url, init) => {
    const u = new URL(url);
    const op = u.pathname.split('/').pop();
    // GET queries carry `variables` in the query string; the operations in
    // POST_QUERY_OPERATIONS (Followers, SearchTimeline) carry them in the body.
    const vars = init?.body
      ? (JSON.parse(init.body).variables ?? {})
      : JSON.parse(u.searchParams.get('variables') || '{}');
    const key = vars.cursor ?? 'first';
    calls.push({ op, cursor: vars.cursor ?? null });
    const entry = pages[op]?.[key];
    if (entry === undefined) throw new TypeError(`unplanned request ${op} cursor=${key}`);
    if (typeof entry === 'function') return entry();
    return ok(entry);
  });
  fetch.calls = calls;
  return fetch;
}

function client(fetch) {
  return new TwitterHttpClient({ cookies: 'auth_token=t; ct0=c', fetch, maxRetries: 0 });
}

// ---------------------------------------------------------------------------
// Checkpoint file
// ---------------------------------------------------------------------------

describe('createCheckpoint', () => {
  it('saves atomically, resumes, and clears', () => {
    const ckpt = createCheckpoint({ key: 'followers:some/one', dir });
    expect(ckpt.path).toBe(path.join(dir, 'followers_some_one.json'));
    expect(ckpt.resume()).toBeNull();
    expect(ckpt.exists()).toBe(false);

    const saved = ckpt.save({ cursor: 'abc', count: 40, meta: { username: 'someone' } });
    expect(saved.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(ckpt.exists()).toBe(true);
    expect(fs.readdirSync(dir)).toEqual(['followers_some_one.json']); // no temp file left behind
    expect(ckpt.resume()).toMatchObject({ cursor: 'abc', count: 40, meta: { username: 'someone' } });

    ckpt.clear();
    expect(ckpt.resume()).toBeNull();
    expect(() => ckpt.clear()).not.toThrow();
  });

  it('treats a damaged file as no checkpoint', () => {
    const ckpt = createCheckpoint({ key: 'broken', dir });
    fs.writeFileSync(ckpt.path, '{not json');
    expect(ckpt.resume()).toBeNull();
  });

  it('requires a key', () => {
    expect(() => createCheckpoint({ dir })).toThrow(/key/);
  });

  it('bindCheckpoint resumes the cursor and shrinks the limit by what was already collected', () => {
    expect(bindCheckpoint(null, { cursor: 'x', limit: 5 })).toMatchObject({ cursor: 'x', limit: 5, resumed: false });

    const ckpt = createCheckpoint({ key: 'bind', dir });
    ckpt.save({ cursor: 'saved', count: 30 });
    const bound = bindCheckpoint(ckpt, { cursor: 'ignored', limit: 100, meta: { operation: 'Followers' } });
    expect(bound).toMatchObject({ cursor: 'saved', limit: 70, resumed: true });

    bound.record('next', 20);
    expect(ckpt.resume()).toMatchObject({ cursor: 'next', count: 50, meta: { operation: 'Followers' } });
    bound.complete();
    expect(ckpt.exists()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Resume mid-pagination through the real scrapers
// ---------------------------------------------------------------------------

describe('resumable scrapes', () => {
  it('scrapeFollowers continues from the saved cursor after an interrupted run', async () => {
    const checkpoint = createCheckpoint({ key: 'followers:someone', dir });
    let networkDown = true;
    const fetch = fetchFor({
      UserByScreenName: { first: userLookup },
      Followers: {
        first: followersPage(['f1', 'f2', 'f3'], 'c2'),
        c2: () => {
          if (networkDown) throw new TypeError('fetch failed');
          return ok(followersPage(['f4', 'f5'], 'c3'));
        },
        c3: followersPage(['f6'], null),
      },
    });

    // Run 1: page one lands, page two dies.
    await expect(scrapeFollowers(client(fetch), 'someone', { limit: 10, checkpoint })).rejects.toBeInstanceOf(NetworkError);
    expect(checkpoint.resume()).toMatchObject({ cursor: 'c2', count: 3, meta: { operation: 'Followers', userId: '42' } });

    // Run 2: same command, picks up at c2 with the remaining budget of 7.
    networkDown = false;
    const rest = await scrapeFollowers(client(fetch), 'someone', { limit: 10, checkpoint });
    expect(rest.map((u) => u.username)).toEqual(['f4', 'f5', 'f6']);
    expect(fetch.calls.filter((c) => c.op === 'Followers').map((c) => c.cursor)).toEqual([null, 'c2', 'c2', 'c3']);
    expect(checkpoint.exists()).toBe(false); // finished: nothing left to resume
  });

  it('returns nothing more once the checkpoint says the limit was already reached', async () => {
    const checkpoint = createCheckpoint({ key: 'followers:done', dir });
    checkpoint.save({ cursor: 'c9', count: 10 });
    const fetch = fetchFor({ UserByScreenName: { first: userLookup } });
    const rest = await scrapeFollowers(client(fetch), 'someone', { limit: 10, checkpoint });
    expect(rest).toEqual([]);
    expect(fetch.calls.map((c) => c.op)).toEqual(['UserByScreenName']);
    expect(checkpoint.exists()).toBe(false);
  });

  it('scrapeTweets and searchTweets record and resume the same way', async () => {
    const tweetsCkpt = createCheckpoint({ key: 'tweets:someone', dir });
    const fetch = fetchFor({
      UserByScreenName: { first: userLookup },
      UserTweets: {
        first: tweetsPage(['1', '2'], 't2'),
        t2: () => {
          throw new TypeError('fetch failed');
        },
      },
      SearchTimeline: {
        first: searchPage(['10', '11'], 's2'),
        s2: searchPage(['12'], null),
      },
    });

    await expect(scrapeTweets(client(fetch), 'someone', { limit: 50, checkpoint: tweetsCkpt })).rejects.toBeInstanceOf(NetworkError);
    expect(tweetsCkpt.resume()).toMatchObject({ cursor: 't2', count: 2, meta: { operation: 'UserTweets', username: 'someone' } });

    const searchCkpt = createCheckpoint({ key: 'search:test', dir });
    const results = await searchTweets(client(fetch), 'test', { limit: 50, checkpoint: searchCkpt });
    expect(results.map((t) => t.id)).toEqual(['10', '11', '12']);
    expect(searchCkpt.exists()).toBe(false);

    // Without a checkpoint option nothing is written anywhere
    const before = fs.readdirSync(dir);
    await searchTweets(client(fetch), 'test', { limit: 50 });
    expect(fs.readdirSync(dir)).toEqual(before);
  });
});
