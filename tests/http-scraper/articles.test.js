// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Tests for scrapeArticle / parseArticleId in src/scrapers/twitter/http/tweets.js
 *
 * Uses vitest with a mocked client.request — no real network requests.
 * Fixture mirrors the actual TweetResultByRestId article response shape
 * (verified live 2026-08-25 against x.com/i/article/2091905664704745583).
 *
 * @author nich (@nichxbt)
 */

import { describe, it, expect, vi } from 'vitest';
import { scrapeArticle, parseArticleId } from '../../src/scrapers/twitter/http/tweets.js';
import { NotFoundError } from '../../src/scrapers/twitter/http/errors.js';

function buildArticleResult(overrides = {}) {
  return {
    __typename: 'Tweet',
    rest_id: '2091905664704745583',
    article: {
      article_results: {
        result: {
          rest_id: '2091905657058533378',
          title: 'How to make money with Grok Bot',
          plain_text: 'A'.repeat(2500),
          preview_text: 'I am going to show you how Grok Bot works...',
          summary_text: 'A summary',
          cover_media: {
            media_id: '2091905632719024128',
            media_info: {
              __typename: 'ApiImage',
              original_img_url: 'https://pbs.twimg.com/media/HQfxFu3bMAAmcLK.jpg',
              original_img_height: 1080,
              original_img_width: 1920,
            },
          },
          ...overrides.article,
        },
      },
      ...overrides.articleWrapper,
    },
    core: {
      user_results: {
        result: {
          __typename: 'User',
          rest_id: '1770000000000000000',
          legacy: {
            screen_name: 'EXM7777',
            name: 'Machina',
          },
        },
      },
    },
    legacy: {
      favorite_count: 508,
      retweet_count: 43,
      reply_count: 25,
    },
    views: { count: '131784' },
    ...overrides.tweet,
  };
}

function createMockClient(response, capture = {}) {
  return {
    request: vi.fn(async (url) => {
      capture.url = url;
      return response;
    }),
    isAuthenticated: vi.fn(() => true),
  };
}

describe('parseArticleId', () => {
  it('passes bare numeric ids through', () => {
    expect(parseArticleId('2091905664704745583')).toBe('2091905664704745583');
  });

  it('parses the id from an x.com/i/article/<id> URL', () => {
    expect(parseArticleId('x.com/i/article/2091905664704745583')).toBe('2091905664704745583');
  });

  it('parses the id from a full https URL with www and query params', () => {
    expect(
      parseArticleId('https://www.x.com/i/article/2091905664704745583?s=09'),
    ).toBe('2091905664704745583');
  });

  it('accepts a /status/<id> URL variant', () => {
    expect(parseArticleId('https://x.com/EXM7777/status/2091905664704745583')).toBe(
      '2091905664704745583',
    );
  });

  it('throws NotFoundError when no id can be extracted', () => {
    expect(() => parseArticleId('not-a-url')).toThrow(NotFoundError);
  });
});

describe('scrapeArticle', () => {
  it('returns the full article payload for a numeric id', async () => {
    const client = createMockClient({ data: { tweetResult: { result: buildArticleResult() } } });
    const article = await scrapeArticle(client, '2091905664704745583');

    expect(article.title).toBe('How to make money with Grok Bot');
    expect(article.text).toBe('A'.repeat(2500));
    expect(article.summaryText).toBe('A summary');
    expect(article.previewText).toBe('I am going to show you how Grok Bot works...');
    expect(article.coverImageUrl).toBe('https://pbs.twimg.com/media/HQfxFu3bMAAmcLK.jpg');
    expect(article.author).toEqual({ username: 'EXM7777', name: 'Machina' });
    expect(article.metrics).toEqual({ likes: 508, retweets: 43, replies: 25, views: 131784 });
    expect(article.url).toBe('https://x.com/i/article/2091905664704745583');
  });

  it('accepts an x.com/i/article/<id> URL', async () => {
    const client = createMockClient({ data: { tweetResult: { result: buildArticleResult() } } });
    const article = await scrapeArticle(client, 'x.com/i/article/2091905664704745583');
    expect(article.title).toBe('How to make money with Grok Bot');
  });

  it('sends fieldToggles with withArticlePlainText:true in the request URL', async () => {
    const capture = {};
    const client = createMockClient({ data: { tweetResult: { result: buildArticleResult() } }, }, capture);
    await scrapeArticle(client, '2091905664704745583');

    expect(client.request).toHaveBeenCalledTimes(1);
    const url = decodeURIComponent(capture.url);
    // The full body is only served when this toggle is set — the browser
    // default (false) yields only preview_text.
    expect(url).toContain('"withArticlePlainText":true');
    expect(url).toContain('TweetResultByRestId');
  });

  it('requests the article consumption feature flags', async () => {
    const capture = {};
    const client = createMockClient({ data: { tweetResult: { result: buildArticleResult() } }, }, capture);
    await scrapeArticle(client, '2091905664704745583');

    const url = decodeURIComponent(capture.url);
    expect(url).toContain('articles_preview_enabled":true');
    expect(url).toContain('responsive_web_twitter_article_tweet_consumption_enabled":true');
    expect(url).toContain('longform_notetweets_rich_text_read_enabled":true');
  });

  it('throws NotFoundError when the tweet does not exist', async () => {
    const client = createMockClient({ data: { tweetResult: {} } });
    await expect(scrapeArticle(client, '9999999999999999999')).rejects.toThrow(NotFoundError);
  });

  it('throws NotFoundError for a regular (non-article) tweet', async () => {
    // No `article` key at all — the shape of a regular tweet result.
    const client = createMockClient({
      data: {
        tweetResult: {
          result: buildArticleResult({ tweet: { article: undefined } }),
        },
      },
    });
    await expect(scrapeArticle(client, '1234567890')).rejects.toThrow(
      /not an article/,
    );
  });

  it('tolerates missing optional fields on a minimal article result', async () => {
    const client = createMockClient({
      data: {
        tweetResult: {
          result: buildArticleResult({
            article: { title: null, plain_text: 'Body only', cover_media: undefined },
            tweet: { legacy: undefined, views: undefined },
          }),
        },
      },
    });
    const article = await scrapeArticle(client, '2091905664704745583');
    expect(article.text).toBe('Body only');
    expect(article.title).toBeNull();
    expect(article.coverImageUrl).toBeNull();
    expect(article.metrics.likes).toBe(0);
    expect(article.metrics.views).toBeNull();
  });
});
