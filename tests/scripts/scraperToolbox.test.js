// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * scripts/twitter/scraper-toolbox.js: reply, parent and quote context.
 *
 * Pastes the real script into a jsdom window the way DevTools would, feeds
 * its fetch interceptor GraphQL bodies shaped like X's, and checks what the
 * console API hands back: a reply linked to its parent, a search reply whose
 * parent is missing, a quoted post with its author's follower count, both
 * user shapes, the TweetDetail-unavailable path, and in-page parent fetching.
 *
 * @vitest-environment jsdom
 * @vitest-environment-options { "url": "https://x.com/search?q=agents&f=live" }
 * @author nich (@nichxbt)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const SOURCE = readFileSync(join(here, '../../scripts/twitter/scraper-toolbox.js'), 'utf8');

const SEARCH = 'https://x.com/i/api/graphql/abc123/SearchTimeline?variables=%7B%7D';
const REPLIES = 'https://x.com/i/api/graphql/def456/UserTweetsAndReplies?variables=%7B%7D';
const detailUrl = (id) =>
  `https://x.com/i/api/graphql/ghi789/TweetDetail?variables=${encodeURIComponent(JSON.stringify({ focalTweetId: id }))}`;

// ---------------------------------------------------------------------------
// Fixtures shaped like X's GraphQL tweet results
// ---------------------------------------------------------------------------

/** A user result in the older `legacy` shape. */
function legacyUser(id, handle, followers) {
  return {
    __typename: 'User',
    rest_id: id,
    legacy: { screen_name: handle, name: handle.toUpperCase(), followers_count: followers, friends_count: 10, verified: false }
  };
}

/** A user result in the newer shape: core, verification, relationship_counts. */
function typedUser(id, handle, followers) {
  return {
    __typename: 'User',
    rest_id: id,
    core: { screen_name: handle, name: `${handle} name` },
    verification: { verified: true },
    relationship_counts: { followers, following: 42 }
  };
}

function tweet(id, user, text, extra = {}) {
  const { legacy = {}, ...rest } = extra;
  return {
    __typename: 'Tweet',
    rest_id: id,
    core: { user_results: { result: user } },
    views: { count: '1000' },
    legacy: {
      full_text: text,
      created_at: 'Wed Nov 25 12:00:00 +0000 2026',
      conversation_id_str: id,
      favorite_count: 7,
      retweet_count: 1,
      reply_count: 0,
      quote_count: 0,
      lang: 'en',
      entities: { hashtags: [], user_mentions: [], urls: [] },
      ...legacy
    },
    ...rest
  };
}

const replyTo = (parentId, handle, userId, conversationId) => ({
  in_reply_to_status_id_str: parentId,
  in_reply_to_screen_name: handle,
  in_reply_to_user_id_str: userId,
  conversation_id_str: conversationId
});

function timeline(entries) {
  return {
    data: {
      search_by_raw_query: {
        search_timeline: {
          timeline: { instructions: [{ type: 'TimelineAddEntries', entries }] }
        }
      }
    }
  };
}

const item = (t) => ({
  entryId: `tweet-${t.rest_id}`,
  content: { itemContent: { tweet_results: { result: t } } }
});

const conversationModule = (id, tweets) => ({
  entryId: `profile-conversation-${id}`,
  content: { items: tweets.map((t) => ({ item: { itemContent: { tweet_results: { result: t } } } })) }
});

const alice = legacyUser('1', 'alice', 900);
const bob = legacyUser('2', 'bob', 12000);
const carol = typedUser('3', 'carol', 250000);
const dave = legacyUser('4', 'dave', 5000);

// A search reply whose parent (by bob) is not in the search payload
const searchReply = tweet('100', alice, 'agree, agents need wallets', { legacy: replyTo('90', 'bob', '2', '90') });
// A quote of dave's post
const quotedPost = tweet('80', dave, 'shipping a 3D agent runtime today');
const quotePost = tweet('101', alice, 'this is the one to watch', {
  legacy: { is_quote_status: true },
  quoted_status_result: { result: quotedPost }
});
// A with_replies conversation module: carol's post, then alice's reply to it
const carolPost = tweet('70', carol, 'what should agents do with their own money?');
const conversationReply = tweet('102', alice, 'pay each other for work', { legacy: replyTo('70', 'carol', '3', '70') });
// A reply whose parent X will answer as unavailable
const orphanReply = tweet('103', alice, 'replying to a deleted post', { legacy: replyTo('60', 'erin', '5', '60') });

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

/** URL -> body the stubbed page fetch answers with. */
let responses;

function fakeResponse(body, status = 200) {
  return { status, ok: status < 400, clone: () => ({ json: async () => body }) };
}

/** Fire a request the way X's page would, through the toolbox's patched fetch. */
async function pageFetch(url, status = 200) {
  responses.set(url, { body: responses.get(url)?.body, status });
  await window.fetch(url);
  await new Promise((r) => setTimeout(r, 0));
}

/**
 * Stand in for X's router: on each in-app route change to a post, the page
 * requests that post's TweetDetail. Returns the paths visited.
 */
function simulateSpa() {
  const visited = [];
  const onPop = () => {
    visited.push(window.location.pathname);
    const match = window.location.pathname.match(/\/status\/(\d+)$/);
    if (match) window.fetch(detailUrl(match[1]));
  };
  window.addEventListener('popstate', onPop);
  cleanups.push(() => window.removeEventListener('popstate', onPop));
  return visited;
}

const cleanups = [];

function paste() {
  new Function(SOURCE)();
  return window.XActionsToolbox;
}

/** Minimal CSV reader that understands quoted cells. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') quoted = false; else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; } else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; } else cell += c;
  }
  row.push(cell);
  rows.push(row);
  const [headers, ...body] = rows;
  return body.map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i]])));
}

let toolbox;

beforeEach(() => {
  document.body.innerHTML = '';
  localStorage.clear();
  window.history.replaceState({}, '', '/search?q=agents&f=live');
  responses = new Map();
  window.fetch = vi.fn(async (url) => {
    const hit = responses.get(String(url));
    return fakeResponse(hit ? hit.body : {}, hit ? hit.status : 200);
  });
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  toolbox = paste();
});

afterEach(() => {
  while (cleanups.length) cleanups.pop()();
  if (window.XActionsToolbox) window.XActionsToolbox.destroy();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function captureSearch() {
  responses.set(SEARCH, { body: timeline([item(searchReply), item(quotePost), item(orphanReply)]) });
  await pageFetch(SEARCH);
}

async function captureConversation() {
  responses.set(REPLIES, { body: timeline([conversationModule('70', [carolPost, conversationReply])]) });
  await pageFetch(REPLIES);
}

const byId = (list) => Object.fromEntries(list.map((t) => [t.id, t]));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('scraper toolbox: reply and quote context', () => {
  it('records reply-to ids, the conversation and the GraphQL operation', async () => {
    await captureSearch();
    const t = byId(toolbox.matched())['100'];
    expect(t.inReplyTo).toEqual({ id: '90', handle: 'bob', userId: '2' });
    expect(t.conversationId).toBe('90');
    expect(t.operation).toBe('SearchTimeline');
    expect(t.author).toMatchObject({ id: '1', handle: 'alice', followers: 900, following: 10 });
  });

  it('links a reply to its parent when the parent is in the capture', async () => {
    await captureConversation();
    const t = byId(toolbox.matched())['102'];
    expect(t.parentStatus).toBe('captured');
    expect(t.parent).toMatchObject({ id: '70', text: 'what should agents do with their own money?' });
    expect(t.parent.author).toMatchObject({ handle: 'carol', followers: 250000, following: 42, verified: true });
  });

  it('reads the newer user shape (core, verification, relationship_counts)', async () => {
    await captureConversation();
    const parent = byId(toolbox.tweets())['70'];
    expect(parent.author).toEqual({
      id: '3', handle: 'carol', name: 'carol name', verified: true, followers: 250000, following: 42
    });
    expect(parent.url).toBe('https://x.com/carol/status/70');
  });

  it('marks a parent missing and lists it in missingParents()', async () => {
    await captureSearch();
    expect(byId(toolbox.matched())['100'].parentStatus).toBe('missing');
    const missing = toolbox.missingParents();
    expect(missing.map((m) => m.parentId).sort()).toEqual(['60', '90']);
    expect(missing.find((m) => m.parentId === '90')).toEqual({
      parentId: '90', parentHandle: 'bob', parentUrl: 'https://x.com/bob/status/90', replyIds: ['100']
    });
  });

  it('keeps the quoted post with its author follower count, without exporting it as a timeline item', async () => {
    await captureSearch();
    const matched = byId(toolbox.matched());
    expect(matched['80']).toBeUndefined();
    expect(matched['101'].type.isQuote).toBe(true);
    expect(matched['101'].quoted).toMatchObject({
      id: '80',
      url: 'https://x.com/dave/status/80',
      text: 'shipping a 3D agent runtime today',
      author: { handle: 'dave', followers: 5000 }
    });
  });

  it('marks a parent unavailable when TweetDetail comes back without it', async () => {
    await captureSearch();
    responses.set(detailUrl('60'), { body: { data: { threaded_conversation_with_injections_v2: { instructions: [] } } } });
    await pageFetch(detailUrl('60'));
    expect(byId(toolbox.matched())['103'].parentStatus).toBe('unavailable');
    expect(toolbox.missingParents().map((m) => m.parentId)).toEqual(['90']);
  });

  it('fetches missing parents through in-app navigation, without exporting what those pages show', async () => {
    await captureSearch();
    const parent = tweet('90', bob, 'agents should hold their own keys');
    const stranger = tweet('91', legacyUser('9', 'zed', 3), 'unrelated reply under the parent');
    responses.set(detailUrl('90'), { body: timeline([item(parent), item(stranger)]) });
    responses.set(detailUrl('60'), { body: { data: { threaded_conversation_with_injections_v2: { instructions: [] } } } });
    const visited = simulateSpa();

    const result = await toolbox.resolveParents({ delay: 0, timeout: 2000 });

    expect(result).toEqual({ resolved: 1, unavailable: 1, failed: [], remaining: 0 });
    expect(visited).toEqual(['/bob/status/90', '/erin/status/60', '/search']);
    expect(window.location.pathname + window.location.search).toBe('/search?q=agents&f=live');
    const matched = byId(toolbox.matched());
    expect(matched['90']).toBeUndefined();
    expect(matched['91']).toBeUndefined();
    expect(matched['100'].parent).toMatchObject({ id: '90', author: { handle: 'bob', followers: 12000 } });
    expect(matched['103'].parentStatus).toBe('unavailable');
  });

  it('stops after two route changes that load nothing and reports what is left', async () => {
    await captureSearch();
    // No popstate listener: the route changes, but no TweetDetail arrives
    const result = await toolbox.resolveParents({ delay: 0, timeout: 300 });
    expect(result.resolved).toBe(0);
    expect(result.failed.sort()).toEqual(['60', '90']);
    expect(result.remaining).toBe(2);
    expect(window.location.pathname).toBe('/search');
  });

  it('refuses to fetch parents while a scroll run is active', async () => {
    await captureSearch();
    vi.spyOn(window, 'scrollBy').mockImplementation(() => {});
    toolbox.start();
    const result = await toolbox.resolveParents({ delay: 0, timeout: 300 });
    toolbox.stop();
    expect(result).toEqual({ resolved: 0, unavailable: 0, failed: [], remaining: 2 });
  });

  it('exports parent and quote columns in CSV, after the original 20', async () => {
    await captureSearch();
    await captureConversation();
    const csv = toolbox.build('csv');
    const header = csv.split('\n')[0].split(',');
    expect(header.slice(0, 20)).toEqual(['id', 'date', 'author', 'text', 'likes', 'retweets', 'replies', 'quotes',
      'bookmarks', 'views', 'lang', 'isRetweet', 'isReply', 'isQuote', 'isPinned', 'mediaCount', 'mediaUrls',
      'hashtags', 'url', 'source']);
    const rows = byId(parseCsv(csv));
    expect(rows['102']).toMatchObject({
      replyToId: '70', replyToHandle: '@carol', parentStatus: 'captured',
      parentText: 'what should agents do with their own money?', parentAuthorFollowers: '250000',
      parentUrl: 'https://x.com/carol/status/70'
    });
    expect(rows['100']).toMatchObject({ replyToId: '90', parentStatus: 'missing', parentText: '' });
    expect(rows['101']).toMatchObject({ quotedId: '80', quotedAuthor: '@dave', quotedAuthorFollowers: '5000' });
    expect(rows['101'].authorFollowers).toBe('900');
  });

  it('adds reply and quote lines to the Markdown export and counts parents in JSON', async () => {
    await captureSearch();
    await captureConversation();
    const md = toolbox.build('markdown');
    expect(md).toContain('Replying to @carol');
    expect(md).toContain('Quoting @dave');
    const bundle = JSON.parse(toolbox.build('json'));
    expect(bundle.parents).toEqual({ replies: 3, captured: 1, missing: 2, unavailable: 0 });
  });

  it('refuses an unknown export format', () => {
    expect(() => toolbox.build('xml')).toThrow();
  });
});
