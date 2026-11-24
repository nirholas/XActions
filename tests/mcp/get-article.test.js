// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * x_get_article reads the session `xactions login` saved, so an agent that
 * never exported XACTIONS_SESSION_COOKIE still gets the article body.
 * Offline: fetch is stubbed and the session lives in a temp XACTIONS_HOME.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const TWEET_ID = '2091905664704745583';
const BODY = 'Full body of the article.';

function articleResponse(article = {}) {
  return {
    data: {
      tweetResult: {
        result: {
          __typename: 'Tweet',
          rest_id: TWEET_ID,
          article: {
            article_results: {
              result: { rest_id: '2091905657058533378', title: 'A title', preview_text: 'preview', ...article },
            },
          },
          core: { user_results: { result: { __typename: 'User', rest_id: '1', core: { screen_name: 'EXM7777', name: 'Machina' }, legacy: {} } } },
          legacy: { id_str: TWEET_ID, full_text: 'https://t.co/abc', created_at: 'Mon Aug 25 12:00:00 +0000 2026' },
        },
      },
    },
  };
}

function stubFetch(body) {
  const fetch = vi.fn().mockResolvedValue({
    status: 200,
    headers: { get: () => null },
    json: () => Promise.resolve(body),
  });
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

function cookieHeaderOf(fetch) {
  return fetch.mock.calls[0][1].headers.cookie ?? '';
}

let home;

beforeEach(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), 'xactions-get-article-'));
  fs.writeFileSync(
    path.join(home, 'cookies.json'),
    JSON.stringify([{ name: 'auth_token', value: 'saved-token' }, { name: 'ct0', value: 'saved-ct0' }]),
  );
  vi.stubEnv('XACTIONS_HOME', home);
  vi.stubEnv('XACTIONS_SESSION_COOKIE', '');
  vi.stubEnv('XACTIONS_CSRF_TOKEN', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  fs.rmSync(home, { recursive: true, force: true });
});

describe('x_get_article', () => {
  it('sends the saved session and returns the body', async () => {
    const fetch = stubFetch(articleResponse({ plain_text: BODY }));
    const { x_get_article } = await import('../../src/mcp/local-tools.js');

    const article = await x_get_article({ url: `https://x.com/EXM7777/status/${TWEET_ID}` });

    expect(cookieHeaderOf(fetch)).toContain('auth_token=saved-token');
    expect(cookieHeaderOf(fetch)).toContain('ct0=saved-ct0');
    expect(article.text).toBe(BODY);
  });

  it('fails before any request when no session is saved', async () => {
    fs.rmSync(path.join(home, 'cookies.json'));
    const fetch = stubFetch(articleResponse({ plain_text: BODY }));
    const { x_get_article } = await import('../../src/mcp/local-tools.js');

    await expect(x_get_article({ url: TWEET_ID })).rejects.toThrow(/xactions login/);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects an answer that carries only the preview', async () => {
    stubFetch(articleResponse());
    const { x_get_article } = await import('../../src/mcp/local-tools.js');

    await expect(x_get_article({ url: TWEET_ID })).rejects.toThrow(/only the preview/);
  });

  it('returns an empty body as an empty article, not an error', async () => {
    stubFetch(articleResponse({ plain_text: '' }));
    const { x_get_article } = await import('../../src/mcp/local-tools.js');

    const article = await x_get_article({ url: TWEET_ID });

    expect(article.text).toBe('');
  });
});
