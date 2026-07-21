// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Tests for CookieAuth class — cookie management and persistence.
 *
 * Tests the actual CookieAuth API which wraps a CookieJar and TokenManager,
 * providing setCookies, getCookies, getCookieString, isAuthenticated, etc.
 *
 * @author nich (@nichxbt)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CookieAuth } from '../../../src/client/auth/CookieAuth.js';
import { CookieJar } from '../../../src/client/auth/CookieJar.js';
import { TokenManager } from '../../../src/client/auth/TokenManager.js';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

let tempDir;

function createTokenManager() {
  // Real TokenManager — no mocks
  return new TokenManager();
}

beforeEach(() => {
  tempDir = join(tmpdir(), `xactions-test-${randomUUID()}`);
});

afterEach(async () => {
  try {
    await fs.rm(tempDir, { recursive: true, force: true });
  } catch {
    // ignore cleanup errors
  }
});

describe('CookieAuth', () => {
  describe('constructor', () => {
    it('creates an empty cookie jar', () => {
      const tm = createTokenManager();
      const auth = new CookieAuth(tm);
      expect(auth.jar).toBeInstanceOf(CookieJar);
      expect(auth.jar.size).toBe(0);
    });

    it('starts as unauthenticated', () => {
      const tm = createTokenManager();
      const auth = new CookieAuth(tm);
      expect(auth.isAuthenticated()).toBe(false);
    });
  });

  describe('setCookies', () => {
    it('accepts an array of {name, value} objects', () => {
      const tm = createTokenManager();
      const auth = new CookieAuth(tm);
      auth.setCookies([
        { name: 'auth_token', value: 'abc123' },
        { name: 'ct0', value: 'xyz789' },
      ]);
      expect(auth.jar.getValue('auth_token')).toBe('abc123');
      expect(auth.jar.getValue('ct0')).toBe('xyz789');
    });

    it('accepts a cookie header string', () => {
      const tm = createTokenManager();
      const auth = new CookieAuth(tm);
      auth.setCookies('auth_token=abc123; ct0=xyz789');
      expect(auth.jar.getValue('auth_token')).toBe('abc123');
      expect(auth.jar.getValue('ct0')).toBe('xyz789');
    });

    it('syncs CSRF token to tokenManager after setting cookies', () => {
      const tm = createTokenManager();
      const auth = new CookieAuth(tm);
      auth.setCookies([
        { name: 'ct0', value: 'my_csrf' },
        { name: 'auth_token', value: 'tok' },
      ]);
      expect(tm.csrfToken).toBe('my_csrf');
    });

    it('handles empty array', () => {
      const tm = createTokenManager();
      const auth = new CookieAuth(tm);
      auth.setCookies([]);
      expect(auth.jar.size).toBe(0);
    });

    it('handles cookies with = in value', () => {
      const tm = createTokenManager();
      const auth = new CookieAuth(tm);
      auth.setCookies('personalization_id="v1_abc123=="');
      expect(auth.jar.getValue('personalization_id')).toBe('"v1_abc123=="');
    });
  });

  describe('getCookies', () => {
    it('returns array of {name, value} objects', () => {
      const tm = createTokenManager();
      const auth = new CookieAuth(tm);
      auth.setCookies([
        { name: 'auth_token', value: 'abc' },
        { name: 'ct0', value: 'xyz' },
      ]);
      const cookies = auth.getCookies();
      expect(cookies).toContainEqual({ name: 'auth_token', value: 'abc' });
      expect(cookies).toContainEqual({ name: 'ct0', value: 'xyz' });
    });

    it('returns empty array when no cookies', () => {
      const tm = createTokenManager();
      const auth = new CookieAuth(tm);
      expect(auth.getCookies()).toEqual([]);
    });
  });

  describe('getCookieString', () => {
    it('produces valid cookie header string', () => {
      const tm = createTokenManager();
      const auth = new CookieAuth(tm);
      auth.setCookies([
        { name: 'auth_token', value: 'abc' },
        { name: 'ct0', value: 'xyz' },
      ]);
      const str = auth.getCookieString();
      expect(str).toContain('auth_token=abc');
      expect(str).toContain('ct0=xyz');
      expect(str).toContain('; ');
    });

    it('returns empty string with no cookies', () => {
      const tm = createTokenManager();
      const auth = new CookieAuth(tm);
      expect(auth.getCookieString()).toBe('');
    });
  });

  describe('isAuthenticated', () => {
    it('returns false when auth_token is missing', () => {
      const tm = createTokenManager();
      const auth = new CookieAuth(tm);
      auth.setCookies([{ name: 'ct0', value: 'xyz' }]);
      expect(auth.isAuthenticated()).toBe(false);
    });

    it('returns false when ct0 is missing', () => {
      const tm = createTokenManager();
      const auth = new CookieAuth(tm);
      auth.setCookies([{ name: 'auth_token', value: 'abc' }]);
      expect(auth.isAuthenticated()).toBe(false);
    });

    it('returns true when both auth_token and ct0 are present', () => {
      const tm = createTokenManager();
      const auth = new CookieAuth(tm);
      auth.setCookies([
        { name: 'auth_token', value: 'abc' },
        { name: 'ct0', value: 'xyz' },
      ]);
      expect(auth.isAuthenticated()).toBe(true);
    });

    it('returns false when auth_token is empty string', () => {
      const tm = createTokenManager();
      const auth = new CookieAuth(tm);
      auth.setCookies([
        { name: 'auth_token', value: '' },
        { name: 'ct0', value: 'xyz' },
      ]);
      expect(auth.isAuthenticated()).toBe(false);
    });

    it('returns false when ct0 is empty string', () => {
      const tm = createTokenManager();
      const auth = new CookieAuth(tm);
      auth.setCookies([
        { name: 'auth_token', value: 'abc' },
        { name: 'ct0', value: '' },
      ]);
      expect(auth.isAuthenticated()).toBe(false);
    });
  });

  describe('getAuthenticatedUserId', () => {
    it('extracts user ID from twid cookie', () => {
      const tm = createTokenManager();
      const auth = new CookieAuth(tm);
      auth.setCookies([{ name: 'twid', value: 'u%3D1234567890' }]);
      expect(auth.getAuthenticatedUserId()).toBe('1234567890');
    });

    it('returns null when twid is not set', () => {
      const tm = createTokenManager();
      const auth = new CookieAuth(tm);
      expect(auth.getAuthenticatedUserId()).toBeNull();
    });
  });

  describe('clear', () => {
    it('removes all cookies and resets auth state', () => {
      const tm = createTokenManager();
      const auth = new CookieAuth(tm);
      auth.setCookies([
        { name: 'auth_token', value: 'abc' },
        { name: 'ct0', value: 'xyz' },
      ]);
      expect(auth.isAuthenticated()).toBe(true);

      auth.clear();

      expect(auth.jar.size).toBe(0);
      expect(auth.isAuthenticated()).toBe(false);
      expect(tm.csrfToken).toBeNull();
    });
  });

  describe('saveCookies/loadCookies', () => {
    it('roundtrip preserves all cookies via file', async () => {
      const tm = createTokenManager();
      const auth = new CookieAuth(tm);
      auth.setCookies([
        { name: 'auth_token', value: 'a1b2c3d4e5f6' },
        { name: 'ct0', value: 'csrf_token_160chars' },
        { name: 'twid', value: 'u%3D9876543210' },
        { name: 'guest_id', value: 'v1%3A170000000000000000' },
        { name: 'personalization_id', value: '"v1_abc123def456=="' },
      ]);

      const filePath = join(tempDir, 'cookies.json');
      await auth.saveCookies(filePath);

      // Verify the file exists
      const content = JSON.parse(await fs.readFile(filePath, 'utf-8'));
      expect(Array.isArray(content)).toBe(true);
      expect(content.length).toBe(5);

      // Load into new auth
      const tm2 = createTokenManager();
      const auth2 = new CookieAuth(tm2);
      await auth2.loadCookies(filePath);

      expect(auth2.jar.getValue('auth_token')).toBe('a1b2c3d4e5f6');
      expect(auth2.jar.getValue('ct0')).toBe('csrf_token_160chars');
      expect(auth2.jar.getValue('twid')).toBe('u%3D9876543210');
      expect(auth2.isAuthenticated()).toBe(true);
    });

    it('loadCookies creates empty jar when file does not exist', async () => {
      const tm = createTokenManager();
      const auth = new CookieAuth(tm);
      await auth.loadCookies(join(tempDir, 'nonexistent.json'));
      expect(auth.jar.size).toBe(0);
      expect(auth.isAuthenticated()).toBe(false);
    });

    it('loadCookies syncs CSRF token to tokenManager', async () => {
      const tm = createTokenManager();
      const auth = new CookieAuth(tm);

      // Write a cookie file manually
      const filePath = join(tempDir, 'cookies.json');
      await fs.mkdir(tempDir, { recursive: true });
      await fs.writeFile(filePath, JSON.stringify([
        { name: 'ct0', value: 'loaded_csrf' },
        { name: 'auth_token', value: 'loaded_token' },
      ]));

      await auth.loadCookies(filePath);

      expect(tm.csrfToken).toBe('loaded_csrf');
      expect(auth.isAuthenticated()).toBe(true);
    });
  });

  describe('updateFromResponse', () => {
    it('updates cookies from response Set-Cookie headers', () => {
      const tm = createTokenManager();
      const auth = new CookieAuth(tm);

      const headers = new Headers();
      headers.getSetCookie = () => ['ct0=newcsrf; path=/; domain=.x.com'];

      auth.updateFromResponse({ headers });

      expect(auth.jar.getValue('ct0')).toBe('newcsrf');
      expect(tm.csrfToken).toBe('newcsrf');
    });

    it('handles response without Set-Cookie headers', () => {
      const tm = createTokenManager();
      const auth = new CookieAuth(tm);

      auth.updateFromResponse({ headers: new Headers() });
      expect(auth.jar.size).toBe(0);
    });
  });
});
