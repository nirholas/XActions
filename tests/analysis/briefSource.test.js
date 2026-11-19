// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Brief fetching and caching: an empty timeline is a per-account failure that
 * is never cached, and a short page is only "exhausted" when the profile's own
 * post count says so.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { briefCacheDir, collectAccountSample, runBrief } from '../../src/analysis/briefSource.js';

let home;
let previous;

function scraperWith(tweets, profile = {}) {
  const calls = { profile: 0 };
  return {
    calls,
    async getProfile(username) {
      calls.profile += 1;
      return { id: '9', username, name: username, followersCount: 100, ...profile };
    },
    async *getTweets() {
      for (const t of tweets) yield t;
    },
  };
}

const tweet = (id) => ({ id, text: `post ${id}`, username: 'acct', timeParsed: new Date('2026-11-01T00:00:00Z'), likes: 1 });

beforeEach(() => {
  previous = process.env.XACTIONS_HOME;
  home = fs.mkdtempSync(path.join(os.tmpdir(), 'xactions-brief-'));
  process.env.XACTIONS_HOME = home;
});

afterEach(() => {
  if (previous === undefined) delete process.env.XACTIONS_HOME;
  else process.env.XACTIONS_HOME = previous;
  fs.rmSync(home, { recursive: true, force: true });
});

describe('empty timelines', () => {
  it('records a failure instead of a zero, and caches nothing', async () => {
    const scraper = scraperWith([], { tweetCount: 5000 });
    const { ecosystem } = await runBrief({ accounts: ['emptyacct'], getScraper: async () => scraper });

    expect(ecosystem.failures).toHaveLength(1);
    expect(ecosystem.failures[0].username).toBe('emptyacct');
    expect(ecosystem.failures[0].error).toMatch(/no posts/i);
    expect(ecosystem.accounts).toHaveLength(0);
    expect(fs.existsSync(path.join(briefCacheDir(), 'emptyacct.json'))).toBe(false);

    // A second run fetches again rather than answering from a cached zero.
    await runBrief({ accounts: ['emptyacct'], getScraper: async () => scraper });
    expect(scraper.calls.profile).toBe(2);
  });
});

describe('exhausted', () => {
  const read = (u) => JSON.parse(fs.readFileSync(path.join(briefCacheDir(), `${u}.json`), 'utf-8'));

  it('is not set for a short page when the profile says there are more posts', async () => {
    await collectAccountSample(async () => scraperWith([tweet('1'), tweet('2')], { tweetCount: 900 }), 'truncated', { limit: 50 });
    expect(read('truncated').exhausted).toBe(false);
  });

  it('is not set when the profile carries no post count', async () => {
    await collectAccountSample(async () => scraperWith([tweet('1')]), 'unknown', { limit: 50 });
    expect(read('unknown').exhausted).toBe(false);
  });

  it('is set when the account really has no more posts than were read', async () => {
    await collectAccountSample(async () => scraperWith([tweet('1'), tweet('2')], { tweetCount: 2 }), 'small', { limit: 50 });
    expect(read('small').exhausted).toBe(true);
  });
});
