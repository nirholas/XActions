// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Discovery processors: trends, the Explore tabs, search, saved searches,
 * Topics, the home timelines (For You and Following) and the media tools
 * (upload, captions, library, analytics, Media Studio overview, batch
 * download links).
 *
 * Every job reads and writes through the caller's own X session over X's HTTP
 * API (src/scrapers/twitter/http). Reads that X serves from more than one
 * surface run a failover chain (trends: the Explore guide, then the GraphQL
 * Explore page, then the WOEID trends endpoint) so one retired endpoint does
 * not fail a paid job. Batch downloads fall back to the credential-free video
 * extractors in src/video when the session cannot read a tweet, and name every
 * file with the templates in src/media, the same ones `xactions download` uses.
 *
 * Nothing here keeps state of its own: saved searches and followed Topics live
 * on the X account, and everything else is read fresh per job.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { lookup } from 'node:dns/promises';
import { PublicUrlError, publicFetch } from '../../utils/publicUrl.js';
import { BlockList, isIP } from 'node:net';

import { JobInputError } from './context.js';
import { GRAPHQL, REST_BASE, buildGraphQLVariables, resolveGraphQL } from '../../../src/scrapers/twitter/http/endpoints.js';
import { AuthError, NotFoundError, TwitterApiError } from '../../../src/scrapers/twitter/http/errors.js';
import { scrapeExplorePage, scrapeTrends, scrapeTrendsByWoeid } from '../../../src/scrapers/twitter/http/explore.js';
import { searchTweets, searchUsers } from '../../../src/scrapers/twitter/http/search.js';
import { parseTimelineInstructions, scrapeTweetById } from '../../../src/scrapers/twitter/http/tweets.js';
import { findInstructions, paginate } from '../../../src/scrapers/twitter/http/paging.js';
import { mimeFromBuffer, parseMediaEntity, uploadChunked } from '../../../src/scrapers/twitter/http/media.js';
import { scrapeProfile } from '../../../src/scrapers/twitter/http/profile.js';
import { DEFAULT_TEMPLATE, TEMPLATE_KEYS, applyFilters, itemsFromTweet, renderTemplate } from '../../../src/media/index.js';
import { extractTweetVideo } from '../../../src/video/edgeExtractor.js';

// ---------------------------------------------------------------------------
// Input helpers
// ---------------------------------------------------------------------------

/** An integer config value, defaulted and clamped. */
function intIn(value, fallback, min, max) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/** A boolean config value that may arrive as a string from a query string. */
function flag(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  return !/^(false|0|no|off)$/i.test(String(value).trim());
}

/** An array config value that may arrive as a comma separated string. */
function list(value) {
  if (value === undefined || value === null || value === '') return [];
  const items = Array.isArray(value) ? value : String(value).split(',');
  return items.map((v) => String(v).trim()).filter(Boolean);
}

/** A delay between actions: `delayMs`, or the older `scrollDelay` name. */
function delayOf(config, fallback) {
  return intIn(config.delayMs ?? config.scrollDelay, fallback, 0, 60_000);
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function assertDate(value, label) {
  if (value !== undefined && value !== null && value !== '' && !DATE_RE.test(String(value))) {
    throw new JobInputError(`${label} must be a date like 2026-01-31`);
  }
}

const FEEDS = {
  'for-you': 'for-you',
  foryou: 'for-you',
  for_you: 'for-you',
  home: 'for-you',
  following: 'following',
  latest: 'following',
  chronological: 'following',
};

/** Normalise a feed name to `for-you` or `following`. */
function feedOf(value, fallback = 'for-you') {
  if (value === undefined || value === null || value === '') return fallback;
  const feed = FEEDS[String(value).trim().toLowerCase()];
  if (!feed) throw new JobInputError(`feed must be "for-you" or "following", not "${value}"`);
  return feed;
}

/** The link to a post on x.com. */
function postUrl(tweet) {
  return `https://x.com/${tweet.author?.username || 'i'}/status/${tweet.id}`;
}

function withUrl(tweet) {
  return { ...tweet, url: postUrl(tweet) };
}

/** Throw the first GraphQL error when X answered with errors and no data. */
function assertGraphql(response, operation) {
  const errors = response?.errors;
  if (Array.isArray(errors) && errors.length && !response?.data) {
    throw new TwitterApiError(`${operation}: ${errors[0]?.message || 'X returned an error'}`, { data: errors });
  }
  return response;
}

// ---------------------------------------------------------------------------
// Trends and Explore
// ---------------------------------------------------------------------------

/** The Explore tabs `/2/guide.json` serves. */
const EXPLORE_TABS = ['trending', 'for-you', 'news', 'sports', 'entertainment'];

function tabOf(value, fallback = 'trending') {
  if (value === undefined || value === null || value === '') return fallback;
  const tab = String(value).trim().toLowerCase().replace(/_/g, '-');
  if (!EXPLORE_TABS.includes(tab)) {
    throw new JobInputError(`category must be one of ${EXPLORE_TABS.join(', ')}, not "${value}"`);
  }
  return tab;
}

/** Failures that retrying another endpoint cannot fix. */
function isFatal(err) {
  return err instanceof AuthError || err?.name === 'JobCancelledError';
}

/**
 * Trends for one Explore tab, from the first surface that answers with any.
 * X has moved trends between endpoints before; a paid job should not fail
 * because one of them was retired.
 *
 * @returns {Promise<{ trends: object[], source: string, failures: string[] }>}
 */
async function trendsWithFailover(ctx, { tab = 'trending', limit = 30, woeid = null }) {
  const client = await ctx.http();
  const lanes = [];
  if (woeid) lanes.push([`woeid:${woeid}`, async () => (await scrapeTrendsByWoeid(client, woeid)).trends]);
  lanes.push([`guide:${tab}`, () => scrapeTrends(client, { tab, limit })]);
  if (tab === 'trending') {
    lanes.push(['explorePage', () => scrapeExplorePage(client, { limit })]);
    if (!woeid) lanes.push(['woeid:1', async () => (await scrapeTrendsByWoeid(client, 1)).trends]);
  }

  const failures = [];
  for (const [source, run] of lanes) {
    ctx.throwIfCancelled();
    try {
      const trends = (await run()).filter(Boolean);
      if (trends.length) return { trends: trends.slice(0, limit), source, failures };
      failures.push(`${source}: no trends`);
    } catch (err) {
      if (isFatal(err)) throw err;
      failures.push(`${source}: ${err.message}`);
    }
  }
  throw new TwitterApiError(`X returned no ${tab} trends (${failures.join('; ')})`);
}

/** Does a trend mention a watched keyword? */
function matchesKeyword(trend, keyword) {
  const needle = keyword.toLowerCase().replace(/^#/, '');
  return [trend.name, trend.query, trend.context]
    .filter(Boolean)
    .some((field) => String(field).toLowerCase().replace(/#/g, '').includes(needle));
}

/** What changed between two trend snapshots. */
function diffTrends(previous, current) {
  const before = new Map(previous.map((t) => [t.name, t]));
  const after = new Map(current.map((t) => [t.name, t]));
  const entered = current.filter((t) => !before.has(t.name)).map((t) => ({ name: t.name, rank: t.rank }));
  const left = previous.filter((t) => !after.has(t.name)).map((t) => ({ name: t.name, lastRank: t.rank }));
  const moved = current
    .filter((t) => before.has(t.name) && before.get(t.name).rank !== t.rank)
    .map((t) => ({ name: t.name, from: before.get(t.name).rank, to: t.rank, change: before.get(t.name).rank - t.rank }))
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  return { entered, left, moved };
}

async function discoveryTrending(ctx) {
  const limit = intIn(ctx.config.limit, 30, 1, 100);
  const woeid = ctx.config.woeid ? intIn(ctx.config.woeid, 1, 1, Number.MAX_SAFE_INTEGER) : null;
  const tab = tabOf(ctx.config.category ?? ctx.config.tab);
  ctx.progress(`Reading ${tab} trends`);
  const { trends, source, failures } = await trendsWithFailover(ctx, { tab, limit, woeid });
  return { success: true, category: tab, source, count: trends.length, trends, fetchedAt: new Date().toISOString(), failures };
}

async function discoveryTrendingMonitor(ctx) {
  const { config } = ctx;
  const snapshots = intIn(config.snapshots ?? config.rounds, 3, 1, 12);
  const intervalMinutes = Math.min(60, Math.max(1, Number(config.intervalMinutes) || 5));
  const limit = intIn(config.limit, 50, 1, 100);
  const woeid = config.woeid ? intIn(config.woeid, 1, 1, Number.MAX_SAFE_INTEGER) : null;
  const tab = tabOf(config.category ?? config.tab);
  const keywords = list(config.watchKeywords ?? config.keywords);

  const taken = [];
  const alerts = [];
  const history = new Map();
  let previous = null;

  for (let round = 0; round < snapshots; round++) {
    if (round > 0) await ctx.sleep(intervalMinutes * 60_000);
    ctx.throwIfCancelled();
    const takenAt = new Date().toISOString();
    ctx.progress(`Snapshot ${round + 1} of ${snapshots}`, { snapshot: round + 1, snapshots });

    let result;
    try {
      result = await trendsWithFailover(ctx, { tab, limit, woeid });
    } catch (err) {
      if (isFatal(err)) throw err;
      taken.push({ takenAt, error: err.message });
      continue;
    }

    const trends = result.trends.map((t, i) => ({ name: t.name, rank: t.rank ?? i + 1, volume: t.volume ?? null, url: t.url ?? null }));
    for (const trend of trends) {
      const seen = history.get(trend.name) || { name: trend.name, appearances: 0, bestRank: trend.rank, firstSeenAt: takenAt, lastSeenAt: takenAt, peakVolume: null };
      seen.appearances += 1;
      seen.bestRank = Math.min(seen.bestRank, trend.rank);
      seen.lastSeenAt = takenAt;
      if (trend.volume != null) seen.peakVolume = Math.max(seen.peakVolume ?? 0, trend.volume);
      history.set(trend.name, seen);
      for (const keyword of keywords) {
        if (matchesKeyword(trend, keyword) && !alerts.some((a) => a.keyword === keyword && a.trend === trend.name)) {
          alerts.push({ keyword, trend: trend.name, rank: trend.rank, firstSeenAt: takenAt });
        }
      }
    }

    taken.push({ takenAt, source: result.source, count: trends.length, trends, changes: previous ? diffTrends(previous, trends) : null });
    previous = trends;
  }

  const good = taken.filter((s) => !s.error);
  if (!good.length) throw new TwitterApiError(`Every trend snapshot failed: ${taken.map((s) => s.error).join('; ')}`);

  const ranked = [...history.values()].sort((a, b) => b.appearances - a.appearances || a.bestRank - b.bestRank);
  return {
    success: true,
    category: tab,
    snapshots: taken,
    intervalMinutes,
    watchKeywords: keywords,
    alerts,
    summary: {
      snapshotsTaken: good.length,
      snapshotsFailed: taken.length - good.length,
      uniqueTrends: history.size,
      persistent: ranked.filter((t) => t.appearances === good.length).map((t) => t.name),
      trends: ranked,
    },
  };
}

async function discoveryExplore(ctx) {
  const tabs = list(ctx.config.tabs).map((t) => tabOf(t));
  const wanted = tabs.length ? [...new Set(tabs)] : EXPLORE_TABS;
  const limit = intIn(ctx.config.limit, 20, 1, 100);
  const delayMs = delayOf(ctx.config, 1000);

  const result = {};
  const failures = [];
  for (const [i, tab] of wanted.entries()) {
    if (i > 0) await ctx.sleep(delayMs);
    ctx.progress(`Reading the ${tab} tab`, { tab, done: i, total: wanted.length });
    try {
      const { trends, source } = await trendsWithFailover(ctx, { tab, limit });
      result[tab] = { source, count: trends.length, trends };
    } catch (err) {
      if (isFatal(err)) throw err;
      failures.push({ tab, error: err.message });
    }
  }
  if (!Object.keys(result).length) {
    throw new TwitterApiError(`No Explore tab could be read: ${failures.map((f) => `${f.tab}: ${f.error}`).join('; ')}`);
  }
  return { success: true, tabs: result, failures, fetchedAt: new Date().toISOString() };
}

async function getTrends(ctx) {
  const tab = tabOf(ctx.config.category);
  const woeid = ctx.config.woeid ? intIn(ctx.config.woeid, 1, 1, Number.MAX_SAFE_INTEGER) : null;
  const limit = intIn(ctx.config.limit, 30, 1, 100);
  const { trends, source, failures } = await trendsWithFailover(ctx, { tab, limit, woeid });
  return { success: true, category: tab, source, count: trends.length, trends, failures };
}

async function getExploreFeed(ctx) {
  const tab = tabOf(ctx.config.category);
  const limit = intIn(ctx.config.limit, 30, 1, 100);
  const { trends, source, failures } = await trendsWithFailover(ctx, { tab, limit });
  return { success: true, category: tab, source, count: trends.length, items: trends, failures };
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

/** Search tabs, and the filter a tab implies on X's Media tab. */
const PRODUCTS = {
  top: { product: 'Top' },
  latest: { product: 'Latest' },
  live: { product: 'Latest' },
  people: { product: 'People' },
  users: { product: 'People' },
  media: { product: 'Media' },
  photos: { product: 'Media', filter: 'images' },
  images: { product: 'Media', filter: 'images' },
  videos: { product: 'Media', filter: 'videos' },
};

/** Operators X accepts after `filter:`. */
const SEARCH_FILTERS = ['links', 'images', 'videos', 'media', 'native_video', 'replies', 'retweets', 'nativeretweets', 'quote', 'verified', 'blue_verified', 'news', 'safe', 'hashtags', 'mentions', 'spaces'];

/**
 * Read the search shape from a job config. `type` (or `product`, `tab`)
 * picks the tab; `filter` is either a tab name, as the dashboard sends
 * `filter=latest`, or a `filter:` operator.
 */
function searchPlan(config) {
  const requested = String(config.type ?? config.product ?? config.tab ?? '').trim().toLowerCase();
  const rawFilter = String(config.filter ?? '').trim().toLowerCase();
  let tab = requested ? PRODUCTS[requested] : null;
  if (requested && !tab) throw new JobInputError(`type must be one of ${Object.keys(PRODUCTS).join(', ')}`);

  let filter = null;
  if (rawFilter) {
    if (PRODUCTS[rawFilter] && !tab) tab = PRODUCTS[rawFilter];
    else if (SEARCH_FILTERS.includes(rawFilter)) filter = rawFilter;
    else if (!PRODUCTS[rawFilter]) throw new JobInputError(`filter must be a search tab (${Object.keys(PRODUCTS).join(', ')}) or one of ${SEARCH_FILTERS.join(', ')}`);
  }
  tab = tab || PRODUCTS.top;

  for (const key of ['since', 'until']) assertDate(config[key], key);
  const extra = [tab.filter && `filter:${tab.filter}`].filter(Boolean);
  return { product: tab.product, filter, extra };
}

async function runSearch(ctx, query, limitFallback) {
  const { config } = ctx;
  const text = String(query ?? '').trim();
  if (!text) throw new JobInputError('query is required');
  if (text.length > 500) throw new JobInputError('query must be 500 characters or fewer');

  const limit = intIn(config.limit, limitFallback, 1, 500);
  const plan = searchPlan(config);
  const client = await ctx.http();
  const onProgress = ({ fetched }) => ctx.progress(`Found ${fetched} of up to ${limit}`, { fetched, limit });

  if (plan.product === 'People') {
    const users = await searchUsers(client, text, { limit, onProgress });
    return { success: true, query: text, type: 'people', count: users.length, users };
  }

  const tweets = await searchTweets(client, [text, ...plan.extra].join(' '), {
    limit,
    type: plan.product,
    filter: plan.filter || undefined,
    from: config.from ? String(config.from).replace(/^@/, '') : undefined,
    to: config.to ? String(config.to).replace(/^@/, '') : undefined,
    since: config.since || undefined,
    until: config.until || undefined,
    minLikes: intIn(config.minLikes, 0, 0, 10_000_000) || undefined,
    minRetweets: intIn(config.minRetweets, 0, 0, 10_000_000) || undefined,
    lang: config.lang || undefined,
    onProgress,
  });
  return { success: true, query: text, type: plan.product.toLowerCase(), count: tweets.length, tweets: tweets.map(withUrl) };
}

async function discoverySearch(ctx) {
  return runSearch(ctx, ctx.require('query'), 20);
}

async function searchTweetsJob(ctx) {
  return runSearch(ctx, ctx.config.query ?? ctx.config.q, 50);
}

// ---------------------------------------------------------------------------
// Saved searches (stored on the X account)
// ---------------------------------------------------------------------------

/** X's cap on saved searches per account. */
const MAX_SAVED_SEARCHES = 25;

function parseSavedSearch(raw) {
  const created = raw.created_at ? new Date(raw.created_at) : null;
  return {
    id: raw.id_str ?? String(raw.id),
    name: raw.name ?? raw.query,
    query: raw.query,
    createdAt: created && !Number.isNaN(created.getTime()) ? created.toISOString() : null,
    searchUrl: `https://x.com/search?q=${encodeURIComponent(raw.query)}&src=saved_search`,
  };
}

async function listSavedSearches(client) {
  const response = await client.rest('/1.1/saved_searches/list.json', { method: 'GET' });
  if (!Array.isArray(response)) throw new TwitterApiError('X answered the saved searches list without a list');
  return response.map(parseSavedSearch);
}

async function discoverySaveSearch(ctx) {
  const query = String(ctx.require('query')).trim();
  if (!query) throw new JobInputError('query is required');
  if (query.length > 500) throw new JobInputError('query must be 500 characters or fewer');

  const client = await ctx.http();
  const existing = await listSavedSearches(client);
  const already = existing.find((s) => s.query.toLowerCase() === query.toLowerCase());
  if (already) return { success: true, alreadySaved: true, savedSearch: already, total: existing.length };
  if (existing.length >= MAX_SAVED_SEARCHES) {
    throw new JobInputError(`X allows ${MAX_SAVED_SEARCHES} saved searches and this account has ${existing.length}. Delete one with POST /api/ai/discovery/saved-searches {"action":"delete","id":"..."} first.`);
  }

  ctx.progress(`Saving "${query}"`);
  const created = await client.rest('/1.1/saved_searches/create.json', { method: 'POST', body: { query } });
  if (!created?.query) throw new TwitterApiError('X did not confirm the saved search');
  return { success: true, alreadySaved: false, savedSearch: parseSavedSearch(created), total: existing.length + 1 };
}

async function discoverySavedSearches(ctx) {
  const action = String(ctx.config.action || 'list').trim().toLowerCase();
  const client = await ctx.http();
  const saved = await listSavedSearches(client);
  if (action === 'list') return { success: true, count: saved.length, max: MAX_SAVED_SEARCHES, savedSearches: saved };

  if (action !== 'delete' && action !== 'run') {
    throw new JobInputError('action must be list, delete or run');
  }
  const { id, query } = ctx.config;
  if (!id && !query) throw new JobInputError(`${action} needs the saved search's id or query`);
  const target = saved.find((s) => (id && s.id === String(id)) || (query && s.query.toLowerCase() === String(query).trim().toLowerCase()));
  if (!target) throw new JobInputError(`No saved search matches ${id ? `id ${id}` : `"${query}"`}`);

  if (action === 'run') {
    const results = await runSearch(ctx, target.query, 20);
    return { ...results, savedSearch: target };
  }

  if (flag(ctx.config.dryRun)) return { success: true, dryRun: true, wouldDelete: target };
  ctx.progress(`Deleting saved search "${target.query}"`);
  await client.rest(`/1.1/saved_searches/destroy/${encodeURIComponent(target.id)}.json`, { method: 'POST', body: {} });
  return { success: true, deleted: target, count: saved.length - 1 };
}

// ---------------------------------------------------------------------------
// Topics (followed on the X account)
// ---------------------------------------------------------------------------

/** Collect every Topic object anywhere in a response. */
function collectTopics(node, found = new Map(), depth = 0) {
  if (!node || typeof node !== 'object' || depth > 40) return found;
  if (Array.isArray(node)) {
    for (const item of node) collectTopics(item, found, depth + 1);
    return found;
  }
  const id = node.topic_id;
  if (id && typeof node.name === 'string') {
    found.set(String(id), {
      id: String(id),
      name: node.name,
      description: node.description ?? null,
      following: Boolean(node.following),
      notInterested: Boolean(node.not_interested),
      iconUrl: node.icon_url ?? null,
      url: `https://x.com/i/topics/${id}`,
    });
  }
  for (const value of Object.values(node)) {
    if (value && typeof value === 'object') collectTopics(value, found, depth + 1);
  }
  return found;
}

const TOPIC_ACTIONS = {
  follow: { operation: 'TopicFollow', charge: 'follow', past: 'followed' },
  unfollow: { operation: 'TopicUnfollow', charge: 'unfollow', past: 'unfollowed' },
  notinterested: { operation: 'TopicNotInterested', charge: null, past: 'marked not interested' },
  undonotinterested: { operation: 'TopicUndoNotInterested', charge: null, past: 'restored' },
};

async function discoveryTopics(ctx) {
  const { config } = ctx;
  const ids = list(config.topicIds ?? config.topicId);
  const action = String(config.action || (ids.length ? '' : 'suggested')).trim().toLowerCase().replace(/[-_\s]/g, '');
  const client = await ctx.http();

  if (action === 'suggested' || action === 'discover' || action === 'list') {
    const keyword = String(config.keyword ?? '').trim().toLowerCase();
    const { queryId, operationName } = resolveGraphQL('TopicToFollowSidebar');
    const response = assertGraphql(await client.graphql(queryId, operationName, {}), operationName);
    let topics = [...collectTopics(response?.data).values()];
    if (!topics.length) throw new TwitterApiError('X returned no Topics for this account');
    if (keyword) topics = topics.filter((t) => `${t.name} ${t.description ?? ''}`.toLowerCase().includes(keyword));
    return { success: true, action: 'suggested', keyword: keyword || null, count: topics.length, topics };
  }

  const spec = TOPIC_ACTIONS[action];
  if (!spec) throw new JobInputError('action must be suggested, follow, unfollow, notInterested or undoNotInterested');
  if (!ids.length) throw new JobInputError(`${action} needs topicId or topicIds`);
  const bad = ids.filter((id) => !/^\d{1,25}$/.test(id));
  if (bad.length) throw new JobInputError(`Topic ids are numeric: ${bad.join(', ')}`);

  const max = intIn(config.maxTopics, 20, 1, 50);
  const dryRun = flag(config.dryRun);
  const delayMs = delayOf(config, 3000);
  const { queryId, operationName } = resolveGraphQL(spec.operation);
  const outcomes = [];

  for (const [i, topicId] of ids.entries()) {
    if (i >= max) {
      outcomes.push({ topicId, status: 'skipped', reason: `maxTopics (${max}) reached` });
      continue;
    }
    ctx.throwIfCancelled();
    if (dryRun) {
      outcomes.push({ topicId, status: 'planned' });
      continue;
    }
    if (i > 0) await ctx.sleep(delayMs);
    try {
      if (spec.charge) await ctx.charge(spec.charge);
      assertGraphql(await client.graphql(queryId, operationName, { topicId }, { mutation: true }), operationName);
      outcomes.push({ topicId, status: spec.past, url: `https://x.com/i/topics/${topicId}` });
    } catch (err) {
      if (isFatal(err) || err?.name === 'ActionCapExceededError') throw err;
      outcomes.push({ topicId, status: 'failed', error: err.message });
    }
    ctx.progress(`${i + 1} of ${Math.min(ids.length, max)} Topics done`, { done: i + 1 });
  }

  const count = (status) => outcomes.filter((o) => o.status === status).length;
  return {
    success: count('failed') === 0,
    action,
    dryRun,
    summary: { requested: ids.length, done: count(spec.past), planned: count('planned'), failed: count('failed'), skipped: count('skipped') },
    outcomes,
  };
}

// ---------------------------------------------------------------------------
// Home timelines
// ---------------------------------------------------------------------------

const HOME_OPERATION = { 'for-you': 'HomeTimeline', following: 'HomeLatestTimeline' };

/** Is a timeline entry an ad? */
function isPromoted(entry) {
  return String(entry?.entryId ?? '').startsWith('promoted') || Boolean(entry?.content?.itemContent?.promotedMetadata);
}

/** Drop ad entries from a page, counting them. */
function withoutPromoted(instructions) {
  let promoted = 0;
  const kept = instructions.map((instruction) => {
    if (!Array.isArray(instruction.entries)) return instruction;
    const entries = instruction.entries.filter((entry) => {
      const ad = isPromoted(entry);
      if (ad) promoted++;
      return !ad;
    });
    return { ...instruction, entries };
  });
  return { kept, promoted };
}

/**
 * Read one of the account's home timelines.
 *
 * X's web client fetches both home timelines over POST, and answers the GET
 * form of these persisted queries with an error, so the request is sent the
 * way graphql() sends a mutation: POST with the variables in the body.
 *
 * @returns {Promise<{ posts: object[], pages: number, promotedSkipped: number }>}
 */
async function homeTimeline(ctx, { feed, limit, delayMs, includePromoted = false }) {
  const client = await ctx.http();
  const key = HOME_OPERATION[feed];
  const { queryId, operationName } = GRAPHQL[key];
  const posts = new Map();
  let cursor = null;
  let pages = 0;
  let promotedSkipped = 0;

  while (posts.size < limit) {
    ctx.throwIfCancelled();
    if (pages > 0) await ctx.sleep(delayMs);
    const variables = buildGraphQLVariables(key, { count: 20, cursor });
    const response = assertGraphql(await client.graphql(queryId, operationName, variables, { mutation: true }), operationName);
    const instructions = findInstructions(response, 'data.home.home_timeline_urt.instructions');
    const page = includePromoted ? { kept: instructions, promoted: 0 } : withoutPromoted(instructions);
    promotedSkipped += page.promoted;
    const { tweets, cursor: next } = parseTimelineInstructions(page.kept);

    let added = 0;
    for (const tweet of tweets) {
      if (posts.size >= limit) break;
      if (!posts.has(tweet.id)) {
        posts.set(tweet.id, withUrl(tweet));
        added++;
      }
    }
    pages++;
    ctx.progress(`Read ${posts.size} of ${limit} posts`, { fetched: posts.size, limit, pages });
    if (!next || added === 0) break;
    cursor = next;
  }

  if (!posts.size) throw new TwitterApiError(`The ${feed} timeline came back empty`);
  return { posts: [...posts.values()], pages, promotedSkipped };
}

/** Totals and leaders across a set of posts. */
function summarizePosts(posts) {
  const tally = (values) => {
    const counts = new Map();
    for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count }));
  };
  const total = (field) => posts.reduce((sum, p) => sum + (p.metrics?.[field] || 0), 0);
  const n = posts.length || 1;
  return {
    posts: posts.length,
    uniqueAuthors: new Set(posts.map((p) => p.author?.username)).size,
    withMedia: posts.filter((p) => p.media?.length).length,
    replies: posts.filter((p) => p.isReply).length,
    reposts: posts.filter((p) => p.isRetweet).length,
    avgLikes: Math.round(total('likes') / n),
    avgViews: Math.round(total('views') / n),
    topAuthors: tally(posts.map((p) => `@${p.author?.username}`)),
    topHashtags: tally(posts.flatMap((p) => (p.hashtags || []).map((h) => `#${h}`))),
  };
}

async function readFeed(ctx, { feed, limitFallback, limitMax, delayFallback }) {
  const limit = intIn(ctx.config.limit ?? ctx.config.maxPosts, limitFallback, 1, limitMax);
  const delayMs = delayOf(ctx.config, delayFallback);
  const includePromoted = flag(ctx.config.includePromoted);
  const { posts, pages, promotedSkipped } = await homeTimeline(ctx, { feed, limit, delayMs, includePromoted });
  return { feed, count: posts.length, pages, promotedSkipped, posts };
}

async function discoveryForYou(ctx) {
  const feed = await readFeed(ctx, { feed: 'for-you', limitFallback: 20, limitMax: 200, delayFallback: 1500 });
  return { success: true, ...feed };
}

async function timelineView(ctx) {
  const feed = await readFeed(ctx, { feed: feedOf(ctx.config.feed), limitFallback: 20, limitMax: 100, delayFallback: 1500 });
  return { success: true, ...feed };
}

async function timelineScroll(ctx) {
  const feed = await readFeed(ctx, { feed: feedOf(ctx.config.feed), limitFallback: 50, limitMax: 500, delayFallback: 2000 });
  return { success: true, ...feed };
}

async function timelineCollect(ctx) {
  const feed = await readFeed(ctx, { feed: feedOf(ctx.config.feed), limitFallback: 100, limitMax: 1000, delayFallback: 2000 });
  return { success: true, ...feed, summary: summarizePosts(feed.posts), collectedAt: new Date().toISOString() };
}

const CSV_COLUMNS = [
  ['id', (p) => p.id],
  ['url', (p) => p.url],
  ['created_at', (p) => p.createdAt],
  ['username', (p) => p.author?.username],
  ['name', (p) => p.author?.name],
  ['verified', (p) => p.author?.verified],
  ['text', (p) => p.text],
  ['likes', (p) => p.metrics?.likes],
  ['reposts', (p) => p.metrics?.retweets],
  ['replies', (p) => p.metrics?.replies],
  ['quotes', (p) => p.metrics?.quotes],
  ['bookmarks', (p) => p.metrics?.bookmarks],
  ['views', (p) => p.metrics?.views],
  ['media', (p) => (p.media || []).map((m) => m.videoUrl || m.url).join(' ')],
  ['hashtags', (p) => (p.hashtags || []).join(' ')],
  ['is_reply', (p) => p.isReply],
  ['is_repost', (p) => p.isRetweet],
  ['lang', (p) => p.lang],
];

/** One CSV cell, quoted as needed and defused against spreadsheet formulas. */
function csvCell(value) {
  let text = value === undefined || value === null ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(posts) {
  const rows = [CSV_COLUMNS.map(([name]) => name).join(',')];
  for (const post of posts) rows.push(CSV_COLUMNS.map(([, read]) => csvCell(read(post))).join(','));
  return `${rows.join('\r\n')}\r\n`;
}

async function timelineExport(ctx) {
  const format = String(ctx.config.format || 'json').trim().toLowerCase();
  if (format !== 'json' && format !== 'csv') throw new JobInputError('format must be json or csv');
  const feed = await readFeed(ctx, { feed: feedOf(ctx.config.feed), limitFallback: 100, limitMax: 1000, delayFallback: 2000 });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return {
    success: true,
    format,
    feed: feed.feed,
    count: feed.count,
    filename: `timeline-${feed.feed}-${stamp}.${format}`,
    contentType: format === 'csv' ? 'text/csv' : 'application/json',
    content: format === 'csv' ? toCsv(feed.posts) : feed.posts,
    summary: summarizePosts(feed.posts),
  };
}

async function timelineSwitchFeed(ctx) {
  const feed = feedOf(ctx.config.feed, 'following');
  ctx.progress(`Switching to ${feed}`);
  const read = await readFeed(ctx, { feed, limitFallback: 20, limitMax: 100, delayFallback: 1500 });
  return { success: true, switchedTo: feed, ...read };
}

// ---------------------------------------------------------------------------
// Account and media timelines
// ---------------------------------------------------------------------------

/** The account the session belongs to. */
async function viewer(client) {
  const me = await client.rest('/1.1/account/verify_credentials.json', { method: 'GET' });
  if (!me?.id_str) throw new TwitterApiError('X did not say which account this session belongs to');
  return {
    id: me.id_str,
    username: me.screen_name,
    name: me.name,
    followers: me.followers_count ?? null,
    following: me.friends_count ?? null,
    posts: me.statuses_count ?? null,
    mediaCount: me.media_count ?? null,
    avatar: me.profile_image_url_https ?? null,
  };
}

/** The account a media job is about: `username` if given, else the session's own. */
async function subjectAccount(ctx, client) {
  const username = String(ctx.config.username ?? '').trim().replace(/^@/, '');
  if (!username) return viewer(client);
  if (!/^[A-Za-z0-9_]{1,15}$/.test(username)) throw new JobInputError(`"${username}" is not an X username`);
  const profile = await scrapeProfile(client, username);
  return { id: profile.id, username: profile.username, name: profile.name, followers: profile.followers, following: profile.following, posts: profile.tweets ?? null, avatar: profile.avatar ?? null };
}

/** Posts from an account's Media tab, newest first. */
async function mediaPosts(ctx, client, userId, limit) {
  const posts = await paginate(
    client,
    GRAPHQL.UserMedia,
    { userId, includePromotedContent: false, withClientEventToken: false, withBirdwatchNotes: false, withVoice: true, withV2Timeline: true },
    (instructions) => {
      const { tweets, cursor } = parseTimelineInstructions(instructions);
      return { items: tweets, cursor };
    },
    {
      limit,
      path: 'data.user.result.timeline.timeline.instructions',
      onProgress: ({ fetched }) => ctx.progress(`Read ${fetched} media posts`, { fetched, limit }),
    },
  );
  return posts.filter((p) => p.media?.length).map(withUrl);
}

/** A parsed tweet's media as normalised entities (best video variant, original-size photos). */
function mediaEntities(tweet) {
  return (tweet.media || []).map((m) =>
    parseMediaEntity(
      {
        type: m.type,
        media_url_https: m.url,
        original_info: { width: m.width, height: m.height },
        video_info: m.videoUrl ? { variants: [{ content_type: 'video/mp4', url: m.videoUrl }] } : undefined,
      },
      tweet.id,
    ),
  );
}

/** Flat media items for a post, in the shape src/media names files from. */
function mediaItems(tweet) {
  return itemsFromTweet({
    id: tweet.id,
    username: tweet.author?.username,
    userId: tweet.author?.id,
    createdAt: tweet.createdAt,
    media: mediaEntities(tweet),
  });
}

const MEDIA_TYPES = { photo: 'photo', photos: 'photo', image: 'photo', video: 'video', videos: 'video', gif: 'gif', animated_gif: 'gif' };

function mediaTypesOf(value) {
  const types = list(value).map((t) => {
    const type = MEDIA_TYPES[t.toLowerCase()];
    if (!type) throw new JobInputError(`types must be photo, video or gif, not "${t}"`);
    return type;
  });
  return [...new Set(types)];
}

function engagementOf(post) {
  const m = post.metrics || {};
  return (m.likes || 0) + (m.retweets || 0) + (m.replies || 0) + (m.quotes || 0) + (m.bookmarks || 0);
}

/** The dominant media type of a post: video beats gif beats photo. */
function kindOf(post) {
  const types = new Set((post.media || []).map((m) => m.type));
  if (types.has('video')) return 'video';
  if (types.has('animated_gif')) return 'gif';
  return 'photo';
}

/** Performance of a set of media posts, overall and per media type. */
function mediaPerformance(posts, top) {
  const group = (items) => {
    const views = items.reduce((s, p) => s + (p.metrics?.views || 0), 0);
    const engagement = items.reduce((s, p) => s + engagementOf(p), 0);
    const n = items.length || 1;
    return {
      posts: items.length,
      views,
      engagement,
      likes: items.reduce((s, p) => s + (p.metrics?.likes || 0), 0),
      reposts: items.reduce((s, p) => s + (p.metrics?.retweets || 0), 0),
      avgViews: Math.round(views / n),
      avgEngagement: Math.round(engagement / n),
      engagementRate: views ? Number(((engagement / views) * 100).toFixed(2)) : null,
    };
  };
  const byType = {};
  for (const kind of ['photo', 'video', 'gif']) {
    const items = posts.filter((p) => kindOf(p) === kind);
    if (items.length) byType[kind] = group(items);
  }
  const ranked = [...posts].sort((a, b) => engagementOf(b) - engagementOf(a));
  const brief = (p) => ({ id: p.id, url: p.url, type: kindOf(p), createdAt: p.createdAt, text: p.text, metrics: p.metrics, engagement: engagementOf(p) });
  const best = Object.entries(byType).sort((a, b) => (b[1].engagementRate ?? 0) - (a[1].engagementRate ?? 0))[0];
  return {
    overall: group(posts),
    byType,
    bestType: best ? best[0] : null,
    top: ranked.slice(0, top).map(brief),
    bottom: ranked.slice(Math.max(top, ranked.length - top)).reverse().map(brief),
  };
}

/** Average media posts per week across the span the posts cover. */
function postsPerWeek(posts) {
  const times = posts.map((p) => Date.parse(p.createdAt)).filter(Number.isFinite);
  if (times.length < 2) return null;
  const weeks = (Math.max(...times) - Math.min(...times)) / (7 * 86_400_000);
  return weeks > 0 ? Number((times.length / weeks).toFixed(2)) : null;
}

function libraryOf(posts, types) {
  const wanted = new Set(types.map((t) => (t === 'gif' ? 'animated_gif' : t)));
  const items = posts
    .flatMap((post) => mediaItems(post).map((item) => ({ ...item, post })))
    .filter((item) => !wanted.size || wanted.has(item.mediaType))
    .map(({ post, ...item }) => ({
      tweetId: item.tweetId,
      tweetUrl: post.url,
      num: item.num,
      type: item.mediaType,
      url: item.url,
      width: item.width,
      height: item.height,
      createdAt: item.createdAt,
      text: post.text,
      metrics: post.metrics,
    }));
  const byType = {};
  for (const item of items) byType[item.type] = (byType[item.type] || 0) + 1;
  return { items, byType };
}

async function mediaLibrary(ctx) {
  const limit = intIn(ctx.config.limit, 50, 1, 500);
  const types = mediaTypesOf(ctx.config.types ?? ctx.config.type);
  const client = await ctx.http();
  const account = await subjectAccount(ctx, client);
  const posts = await mediaPosts(ctx, client, account.id, limit);
  if (!posts.length) throw new TwitterApiError(`@${account.username} has no media posts X would return`);
  const { items, byType } = libraryOf(posts, types);
  return { success: true, account, posts: posts.length, count: items.length, byType, items };
}

async function mediaAnalytics(ctx) {
  const top = intIn(ctx.config.top, 5, 1, 25);
  const client = await ctx.http();
  const ids = list(ctx.config.tweetIds).map(tweetIdOf);
  let posts;
  let account = null;
  const failures = [];

  if (ids.length) {
    if (ids.length > 100) throw new JobInputError('tweetIds takes at most 100 posts');
    posts = [];
    for (const [i, id] of ids.entries()) {
      ctx.throwIfCancelled();
      if (i > 0) await ctx.sleep(delayOf(ctx.config, 500));
      try {
        const tweet = await scrapeTweetById(client, id);
        if (tweet.media?.length) posts.push(withUrl(tweet));
        else failures.push({ tweetId: id, error: 'The post has no media' });
      } catch (err) {
        if (isFatal(err)) throw err;
        failures.push({ tweetId: id, error: err.message });
      }
    }
  } else {
    account = await subjectAccount(ctx, client);
    posts = await mediaPosts(ctx, client, account.id, intIn(ctx.config.limit, 50, 1, 500));
  }

  if (!posts.length) throw new TwitterApiError(`No media posts to analyse${failures.length ? `: ${failures.map((f) => `${f.tweetId} ${f.error}`).join('; ')}` : ''}`);
  return { success: true, account, analysed: posts.length, ...mediaPerformance(posts, top), failures };
}

async function mediaStudio(ctx) {
  const limit = intIn(ctx.config.limit, 50, 1, 200);
  const client = await ctx.http();
  const account = await viewer(client);
  const posts = await mediaPosts(ctx, client, account.id, limit);
  if (!posts.length) throw new TwitterApiError(`@${account.username} has no media posts X would return`);
  const { items, byType } = libraryOf(posts, []);
  const performance = mediaPerformance(posts, 5);
  return {
    success: true,
    account,
    library: { posts: posts.length, items: items.length, byType, recent: items.slice(0, 12) },
    performance,
    insights: {
      bestType: performance.bestType,
      lastPostedAt: posts[0]?.createdAt ?? null,
      postsPerWeek: postsPerWeek(posts),
    },
  };
}

// ---------------------------------------------------------------------------
// Batch download links
// ---------------------------------------------------------------------------

/** A tweet id from an id or a status URL. */
function tweetIdOf(value) {
  const text = String(value).trim();
  const fromUrl = text.match(/(?:twitter|x)\.com\/[^/]+\/status(?:es)?\/(\d+)/i);
  const id = fromUrl ? fromUrl[1] : text;
  if (!/^\d{5,25}$/.test(id)) throw new JobInputError(`"${text}" is not a tweet id or status URL`);
  return id;
}

/** The server's own proxy for twimg media, which sets a download filename and avoids CORS. */
function proxyPath(item) {
  const params = new URLSearchParams({ url: item.url, author: item.username || 'media', tweetId: item.tweetId });
  return `/api/video/download?${params}`;
}

function linkFor(item, template) {
  return {
    type: item.mediaType,
    num: item.num,
    url: item.url,
    filename: renderTemplate(template, item),
    downloadPath: proxyPath(item),
    width: item.width,
    height: item.height,
    bitrate: item.bitrate || null,
    altText: item.altText ?? null,
  };
}

/** Media for a tweet the session could not read, from the credential-free video lanes. */
async function extractedItems(tweetId) {
  const video = await extractTweetVideo(`https://x.com/i/status/${tweetId}`);
  const best = video.videos[0];
  return {
    source: video.source,
    items: [{ kind: 'media', url: best.url, mediaType: 'video', tweetId, username: video.username, userId: '0', createdAt: null, num: 1, width: best.width, height: best.height, bitrate: best.bitrate }],
    variants: video.videos,
  };
}

async function mediaDownloadBatch(ctx) {
  const { config } = ctx;
  const ids = [...new Set(list(config.tweetIds ?? config.tweetUrls ?? config.urls).map(tweetIdOf))];
  if (!ids.length) throw new JobInputError('tweetIds is required');
  const max = intIn(config.maxTweets, 100, 1, 200);
  const types = mediaTypesOf(config.types ?? config.type);
  const delayMs = delayOf(config, 1000);
  const template = String(config.template || DEFAULT_TEMPLATE);
  try {
    renderTemplate(template, { url: 'https://pbs.twimg.com/media/check.jpg', mediaType: 'photo', tweetId: '1', username: 'check' });
  } catch (err) {
    throw new JobInputError(`${err.message}. Keys: ${Object.keys(TEMPLATE_KEYS).join(', ')}`);
  }

  const client = await ctx.http();
  const results = [];
  for (const [i, tweetId] of ids.entries()) {
    if (i >= max) {
      results.push({ tweetId, status: 'skipped', reason: `maxTweets (${max}) reached` });
      continue;
    }
    ctx.throwIfCancelled();
    if (i > 0) await ctx.sleep(delayMs);

    let items;
    let source = 'session';
    let variants;
    let sessionError = null;
    try {
      items = mediaItems(await scrapeTweetById(client, tweetId));
    } catch (err) {
      if (isFatal(err)) throw err;
      sessionError = err.message;
      try {
        ({ items, source, variants } = await extractedItems(tweetId));
      } catch (fallbackErr) {
        results.push({ tweetId, status: 'failed', error: sessionError, fallbackError: fallbackErr.message });
        continue;
      }
    }

    const wanted = applyFilters(items, { types });
    results.push({
      tweetId,
      status: wanted.length ? 'ok' : 'no_media',
      source,
      ...(sessionError ? { sessionError } : {}),
      media: wanted.map((item) => linkFor(item, template)),
      ...(variants ? { variants } : {}),
    });
    ctx.progress(`${i + 1} of ${Math.min(ids.length, max)} posts resolved`, { done: i + 1 });
  }

  const count = (status) => results.filter((r) => r.status === status).length;
  const files = results.reduce((n, r) => n + (r.media?.length || 0), 0);
  if (!files && count('failed')) throw new TwitterApiError(`No post could be read: ${results.map((r) => `${r.tweetId}: ${r.error ?? r.status}`).join('; ')}`);
  return {
    success: true,
    template,
    summary: { requested: ids.length, ok: count('ok'), noMedia: count('no_media'), failed: count('failed'), skipped: count('skipped'), files },
    results,
  };
}

// ---------------------------------------------------------------------------
// Upload and captions
// ---------------------------------------------------------------------------


const MEDIA_LIMITS = {
  'image/jpeg': { category: 'tweet_image', max: 5 * 1024 * 1024 },
  'image/png': { category: 'tweet_image', max: 5 * 1024 * 1024 },
  'image/webp': { category: 'tweet_image', max: 5 * 1024 * 1024 },
  'image/gif': { category: 'tweet_gif', max: 15 * 1024 * 1024 },
  'video/mp4': { category: 'tweet_video', max: 512 * 1024 * 1024 },
  'video/quicktime': { category: 'tweet_video', max: 512 * 1024 * 1024 },
};
const MAX_FETCH_BYTES = 512 * 1024 * 1024;

/** Addresses a caller-supplied URL may not reach from this server. */
const PRIVATE = new BlockList();
for (const [net, bits] of [['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['224.0.0.0', 4], ['240.0.0.0', 4]]) {
  PRIVATE.addSubnet(net, bits, 'ipv4');
}
for (const [net, bits] of [['::', 128], ['::1', 128], ['fc00::', 7], ['fe80::', 10], ['ff00::', 8]]) {
  PRIVATE.addSubnet(net, bits, 'ipv6');
}

function isPrivateAddress(address) {
  const mapped = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mapped) return PRIVATE.check(mapped[1], 'ipv4');
  return PRIVATE.check(address, isIP(address) === 6 ? 'ipv6' : 'ipv4');
}

/** Refuse a URL that is not public http(s), so a job cannot probe this server's network. */
async function assertPublicUrl(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new JobInputError(`"${raw}" is not a URL`);
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new JobInputError('Only http and https URLs can be fetched');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = isIP(host) ? [host] : (await lookup(host, { all: true }).catch(() => [])).map((a) => a.address);
  if (!addresses.length) throw new JobInputError(`${url.hostname} does not resolve`);
  if (addresses.some(isPrivateAddress)) throw new JobInputError(`${url.hostname} is not a public address`);
  return url;
}

/**
 * Fetch a caller-supplied file, re-checking every redirect hop and stopping
 * at `maxBytes`.
 *
 * @returns {Promise<{ buffer: Buffer, contentType: string|null, url: string }>}
 */
async function fetchPublicFile(raw, maxBytes) {
  let url = await assertPublicUrl(raw);
  for (let hop = 0; hop < 4; hop++) {
    // Connect to the address that was just checked, not a fresh lookup of
    // the hostname (DNS rebinding).
    const res = await publicFetch(url, { signal: AbortSignal.timeout(120_000) }, { label: 'media URL', lookup }).catch((err) => {
      throw err instanceof PublicUrlError ? new JobInputError(err.message) : err;
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      url = await assertPublicUrl(new URL(res.headers.get('location'), url).href);
      continue;
    }
    if (!res.ok) throw new JobInputError(`${url.hostname} answered HTTP ${res.status} for the media URL`);
    const declared = Number(res.headers.get('content-length') || 0);
    if (declared > maxBytes) throw new JobInputError(`The file is ${declared} bytes; the limit is ${maxBytes}`);
    const chunks = [];
    let size = 0;
    for await (const chunk of res.body) {
      size += chunk.length;
      if (size > maxBytes) throw new JobInputError(`The file is larger than the ${maxBytes} byte limit`);
      chunks.push(Buffer.from(chunk));
    }
    return { buffer: Buffer.concat(chunks), contentType: res.headers.get('content-type')?.split(';')[0].trim() || null, url: url.href };
  }
  throw new JobInputError('The media URL redirected too many times');
}

/** X's chunked upload through the shared uploader, reporting each part. */
function chunkedUpload(ctx, client, buffer, mediaType, category) {
  return uploadChunked(client, buffer, mediaType, category, {
    onProgress: ({ phase, percent }) => ctx.progress(`Upload ${phase}: ${percent}%`, { phase, percent }),
  });
}

/** The bytes to upload, from `mediaUrl` or base64 `mediaBase64`. */
async function mediaSource(config) {
  const url = config.mediaUrl ?? config.url;
  const base64 = config.mediaBase64 ?? config.base64 ?? config.data;
  if (url) return fetchPublicFile(String(url), MAX_FETCH_BYTES);
  if (base64) {
    const text = String(base64).replace(/^data:([^;]+);base64,/, '');
    const declared = String(base64).match(/^data:([^;]+);base64,/)?.[1] ?? null;
    const buffer = Buffer.from(text, 'base64');
    if (!buffer.length) throw new JobInputError('mediaBase64 is empty or not base64');
    return { buffer, contentType: declared, url: null };
  }
  throw new JobInputError('mediaUrl (or mediaBase64) is required');
}

async function mediaUpload(ctx) {
  const { config } = ctx;
  const source = await mediaSource(config);
  const sniffed = mimeFromBuffer(source.buffer);
  const mediaType = String(config.mediaType || sniffed || source.contentType || '').toLowerCase();
  const limits = MEDIA_LIMITS[mediaType];
  if (!limits) throw new JobInputError(`Unsupported media type "${mediaType || 'unknown'}". X takes ${Object.keys(MEDIA_LIMITS).join(', ')}.`);
  if (source.buffer.length > limits.max) throw new JobInputError(`${mediaType} files are limited to ${limits.max} bytes; this one is ${source.buffer.length}`);
  const altText = config.altText ? String(config.altText) : '';
  if (altText.length > 1000) throw new JobInputError('altText must be 1000 characters or fewer');
  if (altText && limits.category === 'tweet_video') throw new JobInputError('X only takes alt text on images and GIFs');

  const client = await ctx.http();
  ctx.progress(`Uploading ${source.buffer.length} bytes of ${mediaType}`);
  const uploaded = await chunkedUpload(ctx, client, source.buffer, mediaType, limits.category);
  if (altText) {
    await client.request(`${REST_BASE}/1.1/media/metadata/create.json`, { method: 'POST', body: { media_id: uploaded.mediaId, alt_text: { text: altText } } });
  }
  return {
    success: true,
    ...uploaded,
    mediaType,
    category: limits.category,
    bytes: source.buffer.length,
    source: source.url ?? 'base64',
    altText: altText || null,
    usage: 'Attach mediaId to a post within the expiry window, e.g. POST /api/ai/posting/tweet {"mediaIds":["<mediaId>"]}',
  };
}

const SRT_CUE = /\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3}/;

/** WebVTT to SRT: drop the header and notes, number the cues, use comma decimals. */
function vttToSrt(vtt) {
  const blocks = vtt.replace(/\r\n/g, '\n').split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  const cues = [];
  for (const block of blocks) {
    const lines = block.split('\n');
    const timing = lines.findIndex((l) => l.includes('-->'));
    if (timing === -1) continue;
    const time = lines[timing]
      .replace(/(?:(\d{2,}):)?(\d{2}):(\d{2})\.(\d{3})/g, (_, h, m, sec, ms) => `${h ?? '00'}:${m}:${sec},${ms}`)
      .replace(/\s+(align|line|position|size|vertical|region):\S+/g, '');
    cues.push(`${cues.length + 1}\n${time}\n${lines.slice(timing + 1).join('\n')}`);
  }
  return `${cues.join('\n\n')}\n`;
}

async function captionsText(config) {
  let text = config.captions ?? config.srt ?? config.subtitles;
  const url = config.captionsUrl ?? config.srtUrl;
  if (!text && url) text = (await fetchPublicFile(String(url), 1024 * 1024)).buffer.toString('utf8');
  if (!text) throw new JobInputError('captions (SRT or WebVTT text) or captionsUrl is required');
  text = String(text).replace(/^\uFEFF/, '');
  if (/^WEBVTT/.test(text.trim())) text = vttToSrt(text);
  if (!SRT_CUE.test(text)) throw new JobInputError('captions must be SRT (00:00:01,000 --> 00:00:04,000) or WebVTT');
  return text;
}

/** "en" to "English"; the code itself when the runtime does not know it. */
function languageName(code) {
  try {
    return new Intl.DisplayNames(['en'], { type: 'language' }).of(code) || code;
  } catch {
    return code;
  }
}

async function mediaCaptions(ctx) {
  const mediaId = String(ctx.require('mediaId')).trim();
  if (!/^\d{5,25}$/.test(mediaId)) throw new JobInputError('mediaId is the numeric id an upload returned');
  const language = String(ctx.config.language || ctx.config.languageCode || 'en').trim().toLowerCase();
  if (!/^[a-z]{2,3}(-[a-z0-9]{2,8})?$/.test(language)) throw new JobInputError(`"${language}" is not a language code like en or pt-br`);
  const displayName = String(ctx.config.displayName || languageName(language));
  const srt = await captionsText(ctx.config);
  const cues = srt.split('\n').filter((l) => SRT_CUE.test(l)).length;

  const client = await ctx.http();
  ctx.progress(`Uploading ${cues} caption cues`);
  const subtitles = await chunkedUpload(ctx, client, Buffer.from(srt, 'utf8'), 'text/srt', 'subtitles');
  await client.request(`${REST_BASE}/1.1/media/subtitles/create.json`, {
    method: 'POST',
    body: {
      media_id: mediaId,
      media_category: 'TweetVideo',
      subtitle_info: { subtitles: [{ media_id: subtitles.mediaId, language_code: language.toUpperCase(), display_name: displayName }] },
    },
  });
  return { success: true, mediaId, subtitleMediaId: subtitles.mediaId, language, displayName, cues };
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export default {
  discoveryTrending: { run: discoveryTrending, concurrency: 3, description: 'Trending topics, with endpoint failover' },
  // Up to 12 snapshots an hour apart: hours, so it does not wait in a shared slot.
  discoveryTrendingMonitor: { run: discoveryTrendingMonitor, concurrency: 2, ownQueue: true, description: 'Snapshot trends over time and diff them' },
  discoverySaveSearch: { run: discoverySaveSearch, write: true, description: 'Save a search on the X account' },
  discoverySavedSearches: { run: discoverySavedSearches, write: true, description: 'List, run or delete saved searches' },
  discoveryTopics: { run: discoveryTopics, write: true, description: 'Suggested Topics; follow or unfollow Topics' },
  discoveryExplore: { run: discoveryExplore, concurrency: 3, description: 'Every Explore tab' },
  discoverySearch: { run: discoverySearch, concurrency: 3, description: 'Search posts or people' },
  discoveryForYou: { run: discoveryForYou, concurrency: 3, description: 'The For You timeline' },
  searchTweets: { run: searchTweetsJob, concurrency: 3, description: 'Search posts (dashboard)' },
  getTrends: { run: getTrends, concurrency: 3, description: 'Trends for an Explore category (dashboard)' },
  getExploreFeed: { run: getExploreFeed, concurrency: 3, description: 'One Explore tab (dashboard)' },
  timelineView: { run: timelineView, concurrency: 3, description: 'One screen of a home timeline' },
  timelineScroll: { run: timelineScroll, description: 'Scroll a home timeline and collect posts' },
  timelineCollect: { run: timelineCollect, description: 'Collect a home timeline with a summary' },
  timelineExport: { run: timelineExport, description: 'Export a home timeline as JSON or CSV' },
  timelineSwitchFeed: { run: timelineSwitchFeed, concurrency: 3, description: 'Read the For You or Following timeline' },
  mediaUpload: { run: mediaUpload, write: true, description: 'Upload an image, GIF or video to X' },
  mediaLibrary: { run: mediaLibrary, description: "An account's posted media" },
  mediaAnalytics: { run: mediaAnalytics, description: 'Media post performance by type' },
  mediaCaptions: { run: mediaCaptions, write: true, description: 'Attach SRT or WebVTT captions to an uploaded video' },
  mediaStudio: { run: mediaStudio, description: 'Media overview: library, performance, best type' },
  mediaDownloadBatch: { run: mediaDownloadBatch, description: 'Resolve download links for many posts' },
};
