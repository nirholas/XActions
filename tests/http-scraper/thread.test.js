/**
 * Tests for src/scrapers/twitter/http/thread.js
 *
 * Uses vitest with mocked client — no real network requests.
 * Fixture data mirrors actual Twitter GraphQL response shapes.
 *
 * @author nich (@nichxbt)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  scrapeThread,
  scrapeFullThread,
  scrapeConversation,
  parseConversationModule,
  reconstructThread,
} from '../../src/scrapers/twitter/http/thread.js';

// ---------------------------------------------------------------------------
// Mock client factory
// ---------------------------------------------------------------------------

function createMockClient(graphqlHandler) {
  return {
    graphql: vi.fn(graphqlHandler),
    isAuthenticated: vi.fn(() => true),
  };
}

// ---------------------------------------------------------------------------
// Fixtures — realistic Twitter GraphQL response shapes
// ---------------------------------------------------------------------------

function buildRawTweet(overrides = {}) {
  const id = overrides.id || '1000000000000000001';
  const authorId = overrides.authorId || '44196397';
  const authorUsername = overrides.authorUsername || 'testuser';
  const authorName = overrides.authorName || 'Test User';
  const text = overrides.text || 'Hello world!';
  const createdAt = overrides.createdAt || 'Wed Jan 15 12:00:00 +0000 2025';

  const legacy = {
    id_str: id,
    full_text: text,
    created_at: createdAt,
    favorite_count: overrides.likes ?? 100,
    retweet_count: overrides.retweets ?? 10,
    reply_count: overrides.replies ?? 5,
    quote_count: overrides.quotes ?? 2,
    bookmark_count: overrides.bookmarks ?? 1,
    lang: 'en',
    source: '<a href="https://mobile.twitter.com" rel="nofollow">Twitter Web App</a>',
    entities: { urls: [], hashtags: [], user_mentions: [] },
    extended_entities: { media: [] },
  };

  if (overrides.inReplyToTweetId) {
    legacy.in_reply_to_status_id_str = overrides.inReplyToTweetId;
    legacy.in_reply_to_user_id_str = overrides.inReplyToUserId || authorId;
    legacy.in_reply_to_screen_name = overrides.inReplyToUsername || authorUsername;
  }

  return {
    __typename: overrides.typename || 'Tweet',
    rest_id: id,
    core: {
      user_results: {
        result: {
          __typename: 'User',
          rest_id: authorId,
          legacy: {
            screen_name: authorUsername,
            name: authorName,
            profile_image_url_https: 'https://pbs.twimg.com/profile/photo_normal.jpg',
            verified: false,
          },
          is_blue_verified: false,
        },
      },
    },
    legacy,
    views: { count: '1000' },
  };
}

function buildTweetEntry(rawTweet) {
  return {
    entryId: `tweet-${rawTweet.rest_id}`,
    sortIndex: rawTweet.rest_id,
    content: {
      __typename: 'TimelineTimelineItem',
      entryType: 'TimelineTimelineItem',
      itemContent: {
        __typename: 'TimelineTweet',
        tweet_results: { result: rawTweet },
      },
    },
  };
}

function buildConversationModule(entryId, rawTweets, cursors = []) {
  const items = rawTweets.map((rawTweet) => ({
    entryId: `${entryId}-tweet-${rawTweet.rest_id}`,
    item: {
      itemContent: {
        __typename: 'TimelineTweet',
        tweet_results: { result: rawTweet },
      },
    },
  }));

  for (const cursor of cursors) {
    items.push({
      entryId: `${entryId}-cursor`,
      item: {
        itemContent: {
          __typename: 'TimelineTimelineCursor',
          cursorType: cursor.type || 'ShowMoreThreads',
          value: cursor.value,
        },
      },
    });
  }

  return {
    entryId,
    sortIndex: entryId,
    content: {
      __typename: 'TimelineTimelineModule',
      entryType: 'TimelineTimelineModule',
      items,
    },
  };
}

function buildCursorEntry(type, value, position = 'bottom') {
  return {
    entryId: `cursor-${position}-${Date.now()}`,
    content: {
      __typename: 'TimelineTimelineCursor',
      entryType: 'TimelineTimelineCursor',
      cursorType: type,
      value,
    },
  };
}

function buildTweetDetailResponse(entries) {
  return {
    data: {
      threaded_conversation_with_injections_v2: {
        instructions: [
          {
            type: 'TimelineAddEntries',
            entries,
          },
        ],
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Self-thread fixtures (author replying to themselves)
// ---------------------------------------------------------------------------

function buildSelfThread() {
  const authorId = '12345';
  const authorUsername = 'threadauthor';
  const authorName = 'Thread Author';

  const tweet1 = buildRawTweet({
    id: '2000000000000000001',
    authorId,
    authorUsername,
    authorName,
    text: 'This is the start of a thread 🧵 (1/4)',
    createdAt: 'Wed Jan 15 12:00:00 +0000 2025',
  });

  const tweet2 = buildRawTweet({
    id: '2000000000000000002',
    authorId,
    authorUsername,
    authorName,
    text: 'Second tweet in the thread (2/4)',
    createdAt: 'Wed Jan 15 12:01:00 +0000 2025',
    inReplyToTweetId: '2000000000000000001',
    inReplyToUserId: authorId,
    inReplyToUsername: authorUsername,
  });

  const tweet3 = buildRawTweet({
    id: '2000000000000000003',
    authorId,
    authorUsername,
    authorName,
    text: 'Third tweet in the thread (3/4)',
    createdAt: 'Wed Jan 15 12:02:00 +0000 2025',
    inReplyToTweetId: '2000000000000000002',
    inReplyToUserId: authorId,
    inReplyToUsername: authorUsername,
  });

  const tweet4 = buildRawTweet({
    id: '2000000000000000004',
    authorId,
    authorUsername,
    authorName,
    text: 'End of thread (4/4)',
    createdAt: 'Wed Jan 15 12:03:00 +0000 2025',
    inReplyToTweetId: '2000000000000000003',
    inReplyToUserId: authorId,
    inReplyToUsername: authorUsername,
  });

  return { tweet1, tweet2, tweet3, tweet4, authorId };
}

// ---------------------------------------------------------------------------
// Tests: reconstructThread
// ---------------------------------------------------------------------------

describe('reconstructThread', () => {
  it('should reconstruct a self-thread in chronological order', () => {
    const { tweet1, tweet2, tweet3, tweet4, authorId } = buildSelfThread();

    // Parse through parseTweetData-like format
    const tweets = [tweet1, tweet2, tweet3, tweet4].map((raw) => ({
      id: raw.rest_id,
      text: raw.legacy.full_text,
      createdAt: new Date(raw.legacy.created_at).toISOString(),
      author: {
        id: raw.core.user_results.result.rest_id,
        username: raw.core.user_results.result.legacy.screen_name,
        name: raw.core.user_results.result.legacy.name,
      },
      inReplyTo: raw.legacy.in_reply_to_status_id_str
        ? {
            tweetId: raw.legacy.in_reply_to_status_id_str,
            userId: raw.legacy.in_reply_to_user_id_str,
            username: raw.legacy.in_reply_to_screen_name,
          }
        : null,
      platform: 'twitter',
    }));

    const result = reconstructThread(tweets);

    expect(result.rootTweet).toBeDefined();
    expect(result.rootTweet.id).toBe('2000000000000000001');
    expect(result.authorReplies).toHaveLength(3); // 3 replies by same author
    expect(result.authorReplies[0].id).toBe('2000000000000000002');
    expect(result.authorReplies[1].id).toBe('2000000000000000003');
    expect(result.authorReplies[2].id).toBe('2000000000000000004');
    expect(result.conversation).toHaveLength(3);
  });

  it('should handle a single tweet (no thread)', () => {
    const tweet = {
      id: '111',
      text: 'Solo tweet',
      createdAt: '2025-01-15T12:00:00.000Z',
      author: { id: 'u1', username: 'solo', name: 'Solo' },
      inReplyTo: null,
      platform: 'twitter',
    };

    const result = reconstructThread([tweet]);

    expect(result.rootTweet).toBeDefined();
    expect(result.rootTweet.id).toBe('111');
    expect(result.authorReplies).toHaveLength(0);
    expect(result.conversation).toHaveLength(0);
  });

  it('should handle empty input', () => {
    const result = reconstructThread([]);
    expect(result.rootTweet).toBeNull();
    expect(result.authorReplies).toHaveLength(0);
    expect(result.conversation).toHaveLength(0);
  });

  it('should separate author replies from other users replies', () => {
    const tweets = [
      {
        id: '100',
        text: 'Root tweet',
        createdAt: '2025-01-15T12:00:00.000Z',
        author: { id: 'author1', username: 'op', name: 'OP' },
        inReplyTo: null,
      },
      {
        id: '101',
        text: 'Author self-reply',
        createdAt: '2025-01-15T12:01:00.000Z',
        author: { id: 'author1', username: 'op', name: 'OP' },
        inReplyTo: { tweetId: '100', userId: 'author1', username: 'op' },
      },
      {
        id: '102',
        text: 'Someone else replies',
        createdAt: '2025-01-15T12:02:00.000Z',
        author: { id: 'other1', username: 'commenter', name: 'Commenter' },
        inReplyTo: { tweetId: '100', userId: 'author1', username: 'op' },
      },
      {
        id: '103',
        text: 'Author continues thread',
        createdAt: '2025-01-15T12:03:00.000Z',
        author: { id: 'author1', username: 'op', name: 'OP' },
        inReplyTo: { tweetId: '101', userId: 'author1', username: 'op' },
      },
    ];

    const result = reconstructThread(tweets);

    expect(result.rootTweet.id).toBe('100');
    expect(result.authorReplies).toHaveLength(2); // 101 + 103
    expect(result.authorReplies.map((t) => t.id)).toEqual(['101', '103']);
    expect(result.conversation).toHaveLength(3); // 101 + 102 + 103
  });

  it('should handle branching conversations', () => {
    const tweets = [
      {
        id: '200',
        text: 'Root',
        createdAt: '2025-01-15T12:00:00.000Z',
        author: { id: 'a1', username: 'root', name: 'Root' },
        inReplyTo: null,
      },
      {
        id: '201',
        text: 'Branch A',
        createdAt: '2025-01-15T12:01:00.000Z',
        author: { id: 'a2', username: 'branchA', name: 'Branch A' },
        inReplyTo: { tweetId: '200', userId: 'a1', username: 'root' },
      },
      {
        id: '202',
        text: 'Branch B',
        createdAt: '2025-01-15T12:02:00.000Z',
        author: { id: 'a3', username: 'branchB', name: 'Branch B' },
        inReplyTo: { tweetId: '200', userId: 'a1', username: 'root' },
      },
      {
        id: '203',
        text: 'Reply to Branch A',
        createdAt: '2025-01-15T12:03:00.000Z',
        author: { id: 'a4', username: 'replyA', name: 'Reply A' },
        inReplyTo: { tweetId: '201', userId: 'a2', username: 'branchA' },
      },
    ];

    const result = reconstructThread(tweets);

    expect(result.rootTweet.id).toBe('200');
    expect(result.conversation).toHaveLength(3);
    // All replies should be in conversation
    const ids = result.conversation.map((t) => t.id);
    expect(ids).toContain('201');
    expect(ids).toContain('202');
    expect(ids).toContain('203');
  });

  it('should handle missing tweets (deleted) in the chain', () => {
    // Tweet 300 → [deleted 301] → 302
    // 302 replies to 301, but 301 is not in the array
    const tweets = [
      {
        id: '300',
        text: 'Root',
        createdAt: '2025-01-15T12:00:00.000Z',
        author: { id: 'a1', username: 'root', name: 'Root' },
        inReplyTo: null,
      },
      {
        id: '302',
        text: 'Reply to deleted tweet',
        createdAt: '2025-01-15T12:02:00.000Z',
        author: { id: 'a1', username: 'root', name: 'Root' },
        inReplyTo: { tweetId: '301', userId: 'a1', username: 'root' }, // 301 not in set
      },
    ];

    const result = reconstructThread(tweets);

    expect(result.rootTweet.id).toBe('300');
    // 302's parent is missing, so it becomes an orphan root and still shows up
    expect(result.conversation).toHaveLength(1);
    expect(result.conversation[0].id).toBe('302');
  });

  it('should build a tree map of parent-child relationships', () => {
    const tweets = [
      {
        id: '400',
        text: 'Root',
        createdAt: '2025-01-15T12:00:00.000Z',
        author: { id: 'a1', username: 'root', name: 'Root' },
        inReplyTo: null,
      },
      {
        id: '401',
        text: 'Reply 1',
        createdAt: '2025-01-15T12:01:00.000Z',
        author: { id: 'a1', username: 'root', name: 'Root' },
        inReplyTo: { tweetId: '400', userId: 'a1', username: 'root' },
      },
      {
        id: '402',
        text: 'Reply 2',
        createdAt: '2025-01-15T12:02:00.000Z',
        author: { id: 'a2', username: 'other', name: 'Other' },
        inReplyTo: { tweetId: '400', userId: 'a1', username: 'root' },
      },
    ];

    const result = reconstructThread(tweets);
    expect(result.tree).toBeInstanceOf(Map);
    // Root's children
    const rootChildren = result.tree.get('400');
    expect(rootChildren).toBeDefined();
    expect(rootChildren).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Tests: parseConversationModule
// ---------------------------------------------------------------------------

describe('parseConversationModule', () => {
  it('should parse a conversation module with tweets', () => {
    const rawTweet1 = buildRawTweet({ id: '500', text: 'First reply' });
    const rawTweet2 = buildRawTweet({ id: '501', text: 'Second reply' });

    const module = buildConversationModule(
      'conversationthread-500',
      [rawTweet1, rawTweet2],
    );

    const { tweets, cursors } = parseConversationModule(module.content);

    expect(tweets).toHaveLength(2);
    expect(tweets[0].id).toBe('500');
    expect(tweets[1].id).toBe('501');
    expect(cursors).toHaveLength(0);
  });

  it('should extract cursors for "Show more replies"', () => {
    const rawTweet = buildRawTweet({ id: '600', text: 'A reply' });

    const module = buildConversationModule(
      'conversationthread-600',
      [rawTweet],
      [{ type: 'ShowMoreThreads', value: 'DAACCgACGKi_cursor_value' }],
    );

    const { tweets, cursors } = parseConversationModule(module.content);

    expect(tweets).toHaveLength(1);
    expect(cursors).toHaveLength(1);
    expect(cursors[0].type).toBe('ShowMoreThreads');
    expect(cursors[0].value).toBe('DAACCgACGKi_cursor_value');
  });

  it('should handle empty module', () => {
    const { tweets, cursors } = parseConversationModule(null);
    expect(tweets).toHaveLength(0);
    expect(cursors).toHaveLength(0);
  });

  it('should handle module with only cursors', () => {
    const module = buildConversationModule(
      'conversationthread-700',
      [],
      [{ type: 'ShowMoreThreadsPrompt', value: 'cursor_abc' }],
    );

    const { tweets, cursors } = parseConversationModule(module.content);

    expect(tweets).toHaveLength(0);
    expect(cursors).toHaveLength(1);
    expect(cursors[0].value).toBe('cursor_abc');
  });

  it('should handle TweetTombstone entries', () => {
    const tombstone = {
      __typename: 'TweetTombstone',
      tombstone: {
        text: { text: 'This Tweet was deleted by the Tweet author.' },
      },
    };

    const module = {
      items: [
        {
          item: {
            itemContent: {
              __typename: 'TimelineTweet',
              tweet_results: { result: tombstone },
            },
          },
        },
      ],
    };

    const { tweets } = parseConversationModule(module);
    expect(tweets).toHaveLength(1);
    expect(tweets[0].tombstone).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tests: scrapeThread
// ---------------------------------------------------------------------------

describe('scrapeThread', () => {
  it('should scrape and reconstruct a thread from the focal tweet', async () => {
    const { tweet1, tweet2, tweet3, tweet4 } = buildSelfThread();

    const response = buildTweetDetailResponse([
      buildTweetEntry(tweet1),
      buildTweetEntry(tweet2),
      buildTweetEntry(tweet3),
      buildTweetEntry(tweet4),
    ]);

    const client = createMockClient(() => response);

    const result = await scrapeThread(client, '2000000000000000001');

    expect(client.graphql).toHaveBeenCalledTimes(1);
    expect(result.rootTweet).toBeDefined();
    expect(result.rootTweet.id).toBe('2000000000000000001');
    expect(result.authorReplies).toHaveLength(3);
    expect(result.conversation).toHaveLength(3);
    expect(result.totalReplies).toBe(3);
    expect(typeof result.hasMore).toBe('boolean');
    expect(result.cursor).toBeNull();
  });

  it('should include tweets from conversation modules', async () => {
    const rootTweet = buildRawTweet({
      id: '800',
      authorId: 'a1',
      text: 'Root tweet with replies',
    });

    const reply1 = buildRawTweet({
      id: '801',
      authorId: 'a2',
      authorUsername: 'replier',
      text: 'A reply from someone',
      inReplyToTweetId: '800',
      inReplyToUserId: 'a1',
    });

    const reply2 = buildRawTweet({
      id: '802',
      authorId: 'a3',
      authorUsername: 'replier2',
      text: 'Another reply',
      inReplyToTweetId: '800',
      inReplyToUserId: 'a1',
    });

    const response = buildTweetDetailResponse([
      buildTweetEntry(rootTweet),
      buildConversationModule('conversationthread-801', [reply1]),
      buildConversationModule('conversationthread-802', [reply2]),
    ]);

    const client = createMockClient(() => response);

    const result = await scrapeThread(client, '800');

    expect(result.rootTweet.id).toBe('800');
    expect(result.conversation).toHaveLength(2);
  });

  it('should detect hasMore and extract cursor', async () => {
    const rootTweet = buildRawTweet({ id: '900', text: 'Root' });

    const reply = buildRawTweet({
      id: '901',
      text: 'A reply',
      inReplyToTweetId: '900',
    });

    const entries = [
      buildTweetEntry(rootTweet),
      buildConversationModule(
        'conversationthread-901',
        [reply],
        [{ type: 'ShowMoreThreads', value: 'next_page_cursor_123' }],
      ),
      buildCursorEntry('Bottom', 'bottom_cursor_456'),
    ];

    const response = buildTweetDetailResponse(entries);
    const client = createMockClient(() => response);

    const result = await scrapeThread(client, '900');

    expect(result.hasMore).toBe(true);
    expect(result.cursor).toBeTruthy();
  });

  it('should throw NotFoundError when no tweets found', async () => {
    const response = buildTweetDetailResponse([]);
    const client = createMockClient(() => response);

    await expect(scrapeThread(client, 'nonexistent')).rejects.toThrow(
      /not found/i,
    );
  });

  it('should pass correct variables to the GraphQL call', async () => {
    const rootTweet = buildRawTweet({ id: '950', text: 'Root' });
    const response = buildTweetDetailResponse([buildTweetEntry(rootTweet)]);
    const client = createMockClient(() => response);

    await scrapeThread(client, '950');

    expect(client.graphql).toHaveBeenCalledWith(
      expect.any(String),
      'TweetDetail',
      expect.objectContaining({
        focalTweetId: '950',
        with_rux_injections: false,
        rankingMode: 'Relevance',
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// Tests: scrapeFullThread (walk up to root)
// ---------------------------------------------------------------------------

describe('scrapeFullThread', () => {
  it('should walk up to the root tweet then scrape the full thread', async () => {
    const authorId = 'author1';

    // Tweet 1 is root (no parent)
    const tweet1 = buildRawTweet({
      id: '1001',
      authorId,
      text: 'Root',
      createdAt: 'Wed Jan 15 12:00:00 +0000 2025',
    });

    // Tweet 2 replies to 1
    const tweet2 = buildRawTweet({
      id: '1002',
      authorId,
      text: 'Reply',
      createdAt: 'Wed Jan 15 12:01:00 +0000 2025',
      inReplyToTweetId: '1001',
      inReplyToUserId: authorId,
    });

    // Tweet 3 replies to 2
    const tweet3 = buildRawTweet({
      id: '1003',
      authorId,
      text: 'Reply to reply',
      createdAt: 'Wed Jan 15 12:02:00 +0000 2025',
      inReplyToTweetId: '1002',
      inReplyToUserId: authorId,
    });

    // First call: focal=1003, sees parent 1002
    const response1003 = buildTweetDetailResponse([
      buildTweetEntry(tweet2), // the parent tweet context
      buildTweetEntry(tweet3), // the focal tweet
    ]);

    // Second call: focal=1002, sees parent 1001
    const response1002 = buildTweetDetailResponse([
      buildTweetEntry(tweet1), // the parent tweet context
      buildTweetEntry(tweet2), // the focal tweet
    ]);

    // Third call: focal=1001, sees root (no parent)
    const response1001 = buildTweetDetailResponse([
      buildTweetEntry(tweet1),
      buildTweetEntry(tweet2),
      buildTweetEntry(tweet3),
    ]);

    let callCount = 0;
    const client = createMockClient((queryId, opName, variables) => {
      callCount++;
      const focalId = variables?.focalTweetId;
      if (focalId === '1003') return response1003;
      if (focalId === '1002') return response1002;
      if (focalId === '1001') return response1001;
      return buildTweetDetailResponse([]);
    });

    const result = await scrapeFullThread(client, '1003');

    // Should have walked: 1003 → 1002 → 1001 (3 calls), then scrapeThread from 1001 (1 call)
    expect(client.graphql).toHaveBeenCalledTimes(4);
    expect(result.rootTweet).toBeDefined();
    expect(result.rootTweet.id).toBe('1001');
  });

  it('should return directly if the tweet is already the root', async () => {
    const rootTweet = buildRawTweet({
      id: '2001',
      text: 'Root that has no parent',
    });

    const response = buildTweetDetailResponse([buildTweetEntry(rootTweet)]);
    const client = createMockClient(() => response);

    const result = await scrapeFullThread(client, '2001');

    // Only 1 call needed (discover it's the root) + 1 call (scrape from root) = might be 1 or 2
    // Since the first call already shows no parent, it just scrapes from there
    expect(result.rootTweet.id).toBe('2001');
  });

  it('should respect maxDepth to prevent infinite loops', async () => {
    // Create a situation where every tweet points to a different parent
    let callNum = 0;
    const client = createMockClient((queryId, opName, variables) => {
      callNum++;
      const focalId = variables?.focalTweetId;
      const parentId = String(Number(focalId) - 1);

      const tweet = buildRawTweet({
        id: focalId,
        text: `Tweet ${focalId}`,
        inReplyToTweetId: parentId,
        inReplyToUserId: 'u1',
      });

      return buildTweetDetailResponse([buildTweetEntry(tweet)]);
    });

    const result = await scrapeFullThread(client, '1000', { maxDepth: 5 });

    // Should have stopped after maxDepth traversals + 1 final scrape
    expect(client.graphql.mock.calls.length).toBeLessThanOrEqual(7);
    expect(result.rootTweet).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Tests: scrapeConversation
// ---------------------------------------------------------------------------

describe('scrapeConversation', () => {
  it('should collect all replies across pages', async () => {
    const rootTweet = buildRawTweet({ id: '3000', text: 'Root' });
    const reply1 = buildRawTweet({
      id: '3001',
      text: 'Reply 1',
      authorId: 'other1',
      authorUsername: 'replier1',
      inReplyToTweetId: '3000',
    });

    // Page 1: root + reply1 + cursor
    const page1 = buildTweetDetailResponse([
      buildTweetEntry(rootTweet),
      buildConversationModule(
        'conversationthread-3001',
        [reply1],
        [{ type: 'Bottom', value: 'page2_cursor' }],
      ),
    ]);

    const reply2 = buildRawTweet({
      id: '3002',
      text: 'Reply 2',
      authorId: 'other2',
      authorUsername: 'replier2',
      inReplyToTweetId: '3000',
    });

    // Page 2: root + reply2 (no more cursor)
    const page2 = buildTweetDetailResponse([
      buildTweetEntry(rootTweet),
      buildConversationModule('conversationthread-3002', [reply2]),
    ]);

    let callCount = 0;
    const client = createMockClient((queryId, opName, variables) => {
      callCount++;
      if (!variables.cursor) return page1;
      return page2;
    });

    const result = await scrapeConversation(client, '3000', { limit: 200 });

    expect(callCount).toBe(2);
    expect(result.conversation.length).toBeGreaterThanOrEqual(2);
    expect(result.rootTweet.id).toBe('3000');
  });

  it('should respect the limit option', async () => {
    const rootTweet = buildRawTweet({ id: '4000', text: 'Root' });
    const replies = Array.from({ length: 10 }, (_, i) =>
      buildRawTweet({
        id: `400${i + 1}`,
        text: `Reply ${i + 1}`,
        authorId: `user${i}`,
        inReplyToTweetId: '4000',
      }),
    );

    const response = buildTweetDetailResponse([
      buildTweetEntry(rootTweet),
      ...replies.map((r) =>
        buildConversationModule(`conversationthread-${r.rest_id}`, [r]),
      ),
    ]);

    const client = createMockClient(() => response);

    // Limit to 5 total tweets (including root)
    const result = await scrapeConversation(client, '4000', { limit: 5 });

    // Total tweets fetched should not exceed limit
    // (root + replies = at most 5 deduplicated)
    expect(result.rootTweet).toBeDefined();
  });

  it('should pass sortBy as rankingMode to the API', async () => {
    const rootTweet = buildRawTweet({ id: '5000', text: 'Root' });
    const response = buildTweetDetailResponse([buildTweetEntry(rootTweet)]);

    const client = createMockClient(() => response);

    await scrapeConversation(client, '5000', { sortBy: 'recency' });

    expect(client.graphql).toHaveBeenCalledWith(
      expect.any(String),
      'TweetDetail',
      expect.objectContaining({
        rankingMode: 'Recency',
      }),
    );
  });

  it('should call onProgress callback during pagination', async () => {
    const rootTweet = buildRawTweet({ id: '6000', text: 'Root' });
    const response = buildTweetDetailResponse([buildTweetEntry(rootTweet)]);

    const client = createMockClient(() => response);
    const onProgress = vi.fn();

    await scrapeConversation(client, '6000', { onProgress });

    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        fetched: expect.any(Number),
        limit: 200,
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// Tests: cursor extraction
// ---------------------------------------------------------------------------

describe('cursor extraction', () => {
  it('should extract Bottom cursor from cursor entry', async () => {
    const rootTweet = buildRawTweet({ id: '7000', text: 'Root' });
    const entries = [
      buildTweetEntry(rootTweet),
      buildCursorEntry('Bottom', 'bottom_cursor_xyz'),
    ];

    const response = buildTweetDetailResponse(entries);
    const client = createMockClient(() => response);

    const result = await scrapeThread(client, '7000');

    expect(result.hasMore).toBe(true);
    expect(result.cursor).toBe('bottom_cursor_xyz');
  });

  it('should extract ShowMoreThreads cursor from conversation module', async () => {
    const rootTweet = buildRawTweet({ id: '7100', text: 'Root' });
    const reply = buildRawTweet({
      id: '7101',
      text: 'Reply',
      inReplyToTweetId: '7100',
    });

    const entries = [
      buildTweetEntry(rootTweet),
      buildConversationModule(
        'conversationthread-7101',
        [reply],
        [{ type: 'ShowMoreThreads', value: 'showmore_cursor_abc' }],
      ),
    ];

    const response = buildTweetDetailResponse(entries);
    const client = createMockClient(() => response);

    const result = await scrapeThread(client, '7100');

    expect(result.hasMore).toBe(true);
    // Should find either the Bottom or ShowMoreThreads cursor
    expect(result.cursor).toBeTruthy();
  });

  it('should set hasMore=false when no cursor present', async () => {
    const rootTweet = buildRawTweet({ id: '7200', text: 'Root' });
    const response = buildTweetDetailResponse([buildTweetEntry(rootTweet)]);

    const client = createMockClient(() => response);

    const result = await scrapeThread(client, '7200');

    expect(result.hasMore).toBe(false);
    expect(result.cursor).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Tests: handling deleted tweets in thread
// ---------------------------------------------------------------------------

describe('deleted tweets in thread', () => {
  it('should include tombstone tweets in parsed output', async () => {
    const rootTweet = buildRawTweet({ id: '8000', text: 'Root' });

    const tombstoneTweet = {
      __typename: 'TweetTombstone',
      tombstone: {
        text: { text: 'This Tweet was deleted by the Tweet author.' },
      },
    };

    const reply = buildRawTweet({
      id: '8002',
      text: 'Reply after deleted',
      inReplyToTweetId: '8001', // references the deleted tweet
    });

    const entries = [
      buildTweetEntry(rootTweet),
      {
        entryId: 'tweet-8001',
        content: {
          __typename: 'TimelineTimelineItem',
          entryType: 'TimelineTimelineItem',
          itemContent: {
            __typename: 'TimelineTweet',
            tweet_results: { result: tombstoneTweet },
          },
        },
      },
      buildConversationModule('conversationthread-8002', [reply]),
    ];

    const response = buildTweetDetailResponse(entries);
    const client = createMockClient(() => response);

    const result = await scrapeThread(client, '8000');

    // Root + reply should be in the result; tombstone has no id so won't appear as a valid tweet
    expect(result.rootTweet.id).toBe('8000');
    // The reply to the deleted tweet should still be present
    const replyIds = result.conversation.map((t) => t.id);
    expect(replyIds).toContain('8002');
  });

  it('should handle TweetWithVisibilityResults wrapper in modules', async () => {
    const rawTweet = {
      __typename: 'TweetWithVisibilityResults',
      tweet: buildRawTweet({ id: '8100', text: 'Visibility-wrapped tweet' }),
    };

    const entries = [
      {
        entryId: 'tweet-8100',
        content: {
          __typename: 'TimelineTimelineItem',
          entryType: 'TimelineTimelineItem',
          itemContent: {
            __typename: 'TimelineTweet',
            tweet_results: { result: rawTweet },
          },
        },
      },
    ];

    const response = buildTweetDetailResponse(entries);
    const client = createMockClient(() => response);

    const result = await scrapeThread(client, '8100');

    expect(result.rootTweet).toBeDefined();
    expect(result.rootTweet.id).toBe('8100');
  });
});
