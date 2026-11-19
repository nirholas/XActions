// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * The brief is only useful if every number in it is one the account actually
 * posted. These tests pin the figure extractor against the false positives
 * that would make a reader stop trusting it (dates, times, contract addresses,
 * "in 2 hours"), and pin the brief's selection and cross-account logic to
 * deterministic fixtures rather than live X data.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license Apache-2.0
 */

import { describe, it, expect } from 'vitest';

import {
  buildAccountBrief,
  buildEcosystemBrief,
  extractFigures,
  matchesTopic,
  parseAccountList,
  parseTopics,
  renderBriefMarkdown,
  sampleOrder,
  toPlainTweet,
} from '../../src/analysis/accountBrief.js';

const NOW = new Date('2026-11-19T12:00:00.000Z');
const DAY = 86_400_000;

/**
 * @param {object} overrides
 * @returns {object}
 */
function profile(overrides = {}) {
  return {
    id: '1',
    username: 'payco',
    name: 'Pay Co',
    bio: 'Payments for agents',
    website: 'https://pay.example',
    followersCount: 20_000,
    followingCount: 400,
    tweetCount: 2000,
    joined: new Date('2024-11-19T12:00:00.000Z'),
    ...overrides,
  };
}

let nextId = 1000;

/**
 * @param {number} daysAgo
 * @param {object} overrides
 * @returns {object}
 */
function tweet(daysAgo, overrides = {}) {
  nextId += 1;
  return {
    id: String(nextId),
    text: 'shipping',
    username: 'payco',
    timeParsed: new Date(NOW.getTime() - daysAgo * DAY),
    likes: 50,
    retweets: 5,
    replies: 5,
    views: 2000,
    hashtags: [],
    mentions: [],
    urls: [],
    photos: [],
    videos: [],
    isRetweet: false,
    isReply: false,
    isQuote: false,
    ...overrides,
  };
}

/** @param {string} text */
const values = (text) => extractFigures(text).map((f) => f.value);

describe('extractFigures', () => {
  it('finds money, percentages, multiples and scaled counts', () => {
    expect(values('Volume up 340% to $2.4M this week, 10x since launch')).toEqual(['340%', '$2.4M', '10x']);
    expect(values('x402 just crossed 1.2M transactions')).toEqual(['1.2M transactions']);
    expect(values('Settled 50k USDC in payments')).toEqual(['50k USDC']);
  });

  it('keeps the metric noun with a counted figure', () => {
    expect(values('Over 12,000 developers and 300+ projects building')).toEqual(['12,000 developers', '300+ projects']);
  });

  it('ignores dates, times, versions, hex and countdowns', () => {
    expect(values('AMA at 10:00 UTC on Nov 12, 2026. Join us in 2 hours!')).toEqual([]);
    expect(values('Contract 0x1a2b3c deployed. v2.1 shipped 5m ago')).toEqual([]);
    expect(values('Episode 42 is live')).toEqual([]);
  });

  it('treats a small count as a detail rather than a stat', () => {
    expect(values('3 integrations live')).toEqual([]);
    expect(values('40 integrations live')).toEqual(['40 integrations']);
  });

  it('reads 30m as minutes unless it has a decimal or three digits', () => {
    expect(values('back in 30m')).toEqual([]);
    expect(values('2.5m users')).toEqual(['2.5m users']);
    expect(values('120m requests served')).toEqual(['120m requests']);
  });

  it('does not double count the number inside a money figure', () => {
    expect(extractFigures('$1.2M raised')).toHaveLength(1);
  });

  it('ignores numbers inside links', () => {
    expect(values('read more https://example.com/report/2026/1000000 today')).toEqual([]);
  });

  it('returns the sentence the figure sits in as context, without t.co links', () => {
    const [figure] = extractFigures('Big week. We passed 1M payments! https://t.co/abc More soon.');
    expect(figure.context).toBe('We passed 1M payments!');
    expect(figure.kind).toBe('count');
  });
});

describe('parseAccountList', () => {
  it('accepts lines, commas, @ signs, profile URLs and comments', () => {
    const text = '# x402 list\n@alpha, https://x.com/beta/status/1\ngamma  Delta_1 # partner\n';
    expect(parseAccountList(text)).toEqual(['alpha', 'beta', 'gamma', 'Delta_1']);
  });

  it('drops duplicates case-insensitively and keeps the first spelling', () => {
    expect(parseAccountList('Base\nbase\n@BASE')).toEqual(['Base']);
  });

  it('reports tokens that cannot be handles', () => {
    const rejected = [];
    expect(parseAccountList('ok_handle\nthis_is_far_too_long_for_x\nbad-handle', rejected)).toEqual(['ok_handle']);
    expect(rejected).toEqual(['this_is_far_too_long_for_x', 'bad-handle']);
  });
});

describe('topics', () => {
  it('normalises keywords', () => {
    expect(parseTopics('#x402, Agent Payments ,x402')).toEqual(['x402', 'agent payments']);
    expect(parseTopics(undefined)).toEqual([]);
  });

  it('matches on text, hashtags, mentions and links', () => {
    const topics = ['x402'];
    expect(matchesTopic(tweet(1, { text: 'x402 is live' }), topics)).toBe(true);
    expect(matchesTopic(tweet(1, { mentions: ['x402'] }), topics)).toBe(true);
    expect(matchesTopic(tweet(1, { urls: ['https://x402.org/docs'] }), topics)).toBe(true);
    expect(matchesTopic(tweet(1, { text: 'unrelated' }), topics)).toBe(false);
    expect(matchesTopic(tweet(1, { text: 'x402' }), [])).toBe(false);
  });
});

describe('sampleOrder', () => {
  it('recognises a newest-first timeline, allowing a pinned first post', () => {
    const tweets = [tweet(200), tweet(1), tweet(2), tweet(3), tweet(4), tweet(5)];
    expect(sampleOrder(tweets)).toBe('latest');
  });

  it('recognises the popular-posts mix X serves logged out', () => {
    const tweets = [tweet(1), tweet(400), tweet(30), tweet(900), tweet(5), tweet(700), tweet(60)];
    expect(sampleOrder(tweets)).toBe('mixed');
  });

  it('declines to judge a tiny sample', () => {
    expect(sampleOrder([tweet(1), tweet(2)])).toBe('unknown');
  });
});

describe('toPlainTweet', () => {
  it('keeps who was reposted or quoted from a model instance', () => {
    const plain = toPlainTweet({
      ...tweet(1),
      isRetweet: true,
      retweetedStatus: { username: 'source' },
      quotedStatus: { username: 'quoted' },
    });
    expect(plain.retweetedUsername).toBe('source');
    expect(plain.quotedUsername).toBe('quoted');
    expect(typeof plain.timeParsed).toBe('string');
  });

  it('round-trips a plain tweet unchanged in substance', () => {
    const once = toPlainTweet(tweet(1, { mentions: ['a'] }));
    expect(toPlainTweet(once)).toEqual(once);
  });
});

describe('buildAccountBrief', () => {
  const tweets = [
    tweet(1, { text: 'x402 payments are live for every agent', likes: 300, mentions: ['partnerA'] }),
    tweet(2, { text: 'We crossed 1.2M transactions on x402 this month', likes: 900, urls: ['https://pay.example/stats'] }),
    tweet(3, { text: 'Revenue up 40% for merchants', likes: 100 }),
    tweet(4, { text: 'thanks!', isReply: true, mentions: ['someone'] }),
    tweet(5, { text: 'RT @partnerA: we hit $5M', isRetweet: true, retweetedUsername: 'partnerA' }),
    tweet(60, { text: 'Old news: 10,000 users', likes: 5000 }),
    tweet(6, { text: 'gm', mentions: ['partnerA', 'payco'] }),
  ];

  const brief = buildAccountBrief({ profile: profile(), tweets, topic: 'x402', days: 30, recent: 3, now: NOW });

  it('lists only figures the account posted itself, inside the window, on-topic first', () => {
    const listed = brief.figures.map((f) => f.figures.map((x) => x.value).join(','));
    expect(listed).toEqual(['1.2M transactions', '40%']);
    expect(brief.figures[0].onTopic).toBe(true);
    expect(brief.figures[0].url).toBe(`https://x.com/payco/status/${tweets[1].id}`);
  });

  it('does not credit the account with figures from a repost', () => {
    expect(brief.figures.some((f) => f.text.includes('$5M'))).toBe(false);
  });

  it('collects topic posts newest first', () => {
    expect(brief.topicPostCount).toBe(2);
    expect(brief.topicPosts.map((p) => p.id)).toEqual([tweets[0].id, tweets[1].id]);
  });

  it('lists recent originals, not replies or reposts', () => {
    expect(brief.recentPosts.map((p) => p.id)).toEqual([tweets[0].id, tweets[1].id, tweets[2].id]);
  });

  it('counts who the account tags and reposts, never itself', () => {
    expect(brief.mentions.find((m) => m.value === 'partnerA').count).toBe(2);
    expect(brief.mentions.some((m) => m.value.toLowerCase() === 'payco')).toBe(false);
    expect(brief.amplifies).toEqual([{ value: 'partnerA', count: 1 }]);
    expect(brief.links).toEqual([{ value: 'pay.example', count: 1 }]);
  });

  it('words account statistics from the report numbers', () => {
    expect(brief.highlights[0]).toMatch(/^20K followers/);
    expect(brief.highlights.some((h) => h.startsWith('Best post in the sample'))).toBe(true);
    expect(brief.stats.followers).toBe(20_000);
  });

  it('copes with an account that has posted nothing', () => {
    const empty = buildAccountBrief({ profile: profile(), tweets: [], topic: 'x402', now: NOW });
    expect(empty.figures).toEqual([]);
    expect(empty.recentPosts).toEqual([]);
    expect(empty.highlights).toEqual(['20K followers, about 27.4 new a day on average since joining']);
  });
});

describe('buildEcosystemBrief', () => {
  /**
   * @param {string} username
   * @param {Array<[string, number]>} mentions
   * @param {Array<[string, number]>} [amplifies]
   * @returns {object}
   */
  const stub = (username, mentions, amplifies = []) => ({
    username,
    mentions: mentions.map(([value, count]) => ({ value, count })),
    amplifies: amplifies.map(([value, count]) => ({ value, count })),
  });

  it('suggests accounts several listed accounts mention, ranked by reach', () => {
    const eco = buildEcosystemBrief(
      [
        stub('alpha', [['shared', 2], ['beta', 1], ['onlyAlpha', 9]]),
        stub('beta', [['Shared', 1], ['other', 1]], [['other', 2]]),
        stub('gamma', [['shared', 1], ['other', 1]]),
      ],
      { topic: 'x402', now: NOW }
    );

    expect(eco.tagLine).toBe('@alpha @beta @gamma');
    expect(eco.alsoTag.map((e) => e.username)).toEqual(['shared', 'other']);
    expect(eco.alsoTag[0]).toEqual({ username: 'shared', by: ['alpha', 'beta', 'gamma'], mentions: 4 });
    expect(eco.alsoTag[1].mentions).toBe(4);
    // Already on the list, so not a suggestion.
    expect(eco.alsoTag.some((e) => e.username === 'beta')).toBe(false);
  });

  it('with one account, suggests what that account mentions', () => {
    const eco = buildEcosystemBrief([stub('alpha', [['partner', 3]])]);
    expect(eco.alsoTag.map((e) => e.username)).toEqual(['partner']);
  });
});

describe('renderBriefMarkdown', () => {
  it('renders the tag line, figures with sources, and failures', () => {
    const brief = buildAccountBrief({
      profile: profile(),
      tweets: [
        tweet(1, { text: 'We crossed 1.2M transactions on x402', likes: 900 }),
        tweet(2, { text: 'gm' }),
        tweet(3, { text: 'gm again' }),
        tweet(4, { text: 'building' }),
        tweet(5, { text: 'more building' }),
      ],
      topic: 'x402',
      now: NOW,
    });
    const md = renderBriefMarkdown(
      buildEcosystemBrief([brief], { topic: 'x402', failures: [{ username: 'gone', error: 'not found' }], now: NOW })
    );

    expect(md).toContain('# Account brief: x402');
    expect(md).toContain('## Tag line\n\n@payco');
    expect(md).toContain('**1.2M transactions**: "We crossed 1.2M transactions on x402"');
    expect(md).toContain('on topic');
    expect(md).toContain('## Not included\n\n- @gone: not found');
    expect(md).toContain('last post 1 day ago');
  });

  it('warns when X served a logged-out mix instead of the latest posts', () => {
    const brief = buildAccountBrief({
      profile: profile(),
      tweets: [tweet(1), tweet(400), tweet(30), tweet(900), tweet(5), tweet(700)],
      now: NOW,
    });
    const md = renderBriefMarkdown(buildEcosystemBrief([brief], { now: NOW }));
    expect(brief.sampleOrder).toBe('mixed');
    expect(md).toContain('**Logged-out read.**');
    expect(md).not.toContain('last post');
  });
});
