// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Tests — src/streaming/browserPool.js: every pooled page gets its own
 * browser context, so two accounts streaming on one browser never share a
 * cookie jar.
 *
 * @author nich (@nichxbt)
 */

import { describe, it, expect, vi, afterAll } from 'vitest';

const created = { contexts: [], pagesIn: [] };

function fakeContext(id) {
  const ctx = {
    id,
    closed: false,
    cookies: new Map(),
    async newPage() { return null; },
    async close() { ctx.closed = true; },
  };
  return ctx;
}

vi.mock('../../src/scrapers/index.js', () => ({
  createBrowser: async () => ({
    connected: true,
    isConnected: () => true,
    async createBrowserContext() {
      const ctx = fakeContext(created.contexts.length + 1);
      created.contexts.push(ctx);
      return ctx;
    },
    async close() {},
  }),
  createPage: async (target) => {
    created.pagesIn.push(target);
    let closed = false;
    return { owner: target, isClosed: () => closed, close: async () => { closed = true; } };
  },
  loginWithCookie: async (page, token) => { page.owner.cookies.set('auth_token', token); },
}));

const { acquirePage, releasePage, closeAll } = await import('../../src/streaming/browserPool.js');

afterAll(() => closeAll());

describe('browser pool isolation', () => {
  it('opens each page in its own context and closes the context with the page', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const a = await acquirePage('token-for-alice');
    const b = await acquirePage('token-for-bob');

    expect(a.browser).toBe(b.browser); // same pooled browser...
    expect(created.contexts).toHaveLength(2); // ...two isolated contexts
    expect(created.pagesIn[0]).not.toBe(created.pagesIn[1]);
    expect(created.contexts[0].cookies.get('auth_token')).toBe('token-for-alice');
    expect(created.contexts[1].cookies.get('auth_token')).toBe('token-for-bob');

    await releasePage(a.browser, a.page);
    expect(created.contexts[0].closed).toBe(true);
    expect(created.contexts[1].closed).toBe(false);
    await releasePage(b.browser, b.page);
    expect(created.contexts[1].closed).toBe(true);
  });
});
