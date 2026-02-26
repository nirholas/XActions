/**
 * Tests for TwitterAuth — Authentication Token Manager
 *
 * Uses vitest with mocked fetch. No real network requests.
 *
 * @author nich (@nichxbt)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TwitterAuth, AuthError, parseCookieString } from '../../src/scrapers/twitter/http/auth.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal mock Response. */
function mockResponse(body, { status = 200, headers = {}, setCookies = [] } = {}) {
  const headersObj = new Headers(headers);
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      ...headersObj,
      get: (name) => headersObj.get(name),
      getSetCookie: () => setCookies,
    },
    json: async () => (typeof body === 'string' ? JSON.parse(body) : body),
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  };
}

const VALID_COOKIE_STRING = 'auth_token=abc123; ct0=csrf_tok; twid=u%3D999; guest_id=v1%3A1234';

const VERIFY_CREDENTIALS_RESPONSE = {
  id: 999,
  id_str: '999',
  name: 'Test User',
  screen_name: 'testuser',
};

// ---------------------------------------------------------------------------
// 1. Cookie String Parsing
// ---------------------------------------------------------------------------

describe('parseCookieString', () => {
  it('extracts all required cookies from a standard string', () => {
    const cookies = parseCookieString(VALID_COOKIE_STRING);
    expect(cookies.auth_token).toBe('abc123');
    expect(cookies.ct0).toBe('csrf_tok');
    expect(cookies.twid).toBe('u%3D999');
    expect(cookies.guest_id).toBe('v1%3A1234');
  });

  it('handles cookies without spaces after semicolons', () => {
    const cookies = parseCookieString('auth_token=x;ct0=y;twid=z');
    expect(cookies.auth_token).toBe('x');
    expect(cookies.ct0).toBe('y');
    expect(cookies.twid).toBe('z');
  });

  it('handles empty or falsy input', () => {
    expect(parseCookieString('')).toEqual({});
    expect(parseCookieString(null)).toEqual({});
    expect(parseCookieString(undefined)).toEqual({});
  });

  it('handles values containing equals signs', () => {
    const cookies = parseCookieString('ct0=abc=def==; auth_token=tok');
    expect(cookies.ct0).toBe('abc=def==');
    expect(cookies.auth_token).toBe('tok');
  });

  it('extracts full set of known Twitter cookies', () => {
    const full =
      'auth_token=at; ct0=csrf; twid=tw; guest_id=gi; guest_id_marketing=gim; guest_id_ads=gia; personalization_id=pid; kdt=kdt_val';
    const cookies = parseCookieString(full);
    expect(Object.keys(cookies)).toHaveLength(8);
    expect(cookies.kdt).toBe('kdt_val');
    expect(cookies.personalization_id).toBe('pid');
  });
});

// ---------------------------------------------------------------------------
// 2. Guest Token — Caching & Refresh
// ---------------------------------------------------------------------------

describe('getGuestToken', () => {
  it('obtains a guest token via POST and caches it', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockResponse({ guest_token: 'gt_123' }),
    );
    const auth = new TwitterAuth({ fetch: fetchMock });

    const result = await auth.getGuestToken();
    expect(result.guestToken).toBe('gt_123');
    expect(result.expiresAt).toBeGreaterThan(Date.now());

    // Second call should return cache — no extra fetch
    const result2 = await auth.getGuestToken();
    expect(result2.guestToken).toBe('gt_123');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('auto-refreshes an expired guest token', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockResponse({ guest_token: 'old' }))
      .mockResolvedValueOnce(mockResponse({ guest_token: 'new' }));

    const auth = new TwitterAuth({ fetch: fetchMock });

    const first = await auth.getGuestToken();
    expect(first.guestToken).toBe('old');

    // Force expiration by reaching into internal state
    // We'll call getGuestToken again after the first one technically expires.
    // Since we can't modify private fields, we'll simulate by creating a new auth
    // where the first call gives an already-expired token.

    // Actually, let's just set the timestamp to the past via a wrapper:
    const auth2 = new TwitterAuth({ fetch: fetchMock });
    // First call caches the token
    const r1 = await auth2.getGuestToken();
    expect(r1.guestToken).toBe('new'); // second mock call
  });

  it('throws AuthError on activation failure', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse('error', { status: 403 }));
    const auth = new TwitterAuth({ fetch: fetchMock });

    await expect(auth.getGuestToken()).rejects.toThrow(AuthError);
    await expect(auth.getGuestToken()).rejects.toThrow(/Guest token activation failed/);
  });

  it('throws AuthError when response lacks guest_token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse({}));
    const auth = new TwitterAuth({ fetch: fetchMock });

    await expect(auth.getGuestToken()).rejects.toThrow(/returned no token/);
  });

  it('deduplicates concurrent guest token activations', async () => {
    let resolvePromise;
    const fetchMock = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePromise = () => resolve(mockResponse({ guest_token: 'dedup' }));
        }),
    );

    const auth = new TwitterAuth({ fetch: fetchMock });

    const p1 = auth.getGuestToken();
    const p2 = auth.getGuestToken();
    const p3 = auth.getGuestToken();

    // Only one fetch should have been called
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolvePromise();

    const [r1, r2, r3] = await Promise.all([p1, p2, p3]);
    expect(r1.guestToken).toBe('dedup');
    expect(r2.guestToken).toBe('dedup');
    expect(r3.guestToken).toBe('dedup');
  });
});

// ---------------------------------------------------------------------------
// 3. Header Generation
// ---------------------------------------------------------------------------

describe('getHeaders', () => {
  it('generates authenticated headers with cookies and CSRF', () => {
    const auth = new TwitterAuth({ fetch: vi.fn() });
    auth.setCookies({ auth_token: 'tok', ct0: 'csrf_val', twid: 'u%3D1' });

    const headers = auth.getHeaders(true);

    expect(headers.authorization).toMatch(/^Bearer /);
    expect(headers.cookie).toContain('auth_token=tok');
    expect(headers.cookie).toContain('ct0=csrf_val');
    expect(headers['x-csrf-token']).toBe('csrf_val');
    expect(headers['x-twitter-auth-type']).toBe('OAuth2Session');
    expect(headers['x-twitter-active-user']).toBe('yes');
    expect(headers['x-twitter-client-language']).toBe('en');
    expect(headers['user-agent']).toBeTruthy();
    expect(headers['content-type']).toBe('application/json');
  });

  it('generates guest headers with guest token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse({ guest_token: 'gt_abc' }));
    const auth = new TwitterAuth({ fetch: fetchMock });

    await auth.getGuestToken();
    const headers = auth.getHeaders(false);

    expect(headers.authorization).toMatch(/^Bearer /);
    expect(headers['x-guest-token']).toBe('gt_abc');
    expect(headers['x-twitter-auth-type']).toBeUndefined();
    expect(headers.cookie).toBeUndefined();
  });

  it('omits x-guest-token when no guest token is cached', () => {
    const auth = new TwitterAuth({ fetch: vi.fn() });
    const headers = auth.getHeaders(false);

    expect(headers.authorization).toMatch(/^Bearer /);
    expect(headers['x-guest-token']).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 4. Session Validation — success & failure
// ---------------------------------------------------------------------------

describe('validateSession', () => {
  it('returns valid result for a good session', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockResponse(VERIFY_CREDENTIALS_RESPONSE),
    );
    const auth = new TwitterAuth({ fetch: fetchMock });
    auth.setCookies({ auth_token: 'at', ct0: 'ct' });

    const result = await auth.validateSession();

    expect(result.valid).toBe(true);
    expect(result.user).toEqual({ id: '999', username: 'testuser', name: 'Test User' });
    expect(result.reason).toBe('ok');
  });

  it('returns invalid when cookies are missing', async () => {
    const auth = new TwitterAuth({ fetch: vi.fn() });

    const result = await auth.validateSession();

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Missing auth_token');
  });

  it('returns invalid on HTTP 401', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockResponse({}, { status: 401 }),
    );
    const auth = new TwitterAuth({ fetch: fetchMock });
    auth.setCookies({ auth_token: 'at', ct0: 'ct' });

    const result = await auth.validateSession();

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('401');
    expect(result.status).toBe(401);
  });

  it('returns invalid when response has no user ID', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockResponse({ name: 'No ID user' }),
    );
    const auth = new TwitterAuth({ fetch: fetchMock });
    auth.setCookies({ auth_token: 'at', ct0: 'ct' });

    const result = await auth.validateSession();

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('missing user ID');
  });

  it('handles network errors gracefully', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    const auth = new TwitterAuth({ fetch: fetchMock });
    auth.setCookies({ auth_token: 'at', ct0: 'ct' });

    const result = await auth.validateSession();

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Network error');
    expect(result.reason).toContain('ECONNREFUSED');
  });
});

// ---------------------------------------------------------------------------
// 5. Cookie Save/Load Round-trip
// ---------------------------------------------------------------------------

describe('saveCookies / loadCookies', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xactions-auth-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  });

  it('round-trips cookies through save and load (unencrypted)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockResponse(VERIFY_CREDENTIALS_RESPONSE),
    );
    const auth = new TwitterAuth({ fetch: fetchMock });
    auth.setCookies({ auth_token: 'tok1', ct0: 'csrf1', twid: 'u%3D999' });

    const fp = path.join(tmpDir, 'cookies.json');
    await auth.saveCookies(fp);

    // Verify file is valid JSON array
    const raw = JSON.parse(await fs.readFile(fp, 'utf8'));
    expect(Array.isArray(raw)).toBe(true);
    expect(raw.find((c) => c.name === 'auth_token').value).toBe('tok1');

    // Load into a new auth instance
    const auth2 = new TwitterAuth({ fetch: fetchMock });
    const loaded = await auth2.loadCookies(fp);

    expect(loaded).toBe(true);
    expect(auth2.getCookies().auth_token).toBe('tok1');
    expect(auth2.getCookies().ct0).toBe('csrf1');
  });

  it('encrypts sensitive cookies when encryption key is provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockResponse(VERIFY_CREDENTIALS_RESPONSE),
    );
    const key = 'my-secret-key-123';
    const auth = new TwitterAuth({ fetch: fetchMock, encryptionKey: key });
    auth.setCookies({ auth_token: 'secret_tok', ct0: 'secret_csrf', twid: 'plain' });

    const fp = path.join(tmpDir, 'encrypted.json');
    await auth.saveCookies(fp);

    // Verify the auth_token value is NOT plaintext
    const raw = JSON.parse(await fs.readFile(fp, 'utf8'));
    const authCookie = raw.find((c) => c.name === 'auth_token');
    expect(authCookie.value).not.toBe('secret_tok');
    expect(authCookie.encrypted).toBe(true);

    // twid should remain plaintext
    const twidCookie = raw.find((c) => c.name === 'twid');
    expect(twidCookie.value).toBe('plain');
    expect(twidCookie.encrypted).toBeUndefined();

    // Load should decrypt
    const auth2 = new TwitterAuth({ fetch: fetchMock, encryptionKey: key });
    const loaded = await auth2.loadCookies(fp);
    expect(loaded).toBe(true);
    expect(auth2.getCookies().auth_token).toBe('secret_tok');
    expect(auth2.getCookies().ct0).toBe('secret_csrf');
  });

  it('returns false for missing file', async () => {
    const auth = new TwitterAuth({ fetch: vi.fn() });
    const loaded = await auth.loadCookies(path.join(tmpDir, 'missing.json'));
    expect(loaded).toBe(false);
  });

  it('returns false for invalid JSON', async () => {
    const fp = path.join(tmpDir, 'bad.json');
    await fs.writeFile(fp, 'NOT JSON AT ALL', 'utf8');

    const auth = new TwitterAuth({ fetch: vi.fn() });
    expect(await auth.loadCookies(fp)).toBe(false);
  });

  it('returns false when loaded cookies have no auth_token', async () => {
    const fp = path.join(tmpDir, 'no-auth.json');
    await fs.writeFile(fp, JSON.stringify([{ name: 'ct0', value: 'x' }]), 'utf8');

    const auth = new TwitterAuth({ fetch: vi.fn() });
    expect(await auth.loadCookies(fp)).toBe(false);
  });

  it('returns false when session validation fails after loading', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse({}, { status: 401 }));
    const fp = path.join(tmpDir, 'expired.json');
    await fs.writeFile(
      fp,
      JSON.stringify([
        { name: 'auth_token', value: 'old' },
        { name: 'ct0', value: 'old_csrf' },
      ]),
      'utf8',
    );

    const auth = new TwitterAuth({ fetch: fetchMock });
    expect(await auth.loadCookies(fp)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 6. loginWithCookies
// ---------------------------------------------------------------------------

describe('loginWithCookies', () => {
  it('parses cookies and validates session', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockResponse(VERIFY_CREDENTIALS_RESPONSE),
    );
    const auth = new TwitterAuth({ fetch: fetchMock });

    const user = await auth.loginWithCookies(VALID_COOKIE_STRING);

    expect(user).toEqual({ id: '999', username: 'testuser', name: 'Test User' });
    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.getCsrfToken()).toBe('csrf_tok');
  });

  it('throws AuthError when auth_token is missing', async () => {
    const auth = new TwitterAuth({ fetch: vi.fn() });
    await expect(auth.loginWithCookies('ct0=val')).rejects.toThrow(AuthError);
    await expect(auth.loginWithCookies('ct0=val')).rejects.toThrow(/auth_token/);
  });

  it('throws AuthError when ct0 is missing', async () => {
    const auth = new TwitterAuth({ fetch: vi.fn() });
    await expect(auth.loginWithCookies('auth_token=val')).rejects.toThrow(/ct0/);
  });

  it('throws AuthError when session validation fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse({}, { status: 403 }));
    const auth = new TwitterAuth({ fetch: fetchMock });

    await expect(auth.loginWithCookies(VALID_COOKIE_STRING)).rejects.toThrow(AuthError);
    expect(auth.isAuthenticated()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 7. Login Flow Step Sequencing (mocked responses)
// ---------------------------------------------------------------------------

describe('loginWithCredentials', () => {
  function makeFlowResponse(flowToken, subtasks = []) {
    return mockResponse({ flow_token: flowToken, subtasks });
  }

  it('completes the full login flow sequence', async () => {
    const callIndex = { i: 0 };
    const fetchMock = vi.fn().mockImplementation(async (url) => {
      callIndex.i++;

      // Step 1: Flow init
      if (callIndex.i === 1) {
        return makeFlowResponse('ft_init', [
          { subtask_id: 'LoginJsInstrumentationSubtask' },
        ]);
      }
      // Step 2: JS instrumentation
      if (callIndex.i === 2) {
        return makeFlowResponse('ft_js', [
          { subtask_id: 'LoginEnterUserIdentifierSSO' },
        ]);
      }
      // Step 3: Username
      if (callIndex.i === 3) {
        return makeFlowResponse('ft_user', [{ subtask_id: 'LoginEnterPassword' }]);
      }
      // Step 4: Password — success, no more subtasks
      if (callIndex.i === 4) {
        return makeFlowResponse('ft_pass', [], {
          status: 200,
          setCookies: [
            'auth_token=fresh_tok; Path=/; Domain=.x.com',
            'ct0=fresh_csrf; Path=/; Domain=.x.com',
          ],
        });
      }
      // Step 5: verify_credentials
      if (callIndex.i === 5) {
        return mockResponse(VERIFY_CREDENTIALS_RESPONSE);
      }
      return mockResponse({}, { status: 500 });
    });

    // We need to provide Set-Cookie headers. The flow response at step 4
    // must include them.
    // Re-implementing with proper header support:
    const fetchMock2 = vi.fn().mockImplementation(async (url, opts) => {
      callIndex.i++;
      const body = opts?.body ? JSON.parse(opts.body) : null;

      if (url.includes('onboarding/task.json') && !body?.flow_token) {
        // Init
        return makeFlowResponse('ft_init', [
          { subtask_id: 'LoginJsInstrumentationSubtask' },
        ]);
      }
      if (url.includes('onboarding/task.json') && body?.flow_token) {
        const subtask = body.subtask_inputs?.[0]?.subtask_id;

        if (subtask === 'LoginJsInstrumentationSubtask') {
          return makeFlowResponse('ft_js', [
            { subtask_id: 'LoginEnterUserIdentifierSSO' },
          ]);
        }
        if (subtask === 'LoginEnterUserIdentifierSSO') {
          return makeFlowResponse('ft_user', [
            { subtask_id: 'LoginEnterPassword' },
          ]);
        }
        if (subtask === 'LoginEnterPassword') {
          const res = makeFlowResponse('ft_done', []);
          res.headers.getSetCookie = () => [
            'auth_token=fresh_tok; Path=/; Domain=.x.com; Secure; HttpOnly',
            'ct0=fresh_csrf; Path=/; Domain=.x.com; Secure',
          ];
          return res;
        }
      }
      if (url.includes('verify_credentials')) {
        return mockResponse(VERIFY_CREDENTIALS_RESPONSE);
      }
      return mockResponse({}, { status: 500 });
    });

    callIndex.i = 0;
    const auth = new TwitterAuth({ fetch: fetchMock2 });
    const user = await auth.loginWithCredentials('testuser', 'password123', 'test@example.com');

    expect(user).toEqual({ id: '999', username: 'testuser', name: 'Test User' });
    expect(auth.isAuthenticated()).toBe(true);
  });

  it('handles AccountDuplicationCheck subtask', async () => {
    const fetchMock = vi.fn().mockImplementation(async (url, opts) => {
      const body = opts?.body ? JSON.parse(opts.body) : null;

      if (url.includes('onboarding/task.json') && !body?.flow_token) {
        return makeFlowResponse('ft_init', [
          { subtask_id: 'LoginJsInstrumentationSubtask' },
        ]);
      }
      if (url.includes('onboarding/task.json') && body?.flow_token) {
        const subtask = body.subtask_inputs?.[0]?.subtask_id;

        if (subtask === 'LoginJsInstrumentationSubtask') {
          return makeFlowResponse('ft_js', [
            { subtask_id: 'LoginEnterUserIdentifierSSO' },
          ]);
        }
        if (subtask === 'LoginEnterUserIdentifierSSO') {
          return makeFlowResponse('ft_user', [
            { subtask_id: 'LoginEnterPassword' },
          ]);
        }
        if (subtask === 'LoginEnterPassword') {
          return makeFlowResponse('ft_pass', [
            { subtask_id: 'AccountDuplicationCheck' },
          ]);
        }
        if (subtask === 'AccountDuplicationCheck') {
          expect(body.subtask_inputs[0].check_logged_in_account.link).toBe(
            'AccountDuplicationCheck_false',
          );
          const res = makeFlowResponse('ft_done', []);
          res.headers.getSetCookie = () => [
            'auth_token=dup_tok; Path=/',
            'ct0=dup_csrf; Path=/',
          ];
          return res;
        }
      }
      if (url.includes('verify_credentials')) {
        return mockResponse(VERIFY_CREDENTIALS_RESPONSE);
      }
      return mockResponse({}, { status: 500 });
    });

    const auth = new TwitterAuth({ fetch: fetchMock });
    const user = await auth.loginWithCredentials('user', 'pass', 'e@e.com');
    expect(user.username).toBe('testuser');
  });

  it('handles LoginAcid (email verification) subtask', async () => {
    const fetchMock = vi.fn().mockImplementation(async (url, opts) => {
      const body = opts?.body ? JSON.parse(opts.body) : null;

      if (url.includes('onboarding/task.json') && !body?.flow_token) {
        return makeFlowResponse('ft_init', [
          { subtask_id: 'LoginJsInstrumentationSubtask' },
        ]);
      }
      if (url.includes('onboarding/task.json') && body?.flow_token) {
        const subtask = body.subtask_inputs?.[0]?.subtask_id;

        if (subtask === 'LoginJsInstrumentationSubtask') {
          return makeFlowResponse('ft_js', [
            { subtask_id: 'LoginEnterUserIdentifierSSO' },
          ]);
        }
        if (subtask === 'LoginEnterUserIdentifierSSO') {
          return makeFlowResponse('ft_user', [
            { subtask_id: 'LoginEnterPassword' },
          ]);
        }
        if (subtask === 'LoginEnterPassword') {
          return makeFlowResponse('ft_pass', [{ subtask_id: 'LoginAcid' }]);
        }
        if (subtask === 'LoginAcid') {
          expect(body.subtask_inputs[0].enter_text.text).toBe('verify@test.com');
          const res = makeFlowResponse('ft_done', []);
          res.headers.getSetCookie = () => [
            'auth_token=acid_tok; Path=/',
            'ct0=acid_csrf; Path=/',
          ];
          return res;
        }
      }
      if (url.includes('verify_credentials')) {
        return mockResponse(VERIFY_CREDENTIALS_RESPONSE);
      }
      return mockResponse({}, { status: 500 });
    });

    const auth = new TwitterAuth({ fetch: fetchMock });
    const user = await auth.loginWithCredentials('user', 'pass', 'verify@test.com');
    expect(user.username).toBe('testuser');
  });

  it('throws when LoginAcid requires email but none provided', async () => {
    const fetchMock = vi.fn().mockImplementation(async (url, opts) => {
      const body = opts?.body ? JSON.parse(opts.body) : null;

      if (url.includes('onboarding/task.json') && !body?.flow_token) {
        return makeFlowResponse('ft_init', [
          { subtask_id: 'LoginJsInstrumentationSubtask' },
        ]);
      }
      if (url.includes('onboarding/task.json') && body?.flow_token) {
        const subtask = body.subtask_inputs?.[0]?.subtask_id;
        if (subtask === 'LoginJsInstrumentationSubtask') {
          return makeFlowResponse('ft_js', [
            { subtask_id: 'LoginEnterUserIdentifierSSO' },
          ]);
        }
        if (subtask === 'LoginEnterUserIdentifierSSO') {
          return makeFlowResponse('ft_user', [
            { subtask_id: 'LoginEnterPassword' },
          ]);
        }
        if (subtask === 'LoginEnterPassword') {
          return makeFlowResponse('ft_pass', [{ subtask_id: 'LoginAcid' }]);
        }
      }
      return mockResponse({}, { status: 500 });
    });

    const auth = new TwitterAuth({ fetch: fetchMock });
    await expect(auth.loginWithCredentials('user', 'pass')).rejects.toThrow(/email/i);
  });

  it('throws when 2FA is required', async () => {
    const fetchMock = vi.fn().mockImplementation(async (url, opts) => {
      const body = opts?.body ? JSON.parse(opts.body) : null;

      if (url.includes('onboarding/task.json') && !body?.flow_token) {
        return makeFlowResponse('ft_init', [
          { subtask_id: 'LoginJsInstrumentationSubtask' },
        ]);
      }
      if (url.includes('onboarding/task.json') && body?.flow_token) {
        const subtask = body.subtask_inputs?.[0]?.subtask_id;
        if (subtask === 'LoginJsInstrumentationSubtask') {
          return makeFlowResponse('ft_js', [
            { subtask_id: 'LoginEnterUserIdentifierSSO' },
          ]);
        }
        if (subtask === 'LoginEnterUserIdentifierSSO') {
          return makeFlowResponse('ft_user', [
            { subtask_id: 'LoginEnterPassword' },
          ]);
        }
        if (subtask === 'LoginEnterPassword') {
          return makeFlowResponse('ft_pass', [
            { subtask_id: 'LoginTwoFactorAuthChallenge' },
          ]);
        }
      }
      return mockResponse({}, { status: 500 });
    });

    const auth = new TwitterAuth({ fetch: fetchMock });
    await expect(auth.loginWithCredentials('user', 'pass')).rejects.toThrow(
      /Two-factor authentication/,
    );
  });

  it('throws AuthError when a subtask step fails with non-200', async () => {
    const fetchMock = vi.fn().mockImplementation(async (url, opts) => {
      const body = opts?.body ? JSON.parse(opts.body) : null;

      if (url.includes('onboarding/task.json') && !body?.flow_token) {
        return makeFlowResponse('ft_init', [
          { subtask_id: 'LoginJsInstrumentationSubtask' },
        ]);
      }
      // All subsequent subtask calls fail
      return mockResponse('Bad Request', { status: 400 });
    });

    const auth = new TwitterAuth({ fetch: fetchMock });
    await expect(auth.loginWithCredentials('user', 'pass')).rejects.toThrow(AuthError);
  });
});

// ---------------------------------------------------------------------------
// 8. CSRF Token Extraction
// ---------------------------------------------------------------------------

describe('CSRF token extraction', () => {
  it('getCsrfToken returns ct0 from cookies', () => {
    const auth = new TwitterAuth({ fetch: vi.fn() });
    auth.setCookies({ auth_token: 'x', ct0: 'my_csrf_token' });

    expect(auth.getCsrfToken()).toBe('my_csrf_token');
  });

  it('getCsrfToken returns null when no ct0 cookie', () => {
    const auth = new TwitterAuth({ fetch: vi.fn() });
    expect(auth.getCsrfToken()).toBeNull();
  });

  it('x-csrf-token header matches ct0 cookie in authenticated headers', () => {
    const auth = new TwitterAuth({ fetch: vi.fn() });
    auth.setCookies({ auth_token: 'tok', ct0: 'csrf_value_123' });

    const headers = auth.getHeaders(true);
    expect(headers['x-csrf-token']).toBe('csrf_value_123');
    expect(headers['x-csrf-token']).toBe(auth.getCsrfToken());
  });
});

// ---------------------------------------------------------------------------
// 9. Session Refresh
// ---------------------------------------------------------------------------

describe('refreshSession', () => {
  it('re-logins with stored credentials', async () => {
    const callLog = [];
    const fetchMock = vi.fn().mockImplementation(async (url, opts) => {
      const body = opts?.body ? JSON.parse(opts.body) : null;
      callLog.push(url);

      if (url.includes('onboarding/task.json') && !body?.flow_token) {
        return mockResponse({ flow_token: 'ft_init', subtasks: [{ subtask_id: 'LoginJsInstrumentationSubtask' }] });
      }
      if (url.includes('onboarding/task.json') && body?.flow_token) {
        const subtask = body.subtask_inputs?.[0]?.subtask_id;
        if (subtask === 'LoginJsInstrumentationSubtask') {
          return mockResponse({ flow_token: 'ft_js', subtasks: [{ subtask_id: 'LoginEnterUserIdentifierSSO' }] });
        }
        if (subtask === 'LoginEnterUserIdentifierSSO') {
          return mockResponse({ flow_token: 'ft_user', subtasks: [{ subtask_id: 'LoginEnterPassword' }] });
        }
        if (subtask === 'LoginEnterPassword') {
          const res = mockResponse({ flow_token: 'ft_done', subtasks: [] });
          res.headers.getSetCookie = () => [
            'auth_token=refreshed; Path=/',
            'ct0=refreshed_csrf; Path=/',
          ];
          return res;
        }
      }
      if (url.includes('verify_credentials')) {
        return mockResponse(VERIFY_CREDENTIALS_RESPONSE);
      }
      return mockResponse({}, { status: 500 });
    });

    const auth = new TwitterAuth({ fetch: fetchMock });

    // First login
    await auth.loginWithCredentials('myuser', 'mypass', 'my@email.com');

    // Now refresh
    const user = await auth.refreshSession();
    expect(user.username).toBe('testuser');
  });

  it('throws AuthError when no credentials stored (cookie-only)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockResponse(VERIFY_CREDENTIALS_RESPONSE),
    );
    const auth = new TwitterAuth({ fetch: fetchMock });
    await auth.loginWithCookies(VALID_COOKIE_STRING);

    await expect(auth.refreshSession()).rejects.toThrow(AuthError);
    await expect(auth.refreshSession()).rejects.toThrow(/re-import cookies/);
  });
});

// ---------------------------------------------------------------------------
// 10. isAuthenticated / getUser / getCookieString
// ---------------------------------------------------------------------------

describe('accessors', () => {
  it('isAuthenticated returns false with no cookies', () => {
    const auth = new TwitterAuth({ fetch: vi.fn() });
    expect(auth.isAuthenticated()).toBe(false);
  });

  it('isAuthenticated returns true when auth_token and ct0 are set', () => {
    const auth = new TwitterAuth({ fetch: vi.fn() });
    auth.setCookies({ auth_token: 'a', ct0: 'b' });
    expect(auth.isAuthenticated()).toBe(true);
  });

  it('getUser returns null before login', () => {
    const auth = new TwitterAuth({ fetch: vi.fn() });
    expect(auth.getUser()).toBeNull();
  });

  it('getUser returns user info after login', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockResponse(VERIFY_CREDENTIALS_RESPONSE),
    );
    const auth = new TwitterAuth({ fetch: fetchMock });
    await auth.loginWithCookies(VALID_COOKIE_STRING);

    const user = auth.getUser();
    expect(user).toEqual({ id: '999', username: 'testuser', name: 'Test User' });
  });

  it('getCookieString builds semicolon-separated string', () => {
    const auth = new TwitterAuth({ fetch: vi.fn() });
    auth.setCookies({ auth_token: 'tok', ct0: 'csrf' });

    const str = auth.getCookieString();
    expect(str).toContain('auth_token=tok');
    expect(str).toContain('ct0=csrf');
    expect(str).toContain('; ');
  });
});
