/**
 * Tests for SessionValidator — session validation, CSRF refresh, expiry detection.
 *
 * @author nich (@nichxbt)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SessionValidator } from '../../../src/client/auth/SessionValidator.js';
import { AuthenticationError, ScraperError } from '../../../src/client/errors.js';

// ── helpers ──────────────────────────────────────────────────────────────────

const VALID_USER = {
  id_str: '123456',
  screen_name: 'alice',
  name: 'Alice',
  profile_image_url_https: 'https://pbs.twimg.com/profile/alice.jpg',
};

function makeOkResponse(body = VALID_USER) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
    headers: new Headers(),
  });
}

function makeErrorResponse(status, errors = []) {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve({ errors }),
    headers: new Headers(),
  });
}

function create429Response(retryAfter = '1') {
  return Promise.resolve({
    ok: false,
    status: 429,
    json: () => Promise.resolve({}),
    headers: new Headers({ 'retry-after': retryAfter }),
  });
}

function createMocks() {
  return {
    tokenManager: {
      getHeaders: vi.fn(() => ({
        Authorization: 'Bearer AAAA',
        'x-csrf-token': 'csrf123',
        Cookie: 'ct0=csrf123; auth_token=at123',
      })),
      refreshCsrf: vi.fn(),
    },
    cookieAuth: {
      set: vi.fn(),
    },
    fetch: vi.fn(),
  };
}

// ── tests ────────────────────────────────────────────────────────────────────

describe('SessionValidator', () => {
  let mocks;
  let validator;

  beforeEach(() => {
    mocks = createMocks();
    validator = new SessionValidator({
      tokenManager: mocks.tokenManager,
      cookieAuth: mocks.cookieAuth,
      fetch: mocks.fetch,
    });
  });

  describe('validate', () => {
    it('returns valid=true with user info on 200', async () => {
      mocks.fetch.mockReturnValueOnce(makeOkResponse());

      const result = await validator.validate();

      expect(result.valid).toBe(true);
      expect(result.user).toEqual({
        id: '123456',
        username: 'alice',
        displayName: 'Alice',
        profileImageUrl: 'https://pbs.twimg.com/profile/alice.jpg',
      });
    });

    it('returns valid=false with reason "expired" on 401', async () => {
      mocks.fetch.mockReturnValueOnce(makeErrorResponse(401));

      const result = await validator.validate();
      expect(result).toEqual({ valid: false, reason: 'expired' });
    });

    it('returns reason "locked" on 403 with code 326', async () => {
      mocks.fetch.mockReturnValueOnce(makeErrorResponse(403, [{ code: 326 }]));

      const result = await validator.validate();
      expect(result).toEqual({ valid: false, reason: 'locked' });
    });

    it('returns reason "suspended" on 403 with code 64', async () => {
      mocks.fetch.mockReturnValueOnce(makeErrorResponse(403, [{ code: 64 }]));

      const result = await validator.validate();
      expect(result).toEqual({ valid: false, reason: 'suspended' });
    });

    it('returns reason "expired" on 403 without known code', async () => {
      mocks.fetch.mockReturnValueOnce(makeErrorResponse(403, []));

      const result = await validator.validate();
      expect(result).toEqual({ valid: false, reason: 'expired' });
    });

    it('retries once on 429 and returns valid on retry success', async () => {
      mocks.fetch
        .mockReturnValueOnce(create429Response('0'))
        .mockReturnValueOnce(makeOkResponse());

      const result = await validator.validate();

      expect(mocks.fetch).toHaveBeenCalledTimes(2);
      expect(result.valid).toBe(true);
      expect(result.user.username).toBe('alice');
    });

    it('assumes valid on double 429 (rate limited, not expired)', async () => {
      mocks.fetch
        .mockReturnValueOnce(create429Response('0'))
        .mockReturnValueOnce(create429Response('0'));

      const result = await validator.validate();

      expect(result).toEqual({ valid: true, user: null });
    });

    it('handles 429 retry returning 401', async () => {
      mocks.fetch
        .mockReturnValueOnce(create429Response('0'))
        .mockReturnValueOnce(makeErrorResponse(401));

      const result = await validator.validate();
      expect(result).toEqual({ valid: false, reason: 'expired' });
    });

    it('returns expired on unknown status codes', async () => {
      mocks.fetch.mockReturnValueOnce(makeErrorResponse(500));

      const result = await validator.validate();
      expect(result).toEqual({ valid: false, reason: 'expired' });
    });

    it('throws ScraperError on ECONNREFUSED', async () => {
      const netError = new Error('connect ECONNREFUSED');
      netError.code = 'ECONNREFUSED';
      mocks.fetch.mockRejectedValueOnce(netError);

      await expect(validator.validate()).rejects.toThrow(ScraperError);
      await expect(validator.validate()).rejects.not.toThrow(AuthenticationError);
    });

    it('throws ScraperError on ENOTFOUND', async () => {
      const netError = new Error('getaddrinfo ENOTFOUND');
      netError.code = 'ENOTFOUND';
      mocks.fetch.mockRejectedValueOnce(netError);

      await expect(validator.validate()).rejects.toThrow(ScraperError);
    });

    it('throws ScraperError on TypeError (fetch TypeError)', async () => {
      const typeError = new TypeError('Failed to fetch');
      mocks.fetch.mockRejectedValueOnce(typeError);

      await expect(validator.validate()).rejects.toThrow(ScraperError);
    });

    it('propagates unknown errors directly', async () => {
      const weird = new Error('Something weird');
      weird.code = 'UNKNOWN';
      mocks.fetch.mockRejectedValueOnce(weird);

      await expect(validator.validate()).rejects.toThrow('Something weird');
    });

    it('passes correct headers via tokenManager', async () => {
      mocks.fetch.mockReturnValueOnce(makeOkResponse());
      await validator.validate();

      expect(mocks.tokenManager.getHeaders).toHaveBeenCalledWith(true);
      expect(mocks.fetch).toHaveBeenCalledWith(
        expect.stringContaining('verify_credentials'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({ Authorization: 'Bearer AAAA' }),
        }),
      );
    });

    it('handles null profile_image_url_https', async () => {
      mocks.fetch.mockReturnValueOnce(makeOkResponse({
        id_str: '99', screen_name: 'bob', name: 'Bob',
      }));

      const result = await validator.validate();
      expect(result.user.profileImageUrl).toBeNull();
    });
  });

  describe('validateAndRefreshCsrf', () => {
    it('refreshes csrf token from Set-Cookie header', async () => {
      const headers = new Headers();
      // Mock getSetCookie
      headers.getSetCookie = vi.fn(() => ['ct0=newcsrf123; path=/; domain=.x.com']);

      mocks.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(VALID_USER),
        headers,
      });

      const result = await validator.validateAndRefreshCsrf();

      expect(result.valid).toBe(true);
      expect(mocks.cookieAuth.set).toHaveBeenCalledWith('ct0', 'newcsrf123');
      expect(mocks.tokenManager.refreshCsrf).toHaveBeenCalledWith('newcsrf123');
    });

    it('returns valid=false on 401', async () => {
      mocks.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: new Headers(),
      });

      const result = await validator.validateAndRefreshCsrf();
      expect(result).toEqual({ valid: false, reason: 'expired' });
    });

    it('ignores non-ct0 cookies in Set-Cookie', async () => {
      const headers = new Headers();
      headers.getSetCookie = vi.fn(() => ['_twitter_sess=abc; path=/']);

      mocks.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(VALID_USER),
        headers,
      });

      await validator.validateAndRefreshCsrf();

      expect(mocks.cookieAuth.set).not.toHaveBeenCalled();
      expect(mocks.tokenManager.refreshCsrf).not.toHaveBeenCalled();
    });
  });

  describe('getLoggedInUser', () => {
    it('returns user when session is valid', async () => {
      mocks.fetch.mockReturnValueOnce(makeOkResponse());

      const user = await validator.getLoggedInUser();
      expect(user).toEqual({
        id: '123456',
        username: 'alice',
        displayName: 'Alice',
        profileImageUrl: 'https://pbs.twimg.com/profile/alice.jpg',
      });
    });

    it('throws AuthenticationError when session is expired', async () => {
      mocks.fetch.mockReturnValueOnce(makeErrorResponse(401));

      await expect(validator.getLoggedInUser()).rejects.toThrow(AuthenticationError);
      await expect(validator.getLoggedInUser()).rejects.toThrow(/expired/);
    });

    it('throws AuthenticationError when session is locked', async () => {
      mocks.fetch.mockReturnValueOnce(makeErrorResponse(403, [{ code: 326 }]));

      await expect(validator.getLoggedInUser()).rejects.toThrow(/locked/);
    });
  });

  describe('isSessionExpired', () => {
    it('returns true for httpStatus 401', () => {
      expect(validator.isSessionExpired({ httpStatus: 401 })).toBe(true);
    });

    it('returns true for AUTH_REQUIRED code', () => {
      expect(validator.isSessionExpired({ code: 'AUTH_REQUIRED' })).toBe(true);
    });

    it('returns true for AUTH_FAILED code', () => {
      expect(validator.isSessionExpired({ code: 'AUTH_FAILED' })).toBe(true);
    });

    it('returns true for twitterErrorCode 89', () => {
      expect(validator.isSessionExpired({ twitterErrorCode: 89 })).toBe(true);
    });

    it('returns false for httpStatus 429 (rate limited)', () => {
      expect(validator.isSessionExpired({ httpStatus: 429 })).toBe(false);
    });

    it('returns false for httpStatus 500 (server error)', () => {
      expect(validator.isSessionExpired({ httpStatus: 500 })).toBe(false);
    });

    it('returns false for unrelated errors', () => {
      expect(validator.isSessionExpired({})).toBe(false);
      expect(validator.isSessionExpired({ httpStatus: 200 })).toBe(false);
    });

    it('returns false for null/undefined', () => {
      expect(validator.isSessionExpired(null)).toBe(false);
      expect(validator.isSessionExpired(undefined)).toBe(false);
    });
  });
});
