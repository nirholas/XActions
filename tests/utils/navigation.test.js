// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * gotoAndRender: the navigation every browser path on x.com goes through.
 *
 * What it protects: nobody asks for `networkidle2` (which never settles on
 * x.com and burned the whole 30s timeout), the wait is on the caller's
 * selector, and a selector that never shows up is the caller's decision, not
 * an exception.
 *
 * @author nich (@nichxbt)
 */

import { describe, it, expect } from 'vitest';
import { gotoAndRender, RENDER_TIMEOUT_MS } from '../../src/utils/navigation.js';

function recordingPage({ selectorAppears = true } = {}) {
  const calls = [];
  return {
    calls,
    goto: async (url, opts) => { calls.push(['goto', url, opts]); },
    waitForSelector: async (sel, opts) => {
      calls.push(['waitForSelector', sel, opts]);
      if (!selectorAppears) throw new Error(`Waiting for selector \`${sel}\` failed`);
      return {};
    },
  };
}

describe('gotoAndRender', () => {
  it('loads to domcontentloaded, then waits for the selector the caller needs', async () => {
    const page = recordingPage();
    const ok = await gotoAndRender(page, 'https://x.com/nasa', '[data-testid="UserName"]');

    expect(ok).toBe(true);
    expect(page.calls).toEqual([
      ['goto', 'https://x.com/nasa', { waitUntil: 'domcontentloaded' }],
      ['waitForSelector', '[data-testid="UserName"]', { timeout: RENDER_TIMEOUT_MS }],
    ]);
  });

  it('never asks for networkidle2', async () => {
    const page = recordingPage();
    await gotoAndRender(page, 'https://x.com/home', 'article');
    await gotoAndRender(page, 'https://x.com/home', undefined, { settleMs: 0 });

    const waits = page.calls.filter(([k]) => k === 'goto').map(([, , o]) => o.waitUntil);
    expect(waits).toEqual(['domcontentloaded', 'domcontentloaded']);
  });

  it('resolves false instead of throwing when the selector never renders', async () => {
    const page = recordingPage({ selectorAppears: false });
    await expect(gotoAndRender(page, 'https://x.com/i/bookmarks', 'article')).resolves.toBe(false);
  });

  it('honours a custom timeout', async () => {
    const page = recordingPage();
    await gotoAndRender(page, 'https://x.com/home', 'article', { timeout: 2500 });
    expect(page.calls[1][2]).toEqual({ timeout: 2500 });
  });

  it('pauses instead of waiting when there is no selector', async () => {
    const page = recordingPage();
    const started = Date.now();
    const ok = await gotoAndRender(page, 'https://x.com/home', undefined, { settleMs: 20 });

    expect(ok).toBe(true);
    expect(Date.now() - started).toBeGreaterThanOrEqual(15);
    expect(page.calls.map(([k]) => k)).toEqual(['goto']);
  });

  it('lets a failed navigation throw', async () => {
    const page = {
      goto: async () => { throw new Error('net::ERR_NAME_NOT_RESOLVED'); },
      waitForSelector: async () => ({}),
    };
    await expect(gotoAndRender(page, 'https://x.com/home', 'article')).rejects.toThrow('ERR_NAME_NOT_RESOLVED');
  });
});
