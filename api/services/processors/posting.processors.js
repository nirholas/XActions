// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Posting processors: posts, replies, threads, polls, deletes, scheduled
 * posts, X Articles, RSS auto-posting, bookmark clearing, and the cleanup
 * family (bulk delete, unlike all, clear reposts, clear search history,
 * archive).
 *
 * Engines, in order of preference:
 *   - X's own HTTP API through `ctx.http()` for everything X exposes there
 *     (CreateTweet, DeleteTweet, CreateScheduledTweet, BookmarksAllDelete, the
 *     poll card service, the media upload service, the user timelines).
 *   - A logged-in browser through `ctx.page()` only for what X serves solely
 *     in its web app: the Articles editor and the recent-searches list.
 *
 * Scheduled posts are handed to X's own scheduler (CreateScheduledTweet), so X
 * publishes them at their time whether or not this server is running. Nothing
 * here keeps a timer.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { uploadChunked } from '../../../src/scrapers/twitter/http/media.js';
import { TwitterApiError } from '../../../src/scrapers/twitter/http/errors.js';
import dns from 'node:dns/promises';
import { PublicUrlError, publicFetch } from '../../utils/publicUrl.js';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { createTask, validate as isValidCron } from 'node-cron';
import { JobInputError } from './context.js';
import { postTweet } from '../../../src/scrapers/twitter/http/actions.js';
import { unlikeTweet, unretweet } from '../../../src/scrapers/twitter/http/engagement.js';
import {
  GRAPHQL,
  REST_BASE,
  buildGraphQLVariables,
  operationFeatures,
  resolveGraphQL,
} from '../../../src/scrapers/twitter/http/endpoints.js';
import { parseTweetData } from '../../../src/scrapers/twitter/http/parse/tweet.js';
import { findInstructions, flattenEntries } from '../../../src/scrapers/twitter/http/paging.js';
import { getXactionsHome } from '../../../src/mcp/action-caps.js';

// ---------------------------------------------------------------------------
// Limits
// ---------------------------------------------------------------------------

const X_WEB = 'https://x.com';
const MAX_TWEET = 280;
const MAX_TWEET_PREMIUM = 25_000;
const MAX_THREAD = 25;
const MAX_MEDIA = 4;
const POLL_LABEL_MAX = 25;
const POLL_MINUTES = { min: 5, max: 10_080, fallback: 1440 };
const DEFAULT_DELAY_MS = 2000;
const TIMELINE_CEILING = 3200; // X serves at most this many posts of a user timeline
const CARD_URL = 'https://caps.x.com/v2/cards/create.json';
const RSS_STORE_FILE = 'api-rss-feeds.json';
const RSS_MAX_BYTES = 5 * 1024 * 1024;
const RSS_SEEN_KEEP = 1000;
const MEDIA_LIMITS = {
  'image/jpeg': { category: 'tweet_image', maxBytes: 5 * 1024 * 1024 },
  'image/png': { category: 'tweet_image', maxBytes: 5 * 1024 * 1024 },
  'image/webp': { category: 'tweet_image', maxBytes: 5 * 1024 * 1024 },
  'image/gif': { category: 'tweet_gif', maxBytes: 15 * 1024 * 1024 },
  'video/mp4': { category: 'tweet_video', maxBytes: 100 * 1024 * 1024 },
};

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/**
 * X answered, and said no (duplicate post, too long, suspended, not found).
 * Retrying sends the same request and gets the same answer, and for a post
 * that X may have half-accepted a retry risks a duplicate, so it is final.
 */
export class XRejectedError extends Error {
  constructor(message, errors = []) {
    super(message);
    this.name = 'XRejectedError';
    this.retryable = false;
    this.xErrors = errors;
  }
}

const TRANSIENT = /rate limit|too many requests|over capacity|internal error|timeout|temporarily/i;

/** The `errors` array of an X response, or []. */
function xErrors(json) {
  return Array.isArray(json?.errors) ? json.errors.filter(Boolean) : [];
}

/**
 * Turn X's error list into the right error: transient trouble is retried by
 * the queue, a refusal is not.
 */
function rejection(what, errors) {
  const list = errors.length ? errors : [{ message: 'X answered without the expected result' }];
  const message = `X refused ${what}: ${list.map((e) => e.message || `code ${e.code}`).join('; ')}`;
  const detail = list.map(({ code, message: m }) => ({ code: code ?? null, message: m ?? null }));
  if (TRANSIENT.test(message)) return Object.assign(new Error(message), { xErrors: detail });
  return new XRejectedError(message, detail);
}

// ---------------------------------------------------------------------------
// Input helpers
// ---------------------------------------------------------------------------

/** A post id from an id or a status URL. */
function tweetIdFrom(value, label = 'tweetId') {
  if (value === undefined || value === null || value === '') return null;
  const raw = String(value).trim();
  const id = /^\d+$/.test(raw) ? raw : raw.match(/status(?:es)?\/(\d+)/)?.[1];
  if (!id) throw new JobInputError(`${label} must be a post id or a status URL, got "${raw}"`);
  return id;
}

/** Post text: present, a string, within X's longest (Premium) limit. */
function postText(value, label = 'text') {
  if (typeof value !== 'string' || !value.trim()) throw new JobInputError(`${label} is required`);
  if (value.length > MAX_TWEET_PREMIUM) {
    throw new JobInputError(`${label} is ${value.length} characters; X allows at most ${MAX_TWEET_PREMIUM}`);
  }
  return value;
}

/** A date from config, or null when absent. */
function dateFrom(value, label) {
  if (value === undefined || value === null || value === '') return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new JobInputError(`${label} is not a valid date: "${value}"`);
  return date;
}

/** An integer within bounds, or the fallback when absent. */
function boundedInt(value, { min, max, fallback }) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

/** Assert an IANA time zone name. */
function timeZoneOf(value) {
  const zone = value || 'UTC';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
  } catch {
    throw new JobInputError(`Unknown time zone "${zone}". Use an IANA name such as "America/New_York".`);
  }
  return zone;
}

/** A date rendered in a time zone, for the caller to read back. */
function localTime(date, timeZone) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    dateStyle: 'medium',
    timeStyle: 'long',
  }).format(date);
}

/** Keyword list from an array or a comma-separated string. */
function keywordList(value) {
  if (!value) return [];
  const list = Array.isArray(value) ? value : String(value).split(',');
  return list.map((k) => String(k).trim().toLowerCase()).filter(Boolean);
}

const summarize = (text, n = 100) => (text && text.length > n ? `${text.slice(0, n - 3)}...` : text || '');

// ---------------------------------------------------------------------------
// Pacing
// ---------------------------------------------------------------------------

/** Sleep between writes; false when the job was cancelled meanwhile. */
async function pause(ctx, ms) {
  try {
    await ctx.sleep(ms);
    return true;
  } catch (err) {
    if (err?.name === 'JobCancelledError') return false;
    throw err;
  }
}

/** A human-like gap: the base delay plus up to half again. */
const jittered = (ms) => ms + Math.floor(Math.random() * ms * 0.5);

// ---------------------------------------------------------------------------
// X HTTP helpers
// ---------------------------------------------------------------------------

/**
 * Run a GraphQL mutation by operation name (tracked or not) and fail on any
 * error X reports in the body.
 */
async function mutate(client, operationName, variables, what = operationName) {
  const { queryId } = resolveGraphQL(operationName);
  const json = await client.graphql(queryId, operationName, variables, {
    mutation: true,
    features: operationFeatures(operationName),
  });
  const errors = xErrors(json);
  if (errors.length) throw rejection(what, errors);
  return json?.data ?? {};
}

/** The post id inside a CreateTweet result, however deep X nested it. */
function tweetIdOf(result) {
  return result?.rest_id ?? result?.legacy?.id_str ?? result?.tweet?.rest_id ?? null;
}

/** A public URL for a post X just created. */
function postUrl(result, id) {
  const user = result?.core?.user_results?.result;
  const handle = user?.core?.screen_name ?? user?.legacy?.screen_name;
  return handle ? `${X_WEB}/${handle}/status/${id}` : `${X_WEB}/i/web/status/${id}`;
}

/**
 * Publish one post and insist X confirms it with an id.
 * @returns {Promise<{ id: string, url: string, text: string }>}
 */
async function publish(client, text, options = {}) {
  let result;
  try {
    result = await postTweet(client, text, { ...options, premium: text.length > MAX_TWEET });
  } catch (err) {
    // postTweet throws X's in-body refusal (a duplicate, a blocked reply) as a
    // TwitterApiError carrying the response; that refusal is final.
    const errors = xErrors(err?.data);
    if (err instanceof TwitterApiError && errors.length) throw rejection('the post', errors);
    throw err;
  }
  const id = tweetIdOf(result);
  if (!id) throw rejection('the post', xErrors(result));
  return { id, url: postUrl(result, id), text };
}

const viewers = new WeakMap();

/** The logged-in account: `{ id, username, name }`. */
async function viewerOf(client) {
  if (!viewers.has(client)) {
    viewers.set(
      client,
      (async () => {
        const me = await client.request(`${REST_BASE}/1.1/account/verify_credentials.json`);
        if (!me?.id_str) throw rejection('to identify the session', xErrors(me));
        return { id: me.id_str, username: me.screen_name, name: me.name ?? null };
      })(),
    );
  }
  return viewers.get(client);
}

/**
 * Page through a GraphQL timeline, yielding the raw tweet results of each
 * page. Stops at `maxItems`, at the end of the timeline, or on cancellation.
 */
async function* timelinePages(ctx, client, key, variables, maxItems) {
  const { queryId, operationName } = GRAPHQL[key];
  let cursor = null;
  let seen = 0;
  while (seen < maxItems && !ctx.cancelled()) {
    const vars = { ...variables, count: 20 };
    if (cursor) vars.cursor = cursor;
    const response = await client.graphql(queryId, operationName, vars);
    if (!response?.data && xErrors(response).length) throw rejection(`the ${operationName} timeline`, xErrors(response));
    const { entries, cursor: next } = flattenEntries(findInstructions(response));
    const raws = entries.map((e) => e.content?.itemContent?.tweet_results?.result).filter(Boolean);
    yield raws;
    seen += raws.length;
    if (!next || next === cursor || raws.length === 0) return;
    cursor = next;
  }
}

/** Unwrap TweetWithVisibilityResults. */
const innerTweet = (raw) => (raw?.__typename === 'TweetWithVisibilityResults' ? raw.tweet : raw);

/** Parse raw results into posts, dropping tombstones and duplicates. */
function parsePosts(raws, seenIds) {
  const posts = [];
  for (const raw of raws) {
    const post = parseTweetData(raw);
    if (!post?.id || post.tombstone || seenIds.has(post.id)) continue;
    seenIds.add(post.id);
    posts.push(post);
  }
  return posts;
}

/**
 * The viewer's own posts, newest first. With replies, the conversation
 * modules also carry other people's posts; only the viewer's are kept.
 */
async function ownPosts(ctx, client, me, { includeReplies = true, maxScan = TIMELINE_CEILING } = {}) {
  const key = includeReplies ? 'UserTweetsAndReplies' : 'UserTweets';
  const variables = { ...buildGraphQLVariables(key, { userId: me.id }), includePromotedContent: false };
  const ids = new Set();
  const posts = [];
  for await (const raws of timelinePages(ctx, client, key, variables, maxScan)) {
    for (const post of parsePosts(raws, ids)) {
      if (post.author?.id === me.id && posts.length < maxScan) posts.push(post);
    }
    ctx.progress(`Scanned ${posts.length} posts by @${me.username}`, { scanned: posts.length });
  }
  return posts;
}

const outcomeOf = (post) => ({
  id: post.id,
  text: summarize(post.text),
  createdAt: post.createdAt ?? null,
  url: `${X_WEB}/${post.author?.username || 'i/web'}/status/${post.id}`,
});

// ---------------------------------------------------------------------------
// Bulk runner
// ---------------------------------------------------------------------------

/**
 * Perform one write per item with the daily cap charged before each and a
 * human-like pause between them. A daily cap, an X rate limit, or a
 * cancellation stops the run and is reported with everything done so far;
 * a failure on one item is recorded and the run moves on. A dead session
 * fails the job.
 */
async function runBulk(ctx, run, items, { actionClass, act, delayMs, dryRun, verb, doneStatus }) {
  for (const item of items) {
    if (run.stopped) return;
    if (dryRun) {
      run.items.push({ ...item.outcome, status: `would-${verb}` });
      run.matched++;
      continue;
    }
    if (ctx.cancelled()) {
      run.stopped = { reason: 'cancelled' };
      return;
    }
    if (run.attempted > 0 && !(await pause(ctx, jittered(delayMs)))) {
      run.stopped = { reason: 'cancelled' };
      return;
    }
    try {
      await ctx.charge(actionClass);
    } catch (err) {
      if (err?.name !== 'ActionCapExceededError' || run.attempted === 0) throw err;
      run.stopped = { reason: 'daily-cap', actionClass, resetAt: err.resetAt?.toISOString?.() ?? null, message: err.message };
      return;
    }
    run.attempted++;
    run.matched++;
    try {
      await act(item);
      run.done++;
      run.items.push({ ...item.outcome, status: doneStatus });
    } catch (err) {
      if (err?.name === 'AuthError') throw err;
      run.failed++;
      run.items.push({ ...item.outcome, status: 'failed', error: err.message });
      if (err?.name === 'RateLimitError') {
        run.stopped = { reason: 'rate-limited', message: err.message };
        return;
      }
    }
    ctx.progress(`${verb}: ${run.done} done, ${run.failed} failed`, { done: run.done, failed: run.failed });
  }
}

const newRun = () => ({ matched: 0, attempted: 0, done: 0, failed: 0, items: [], stopped: null });

// ---------------------------------------------------------------------------
// Network outside X: RSS feeds and media the caller points at
// ---------------------------------------------------------------------------

const privateRanges = new net.BlockList();
for (const [addr, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16],
  ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['224.0.0.0', 3],
]) privateRanges.addSubnet(addr, prefix, 'ipv4');
for (const [addr, prefix] of [['::', 127], ['fc00::', 7], ['fe80::', 10], ['ff00::', 8]]) {
  privateRanges.addSubnet(addr, prefix, 'ipv6');
}

function isPrivateAddress(address) {
  const mapped = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)?.[1];
  if (mapped) return privateRanges.check(mapped, 'ipv4');
  return privateRanges.check(address, net.isIP(address) === 6 ? 'ipv6' : 'ipv4');
}

/** Refuse URLs that are not public http(s): the server must not fetch its own network. */
async function assertPublicUrl(raw, lookup) {
  let url;
  try {
    url = new URL(String(raw));
  } catch {
    throw new JobInputError(`Not a valid URL: "${raw}"`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new JobInputError(`Only http and https URLs can be fetched, got "${url.protocol}"`);
  }
  const host = url.hostname.replace(/^\[|\]$/g, '');
  let addresses;
  if (net.isIP(host)) {
    addresses = [host];
  } else {
    try {
      addresses = (await lookup(host, { all: true, verbatim: true })).map((a) => a.address);
    } catch {
      throw new JobInputError(`Could not resolve the host of ${url.href}`);
    }
  }
  if (!addresses.length || addresses.some(isPrivateAddress)) {
    throw new JobInputError(`${url.hostname} is not a public address`);
  }
  return url;
}

/**
 * GET a public URL, following redirects by hand so every hop is checked.
 * @returns {Promise<{ buffer: Buffer, contentType: string, url: string }>}
 */
async function download(deps, raw, { maxBytes, what }) {
  let url = await assertPublicUrl(raw, deps.lookup);
  for (let hop = 0; hop < 5; hop++) {
    // Pinned to the address that was just checked (DNS rebinding).
    const res = await publicFetch(url, {
      headers: { 'user-agent': 'XActions/1.0 (+https://xactions.app)' },
      signal: AbortSignal.timeout(30_000),
    }, { label: what, lookup: deps.lookup, fetch: deps.fetch }).catch((err) => {
      throw err instanceof PublicUrlError ? new JobInputError(err.message) : err;
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      url = await assertPublicUrl(new URL(res.headers.get('location'), url).href, deps.lookup);
      continue;
    }
    if (!res.ok) {
      const err = new Error(`Fetching ${what} at ${url.href} failed: HTTP ${res.status}`);
      if (res.status >= 400 && res.status < 500 && res.status !== 429) err.retryable = false;
      throw err;
    }
    const declared = Number(res.headers.get('content-length'));
    if (declared > maxBytes) throw new JobInputError(`${what} at ${url.href} is larger than ${maxBytes} bytes`);
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length > maxBytes) throw new JobInputError(`${what} at ${url.href} is larger than ${maxBytes} bytes`);
    const contentType = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    return { buffer, contentType, url: url.href };
  }
  throw new JobInputError(`${what} at ${raw} redirected too many times`);
}

// ---------------------------------------------------------------------------
// Media upload
// ---------------------------------------------------------------------------

/**
 * Upload one file to X (INIT, APPEND, FINALIZE, then wait for processing) with
 * the shared uploader. A refusal from X is final, so it is not retried.
 */
async function uploadToX(ctx, client, buffer, mediaType) {
  const { category } = MEDIA_LIMITS[mediaType];
  try {
    const { mediaId } = await uploadChunked(client, buffer, mediaType, category);
    return mediaId;
  } catch (err) {
    const status = err.status ?? err.statusCode;
    if (status >= 400 && status < 500 && status !== 429) {
      throw new XRejectedError(`X refused the media upload: HTTP ${status} ${summarize(JSON.stringify(err.data ?? ''), 200)}`);
    }
    if (/Media processing failed/.test(err.message)) throw new XRejectedError(err.message);
    throw err;
  }
}

/** Download each media URL and upload it to X; returns the media ids in order. */
async function uploadMediaUrls(ctx, deps, client, urls) {
  const ids = [];
  for (const [i, raw] of urls.entries()) {
    ctx.throwIfCancelled();
    ctx.progress(`Uploading media ${i + 1} of ${urls.length}`);
    const file = await download(deps, raw, { maxBytes: 100 * 1024 * 1024, what: `media ${i + 1}` });
    const limits = MEDIA_LIMITS[file.contentType];
    if (!limits) {
      throw new JobInputError(`media ${i + 1} (${file.url}) is ${file.contentType || 'of unknown type'}; X accepts JPEG, PNG, WebP, GIF and MP4`);
    }
    if (file.buffer.length > limits.maxBytes) {
      throw new JobInputError(`media ${i + 1} is ${file.buffer.length} bytes; X allows ${limits.maxBytes} for ${file.contentType}`);
    }
    ids.push(await uploadToX(ctx, client, file.buffer, file.contentType));
  }
  return ids;
}

function mediaUrlList(value) {
  if (value === undefined || value === null) return [];
  const list = Array.isArray(value) ? value : [value];
  if (list.length > MAX_MEDIA) throw new JobInputError(`X attaches at most ${MAX_MEDIA} media to a post, got ${list.length}`);
  return list.map((u) => String(u));
}

// ---------------------------------------------------------------------------
// Scheduled posts (X's own scheduler)
// ---------------------------------------------------------------------------

/** When a cron expression next fires in a time zone. */
function nextCronRun(expression, timeZone) {
  if (!isValidCron(expression)) throw new JobInputError(`Invalid cron expression "${expression}"`);
  const task = createTask(expression, () => {}, { timezone: timeZone });
  try {
    const [next] = task.getNextRuns(1);
    if (!next) throw new JobInputError(`Cron expression "${expression}" never fires`);
    return next;
  } finally {
    task.destroy();
  }
}

/** Hand a post to X's scheduler; X publishes it at `at`. */
async function scheduleOnX(ctx, { text, at, timeZone }) {
  if (at.getTime() <= Date.now() + 60_000) {
    throw new JobInputError(`scheduledAt must be at least a minute in the future, got ${at.toISOString()}`);
  }
  const client = await ctx.http();
  await ctx.charge('post');
  ctx.progress(`Scheduling the post on X for ${at.toISOString()}`);
  const data = await mutate(
    client,
    'CreateScheduledTweet',
    {
      post_tweet_request: {
        auto_populate_reply_metadata: false,
        status: text,
        exclude_reply_user_ids: [],
        media_ids: [],
      },
      execute_at: Math.floor(at.getTime() / 1000),
    },
    'the scheduled post',
  );
  const scheduledTweetId = data?.tweet?.rest_id ?? data?.create_scheduled_tweet?.id ?? null;
  if (!scheduledTweetId) throw rejection('the scheduled post', []);
  return {
    success: true,
    scheduledTweetId,
    scheduledAt: at.toISOString(),
    timezone: timeZone,
    scheduledAtLocal: localTime(at, timeZone),
    text,
    publishedBy: 'x',
    manage: `${X_WEB}/compose/post/unsent/scheduled`,
  };
}

/**
 * The account's pending scheduled posts, from X.
 * @param {import('../../../src/scrapers/twitter/http/client.js').TwitterHttpClient} client
 */
export async function listScheduledPosts(client) {
  const { queryId } = resolveGraphQL('FetchScheduledTweets');
  const res = await client.graphql(queryId, 'FetchScheduledTweets', { ascending: true }, {
    features: operationFeatures('FetchScheduledTweets'),
  });
  if (!res?.data && xErrors(res).length) throw rejection('the scheduled post list', xErrors(res));
  const list = res?.data?.viewer?.scheduled_tweet_list ?? [];
  return list.map((item) => {
    const at = Number(item.scheduling_info?.execute_at);
    return {
      scheduleId: item.rest_id,
      text: item.tweet_create_request?.status ?? '',
      scheduledAt: Number.isFinite(at) ? new Date(at < 1e12 ? at * 1000 : at).toISOString() : null,
      state: item.scheduling_info?.state ?? null,
      mediaIds: item.tweet_create_request?.media_ids ?? [],
    };
  });
}

/**
 * Cancel one scheduled post on X.
 * @param {import('../../../src/scrapers/twitter/http/client.js').TwitterHttpClient} client
 * @param {string} scheduleId
 */
export async function deleteScheduledPost(client, scheduleId) {
  await mutate(client, 'DeleteScheduledTweet', { scheduled_tweet_id: String(scheduleId) }, 'to cancel the scheduled post');
  return { scheduleId: String(scheduleId), removed: true };
}

// ---------------------------------------------------------------------------
// Polls
// ---------------------------------------------------------------------------

/** Create a poll card on X's card service; returns its card_uri. */
async function createPollCard(client, options, durationMinutes) {
  const cardData = {
    'twitter:card': `poll${options.length}choice_text_only`,
    'twitter:api:api:endpoint': '1',
    'twitter:long:duration_minutes': durationMinutes,
  };
  options.forEach((label, i) => {
    cardData[`twitter:string:choice${i + 1}_label`] = label;
  });
  const res = await client.request(CARD_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ card_data: JSON.stringify(cardData) }).toString(),
  });
  if (!res?.card_uri) throw rejection('the poll card', xErrors(res));
  return res.card_uri;
}

// ---------------------------------------------------------------------------
// Articles (browser: X serves the Articles editor only in its web app)
// ---------------------------------------------------------------------------

const ARTICLE = {
  title: ['[data-testid="articleTitle"]', 'textarea[placeholder*="title" i]', 'input[placeholder*="title" i]'],
  body: ['[data-testid="articleBody"]', '.public-DraftEditor-content[contenteditable="true"]', '[contenteditable="true"][role="textbox"]'],
  create: ['[data-testid="articleCreate"]', 'a[href="/compose/articles/new"]', '[data-testid="empty_state_button_text"]'],
  publish: ['[data-testid="articlePublish"]'],
  saveDraft: ['[data-testid="articleSaveDraft"]'],
  cover: ['[data-testid="articleCoverImage"]'],
  confirm: ['[data-testid="confirmationSheetConfirm"]'],
};
const EDIT_URL = /\/compose\/articles\/edit\/(\d+)/;

/** The first element any selector matches, polling until `timeoutMs`. */
async function firstMatch(ctx, page, selectors, timeoutMs = 0) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    for (const selector of selectors) {
      const el = await page.$(selector);
      if (el) return el;
    }
    if (Date.now() >= deadline) return null;
    await ctx.sleep(250);
  }
}

/** A clickable element whose label or text matches. */
async function byText(page, pattern, scope = 'button, [role="button"], a[role="link"], a') {
  for (const el of await page.$$(scope)) {
    const label = await el.evaluate((node) => (node.getAttribute('aria-label') || node.textContent || '').trim());
    if (pattern.test(label)) return el;
  }
  return null;
}

/** Replace the content of a focused field with `text`, paragraph by paragraph. */
async function typeInto(page, el, text) {
  await el.click();
  await page.keyboard.down('Control');
  await page.keyboard.press('KeyA');
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  const paragraphs = String(text).replace(/\r\n/g, '\n').split('\n');
  for (const [i, paragraph] of paragraphs.entries()) {
    if (paragraph) await page.keyboard.sendCharacter(paragraph);
    if (i < paragraphs.length - 1) await page.keyboard.press('Enter');
  }
}

/** Open the editor: an existing article by id, or a new draft. */
async function openArticleEditor(ctx, page, articleId) {
  if (articleId) {
    await page.goto(`${X_WEB}/compose/articles/edit/${articleId}`, { waitUntil: 'networkidle2', timeout: 45_000 });
  } else {
    await page.goto(`${X_WEB}/compose/articles`, { waitUntil: 'networkidle2', timeout: 45_000 });
    const found = await firstMatch(ctx, page, [...ARTICLE.title, ...ARTICLE.create], 8000);
    if (!found || !(await firstMatch(ctx, page, ARTICLE.title))) {
      const create = found || (await byText(page, /^(write|create|new article)$/i));
      if (!create) {
        throw new XRejectedError(
          'X did not offer the Articles editor to this account. Writing X Articles needs a Premium+ subscription.',
        );
      }
      await create.click();
    }
  }
  const title = await firstMatch(ctx, page, ARTICLE.title, 20_000);
  if (!title) throw new XRejectedError('The X Articles editor did not load. Check that the account can write Articles (Premium+).');
  return title;
}

/** Download the cover image and hand it to the editor's file input. */
async function setArticleCover(ctx, deps, page, coverImageUrl) {
  const file = await download(deps, coverImageUrl, { maxBytes: 5 * 1024 * 1024, what: 'the cover image' });
  if (!MEDIA_LIMITS[file.contentType]?.category.startsWith('tweet_image')) {
    throw new JobInputError(`The cover image must be JPEG, PNG or WebP, got ${file.contentType || 'an unknown type'}`);
  }
  const ext = file.contentType.split('/')[1];
  const tmp = path.join(os.tmpdir(), `xactions-cover-${process.pid}-${Date.now()}.${ext}`);
  await fs.writeFile(tmp, file.buffer);
  try {
    const trigger = await firstMatch(ctx, page, ARTICLE.cover, 2000);
    if (trigger) await trigger.click();
    const input = await firstMatch(ctx, page, ['input[type="file"]'], 5000);
    if (!input) throw new XRejectedError('The X Articles editor offered no way to upload a cover image.');
    await input.uploadFile(tmp);
    await ctx.sleep(3000);
    const apply = await byText(page, /^(apply|save|done)$/i, '[role="dialog"] button, [role="dialog"] [role="button"]');
    if (apply) await apply.click();
  } finally {
    await fs.rm(tmp, { force: true });
  }
}

/**
 * Write an X Article in the web editor, as a draft or published.
 * @returns {Promise<object>} the article id, its state and where to find it
 */
async function writeArticle(ctx, deps, { articleId, title, content, coverImageUrl, publish: shouldPublish }) {
  const page = await ctx.page();
  ctx.progress(articleId ? `Opening article ${articleId}` : 'Opening the X Articles editor');
  const titleEl = await openArticleEditor(ctx, page, articleId);

  if (title) await typeInto(page, titleEl, title);
  if (content) {
    const body = await firstMatch(ctx, page, ARTICLE.body, 10_000);
    if (!body) throw new XRejectedError('The X Articles editor has no body field.');
    ctx.progress('Writing the article body');
    await typeInto(page, body, content);
  }
  if (coverImageUrl) {
    ctx.progress('Setting the cover image');
    await setArticleCover(ctx, deps, page, coverImageUrl);
  }

  const id = page.url().match(EDIT_URL)?.[1] ?? articleId;
  if (!id) throw new XRejectedError('X did not open a draft for the article, so nothing was saved.');
  const editUrl = `${X_WEB}/compose/articles/edit/${id}`;
  const words = content ? content.trim().split(/\s+/).length : null;

  if (!shouldPublish) {
    const save = await firstMatch(ctx, page, ARTICLE.saveDraft, 2000);
    if (save) await save.click();
    await ctx.sleep(2000);
    return { success: true, articleId: id, status: 'draft', title: title ?? null, wordCount: words, url: editUrl, coverImage: Boolean(coverImageUrl) };
  }

  await ctx.charge('post');
  ctx.progress('Publishing the article');
  const button = (await firstMatch(ctx, page, ARTICLE.publish, 5000)) || (await byText(page, /^publish$/i));
  if (!button) throw new XRejectedError('The X Articles editor has no Publish button for this account.');
  await button.click();
  const confirm = (await firstMatch(ctx, page, ARTICLE.confirm, 5000))
    || (await byText(page, /^publish$/i, '[role="dialog"] button, [role="dialog"] [role="button"]'));
  if (confirm) await confirm.click();

  const deadline = Date.now() + 30_000;
  while (EDIT_URL.test(page.url()) && Date.now() < deadline) await ctx.sleep(500);
  if (EDIT_URL.test(page.url()) && !(await page.$('[data-testid="toast"]'))) {
    throw new XRejectedError(`X did not confirm that article ${id} was published. It is saved as a draft at ${editUrl}.`);
  }
  const landed = page.url();
  return {
    success: true,
    articleId: id,
    status: 'published',
    title: title ?? null,
    wordCount: words,
    url: EDIT_URL.test(landed) ? `${X_WEB}/i/article/${id}` : landed,
    coverImage: Boolean(coverImageUrl),
    publishedAt: new Date().toISOString(),
  };
}

/** Article fields from a job config (the routes send body or content). */
function articleInput(ctx, { publish: shouldPublish, needsContent }) {
  const c = ctx.config;
  const articleId = c.articleId ? String(c.articleId).match(/(\d+)/)?.[1] : null;
  if (c.articleId && !articleId) throw new JobInputError(`articleId must be an article id, got "${c.articleId}"`);
  const title = c.title === undefined || c.title === null ? null : String(c.title).trim();
  const content = c.content ?? c.body ?? null;
  if (!articleId || needsContent) {
    if (!title) throw new JobInputError('title is required');
    if (typeof content !== 'string' || !content.trim()) throw new JobInputError('content (or body) is required');
  }
  if (title && title.length > 100) throw new JobInputError(`title is ${title.length} characters; X allows 100`);
  return { articleId, title, content, coverImageUrl: c.coverImageUrl || null, publish: shouldPublish };
}

/** The viewer's published articles, newest first, with their metrics. */
async function fetchArticles(ctx, client, limit) {
  const me = await viewerOf(client);
  const ids = new Set();
  const articles = [];
  const variables = { userId: me.id, includePromotedContent: false, withVoice: true };
  for await (const raws of timelinePages(ctx, client, 'UserArticlesTweets', variables, limit)) {
    for (const raw of raws) {
      const post = parsePosts([raw], ids)[0];
      if (!post || articles.length >= limit) continue;
      const article = innerTweet(raw)?.article?.article_results?.result ?? null;
      articles.push({
        articleId: article?.rest_id ?? null,
        tweetId: post.id,
        title: article?.title ?? summarize(post.text, 80),
        preview: article?.preview_text ?? null,
        url: article?.rest_id ? `${X_WEB}/i/article/${article.rest_id}` : `${X_WEB}/${me.username}/status/${post.id}`,
        publishedAt: post.createdAt ?? null,
        metrics: post.metrics,
      });
    }
  }
  if (articles.length === 0) {
    throw new XRejectedError(`X returned no published articles for @${me.username}. The account has not published any, or X did not serve its Articles tab.`);
  }
  return { me, articles };
}

function articleStats(a) {
  const m = a.metrics || {};
  const engagements = (m.likes || 0) + (m.retweets || 0) + (m.replies || 0) + (m.quotes || 0) + (m.bookmarks || 0);
  return {
    ...a,
    engagements,
    engagementRate: m.views ? Number(((engagements / m.views) * 100).toFixed(2)) : null,
  };
}

// ---------------------------------------------------------------------------
// RSS feeds, stored per owner under $XACTIONS_HOME
// ---------------------------------------------------------------------------

let rssLock = Promise.resolve();

/** Read-modify-write the feed store under an in-process lock, atomically on disk. */
function withFeedStore(mutateStore) {
  const run = rssLock.then(async () => {
    const dir = getXactionsHome();
    const file = path.join(dir, RSS_STORE_FILE);
    let store = { version: 1, owners: {} };
    try {
      store = JSON.parse(await fs.readFile(file, 'utf8'));
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
    store.owners ||= {};
    const result = await mutateStore(store);
    await fs.mkdir(dir, { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(store, null, 2));
    await fs.rename(tmp, file);
    return result;
  });
  rssLock = run.catch(() => {});
  return run;
}

function requireOwner(ctx) {
  if (!ctx.ownerKey) throw new JobInputError('This operation stores a feed for its caller and needs a session to know who that is.');
  return ctx.ownerKey;
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function decodeText(raw) {
  return String(raw || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m)
    .replace(/\s+/g, ' ')
    .trim();
}

function tagText(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i'));
  return match ? decodeText(match[1]) : '';
}

/** Parse RSS 2.0 or Atom into items. */
export function parseFeed(xml) {
  const channelTitle = tagText(xml.replace(/<(item|entry)[\s>][\s\S]*$/i, ''), 'title');
  const items = [];
  for (const block of xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || []) {
    items.push({
      title: tagText(block, 'title'),
      link: tagText(block, 'link'),
      description: tagText(block, 'description'),
      author: tagText(block, 'author') || tagText(block, 'dc:creator'),
      publishedAt: tagText(block, 'pubDate') || tagText(block, 'dc:date'),
      guid: tagText(block, 'guid'),
    });
  }
  if (items.length === 0) {
    for (const block of xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || []) {
      const href = block.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i)?.[1]
        || block.match(/<link[^>]*href=["']([^"']+)["']/i)?.[1];
      items.push({
        title: tagText(block, 'title'),
        link: href ? decodeText(href) : tagText(block, 'link'),
        description: tagText(block, 'summary') || tagText(block, 'content'),
        author: tagText(block, 'name'),
        publishedAt: tagText(block, 'published') || tagText(block, 'updated'),
        guid: tagText(block, 'id'),
      });
    }
  }
  return {
    title: channelTitle,
    items: items
      .filter((item) => item.title || item.link)
      .map((item) => ({ ...item, key: item.guid || item.link || item.title })),
  };
}

/** Render a feed item through the template, fitting it into one post. */
export function renderFeedPost(template, item) {
  const fill = (title) =>
    template
      .replace(/\{\{\s*title\s*\}\}/g, title)
      .replace(/\{\{\s*(url|link)\s*\}\}/g, item.link || '')
      .replace(/\{\{\s*description\s*\}\}/g, summarize(item.description, 200))
      .replace(/\{\{\s*author\s*\}\}/g, item.author || '')
      .replace(/\{\{\s*date\s*\}\}/g, item.publishedAt || '');
  const full = fill(item.title || '').trim();
  if (full.length <= MAX_TWEET) return full;
  // Measured untrimmed, so the space between title and link is counted.
  const room = MAX_TWEET - fill('').length - 3;
  return room > 10 ? fill(`${(item.title || '').slice(0, room)}...`).trim() : full.slice(0, MAX_TWEET);
}

async function fetchFeed(deps, url) {
  const file = await download(deps, url, { maxBytes: RSS_MAX_BYTES, what: 'the feed' });
  const feed = parseFeed(file.buffer.toString('utf8'));
  if (feed.items.length === 0) {
    throw new JobInputError(`${file.url} has no RSS or Atom items. Check that the URL is a feed, not a web page.`);
  }
  return feed;
}

function draftsOf(template, items) {
  return items.map((item) => ({
    text: renderFeedPost(template, item),
    title: item.title,
    link: item.link,
    publishedAt: item.publishedAt || null,
  }));
}

/** Oldest first, so auto-posts go out in the order the feed published them. */
function chronological(items) {
  return [...items].sort((a, b) => (Date.parse(a.publishedAt) || 0) - (Date.parse(b.publishedAt) || 0));
}

async function postNewFeedItems(ctx, deps, feed, fetched) {
  const owner = requireOwner(ctx);
  const seen = new Set(feed.seen);
  const fresh = chronological(fetched.items.filter((item) => !seen.has(item.key)));
  const dayAgo = Date.now() - 86_400_000;
  const postedToday = (feed.posts || []).filter((p) => Date.parse(p.at) > dayAgo).length;
  const quota = Math.max(0, feed.maxPerDay - postedToday);
  const posted = [];
  const failed = [];
  const client = fresh.length && quota ? await ctx.http() : null;

  for (const item of fresh.slice(0, quota)) {
    if (ctx.cancelled()) break;
    if (posted.length + failed.length > 0 && !(await pause(ctx, jittered(deps.minDelayMs * 2)))) break;
    const text = renderFeedPost(feed.postTemplate, item);
    try {
      await ctx.charge('post');
    } catch (err) {
      if (err?.name === 'ActionCapExceededError' && posted.length) break;
      throw err;
    }
    try {
      const post = await publish(client, text);
      posted.push({ key: item.key, title: item.title, link: item.link, tweetId: post.id, url: post.url });
      await withFeedStore((store) => {
        const record = store.owners[owner]?.[feed.id];
        if (!record) return;
        record.seen = [...record.seen, item.key].slice(-RSS_SEEN_KEEP);
        record.posts = [...(record.posts || []).filter((p) => Date.parse(p.at) > dayAgo), { at: new Date().toISOString(), key: item.key, tweetId: post.id }];
      });
    } catch (err) {
      if (err?.name === 'AuthError') throw err;
      failed.push({ key: item.key, title: item.title, link: item.link, error: err.message });
      if (err?.name === 'RateLimitError') break;
    }
  }
  const handled = new Set([...posted, ...failed].map((p) => p.key));
  const strip = ({ key, ...rest }) => rest;
  return {
    fresh,
    posted: posted.map(strip),
    failed: failed.map(strip),
    waiting: fresh.filter((item) => !handled.has(item.key)),
    remainingToday: Math.max(0, quota - posted.length),
  };
}

// ---------------------------------------------------------------------------
// Search history (browser: X keeps recent searches only in the web app)
// ---------------------------------------------------------------------------

const RECENT_SEARCH = '[data-testid="typeaheadRecentSearchesItem"], [data-testid="TypeaheadListItem"]';

async function openRecentSearches(ctx, page) {
  const input = await firstMatch(ctx, page, ['[data-testid="SearchBox_Search_Input"]'], 15_000);
  if (!input) throw new XRejectedError('X did not show its search box, so recent searches could not be opened.');
  await input.click();
  await ctx.sleep(1500);
  return (await page.$$(RECENT_SEARCH)).length;
}

// ---------------------------------------------------------------------------
// Processors
// ---------------------------------------------------------------------------

/**
 * Build the posting processors.
 *
 * @param {object} [deps]
 * @param {typeof fetch} [deps.fetch] - fetch for URLs outside X (feeds, media, cover images)
 * @param {(host: string, opts: object) => Promise<Array<{address: string}>>} [deps.lookup] - DNS lookup
 * @param {number} [deps.minDelayMs=1000] - floor under every pause between writes
 */
/**
 * What a saved feed would post next: its unseen items, rendered with the
 * feed's own template. For POST /api/ai/schedule/rss-drafts.
 *
 * @param {string} owner - ownerKey the feed was saved under
 * @param {string} feedId
 * @param {{ limit?: number, fetch?: typeof fetch, lookup?: Function }} [options]
 * @returns {Promise<object|null>} null when the owner has no such feed
 */
export async function feedDrafts(owner, feedId, options = {}) {
  const feed = await withFeedStore((store) => store.owners[owner]?.[feedId] ?? null);
  if (!feed) return null;
  const env = { fetch: options.fetch || globalThis.fetch, lookup: options.lookup || dns.lookup };
  const fetched = await fetchFeed(env, feed.url);
  const seen = new Set(feed.seen || []);
  const unseen = fetched.items.filter((item) => !seen.has(item.key));
  return {
    feedId,
    url: feed.url,
    title: fetched.title || feed.title,
    unseenItems: unseen.length,
    drafts: draftsOf(feed.postTemplate, unseen).slice(0, options.limit ?? 10),
  };
}

/**
 * Delete a saved feed.
 * @param {string} owner
 * @param {string} feedId
 * @returns {Promise<boolean>} whether it existed
 */
export function removeFeed(owner, feedId) {
  return withFeedStore((store) => {
    const mine = store.owners[owner];
    if (!mine?.[feedId]) return false;
    delete mine[feedId];
    return true;
  });
}

export function createPostingProcessors(deps = {}) {
  const env = {
    fetch: deps.fetch || globalThis.fetch,
    lookup: deps.lookup || dns.lookup,
    minDelayMs: deps.minDelayMs ?? 1000,
  };
  const delayOf = (value) => Math.max(parseInt(value, 10) || DEFAULT_DELAY_MS, env.minDelayMs);

  /** Delete posts (or undo reposts) chosen by id or by filter. */
  async function deletePosts(ctx) {
    const c = ctx.config;
    const dryRun = Boolean(c.dryRun);
    const delayMs = delayOf(c.delayMs);
    const maxDeletes = boundedInt(c.maxDeletes ?? c.limit, { min: 1, max: TIMELINE_CEILING, fallback: 100 });
    const client = await ctx.http();
    const run = newRun();

    const ids = Array.isArray(c.tweetIds) ? c.tweetIds : c.tweetIds ? [c.tweetIds] : [];
    let targets;
    let scanned = null;
    let filters = null;
    if (ids.length) {
      const unique = [...new Set(ids.map((id) => tweetIdFrom(id, 'tweetIds entry')))];
      if (unique.length > TIMELINE_CEILING) throw new JobInputError(`At most ${TIMELINE_CEILING} tweetIds per job`);
      targets = unique.map((id) => ({ id, outcome: { id, url: `${X_WEB}/i/web/status/${id}` } }));
    } else {
      const before = dateFrom(c.beforeDate ?? c.before, 'beforeDate');
      const after = dateFrom(c.afterDate ?? c.after, 'afterDate');
      const keywords = keywordList(c.keywords ?? c.contains);
      const keep = keywordList(c.excludeKeywords);
      const maxLikes = c.maxLikes === undefined || c.maxLikes === null ? null : Number(c.maxLikes);
      const includeRetweets = Boolean(c.includeRetweets);
      filters = {
        beforeDate: before?.toISOString() ?? null,
        afterDate: after?.toISOString() ?? null,
        keywords,
        excludeKeywords: keep,
        maxLikes,
        includeReplies: c.includeReplies !== false,
        includeRetweets,
      };
      const me = await viewerOf(client);
      const posts = await ownPosts(ctx, client, me, {
        includeReplies: filters.includeReplies,
        maxScan: boundedInt(c.scanLimit, { min: 20, max: TIMELINE_CEILING, fallback: TIMELINE_CEILING }),
      });
      scanned = posts.length;
      targets = posts
        .filter((p) => {
          if (p.isRetweet && !includeRetweets) return false;
          const created = p.createdAt ? Date.parse(p.createdAt) : NaN;
          if (before && !(created < before.getTime())) return false;
          if (after && !(created > after.getTime())) return false;
          const text = (p.text || '').toLowerCase();
          if (keywords.length && !keywords.some((k) => text.includes(k))) return false;
          if (keep.some((k) => text.includes(k))) return false;
          if (maxLikes !== null && !p.isRetweet && (p.metrics?.likes ?? 0) > maxLikes) return false;
          return true;
        })
        .slice(0, maxDeletes)
        .map((p) => ({ id: p.id, repostOf: p.isRetweet ? p.retweetOf?.id : null, outcome: outcomeOf(p) }));
    }

    await runBulk(ctx, run, targets, {
      actionClass: 'delete',
      delayMs,
      dryRun,
      verb: 'delete',
      doneStatus: 'deleted',
      act: (t) => (t.repostOf ? unretweet(client, t.repostOf) : mutate(client, 'DeleteTweet', { tweet_id: t.id, dark_request: false }, `to delete post ${t.id}`)),
    });

    return {
      success: true,
      dryRun,
      ...(filters ? { filters, scanned } : {}),
      matched: targets.length,
      deleted: run.done,
      failed: run.failed,
      stopped: run.stopped,
      items: run.items,
    };
  }

  return {
    postTweet: {
      write: true,
      description: 'Publish one post, optionally a reply, a quote or with media',
      run: async (ctx) => {
        const c = ctx.config;
        const text = postText(c.text);
        const replyTo = tweetIdFrom(c.replyToTweetId ?? c.replyTo, 'replyTo');
        const quoteTweetId = tweetIdFrom(c.quoteTweetId, 'quoteTweetId');
        const mediaUrls = mediaUrlList(c.mediaUrls);
        const client = await ctx.http();
        const mediaIds = await uploadMediaUrls(ctx, env, client, mediaUrls);
        await ctx.charge(replyTo ? 'reply' : 'post');
        ctx.progress('Posting');
        const post = await publish(client, text, { replyTo, quoteTweetId, mediaIds });
        return {
          success: true,
          tweetId: post.id,
          url: post.url,
          text,
          replyTo,
          quoteTweetId,
          mediaIds,
          postedAt: new Date().toISOString(),
        };
      },
    },

    replyTweet: {
      write: true,
      description: 'Reply to a post',
      run: async (ctx) => {
        const text = postText(ctx.config.text);
        const tweetId = tweetIdFrom(ctx.require('tweetId'));
        const client = await ctx.http();
        await ctx.charge('reply');
        ctx.progress(`Replying to ${tweetId}`);
        const post = await publish(client, text, { replyTo: tweetId });
        return { success: true, tweetId: post.id, url: post.url, text, inReplyTo: tweetId, postedAt: new Date().toISOString() };
      },
    },

    postThread: {
      write: true,
      description: 'Publish a thread of self-replies',
      run: async (ctx) => {
        const raw = ctx.require('tweets');
        if (!Array.isArray(raw) || raw.length < 2) throw new JobInputError('tweets must be an array of at least 2 posts');
        if (raw.length > MAX_THREAD) throw new JobInputError(`A thread can have at most ${MAX_THREAD} posts, got ${raw.length}`);
        const texts = raw.map((t, i) => postText(typeof t === 'string' ? t : t?.text, `tweets[${i}]`));
        const delayMs = delayOf(ctx.config.delayMs);
        const client = await ctx.http();
        await ctx.charge('post', texts.length);

        const posted = [];
        for (const [i, text] of texts.entries()) {
          if (i > 0 && !(await pause(ctx, jittered(delayMs)))) {
            return { success: false, cancelled: true, threadUrl: posted[0]?.url ?? null, posted, total: texts.length };
          }
          try {
            posted.push(await publish(client, text, { replyTo: posted[i - 1]?.id }));
          } catch (err) {
            if (!posted.length) throw err;
            throw new XRejectedError(
              `Thread stopped at post ${i + 1} of ${texts.length}: ${err.message}. Already published: ${posted.map((p) => p.id).join(', ')}`,
              err.xErrors,
            );
          }
          ctx.progress(`Posted ${i + 1} of ${texts.length}`, { posted: i + 1, total: texts.length });
        }
        return {
          success: true,
          threadId: posted[0].id,
          threadUrl: posted[0].url,
          count: posted.length,
          tweets: posted.map((p) => ({ tweetId: p.id, url: p.url, text: p.text })),
          postedAt: new Date().toISOString(),
        };
      },
    },

    createPoll: {
      write: true,
      description: 'Publish a poll',
      run: async (ctx) => {
        const question = postText(ctx.config.question, 'question');
        if (question.length > MAX_TWEET) throw new JobInputError(`question is ${question.length} characters; a poll post allows ${MAX_TWEET}`);
        const options = ctx.require('options');
        if (!Array.isArray(options) || options.length < 2 || options.length > 4) {
          throw new JobInputError('options must be 2 to 4 choices');
        }
        const labels = options.map((o, i) => {
          const label = String(o ?? '').trim();
          if (!label || label.length > POLL_LABEL_MAX) {
            throw new JobInputError(`options[${i}] must be 1 to ${POLL_LABEL_MAX} characters`);
          }
          return label;
        });
        const durationMinutes = boundedInt(ctx.config.durationMinutes, POLL_MINUTES);
        const client = await ctx.http();
        await ctx.charge('post');
        ctx.progress('Creating the poll card');
        const cardUri = await createPollCard(client, labels, durationMinutes);
        const { queryId, operationName } = GRAPHQL.CreateTweet;
        const json = await client.graphql(queryId, operationName, {
          tweet_text: question,
          card_uri: cardUri,
          dark_request: false,
          media: { media_entities: [], possibly_sensitive: false },
          semantic_annotation_ids: [],
        }, { mutation: true });
        const result = json?.data?.create_tweet?.tweet_results?.result;
        const id = tweetIdOf(result);
        if (!id) throw rejection('the poll', xErrors(json));
        return {
          success: true,
          tweetId: id,
          url: postUrl(result, id),
          question,
          options: labels,
          durationMinutes,
          endsAt: new Date(Date.now() + durationMinutes * 60_000).toISOString(),
          cardUri,
        };
      },
    },

    deleteTweet: {
      write: true,
      description: 'Delete one post',
      run: async (ctx) => {
        const tweetId = tweetIdFrom(ctx.require('tweetId'));
        const client = await ctx.http();
        await ctx.charge('delete');
        ctx.progress(`Deleting ${tweetId}`);
        await mutate(client, 'DeleteTweet', { tweet_id: tweetId, dark_request: false }, `to delete post ${tweetId}`);
        return { success: true, tweetId, deleted: true, deletedAt: new Date().toISOString() };
      },
    },

    scheduleTweet: {
      write: true,
      description: 'Schedule a post on X for a later time',
      run: async (ctx) => {
        const text = postText(ctx.config.text);
        const at = dateFrom(ctx.require('scheduledAt'), 'scheduledAt');
        return scheduleOnX(ctx, { text, at, timeZone: timeZoneOf(ctx.config.timezone) });
      },
    },

    schedulePost: {
      write: true,
      description: 'Schedule a post on X for a later time',
      run: async (ctx) => {
        const text = postText(ctx.config.text);
        const at = dateFrom(ctx.require('scheduledAt'), 'scheduledAt');
        return scheduleOnX(ctx, { text, at, timeZone: timeZoneOf(ctx.config.timezone) });
      },
    },

    scheduleAdd: {
      write: true,
      description: 'Schedule a post at a time or at the next run of a cron expression',
      run: async (ctx) => {
        const c = ctx.config;
        const text = postText(c.text);
        const timeZone = timeZoneOf(c.timezone);
        if (c.repeat) {
          throw new JobInputError('Recurring posts are not available: X schedules one post per time. Send a single scheduledAt or cron run.');
        }
        let at = dateFrom(c.scheduledAt, 'scheduledAt');
        if (!at && !c.cron) throw new JobInputError('scheduledAt or cron is required');
        if (!at) at = nextCronRun(String(c.cron), timeZone);
        const result = await scheduleOnX(ctx, { text, at, timeZone });
        return { ...result, cron: c.cron || null };
      },
    },

    publishArticle: {
      write: true,
      description: 'Write an X Article and save it as a draft or publish it',
      run: (ctx) => writeArticle(ctx, env, articleInput(ctx, { publish: Boolean(ctx.config.publish), needsContent: true })),
    },

    articleCompose: {
      write: true,
      description: 'Compose an X Article as a draft',
      run: (ctx) => writeArticle(ctx, env, articleInput(ctx, { publish: false, needsContent: true })),
    },

    articleDraft: {
      write: true,
      description: 'Save an X Article draft, new or existing',
      run: (ctx) => writeArticle(ctx, env, articleInput(ctx, { publish: false, needsContent: !ctx.config.articleId })),
    },

    articlePublish: {
      write: true,
      description: 'Publish an X Article, new or an existing draft',
      run: (ctx) => writeArticle(ctx, env, articleInput(ctx, { publish: true, needsContent: !ctx.config.articleId })),
    },

    articleList: {
      description: 'List the account\'s published X Articles',
      concurrency: 3,
      run: async (ctx) => {
        const limit = boundedInt(ctx.config.limit, { min: 1, max: 200, fallback: 50 });
        const { me, articles } = await fetchArticles(ctx, await ctx.http(), limit);
        return { success: true, account: me.username, count: articles.length, articles };
      },
    },

    articleAnalytics: {
      description: 'Views and engagement for the account\'s X Articles',
      concurrency: 3,
      run: async (ctx) => {
        const limit = boundedInt(ctx.config.limit, { min: 1, max: 200, fallback: 100 });
        const want = ctx.config.articleId ?? ctx.config.tweetId ?? null;
        const { me, articles } = await fetchArticles(ctx, await ctx.http(), limit);
        const picked = want ? articles.filter((a) => a.articleId === String(want) || a.tweetId === String(want)) : articles;
        if (!picked.length) throw new JobInputError(`@${me.username} has no published article ${want} among the latest ${articles.length}`);
        const stats = picked.map(articleStats).sort((a, b) => (b.metrics.views || 0) - (a.metrics.views || 0));
        const sum = (k) => stats.reduce((n, a) => n + (a.metrics[k] || 0), 0);
        const totals = {
          views: sum('views'), likes: sum('likes'), reposts: sum('retweets'), replies: sum('replies'),
          quotes: sum('quotes'), bookmarks: sum('bookmarks'),
        };
        const engagements = stats.reduce((n, a) => n + a.engagements, 0);
        return {
          success: true,
          account: me.username,
          count: stats.length,
          totals: { ...totals, engagements, engagementRate: totals.views ? Number(((engagements / totals.views) * 100).toFixed(2)) : null },
          averageViews: Math.round(totals.views / stats.length),
          top: stats[0],
          articles: stats,
        };
      },
    },

    clearBookmarks: {
      write: true,
      description: 'Remove every bookmark (dryRun counts them instead)',
      run: async (ctx) => {
        const client = await ctx.http();
        const variables = { ...buildGraphQLVariables('BookmarkTimeline', {}), includePromotedContent: false };
        const readBookmarks = async (max) => {
          const ids = new Set();
          const found = [];
          for await (const raws of timelinePages(ctx, client, 'BookmarkTimeline', variables, max)) {
            found.push(...parsePosts(raws, ids));
            if (found.length >= max) break;
          }
          return found.slice(0, max);
        };

        if (ctx.config.dryRun) {
          const max = boundedInt(ctx.config.limit, { min: 1, max: 5000, fallback: 1000 });
          ctx.progress('Counting bookmarks');
          const bookmarks = await readBookmarks(max);
          return {
            success: true,
            dryRun: true,
            count: bookmarks.length,
            countIsLowerBound: bookmarks.length >= max,
            bookmarks: bookmarks.map((b) => ({ ...outcomeOf(b), author: b.author?.username ?? null, status: 'would-remove' })),
          };
        }

        await ctx.charge('delete');
        ctx.progress('Clearing all bookmarks');
        await mutate(client, 'BookmarksAllDelete', {}, 'to clear bookmarks');
        const left = await readBookmarks(20);
        return {
          success: true,
          dryRun: false,
          cleared: left.length === 0,
          remaining: left.length,
          clearedAt: new Date().toISOString(),
        };
      },
    },

    rssAdd: {
      description: 'Save an RSS or Atom feed to auto-post from',
      run: async (ctx) => {
        const owner = requireOwner(ctx);
        const url = String(ctx.require('url'));
        const postTemplate = String(ctx.config.postTemplate || '{{title}} {{url}}');
        if (!/\{\{\s*(title|url|link|description)\s*\}\}/.test(postTemplate)) {
          throw new JobInputError('postTemplate must use at least one of {{title}}, {{url}}, {{link}} or {{description}}');
        }
        const maxPerDay = boundedInt(ctx.config.maxPerDay, { min: 1, max: 20, fallback: 5 });
        ctx.progress(`Reading ${url}`);
        const fetched = await fetchFeed(env, url);
        const feedId = ctx.operationId;
        const record = await withFeedStore((store) => {
          const mine = (store.owners[owner] ||= {});
          const previous = Object.values(mine).find((f) => f.url === url);
          if (previous) delete mine[previous.id];
          mine[feedId] = {
            id: feedId,
            url,
            title: fetched.title || previous?.title || null,
            postTemplate,
            interval: ctx.config.interval || '1h',
            maxPerDay,
            createdAt: previous?.createdAt ?? new Date().toISOString(),
            lastCheckedAt: new Date().toISOString(),
            seen: [...new Set([...(previous?.seen || []), ...fetched.items.map((i) => i.key)])].slice(-RSS_SEEN_KEEP),
            posts: previous?.posts || [],
          };
          return { record: mine[feedId], replaced: previous?.id ?? null };
        });
        return {
          success: true,
          feedId,
          replacedFeedId: record.replaced,
          url,
          title: record.record.title,
          postTemplate,
          maxPerDay,
          interval: record.record.interval,
          itemCount: fetched.items.length,
          drafts: draftsOf(postTemplate, fetched.items),
          autoPost: ctx.config.autoCheckEvery
            ? `Items already in the feed are not posted. The feed is checked every ${ctx.config.interval}, and new items are posted, up to ${maxPerDay} a day. Stop with POST /api/ai/schedule/rss-remove and this feedId.`
            : `Items already in the feed are not posted. New items are posted, up to ${maxPerDay} a day, each time POST /api/ai/schedule/rss-check runs with this feedId.`,
        };
      },
    },

    rssCheck: {
      write: true,
      description: 'Check a saved feed and post its new items',
      run: async (ctx) => {
        const owner = requireOwner(ctx);
        const { feedId, url } = ctx.config;
        if (!feedId && !url) throw new JobInputError('feedId or url is required');
        const feed = await withFeedStore((store) => {
          const mine = store.owners[owner] || {};
          return feedId ? mine[feedId] ?? null : Object.values(mine).find((f) => f.url === url) ?? null;
        });
        if (feedId && !feed) throw new JobInputError(`No saved feed ${feedId} for this session. Add it with POST /api/ai/schedule/rss-add.`);

        if (!feed) {
          ctx.progress(`Reading ${url}`);
          const fetched = await fetchFeed(env, url);
          return {
            success: true,
            saved: false,
            url,
            title: fetched.title || null,
            itemCount: fetched.items.length,
            drafts: draftsOf('{{title}} {{url}}', fetched.items),
            posted: [],
            note: 'This URL is not a saved feed, so nothing was posted. Save it with POST /api/ai/schedule/rss-add to auto-post.',
          };
        }

        ctx.progress(`Reading ${feed.url}`);
        const fetched = await fetchFeed(env, feed.url);
        const outcome = await postNewFeedItems(ctx, env, feed, fetched);
        await withFeedStore((store) => {
          const record = store.owners[owner]?.[feed.id];
          if (record) record.lastCheckedAt = new Date().toISOString();
        });
        return {
          success: true,
          saved: true,
          feedId: feed.id,
          url: feed.url,
          title: fetched.title || feed.title,
          checkedAt: new Date().toISOString(),
          newItems: outcome.fresh.length,
          posted: outcome.posted,
          failed: outcome.failed,
          remainingToday: outcome.remainingToday,
          drafts: draftsOf(feed.postTemplate, outcome.waiting),
        };
      },
    },

    cleanupDeleteTweets: {
      write: true,
      description: 'Delete the account\'s posts that match a filter',
      run: deletePosts,
    },

    cleanupBulkDelete: {
      write: true,
      description: 'Delete posts by id, or by filter when no ids are given',
      run: deletePosts,
    },

    cleanupUnlikeAll: {
      write: true,
      description: 'Unlike every liked post',
      run: async (ctx) => {
        const c = ctx.config;
        const dryRun = Boolean(c.dryRun);
        const max = boundedInt(c.maxUnlikes ?? c.limit, { min: 1, max: 10_000, fallback: 10_000 });
        const delayMs = delayOf(c.delayMs);
        const client = await ctx.http();
        const me = await viewerOf(client);
        const variables = { ...buildGraphQLVariables('UserLikes', { userId: me.id }) };
        const run = newRun();
        const ids = new Set();
        let scanned = 0;
        for await (const raws of timelinePages(ctx, client, 'UserLikes', variables, max)) {
          const posts = parsePosts(raws, ids).slice(0, max - scanned);
          scanned += posts.length;
          await runBulk(ctx, run, posts.map((p) => ({ id: p.id, outcome: { ...outcomeOf(p), author: p.author?.username ?? null } })), {
            actionClass: 'like', delayMs, dryRun, verb: 'unlike', doneStatus: 'unliked',
            act: (t) => unlikeTweet(client, t.id),
          });
          if (run.stopped || scanned >= max) break;
        }
        if (ctx.cancelled() && !run.stopped) run.stopped = { reason: 'cancelled' };
        return { success: true, dryRun, account: me.username, scanned, unliked: run.done, failed: run.failed, stopped: run.stopped, items: run.items };
      },
    },

    cleanupClearReposts: {
      write: true,
      description: 'Undo every repost',
      run: async (ctx) => {
        const c = ctx.config;
        const dryRun = Boolean(c.dryRun);
        const client = await ctx.http();
        const me = await viewerOf(client);
        const posts = await ownPosts(ctx, client, me, {
          includeReplies: false,
          maxScan: boundedInt(c.scanLimit, { min: 20, max: TIMELINE_CEILING, fallback: TIMELINE_CEILING }),
        });
        const reposts = posts.filter((p) => p.isRetweet && p.retweetOf?.id);
        const run = newRun();
        await runBulk(
          ctx,
          run,
          reposts.map((p) => ({
            id: p.retweetOf.id,
            outcome: { id: p.retweetOf.id, author: p.retweetOf.author?.username ?? null, text: summarize(p.retweetOf.text), url: `${X_WEB}/${p.retweetOf.author?.username || 'i/web'}/status/${p.retweetOf.id}` },
          })),
          { actionClass: 'delete', delayMs: delayOf(c.delayMs), dryRun, verb: 'unrepost', doneStatus: 'unreposted', act: (t) => unretweet(client, t.id) },
        );
        return { success: true, dryRun, account: me.username, scanned: posts.length, reposts: reposts.length, removed: run.done, failed: run.failed, stopped: run.stopped, items: run.items };
      },
    },

    cleanupClearHistory: {
      write: true,
      description: 'Clear the account\'s recent searches on X',
      run: async (ctx) => {
        const page = await ctx.page();
        ctx.progress('Opening recent searches');
        await page.goto(`${X_WEB}/explore`, { waitUntil: 'networkidle2', timeout: 45_000 });
        const before = await openRecentSearches(ctx, page);
        const clear = await byText(page, /^clear all$/i);
        if (!clear) {
          if (before === 0) return { success: true, cleared: true, removed: 0, remaining: 0, message: 'The account has no recent searches.' };
          throw new XRejectedError(`X listed ${before} recent searches but offered no "Clear all" control.`);
        }
        await clear.click();
        const confirm = await firstMatch(ctx, page, ['[data-testid="confirmationSheetConfirm"]'], 5000);
        if (confirm) await confirm.click();
        await ctx.sleep(1500);
        await page.goto(`${X_WEB}/explore`, { waitUntil: 'networkidle2', timeout: 45_000 });
        const remaining = await openRecentSearches(ctx, page);
        return { success: true, cleared: remaining === 0, removed: before - remaining, remaining, clearedAt: new Date().toISOString() };
      },
    },

    cleanupArchive: {
      write: true,
      description: 'Export the account\'s posts, optionally deleting them afterwards',
      run: async (ctx) => {
        const c = ctx.config;
        const limit = boundedInt(c.limit ?? c.maxTweets, { min: 1, max: TIMELINE_CEILING, fallback: 1000 });
        const client = await ctx.http();
        const me = await viewerOf(client);
        const posts = await ownPosts(ctx, client, me, { includeReplies: c.includeReplies !== false, maxScan: limit });
        if (posts.length === 0) {
          throw new XRejectedError(`X returned no posts for @${me.username}, so there is nothing to archive.`);
        }
        const archive = {
          account: { id: me.id, username: me.username, name: me.name },
          exportedAt: new Date().toISOString(),
          count: posts.length,
          oldest: posts[posts.length - 1]?.createdAt ?? null,
          newest: posts[0]?.createdAt ?? null,
          tweets: posts,
        };
        if (!c.deleteAfter) return { success: true, archive, deleted: 0 };

        const run = newRun();
        await runBulk(
          ctx,
          run,
          posts.map((p) => ({ id: p.id, repostOf: p.isRetweet ? p.retweetOf?.id : null, outcome: outcomeOf(p) })),
          {
            actionClass: 'delete', delayMs: delayOf(c.delayMs), dryRun: Boolean(c.dryRun), verb: 'delete', doneStatus: 'deleted',
            act: (t) => (t.repostOf ? unretweet(client, t.repostOf) : mutate(client, 'DeleteTweet', { tweet_id: t.id, dark_request: false }, `to delete post ${t.id}`)),
          },
        );
        return { success: true, archive, dryRun: Boolean(c.dryRun), deleted: run.done, failed: run.failed, stopped: run.stopped, items: run.items };
      },
    },
  };
}

export default createPostingProcessors();
