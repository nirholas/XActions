// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * `xactions article` against a stubbed fetch and no saved session: a refused
 * or preview-only read prints the login hint and fails the exit code, while an
 * empty body is a valid article.
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
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    status,
    headers: { get: () => null },
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  }));
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
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  process.exitCode = undefined;
});

afterAll(() => {
  fs.rmSync(home, { recursive: true, force: true });
});

async function runArticle() {
  await program.parseAsync(['article', TWEET_ID], { from: 'user' });
}

describe('xactions article', () => {
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

  it('prints an article with an empty body without failing', async () => {
    stubFetch(200, articleResponse({ plain_text: '' }));

    await runArticle();

    expect(errorLines).toEqual([]);
    expect(logLines.join('\n')).toContain('A title');
    expect(process.exitCode).toBeUndefined();
  });
});
