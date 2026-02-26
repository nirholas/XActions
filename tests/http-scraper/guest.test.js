/**
 * Tests for GuestTokenManager — Guest token acquisition, caching, pooling,
 * rate-limit tracking, and header generation.
 *
 * All tests use mocked fetch — no real network requests.
 *
 * @author nichxbt
 * @license MIT
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  GuestTokenManager,
  GuestToken,
  BEARER_TOKEN,
  TOKEN_TTL_MS,
  USER_AGENTS,
} from '../../src/scrapers/twitter/http/guest.js';

// ============================================================================
// Helpers
// ============================================================================

/**
 * Build a mock fetch that resolves with a guest token activation response.
 * @param {string} guestToken  The guest_token value to return
 * @param {number} [status=200]
 * @returns {vi.Mock}
 */
const mockActivateFetch = (guestToken = '1234567890', status = 200) =>
  vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => ({ guest_token: guestToken }),
    text: async () => JSON.stringify({ guest_token: guestToken }),
  });

/**
 * Build a mock fetch that rejects or returns an error status.
 */
const mockFailFetch = (status = 500, body = 'Internal Server Error') =>
  vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: async () => ({}),
    text: async () => body,
  });

// ============================================================================
// Tests
// ============================================================================

describe('GuestTokenManager', () => {
  let manager;
  let fetchMock;

  beforeEach(() => {
    fetchMock = mockActivateFetch();
    manager = new GuestTokenManager({ fetch: fetchMock });
  });

  // --------------------------------------------------------------------------
  // 1. Token activation parses response correctly
  // --------------------------------------------------------------------------

  describe('activate()', () => {
    it('should POST to the activation endpoint and parse guest_token', async () => {
      const token = await manager.activate();

      expect(fetchMock).toHaveBeenCalledOnce();
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.x.com/1.1/guest/activate.json',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            authorization: `Bearer ${BEARER_TOKEN}`,
          }),
        }),
      );

      expect(token).toBeInstanceOf(GuestToken);
      expect(token.value).toBe('1234567890');
      expect(token.isExpired()).toBe(false);
    });

    it('should throw on non-OK status', async () => {
      const failManager = new GuestTokenManager({
        fetch: mockFailFetch(403, 'Forbidden'),
      });

      await expect(failManager.activate()).rejects.toThrow(
        /Guest token activation failed.*403/,
      );
    });

    it('should throw when response payload has no guest_token', async () => {
      const emptyFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
        text: async () => '{}',
      });

      const badManager = new GuestTokenManager({ fetch: emptyFetch });

      await expect(badManager.activate()).rejects.toThrow(
        /unexpected payload/,
      );
    });
  });

  // --------------------------------------------------------------------------
  // 2. Caching returns same token within expiry window
  // --------------------------------------------------------------------------

  describe('getToken() — caching', () => {
    it('should return cached token on successive calls without re-activating', async () => {
      const token1 = await manager.getToken();
      const token2 = await manager.getToken();

      expect(token1).toBe(token2);
      expect(fetchMock).toHaveBeenCalledOnce(); // Only 1 activation
    });
  });

  // --------------------------------------------------------------------------
  // 3. Auto-refresh after expiry
  // --------------------------------------------------------------------------

  describe('getToken() — auto-refresh', () => {
    it('should re-activate when the token is expired', async () => {
      // First call — normal activation
      await manager.getToken();
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Expire the token by manipulating createdAt
      manager.currentToken.createdAt = Date.now() - TOKEN_TTL_MS - 1000;
      expect(manager.isExpired()).toBe(true);

      // Second fetch returns a different token
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ guest_token: 'refreshed_token' }),
        text: async () => '{}',
      });

      const refreshed = await manager.getToken();
      expect(refreshed).toBe('refreshed_token');
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  // --------------------------------------------------------------------------
  // 4. Concurrent calls only trigger one activation
  // --------------------------------------------------------------------------

  describe('getToken() — concurrency safety', () => {
    it('should deduplicate concurrent activation requests', async () => {
      // Slow fetch that resolves after a delay
      let resolveActivation;
      const slowFetch = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveActivation = () =>
              resolve({
                ok: true,
                status: 200,
                json: async () => ({ guest_token: 'concurrent_token' }),
                text: async () => '{}',
              });
          }),
      );

      const concurrentManager = new GuestTokenManager({ fetch: slowFetch });

      // Fire 5 concurrent getToken() calls
      const promises = Array.from({ length: 5 }, () =>
        concurrentManager.getToken(),
      );

      // Resolve the single in-flight activation
      resolveActivation();

      const tokens = await Promise.all(promises);

      // All should get the same token
      expect(new Set(tokens).size).toBe(1);
      expect(tokens[0]).toBe('concurrent_token');

      // Only one fetch call was made
      expect(slowFetch).toHaveBeenCalledOnce();
    });
  });

  // --------------------------------------------------------------------------
  // 5. Token pool round-robin
  // --------------------------------------------------------------------------

  describe('Token Pool', () => {
    it('should round-robin through pool tokens', () => {
      manager.addToken('token_a');
      manager.addToken('token_b');
      manager.addToken('token_c');

      const sequence = [];
      for (let i = 0; i < 6; i++) {
        const t = manager.getNextToken();
        sequence.push(t?.value);
      }

      expect(sequence).toEqual([
        'token_a',
        'token_b',
        'token_c',
        'token_a',
        'token_b',
        'token_c',
      ]);
    });

    it('should skip rate-limited tokens for a specific endpoint', () => {
      manager.addToken('fast');
      manager.addToken('slow');

      // Rate-limit the first token for "search"
      const slowToken = manager.getNextToken();
      slowToken.recordRateLimit('search', 0, Date.now() + 60_000);

      // Next call for "search" should skip the rate-limited token
      const result = manager.getNextToken('search');
      expect(result.value).toBe('slow');
    });

    it('should return null when all tokens are rate-limited', () => {
      manager.addToken('a');
      manager.addToken('b');

      // Rate-limit both
      const ta = manager.getNextToken();
      ta.recordRateLimit('search', 0, Date.now() + 60_000);
      const tb = manager.getNextToken();
      tb.recordRateLimit('search', 0, Date.now() + 60_000);

      expect(manager.getNextToken('search')).toBeNull();
    });

    it('should return null when pool is empty', () => {
      expect(manager.getNextToken()).toBeNull();
    });

    it('should remove expired tokens', () => {
      manager.addToken('fresh');
      manager.addToken('stale', Date.now() - TOKEN_TTL_MS - 1000);

      expect(manager.poolLength).toBe(2);

      const removed = manager.removeExpired();

      expect(removed).toBe(1);
      expect(manager.poolLength).toBe(1);
      expect(manager.getNextToken().value).toBe('fresh');
    });

    it('should fill pool to configured size', async () => {
      let callCount = 0;
      const poolFetch = vi.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ guest_token: `pool_token_${callCount}` }),
          text: async () => '{}',
        });
      });

      const poolManager = new GuestTokenManager({
        fetch: poolFetch,
        poolSize: 3,
      });

      const added = await poolManager.fillPool();

      expect(added).toBe(3);
      expect(poolManager.poolLength).toBe(3);
      expect(poolFetch).toHaveBeenCalledTimes(3);
    });
  });

  // --------------------------------------------------------------------------
  // 6. Header generation includes guest token
  // --------------------------------------------------------------------------

  describe('getHeaders()', () => {
    it('should include required headers with guest token', async () => {
      const headers = await manager.getHeaders();

      expect(headers).toHaveProperty(
        'authorization',
        `Bearer ${BEARER_TOKEN}`,
      );
      expect(headers).toHaveProperty('x-guest-token', '1234567890');
      expect(headers).toHaveProperty('x-twitter-active-user', 'yes');
      expect(headers).toHaveProperty('x-twitter-client-language', 'en');
      expect(headers).toHaveProperty('user-agent');
      expect(USER_AGENTS).toContain(headers['user-agent']);
    });
  });

  // --------------------------------------------------------------------------
  // 7. Rate-limit tracking per token
  // --------------------------------------------------------------------------

  describe('recordRateLimit()', () => {
    it('should record rate-limit from plain object headers', async () => {
      await manager.getToken(); // ensure a current token exists

      manager.recordRateLimit(manager.currentToken, 'search', {
        'x-rate-limit-remaining': '10',
        'x-rate-limit-reset': String(Math.floor(Date.now() / 1000) + 900),
      });

      expect(manager.currentToken.hasCapacity('search')).toBe(true);
    });

    it('should record rate-limit from Headers-like object', async () => {
      await manager.getToken();

      const mockHeaders = {
        get: (name) => {
          const map = {
            'x-rate-limit-remaining': '0',
            'x-rate-limit-reset': String(
              Math.floor(Date.now() / 1000) + 900,
            ),
          };
          return map[name] ?? null;
        },
      };

      manager.recordRateLimit(manager.currentToken, 'profile', mockHeaders);

      expect(manager.currentToken.hasCapacity('profile')).toBe(false);
    });

    it('should look up pool token by string value', () => {
      manager.addToken('pool_token_x');

      manager.recordRateLimit('pool_token_x', 'tweet', {
        'x-rate-limit-remaining': '5',
        'x-rate-limit-reset': String(Math.floor(Date.now() / 1000) + 900),
      });

      const token = manager.getNextToken();
      expect(token.hasCapacity('tweet')).toBe(true);
    });

    it('should report capacity restored after reset window passes', () => {
      manager.addToken('resettable');

      const token = manager.getNextToken();
      // Rate-limit that already expired
      token.recordRateLimit('search', 0, Date.now() - 1000);

      expect(token.hasCapacity('search')).toBe(true);
    });

    it('should silently ignore invalid header values', async () => {
      await manager.getToken();

      // Should not throw
      manager.recordRateLimit(manager.currentToken, 'search', {
        'x-rate-limit-remaining': 'not-a-number',
        'x-rate-limit-reset': 'also-nan',
      });

      // Token should still report capacity (no rate-limit was recorded)
      expect(manager.currentToken.hasCapacity('search')).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // GuestToken unit
  // --------------------------------------------------------------------------

  describe('GuestToken', () => {
    it('should not be expired when freshly created', () => {
      const token = new GuestToken('fresh');
      expect(token.isExpired()).toBe(false);
    });

    it('should be expired after TTL', () => {
      const token = new GuestToken('old', Date.now() - TOKEN_TTL_MS - 1);
      expect(token.isExpired()).toBe(true);
    });

    it('should track per-endpoint capacity', () => {
      const token = new GuestToken('cap');
      expect(token.hasCapacity('search')).toBe(true);

      token.recordRateLimit('search', 0, Date.now() + 60_000);
      expect(token.hasCapacity('search')).toBe(false);

      // Different endpoint still has capacity
      expect(token.hasCapacity('profile')).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // isExpired()
  // --------------------------------------------------------------------------

  describe('isExpired()', () => {
    it('should return true when no token exists', () => {
      const fresh = new GuestTokenManager({ fetch: fetchMock });
      expect(fresh.isExpired()).toBe(true);
    });

    it('should return false after activation', async () => {
      await manager.getToken();
      expect(manager.isExpired()).toBe(false);
    });
  });
});
