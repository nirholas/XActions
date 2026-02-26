/**
 * Tests for GuestToken class — guest token activation and management.
 *
 * @author nich (@nichxbt)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GuestToken } from '../../../src/client/auth/GuestToken.js';

describe('GuestToken', () => {
  let mockFetch;

  beforeEach(() => {
    vi.useRealTimers();
    mockFetch = vi.fn();
  });

  function createGuestToken(options = {}) {
    return new GuestToken({ fetch: mockFetch, ...options });
  }

  function mockActivateResponse(token = '1234567890123456789') {
    return {
      ok: true,
      status: 200,
      json: () => Promise.resolve({ guest_token: token }),
      headers: new Headers(),
    };
  }

  describe('activate', () => {
    it('sends POST with correct bearer token', async () => {
      mockFetch.mockResolvedValueOnce(mockActivateResponse());
      const gt = createGuestToken();

      await gt.activate();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.x.com/1.1/guest/activate.json',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: expect.stringMatching(/^Bearer AAAA/),
          }),
        }),
      );
    });

    it('stores token and timestamp after activation', async () => {
      mockFetch.mockResolvedValueOnce(mockActivateResponse('mytoken123'));
      const gt = createGuestToken();

      const token = await gt.activate();

      expect(token).toBe('mytoken123');
      expect(gt.getToken()).toBe('mytoken123');
      expect(gt.isExpired()).toBe(false);
    });
  });

  describe('getToken', () => {
    it('returns null before activation', () => {
      const gt = createGuestToken();
      expect(gt.getToken()).toBeNull();
    });

    it('returns token after activation', async () => {
      mockFetch.mockResolvedValueOnce(mockActivateResponse('abc'));
      const gt = createGuestToken();
      await gt.activate();
      expect(gt.getToken()).toBe('abc');
    });
  });

  describe('isExpired', () => {
    it('returns true before activation', () => {
      const gt = createGuestToken();
      expect(gt.isExpired()).toBe(true);
    });

    it('returns false after fresh activation', async () => {
      mockFetch.mockResolvedValueOnce(mockActivateResponse());
      const gt = createGuestToken();
      await gt.activate();
      expect(gt.isExpired()).toBe(false);
    });

    it('returns true after maxAge elapsed', async () => {
      vi.useFakeTimers();
      mockFetch.mockResolvedValueOnce(mockActivateResponse());
      const gt = createGuestToken({ maxAge: 1000 }); // 1 second TTL

      await gt.activate();
      expect(gt.isExpired()).toBe(false);

      vi.advanceTimersByTime(1001);
      expect(gt.isExpired()).toBe(true);

      vi.useRealTimers();
    });
  });

  describe('ensureValid', () => {
    it('activates if expired', async () => {
      mockFetch.mockResolvedValueOnce(mockActivateResponse('fresh'));
      const gt = createGuestToken();

      const token = await gt.ensureValid();
      expect(token).toBe('fresh');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('reuses token if still valid', async () => {
      mockFetch.mockResolvedValueOnce(mockActivateResponse('reused'));
      const gt = createGuestToken();

      await gt.ensureValid();
      const token = await gt.ensureValid();

      expect(token).toBe('reused');
      expect(mockFetch).toHaveBeenCalledTimes(1); // Only called once
    });
  });

  describe('getHeaders', () => {
    it('includes x-guest-token and Authorization', async () => {
      mockFetch.mockResolvedValueOnce(mockActivateResponse('header_token'));
      const gt = createGuestToken();
      await gt.activate();

      const headers = gt.getHeaders();
      expect(headers['x-guest-token']).toBe('header_token');
      expect(headers['Authorization']).toMatch(/^Bearer AAAA/);
    });

    it('returns empty guest token before activation', () => {
      const gt = createGuestToken();
      const headers = gt.getHeaders();
      expect(headers['x-guest-token']).toBe('');
    });
  });

  describe('reset', () => {
    it('clears the stored token', async () => {
      mockFetch.mockResolvedValueOnce(mockActivateResponse('willreset'));
      const gt = createGuestToken();
      await gt.activate();

      expect(gt.getToken()).toBe('willreset');
      gt.reset();
      expect(gt.getToken()).toBeNull();
      expect(gt.isExpired()).toBe(true);
    });
  });

  describe('error handling', () => {
    it('throws on non-200 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
        headers: new Headers(),
      });

      const gt = createGuestToken();
      await expect(gt.activate()).rejects.toThrow(/Failed to activate guest token/);
    });

    it('retries once on 429 with Retry-After header', async () => {
      // First call: 429
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({ 'retry-after': '1' }),
      });
      // Second call: success
      mockFetch.mockResolvedValueOnce(mockActivateResponse('after_retry'));

      const gt = createGuestToken();
      const token = await gt.activate();

      expect(token).toBe('after_retry');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('throws on second 429', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({ 'retry-after': '1' }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({ 'retry-after': '60' }),
      });

      const gt = createGuestToken();
      await expect(gt.activate()).rejects.toThrow(/rate limited/i);
    });

    it('throws when response has no guest_token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
        headers: new Headers(),
      });

      const gt = createGuestToken();
      await expect(gt.activate()).rejects.toThrow(/No guest_token/);
    });
  });

  describe('constructor', () => {
    it('respects custom maxAge', async () => {
      vi.useFakeTimers();
      mockFetch.mockResolvedValueOnce(mockActivateResponse());
      const gt = createGuestToken({ maxAge: 5000 });

      await gt.activate();
      expect(gt.isExpired()).toBe(false);

      vi.advanceTimersByTime(4999);
      expect(gt.isExpired()).toBe(false);

      vi.advanceTimersByTime(2);
      expect(gt.isExpired()).toBe(true);

      vi.useRealTimers();
    });
  });
});
