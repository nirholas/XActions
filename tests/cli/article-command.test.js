// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * `xactions article` against a stubbed fetch: an auth failure (no session, a
 * refused read or a preview-only answer) prints the login hint and fails the
 * exit code, any other failure does not print it, and an empty body is a valid
 * article.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const home = fs.mkdtempSync(path.join(os.tmpdir(), 'xactions-article-cmd-'));
process.env.HOME = home;
process.env.XACTIONS_HOME = path.join(home, 'xh');

const TWEET_ID = '2091905664704745583';

function articleResponse(article = {}) {
  return {
    data: {
      tweetResult: {
        result: {
          __typename: 'Tweet',
          rest_id: TWEET_ID,
          article: { article_results: { result: { rest_id: '2091905657058533378', title: 'A title', ...article } } },
          core: { user_results: { result: { __typename: 'User', rest_id: '1', core: { screen_name: 'EXM7777', name: 'Machina' }, legacy: {} } } },
          legacy: { id_str: TWEET_ID, full_text: 'https://t.co/abc', created_at: 'Mon Aug 25 12:00:00 +0000 2026' },
        },
      },
    },
  };
}

function stubFetch(status, body = {}) {
  const fetch = vi.fn().mockResolvedValue({
    status,
    headers: { get: () => null },
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

const sessionDir = process.env.XACTIONS_HOME;

function saveSession() {
  fs.mkdirSync(sessionDir, { recursive: true });
  fs.writeFileSync(
    path.join(sessionDir, 'cookies.json'),
    JSON.stringify([{ name: 'auth_token', value: 'saved-token' }, { name: 'ct0', value: 'saved-ct0' }]),
  );
}

let program;
let errorLines;
let logLines;

beforeAll(async () => {
  ({ program } = await import('../../src/cli/index.js'));
});

beforeEach(() => {
  errorLines = [];
  logLines = [];
  vi.spyOn(console, 'error').mockImplementation((line) => errorLines.push(String(line)));
  vi.spyOn(console, 'log').mockImplementation((line) => logLines.push(String(line)));
  process.exitCode = undefined;
  saveSession();
});

afterEach(() => {
  fs.rmSync(sessionDir, { recursive: true, force: true });
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  process.exitCode = undefined;
});

afterAll(() => {
  fs.rmSync(home, { recursive: true, force: true });
});

async function runArticle(reference = TWEET_ID) {
  await program.parseAsync(['article', reference], { from: 'user' });
}

describe('xactions article', () => {
  it('prints the login hint and makes no request when no session is saved', async () => {
    fs.rmSync(path.join(sessionDir, 'cookies.json'));
    const fetch = stubFetch(200, articleResponse({ plain_text: 'body' }));

    await runArticle();

    expect(errorLines.join('\n')).toContain('xactions login');
    expect(process.exitCode).toBe(1);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('prints the login hint and exits 1 when X answers 403', async () => {
    stubFetch(403);

    await runArticle();

    expect(errorLines.join('\n')).toContain('xactions login');
    expect(process.exitCode).toBe(1);
  });

  it('prints the login hint and exits 1 when X returns only the preview', async () => {
    stubFetch(200, articleResponse({ preview_text: 'preview' }));

    await runArticle();

    expect(errorLines.join('\n')).toMatch(/only the preview/);
    expect(errorLines.join('\n')).toContain('xactions login');
    expect(process.exitCode).toBe(1);
  });

  it('does not print the login hint for a failure that is not about auth', async () => {
    const fetch = stubFetch(200, articleResponse({ plain_text: 'body' }));

    await runArticle('https://x.com/i/article/2091905657058533378');

    expect(errorLines.join('\n')).toMatch(/own id/);
    expect(errorLines.join('\n')).not.toContain('xactions login');
    expect(process.exitCode).toBe(1);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('prints an article with an empty body without failing', async () => {
    stubFetch(200, articleResponse({ plain_text: '' }));

    await runArticle();

    expect(errorLines).toEqual([]);
    expect(logLines.join('\n')).toContain('A title');
    expect(process.exitCode).toBeUndefined();
  });
});
