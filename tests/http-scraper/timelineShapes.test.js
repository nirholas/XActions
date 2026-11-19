// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Timeline shapes x.com sends after the first page, and long posts.
 *
 * - SearchTimeline delivers its bottom cursor from page two on as a
 *   `TimelineReplaceEntry` (`instruction.entry`), so reading only
 *   `TimelineAddEntries` stopped every search after two pages.
 * - UserMedia appends pages two and on to the media grid with
 *   `TimelineAddToModule.moduleItems`, so reading only `entries` stopped at
 *   the first twenty tweets.
 * - A post over 280 characters keeps its full body in `note_tweet`; the
 *   `legacy.full_text` beside it is cut off.
 *
 * @author nich (@nichxbt)
 */

import { describe, it, expect } from 'vitest';
import { searchTweets, searchUsers } from '../../src/scrapers/twitter/http/search.js';
import { scrapeMedia } from '../../src/scrapers/twitter/http/media.js';
import { parseTweetData, parseTimelineInstructions } from '../../src/scrapers/twitter/http/parse/tweet.js';
import { Tweet } from '../../src/client/models/Tweet.js';

const tweetEntry = (id) => ({
  entryId: `tweet-${id}`,
  content: { itemContent: { tweet_results: { result: { __typename: 'Tweet', rest_id: String(id), legacy: { full_text: `t${id}` } } } } },
});
const userEntry = (id) => ({
  entryId: `user-${id}`,
  content: { itemContent: { user_results: { result: { __typename: 'User', rest_id: String(id), legacy: { screen_name: `u${id}`, name: `U${id}` } } } } },
});
const cursor = (kind, value) => ({ entryId: `cursor-${kind}-${value}`, content: { cursorType: kind === 'top' ? 'Top' : 'Bottom', value } });
const replaceCursor = (kind, value) => ({
  type: 'TimelineReplaceEntry',
  entry_id_to_replace: `cursor-${kind}-x`,
  entry: cursor(kind, value),
});

/** Page one: cursors inside TimelineAddEntries. Later pages: cursors as replacements. */
function searchPage(page, makeEntry, perPage = 20, lastPage = Infinity) {
  const items = Array.from({ length: perPage }, (_, i) => makeEntry((page - 1) * perPage + i));
  const bottom = page < lastPage ? `B${page}` : null;
  const instructions =
    page === 1
      ? [{ type: 'TimelineAddEntries', entries: [...items, cursor('top', 'T1'), ...(bottom ? [cursor('bottom', bottom)] : [])] }]
      : [
          { type: 'TimelineAddEntries', entries: items },
          replaceCursor('top', `T${page}`),
          ...(bottom ? [replaceCursor('bottom', bottom)] : []),
        ];
  return { data: { search_by_raw_query: { search_timeline: { timeline: { instructions } } } } };
}

function pagedClient(makePage) {
  const cursors = [];
  return {
    cursors,
    isAuthenticated: () => true,
    async graphql(queryId, op, vars) {
      cursors.push(vars.cursor ?? null);
      return makePage(cursors.length, vars);
    },
  };
}

describe('search pagination past page two', () => {
  it('searchTweets follows the TimelineReplaceEntry bottom cursor', async () => {
    const client = pagedClient((page) => searchPage(page, tweetEntry));
    const tweets = await searchTweets(client, 'foo', { limit: 200 });
    expect(tweets).toHaveLength(200);
    expect(new Set(tweets.map((t) => t.id)).size).toBe(200);
    expect(client.cursors.slice(0, 4)).toEqual([null, 'B1', 'B2', 'B3']);
  });

  it('searchUsers follows it too, and stops at the last page', async () => {
    const client = pagedClient((page) => searchPage(page, userEntry, 20, 4));
    const users = await searchUsers(client, 'foo', { limit: 500 });
    expect(users).toHaveLength(80);
    expect(client.cursors).toEqual([null, 'B1', 'B2', 'B3']);
  });

  it('parseTimelineInstructions ignores a replaced top cursor', () => {
    const { cursor: c } = parseTimelineInstructions([replaceCursor('top', 'TOP')]);
    expect(c).toBeNull();
  });
});

describe('scrapeMedia pages two and on', () => {
  const gridItem = (id) => ({
    entryId: `profile-grid-0-tweet-${id}`,
    item: {
      itemContent: {
        tweet_results: {
          result: {
            __typename: 'Tweet',
            rest_id: String(id),
            legacy: { id_str: String(id), extended_entities: { media: [{ type: 'photo', media_url_https: `https://pbs.twimg.com/media/${id}.jpg` }] } },
          },
        },
      },
    },
  });

  it('reads the TimelineAddToModule moduleItems that carry later pages', async () => {
    let page = 0;
    const client = {
      isAuthenticated: () => true,
      async graphql(queryId, op) {
        if (op === 'UserByScreenName') return { data: { user: { result: { __typename: 'User', rest_id: '42' } } } };
        page++;
        const items = Array.from({ length: 20 }, (_, i) => gridItem(page * 100 + i));
        const instructions =
          page === 1
            ? [{ type: 'TimelineAddEntries', entries: [{ entryId: 'profile-grid-0', content: { items } }, cursor('bottom', 'B1')] }]
            : [
                { type: 'TimelineAddToModule', moduleEntryId: 'profile-grid-0', moduleItems: items },
                { type: 'TimelineAddEntries', entries: [cursor('bottom', `B${page}`)] },
              ];
        return { data: { user: { result: { timeline: { timeline: { instructions } } } } } };
      },
    };
    const media = await scrapeMedia(client, 'someone', { limit: 100 });
    expect(media).toHaveLength(100);
    expect(page).toBe(5);
  });

  it('stops when the cursor does not advance', async () => {
    let calls = 0;
    const client = {
      isAuthenticated: () => true,
      async graphql(queryId, op) {
        if (op === 'UserByScreenName') return { data: { user: { result: { __typename: 'User', rest_id: '42' } } } };
        calls++;
        const instructions = [
          { type: 'TimelineAddToModule', moduleItems: [gridItem(1)] },
          { type: 'TimelineAddEntries', entries: [cursor('bottom', 'SAME')] },
        ];
        return { data: { user: { result: { timeline: { timeline: { instructions } } } } } };
      },
    };
    await scrapeMedia(client, 'someone', { limit: 1000 });
    expect(calls).toBe(2);
  });
});

describe('long posts', () => {
  const full = 'a'.repeat(300) + ' the end';
  const raw = {
    __typename: 'Tweet',
    rest_id: '7',
    legacy: { id_str: '7', full_text: `${'a'.repeat(270)}… https://t.co/x`, created_at: 'Wed Jan 01 00:00:00 +0000 2025' },
    note_tweet: { note_tweet_results: { result: { text: full } } },
  };

  it('parseTweetData returns the note_tweet body', () => {
    expect(parseTweetData(raw).text).toBe(full);
    expect(parseTweetData({ ...raw, note_tweet: undefined }).text).toBe(raw.legacy.full_text);
  });

  it('Tweet.fromGraphQL returns the note_tweet body', () => {
    const tweet = Tweet.fromGraphQL(raw);
    expect(tweet.text).toBe(full);
    expect(tweet.fullText).toBe(full);
  });
});
