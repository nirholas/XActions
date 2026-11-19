// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Tests for scrapeArticle / parseArticleId in src/scrapers/twitter/http/tweets.js
 *
 * No network. The fixture follows the TweetResultByRestId article response
 * shape reported in #45 (data.tweetResult.result.article.article_results.result
 * with plain_text present only when withArticlePlainText is true). It has not
 * been re-checked against live x.com for this change.
 *
 * Originally written by @mayconfrr in #45, ported to the current client.
 *
 * @author nich (@nichxbt)
 */

import { describe, it, expect, vi } from 'vitest';
import { scrapeArticle, scrapeTweetById, parseArticleId } from '../../src/scrapers/twitter/http/tweets.js';
import { TwitterHttpClient } from '../../src/scrapers/twitter/http/client.js';
import { NotFoundError } from '../../src/scrapers/twitter/http/errors.js';

const TWEET_ID = '2091905664704745583';

function buildArticleResult(overrides = {}) {
  return {
    __typename: 'Tweet',
    rest_id: TWEET_ID,
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
    },
    core: {
      user_results: {
        result: {
          __typename: 'User',
          rest_id: '1770000000000000000',
          core: { screen_name: 'EXM7777', name: 'Machina' },
          legacy: {},
        },
      },
    },
    legacy: {
      id_str: TWEET_ID,
      full_text: 'https://t.co/abc',
      created_at: 'Mon Aug 25 12:00:00 +0000 2026',
      favorite_count: 508,
      retweet_count: 43,
      reply_count: 25,
    },
    views: { count: '131784' },
    ...overrides.tweet,
  };
}

/** A client whose graphql() returns `result` the way the real one does (envelope stripped). */
function createMockClient(result) {
  return {
    graphql: vi.fn(async () => ({ data: { tweetResult: result === undefined ? {} : { result } } })),
    isAuthenticated: vi.fn(() => true),
  };
}

/** A real TwitterHttpClient over a fetch that answers every call with `body`. */
function createFetchClient(body) {
  const fetch = vi.fn().mockResolvedValue({
    status: 200,
    headers: { get: () => null },
    json: () => Promise.resolve(body),
  });
  const client = new TwitterHttpClient({ cookies: 'auth_token=x; ct0=y', fetch, maxRetries: 0 });
  return { client, fetch };
}

function sentParams(fetch) {
  const url = new URL(fetch.mock.calls[0][0]);
  return {
    url,
    variables: JSON.parse(url.searchParams.get('variables')),
    features: JSON.parse(url.searchParams.get('features')),
    fieldToggles: url.searchParams.has('fieldToggles') ? JSON.parse(url.searchParams.get('fieldToggles')) : null,
  };
}

describe('parseArticleId', () => {
  it('passes bare numeric ids through', () => {
    expect(parseArticleId(TWEET_ID)).toBe(TWEET_ID);
  });

  it('parses the id from an x.com/i/article/<id> URL', () => {
    expect(parseArticleId(`x.com/i/article/${TWEET_ID}`)).toBe(TWEET_ID);
  });

  it('parses the id from a full https URL with www and query params', () => {
    expect(parseArticleId(`https://www.x.com/i/article/${TWEET_ID}?s=09`)).toBe(TWEET_ID);
  });

  it('accepts a /status/<id> URL', () => {
    expect(parseArticleId(`https://x.com/EXM7777/status/${TWEET_ID}`)).toBe(TWEET_ID);
  });

  it('throws when no id can be found', () => {
    expect(() => parseArticleId('not-a-url')).toThrow(/Could not find an article or tweet id/);
    expect(() => parseArticleId('')).toThrow(/Could not find/);
  });
});

describe('scrapeArticle', () => {
  it('returns the full article for a numeric id', async () => {
    const client = createMockClient(buildArticleResult());
    const article = await scrapeArticle(client, TWEET_ID);

    expect(article).toMatchObject({
      id: TWEET_ID,
      articleId: '2091905657058533378',
      url: `https://x.com/EXM7777/status/${TWEET_ID}`,
      title: 'How to make money with Grok Bot',
      text: 'A'.repeat(2500),
      previewText: 'I am going to show you how Grok Bot works...',
      summaryText: 'A summary',
      coverImageUrl: 'https://pbs.twimg.com/media/HQfxFu3bMAAmcLK.jpg',
      createdAt: '2026-08-25T12:00:00.000Z',
    });
    expect(article.author).toMatchObject({ username: 'EXM7777', name: 'Machina' });
    expect(article.metrics).toMatchObject({ likes: 508, retweets: 43, replies: 25, views: 131784 });
  });

  it('reads the legacy author shape too', async () => {
    const client = createMockClient(
      buildArticleResult({
        tweet: {
          core: { user_results: { result: { rest_id: '1', legacy: { screen_name: 'old', name: 'Old Shape' } } } },
        },
      }),
    );
    const article = await scrapeArticle(client, TWEET_ID);
    expect(article.author).toMatchObject({ username: 'old', name: 'Old Shape' });
  });

  it('accepts an x.com/i/article/<id> URL', async () => {
    const client = createMockClient(buildArticleResult());
    await scrapeArticle(client, `https://x.com/i/article/${TWEET_ID}`);
    expect(client.graphql.mock.calls[0][2].tweetId).toBe(TWEET_ID);
  });

  it('asks TweetResultByRestId for the article body', async () => {
    const client = createMockClient(buildArticleResult());
    await scrapeArticle(client, TWEET_ID);

    expect(client.graphql).toHaveBeenCalledTimes(1);
    const [, operationName, variables, options] = client.graphql.mock.calls[0];
    expect(operationName).toBe('TweetResultByRestId');
    expect(variables).toMatchObject({ tweetId: TWEET_ID, withCommunity: true, withVoice: true });
    expect(options.fieldToggles).toMatchObject({
      withArticlePlainText: true,
      withArticleRichContentState: true,
      withArticleSummaryText: true,
    });
    expect(options.features).toMatchObject({
      articles_preview_enabled: true,
      responsive_web_twitter_article_tweet_consumption_enabled: true,
      longform_notetweets_rich_text_read_enabled: true,
    });
  });

  it('unwraps TweetWithVisibilityResults', async () => {
    const client = createMockClient({ __typename: 'TweetWithVisibilityResults', tweet: buildArticleResult() });
    const article = await scrapeArticle(client, TWEET_ID);
    expect(article.title).toBe('How to make money with Grok Bot');
    expect(article.text).toBe('A'.repeat(2500));
  });

  it('returns text null with the preview when X sends no body', async () => {
    const client = createMockClient(buildArticleResult({ article: { plain_text: undefined } }));
    const article = await scrapeArticle(client, TWEET_ID);
    expect(article.text).toBeNull();
    expect(article.previewText).toBe('I am going to show you how Grok Bot works...');
  });

  it('throws NotFoundError when the tweet does not exist', async () => {
    const client = createMockClient(undefined);
    await expect(scrapeArticle(client, '9999999999999999999')).rejects.toThrow(NotFoundError);
  });

  it('throws NotFoundError for a tombstone', async () => {
    const client = createMockClient({ __typename: 'TweetTombstone', tombstone: { text: { text: 'gone' } } });
    await expect(scrapeArticle(client, TWEET_ID)).rejects.toThrow(/unavailable/);
  });

  it('throws NotFoundError for a regular (non-article) tweet', async () => {
    const client = createMockClient(buildArticleResult({ tweet: { article: undefined } }));
    const err = await scrapeArticle(client, '1234567890').catch((e) => e);
    expect(err).toBeInstanceOf(NotFoundError);
    expect(err.message).toMatch(/not an article/);
  });

  it('tolerates missing optional fields', async () => {
    const client = createMockClient(
      buildArticleResult({
        article: { title: null, plain_text: 'Body only', cover_media: undefined, summary_text: undefined },
        tweet: { legacy: undefined, views: undefined },
      }),
    );
    const article = await scrapeArticle(client, TWEET_ID);
    expect(article.text).toBe('Body only');
    expect(article.title).toBeNull();
    expect(article.summaryText).toBeNull();
    expect(article.coverImageUrl).toBeNull();
    expect(article.createdAt).toBeNull();
    expect(article.metrics.likes).toBe(0);
  });
});

describe('scrapeArticle over the real client', () => {
  it('sends withArticlePlainText:true in the GET query string', async () => {
    const { client, fetch } = createFetchClient({ data: { tweetResult: { result: buildArticleResult() } } });
    const article = await scrapeArticle(client, `x.com/i/article/${TWEET_ID}`);

    expect(article.text).toBe('A'.repeat(2500));
    expect(fetch).toHaveBeenCalledTimes(1);
    const { url, variables, features, fieldToggles } = sentParams(fetch);
    expect(url.pathname).toMatch(/\/TweetResultByRestId$/);
    expect(variables.tweetId).toBe(TWEET_ID);
    expect(features.articles_preview_enabled).toBe(true);
    expect(fieldToggles.withArticlePlainText).toBe(true);
  });

  it('leaves scrapeTweetById on the default request, with no fieldToggles', async () => {
    const { client, fetch } = createFetchClient({ data: { tweetResult: { result: buildArticleResult() } } });
    await scrapeTweetById(client, TWEET_ID);
    expect(sentParams(fetch).fieldToggles).toBeNull();
  });
});
