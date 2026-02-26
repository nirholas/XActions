/**
 * Tests for CookieAuth class — cookie management and persistence.
 *
 * @author nich (@nichxbt)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CookieAuth, createCookieAuth } from '../../../src/client/auth/CookieAuth.js';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

let tempDir;

beforeEach(() => {
  tempDir = join(tmpdir(), `xactions-test-${randomUUID()}`);
});

afterEach(async () => {
  try {
    await fs.rm(tempDir, { recursive: true, force: true });
  } catch {
    // ignore cleanup errors
  }
  delete process.env.XACTIONS_SESSION_COOKIE;
});

describe('CookieAuth', () => {
  describe('constructor', () => {
    it('creates an empty cookie jar', () => {
      const auth = new CookieAuth();
      expect(auth.size).toBe(0);
      expect(auth.getAll()).toEqual({});
    });

    it('initializes from a cookies object', () => {
      const auth = new CookieAuth({ auth_token: 'abc123', ct0: 'xyz789' });
      expect(auth.get('auth_token')).toBe('abc123');
      expect(auth.get('ct0')).toBe('xyz789');
      expect(auth.size).toBe(2);
    });
  });

  describe('set/get', () => {
    it('stores and retrieves a cookie', () => {
      const auth = new CookieAuth();
      auth.set('auth_token', 'test123');
      expect(auth.get('auth_token')).toBe('test123');
    });

    it('converts values to strings', () => {
      const auth = new CookieAuth();
      auth.set('numeric', 42);
      expect(auth.get('numeric')).toBe('42');
    });

    it('returns undefined for unset cookies', () => {
      const auth = new CookieAuth();
      expect(auth.get('nonexistent')).toBeUndefined();
    });

    it('supports method chaining', () => {
      const auth = new CookieAuth();
      const result = auth.set('a', '1').set('b', '2');
      expect(result).toBe(auth);
      expect(auth.size).toBe(2);
    });
  });

  describe('has', () => {
    it('returns true for set cookies', () => {
      const auth = new CookieAuth({ auth_token: 'abc' });
      expect(auth.has('auth_token')).toBe(true);
    });

    it('returns false for unset cookies', () => {
      const auth = new CookieAuth();
      expect(auth.has('auth_token')).toBe(false);
    });
  });

  describe('delete', () => {
    it('removes a cookie', () => {
      const auth = new CookieAuth({ auth_token: 'abc' });
      expect(auth.delete('auth_token')).toBe(true);
      expect(auth.has('auth_token')).toBe(false);
    });

    it('returns false for non-existent cookie', () => {
      const auth = new CookieAuth();
      expect(auth.delete('nonexistent')).toBe(false);
    });
  });

  describe('clear', () => {
    it('removes all cookies', () => {
      const auth = new CookieAuth({ a: '1', b: '2', c: '3' });
      expect(auth.size).toBe(3);
      auth.clear();
      expect(auth.size).toBe(0);
      expect(auth.getAll()).toEqual({});
    });
  });

  describe('getAll', () => {
    it('returns plain object with all cookies', () => {
      const auth = new CookieAuth({ auth_token: 'abc', ct0: 'xyz' });
      expect(auth.getAll()).toEqual({ auth_token: 'abc', ct0: 'xyz' });
    });

    it('returns empty object when no cookies', () => {
      const auth = new CookieAuth();
      expect(auth.getAll()).toEqual({});
    });
  });

  describe('toString', () => {
    it('produces valid cookie header string', () => {
      const auth = new CookieAuth({ auth_token: 'abc', ct0: 'xyz' });
      const str = auth.toString();
      expect(str).toContain('auth_token=abc');
      expect(str).toContain('ct0=xyz');
      expect(str).toContain('; ');
    });

    it('returns empty string with no cookies', () => {
      const auth = new CookieAuth();
      expect(auth.toString()).toBe('');
    });
  });

  describe('isAuthenticated', () => {
    it('returns false when auth_token is missing', () => {
      const auth = new CookieAuth({ ct0: 'xyz' });
      expect(auth.isAuthenticated()).toBe(false);
    });

    it('returns false when ct0 is missing', () => {
      const auth = new CookieAuth({ auth_token: 'abc' });
      expect(auth.isAuthenticated()).toBe(false);
    });

    it('returns true when both auth_token and ct0 are present', () => {
      const auth = new CookieAuth({ auth_token: 'abc', ct0: 'xyz' });
      expect(auth.isAuthenticated()).toBe(true);
    });

    it('returns false when auth_token is empty string', () => {
      const auth = new CookieAuth({ auth_token: '', ct0: 'xyz' });
      expect(auth.isAuthenticated()).toBe(false);
    });

    it('returns false when ct0 is empty string', () => {
      const auth = new CookieAuth({ auth_token: 'abc', ct0: '' });
      expect(auth.isAuthenticated()).toBe(false);
    });
  });

  describe('getUserId', () => {
    it('extracts user ID from twid cookie', () => {
      const auth = new CookieAuth({ twid: 'u%3D1234567890' });
      expect(auth.getUserId()).toBe('1234567890');
    });

    it('returns null when twid is not set', () => {
      const auth = new CookieAuth();
      expect(auth.getUserId()).toBeNull();
    });
  });

  describe('getCsrfToken', () => {
    it('returns ct0 value', () => {
      const auth = new CookieAuth({ ct0: 'csrf_token_value' });
      expect(auth.getCsrfToken()).toBe('csrf_token_value');
    });

    it('returns null when ct0 is not set', () => {
      const auth = new CookieAuth();
      expect(auth.getCsrfToken()).toBeNull();
    });
  });

  describe('getAuthHeaders', () => {
    it('includes Cookie and x-csrf-token', () => {
      const auth = new CookieAuth({ auth_token: 'abc', ct0: 'xyz' });
      const headers = auth.getAuthHeaders();
      expect(headers.Cookie).toContain('auth_token=abc');
      expect(headers['x-csrf-token']).toBe('xyz');
    });

    it('omits x-csrf-token when ct0 is not set', () => {
      const auth = new CookieAuth({ auth_token: 'abc' });
      const headers = auth.getAuthHeaders();
      expect(headers.Cookie).toContain('auth_token=abc');
      expect(headers['x-csrf-token']).toBeUndefined();
    });
  });

  describe('save/load', () => {
    it('writes JSON to file with correct format', async () => {
      const auth = new CookieAuth({ auth_token: 'abc', ct0: 'xyz' });
      auth.setUsername('testuser');
      const filePath = join(tempDir, 'cookies.json');

      await auth.save(filePath);

      const content = JSON.parse(await fs.readFile(filePath, 'utf-8'));
      expect(content.cookies).toEqual({ auth_token: 'abc', ct0: 'xyz' });
      expect(content.username).toBe('testuser');
      expect(content.created).toBeDefined();
    });

    it('reads JSON from file and returns CookieAuth instance', async () => {
      const filePath = join(tempDir, 'cookies.json');
      await fs.mkdir(tempDir, { recursive: true });
      await fs.writeFile(filePath, JSON.stringify({
        cookies: { auth_token: 'loaded', ct0: 'csrf' },
        username: 'loadeduser',
        created: '2026-01-01T00:00:00Z',
      }));

      const auth = await CookieAuth.load(filePath);
      expect(auth.get('auth_token')).toBe('loaded');
      expect(auth.get('ct0')).toBe('csrf');
      expect(auth.getUsername()).toBe('loadeduser');
    });

    it('returns empty CookieAuth when file does not exist', async () => {
      const auth = await CookieAuth.load(join(tempDir, 'nonexistent.json'));
      expect(auth.size).toBe(0);
      expect(auth.isAuthenticated()).toBe(false);
    });

    it('roundtrip preserves all cookies', async () => {
      const filePath = join(tempDir, 'roundtrip.json');
      const original = new CookieAuth({
        auth_token: 'a1b2c3d4e5f6',
        ct0: 'csrf_token_160chars',
        twid: 'u%3D9876543210',
        guest_id: 'v1%3A170000000000000000',
        personalization_id: '"v1_abc123def456=="',
      });
      original.setUsername('roundtripuser');

      await original.save(filePath);
      const loaded = await CookieAuth.load(filePath);

      expect(loaded.getAll()).toEqual(original.getAll());
      expect(loaded.getUsername()).toBe('roundtripuser');
      expect(loaded.isAuthenticated()).toBe(true);
    });
  });

  describe('fromEnv', () => {
    it('creates from XACTIONS_SESSION_COOKIE env var (token value)', () => {
      process.env.XACTIONS_SESSION_COOKIE = 'my_auth_token_value';
      const auth = CookieAuth.fromEnv();
      expect(auth.get('auth_token')).toBe('my_auth_token_value');
    });

    it('creates from XACTIONS_SESSION_COOKIE env var (cookie string)', () => {
      process.env.XACTIONS_SESSION_COOKIE = 'auth_token=abc123; ct0=xyz789';
      const auth = CookieAuth.fromEnv();
      expect(auth.get('auth_token')).toBe('abc123');
      expect(auth.get('ct0')).toBe('xyz789');
    });

    it('returns unauthenticated instance when env var not set', () => {
      delete process.env.XACTIONS_SESSION_COOKIE;
      const auth = CookieAuth.fromEnv();
      expect(auth.isAuthenticated()).toBe(false);
      expect(auth.size).toBe(0);
    });
  });

  describe('fromObject', () => {
    it('creates from plain object', () => {
      const auth = CookieAuth.fromObject({ auth_token: 'abc', ct0: 'xyz' });
      expect(auth.get('auth_token')).toBe('abc');
      expect(auth.isAuthenticated()).toBe(true);
    });
  });

  describe('parse', () => {
    it('creates from cookie header string', () => {
      const auth = CookieAuth.parse('auth_token=abc; ct0=xyz; guest_id=123');
      expect(auth.get('auth_token')).toBe('abc');
      expect(auth.get('ct0')).toBe('xyz');
      expect(auth.get('guest_id')).toBe('123');
    });

    it('handles whitespace and edge cases', () => {
      const auth = CookieAuth.parse('  auth_token = abc ;  ct0=xyz  ; ');
      expect(auth.get('auth_token')).toBe('abc');
      expect(auth.get('ct0')).toBe('xyz');
    });

    it('handles empty string', () => {
      const auth = CookieAuth.parse('');
      expect(auth.size).toBe(0);
    });

    it('handles null/undefined', () => {
      const auth = CookieAuth.parse(null);
      expect(auth.size).toBe(0);
    });

    it('handles cookies with = in value', () => {
      const auth = CookieAuth.parse('personalization_id="v1_abc123=="');
      expect(auth.get('personalization_id')).toBe('"v1_abc123=="');
    });
  });

  describe('toJSON/fromJSON', () => {
    it('serializes and deserializes correctly', () => {
      const original = new CookieAuth({ auth_token: 'abc', ct0: 'xyz' });
      original.setUsername('jsonuser');
      const json = original.toJSON();
      const restored = CookieAuth.fromJSON(json);
      expect(restored.getAll()).toEqual(original.getAll());
      expect(restored.getUsername()).toBe('jsonuser');
    });
  });

  describe('iterator', () => {
    it('iterates over cookie entries', () => {
      const auth = new CookieAuth({ a: '1', b: '2' });
      const entries = [...auth];
      expect(entries).toContainEqual(['a', '1']);
      expect(entries).toContainEqual(['b', '2']);
    });
  });
});

describe('createCookieAuth', () => {
  it('creates from cookies option', async () => {
    const auth = await createCookieAuth({ cookies: { auth_token: 'abc' } });
    expect(auth.get('auth_token')).toBe('abc');
  });

  it('creates from cookieString option', async () => {
    const auth = await createCookieAuth({ cookieString: 'auth_token=abc; ct0=xyz' });
    expect(auth.get('auth_token')).toBe('abc');
    expect(auth.get('ct0')).toBe('xyz');
  });

  it('creates from file option', async () => {
    const filePath = join(tempDir, 'factory.json');
    await fs.mkdir(tempDir, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify({
      cookies: { auth_token: 'fromfile' },
    }));
    const auth = await createCookieAuth({ file: filePath });
    expect(auth.get('auth_token')).toBe('fromfile');
  });

  it('falls back to env var', async () => {
    process.env.XACTIONS_SESSION_COOKIE = 'envtoken';
    const auth = await createCookieAuth();
    expect(auth.get('auth_token')).toBe('envtoken');
  });
});
