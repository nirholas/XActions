/**
 * Tests for src/scrapers/twitter/http/search.js
 *
 * Uses vitest with mocked client — no real network requests.
 * Fixture data mirrors actual Twitter GraphQL response shapes.
 *
 * @author nich (@nichxbt)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildAdvancedQuery,
  searchTweets,
  searchUsers,
  scrapeTrending,
  scrapeHashtag,
} from '../../src/scrapers/twitter/http/search.js';

// ---------------------------------------------------------------------------
// Mock client factory
// ---------------------------------------------------------------------------

function createMockClient(handlers = {}) {
  return {
    graphql: vi.fn(handlers.graphql || (async () => ({}))),
    rest: vi.fn(handlers.rest || (async () => ({}))),
    isAuthenticated: vi.fn(() => true),
  };
}

// ---------------------------------------------------------------------------
// Fixtures — realistic Twitter GraphQL response shapes
// ---------------------------------------------------------------------------

function buildRawTweet(overrides = {}) {
  return {
    __typename: 'Tweet',
    rest_id: overrides.id || '1234567890',
    core: {
      user_results: {
        result: {
          __typename: 'User',
          rest_id: '44196397',
          legacy: {
            screen_name: 'testuser',
            name: 'Test User',
            profile_image_url_https:
              'https://pbs.twimg.com/profile_images/1234/photo_normal.jpg',
            verified: false,
          },
          is_blue_verified: true,
        },
      },
    },
    legacy: {
      id_str: overrides.id || '1234567890',
      full_text: overrides.text || 'Test tweet content',
      created_at: 'Wed Jan 15 12:00:00 +0000 2025',
      favorite_count: 100,
      retweet_count: 20,
      reply_count: 5,
      quote_count: 2,
      bookmark_count: 10,
      lang: 'en',
      source: '<a href="https://mobile.twitter.com" rel="nofollow">Twitter Web App</a>',
      entities: {
        urls: [],
        hashtags: overrides.hashtags || [],
        user_mentions: [],
      },
      extended_entities: { media: [] },
    },
    views: { count: '5000' },
  };
}

function buildSearchTimelineResponse(tweetCount, bottomCursorValue = null) {
  const entries = [];

  for (let i = 0; i < tweetCount; i++) {
    const tweetId = String(9000000000 + i);
    entries.push({
      entryId: `tweet-${tweetId}`,
      sortIndex: tweetId,
      content: {
        entryType: 'TimelineTimelineItem',
        itemContent: {
          itemType: 'TimelineTweet',
          tweet_results: {
            result: buildRawTweet({
              id: tweetId,
              text: `Search result tweet ${i}`,
            }),
          },
        },
      },
    });
  }

  // Top cursor
  entries.unshift({
    entryId: 'cursor-top-9999999999',
    sortIndex: '9999999999',
    content: {
      entryType: 'TimelineTimelineCursor',
      cursorType: 'Top',
      value: 'DAACCgACGKi_top',
    },
  });

  // Bottom cursor
  if (bottomCursorValue) {
    entries.push({
      entryId: 'cursor-bottom-8000000000',
      sortIndex: '8000000000',
      content: {
        entryType: 'TimelineTimelineCursor',
        cursorType: 'Bottom',
        value: bottomCursorValue,
      },
    });
  }

  return {
    data: {
      search_by_raw_query: {
        search_timeline: {
          timeline: {
            instructions: [
              {
                type: 'TimelineAddEntries',
                entries,
              },
            ],
          },
        },
      },
    },
  };
}

function buildSearchUsersResponse(userCount, bottomCursorValue = null) {
  const entries = [];

  for (let i = 0; i < userCount; i++) {
    const userId = String(5000000000 + i);
    entries.push({
      entryId: `user-${userId}`,
      sortIndex: userId,
      content: {
        entryType: 'TimelineTimelineItem',
        itemContent: {
          itemType: 'TimelineUser',
          user_results: {
            result: {
              __typename: 'User',
              rest_id: userId,
              is_blue_verified: i % 2 === 0,
              legacy: {
                created_at: 'Mon Mar 10 08:00:00 +0000 2020',
                name: `User ${i}`,
                screen_name: `user${i}`,
                description: `Bio for user ${i}`,
                location: 'Internet',
                url: null,
                protected: false,
                verified: false,
                followers_count: 1000 + i * 100,
                friends_count: 500 + i * 10,
                statuses_count: 2000 + i * 50,
                favourites_count: 5000 + i * 100,
                media_count: 100 + i,
                profile_image_url_https: `https://pbs.twimg.com/profile_images/${userId}/photo_normal.jpg`,
                profile_banner_url: `https://pbs.twimg.com/profile_banners/${userId}/1680000000`,
                pinned_tweet_ids_str: [],
                entities: {
                  description: { urls: [] },
                },
              },
            },
          },
        },
      },
    });
  }

  // Top cursor
  entries.unshift({
    entryId: 'cursor-top-people-999',
    sortIndex: '999',
    content: {
      entryType: 'TimelineTimelineCursor',
      cursorType: 'Top',
      value: 'DAACCgACGKi_people_top',
    },
  });

  // Bottom cursor
  if (bottomCursorValue) {
    entries.push({
      entryId: 'cursor-bottom-people-000',
      sortIndex: '000',
      content: {
        entryType: 'TimelineTimelineCursor',
        cursorType: 'Bottom',
        value: bottomCursorValue,
      },
    });
  }

  return {
    data: {
      search_by_raw_query: {
        search_timeline: {
          timeline: {
            instructions: [
              {
                type: 'TimelineAddEntries',
                entries,
              },
            ],
          },
        },
      },
    },
  };
}

function buildTrendingResponse() {
  return [
    {
      trends: [
        {
          name: '#JavaScript',
          url: 'https://x.com/search?q=%23JavaScript',
          promoted_content: null,
          query: '%23JavaScript',
          tweet_volume: 125000,
        },
        {
          name: 'TypeScript',
          url: 'https://x.com/search?q=TypeScript',
          promoted_content: null,
          query: 'TypeScript',
          tweet_volume: 80000,
        },
        {
          name: '#AI',
          url: 'https://x.com/search?q=%23AI',
          promoted_content: {
            advertiser_id: '12345',
          },
          query: '%23AI',
          tweet_volume: 500000,
        },
        {
          name: 'Vitest',
          url: 'https://x.com/search?q=Vitest',
          promoted_content: null,
          query: 'Vitest',
          tweet_volume: null,
        },
      ],
      as_of: '2025-01-15T12:00:00Z',
      created_at: '2025-01-15T12:00:00Z',
      locations: [{ name: 'Worldwide', woeid: 1 }],
    },
  ];
}

// ═══════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('buildAdvancedQuery', () => {
  it('builds a query with all options', () => {
    const query = buildAdvancedQuery({
      keywords: 'javascript',
      from: 'nichxbt',
      since: '2025-01-01',
      until: '2025-12-31',
      minLikes: 100,
      minRetweets: 50,
      lang: 'en',
      filter: 'links',
      exclude: 'retweets',
    });

    expect(query).toBe(
      'javascript from:nichxbt since:2025-01-01 until:2025-12-31 min_faves:100 min_retweets:50 lang:en filter:links -filter:retweets',
    );
  });

  it('builds a query with minimal options (keywords only)', () => {
    const query = buildAdvancedQuery({ keywords: 'hello world' });
    expect(query).toBe('hello world');
  });

  it('handles empty options', () => {
    const query = buildAdvancedQuery({});
    expect(query).toBe('');
  });

  it('handles multiple filters and excludes', () => {
    const query = buildAdvancedQuery({
      keywords: 'news',
      filter: ['images', 'videos'],
      exclude: ['retweets', 'replies'],
    });

    expect(query).toBe(
      'news filter:images filter:videos -filter:retweets -filter:replies',
    );
  });

  it('includes geo search (near + within)', () => {
    const query = buildAdvancedQuery({
      keywords: 'coffee',
      near: 'San Francisco',
      within: '15mi',
    });

    expect(query).toBe('coffee near:"San Francisco" within:15mi');
  });

  it('includes to, mentioning, url, and list filters', () => {
    const query = buildAdvancedQuery({
      to: 'nichxbt',
      mentioning: 'elonmusk',
      url: 'github.com',
      listId: '123456',
    });

    expect(query).toBe('to:nichxbt @elonmusk url:github.com list:123456');
  });

  it('handles minReplies option', () => {
    const query = buildAdvancedQuery({
      keywords: 'debate',
      minReplies: 1000,
    });

    expect(query).toBe('debate min_replies:1000');
  });

  it('handles from without keywords', () => {
    const query = buildAdvancedQuery({
      from: 'nichxbt',
      since: '2025-06-01',
    });

    expect(query).toBe('from:nichxbt since:2025-06-01');
  });
});

describe('searchTweets', () => {
  it('constructs correct GraphQL variables with default type', async () => {
    const client = createMockClient({
      graphql: async (queryId, opName, variables) => {
        return buildSearchTimelineResponse(3, null);
      },
    });

    await searchTweets(client, 'javascript frameworks', { limit: 10 });

    expect(client.graphql).toHaveBeenCalledTimes(1);
    const [queryId, opName, variables] = client.graphql.mock.calls[0];
    expect(opName).toBe('SearchTimeline');
    expect(variables.rawQuery).toBe('javascript frameworks');
    expect(variables.product).toBe('Latest');
    expect(variables.count).toBe(20);
    expect(variables.querySource).toBe('typed_query');
  });

  it('supports different search types (Top, Photos, Videos)', async () => {
    const client = createMockClient({
      graphql: async () => buildSearchTimelineResponse(2, null),
    });

    await searchTweets(client, 'cats', { type: 'Top', limit: 5 });

    const variables = client.graphql.mock.calls[0][2];
    expect(variables.product).toBe('Top');
  });

  it('merges inline options into the query string', async () => {
    const client = createMockClient({
      graphql: async () => buildSearchTimelineResponse(1, null),
    });

    await searchTweets(client, 'AI tools', {
      from: 'nichxbt',
      since: '2025-01-01',
      lang: 'en',
      minLikes: 50,
      limit: 5,
    });

    const variables = client.graphql.mock.calls[0][2];
    expect(variables.rawQuery).toBe(
      'AI tools from:nichxbt since:2025-01-01 min_faves:50 lang:en',
    );
  });

  it('parses search results into tweet objects', async () => {
    const client = createMockClient({
      graphql: async () => buildSearchTimelineResponse(3, null),
    });

    const tweets = await searchTweets(client, 'test', { limit: 10 });

    expect(tweets).toHaveLength(3);
    expect(tweets[0]).toHaveProperty('id');
    expect(tweets[0]).toHaveProperty('text');
    expect(tweets[0]).toHaveProperty('author');
    expect(tweets[0]).toHaveProperty('metrics');
    expect(tweets[0].platform).toBe('twitter');
  });

  it('paginates through multiple pages of results', async () => {
    let callCount = 0;

    const client = createMockClient({
      graphql: async () => {
        callCount++;
        if (callCount === 1) {
          return buildSearchTimelineResponse(5, 'CURSOR_PAGE_2');
        }
        return buildSearchTimelineResponse(3, null);
      },
    });

    const tweets = await searchTweets(client, 'paginated', { limit: 20 });

    expect(tweets).toHaveLength(8);
    expect(client.graphql).toHaveBeenCalledTimes(2);

    // Second call should include cursor
    const secondCallVars = client.graphql.mock.calls[1][2];
    expect(secondCallVars.cursor).toBe('CURSOR_PAGE_2');
  });

  it('respects limit option and stops early', async () => {
    const client = createMockClient({
      graphql: async () => buildSearchTimelineResponse(10, 'MORE_CURSOR'),
    });

    const tweets = await searchTweets(client, 'limited', { limit: 5 });

    expect(tweets).toHaveLength(5);
    // Should only call once since first page already has enough
    expect(client.graphql).toHaveBeenCalledTimes(1);
  });

  it('calls onProgress callback during pagination', async () => {
    const progressCalls = [];

    const client = createMockClient({
      graphql: async () => buildSearchTimelineResponse(3, null),
    });

    await searchTweets(client, 'progress', {
      limit: 10,
      onProgress: (p) => progressCalls.push(p),
    });

    expect(progressCalls.length).toBeGreaterThan(0);
    expect(progressCalls[0]).toHaveProperty('fetched');
    expect(progressCalls[0]).toHaveProperty('limit');
    expect(progressCalls[0].fetched).toBe(3);
    expect(progressCalls[0].limit).toBe(10);
  });

  it('resumes from a provided cursor', async () => {
    const client = createMockClient({
      graphql: async () => buildSearchTimelineResponse(2, null),
    });

    await searchTweets(client, 'resume', {
      cursor: 'RESUME_CURSOR',
      limit: 10,
    });

    const variables = client.graphql.mock.calls[0][2];
    expect(variables.cursor).toBe('RESUME_CURSOR');
  });

  it('handles empty search results', async () => {
    const client = createMockClient({
      graphql: async () => buildSearchTimelineResponse(0, null),
    });

    const tweets = await searchTweets(client, 'nonexistent query xyz', {
      limit: 10,
    });

    expect(tweets).toHaveLength(0);
  });
});

describe('searchUsers', () => {
  it('sends product=People in GraphQL variables', async () => {
    const client = createMockClient({
      graphql: async () => buildSearchUsersResponse(3, null),
    });

    await searchUsers(client, 'javascript developer', { limit: 10 });

    expect(client.graphql).toHaveBeenCalledTimes(1);
    const variables = client.graphql.mock.calls[0][2];
    expect(variables.product).toBe('People');
    expect(variables.rawQuery).toBe('javascript developer');
  });

  it('returns parsed user profile objects', async () => {
    const client = createMockClient({
      graphql: async () => buildSearchUsersResponse(3, null),
    });

    const users = await searchUsers(client, 'dev', { limit: 10 });

    expect(users).toHaveLength(3);
    expect(users[0]).toHaveProperty('id');
    expect(users[0]).toHaveProperty('username');
    expect(users[0]).toHaveProperty('name');
    expect(users[0]).toHaveProperty('bio');
    expect(users[0]).toHaveProperty('followers');
    expect(users[0].platform).toBe('twitter');
  });

  it('paginates user search results', async () => {
    let callCount = 0;

    const client = createMockClient({
      graphql: async () => {
        callCount++;
        if (callCount === 1) {
          return buildSearchUsersResponse(5, 'PEOPLE_PAGE_2');
        }
        return buildSearchUsersResponse(2, null);
      },
    });

    const users = await searchUsers(client, 'engineer', { limit: 20 });

    expect(users).toHaveLength(7);
    expect(client.graphql).toHaveBeenCalledTimes(2);
  });

  it('respects limit option', async () => {
    const client = createMockClient({
      graphql: async () => buildSearchUsersResponse(10, 'MORE'),
    });

    const users = await searchUsers(client, 'dev', { limit: 3 });

    expect(users).toHaveLength(3);
  });

  it('calls onProgress for user search', async () => {
    const progressCalls = [];

    const client = createMockClient({
      graphql: async () => buildSearchUsersResponse(4, null),
    });

    await searchUsers(client, 'test', {
      limit: 10,
      onProgress: (p) => progressCalls.push(p),
    });

    expect(progressCalls.length).toBeGreaterThan(0);
    expect(progressCalls[0].fetched).toBe(4);
  });

  it('handles empty user search results', async () => {
    const client = createMockClient({
      graphql: async () => buildSearchUsersResponse(0, null),
    });

    const users = await searchUsers(client, 'zzz_no_results', { limit: 10 });
    expect(users).toHaveLength(0);
  });
});

describe('scrapeHashtag', () => {
  it('prefixes # to hashtag without leading #', async () => {
    const client = createMockClient({
      graphql: async (queryId, opName, variables) => {
        return buildSearchTimelineResponse(2, null);
      },
    });

    await scrapeHashtag(client, 'javascript', { limit: 10 });

    const variables = client.graphql.mock.calls[0][2];
    expect(variables.rawQuery).toBe('#javascript');
  });

  it('does not double-prefix # if already present', async () => {
    const client = createMockClient({
      graphql: async () => buildSearchTimelineResponse(2, null),
    });

    await scrapeHashtag(client, '#typescript', { limit: 10 });

    const variables = client.graphql.mock.calls[0][2];
    expect(variables.rawQuery).toBe('#typescript');
  });

  it('returns tweet objects from hashtag search', async () => {
    const client = createMockClient({
      graphql: async () => buildSearchTimelineResponse(3, null),
    });

    const tweets = await scrapeHashtag(client, 'webdev', { limit: 10 });

    expect(tweets).toHaveLength(3);
    expect(tweets[0].platform).toBe('twitter');
  });

  it('passes options through to searchTweets', async () => {
    const client = createMockClient({
      graphql: async () => buildSearchTimelineResponse(1, null),
    });

    await scrapeHashtag(client, 'react', {
      limit: 5,
      type: 'Top',
    });

    const variables = client.graphql.mock.calls[0][2];
    expect(variables.product).toBe('Top');
  });
});

describe('scrapeTrending', () => {
  it('calls REST endpoint with worldwide WOEID by default', async () => {
    const client = createMockClient({
      rest: async () => buildTrendingResponse(),
    });

    await scrapeTrending(client);

    expect(client.rest).toHaveBeenCalledTimes(1);
    const [path, options] = client.rest.mock.calls[0];
    expect(path).toBe('/1.1/trends/place.json?id=1');
    expect(options.method).toBe('GET');
  });

  it('uses custom WOEID for location-specific trends', async () => {
    const client = createMockClient({
      rest: async () => buildTrendingResponse(),
    });

    await scrapeTrending(client, { woeid: 23424977 }); // US

    const path = client.rest.mock.calls[0][0];
    expect(path).toBe('/1.1/trends/place.json?id=23424977');
  });

  it('parses trending topics with correct structure', async () => {
    const client = createMockClient({
      rest: async () => buildTrendingResponse(),
    });

    const trends = await scrapeTrending(client);

    expect(trends).toHaveLength(4);

    // First trend
    expect(trends[0].name).toBe('#JavaScript');
    expect(trends[0].tweetCount).toBe(125000);
    expect(trends[0].url).toBe('https://x.com/search?q=%23JavaScript');
    expect(trends[0].category).toBeNull();

    // Second trend
    expect(trends[1].name).toBe('TypeScript');
    expect(trends[1].tweetCount).toBe(80000);

    // Promoted trend
    expect(trends[2].name).toBe('#AI');
    expect(trends[2].category).toBe('promoted');
    expect(trends[2].tweetCount).toBe(500000);

    // Trend with null tweet volume
    expect(trends[3].name).toBe('Vitest');
    expect(trends[3].tweetCount).toBeNull();
  });

  it('handles non-array response (single location object)', async () => {
    const client = createMockClient({
      rest: async () => ({
        trends: [
          { name: 'SingleTrend', url: 'https://x.com/search?q=SingleTrend', tweet_volume: 999, promoted_content: null },
        ],
      }),
    });

    const trends = await scrapeTrending(client);

    expect(trends).toHaveLength(1);
    expect(trends[0].name).toBe('SingleTrend');
    expect(trends[0].tweetCount).toBe(999);
  });

  it('handles empty trends array', async () => {
    const client = createMockClient({
      rest: async () => [{ trends: [], locations: [{ name: 'Worldwide', woeid: 1 }] }],
    });

    const trends = await scrapeTrending(client);
    expect(trends).toHaveLength(0);
  });
});

describe('pagination cursor extraction from search results', () => {
  it('extracts bottom cursor from search timeline response', async () => {
    let callCount = 0;

    const client = createMockClient({
      graphql: async () => {
        callCount++;
        if (callCount === 1) {
          return buildSearchTimelineResponse(5, 'DAACCgACGKi_page2');
        }
        if (callCount === 2) {
          return buildSearchTimelineResponse(5, 'DAACCgACGKi_page3');
        }
        return buildSearchTimelineResponse(2, null);
      },
    });

    const tweets = await searchTweets(client, 'pagination test', { limit: 50 });

    expect(tweets).toHaveLength(12); // 5 + 5 + 2
    expect(client.graphql).toHaveBeenCalledTimes(3);

    // Verify cursors passed correctly
    expect(client.graphql.mock.calls[0][2].cursor).toBeUndefined();
    expect(client.graphql.mock.calls[1][2].cursor).toBe('DAACCgACGKi_page2');
    expect(client.graphql.mock.calls[2][2].cursor).toBe('DAACCgACGKi_page3');
  });

  it('stops pagination when no bottom cursor returned', async () => {
    const client = createMockClient({
      graphql: async () => buildSearchTimelineResponse(5, null),
    });

    const tweets = await searchTweets(client, 'no more pages', { limit: 50 });

    expect(tweets).toHaveLength(5);
    expect(client.graphql).toHaveBeenCalledTimes(1);
  });

  it('stops pagination when page returns zero tweets', async () => {
    let callCount = 0;

    const client = createMockClient({
      graphql: async () => {
        callCount++;
        if (callCount === 1) {
          return buildSearchTimelineResponse(5, 'SOME_CURSOR');
        }
        // Second page returns tweets but empty parsed (simulate all filtered)
        return buildSearchTimelineResponse(0, 'ANOTHER_CURSOR');
      },
    });

    const tweets = await searchTweets(client, 'end early', { limit: 50 });

    expect(tweets).toHaveLength(5);
    expect(client.graphql).toHaveBeenCalledTimes(2);
  });
});
