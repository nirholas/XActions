// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Account briefs: what a set of accounts is doing, in a form you can write
 * posts from.
 *
 * The job this answers: "we are about to post about these accounts, so tell me
 * what each one is shipping, which numbers they are proud of, and who else they
 * keep tagging." A post that tags an account and quotes its own figures back
 * gets far more interaction than a generic shout-out, but assembling that by
 * hand means reading every timeline.
 *
 * Everything here is a pure function over a profile and a timeline sample, the
 * same inputs `buildAccountReport` takes, so it needs no login, is fully
 * testable, and the account statistics are the report's numbers, not a second
 * computation that could disagree with `xactions analyze`.
 *
 * Nothing is invented. A figure in the brief is a figure the account posted,
 * with the post it came from; a statistic is arithmetic over what X returned.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license Apache-2.0
 */

import { buildAccountReport, classifyPost, engagementOf, formatCount, round, topValues, tweetDate } from './accountReport.js';

const MS_PER_DAY = 86_400_000;

/** Longest sentence of context kept around a figure. */
const CONTEXT_CHARS = 180;

/**
 * Nouns that make a bare number a metric. "40 transactions" is a stat; "40" on
 * its own is not, because it could be a time, an episode or a list position.
 */
const METRIC_NOUNS = [
  'transactions', 'transaction', 'txs', 'txns', 'tx', 'payments', 'payment', 'users', 'user', 'developers', 'devs',
  'builders', 'agents', 'requests', 'calls', 'api calls', 'holders', 'wallets', 'addresses', 'accounts', 'downloads',
  'installs', 'stars', 'integrations', 'projects', 'apps', 'merchants', 'partners', 'customers', 'members', 'followers',
  'subscribers', 'signups', 'sign-ups', 'teams', 'companies', 'countries', 'chains', 'networks', 'endpoints',
  'services', 'servers', 'tools', 'nodes', 'validators', 'deployments', 'contracts', 'repos', 'commits', 'mints',
  'swaps', 'trades', 'orders', 'views', 'impressions', 'visits', 'visitors', 'sessions', 'messages', 'queries',
  'submissions', 'attendees', 'sellers', 'buyers', 'creators', 'listings', 'products', 'launches', 'stores',
];

/** Below this, "3 integrations" is a detail rather than a number worth quoting. */
const MIN_COUNTED = 10;

const SCALE = '(?:k|m|b|bn|t|thousand|million|billion|trillion)';
const NUMBER = '\\d{1,3}(?:,\\d{3})+(?:\\.\\d+)?|\\d+(?:\\.\\d+)?';

const MONEY = new RegExp(`(?:[$€£]\\s?(?:${NUMBER})(?:\\s?${SCALE}\\b)?\\+?)|(?:\\b(?:${NUMBER})(?:\\s?${SCALE})?\\s?(?:usdc|usdt|usd|dollars|eth|sol|btc)\\b)`, 'gi');
const PERCENT = new RegExp(`[+\\-]?(?:${NUMBER})\\s?%`, 'g');
const MULTIPLE = /\b\d+(?:\.\d+)?x\b(?![0-9a-f])/gi;
const SCALED = new RegExp(`\\b(?:${NUMBER})\\s?${SCALE}\\b\\+?`, 'gi');
const GROUPED = /\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\b\+?/g;
const COUNTED = new RegExp(`\\b(?:${NUMBER})(?:\\s?${SCALE})?\\+?\\s(?:${METRIC_NOUNS.map((n) => n.replace(/[-\s]/g, '[-\\s]')).join('|')})\\b`, 'gi');

/**
 * Split text into sentences, keeping each one's start offset so a figure can be
 * matched back to the sentence it sits in.
 * @param {string} text
 * @returns {Array<{start: number, end: number, text: string}>}
 */
function sentences(text) {
  const out = [];
  const pattern = /[^.!?\n]+(?:[.!?]+(?=\s|$)|\n|$)/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    if (!match[0].trim()) {
      if (pattern.lastIndex === match.index) pattern.lastIndex += 1;
      continue;
    }
    out.push({ start: match.index, end: match.index + match[0].length, text: match[0] });
  }
  return out;
}

/**
 * Strip t.co links and squash whitespace, so context reads as a sentence.
 * @param {string} text
 * @returns {string}
 */
function tidy(text) {
  return String(text || '')
    .replace(/https?:\/\/t\.co\/\S+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Pull the figures an author put in a post: money, percentages, multiples, and
 * counts that are clearly metrics (scaled like "1.2M", grouped like "12,000",
 * or followed by a metric noun like "300 developers").
 *
 * Deliberately conservative. A missed figure costs a line in the brief; a
 * year or a time of day reported as a "stat" costs the reader's trust in the
 * rest of it.
 *
 * @param {string} text
 * @returns {Array<{value: string, kind: 'money'|'percent'|'multiple'|'count', context: string}>}
 */
export function extractFigures(text) {
  const source = String(text || '').replace(/https?:\/\/\S+/g, (url) => ' '.repeat(url.length));
  if (!/\d/.test(source)) return [];

  const found = [];
  const taken = [];
  const overlaps = (start, end) => taken.some(([s, e]) => start < e && end > s);

  const collect = (pattern, kind, accept = () => true) => {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(source)) !== null) {
      const value = match[0].trim();
      const start = match.index + match[0].indexOf(value);
      const end = start + value.length;
      if (!value || overlaps(start, end) || !accept(value, start)) continue;
      taken.push([start, end]);
      found.push({ value, kind, start });
    }
  };

  // Most specific first, so "$1.2M" is one money figure, not money plus a count.
  collect(MONEY, 'money');
  collect(PERCENT, 'percent');
  collect(MULTIPLE, 'multiple');
  collect(COUNTED, 'count', (value) => new RegExp(`\\d\\s?${SCALE}\\b`, 'i').test(value) || parseFloat(value.replace(/,/g, '')) >= MIN_COUNTED);
  // "30m" on its own is as often thirty minutes as thirty million, so a
  // lowercase m only counts with a decimal or three digits ("2.5m", "120m").
  collect(SCALED, 'count', (value) => !/^\d{1,2}\s?m\+?$/.test(value));
  collect(GROUPED, 'count');

  if (!found.length) return [];

  const parts = sentences(source);
  return found
    .sort((a, b) => a.start - b.start)
    .map(({ value, kind, start }) => {
      const sentence = parts.find((p) => start >= p.start && start < p.end);
      let context = tidy(sentence ? sentence.text : source);
      if (context.length > CONTEXT_CHARS) context = `${context.slice(0, CONTEXT_CHARS - 1).trimEnd()}…`;
      return { value, kind, context };
    });
}

/**
 * Normalise topic keywords: "x402, Agent Payments" becomes ["x402", "agent payments"].
 * @param {string|string[]|undefined} topic
 * @returns {string[]}
 */
export function parseTopics(topic) {
  if (!topic) return [];
  const list = Array.isArray(topic) ? topic : String(topic).split(',');
  return [...new Set(list.map((t) => String(t).trim().replace(/^[#@$]/, '').toLowerCase()).filter(Boolean))];
}

/**
 * Whether a post is about any of the topics. Checks the text, the hashtags,
 * the accounts it tags and the links it carries, because "@x402" or a link to
 * x402.org is as much about x402 as the word itself.
 * @param {object} tweet
 * @param {string[]} topics - Output of parseTopics
 * @returns {boolean}
 */
export function matchesTopic(tweet, topics) {
  if (!topics.length) return false;
  const haystack = [
    tweet.text || tweet.fullText || '',
    ...(tweet.hashtags || []),
    ...(tweet.mentions || []),
    ...(tweet.urls || []),
  ]
    .join(' ')
    .toLowerCase();
  return topics.some((topic) => haystack.includes(topic));
}

/**
 * Parse an account list from free text: one per line, or comma or space
 * separated, with `#` comments, leading @ signs and profile URLs tolerated.
 * Duplicates are dropped case-insensitively, keeping the first spelling.
 *
 * @param {string} text
 * @param {string[]} [rejected] - Receives tokens that are not valid handles, so a caller can warn
 * @returns {string[]}
 */
export function parseAccountList(text, rejected = []) {
  const seen = new Set();
  const out = [];
  for (const rawLine of String(text || '').split(/\r?\n/)) {
    const line = rawLine.replace(/(^|\s)#.*$/, '');
    for (const token of line.split(/[\s,]+/)) {
      const handle = token
        .trim()
        .replace(/^https?:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\//i, '')
        .replace(/[/?#].*$/, '')
        .replace(/^@/, '');
      if (!handle) continue;
      if (!/^[A-Za-z0-9_]{1,15}$/.test(handle)) {
        rejected.push(token.trim());
        continue;
      }
      const key = handle.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(handle);
    }
  }
  return out;
}

/**
 * The plain fields of a tweet the brief and its cache need. Works on a Tweet
 * model instance or on an already-plain object, so a cached timeline and a
 * live one go through exactly the same code.
 * @param {object} tweet
 * @returns {object}
 */
export function toPlainTweet(tweet) {
  const date = tweetDate(tweet);
  return {
    id: String(tweet.id || ''),
    text: tweet.text || tweet.fullText || '',
    username: tweet.username || '',
    timeParsed: date ? date.toISOString() : null,
    likes: tweet.likes || 0,
    retweets: tweet.retweets || 0,
    replies: tweet.replies || 0,
    views: tweet.views || 0,
    hashtags: tweet.hashtags || [],
    mentions: tweet.mentions || [],
    urls: tweet.urls || [],
    photos: (tweet.photos || []).map((p) => ({ id: p.id, url: p.url })),
    videos: (tweet.videos || []).map((v) => ({ id: v.id, url: v.url })),
    isRetweet: Boolean(tweet.isRetweet),
    isReply: Boolean(tweet.isReply),
    isQuote: Boolean(tweet.isQuote),
    retweetedUsername: tweet.retweetedUsername || tweet.retweetedStatus?.username || null,
    quotedUsername: tweet.quotedUsername || tweet.quotedStatus?.username || null,
  };
}

/**
 * The plain fields of a profile, for the same reason as toPlainTweet.
 * @param {object} profile
 * @returns {object}
 */
export function toPlainProfile(profile) {
  const joined = profile.joined ? new Date(profile.joined) : null;
  return {
    id: String(profile.id || ''),
    username: profile.username || '',
    name: profile.name || '',
    bio: profile.bio || '',
    location: profile.location || '',
    website: profile.website || '',
    joined: joined && !Number.isNaN(joined.getTime()) ? joined.toISOString() : null,
    followersCount: profile.followersCount || 0,
    followingCount: profile.followingCount || 0,
    tweetCount: profile.tweetCount || 0,
    listedCount: profile.listedCount || 0,
    avatar: profile.avatar || '',
    verified: Boolean(profile.verified),
    isBlueVerified: Boolean(profile.isBlueVerified),
    protected: Boolean(profile.protected),
  };
}

/**
 * Whether a timeline sample came back newest first, as a logged-in timeline
 * does, or as the mix of popular posts from across an account's history that
 * X serves a logged-out client. "Recent posts" and "last posted" only mean
 * something for the first kind, so the brief says which it got.
 *
 * Reposts are skipped (they carry the original post's date) and so is the
 * first post (it may be pinned). A handful of out-of-order pairs is normal;
 * a sample where more than a fifth of neighbours are inverted is a mix.
 *
 * @param {object[]} tweets - In the order X returned them
 * @returns {'latest'|'mixed'|'unknown'}
 */
export function sampleOrder(tweets) {
  const times = tweets
    .filter((t) => !t.isRetweet)
    .slice(1)
    .map((t) => tweetDate(t)?.getTime())
    .filter((t) => typeof t === 'number');
  if (times.length < 4) return 'unknown';
  let inversions = 0;
  for (let i = 1; i < times.length; i += 1) {
    if (times[i] > times[i - 1]) inversions += 1;
  }
  return inversions / (times.length - 1) > 0.2 ? 'mixed' : 'latest';
}

/**
 * The hostname of a link, without "www.", or null for links back to X itself.
 * @param {string} url
 * @returns {string|null}
 */
function domainOf(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    if (['x.com', 'twitter.com', 't.co', 'mobile.twitter.com'].includes(host)) return null;
    return host;
  } catch {
    return null;
  }
}

/**
 * A post as it appears in the brief.
 * @param {object} tweet
 * @param {string} username
 * @returns {object}
 */
function postEntry(tweet, username) {
  return {
    id: tweet.id,
    url: `https://x.com/${username}/status/${tweet.id}`,
    postedAt: tweetDate(tweet)?.toISOString() || null,
    text: tidy(tweet.text || tweet.fullText),
    likes: tweet.likes || 0,
    retweets: tweet.retweets || 0,
    replies: tweet.replies || 0,
    views: tweet.views || 0,
    engagement: engagementOf(tweet),
    kind: classifyPost(tweet),
  };
}

/**
 * Account statistics worded as things you could say about the account. Only
 * figures that exist are included, and each is a number from the report.
 * @param {object} report - Output of buildAccountReport
 * @returns {string[]}
 */
function highlightsFrom(report) {
  const { audience, engagement, output, topPosts } = report;
  const lines = [];

  if (audience.followers) {
    const growth = audience.followersPerDay >= 1 ? `, about ${formatCount(audience.followersPerDay)} new a day on average since joining` : '';
    lines.push(`${formatCount(audience.followers)} followers${growth}`);
  }

  const best = topPosts.find((p) => p.kind === 'original') || topPosts[0];
  if (best && best.engagement > 0) {
    const multiple = engagement.medianPerOriginal > 0 ? round(best.engagement / engagement.medianPerOriginal, 1) : 0;
    const vsMedian = multiple >= 2 ? ` (${multiple}x their typical post)` : '';
    lines.push(`Best post in the sample: ${formatCount(best.engagement)} interactions${vsMedian}`);
  }

  if (engagement.medianPerOriginal > 0) {
    lines.push(`Typical original post gets ${formatCount(engagement.medianPerOriginal)} interactions (${engagement.rate}% of followers)`);
  }

  if (engagement.viewSampleSize >= 3 && engagement.medianViews > 0) {
    lines.push(`Typical post is seen ${formatCount(engagement.medianViews)} times`);
  }

  if (output.postsPerDay >= 1) {
    lines.push(`Posting about ${formatCount(output.postsPerDay)} times a day`);
  }

  return lines;
}

/**
 * Build the brief for one account.
 *
 * @param {object} input
 * @param {object} input.profile - A profile, as the client or toPlainProfile returns it
 * @param {object[]} input.tweets - A timeline sample, newest first or in any order
 * @param {string|string[]} [input.topic] - Keywords that make a post on topic
 * @param {number} [input.days=30] - Window for recent posts, topic posts and figures
 * @param {number} [input.recent=5] - Recent posts to list
 * @param {number} [input.maxFigures=8] - Figure posts to list
 * @param {Date} [input.now=new Date()]
 * @returns {object}
 */
export function buildAccountBrief({ profile, tweets = [], topic, days = 30, recent = 5, maxFigures = 8, now = new Date() }) {
  const plainProfile = toPlainProfile(profile);
  const posts = (Array.isArray(tweets) ? tweets : []).filter(Boolean).map(toPlainTweet);
  const order = sampleOrder(posts);
  const report = buildAccountReport({ profile: plainProfile, tweets: posts, now });
  const username = report.identity.username;
  const self = username.toLowerCase();
  const topics = parseTopics(topic);

  const cutoff = now.getTime() - days * MS_PER_DAY;
  const byNewest = (a, b) => (tweetDate(b)?.getTime() || 0) - (tweetDate(a)?.getTime() || 0);
  const inWindow = (t) => (tweetDate(t)?.getTime() || 0) >= cutoff;

  // Reposts carry someone else's words and numbers, and replies are mostly
  // conversation, so the account's own voice is its originals and quotes.
  const authored = posts.filter((t) => !t.isRetweet);
  const ownVoice = authored.filter((t) => !t.isReply).filter(inWindow).sort(byNewest);

  const figurePosts = [];
  for (const tweet of authored.filter(inWindow)) {
    const figures = extractFigures(tweet.text);
    if (!figures.length) continue;
    figurePosts.push({ ...postEntry(tweet, username), onTopic: matchesTopic(tweet, topics), figures });
  }
  figurePosts.sort((a, b) => Number(b.onTopic) - Number(a.onTopic) || b.engagement - a.engagement);

  const topicPosts = topics.length
    ? authored.filter(inWindow).filter((t) => matchesTopic(t, topics)).sort(byNewest).map((t) => postEntry(t, username))
    : [];

  const notSelf = (entry) => entry.value.toLowerCase() !== self;
  const mentions = topValues(authored.map((t) => t.mentions), 20).filter(notSelf).slice(0, 8);
  const amplifies = topValues(
    posts.map((t) => [t.isRetweet ? t.retweetedUsername : null, t.isQuote ? t.quotedUsername : null].filter(Boolean)),
    20
  )
    .filter(notSelf)
    .slice(0, 8);
  const links = topValues(authored.map((t) => (t.urls || []).map(domainOf).filter(Boolean)), 6);

  return {
    username,
    name: report.identity.name,
    url: report.identity.url,
    bio: report.identity.bio,
    website: report.identity.website,
    verified: report.identity.verified,
    followers: report.audience.followers,
    topics,
    windowDays: days,
    highlights: highlightsFrom(report),
    stats: {
      followers: report.audience.followers,
      following: report.audience.following,
      followersPerDay: report.audience.followersPerDay,
      engagementRate: report.engagement.rate,
      medianEngagement: report.engagement.medianPerOriginal,
      bestPost: report.engagement.bestPost,
      medianViews: report.engagement.medianViews,
      postsPerDay: report.output.postsPerDay,
      daysSinceLastPost: report.output.daysSinceLastPost,
    },
    figures: figurePosts.slice(0, maxFigures),
    topicPosts: topicPosts.slice(0, Math.max(recent, 5)),
    topicPostCount: topicPosts.length,
    recentPosts: ownVoice.slice(0, recent).map((t) => postEntry(t, username)),
    topPost: report.topPosts[0] || null,
    mentions,
    amplifies,
    links,
    sampleSize: report.meta.sampleSize,
    sampleSpanDays: report.meta.sampleSpanDays,
    sampleOrder: order,
    generatedAt: now.toISOString(),
  };
}

/**
 * Combine per-account briefs into one: the tag line, and the accounts that
 * several of them mention or repost but that are not on the list yet. Those
 * are the ecosystem's other players, and the best candidates for the next tag.
 *
 * @param {object[]} briefs - Output of buildAccountBrief
 * @param {object} [options]
 * @param {string|string[]} [options.topic]
 * @param {Array<{username: string, error: string}>} [options.failures=[]]
 * @param {Date} [options.now=new Date()]
 * @returns {object}
 */
export function buildEcosystemBrief(briefs, { topic, failures = [], now = new Date() } = {}) {
  const listed = new Set(briefs.map((b) => b.username.toLowerCase()));
  const shared = new Map();

  for (const brief of briefs) {
    const counts = new Map();
    for (const { value, count } of [...brief.mentions, ...brief.amplifies]) {
      const key = value.toLowerCase();
      if (listed.has(key)) continue;
      const existing = counts.get(key);
      if (existing) existing.count += count;
      else counts.set(key, { value, count });
    }
    for (const [key, { value, count }] of counts) {
      const entry = shared.get(key) || { username: value, by: [], mentions: 0 };
      entry.by.push(brief.username);
      entry.mentions += count;
      shared.set(key, entry);
    }
  }

  const minAccounts = briefs.length > 1 ? 2 : 1;
  const alsoTag = [...shared.values()]
    .filter((e) => e.by.length >= minAccounts)
    .sort((a, b) => b.by.length - a.by.length || b.mentions - a.mentions || a.username.localeCompare(b.username))
    .slice(0, 12);

  return {
    topics: parseTopics(topic),
    generatedAt: now.toISOString(),
    accounts: briefs,
    tagLine: briefs.map((b) => `@${b.username}`).join(' '),
    alsoTag,
    failures,
    mixedSamples: briefs.filter((b) => b.sampleOrder === 'mixed').map((b) => b.username),
  };
}

/**
 * @param {string|null} iso
 * @returns {string}
 */
function shortDate(iso) {
  return iso ? iso.slice(0, 10) : 'undated';
}

/**
 * Keep a post's text to one readable line.
 * @param {string} text
 * @param {number} [max=200]
 * @returns {string}
 */
function oneLine(text, max = 200) {
  const flat = tidy(text);
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
}

/**
 * Render the combined brief as Markdown: readable in a terminal, pasteable
 * into a doc, and a good prompt for drafting posts with an LLM.
 *
 * @param {object} ecosystem - Output of buildEcosystemBrief
 * @returns {string}
 */
export function renderBriefMarkdown(ecosystem) {
  const { accounts, topics, tagLine, alsoTag, failures, generatedAt, mixedSamples = [] } = ecosystem;
  const out = [];
  const topicLabel = topics.length ? topics.join(', ') : null;
  const windowDays = accounts[0]?.windowDays;

  out.push(`# Account brief${topicLabel ? `: ${topicLabel}` : ''}`);
  out.push('');
  const meta = [`Generated ${generatedAt.slice(0, 16).replace('T', ' ')} UTC`, `${accounts.length} account${accounts.length === 1 ? '' : 's'}`];
  if (windowDays) meta.push(`posts from the last ${windowDays} days`);
  out.push(meta.join(' · '));
  out.push('');
  if (mixedSamples.length) {
    out.push(
      `> **Logged-out read.** For ${mixedSamples.map((u) => `@${u}`).join(', ')}, X returned popular posts from across the account's history instead of the latest ones, so recent activity may be missing. Run \`xactions connect\` and re-run with \`--refresh\`.`
    );
    out.push('');
  }

  if (accounts.length) {
    out.push('## Tag line');
    out.push('');
    out.push(tagLine);
    out.push('');
  }

  if (alsoTag.length) {
    out.push('## Also worth tagging');
    out.push('');
    out.push(
      accounts.length > 1
        ? 'Not on your list, but mentioned or reposted by more than one account that is:'
        : 'Accounts this one mentions or reposts most:'
    );
    out.push('');
    for (const entry of alsoTag) {
      out.push(`- @${entry.username}: by ${entry.by.map((u) => `@${u}`).join(', ')} (${entry.mentions}×)`);
    }
    out.push('');
  }

  for (const brief of accounts) {
    out.push(`## @${brief.username}${brief.name && brief.name !== brief.username ? `: ${brief.name}` : ''}`);
    out.push('');
    const facts = [`${formatCount(brief.followers)} followers`];
    if (brief.verified) facts.push('verified');
    if (brief.website) facts.push(brief.website);
    facts.push(brief.url);
    out.push(facts.join(' · '));
    if (brief.bio) {
      out.push('');
      out.push(`> ${oneLine(brief.bio, 280)}`);
    }
    out.push('');

    if (brief.highlights.length) {
      out.push('**Account stats**');
      out.push('');
      for (const line of brief.highlights) out.push(`- ${line}`);
      out.push('');
    }

    if (brief.figures.length) {
      out.push('**Numbers they are posting**');
      out.push('');
      for (const post of brief.figures) {
        const values = [...new Set(post.figures.map((f) => f.value))].join(', ');
        const context = post.figures[0].context;
        const tag = post.onTopic ? ' · on topic' : '';
        out.push(`- **${values}**: "${context}" ([${shortDate(post.postedAt)}](${post.url}), ${formatCount(post.engagement)} interactions${tag})`);
      }
      out.push('');
    }

    if (topicLabel) {
      out.push(`**Posts about ${topicLabel}** (${brief.topicPostCount} in the last ${brief.windowDays} days)`);
      out.push('');
      if (brief.topicPosts.length) {
        for (const post of brief.topicPosts) {
          out.push(`- ${shortDate(post.postedAt)} · ${formatCount(post.engagement)} interactions · ${oneLine(post.text)} (${post.url})`);
        }
      } else {
        out.push('- None in the sample.');
      }
      out.push('');
    }

    if (brief.recentPosts.length) {
      out.push('**Recent posts**');
      out.push('');
      for (const post of brief.recentPosts) {
        out.push(`- ${shortDate(post.postedAt)} · ${formatCount(post.engagement)} interactions · ${oneLine(post.text)} (${post.url})`);
      }
      out.push('');
    }

    const network = [];
    if (brief.mentions.length) network.push(`**Tags most:** ${brief.mentions.map((m) => `@${m.value} (${m.count})`).join(', ')}`);
    if (brief.amplifies.length) network.push(`**Reposts and quotes:** ${brief.amplifies.map((m) => `@${m.value} (${m.count})`).join(', ')}`);
    if (brief.links.length) network.push(`**Links to:** ${brief.links.map((l) => `${l.value} (${l.count})`).join(', ')}`);
    if (network.length) {
      for (const line of network) out.push(line);
      out.push('');
    }

    if (brief.sampleOrder === 'mixed') {
      out.push(
        `_Sample: ${brief.sampleSize} posts. X served a logged-out sample, popular posts from across the account's history rather than its latest, so recent activity may be missing. Run \`xactions connect\` for the latest posts._`
      );
    } else {
      const last =
        brief.stats.daysSinceLastPost === null
          ? 'no dated posts'
          : brief.stats.daysSinceLastPost < 1
            ? 'last post under a day ago'
            : `last post ${brief.stats.daysSinceLastPost} day${brief.stats.daysSinceLastPost === 1 ? '' : 's'} ago`;
      out.push(`_Sample: ${brief.sampleSize} posts over ${brief.sampleSpanDays} days, ${last}._`);
    }
    out.push('');
  }

  if (failures.length) {
    out.push('## Not included');
    out.push('');
    for (const failure of failures) out.push(`- @${failure.username}: ${failure.error}`);
    out.push('');
  }

  return out.join('\n');
}
