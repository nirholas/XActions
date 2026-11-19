// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * The auth barrel must import cleanly. It used to re-export a TwoFactorAuth
 * module that does not exist, so `import 'src/client/auth/index.js'` threw
 * ERR_MODULE_NOT_FOUND before any caller could use it.
 *
 * @author nich (@nichxbt)
 */

import { describe, it, expect } from 'vitest';

describe('client/auth barrel', () => {
  it('imports and exposes the auth classes and factories', async () => {
    const mod = await import('../../../src/client/auth/index.js');
    expect(typeof mod.CookieAuth).toBe('function');
    expect(typeof mod.GuestToken).toBe('function');
    expect(typeof mod.TokenManager).toBe('function');
    expect(typeof mod.CredentialAuth).toBe('function');
    expect(typeof mod.createAuth).toBe('function');
    expect(typeof mod.login).toBe('function');
    expect(mod.TwoFactorAuth).toBeUndefined();
  });

  it('createAuth builds a working context from a cookie map', async () => {
    const { createAuth } = await import('../../../src/client/auth/index.js');
    const fetch = async () => {
      throw new Error('no network in this test');
    };
    const auth = await createAuth({ cookies: { auth_token: 'tok', ct0: 'csrf' }, fetch });
    expect(Object.keys(auth).sort()).toEqual(['cookieAuth', 'credentialAuth', 'guestToken', 'tokenManager']);
    expect(auth.cookieAuth.isAuthenticated()).toBe(true);
    expect(auth.tokenManager.csrfToken).toBe('csrf');
    expect(auth.cookieAuth.getCookieString()).toContain('auth_token=tok');
  });

  it('createAuth accepts a cookie header string', async () => {
    const { createAuth } = await import('../../../src/client/auth/index.js');
    const auth = await createAuth({ cookieString: 'auth_token=a; ct0=b' });
    expect(auth.cookieAuth.isAuthenticated()).toBe(true);
  });
});
