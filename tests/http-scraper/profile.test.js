/**
 * Tests — HTTP Profile Scraper
 *
 * Covers parseUserData (pure function), scrapeProfile, and
 * scrapeProfileById with realistic Twitter GraphQL response fixtures.
 *
 * @author nich (@nichxbt)
 */

import { describe, it, expect, vi } from 'vitest';
import {
  parseUserData,
  scrapeProfile,
  scrapeProfileById,
} from '../../src/scrapers/twitter/http/profile.js';
import { NotFoundError, TwitterApiError } from '../../src/scrapers/twitter/http/errors.js';

// ---------------------------------------------------------------------------
// Fixtures — realistic Twitter GraphQL response shapes (fake user data)
// ---------------------------------------------------------------------------

/** Complete user result (typical public profile) */
const FULL_USER_RAW = {
  __typename: 'User',
  id: 'VXNlcjoxMjM0NTY3ODk=',
  rest_id: '123456789',
  is_blue_verified: true,
  legacy: {
    created_at: 'Tue Mar 21 20:50:14 +0000 2006',
    name: 'Test User',
    screen_name: 'testuser',
    description: 'Building cool stuff 🚀 https://t.co/abc123 and more https://t.co/def456',
    location: 'San Francisco, CA',
    url: 'https://t.co/xyz789',
    protected: false,
    verified: false,
    followers_count: 50000,
    friends_count: 1200,
    statuses_count: 34567,
    favourites_count: 89012,
    media_count: 2345,
    profile_image_url_https: 'https://pbs.twimg.com/profile_images/123/avatar_normal.jpg',
    profile_banner_url: 'https://pbs.twimg.com/profile_banners/123456789/1609459200',
    pinned_tweet_ids_str: ['1700000000000000000'],
    entities: {
      url: {
        urls: [
          {
            display_url: 'example.com',
            expanded_url: 'https://example.com',
            url: 'https://t.co/xyz789',
            indices: [0, 23],
          },
        ],
      },
      description: {
        urls: [
          {
            display_url: 'coolstuff.io',
            expanded_url: 'https://coolstuff.io',
            url: 'https://t.co/abc123',
            indices: [22, 45],
          },
          {
            display_url: 'more.dev',
            expanded_url: 'https://more.dev',
            url: 'https://t.co/def456',
            indices: [56, 79],
          },
        ],
        hashtags: [
          { text: 'builder', indices: [80, 88] },
        ],
        user_mentions: [
          { screen_name: 'nichxbt', indices: [90, 98] },
        ],
      },
    },
    birthdate: { day: 15, month: 6, year: 1990 },
  },
};

/** Minimal user result (new account, sparse data) */
const MINIMAL_USER_RAW = {
  __typename: 'User',
  id: 'VXNlcjo5OTk5OTk5OTk=',
  rest_id: '999999999',
  is_blue_verified: false,
  legacy: {
    created_at: 'Fri Jan 10 12:00:00 +0000 2025',
    name: 'New Account',
    screen_name: 'newaccount2025',
    description: '',
    location: '',
    url: null,
    protected: false,
    verified: false,
    followers_count: 0,
    friends_count: 0,
    statuses_count: 0,
    favourites_count: 0,
    media_count: 0,
    profile_image_url_https: 'https://pbs.twimg.com/profile_images/default_normal.png',
    profile_banner_url: null,
    pinned_tweet_ids_str: [],
    entities: {
      description: { urls: [] },
    },
  },
};

/** UserUnavailable result (suspended / deactivated) */
const UNAVAILABLE_USER_RAW = {
  __typename: 'UserUnavailable',
  reason: 'Suspended',
  message: 'User has been suspended.',
};

/** Protected account result */
const PROTECTED_USER_RAW = {
  __typename: 'User',
  id: 'VXNlcjo1NTU1NTU1NTU=',
  rest_id: '555555555',
  is_blue_verified: false,
  legacy: {
    created_at: 'Sat Aug 01 08:30:00 +0000 2015',
    name: 'Private Person',
    screen_name: 'privateperson',
    description: 'I keep to myself.',
    location: 'Nowhere',
    url: null,
    protected: true,
    verified: false,
    followers_count: 42,
    friends_count: 100,
    statuses_count: 500,
    favourites_count: 1000,
    media_count: 10,
    profile_image_url_https: 'https://pbs.twimg.com/profile_images/555/lock_normal.jpg',
    profile_banner_url: null,
    pinned_tweet_ids_str: [],
    entities: {
      description: { urls: [] },
    },
  },
};

/** Wrap a user result in the full GraphQL response envelope */
function wrapGraphQLResponse(userResult) {
  return {
    data: {
      user: {
        result: userResult,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Mock client factory
// ---------------------------------------------------------------------------

function createMockClient(response, options = {}) {
  return {
    graphql: vi.fn().mockResolvedValue(response),
    isAuthenticated: vi.fn().mockReturnValue(options.authenticated ?? false),
  };
}

// ===========================================================================
// Tests
// ===========================================================================

describe('parseUserData', () => {
  it('parses a complete raw Twitter response into XActions format', () => {
    const profile = parseUserData(FULL_USER_RAW);

    expect(profile.id).toBe('123456789');
    expect(profile.name).toBe('Test User');
    expect(profile.username).toBe('testuser');
    expect(profile.location).toBe('San Francisco, CA');
    expect(profile.following).toBe(1200);
    expect(profile.followers).toBe(50000);
    expect(profile.tweets).toBe(34567);
    expect(profile.likes).toBe(89012);
    expect(profile.media).toBe(2345);
    expect(profile.verified).toBe(true);
    expect(profile.protected).toBe(false);
    expect(profile.pinnedTweetId).toBe('1700000000000000000');
    expect(profile.platform).toBe('twitter');
  });

  it('parses a minimal (new account) response without errors', () => {
    const profile = parseUserData(MINIMAL_USER_RAW);

    expect(profile.id).toBe('999999999');
    expect(profile.name).toBe('New Account');
    expect(profile.username).toBe('newaccount2025');
    expect(profile.bio).toBe('');
    expect(profile.location).toBe('');
    expect(profile.website).toBe(null);
    expect(profile.following).toBe(0);
    expect(profile.followers).toBe(0);
    expect(profile.tweets).toBe(0);
    expect(profile.likes).toBe(0);
    expect(profile.media).toBe(0);
    expect(profile.verified).toBe(false);
    expect(profile.protected).toBe(false);
    expect(profile.pinnedTweetId).toBe(null);
    expect(profile.birthday).toBe(null);
    expect(profile.header).toBe(null);
    expect(profile.platform).toBe('twitter');
  });

  it('throws NotFoundError for UserUnavailable response', () => {
    expect(() => parseUserData(UNAVAILABLE_USER_RAW)).toThrow(NotFoundError);
    expect(() => parseUserData(UNAVAILABLE_USER_RAW)).toThrow(/User unavailable/);
  });

  it('throws NotFoundError for null / empty input', () => {
    expect(() => parseUserData(null)).toThrow(NotFoundError);
    expect(() => parseUserData(undefined)).toThrow(NotFoundError);
  });

  it('upgrades avatar URL from _normal to _400x400', () => {
    const profile = parseUserData(FULL_USER_RAW);
    expect(profile.avatar).toBe(
      'https://pbs.twimg.com/profile_images/123/avatar_400x400.jpg',
    );
    expect(profile.avatar).not.toContain('_normal');
  });

  it('keeps _400x400 for various image extensions', () => {
    const raw = {
      ...MINIMAL_USER_RAW,
      legacy: {
        ...MINIMAL_USER_RAW.legacy,
        profile_image_url_https:
          'https://pbs.twimg.com/profile_images/42/pic_normal.png',
      },
    };
    const profile = parseUserData(raw);
    expect(profile.avatar).toBe(
      'https://pbs.twimg.com/profile_images/42/pic_400x400.png',
    );
  });

  it('expands t.co URLs in bio using entity data', () => {
    const profile = parseUserData(FULL_USER_RAW);
    expect(profile.bio).toContain('https://coolstuff.io');
    expect(profile.bio).toContain('https://more.dev');
    expect(profile.bio).not.toContain('https://t.co/abc123');
    expect(profile.bio).not.toContain('https://t.co/def456');
  });

  it('expands the website URL via entity data', () => {
    const profile = parseUserData(FULL_USER_RAW);
    expect(profile.website).toBe('https://example.com');
  });

  it('converts created_at to ISO date string', () => {
    const profile = parseUserData(FULL_USER_RAW);
    expect(profile.joined).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO format
    expect(profile.joined).toBe(new Date('Tue Mar 21 20:50:14 +0000 2006').toISOString());
  });

  it('parses birthday when available', () => {
    const profile = parseUserData(FULL_USER_RAW);
    expect(profile.birthday).toBe('1990-06-15');
  });

  it('returns null birthday when not available', () => {
    const profile = parseUserData(MINIMAL_USER_RAW);
    expect(profile.birthday).toBe(null);
  });

  it('extracts bio entities (urls, hashtags, mentions)', () => {
    const profile = parseUserData(FULL_USER_RAW);
    expect(profile.bioEntities.urls).toHaveLength(2);
    expect(profile.bioEntities.urls[0].expanded).toBe('https://coolstuff.io');
    expect(profile.bioEntities.hashtags).toHaveLength(1);
    expect(profile.bioEntities.hashtags[0].text).toBe('builder');
    expect(profile.bioEntities.mentions).toHaveLength(1);
    expect(profile.bioEntities.mentions[0].username).toBe('nichxbt');
  });

  it('handles protected accounts', () => {
    const profile = parseUserData(PROTECTED_USER_RAW);
    expect(profile.protected).toBe(true);
    expect(profile.username).toBe('privateperson');
  });

  it('uses is_blue_verified for verified flag', () => {
    const blueVerified = { ...FULL_USER_RAW, is_blue_verified: true, legacy: { ...FULL_USER_RAW.legacy, verified: false } };
    expect(parseUserData(blueVerified).verified).toBe(true);

    const legacyVerified = { ...FULL_USER_RAW, is_blue_verified: false, legacy: { ...FULL_USER_RAW.legacy, verified: true } };
    expect(parseUserData(legacyVerified).verified).toBe(true);

    const notVerified = { ...FULL_USER_RAW, is_blue_verified: false, legacy: { ...FULL_USER_RAW.legacy, verified: false } };
    expect(parseUserData(notVerified).verified).toBe(false);
  });

  it('output matches XActions profile format (has platform: twitter)', () => {
    const profile = parseUserData(FULL_USER_RAW);
    expect(profile).toHaveProperty('platform', 'twitter');
    // All expected top-level keys present
    const expectedKeys = [
      'id', 'name', 'username', 'bio', 'location', 'website',
      'joined', 'birthday', 'following', 'followers', 'tweets',
      'likes', 'media', 'avatar', 'header', 'verified', 'protected',
      'pinnedTweetId', 'bioEntities', 'platform',
    ];
    for (const key of expectedKeys) {
      expect(profile).toHaveProperty(key);
    }
  });
});

// ===========================================================================
// scrapeProfile
// ===========================================================================

describe('scrapeProfile', () => {
  it('calls client.graphql with correct query ID and variables', async () => {
    const client = createMockClient(wrapGraphQLResponse(FULL_USER_RAW));
    await scrapeProfile(client, 'testuser');

    expect(client.graphql).toHaveBeenCalledOnce();
    const [queryId, operationName, variables] = client.graphql.mock.calls[0];
    expect(operationName).toBe('UserByScreenName');
    expect(queryId).toBeTruthy();
    expect(variables).toEqual({
      screen_name: 'testuser',
      withSafetyModeUserFields: true,
    });
  });

  it('returns a parsed profile from a valid response', async () => {
    const client = createMockClient(wrapGraphQLResponse(FULL_USER_RAW));
    const profile = await scrapeProfile(client, 'testuser');

    expect(profile.id).toBe('123456789');
    expect(profile.username).toBe('testuser');
    expect(profile.platform).toBe('twitter');
  });

  it('throws NotFoundError when user result is missing', async () => {
    const client = createMockClient({ data: { user: { result: null } } });
    await expect(scrapeProfile(client, 'ghost')).rejects.toThrow(NotFoundError);
    await expect(scrapeProfile(client, 'ghost')).rejects.toThrow(/not found/i);
  });

  it('throws NotFoundError when data.user is missing entirely', async () => {
    const client = createMockClient({ data: {} });
    await expect(scrapeProfile(client, 'deleted')).rejects.toThrow(NotFoundError);
  });

  it('throws NotFoundError for suspended users (UserUnavailable)', async () => {
    const client = createMockClient(wrapGraphQLResponse(UNAVAILABLE_USER_RAW));
    await expect(scrapeProfile(client, 'suspended')).rejects.toThrow(NotFoundError);
  });

  it('throws TwitterApiError when response contains errors array', async () => {
    const errorResponse = {
      data: { user: { result: FULL_USER_RAW } },
      errors: [{ message: 'Something went wrong' }],
    };
    const client = createMockClient(errorResponse);
    await expect(scrapeProfile(client, 'testuser')).rejects.toThrow(TwitterApiError);
  });

  it('works with protected accounts (returns partial data)', async () => {
    const client = createMockClient(
      wrapGraphQLResponse(PROTECTED_USER_RAW),
      { authenticated: false },
    );
    const profile = await scrapeProfile(client, 'privateperson');
    expect(profile.protected).toBe(true);
    expect(profile.username).toBe('privateperson');
  });
});

// ===========================================================================
// scrapeProfileById
// ===========================================================================

describe('scrapeProfileById', () => {
  it('calls client.graphql with UserByRestId and user ID variable', async () => {
    const client = createMockClient(wrapGraphQLResponse(FULL_USER_RAW));
    await scrapeProfileById(client, '123456789');

    expect(client.graphql).toHaveBeenCalledOnce();
    const [queryId, operationName, variables] = client.graphql.mock.calls[0];
    expect(operationName).toBe('UserByRestId');
    expect(queryId).toBeTruthy();
    expect(variables).toEqual({
      userId: '123456789',
      withSafetyModeUserFields: true,
    });
  });

  it('returns a parsed profile for a valid user ID', async () => {
    const client = createMockClient(wrapGraphQLResponse(FULL_USER_RAW));
    const profile = await scrapeProfileById(client, '123456789');

    expect(profile.id).toBe('123456789');
    expect(profile.platform).toBe('twitter');
  });

  it('throws NotFoundError for unknown user ID', async () => {
    const client = createMockClient({ data: { user: { result: null } } });
    await expect(scrapeProfileById(client, '0')).rejects.toThrow(NotFoundError);
  });

  it('converts numeric userId to string in variables', async () => {
    const client = createMockClient(wrapGraphQLResponse(FULL_USER_RAW));
    await scrapeProfileById(client, 123456789);

    const [, , variables] = client.graphql.mock.calls[0];
    expect(variables.userId).toBe('123456789');
    expect(typeof variables.userId).toBe('string');
  });
});
