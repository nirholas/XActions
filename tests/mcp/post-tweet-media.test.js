// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * x_post_tweet mediaPath: with mediaPath set the tool posts through the HTTP
 * lane (uploadMedia → CreateTweet mediaIds), the same flow
 * api/services/processors/posting.processors.js uses. Text-only posts still
 * go through the Puppeteer composer.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const uploadMedia = vi.fn();
const httpPostTweet = vi.fn();
const loadSavedSession = vi.fn();

vi.mock('../../src/scrapers/twitter/http/client.js', () => ({
  TwitterHttpClient: class {
    constructor(options) {
      this.options = options;
    }
  },
}));
vi.mock('../../src/scrapers/twitter/http/media.js', () => ({ uploadMedia }));
vi.mock('../../src/scrapers/twitter/http/actions.js', () => ({ postTweet: httpPostTweet }));
vi.mock('../../src/utils/savedSession.js', () => ({
  loadSavedSession,
  sessionDir: () => '/tmp/xactions-test',
}));

const { toolMap } = await import('../../src/mcp/local-tools.js');
const { TOOLS } = await import('../../src/mcp/server.js');

const postedResult = (id = '1888123456789012345') => ({
  rest_id: id,
  core: { user_results: { result: { core: { screen_name: 'tester' } } } },
});

beforeEach(() => {
  vi.clearAllMocks();
  loadSavedSession.mockResolvedValue({ authToken: 'tok', ct0: 'csrf', source: 'test' });
  uploadMedia.mockResolvedValue({ mediaId: 'm_1', mediaKey: null });
  httpPostTweet.mockResolvedValue(postedResult());
});

describe('x_post_tweet schema', () => {
  it('declares mediaPath and altText', () => {
    const schema = TOOLS.find((t) => t.name === 'x_post_tweet').inputSchema;
    expect(schema.properties.mediaPath).toBeDefined();
    expect(schema.properties.altText).toBeDefined();
    expect(schema.required).toEqual(['text']);
  });
});

describe('x_post_tweet with mediaPath', () => {
  it('uploads one file and attaches its mediaId', async () => {
    const res = await toolMap.x_post_tweet({ text: 'hello', mediaPath: '/tmp/pic.png' });
    expect(uploadMedia).toHaveBeenCalledTimes(1);
    expect(uploadMedia.mock.calls[0][1]).toBe('/tmp/pic.png');
    expect(httpPostTweet).toHaveBeenCalledTimes(1);
    expect(httpPostTweet.mock.calls[0][2].mediaIds).toEqual(['m_1']);
    expect(res).toMatchObject({
      success: true,
      tweetId: '1888123456789012345',
      url: 'https://x.com/tester/status/1888123456789012345',
    });
  });

  it('accepts an array of paths and passes altText to each upload', async () => {
    uploadMedia
      .mockResolvedValueOnce({ mediaId: 'm_1', mediaKey: null })
      .mockResolvedValueOnce({ mediaId: 'm_2', mediaKey: null });
    const res = await toolMap.x_post_tweet({
      text: 'two pics',
      mediaPath: ['/a.jpg', '/b.jpg'],
      altText: 'desc',
    });
    expect(uploadMedia).toHaveBeenCalledTimes(2);
    expect(uploadMedia.mock.calls[0][2]).toEqual({ altText: 'desc' });
    expect(httpPostTweet.mock.calls[0][2].mediaIds).toEqual(['m_1', 'm_2']);
    expect(res.success).toBe(true);
  });

  it('builds the client cookies from the saved session', async () => {
    await toolMap.x_post_tweet({ text: 'hi', mediaPath: '/tmp/pic.png' });
    const client = uploadMedia.mock.calls[0][0];
    expect(client.options.cookies).toBe('auth_token=tok; ct0=csrf');
    expect(client.options.rateLimitStrategy).toBe('wait');
  });

  it('rejects more than 4 media files before uploading', async () => {
    const res = await toolMap.x_post_tweet({
      text: 'x',
      mediaPath: ['/1.jpg', '/2.jpg', '/3.jpg', '/4.jpg', '/5.jpg'],
    });
    expect(res.success).toBe(false);
    expect(uploadMedia).not.toHaveBeenCalled();
    expect(httpPostTweet).not.toHaveBeenCalled();
  });

  it('rejects an empty mediaPath string before uploading', async () => {
    const res = await toolMap.x_post_tweet({ text: 'x', mediaPath: '' });
    expect(res.success).toBe(false);
    expect(uploadMedia).not.toHaveBeenCalled();
  });

  it('rejects missing text before uploading', async () => {
    const res = await toolMap.x_post_tweet({ mediaPath: '/tmp/pic.png' });
    expect(res.success).toBe(false);
    expect(uploadMedia).not.toHaveBeenCalled();
    expect(httpPostTweet).not.toHaveBeenCalled();
  });

  it('fails cleanly when no session is saved', async () => {
    loadSavedSession.mockResolvedValue(null);
    const res = await toolMap.x_post_tweet({ text: 'x', mediaPath: '/tmp/pic.png' });
    expect(res.success).toBe(false);
    expect(res.message).toMatch(/login|session/i);
    expect(uploadMedia).not.toHaveBeenCalled();
  });
});
