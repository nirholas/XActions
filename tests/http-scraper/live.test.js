/**
 * Live Integration Tests — HTTP Scraper (Skipped by Default)
 *
 * These tests hit the REAL Twitter API. They exist for manual verification
 * and are skipped unless the environment variable is set.
 *
 * Run with:
 *   XACTIONS_LIVE_TESTS=true TWITTER_COOKIES="auth_token=xxx; ct0=yyy" npx vitest run tests/http-scraper/live.test.js
 *
 * Requirements:
 *   - Valid Twitter auth cookies (auth_token + ct0)
 *   - Network access to x.com
 *
 * ⚠️  These tests consume real rate-limit quota. Run sparingly.
 *
 * @author nich (@nichxbt)
 */

import { describe, it, expect } from 'vitest';
import { TwitterHttpClient } from '../../src/scrapers/twitter/http/client.js';
import { scrapeProfile, scrapeProfileById } from '../../src/scrapers/twitter/http/profile.js';
import {
  scrapeFollowers,
  scrapeFollowing,
} from '../../src/scrapers/twitter/http/relationships.js';
import { GuestTokenManager } from '../../src/scrapers/twitter/http/guest.js';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const LIVE = process.env.XACTIONS_LIVE_TESTS === 'true';
const COOKIES = process.env.TWITTER_COOKIES || '';

/** Create a real authenticated client */
function createLiveClient() {
  if (!COOKIES) {
    throw new Error(
      'TWITTER_COOKIES env var required. Format: "auth_token=xxx; ct0=yyy"',
    );
  }
  return new TwitterHttpClient({
    cookies: COOKIES,
    rateLimitStrategy: 'error',
    maxRetries: 1,
  });
}

// ===========================================================================
// Live tests — skipped unless XACTIONS_LIVE_TESTS=true
// ===========================================================================

describe.skipIf(!LIVE)('HTTP Scraper — Live Tests', () => {
  // These tests hit real Twitter API
  // Run with: XACTIONS_LIVE_TESTS=true TWITTER_COOKIES="..." npx vitest run tests/http-scraper/live.test.js

  describe('Profile Scraping', () => {
    it('scrapes a public profile (@X)', async () => {
      const client = createLiveClient();
      const profile = await scrapeProfile(client, 'X');

      expect(profile.username.toLowerCase()).toBe('x');
      expect(profile.name).toBeTruthy();
      expect(profile.followers).toBeGreaterThan(0);
      expect(profile.id).toBeTruthy();
      expect(profile.platform).toBe('twitter');
      expect(profile.avatar).toBeTruthy();
    });

    it('scrapes a verified account profile', async () => {
      const client = createLiveClient();
      const profile = await scrapeProfile(client, 'elonmusk');

      expect(profile.username.toLowerCase()).toBe('elonmusk');
      expect(profile.name).toBeTruthy();
      expect(profile.followers).toBeGreaterThan(100_000_000);
      expect(profile.verified).toBe(true);
    });

    it('returns correct XActions profile format', async () => {
      const client = createLiveClient();
      const profile = await scrapeProfile(client, 'X');

      // Verify all expected keys are present
      const expectedKeys = [
        'id', 'name', 'username', 'bio', 'location', 'website',
        'joined', 'following', 'followers', 'tweets', 'likes',
        'media', 'avatar', 'header', 'verified', 'protected',
        'pinnedTweetId', 'bioEntities', 'platform',
      ];
      for (const key of expectedKeys) {
        expect(profile).toHaveProperty(key);
      }
    });

    it('throws NotFoundError for non-existent user', async () => {
      const client = createLiveClient();
      const { NotFoundError } = await import(
        '../../src/scrapers/twitter/http/errors.js'
      );
      await expect(
        scrapeProfile(client, 'zzzzz_nonexistent_user_12345689'),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('Guest Token Activation', () => {
    it('activates a real guest token', async () => {
      const guest = new GuestTokenManager();
      const token = await guest.activate();

      expect(token).toBeDefined();
      expect(token.value).toBeTruthy();
      expect(token.value.length).toBeGreaterThan(10);
      expect(token.isExpired()).toBe(false);
    });

    it('provides valid guest headers', async () => {
      const guest = new GuestTokenManager();
      const headers = await guest.getHeaders();

      expect(headers['x-guest-token']).toBeTruthy();
      expect(headers.authorization).toContain('Bearer');
      expect(headers['user-agent']).toBeTruthy();
    });
  });

  describe('Follower Scraping', () => {
    it('scrapes a small number of followers', async () => {
      const client = createLiveClient();
      const followers = await scrapeFollowers(client, 'X', { limit: 5 });

      expect(followers.length).toBeGreaterThan(0);
      expect(followers.length).toBeLessThanOrEqual(5);
      expect(followers[0].username).toBeTruthy();
      expect(followers[0].id).toBeTruthy();
    });
  });

  describe('Search', () => {
    it('searches for recent tweets', async () => {
      const client = createLiveClient();
      const { GRAPHQL } = await import(
        '../../src/scrapers/twitter/http/endpoints.js'
      );
      const { queryId, operationName } = GRAPHQL.SearchTimeline;

      const result = await client.graphql(queryId, operationName, {
        rawQuery: 'javascript',
        count: 5,
        querySource: 'typed_query',
        product: 'Latest',
      });

      expect(result.data).toBeDefined();
    });
  });
});
