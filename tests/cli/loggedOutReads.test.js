// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Logged out, X refuses the media-tab and TweetDetail queries with 403 while
 * the timeline and single posts stay public. `download` falls back to those
 * instead of failing reads AGENTS.md lists as working without an account.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const home = mkdtempSync(join(tmpdir(), 'xactions-loggedout-'));
process.env.XACTIONS_HOME = home;
process.env.HOME = home;

vi.mock('../../src/scrapers/twitter/http/index.js', async () => {
  const { AuthError } = await import('../../src/scrapers/twitter/http/errors.js');
  const refused = async () => { throw new AuthError('Authentication failed (403)', { status: 403 }); };
  return {
    createHttpScraper: async () => ({
      client: { setCookies() {} },
      scrapeMedia: refused,
      scrapeTweetById: refused,
      scrapeProfile: async () => ({}),
      scrapeCommunityMedia: async () => [],
    }),
  };
});

vi.mock('../../src/client/index.js', () => ({
  Scraper: class {
    async loadCookies() { throw new Error('no jar'); }
    async *getTweets() {
      yield { id: '1', photos: [{ url: 'https://pbs.twimg.com/media/a.jpg', alt: 'a' }], videos: [] };
      yield { id: '2', photos: [], videos: [] };
      yield { id: '3', photos: [], videos: [{ url: 'https://video.twimg.com/b.mp4' }] };
    }
  },
}));

vi.mock('../../src/edge/postReader.js', () => ({
  getPost: async (id) => ({
    id,
    createdAt: '2026-11-19T17:00:42.000Z',
    author: { id: '11348282', username: 'NASA' },
    media: [{ type: 'video', url: 'https://video.twimg.com/c.mp4', width: 1280, height: 720, variants: [{ bitrate: 2176000 }] }],
  }),
}));

let createMediaScrapers;
beforeAll(async () => {
  ({ createMediaScrapers } = await import('../../src/cli/index.js'));
});

describe('download without a session', () => {
  it('reads a profile\'s media from its timeline when the media tab is refused', async () => {
    const scrapers = await createMediaScrapers();
    const media = await scrapers.scrapeMedia('NASA', { limit: 5 });
    expect(media).toEqual([
      { url: 'https://pbs.twimg.com/media/a.jpg', mediaType: 'photo', tweetId: '1', username: 'NASA', altText: 'a' },
      { url: 'https://video.twimg.com/b.mp4', mediaType: 'video', tweetId: '3', username: 'NASA', altText: null },
    ]);
  });

  it('reads a single post through the guest rails when TweetDetail is refused', async () => {
    const scrapers = await createMediaScrapers();
    const tweet = await scrapers.scrapeTweetById('42');
    expect(tweet.username).toBe('NASA');
    expect(tweet.media).toEqual([
      { tweetId: '42', mediaType: 'video', url: 'https://video.twimg.com/c.mp4', width: 1280, height: 720, bitrate: 2176000, altText: null },
    ]);
  });
});
