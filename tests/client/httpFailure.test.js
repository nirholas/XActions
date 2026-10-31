// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * describeHttpFailure turns X's bare, empty-body 404/401/403 answers into an
 * actionable error. Regression for issue #99: a user with a saved session ran
 * `xactions followers nasa` and got only "HTTP 404:" with no way forward.
 */

import { describe, it, expect } from 'vitest';
import { describeHttpFailure } from '../../src/client/Scraper.js';

const url = 'https://x.com/i/api/graphql/abc/Followers?variables=%7B%7D';
const bare404 = { status: 404, statusText: '', headers: new Headers() };

describe('describeHttpFailure', () => {
  it('names the session problem when a logged-in session still gets a bare 404', () => {
    const err = describeHttpFailure(bare404, url, { authenticated: true });
    expect(err.message).not.toBe('HTTP 404: ');
    expect(err.message).toContain('/i/api/graphql/abc/Followers');
    expect(err.message).toContain('xactions connect');
    expect(err.message).toContain('xactions doctor');
    expect(err.httpStatus).toBe(404);
  });

  it('tells a user with auth_token but no ct0 that ct0 is the missing piece', () => {
    const err = describeHttpFailure(bare404, url, { authenticated: false, hasAuthToken: true });
    expect(err.code).toBe('AUTH_REQUIRED');
    expect(err.message).toContain('ct0');
    expect(err.message).toContain('xactions connect');
  });

  it('still asks a cookie-less caller to authenticate', () => {
    const err = describeHttpFailure(bare404, url, { authenticated: false });
    expect(err.code).toBe('AUTH_REQUIRED');
    expect(err.message).toContain('auth_token');
  });

  it('leaves non-session statuses alone', () => {
    const err = describeHttpFailure({ status: 500, statusText: 'Server Error', headers: new Headers() }, url, { authenticated: true });
    expect(err.message).toBe('HTTP 500: Server Error');
  });
});
