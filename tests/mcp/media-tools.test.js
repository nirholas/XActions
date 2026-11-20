// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
// @author nich (@nichxbt)
// mediaPath/altText coverage for x_post_thread, x_reply, x_quote_tweet and
// x_schedule_post. The contract under test: media goes through the
// uploadMedia → CreateTweet-family HTTP lane with mediaIds; text-only calls
// keep the Puppeteer browser lane; remote mode must reject media args loudly.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const {
  uploadMedia, httpPostTweet, httpPostThread, httpReplyToTweet, httpQuoteTweet,
  httpSchedulePost, loadSavedSession, createBrowser, createPage, gotoAndRender,
  openComposer, typeIntoComposer, clickPostButton, confirmPosted, setDialogSelects,
} = vi.hoisted(() => ({
  uploadMedia: vi.fn(),
  httpPostTweet: vi.fn(),
  httpPostThread: vi.fn(),
  httpReplyToTweet: vi.fn(),
  httpQuoteTweet: vi.fn(),
  httpSchedulePost: vi.fn(),
  loadSavedSession: vi.fn(),
  createBrowser: vi.fn(),
  createPage: vi.fn(),
  gotoAndRender: vi.fn(),
  openComposer: vi.fn(),
  typeIntoComposer: vi.fn(),
  clickPostButton: vi.fn(),
  confirmPosted: vi.fn(),
  setDialogSelects: vi.fn(),
}));

vi.mock('../../src/scrapers/twitter/http/client.js', () => ({
  TwitterHttpClient: class {},
}));
vi.mock('../../src/scrapers/twitter/http/media.js', () => ({
  uploadMedia,
}));
vi.mock('../../src/scrapers/twitter/http/actions.js', () => ({
  postTweet: httpPostTweet,
  postThread: httpPostThread,
  replyToTweet: httpReplyToTweet,
  quoteTweet: httpQuoteTweet,
  schedulePost: httpSchedulePost,
}));
vi.mock('../../src/utils/savedSession.js', () => ({
  loadSavedSession,
  sessionDir: () => '/tmp/xactions-test-session',
}));
vi.mock('../../src/utils/navigation.js', () => ({
  gotoAndRender,
}));
vi.mock('../../src/mcp/composer.js', () => ({
  openComposer,
  typeIntoComposer,
  clickPostButton,
  confirmPosted,
  setDialogSelects,
  scheduleSelectValues: vi.fn().mockReturnValue({}),
  pollDurationValues: vi.fn().mockReturnValue({}),
}));
vi.mock('../../src/scrapers/index.js', () => ({
  createBrowser,
  createPage,
  scrapeTweet: vi.fn(),
  scrapeTweets: vi.fn(),
  scrapeUserTweets: vi.fn(),
  scrapeProfile: vi.fn(),
  scrapeFollowers: vi.fn(),
  scrapeFollowing: vi.fn(),
  scrapeSearch: vi.fn(),
  scrapeConversation: vi.fn(),
  scrapeList: vi.fn(),
}));

import { toolMap, quoteTweetWithMedia } from '../../src/mcp/local-tools.js';
import { TOOLS, executeTool, initializeBackend } from '../../src/mcp/server.js';

const postedResult = (id) => ({
  rest_id: id,
  core: { user_results: { result: { core: { screen_name: 'tester' } } } },
});

const makePage = () => {
  const el = () => ({ click: vi.fn(), type: vi.fn(), evaluate: vi.fn() });
  const page = {
    goto: vi.fn().mockResolvedValue(undefined),
    waitForSelector: vi.fn().mockResolvedValue(el()),
    $: vi.fn().mockResolvedValue(el()),
    $$: vi.fn().mockResolvedValue([]),
    setCookie: vi.fn().mockResolvedValue(undefined),
    evaluate: vi.fn().mockResolvedValue('https://x.com/compose/tweet'),
  };
  return page;
};

beforeEach(() => {
  vi.clearAllMocks();
  loadSavedSession.mockResolvedValue({ authToken: 'tok', ct0: 'csrf', source: 'test' });
  uploadMedia.mockResolvedValue({ mediaId: 'm_1', mediaKey: null });
  httpPostThread.mockImplementation((client, tweets) =>
    Promise.resolve(tweets.map((t, i) => postedResult(String(100 + i)))));
  httpReplyToTweet.mockResolvedValue(postedResult('999'));
  httpQuoteTweet.mockResolvedValue(postedResult('888'));
  httpSchedulePost.mockResolvedValue({ scheduledTweetId: 'sched_1' });
  gotoAndRender.mockResolvedValue(undefined);
  openComposer.mockResolvedValue(true);
  typeIntoComposer.mockResolvedValue(true);
  clickPostButton.mockResolvedValue(true);
  confirmPosted.mockResolvedValue({ ok: true, via: 'test' });
  setDialogSelects.mockResolvedValue({ found: true, failed: [] });
  // The browser stays dead across tests so ensureBrowser() always rebuilds a
  // fresh page through our mocks.
  createBrowser.mockReturnValue({ isConnected: () => false });
  createPage.mockImplementation(() => Promise.resolve(makePage()));
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('mediaPath/altText schema coverage', () => {
  const schemaOf = (name) => TOOLS.find((t) => t.name === name)?.inputSchema;

  it('x_post_thread tweets accept {text, mediaPath, altText} items', () => {
    const schema = schemaOf('x_post_thread');
    expect(schema).toBeTruthy();
    const itemSchemas = schema.properties.tweets.items.anyOf ?? [schema.properties.tweets.items];
    const objectItem = itemSchemas.find((s) => s.type === 'object');
    expect(objectItem).toBeTruthy();
    expect(objectItem.properties).toMatchObject({
      text: { type: 'string' },
      mediaPath: expect.anything(),
      altText: { type: 'string' },
    });
    expect(schema.properties.altText).toBeTruthy();
  });

  it('x_reply accepts mediaPath and altText', () => {
    const schema = schemaOf('x_reply');
    expect(schema.properties).toMatchObject({
      url: { type: 'string' },
      tweetUrl: { type: 'string' },
      tweetId: { type: 'string' },
      text: { type: 'string' },
      mediaPath: expect.anything(),
      altText: { type: 'string' },
    });
    expect(schema.required).toEqual(['text']);
  });

  it('x_quote_tweet accepts mediaPath and altText', () => {
    const schema = schemaOf('x_quote_tweet');
    expect(schema.properties).toMatchObject({
      tweetUrl: { type: 'string' },
      tweetId: { type: 'string' },
      text: { type: 'string' },
      mediaPath: expect.anything(),
      altText: { type: 'string' },
    });
  });

  it('x_schedule_post accepts mediaPath and altText', () => {
    const schema = schemaOf('x_schedule_post');
    expect(schema.properties).toMatchObject({
      text: { type: 'string' },
      scheduledAt: { type: 'string' },
      mediaPath: expect.anything(),
      altText: { type: 'string' },
    });
  });
});

describe('x_post_thread media lane', () => {
  it('uploads media and posts a chained thread via HTTP', async () => {
    const res = await toolMap.x_post_thread({
      tweets: [{ text: 'one', mediaPath: '/tmp/a.png', altText: 'pic' }, 'two'],
    });
    expect(res.success).toBe(true);
    expect(res.tweetIds).toEqual(['100', '101']);
    expect(res.url).toContain('status/100');
    expect(uploadMedia).toHaveBeenCalledTimes(1);
    expect(uploadMedia).toHaveBeenCalledWith(expect.anything(), '/tmp/a.png', { altText: 'pic' });
    expect(httpPostThread).toHaveBeenCalledWith(
      expect.anything(),
      [{ text: 'one', mediaIds: ['m_1'] }, { text: 'two', mediaIds: [] }],
      expect.objectContaining({ premium: false }),
    );
    expect(createBrowser).not.toHaveBeenCalled();
  });

  it('supports mediaPath arrays and falls back to the top-level altText', async () => {
    uploadMedia
      .mockResolvedValueOnce({ mediaId: 'm_a' })
      .mockResolvedValueOnce({ mediaId: 'm_b' });
    const res = await toolMap.x_post_thread({
      tweets: [
        { text: 'one', mediaPath: ['/tmp/a.png', '/tmp/b.png'] },
        { text: 'two', mediaPath: '/tmp/c.png' },
      ],
      altText: 'shared',
    });
    expect(res.success).toBe(true);
    expect(uploadMedia).toHaveBeenCalledTimes(3);
    expect(httpPostThread).toHaveBeenCalledWith(
      expect.anything(),
      [
        { text: 'one', mediaIds: ['m_a', 'm_b'] },
        { text: 'two', mediaIds: ['m_1'] },
      ],
      expect.anything(),
    );
    expect(uploadMedia.mock.calls.at(-1)[2]).toEqual({ altText: 'shared' });
  });

  it('text-only threads keep the browser lane', { timeout: 20000 }, async () => {
    const res = await toolMap.x_post_thread({ tweets: ['one', 'two'] });
    expect(res.success).toBe(true);
    expect(res.message).toBe('Thread posted (2 tweets)');
    expect(openComposer).toHaveBeenCalledTimes(1);
    expect(typeIntoComposer).toHaveBeenCalledTimes(2);
    expect(typeIntoComposer).toHaveBeenNthCalledWith(1, expect.anything(), 0, 'one', { delay: 40 });
    expect(typeIntoComposer).toHaveBeenNthCalledWith(2, expect.anything(), 1, 'two', { delay: 40 });
    expect(uploadMedia).not.toHaveBeenCalled();
    expect(httpPostThread).not.toHaveBeenCalled();
  });

  it('rejects an empty mediaPath before touching uploads', async () => {
    const res = await toolMap.x_post_thread({
      tweets: [{ text: 'x', mediaPath: '' }, 'y'],
    });
    expect(res.success).toBe(false);
    expect(res.message).toMatch(/mediaPath/);
    expect(uploadMedia).not.toHaveBeenCalled();
  });

  it('fails when no saved session is available', async () => {
    loadSavedSession.mockResolvedValueOnce(null);
    const res = await toolMap.x_post_thread({
      tweets: [{ text: 'x', mediaPath: '/tmp/a.png' }, 'y'],
    });
    expect(res.success).toBe(false);
    expect(res.message).toMatch(/login|XACTIONS_SESSION_COOKIE/);
    expect(uploadMedia).not.toHaveBeenCalled();
  });

  it('reports posted ids when the thread fails mid-chain', async () => {
    const err = new Error('boom');
    err.partialResults = [postedResult('a1'), postedResult('a2')];
    err.failedIndex = 2;
    httpPostThread.mockRejectedValueOnce(err);
    const res = await toolMap.x_post_thread({
      tweets: [{ text: 'one', mediaPath: '/tmp/a.png' }, 'two', 'three'],
    });
    expect(res.success).toBe(false);
    expect(res.tweetIds).toEqual(['a1', 'a2']);
    expect(res.postedCount).toBe(2);
    expect(res.totalCount).toBe(3);
    expect(res.stoppedAt).toBe(2);
    expect(res.message).toMatch(/post 3 failed/);
  });

  it('reports a missing id as a failure with the posted ids', async () => {
    const err = new Error('post 2 did not return an id — thread stopped to avoid orphan root posts');
    err.partialResults = [postedResult('a1')];
    err.failedIndex = 1;
    err.missingId = true;
    httpPostThread.mockRejectedValueOnce(err);
    const res = await toolMap.x_post_thread({
      tweets: [{ text: 'one', mediaPath: '/tmp/a.png' }, 'two'],
    });
    expect(res.success).toBe(false);
    expect(res.stoppedAt).toBe(1);
    expect(res.message).toMatch(/did not return an id/);
  });
});

describe('x_reply media lane', () => {
  it('replies via HTTP with mediaIds', async () => {
    const res = await toolMap.x_reply({ url: 'https://x.com/a/status/123', text: 'nice', mediaPath: '/tmp/r.png' });
    expect(res.success).toBe(true);
    expect(res.inReplyTo).toBe('123');
    expect(httpReplyToTweet).toHaveBeenCalledWith(expect.anything(), '123', 'nice', {
      mediaIds: ['m_1'],
      premium: false,
    });
    expect(createBrowser).not.toHaveBeenCalled();
  });

  it('accepts a bare tweetId', async () => {
    const res = await toolMap.x_reply({ tweetId: '456', text: 'hi', mediaPath: '/tmp/r.png' });
    expect(res.success).toBe(true);
    expect(res.inReplyTo).toBe('456');
  });

  it('a non-status url falls back to tweetUrl for the id', async () => {
    const res = await toolMap.x_reply({ url: 'https://x.com/home', tweetUrl: 'https://x.com/a/status/321', text: 'hi', mediaPath: '/tmp/r.png' });
    expect(res.success).toBe(true);
    expect(res.inReplyTo).toBe('321');
  });

  it('fails when the target cannot be resolved', async () => {
    const res = await toolMap.x_reply({ url: 'https://x.com/home', text: 'hi', mediaPath: '/tmp/r.png' });
    expect(res.success).toBe(false);
    expect(res.message).toMatch(/tweet to reply to|tweetId/);
    expect(uploadMedia).not.toHaveBeenCalled();
  });

  it('text-only replies keep the browser lane on the canonical status URL', { timeout: 20000 }, async () => {
    const res = await toolMap.x_reply({ tweetId: '777', text: 'hello' });
    expect(res.success).toBe(true);
    expect(res.message).toBe('Reply posted');
    expect(gotoAndRender).toHaveBeenCalledWith(expect.anything(), 'https://x.com/i/status/777', expect.anything());
    expect(httpReplyToTweet).not.toHaveBeenCalled();
  });

  it('a non-status url cannot shadow a usable tweetId in the browser lane', async () => {
    const res = await toolMap.x_reply({ url: 'https://x.com/home', text: 'hello' });
    expect(res.success).toBe(false);
    expect(res.message).toMatch(/tweetId|tweet to reply to/);
    expect(createBrowser).not.toHaveBeenCalled();
  });
});

describe('x_quote_tweet media lane', () => {
  it('quotes via HTTP with mediaIds', async () => {
    const res = await quoteTweetWithMedia({ tweetId: '55', text: 'q', mediaPath: '/tmp/q.png' });
    expect(res.success).toBe(true);
    expect(res.quoteOf).toBe('55');
    expect(httpQuoteTweet).toHaveBeenCalledWith(expect.anything(), '55', 'q', {
      mediaIds: ['m_1'],
      premium: false,
    });
    expect(createBrowser).not.toHaveBeenCalled();
  });

  it('executeTool dispatches mediaPath to the HTTP lane', async () => {
    await initializeBackend();
    const res = await executeTool('x_quote_tweet', { tweetId: '55', text: 'q', mediaPath: '/tmp/q.png' });
    expect(res.success).toBe(true);
    expect(httpQuoteTweet).toHaveBeenCalledWith(expect.anything(), '55', 'q', {
      mediaIds: ['m_1'],
      premium: false,
    });
  });

  it('toolMap.x_quote_tweet with mediaPath delegates to the HTTP lane', async () => {
    const res = await toolMap.x_quote_tweet({ tweetId: '55', text: 'q', mediaPath: '/tmp/q.png' });
    expect(res.success).toBe(true);
    expect(res.quoteOf).toBe('55');
    expect(httpQuoteTweet).toHaveBeenCalledWith(expect.anything(), '55', 'q', {
      mediaIds: ['m_1'],
      premium: false,
    });
    expect(createBrowser).not.toHaveBeenCalled();
  });

  it('toolMap.x_quote_tweet text-only uses the browser lane on the canonical status URL', { timeout: 20000 }, async () => {
    const res = await toolMap.x_quote_tweet({ tweetId: '55', text: 'q' });
    expect(res.success).toBe(true);
    expect(res.quoteOf).toBe('55');
    expect(gotoAndRender).toHaveBeenCalledWith(expect.anything(), 'https://x.com/i/status/55', expect.anything());
    expect(httpQuoteTweet).not.toHaveBeenCalled();
  });

  it('toolMap.x_quote_tweet without a target fails before opening the browser', async () => {
    const res = await toolMap.x_quote_tweet({ text: 'q' });
    expect(res.success).toBe(false);
    expect(res.message).toMatch(/tweet to quote is required/);
    expect(createBrowser).not.toHaveBeenCalled();
  });

  it('the local A2A bridge dispatches a quote with media', async () => {
    const { createBridge } = await import('../../src/a2a/bridge.js');
    const res = await createBridge().getToolResult('x_quote_tweet', {
      tweetId: '55', text: 'q', mediaPath: '/tmp/q.png',
    });
    expect(res).toMatchObject({ success: true, quoteOf: '55' });
    expect(httpQuoteTweet).toHaveBeenCalledWith(expect.anything(), '55', 'q', {
      mediaIds: ['m_1'], premium: false,
    });
  });
});

describe('x_schedule_post media lane', () => {
  it('schedules via HTTP with mediaIds', async () => {
    const res = await toolMap.x_schedule_post({
      text: 'later',
      scheduledAt: '2030-01-01T00:00:00Z',
      mediaPath: '/tmp/s.png',
    });
    expect(res.success).toBe(true);
    expect(res.scheduledTweetId).toBe('sched_1');
    expect(httpSchedulePost).toHaveBeenCalledWith(
      expect.anything(),
      'later',
      expect.any(Date),
      { mediaIds: ['m_1'], premium: false }
    );
    expect(createBrowser).not.toHaveBeenCalled();
  });

  it('scheduledTime alias resolves to the same Date as scheduledAt', async () => {
    const res = await toolMap.x_schedule_post({
      text: 'later',
      scheduledTime: '2030-01-01T00:00:00Z',
      mediaPath: '/tmp/s.png',
    });
    expect(res.success).toBe(true);
    expect(res.scheduledTweetId).toBe('sched_1');
    expect(httpSchedulePost).toHaveBeenCalledWith(
      expect.anything(),
      'later',
      expect.any(Date),
      { mediaIds: ['m_1'], premium: false }
    );
  });

  it('invalid scheduledAt fails before upload', async () => {
    const res = await toolMap.x_schedule_post({
      text: 'later',
      scheduledAt: 'not-a-date',
      mediaPath: '/tmp/s.png',
    });
    expect(res.success).toBe(false);
    expect(res.message).toMatch(/scheduledAt/);
    expect(uploadMedia).not.toHaveBeenCalled();
  });

  it('text-only scheduling keeps the browser lane and fills the date/time', async () => {
    const res = await toolMap.x_schedule_post({
      text: 'later',
      scheduledAt: '2030-01-01T00:00:00Z',
    });
    expect(res.success).toBe(true);
    expect(res.message).toContain('Tweet scheduled');
    expect(openComposer).toHaveBeenCalledTimes(1);
    expect(setDialogSelects).toHaveBeenCalled();
    expect(httpSchedulePost).not.toHaveBeenCalled();
  });
});

describe('remote mode media guard', () => {
  async function remoteExecuteTool() {
    vi.resetModules();
    vi.stubEnv('XACTIONS_MODE', 'remote');
    const mod = await import('../../src/mcp/server.js');
    return mod.executeTool;
  }

  it.each([
    ['x_post_thread', { tweets: [{ text: 'a', mediaPath: '/tmp/a.png' }] }],
    ['x_post_thread', { tweets: [{ text: 'a' }] }],
    ['x_reply', { tweetId: '1', text: 'b', mediaPath: '/tmp/b.png' }],
    ['x_quote_tweet', { tweetId: '1', text: 'c', mediaPath: '/tmp/c.png' }],
    ['x_schedule_post', { text: 'd', scheduledAt: '2030-01-01', mediaPath: '/tmp/d.png' }],
    ['x_post_tweet', { text: 'e', mediaPath: '/tmp/e.png' }],
  ])('%s with media args throws in remote mode', async (name, args) => {
    const exec = await remoteExecuteTool();
    await expect(exec(name, args)).rejects.toThrow(/remote mode/);
  });
});
