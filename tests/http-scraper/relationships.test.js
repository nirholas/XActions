/**
 * Relationships HTTP Scraper — Test Suite
 *
 * Tests for follower/following scraping, non-follower detection,
 * likers, retweeters, list members, and user list parsing.
 *
 * Uses vitest with mocked client — no real network requests.
 *
 * @author nich (@nichxbt)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  parseUserList,
  parseUserEntry,
  scrapeFollowers,
  scrapeFollowing,
  scrapeNonFollowers,
  scrapeLikers,
  scrapeRetweeters,
  scrapeListMembers,
} from '../../src/scrapers/twitter/http/relationships.js';

// ---------------------------------------------------------------------------
// Fixtures — realistic GraphQL response shapes
// ---------------------------------------------------------------------------

/**
 * Build a raw GraphQL user result (as found in `user_results.result`).
 */
function buildRawUser(overrides = {}) {
  const username = overrides.username ?? 'testuser';
  return {
    __typename: 'User',
    id: `VXNlcjox${Math.random().toString(36).slice(2, 8)}`,
    rest_id: overrides.rest_id ?? String(Math.floor(Math.random() * 1e15)),
    legacy: {
      screen_name: username,
      name: overrides.name ?? `Test ${username}`,
      description: overrides.bio ?? `Bio for @${username}`,
      followers_count: overrides.followersCount ?? 100,
      friends_count: overrides.followingCount ?? 50,
      verified: false,
      protected: overrides.protected ?? false,
      profile_image_url_https:
        overrides.avatar ??
        `https://pbs.twimg.com/profile_images/123/photo_normal.jpg`,
      ...(overrides.legacy ?? {}),
    },
    is_blue_verified: overrides.verified ?? false,
  };
}

/**
 * Build a single user entry as it appears in `instructions[].entries[]`.
 */
function buildUserEntry(username, index = 0) {
  return {
    entryId: `user-${username}-${index}`,
    sortIndex: String(Date.now() - index),
    content: {
      entryType: 'TimelineTimelineItem',
      __typename: 'TimelineTimelineItem',
      itemContent: {
        itemType: 'TimelineUser',
        __typename: 'TimelineUser',
        user_results: {
          result: buildRawUser({ username }),
        },
      },
    },
  };
}

/**
 * Build a cursor entry.
 */
function buildCursorEntry(type, value) {
  return {
    entryId: `cursor-${type}-${Date.now()}`,
    sortIndex: '0',
    content: {
      entryType: 'TimelineTimelineCursor',
      __typename: 'TimelineTimelineCursor',
      value,
      cursorType: type === 'bottom' ? 'Bottom' : 'Top',
    },
  };
}

/**
 * Build a complete timeline instructions array with users and optional cursor.
 */
function buildInstructions(usernames, bottomCursor = null) {
  const entries = usernames.map((u, i) => buildUserEntry(u, i));
  entries.push(buildCursorEntry('top', 'cursor-top-value'));
  if (bottomCursor) {
    entries.push(buildCursorEntry('bottom', bottomCursor));
  }
  return [
    {
      type: 'TimelineAddEntries',
      entries,
    },
  ];
}

/**
 * Build a full GraphQL response wrapping instructions at a given path.
 */
function buildGraphQLResponse(instructions, path) {
  const segments = path.split('.');
  let obj = { [segments[segments.length - 1]]: instructions };
  for (let i = segments.length - 2; i >= 0; i--) {
    obj = { [segments[i]]: obj };
  }
  return obj;
}

// ---------------------------------------------------------------------------
// Mock client factory
// ---------------------------------------------------------------------------

/**
 * Create a mock TwitterHttpClient.
 */
function createMockClient({ authenticated = true, graphqlResponses = [] } = {}) {
  let callIndex = 0;

  return {
    isAuthenticated: vi.fn(() => authenticated),
    graphql: vi.fn(async () => {
      if (callIndex < graphqlResponses.length) {
        return graphqlResponses[callIndex++];
      }
      // Return empty instructions if no more responses
      return buildGraphQLResponse([], 'data.user.result.timeline.timeline.instructions');
    }),
  };
}

// ---------------------------------------------------------------------------
// Tests: parseUserEntry
// ---------------------------------------------------------------------------

describe('parseUserEntry', () => {
  it('parses a standard user result into XActions format', () => {
    const raw = buildRawUser({
      username: 'nichxbt',
      name: 'nich',
      bio: 'building XActions',
      verified: true,
      followersCount: 5000,
      followingCount: 200,
    });

    const parsed = parseUserEntry(raw);

    expect(parsed).toEqual(
      expect.objectContaining({
        username: 'nichxbt',
        name: 'nich',
        bio: 'building XActions',
        verified: true,
        followersCount: 5000,
        followingCount: 200,
        platform: 'twitter',
      }),
    );
    expect(parsed.id).toBeTruthy();
    expect(parsed.avatar).toContain('_400x400');
    expect(parsed.avatar).not.toContain('_normal');
  });

  it('returns null for UserUnavailable', () => {
    const raw = { __typename: 'UserUnavailable', reason: 'Suspended' };
    expect(parseUserEntry(raw)).toBeNull();
  });

  it('returns null for null/undefined input', () => {
    expect(parseUserEntry(null)).toBeNull();
    expect(parseUserEntry(undefined)).toBeNull();
  });

  it('handles missing optional fields gracefully', () => {
    const raw = {
      __typename: 'User',
      rest_id: '12345',
      legacy: {
        screen_name: 'minimal',
        name: 'Min',
      },
    };

    const parsed = parseUserEntry(raw);

    expect(parsed.username).toBe('minimal');
    expect(parsed.bio).toBeNull();
    expect(parsed.followersCount).toBe(0);
    expect(parsed.followingCount).toBe(0);
    expect(parsed.verified).toBe(false);
    expect(parsed.platform).toBe('twitter');
  });

  it('upgrades avatar from _normal to _400x400', () => {
    const raw = buildRawUser({
      avatar: 'https://pbs.twimg.com/profile_images/999/photo_normal.jpg',
    });

    const parsed = parseUserEntry(raw);
    expect(parsed.avatar).toBe('https://pbs.twimg.com/profile_images/999/photo_400x400.jpg');
  });
});

// ---------------------------------------------------------------------------
// Tests: parseUserList
// ---------------------------------------------------------------------------

describe('parseUserList', () => {
  it('parses user entries from TimelineAddEntries instructions', () => {
    const instructions = buildInstructions(['alice', 'bob', 'charlie']);
    const { users, cursor } = parseUserList(instructions);

    expect(users).toHaveLength(3);
    expect(users.map((u) => u.username)).toEqual(['alice', 'bob', 'charlie']);
    expect(users[0].platform).toBe('twitter');
  });

  it('extracts bottom cursor for pagination', () => {
    const instructions = buildInstructions(['alice'], 'DAACCgACGKiPaginationCursor');
    const { cursor } = parseUserList(instructions);

    expect(cursor).toBe('DAACCgACGKiPaginationCursor');
  });

  it('returns null cursor when no bottom cursor present', () => {
    const instructions = buildInstructions(['alice']);
    const { cursor } = parseUserList(instructions);

    expect(cursor).toBeNull();
  });

  it('handles empty instructions', () => {
    const { users, cursor } = parseUserList([]);

    expect(users).toHaveLength(0);
    expect(cursor).toBeNull();
  });

  it('handles non-array input', () => {
    expect(parseUserList(null)).toEqual({ users: [], cursor: null });
    expect(parseUserList(undefined)).toEqual({ users: [], cursor: null });
    expect(parseUserList('not-array')).toEqual({ users: [], cursor: null });
  });

  it('skips UserUnavailable entries', () => {
    const instructions = [
      {
        type: 'TimelineAddEntries',
        entries: [
          buildUserEntry('alice', 0),
          {
            entryId: 'user-suspended-1',
            content: {
              itemContent: {
                user_results: {
                  result: { __typename: 'UserUnavailable', reason: 'Suspended' },
                },
              },
            },
          },
          buildUserEntry('bob', 2),
        ],
      },
    ];

    const { users } = parseUserList(instructions);
    expect(users).toHaveLength(2);
    expect(users.map((u) => u.username)).toEqual(['alice', 'bob']);
  });

  it('handles __typename-based instruction types', () => {
    const entries = [
      buildUserEntry('dave', 0),
      buildCursorEntry('bottom', 'next-cursor-123'),
    ];

    const instructions = [
      {
        __typename: 'TimelineAddEntries',
        entries,
      },
    ];

    const { users, cursor } = parseUserList(instructions);
    expect(users).toHaveLength(1);
    expect(users[0].username).toBe('dave');
    expect(cursor).toBe('next-cursor-123');
  });
});

// ---------------------------------------------------------------------------
// Tests: scrapeFollowers
// ---------------------------------------------------------------------------

describe('scrapeFollowers', () => {
  it('throws AuthError when client is not authenticated', async () => {
    const client = createMockClient({ authenticated: false });

    await expect(scrapeFollowers(client, 'someone')).rejects.toThrow('requires authentication');
    await expect(scrapeFollowers(client, 'someone')).rejects.toBeInstanceOf(Error);
  });

  it('resolves userId and paginates through follower pages', async () => {
    const userLookupResponse = {
      data: {
        user: {
          result: {
            __typename: 'User',
            rest_id: '44196397',
            legacy: { screen_name: 'testaccount', name: 'Test' },
          },
        },
      },
    };

    const page1 = buildGraphQLResponse(
      buildInstructions(['follower1', 'follower2', 'follower3'], 'cursor-page2'),
      'data.user.result.timeline.timeline.instructions',
    );

    const page2 = buildGraphQLResponse(
      buildInstructions(['follower4', 'follower5']),
      'data.user.result.timeline.timeline.instructions',
    );

    const client = createMockClient({
      graphqlResponses: [userLookupResponse, page1, page2],
    });

    const result = await scrapeFollowers(client, 'testaccount', { limit: 10 });

    expect(result).toHaveLength(5);
    expect(result.map((u) => u.username)).toEqual([
      'follower1',
      'follower2',
      'follower3',
      'follower4',
      'follower5',
    ]);

    // First call = UserByScreenName, subsequent = Followers pagination
    expect(client.graphql).toHaveBeenCalledTimes(3);
  });

  it('respects limit option and stops early', async () => {
    const userLookupResponse = {
      data: {
        user: {
          result: {
            __typename: 'User',
            rest_id: '11111',
            legacy: { screen_name: 'bigaccount', name: 'Big' },
          },
        },
      },
    };

    const page1 = buildGraphQLResponse(
      buildInstructions(
        ['u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'u7', 'u8', 'u9', 'u10'],
        'cursor-next',
      ),
      'data.user.result.timeline.timeline.instructions',
    );

    const client = createMockClient({
      graphqlResponses: [userLookupResponse, page1],
    });

    const result = await scrapeFollowers(client, 'bigaccount', { limit: 5 });

    expect(result).toHaveLength(5);
  });

  it('fires onProgress callback', async () => {
    const userLookupResponse = {
      data: {
        user: {
          result: {
            __typename: 'User',
            rest_id: '22222',
            legacy: { screen_name: 'testprogress', name: 'Progress' },
          },
        },
      },
    };

    const page1 = buildGraphQLResponse(
      buildInstructions(['a', 'b', 'c']),
      'data.user.result.timeline.timeline.instructions',
    );

    const client = createMockClient({
      graphqlResponses: [userLookupResponse, page1],
    });

    const progressCalls = [];
    await scrapeFollowers(client, 'testprogress', {
      onProgress: (p) => progressCalls.push(p),
    });

    expect(progressCalls.length).toBeGreaterThan(0);
    expect(progressCalls[0]).toHaveProperty('fetched');
    expect(progressCalls[0]).toHaveProperty('limit');
  });

  it('throws NotFoundError for non-existent user', async () => {
    const client = createMockClient({
      graphqlResponses: [
        { data: { user: { result: { __typename: 'UserUnavailable' } } } },
      ],
    });

    await expect(scrapeFollowers(client, 'nonexistent')).rejects.toThrow(
      'not found or unavailable',
    );
  });

  it('deduplicates users across pages', async () => {
    const userLookupResponse = {
      data: {
        user: {
          result: {
            __typename: 'User',
            rest_id: '33333',
            legacy: { screen_name: 'dedup', name: 'Dedup' },
          },
        },
      },
    };

    // Page 1 and Page 2 both have 'overlap_user'
    const page1 = buildGraphQLResponse(
      buildInstructions(['unique1', 'overlap_user'], 'cursor-page2'),
      'data.user.result.timeline.timeline.instructions',
    );
    const page2 = buildGraphQLResponse(
      buildInstructions(['overlap_user', 'unique2']),
      'data.user.result.timeline.timeline.instructions',
    );

    const client = createMockClient({
      graphqlResponses: [userLookupResponse, page1, page2],
    });

    const result = await scrapeFollowers(client, 'dedup', { limit: 100 });

    // 'overlap_user' should only appear once
    const usernames = result.map((u) => u.username);
    expect(usernames.filter((u) => u === 'overlap_user')).toHaveLength(1);
    expect(result).toHaveLength(3); // unique1, overlap_user, unique2
  });
});

// ---------------------------------------------------------------------------
// Tests: scrapeFollowing
// ---------------------------------------------------------------------------

describe('scrapeFollowing', () => {
  it('throws AuthError for unauthenticated client', async () => {
    const client = createMockClient({ authenticated: false });

    await expect(scrapeFollowing(client, 'someone')).rejects.toThrow('requires authentication');
  });

  it('returns following list with correct format', async () => {
    const userLookupResponse = {
      data: {
        user: {
          result: {
            __typename: 'User',
            rest_id: '44444',
            legacy: { screen_name: 'me', name: 'Me' },
          },
        },
      },
    };

    const page1 = buildGraphQLResponse(
      buildInstructions(['following1', 'following2']),
      'data.user.result.timeline.timeline.instructions',
    );

    const client = createMockClient({
      graphqlResponses: [userLookupResponse, page1],
    });

    const result = await scrapeFollowing(client, 'me');

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(
      expect.objectContaining({
        username: 'following1',
        platform: 'twitter',
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// Tests: scrapeNonFollowers
// ---------------------------------------------------------------------------

describe('scrapeNonFollowers', () => {
  it('correctly identifies non-followers and mutuals', async () => {
    // For scrapeNonFollowers, the client will be called twice for resolveUserId
    // (once in scrapeFollowing, once in scrapeFollowers), plus pagination calls.

    const userLookup = {
      data: {
        user: {
          result: {
            __typename: 'User',
            rest_id: '55555',
            legacy: { screen_name: 'myaccount', name: 'My Account' },
          },
        },
      },
    };

    // Following list: alice, bob, charlie, dave
    const followingPage = buildGraphQLResponse(
      buildInstructions(['alice', 'bob', 'charlie', 'dave']),
      'data.user.result.timeline.timeline.instructions',
    );

    // Followers list: alice, charlie, eve (bob and dave don't follow back)
    const followersPage = buildGraphQLResponse(
      buildInstructions(['alice', 'charlie', 'eve']),
      'data.user.result.timeline.timeline.instructions',
    );

    const client = createMockClient({
      graphqlResponses: [
        userLookup,     // resolve userId for following
        followingPage,  // following list
        userLookup,     // resolve userId for followers
        followersPage,  // followers list
      ],
    });

    const result = await scrapeNonFollowers(client, 'myaccount');

    // bob and dave follow us but we don't follow them => nonFollowers
    expect(result.nonFollowers.map((u) => u.username).sort()).toEqual(['bob', 'dave']);

    // alice and charlie are mutual
    expect(result.mutuals.map((u) => u.username).sort()).toEqual(['alice', 'charlie']);

    // Stats
    expect(result.stats).toEqual({
      following: 4,
      followers: 3,
      nonFollowers: 2,
      mutuals: 2,
    });
  });

  it('fires phase-aware progress callbacks', async () => {
    const userLookup = {
      data: {
        user: {
          result: {
            __typename: 'User',
            rest_id: '66666',
            legacy: { screen_name: 'progressuser', name: 'Progress' },
          },
        },
      },
    };

    const emptyPage = buildGraphQLResponse(
      buildInstructions([]),
      'data.user.result.timeline.timeline.instructions',
    );

    const client = createMockClient({
      graphqlResponses: [userLookup, emptyPage, userLookup, emptyPage],
    });

    const phases = [];
    await scrapeNonFollowers(client, 'progressuser', {
      onProgress: (p) => phases.push(p.phase),
    });

    expect(phases).toContain('following');
    expect(phases).toContain('followers');
    expect(phases).toContain('comparing');
    expect(phases).toContain('done');
  });

  it('throws AuthError for unauthenticated client', async () => {
    const client = createMockClient({ authenticated: false });

    await expect(scrapeNonFollowers(client, 'someone')).rejects.toThrow(
      'requires authentication',
    );
  });
});

// ---------------------------------------------------------------------------
// Tests: scrapeLikers
// ---------------------------------------------------------------------------

describe('scrapeLikers', () => {
  it('throws AuthError for unauthenticated client', async () => {
    const client = createMockClient({ authenticated: false });

    await expect(scrapeLikers(client, '12345')).rejects.toThrow('requires authentication');
  });

  it('returns users who liked a tweet', async () => {
    const page1 = buildGraphQLResponse(
      buildInstructions(['liker1', 'liker2']),
      'data.favoriters_timeline.timeline.instructions',
    );

    const client = createMockClient({ graphqlResponses: [page1] });

    const result = await scrapeLikers(client, '987654321');

    expect(result).toHaveLength(2);
    expect(result[0].username).toBe('liker1');
    expect(result[0].platform).toBe('twitter');
  });
});

// ---------------------------------------------------------------------------
// Tests: scrapeRetweeters
// ---------------------------------------------------------------------------

describe('scrapeRetweeters', () => {
  it('throws AuthError for unauthenticated client', async () => {
    const client = createMockClient({ authenticated: false });

    await expect(scrapeRetweeters(client, '12345')).rejects.toThrow('requires authentication');
  });

  it('returns users who retweeted a tweet', async () => {
    const page1 = buildGraphQLResponse(
      buildInstructions(['retweeter1', 'retweeter2', 'retweeter3']),
      'data.retweeters_timeline.timeline.instructions',
    );

    const client = createMockClient({ graphqlResponses: [page1] });

    const result = await scrapeRetweeters(client, '111222333');

    expect(result).toHaveLength(3);
    expect(result.map((u) => u.username)).toEqual([
      'retweeter1',
      'retweeter2',
      'retweeter3',
    ]);
  });
});

// ---------------------------------------------------------------------------
// Tests: scrapeListMembers
// ---------------------------------------------------------------------------

describe('scrapeListMembers', () => {
  it('throws AuthError for unauthenticated client', async () => {
    const client = createMockClient({ authenticated: false });

    await expect(scrapeListMembers(client, '12345')).rejects.toThrow('requires authentication');
  });

  it('returns list members', async () => {
    const page1 = buildGraphQLResponse(
      buildInstructions(['member1', 'member2']),
      'data.list.members_timeline.timeline.instructions',
    );

    const client = createMockClient({ graphqlResponses: [page1] });

    const result = await scrapeListMembers(client, '998877');

    expect(result).toHaveLength(2);
    expect(result[0].username).toBe('member1');
  });
});

// ---------------------------------------------------------------------------
// Tests: Pagination limit enforcement
// ---------------------------------------------------------------------------

describe('Pagination limit enforcement', () => {
  it('stops paginating once limit is reached even with more pages available', async () => {
    const userLookup = {
      data: {
        user: {
          result: {
            __typename: 'User',
            rest_id: '77777',
            legacy: { screen_name: 'limituser', name: 'Limit' },
          },
        },
      },
    };

    // Each page has 3 users with a cursor to the next
    const page1 = buildGraphQLResponse(
      buildInstructions(['a', 'b', 'c'], 'cursor-page2'),
      'data.user.result.timeline.timeline.instructions',
    );
    const page2 = buildGraphQLResponse(
      buildInstructions(['d', 'e', 'f'], 'cursor-page3'),
      'data.user.result.timeline.timeline.instructions',
    );
    const page3 = buildGraphQLResponse(
      buildInstructions(['g', 'h', 'i']),
      'data.user.result.timeline.timeline.instructions',
    );

    const client = createMockClient({
      graphqlResponses: [userLookup, page1, page2, page3],
    });

    const result = await scrapeFollowers(client, 'limituser', { limit: 4 });

    expect(result).toHaveLength(4);
    expect(result.map((u) => u.username)).toEqual(['a', 'b', 'c', 'd']);
  });
});

// ---------------------------------------------------------------------------
// Tests: Output format consistency
// ---------------------------------------------------------------------------

describe('Output format — XActions user format', () => {
  it('every user object has required fields', async () => {
    const userLookup = {
      data: {
        user: {
          result: {
            __typename: 'User',
            rest_id: '88888',
            legacy: { screen_name: 'formatuser', name: 'Format' },
          },
        },
      },
    };

    const page = buildGraphQLResponse(
      buildInstructions(['test_format_user']),
      'data.user.result.timeline.timeline.instructions',
    );

    const client = createMockClient({
      graphqlResponses: [userLookup, page],
    });

    const result = await scrapeFollowers(client, 'formatuser', { limit: 1 });

    expect(result).toHaveLength(1);
    const user = result[0];

    // Required fields from the spec
    expect(user).toHaveProperty('username');
    expect(user).toHaveProperty('name');
    expect(user).toHaveProperty('bio');
    expect(user).toHaveProperty('verified');
    expect(user).toHaveProperty('avatar');
    expect(user).toHaveProperty('followersCount');
    expect(user).toHaveProperty('followingCount');
    expect(user).toHaveProperty('platform', 'twitter');
  });
});
