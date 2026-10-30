// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Engagement processors: single actions (follow, unfollow, like, unlike,
 * retweet, quote, reply, bookmark, mute, unmute), the bulk sweeps that fan out
 * into them (auto-follow, smart unfollow, auto-retweet, bulk execute), and the
 * reads that decide what to engage with (notifications, smart targeting,
 * audience insights, engagement analytics).
 *
 * Every action goes through the session's logged-in HTTP client
 * (src/scrapers/twitter/http). Every write is charged against the account's
 * daily cap before it is sent, sweeps keep a human pause between writes, and a
 * sweep that hits a dead session, a rate limit or the cap stops and reports
 * what it had already done instead of throwing that work away.
 *
 * Follows made here are written to a per-owner follow ledger, so smart
 * unfollow can give an account the grace period it was promised
 * (minDaysSinceFollow) before unfollowing it.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { STOP_WORDS as VOICE_STOP_WORDS } from '../../../src/ai/voiceAnalyzer.js';
import fs from 'node:fs';
import path from 'node:path';
import { JobInputError } from './context.js';
import { GRAPHQL, REST, REST_BASE } from '../../../src/scrapers/twitter/http/endpoints.js';
import {
  likeTweet,
  unlikeTweet,
  retweet,
  unretweet,
  followUser,
  unfollowUser,
  blockUser,
  unblockUser,
  muteUser,
  unmuteUser,
  bookmarkTweet,
  unbookmarkTweet,
} from '../../../src/scrapers/twitter/http/engagement.js';
import { postTweet } from '../../../src/scrapers/twitter/http/actions.js';
import { scrapeProfile, scrapeProfileById } from '../../../src/scrapers/twitter/http/profile.js';
import { scrapeTweets } from '../../../src/scrapers/twitter/http/tweets.js';
import { scrapeNotifications } from '../../../src/scrapers/twitter/http/notifications.js';
import { parseUserData } from '../../../src/scrapers/twitter/http/parse/user.js';
import { parseTweetData } from '../../../src/scrapers/twitter/http/parse/tweet.js';
import { flattenEntries, paginate } from '../../../src/scrapers/twitter/http/paging.js';
import { buildAccountReport, median, round } from '../../../src/analysis/accountReport.js';
import { getXactionsHome } from '../../../src/mcp/action-caps.js';

const DAY_MS = 86_400_000;

/** Most accounts smart unfollow reads from the following list in one run. */
const FOLLOWING_SCAN_CAP = 3000;
/** Most followers read to settle follow-back status X did not report inline. */
const FOLLOWER_SCAN_CAP = 3000;

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

/**
 * A post id from an id or any x.com / twitter.com status URL.
 * @param {unknown} value
 * @param {string} [label]
 * @returns {string}
 */
export function tweetIdOf(value, label = 'tweetId') {
  const raw = String(value ?? '').trim();
  const fromUrl = raw.match(/status(?:es)?\/(\d+)/);
  const id = fromUrl ? fromUrl[1] : raw;
  if (!/^\d{1,25}$/.test(id)) throw new JobInputError(`${label} must be a post id or post URL, got "${raw}"`);
  return id;
}

/**
 * A screen name from a handle, an @handle or a profile URL.
 * @param {unknown} value
 * @param {string} [label]
 * @returns {string}
 */
export function usernameOf(value, label = 'username') {
  let raw = String(value ?? '').trim();
  const fromUrl = raw.match(/^(?:https?:\/\/)?(?:www\.|mobile\.)?(?:x|twitter)\.com\/([A-Za-z0-9_]+)/i);
  if (fromUrl) raw = fromUrl[1];
  raw = raw.replace(/^@/, '');
  if (!/^[A-Za-z0-9_]{1,50}$/.test(raw)) throw new JobInputError(`${label} must be an X username, got "${value}"`);
  return raw;
}

/** An integer config value clamped to a range. */
function intIn(value, min, max, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : fallback;
}

/** A non-negative millisecond delay. */
function delayOf(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/** Post text, required and non-empty. */
function textOf(value, label = 'text') {
  if (typeof value !== 'string' || !value.trim()) throw new JobInputError(`${label} is required`);
  return value;
}

/**
 * An auto-follow / auto-retweet target as the routes build it.
 * @param {unknown} target
 * @returns {{ type: 'username'|'hashtag'|'keyword', value: string }}
 */
function targetOf(target) {
  const type = target?.type;
  const value = typeof target?.value === 'string' ? target.value.trim() : '';
  if (!['username', 'hashtag', 'keyword'].includes(type) || !value) {
    throw new JobInputError('target must be { type: "username"|"hashtag"|"keyword", value }');
  }
  if (type === 'username') return { type, value: usernameOf(value, 'target username') };
  if (type === 'hashtag') return { type, value: value.replace(/^#/, '') };
  return { type, value };
}

/**
 * Follow filters. Unknown keys are ignored; a non-numeric bound is an error.
 * @param {object} raw
 */
function followFiltersOf(raw) {
  const f = raw && typeof raw === 'object' ? raw : {};
  const bound = (key) => {
    if (f[key] === undefined || f[key] === null || f[key] === '') return null;
    const n = Number(f[key]);
    if (!Number.isFinite(n) || n < 0) throw new JobInputError(`filters.${key} must be a non-negative number`);
    return n;
  };
  return {
    minFollowers: bound('minFollowers'),
    maxFollowers: bound('maxFollowers'),
    mustHaveBio: Boolean(f.mustHaveBio),
    excludeVerified: Boolean(f.excludeVerified),
  };
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/** Failures that end a sweep: nothing after them can succeed. */
const STOP_ERRORS = new Set(['AuthError', 'RateLimitError', 'ActionCapExceededError', 'XSessionError', 'JobCancelledError']);

/**
 * Mark an X answer that a retry cannot change as permanent: a missing post or
 * account, or an explicit rejection in the response body.
 * @param {Error} err
 * @returns {Error}
 */
function settled(err) {
  if (err?.name === 'NotFoundError' || (err?.name === 'TwitterApiError' && !(err.status >= 500))) {
    err.retryable = false;
  }
  return err;
}

/** Run one X call, marking permanent failures as such. */
async function x(call) {
  try {
    return await call();
  } catch (err) {
    throw settled(err);
  }
}

/** Why a sweep stopped, from the error that stopped it. */
function stopReason(err) {
  switch (err?.name) {
    case 'JobCancelledError':
      return 'cancelled';
    case 'ActionCapExceededError':
      return 'daily action cap reached';
    case 'RateLimitError':
      return 'rate limited by X';
    default:
      return 'X session rejected';
  }
}

// ---------------------------------------------------------------------------
// Follow ledger: when this owner followed whom, through XActions
// ---------------------------------------------------------------------------

const LEDGER_FILE = 'follow-ledger.json';
/** Newest follows kept per owner. */
const LEDGER_MAX_PER_OWNER = 20_000;

function ledgerPath() {
  return path.join(getXactionsHome(), LEDGER_FILE);
}

function readLedger() {
  try {
    const data = JSON.parse(fs.readFileSync(ledgerPath(), 'utf8'));
    if (data && typeof data.owners === 'object' && data.owners) return data;
  } catch (err) {
    if (err.code !== 'ENOENT' && !(err instanceof SyntaxError)) throw err;
  }
  return { version: 1, owners: {} };
}

function writeLedger(data) {
  const file = ledgerPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data));
  fs.renameSync(tmp, file);
}

/**
 * The follows XActions made for one owner.
 * @param {string|null} ownerKey
 * @returns {Record<string, { username: string, followedAt: string }>}
 */
export function followsOf(ownerKey) {
  if (!ownerKey) return {};
  return readLedger().owners[ownerKey] || {};
}

/**
 * Record follows for one owner.
 * @param {string|null} ownerKey
 * @param {Array<{ id: string, username: string }>} users
 * @param {Date} [at]
 */
export function recordFollows(ownerKey, users, at = new Date()) {
  if (!ownerKey || users.length === 0) return;
  const data = readLedger();
  const mine = data.owners[ownerKey] || {};
  for (const user of users) mine[user.id] = { username: user.username, followedAt: at.toISOString() };
  const entries = Object.entries(mine);
  if (entries.length > LEDGER_MAX_PER_OWNER) {
    entries.sort((a, b) => b[1].followedAt.localeCompare(a[1].followedAt));
    data.owners[ownerKey] = Object.fromEntries(entries.slice(0, LEDGER_MAX_PER_OWNER));
  } else {
    data.owners[ownerKey] = mine;
  }
  writeLedger(data);
}

/**
 * Forget follows for one owner (after an unfollow).
 * @param {string|null} ownerKey
 * @param {string[]} ids
 */
export function forgetFollows(ownerKey, ids) {
  if (!ownerKey || ids.length === 0) return;
  const data = readLedger();
  const mine = data.owners[ownerKey];
  if (!mine) return;
  let changed = false;
  for (const id of ids) {
    if (mine[id]) {
      delete mine[id];
      changed = true;
    }
  }
  if (changed) writeLedger(data);
}

// ---------------------------------------------------------------------------
// Reading X
// ---------------------------------------------------------------------------

const postUrl = (id, username) => `https://x.com/${username || 'i'}/status/${id}`;

/** A viewer relationship flag, or null when X did not say. */
function relation(raw, key) {
  const value = raw?.relationship_perspectives?.[key] ?? raw?.legacy?.[key];
  return typeof value === 'boolean' ? value : null;
}

/**
 * A compact user from a raw GraphQL user result, with the viewer's
 * relationship to it. Null for unavailable accounts.
 * @param {object} result
 */
function userFrom(result) {
  const raw = result?.__typename === 'UserWithVisibilityResults' ? result.user : result;
  if (!raw) return null;
  let profile;
  try {
    profile = parseUserData(raw);
  } catch {
    return null;
  }
  if (!profile.id || !profile.username) return null;
  return {
    id: profile.id,
    username: profile.username,
    name: profile.name,
    bio: profile.bio,
    location: profile.location,
    website: profile.website,
    joined: profile.joined,
    followers: profile.followers,
    following: profile.following,
    tweets: profile.tweets,
    verified: profile.verified,
    protected: profile.protected,
    defaultAvatar: !profile.avatar || /default_profile_images/.test(profile.avatar),
    youFollow: relation(raw, 'following'),
    followsYou: relation(raw, 'followed_by'),
  };
}

/**
 * Page a user-list timeline (Followers, Following) with relationships kept.
 * @param {object} client
 * @param {{ queryId: string, operationName: string }} endpoint
 * @param {object} variables
 * @param {{ limit: number, onProgress?: Function }} options
 */
async function scanUsers(client, endpoint, variables, { limit, onProgress }) {
  const parsePage = (instructions) => {
    const { entries, cursor } = flattenEntries(instructions);
    const items = entries.map((e) => userFrom(e.content?.itemContent?.user_results?.result)).filter(Boolean);
    return { items, cursor };
  };
  return x(() =>
    paginate(client, endpoint, { ...variables, includePromotedContent: false }, parsePage, { limit, onProgress }),
  );
}

/**
 * Page a post timeline (search, a user's posts), keeping each post's author
 * and whether the viewer already liked or reposted it.
 * @param {object} client
 * @param {{ queryId: string, operationName: string }} endpoint
 * @param {object} variables
 * @param {{ limit: number }} options
 * @returns {Promise<Array<{ tweet: object, author: object|null, viewer: { liked: boolean, retweeted: boolean } }>>}
 */
async function scanPosts(client, endpoint, variables, { limit }) {
  const parsePage = (instructions) => {
    const { entries, cursor } = flattenEntries(instructions);
    const items = [];
    for (const entry of entries) {
      if (String(entry.entryId || '').startsWith('promoted')) continue;
      const result = entry.content?.itemContent?.tweet_results?.result;
      const raw = result?.__typename === 'TweetWithVisibilityResults' ? result.tweet : result;
      if (!raw) continue;
      const tweet = parseTweetData(result);
      if (!tweet?.id) continue;
      items.push({
        tweet,
        author: userFrom(raw.core?.user_results?.result),
        viewer: { liked: raw.legacy?.favorited === true, retweeted: raw.legacy?.retweeted === true },
      });
    }
    return { items, cursor };
  };
  return x(() => paginate(client, endpoint, variables, parsePage, { limit, keyOf: (item) => item.tweet.id }));
}

/** Search posts. */
function searchPosts(client, query, { product = 'Latest', limit }) {
  return scanPosts(client, GRAPHQL.SearchTimeline, { rawQuery: query, querySource: 'typed_query', product }, { limit });
}

/** A user's own posts (no replies). */
function userPosts(client, userId, { limit }) {
  return scanPosts(
    client,
    GRAPHQL.UserTweets,
    {
      userId,
      includePromotedContent: false,
      withQuickPromoteEligibilityTweetFields: true,
      withVoice: true,
      withV2Timeline: true,
    },
    { limit },
  );
}

/**
 * The profile of the account the session is logged in as.
 * @param {object} ctx
 * @param {object} client
 */
async function whoAmI(ctx, client) {
  const header = await ctx.cookieHeader();
  const twid = header.match(/(?:^|;\s*)twid=([^;]+)/);
  let id = twid ? decodeURIComponent(twid[1]).replace(/^"?u=/, '').replace(/"$/, '') : null;
  if (!id) {
    const me = await x(() => client.request(`${REST_BASE}${REST.verifyCredentials}`, { method: 'GET' }));
    id = me?.id_str ?? (me?.id != null ? String(me.id) : null);
    if (!id) throw Object.assign(new Error('X did not identify the logged-in account'), { name: 'AuthError' });
  }
  return x(() => scrapeProfileById(client, id));
}

/**
 * Look up an account, failing the job (without retries) when it does not exist.
 * @param {object} client
 * @param {string} username
 */
async function profileOf(client, username) {
  try {
    return await scrapeProfile(client, username);
  } catch (err) {
    if (err?.name === 'NotFoundError') throw new JobInputError(`@${username} does not exist or is suspended`);
    throw settled(err);
  }
}

/** The id of a post X just created, or a permanent error naming X's reason. */
function createdPostId(result) {
  const id = result?.rest_id ?? result?.legacy?.id_str ?? result?.tweet?.rest_id ?? null;
  if (id) return id;
  const reason = (result?.errors || []).map((e) => e.message).filter(Boolean).join('; ');
  throw Object.assign(new Error(reason ? `X rejected the post: ${reason}` : 'X did not return the new post'), {
    name: 'TwitterApiError',
    retryable: false,
  });
}

/** Post, allowing long text (X rejects it for accounts without Premium). */
function publish(client, text, options) {
  return x(() => postTweet(client, text, { ...options, premium: text.length > 280 }));
}

// ---------------------------------------------------------------------------
// Sweeps
// ---------------------------------------------------------------------------

/** Wait about `ms` with a little jitter, so a sweep does not tick like a clock. */
function pause(ctx, ms) {
  return ms > 0 ? ctx.sleep(Math.round(ms * (0.8 + Math.random() * 0.4))) : ctx.sleep(0);
}

/**
 * Run a planned list of writes in order.
 *
 * Each step: `{ report, capClass, perform, done, would }`. A dry run performs
 * nothing and charges nothing. A failure is recorded and the sweep moves on
 * (or stops, with stopOnError). A dead session, a rate limit, the daily cap or
 * cancellation stops the sweep; the steps not reached are reported as such.
 * If that happens before anything succeeded, the error is thrown instead, so
 * the job fails with the real reason.
 *
 * @returns {Promise<{ items: object[], succeeded: number, failed: number, stoppedReason: string|null }>}
 */
async function runWrites(ctx, steps, { dryRun = false, delayMs = 0, stopOnError = false, label = 'action' } = {}) {
  const items = [];
  let succeeded = 0;
  let failed = 0;
  let stoppedReason = null;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (dryRun) {
      items.push({ ...step.report, outcome: step.would });
      continue;
    }
    try {
      ctx.throwIfCancelled();
      await ctx.charge(step.capClass);
      const extra = await step.perform();
      items.push({ ...step.report, outcome: step.done, ...(extra || {}) });
      succeeded++;
    } catch (err) {
      if (STOP_ERRORS.has(err?.name)) {
        if (succeeded === 0 && failed === 0 && err.name !== 'JobCancelledError') throw err;
        stoppedReason = stopReason(err);
        if (err.name !== 'JobCancelledError') {
          items.push({ ...step.report, outcome: 'failed', error: err.message });
          failed++;
        } else {
          items.push({ ...step.report, outcome: 'not attempted' });
        }
      } else {
        items.push({ ...step.report, outcome: 'failed', error: err.message });
        failed++;
        if (stopOnError) stoppedReason = 'stopOnError';
      }
    }
    ctx.progress(`${label}: ${i + 1}/${steps.length}`, { done: i + 1, total: steps.length, succeeded, failed });
    if (stoppedReason) {
      for (const rest of steps.slice(i + 1)) items.push({ ...rest.report, outcome: 'not attempted' });
      break;
    }
    if (i < steps.length - 1) {
      try {
        await pause(ctx, delayMs);
      } catch (err) {
        if (err?.name !== 'JobCancelledError') throw err;
        stoppedReason = 'cancelled';
        for (const rest of steps.slice(i + 1)) items.push({ ...rest.report, outcome: 'not attempted' });
        break;
      }
    }
  }

  return { items, succeeded, failed, stoppedReason };
}

/** Count items by a key. */
function countBy(items, key) {
  const counts = {};
  for (const item of items) {
    const value = item[key];
    if (value) counts[value] = (counts[value] || 0) + 1;
  }
  return counts;
}

// ---------------------------------------------------------------------------
// Single actions
// ---------------------------------------------------------------------------

/**
 * A processor for one action on one post.
 * @param {{ action: string, capClass: string, fn: Function }} spec
 */
function onPost({ action, capClass, fn }) {
  return async (ctx) => {
    const tweetId = tweetIdOf(ctx.require('tweetId'));
    const client = await ctx.http();
    ctx.progress(`${action} ${tweetId}`);
    await ctx.charge(capClass);
    await x(() => fn(client, tweetId));
    return { success: true, action, tweetId, url: postUrl(tweetId), completedAt: new Date().toISOString() };
  };
}

/**
 * A processor for one action on one account.
 * @param {{ action: string, capClass: string, fn: Function, after?: Function }} spec
 */
function onUser({ action, capClass, fn, after }) {
  return async (ctx) => {
    const username = usernameOf(ctx.require('username'));
    const client = await ctx.http();
    const profile = await profileOf(client, username);
    ctx.progress(`${action} @${profile.username}`);
    await ctx.charge(capClass);
    await x(() => fn(client, profile.id));
    after?.(ctx, profile);
    return {
      success: true,
      action,
      username: profile.username,
      userId: profile.id,
      name: profile.name,
      followers: profile.followers,
      verified: profile.verified,
      protected: profile.protected,
      ...(action === 'follow' ? { requested: profile.protected } : {}),
      completedAt: new Date().toISOString(),
    };
  };
}

const recordFollow = (ctx, profile) => recordFollows(ctx.ownerKey, [{ id: profile.id, username: profile.username }]);
const forgetFollow = (ctx, profile) => forgetFollows(ctx.ownerKey, [profile.id]);

async function quote(ctx) {
  const tweetId = tweetIdOf(ctx.require('tweetId'));
  const text = textOf(ctx.config.text);
  const client = await ctx.http();
  ctx.progress(`quote ${tweetId}`);
  await ctx.charge('reply');
  const id = createdPostId(await publish(client, text, { quoteTweetId: tweetId }));
  return { success: true, action: 'quote', tweetId, quoteId: id, url: postUrl(id), quotedUrl: postUrl(tweetId), text };
}

async function reply(ctx) {
  const tweetId = tweetIdOf(ctx.require('tweetId'));
  const text = textOf(ctx.config.text);
  const client = await ctx.http();
  ctx.progress(`reply to ${tweetId}`);
  await ctx.charge('reply');
  const id = createdPostId(await publish(client, text, { replyTo: tweetId }));
  return { success: true, action: 'reply', tweetId, replyId: id, url: postUrl(id), inReplyToUrl: postUrl(tweetId), text };
}

// ---------------------------------------------------------------------------
// autoFollow
// ---------------------------------------------------------------------------

/** Why a candidate is not followed, or null when it passes. */
function followSkipReason(user, { me, filters, ledger }) {
  if (user.id === me.id) return 'your own account';
  if (user.youFollow === true) return 'already following';
  if (ledger[user.id]) return 'followed earlier by XActions';
  if (filters.minFollowers !== null && user.followers < filters.minFollowers) return 'below minFollowers';
  if (filters.maxFollowers !== null && user.followers > filters.maxFollowers) return 'above maxFollowers';
  if (filters.mustHaveBio && !user.bio?.trim()) return 'no bio';
  if (filters.excludeVerified && user.verified) return 'verified';
  return null;
}

/** Candidate accounts for a target: a user's followers, or authors posting a hashtag or keyword. */
async function followCandidates(ctx, client, target, limit) {
  if (target.type === 'username') {
    const source = await profileOf(client, target.value);
    ctx.progress(`Reading @${source.username}'s followers`);
    return scanUsers(client, GRAPHQL.Followers, { userId: source.id }, { limit });
  }
  const query = target.type === 'hashtag' ? `#${target.value}` : target.value;
  ctx.progress(`Searching posts for ${query}`);
  const posts = await searchPosts(client, query, { product: 'Latest', limit });
  const authors = new Map();
  for (const { author } of posts) if (author && !authors.has(author.id)) authors.set(author.id, author);
  return [...authors.values()];
}

const brief = (user) => ({
  username: user.username,
  userId: user.id,
  name: user.name,
  followers: user.followers,
  following: user.following,
  verified: user.verified,
});

async function autoFollow(ctx) {
  const target = targetOf(ctx.require('target'));
  const maxFollows = intIn(ctx.config.maxFollows, 1, 200, 50);
  const dryRun = Boolean(ctx.config.dryRun);
  const delayMs = delayOf(ctx.config.delayMs, 3000);
  const filters = followFiltersOf(ctx.config.filters);

  const client = await ctx.http();
  const me = await whoAmI(ctx, client);
  const candidates = await followCandidates(ctx, client, target, Math.min(maxFollows * 4, 800));
  if (candidates.length === 0) {
    throw new JobInputError(`X returned no accounts for ${target.type} "${target.value}"`);
  }

  const ledger = followsOf(ctx.ownerKey);
  const skipped = [];
  const eligible = [];
  for (const user of candidates) {
    const reason = followSkipReason(user, { me, filters, ledger });
    if (reason) skipped.push({ ...brief(user), outcome: 'skipped', reason });
    else if (eligible.length < maxFollows) eligible.push(user);
  }

  const steps = eligible.map((user) => ({
    report: brief(user),
    capClass: 'follow',
    done: user.protected ? 'requested' : 'followed',
    would: 'would follow',
    perform: async () => {
      await x(() => followUser(client, user.id));
      recordFollows(ctx.ownerKey, [{ id: user.id, username: user.username }]);
    },
  }));
  const run = await runWrites(ctx, steps, { dryRun, delayMs, label: 'Auto-follow' });

  return {
    success: true,
    dryRun,
    account: me.username,
    target,
    filters,
    scanned: candidates.length,
    eligible: eligible.length,
    followed: dryRun ? 0 : run.succeeded,
    wouldFollow: dryRun ? eligible.length : undefined,
    failed: run.failed,
    skipped: countBy(skipped, 'reason'),
    stoppedReason: run.stoppedReason,
    items: [...run.items, ...skipped],
  };
}

// ---------------------------------------------------------------------------
// smartUnfollow
// ---------------------------------------------------------------------------

/** Settle follow-back status for accounts X did not flag inline, from the followers list. */
async function settleFollowBack(ctx, client, me, following) {
  const unknown = following.filter((u) => u.followsYou === null);
  if (unknown.length === 0) return { checkedFollowers: 0, complete: true };
  ctx.progress(`Reading your followers to check ${unknown.length} accounts`);
  const limit = Math.min(me.followers || FOLLOWER_SCAN_CAP, FOLLOWER_SCAN_CAP);
  const followers = await scanUsers(client, GRAPHQL.Followers, { userId: me.id }, { limit });
  const complete = followers.length >= (me.followers || 0) || (me.followers || 0) <= FOLLOWER_SCAN_CAP;
  const ids = new Set(followers.map((u) => u.id));
  for (const user of unknown) {
    if (ids.has(user.id)) user.followsYou = true;
    else if (complete) user.followsYou = false;
  }
  return { checkedFollowers: followers.length, complete };
}

async function smartUnfollow(ctx) {
  const maxUnfollows = intIn(ctx.config.maxUnfollows, 1, 300, 50);
  const dryRun = Boolean(ctx.config.dryRun);
  const delayMs = delayOf(ctx.config.delayMs, 2000);
  const minDays = Math.max(Number(ctx.config.minDaysSinceFollow ?? 7) || 0, 0);
  const skipVerified = Boolean(ctx.config.skipVerified);
  const skipWithBio = Boolean(ctx.config.skipWithBio);

  const client = await ctx.http();
  const me = await whoAmI(ctx, client);
  if (!me.following) {
    return { success: true, dryRun, account: me.username, scanned: 0, unfollowed: 0, items: [], note: 'You follow no one.' };
  }

  const scanLimit = Math.min(me.following, FOLLOWING_SCAN_CAP);
  ctx.progress(`Reading the ${scanLimit} accounts you follow`);
  const following = await scanUsers(client, GRAPHQL.Following, { userId: me.id }, {
    limit: scanLimit,
    onProgress: ({ fetched }) => ctx.progress(`Read ${fetched}/${scanLimit} followed accounts`),
  });
  const followBack = await settleFollowBack(ctx, client, me, following);

  const ledger = followsOf(ctx.ownerKey);
  const now = Date.now();
  let mutuals = 0;
  const skipped = [];
  const eligible = [];
  // X lists follows newest first; the longest-standing non-followers go first.
  for (const user of [...following].reverse()) {
    if (user.followsYou === true) {
      mutuals++;
      continue;
    }
    const tracked = ledger[user.id];
    const followedAt = tracked ? tracked.followedAt : null;
    const entry = { ...brief(user), followedAt };
    const ageDays = followedAt ? (now - Date.parse(followedAt)) / DAY_MS : null;
    let reason = null;
    if (user.followsYou === null) reason = 'follow-back status unknown';
    else if (skipVerified && user.verified) reason = 'verified';
    else if (skipWithBio && user.bio?.trim()) reason = 'has bio';
    else if (ageDays !== null && ageDays < minDays) reason = `grace period (${round(minDays - ageDays, 1)} days left)`;
    if (reason) skipped.push({ ...entry, outcome: 'skipped', reason });
    else if (eligible.length < maxUnfollows) eligible.push({ user, entry });
  }

  const steps = eligible.map(({ user, entry }) => ({
    report: entry,
    capClass: 'unfollow',
    done: 'unfollowed',
    would: 'would unfollow',
    perform: async () => {
      await x(() => unfollowUser(client, user.id));
      forgetFollows(ctx.ownerKey, [user.id]);
    },
  }));
  const run = await runWrites(ctx, steps, { dryRun, delayMs, label: 'Smart unfollow' });

  return {
    success: true,
    dryRun,
    account: me.username,
    scan: {
      following: me.following,
      scanned: following.length,
      complete: following.length >= me.following,
      followersChecked: followBack.checkedFollowers,
    },
    mutuals,
    notFollowingBack: following.filter((u) => u.followsYou === false).length,
    eligible: eligible.length,
    unfollowed: dryRun ? 0 : run.succeeded,
    wouldUnfollow: dryRun ? eligible.length : undefined,
    failed: run.failed,
    skipped: countBy(skipped, 'reason'),
    stoppedReason: run.stoppedReason,
    rules: {
      minDaysSinceFollow: minDays,
      skipVerified,
      skipWithBio,
      gracePeriodAppliesTo: 'follows made through XActions, whose follow date is recorded',
      order: 'longest-standing follows first',
    },
    items: [...run.items, ...skipped],
  };
}

// ---------------------------------------------------------------------------
// autoRetweet
// ---------------------------------------------------------------------------

async function autoRetweet(ctx) {
  const target = targetOf(ctx.require('target'));
  const maxRetweets = intIn(ctx.config.maxRetweets, 1, 50, 20);
  const dryRun = Boolean(ctx.config.dryRun);
  const delayMs = delayOf(ctx.config.delayMs, 5000);

  const client = await ctx.http();
  const me = await whoAmI(ctx, client);
  const limit = Math.min(maxRetweets * 3, 150);
  let posts;
  if (target.type === 'username') {
    const source = await profileOf(client, target.value);
    ctx.progress(`Reading @${source.username}'s posts`);
    posts = await userPosts(client, source.id, { limit });
  } else {
    const query = target.type === 'hashtag' ? `#${target.value}` : target.value;
    ctx.progress(`Searching posts for ${query}`);
    posts = await searchPosts(client, `${query} -filter:retweets -filter:replies`, { product: 'Latest', limit });
  }
  if (posts.length === 0) throw new JobInputError(`X returned no posts for ${target.type} "${target.value}"`);

  const skipped = [];
  const eligible = [];
  for (const { tweet, author, viewer } of posts) {
    const username = author?.username || tweet.author?.username;
    const entry = { tweetId: tweet.id, url: postUrl(tweet.id, username), author: username, text: tweet.text };
    let reason = null;
    if (tweet.isRetweet) reason = 'is a repost';
    else if (tweet.isReply) reason = 'is a reply';
    else if ((author?.id || tweet.author?.id) === me.id) reason = 'your own post';
    else if (viewer.retweeted) reason = 'already reposted';
    if (reason) skipped.push({ ...entry, outcome: 'skipped', reason });
    else if (eligible.length < maxRetweets) eligible.push(entry);
  }

  const steps = eligible.map((entry) => ({
    report: entry,
    capClass: 'repost',
    done: 'retweeted',
    would: 'would retweet',
    perform: () => x(() => retweet(client, entry.tweetId)),
  }));
  const run = await runWrites(ctx, steps, { dryRun, delayMs, label: 'Auto-retweet' });

  return {
    success: true,
    dryRun,
    account: me.username,
    target,
    scanned: posts.length,
    eligible: eligible.length,
    retweeted: dryRun ? 0 : run.succeeded,
    wouldRetweet: dryRun ? eligible.length : undefined,
    failed: run.failed,
    skipped: countBy(skipped, 'reason'),
    stoppedReason: run.stoppedReason,
    items: [...run.items, ...skipped],
  };
}

// ---------------------------------------------------------------------------
// bulkExecute
// ---------------------------------------------------------------------------

/**
 * What each bulk action does. `on` is the kind of target; `cap` the daily cap
 * it is charged against (an undo is charged like the action it undoes).
 */
const BULK_ACTIONS = {
  like: { on: 'post', cap: 'like', fn: likeTweet, done: 'liked' },
  unlike: { on: 'post', cap: 'like', fn: unlikeTweet, done: 'unliked' },
  retweet: { on: 'post', cap: 'repost', fn: retweet, done: 'retweeted' },
  unretweet: { on: 'post', cap: 'repost', fn: unretweet, done: 'unretweeted' },
  bookmark: { on: 'post', cap: 'like', fn: bookmarkTweet, done: 'bookmarked' },
  unbookmark: { on: 'post', cap: 'like', fn: unbookmarkTweet, done: 'unbookmarked' },
  reply: { on: 'post', cap: 'reply', text: true, done: 'replied' },
  quote: { on: 'post', cap: 'reply', text: true, done: 'quoted' },
  follow: { on: 'user', cap: 'follow', fn: followUser, done: 'followed' },
  unfollow: { on: 'user', cap: 'unfollow', fn: unfollowUser, done: 'unfollowed' },
  mute: { on: 'user', cap: 'mute', fn: muteUser, done: 'muted' },
  unmute: { on: 'user', cap: 'mute', fn: unmuteUser, done: 'unmuted' },
  block: { on: 'user', cap: 'block', fn: blockUser, done: 'blocked' },
  unblock: { on: 'user', cap: 'block', fn: unblockUser, done: 'unblocked' },
};

const BULK_ALIASES = { repost: 'retweet', unrepost: 'unretweet', 'quote-tweet': 'quote', comment: 'reply' };

/**
 * Validate and normalise bulk actions. Each item is an object
 * `{ action, target, text? }` (target: post id/URL or username; `tweetId`,
 * `tweetUrl`, `username` and `userId` are accepted in its place) or a string
 * `"like:123"` / `"follow @nasa"`. Throws a JobInputError naming every
 * invalid item, so nothing runs until the whole list is valid.
 *
 * @param {unknown[]} actions
 * @returns {Array<{ index: number, action: string, tweetId?: string, username?: string, userId?: string, text?: string }>}
 */
export function parseBulkActions(actions) {
  if (!Array.isArray(actions) || actions.length === 0) throw new JobInputError('actions must be a non-empty array');
  const problems = [];
  const parsed = [];
  actions.forEach((item, index) => {
    try {
      let name;
      let fields;
      if (typeof item === 'string') {
        const match = item.trim().match(/^([a-z-]+)\s*[:\s]\s*(\S+)$/i);
        if (!match) throw new JobInputError('use "action:target"');
        name = match[1];
        fields = { target: match[2] };
      } else if (item && typeof item === 'object') {
        name = item.action ?? item.type;
        fields = item;
      } else {
        throw new JobInputError('must be an object or a string');
      }
      const action = BULK_ALIASES[String(name).toLowerCase()] || String(name).toLowerCase();
      const spec = BULK_ACTIONS[action];
      if (!spec) throw new JobInputError(`unknown action "${name}" (use ${Object.keys(BULK_ACTIONS).join(', ')})`);
      const out = { index, action };
      if (spec.on === 'post') {
        out.tweetId = tweetIdOf(fields.target ?? fields.tweetId ?? fields.tweetUrl, 'target');
      } else if (fields.userId !== undefined && fields.target === undefined && fields.username === undefined) {
        if (!/^\d+$/.test(String(fields.userId))) throw new JobInputError('userId must be numeric');
        out.userId = String(fields.userId);
      } else {
        out.username = usernameOf(fields.target ?? fields.username, 'target');
      }
      if (spec.text) out.text = textOf(fields.text, `text for ${action}`);
      parsed.push(out);
    } catch (err) {
      problems.push(`#${index}: ${err.message}`);
    }
  });
  if (problems.length) throw new JobInputError(`Invalid actions: ${problems.join('; ')}`);
  return parsed;
}

/** Perform one bulk item and return what it produced. */
async function performBulk(ctx, client, item) {
  const spec = BULK_ACTIONS[item.action];
  if (spec.on === 'post') {
    if (item.action === 'reply' || item.action === 'quote') {
      const option = item.action === 'reply' ? { replyTo: item.tweetId } : { quoteTweetId: item.tweetId };
      const id = createdPostId(await publish(client, item.text, option));
      return { resultId: id, url: postUrl(id) };
    }
    await x(() => spec.fn(client, item.tweetId));
    return {};
  }
  const userId = item.userId || (await profileOf(client, item.username)).id;
  await x(() => spec.fn(client, userId));
  if (item.action === 'follow') recordFollows(ctx.ownerKey, [{ id: userId, username: item.username || null }]);
  if (item.action === 'unfollow') forgetFollows(ctx.ownerKey, [userId]);
  return { userId };
}

async function bulkExecute(ctx) {
  const actions = parseBulkActions(ctx.require('actions'));
  const delayMs = delayOf(ctx.config.delayMs, 3000);
  const stopOnError = Boolean(ctx.config.stopOnError);
  const client = await ctx.http();

  const steps = actions.map((item) => {
    const spec = BULK_ACTIONS[item.action];
    const target = item.tweetId || item.username || item.userId;
    return {
      report: { index: item.index, action: item.action, target },
      capClass: spec.cap,
      done: spec.done,
      would: `would ${item.action}`,
      perform: () => performBulk(ctx, client, item),
    };
  });
  const run = await runWrites(ctx, steps, { delayMs, stopOnError, label: 'Bulk execute' });

  return {
    success: run.failed === 0 && !run.stoppedReason,
    total: steps.length,
    succeeded: run.succeeded,
    failed: run.failed,
    notAttempted: run.items.filter((i) => i.outcome === 'not attempted').length,
    stopOnError,
    stoppedReason: run.stoppedReason,
    byAction: countBy(run.items.filter((i) => i.outcome !== 'failed' && i.outcome !== 'not attempted'), 'action'),
    items: run.items,
  };
}

// ---------------------------------------------------------------------------
// getNotifications
// ---------------------------------------------------------------------------

const NOTIFICATION_TABS = { all: 'all', mentions: 'mentions', mention: 'mentions', verified: 'verified' };
const NOTIFICATION_TYPES = {
  like: 'like', likes: 'like',
  follow: 'follow', follows: 'follow',
  retweet: 'retweet', retweets: 'retweet', repost: 'retweet', reposts: 'retweet',
  reply: 'reply', replies: 'reply',
  quote: 'quote', quotes: 'quote',
};

async function getNotifications(ctx) {
  const limit = intIn(ctx.config.limit, 1, 200, 50);
  const filter = String(ctx.config.filter || 'all').toLowerCase();
  const tab = NOTIFICATION_TABS[filter];
  const type = NOTIFICATION_TYPES[filter];
  if (!tab && !type) {
    throw new JobInputError(
      `filter must be one of ${[...new Set([...Object.keys(NOTIFICATION_TABS), ...Object.keys(NOTIFICATION_TYPES)])].join(', ')}`,
    );
  }

  const client = await ctx.http();
  ctx.progress(`Reading notifications (${filter})`);
  const scanned = await x(() =>
    scrapeNotifications(client, { type: tab || 'all', limit: type ? Math.min(limit * 4, 800) : limit }),
  );
  if (scanned.length === 0) {
    throw Object.assign(new Error(`X returned no notifications on the ${tab || 'all'} tab`), { retryable: false });
  }
  const notifications = (type ? scanned.filter((n) => n.type === type) : scanned).slice(0, limit);
  const times = notifications.map((n) => n.timestamp).filter(Boolean).sort();

  return {
    success: true,
    filter,
    count: notifications.length,
    scanned: scanned.length,
    byType: countBy(notifications, 'type'),
    newest: times.at(-1) ?? null,
    oldest: times[0] ?? null,
    notifications,
  };
}

// ---------------------------------------------------------------------------
// smartTarget
// ---------------------------------------------------------------------------

/**
 * Weight of each signal per goal. Signals are normalised to 0..1 across the
 * sample: relevance (how much of the niche's conversation the account
 * carries, plus a bio match), engagementRate (median interactions per post
 * over followers), audience (follower count on a log scale, relative to the
 * other accounts in the sample), reciprocity (how likely it is to follow
 * back, from its follow ratio) and activity (recency of its latest post in
 * the niche).
 */
const GOAL_WEIGHTS = {
  followers: { reciprocity: 0.3, engagementRate: 0.25, relevance: 0.25, audience: 0.1, activity: 0.1 },
  engagement: { engagementRate: 0.4, relevance: 0.25, activity: 0.2, audience: 0.15 },
  reach: { audience: 0.45, relevance: 0.25, engagementRate: 0.2, activity: 0.1 },
  networking: { reciprocity: 0.35, relevance: 0.35, activity: 0.2, engagementRate: 0.1 },
};
const GOAL_ALIASES = {
  growth: 'followers',
  follower: 'followers',
  visibility: 'reach',
  awareness: 'reach',
  community: 'networking',
  collaboration: 'networking',
  engagements: 'engagement',
};

/** Goals as a list of known keys. */
function goalsOf(value) {
  const list = (Array.isArray(value) ? value : [value ?? 'followers']).map((g) => String(g).trim().toLowerCase()).filter(Boolean);
  const goals = [...new Set(list.map((g) => GOAL_ALIASES[g] || g))];
  const unknown = goals.filter((g) => !GOAL_WEIGHTS[g]);
  if (unknown.length || goals.length === 0) {
    throw new JobInputError(`goals must be from ${Object.keys(GOAL_WEIGHTS).join(', ')}; got ${unknown.join(', ') || 'none'}`);
  }
  return goals;
}

/** The goals' weights, averaged. */
function blendWeights(goals) {
  const weights = {};
  for (const goal of goals) {
    for (const [signal, w] of Object.entries(GOAL_WEIGHTS[goal])) weights[signal] = (weights[signal] || 0) + w / goals.length;
  }
  return weights;
}

/** Lowercase word tokens of at least three characters. */
function wordsOf(text) {
  return String(text || '').toLowerCase().match(/[\p{L}\p{N}_]{3,}/gu) || [];
}

const engagementOfPost = (t) => (t.metrics?.likes || 0) + (t.metrics?.retweets || 0) + (t.metrics?.replies || 0) + (t.metrics?.quotes || 0);

/** Scale values to 0..1 by the sample's maximum. */
function normaliser(values) {
  const max = Math.max(...values, 0);
  return (v) => (max > 0 ? v / max : 0);
}

async function smartTarget(ctx) {
  const niche = textOf(ctx.config.niche, 'niche').trim();
  const goals = goalsOf(ctx.config.goals);
  const limit = intIn(ctx.config.limit, 1, 30, 15);
  const weights = blendWeights(goals);

  const client = await ctx.http();
  const me = await whoAmI(ctx, client);
  ctx.progress(`Searching the conversation around "${niche}"`);
  const posts = await searchPosts(client, niche, { product: 'Top', limit: Math.min(limit * 8, 160) });
  if (posts.length === 0) throw new JobInputError(`X returned no posts for "${niche}"`);

  const byAuthor = new Map();
  for (const { tweet, author } of posts) {
    if (!author || author.id === me.id || tweet.isRetweet) continue;
    const entry = byAuthor.get(author.id) || { author, posts: [] };
    entry.posts.push(tweet);
    byAuthor.set(author.id, entry);
  }
  if (byAuthor.size === 0) throw new JobInputError(`No accounts other than yours are posting about "${niche}"`);

  const nicheWords = new Set(wordsOf(niche));
  const now = Date.now();
  const rows = [...byAuthor.values()].map(({ author, posts: own }) => {
    const engagements = own.map(engagementOfPost);
    const bio = new Set(wordsOf(author.bio));
    const bioMatch = nicheWords.size ? [...nicheWords].filter((w) => bio.has(w)).length / nicheWords.size : 0;
    const newest = Math.max(...own.map((t) => Date.parse(t.createdAt) || 0));
    const best = own.reduce((a, b) => (engagementOfPost(b) > engagementOfPost(a) ? b : a));
    return {
      author,
      postsInSample: own.length,
      medianEngagement: median(engagements),
      bioMatch,
      rate: median(engagements) / Math.max(author.followers, 1),
      daysSinceActive: newest ? (now - newest) / DAY_MS : null,
      best,
    };
  });

  const relevanceOf = normaliser(rows.map((r) => r.postsInSample));
  const rateOf = normaliser(rows.map((r) => r.rate));
  const logFollowers = rows.map((r) => Math.log10(r.author.followers + 1));
  const [lowest, highest] = [Math.min(...logFollowers), Math.max(...logFollowers)];
  const audienceOf = (followers) =>
    highest > lowest ? (Math.log10(followers + 1) - lowest) / (highest - lowest) : 1;
  const scored = rows.map((r) => {
    const signals = {
      relevance: round(0.7 * relevanceOf(r.postsInSample) + 0.3 * r.bioMatch, 3),
      engagementRate: round(rateOf(r.rate), 3),
      audience: round(audienceOf(r.author.followers), 3),
      reciprocity: round(Math.min(r.author.following / Math.max(r.author.followers, 1), 1), 3),
      activity: r.daysSinceActive === null ? 0 : round(1 / (1 + r.daysSinceActive / 7), 3),
    };
    const score = Object.entries(weights).reduce((sum, [signal, w]) => sum + w * signals[signal], 0);
    return { r, signals, score: round(score * 100, 1) };
  });
  scored.sort((a, b) => b.score - a.score);

  const reasonText = {
    relevance: 'posts a lot about this niche',
    engagementRate: 'its audience engages well for its size',
    audience: 'large audience',
    reciprocity: 'follows back generously',
    activity: 'active right now',
  };
  const targets = scored.slice(0, limit).map(({ r, signals, score }, i) => {
    const top = Object.entries(weights)
      .map(([signal, w]) => [signal, w * signals[signal]])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .filter(([, v]) => v > 0)
      .map(([signal]) => reasonText[signal]);
    const actions = [];
    if (r.author.youFollow !== true) actions.push('follow');
    actions.push('reply to their best recent post');
    return {
      rank: i + 1,
      username: r.author.username,
      userId: r.author.id,
      name: r.author.name,
      bio: r.author.bio,
      followers: r.author.followers,
      following: r.author.following,
      verified: r.author.verified,
      alreadyFollowing: r.author.youFollow === true,
      followsYou: r.author.followsYou === true,
      score,
      signals,
      reasons: top,
      postsInSample: r.postsInSample,
      medianEngagement: r.medianEngagement,
      suggestedActions: actions,
      bestPost: {
        id: r.best.id,
        url: postUrl(r.best.id, r.author.username),
        text: r.best.text,
        engagement: engagementOfPost(r.best),
        postedAt: r.best.createdAt,
      },
    };
  });

  return {
    success: true,
    niche,
    goals,
    weights,
    sample: { posts: posts.length, accounts: byAuthor.size, source: 'X search, Top tab' },
    count: targets.length,
    targets,
  };
}

// ---------------------------------------------------------------------------
// audienceInsights
// ---------------------------------------------------------------------------

/** Words that say nothing about an interest: the shared list, plus bio filler. */
const STOP_WORDS = new Set([
  ...VOICE_STOP_WORDS,
  ...('where why more your with their here hes shes mine ours yours being very such those while should may might must shall got ' +
    'days life love lover living based views own opinions account official org net').split(' '),
]);

/** Frequency table of values, most common first. */
function topCounts(values, limit) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([value, count]) => ({ value, count }));
}

const pct = (n, total) => (total ? round((n / total) * 100, 1) : 0);

/** Bucket counts and shares. */
function buckets(values, edges) {
  return edges.map(({ label, min, max }) => {
    const count = values.filter((v) => v >= min && v < max).length;
    return { label, count, share: pct(count, values.length) };
  });
}

const SIZE_TIERS = [
  { label: 'under 100', min: 0, max: 100 },
  { label: '100-1K', min: 100, max: 1_000 },
  { label: '1K-10K', min: 1_000, max: 10_000 },
  { label: '10K-100K', min: 10_000, max: 100_000 },
  { label: '100K-1M', min: 100_000, max: 1_000_000 },
  { label: '1M+', min: 1_000_000, max: Infinity },
];
const AGE_TIERS = [
  { label: 'under 1 year', min: 0, max: 1 },
  { label: '1-3 years', min: 1, max: 3 },
  { label: '3-5 years', min: 3, max: 5 },
  { label: '5-10 years', min: 5, max: 10 },
  { label: '10+ years', min: 10, max: Infinity },
];

/**
 * Describe an audience from a follower sample. Pure.
 * @param {object} profile - the account whose followers these are
 * @param {object[]} followers - compact users (see userFrom)
 * @param {Date} [now]
 */
export function describeAudience(profile, followers, now = new Date()) {
  const total = followers.length;
  const years = followers
    .map((u) => (u.joined ? (now - Date.parse(u.joined)) / (365.25 * DAY_MS) : null))
    .filter((y) => y !== null && Number.isFinite(y));
  const postsPerDay = followers
    .filter((u) => u.joined)
    .map((u) => u.tweets / Math.max((now - Date.parse(u.joined)) / DAY_MS, 1));
  const followerCounts = followers.map((u) => u.followers);
  const lowSignal = followers.filter(
    (u) => (u.defaultAvatar && !u.bio?.trim()) || (u.tweets < 5 && u.following > 10 * Math.max(u.followers, 1)),
  );
  const followBackHunters = followers.filter((u) => u.following >= 1000 && u.following > 5 * Math.max(u.followers, 1));

  const bioWords = [];
  const bioTags = [];
  const bioMentions = [];
  for (const u of followers) {
    const bio = u.bio || '';
    for (const tag of bio.match(/#[\p{L}\p{N}_]+/gu) || []) bioTags.push(tag.toLowerCase());
    for (const at of bio.match(/@[A-Za-z0-9_]{1,15}/g) || []) bioMentions.push(at.toLowerCase());
    const words = new Set(wordsOf(bio.replace(/https?:\/\/\S+/g, ' ').replace(/[#@][\p{L}\p{N}_]+/gu, ' ')));
    for (const w of words) if (!STOP_WORDS.has(w) && !/^\d+$/.test(w)) bioWords.push(w);
  }
  const locations = followers.map((u) => u.location?.trim()).filter(Boolean);

  const audience = {
    sizeTiers: buckets(followerCounts, SIZE_TIERS),
    medianFollowers: median(followerCounts),
    combinedReach: followerCounts.reduce((a, b) => a + b, 0),
    medianFollowRatio: round(median(followers.map((u) => u.followers / Math.max(u.following, 1))), 2),
    verifiedShare: pct(followers.filter((u) => u.verified).length, total),
    protectedShare: pct(followers.filter((u) => u.protected).length, total),
    withBioShare: pct(followers.filter((u) => u.bio?.trim()).length, total),
    withLocationShare: pct(locations.length, total),
    withWebsiteShare: pct(followers.filter((u) => u.website).length, total),
    defaultAvatarShare: pct(followers.filter((u) => u.defaultAvatar).length, total),
  };
  const age = {
    medianYears: round(median(years), 1),
    tiers: buckets(years, AGE_TIERS),
  };
  const activity = {
    medianLifetimePosts: median(followers.map((u) => u.tweets)),
    medianPostsPerDay: round(median(postsPerDay), 2),
    dormantShare: pct(followers.filter((u) => u.tweets < 10).length, total),
  };
  const quality = {
    lowSignalShare: pct(lowSignal.length, total),
    followBackHunterShare: pct(followBackHunters.length, total),
  };
  const interests = {
    bioKeywords: topCounts(bioWords, 20),
    bioHashtags: topCounts(bioTags, 10),
    bioMentions: topCounts(bioMentions, 10),
  };
  const topLocations = topCounts(
    locations.map((l) => l.toLowerCase()),
    10,
  );
  const topFollowers = [...followers]
    .sort((a, b) => b.followers - a.followers)
    .slice(0, 10)
    .map((u) => ({ username: u.username, name: u.name, followers: u.followers, verified: u.verified, bio: u.bio }));

  const insights = [];
  const biggestTier = [...audience.sizeTiers].sort((a, b) => b.count - a.count)[0];
  if (biggestTier?.count) insights.push(`Most followers in the sample (${biggestTier.share}%) have ${biggestTier.label} followers of their own.`);
  if (interests.bioKeywords[0]) {
    insights.push(`The most common interests in their bios: ${interests.bioKeywords.slice(0, 5).map((k) => k.value).join(', ')}.`);
  }
  if (topLocations[0]) insights.push(`The most stated location is "${topLocations[0].value}" (${pct(topLocations[0].count, total)}% of the sample).`);
  if (quality.lowSignalShare >= 20) {
    insights.push(
      `${quality.lowSignalShare}% of the sample look inactive or automated ` +
        '(no bio and no avatar, or almost no posts and a lopsided follow ratio).',
    );
  }
  if (topFollowers[0] && topFollowers[0].followers > (profile.followers || 0)) {
    insights.push(`@${topFollowers[0].username} follows this account and has a larger audience (${topFollowers[0].followers} followers).`);
  }

  return { audience, age, activity, quality, interests, topLocations, topFollowers, insights };
}

async function audienceInsights(ctx) {
  const username = usernameOf(ctx.require('username'));
  const sampleSize = intIn(ctx.config.sampleSize, 20, 300, 100);
  const client = await ctx.http();
  const profile = await profileOf(client, username);
  if (!profile.followers) throw new JobInputError(`@${profile.username} has no followers to analyse`);

  ctx.progress(`Reading up to ${sampleSize} of @${profile.username}'s followers`);
  const followers = await scanUsers(client, GRAPHQL.Followers, { userId: profile.id }, {
    limit: sampleSize,
    onProgress: ({ fetched }) => ctx.progress(`Read ${fetched}/${sampleSize} followers`),
  });
  if (followers.length === 0) {
    throw Object.assign(
      new Error(`X returned no followers for @${profile.username}${profile.protected ? ' (the account is protected)' : ''}`),
      { retryable: false },
    );
  }

  return {
    success: true,
    username: profile.username,
    account: { name: profile.name, followers: profile.followers, following: profile.following, verified: profile.verified },
    sample: {
      requested: sampleSize,
      analysed: followers.length,
      coverage: pct(followers.length, profile.followers),
      order: 'most recent followers first, as X lists them',
    },
    ...describeAudience(profile, followers),
    generatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// engagementAnalytics
// ---------------------------------------------------------------------------

const PERIOD_UNITS = { h: 3_600_000, d: DAY_MS, w: 7 * DAY_MS, m: 30 * DAY_MS, y: 365 * DAY_MS };

/**
 * A period like "24h", "7d", "4w", "3m" or "1y" in milliseconds.
 * @param {unknown} value
 */
export function periodMs(value) {
  const match = String(value ?? '7d').trim().toLowerCase().match(/^(\d+)\s*([hdwmy])$/);
  const ms = match ? Number(match[1]) * PERIOD_UNITS[match[2]] : NaN;
  if (!ms || ms > 365 * DAY_MS) throw new JobInputError('period must look like 24h, 7d, 4w, 3m or 1y, up to a year');
  return ms;
}

/** How many recent posts to read to cover a period. */
const sampleFor = (ms) => (ms <= 7 * DAY_MS ? 100 : ms <= 30 * DAY_MS ? 200 : 400);

/** An HTTP-scraper post in the shape the account report reads. */
function reportPost(t) {
  return {
    id: t.id,
    text: t.text,
    timeParsed: t.createdAt,
    likes: t.metrics.likes,
    retweets: t.metrics.retweets,
    replies: t.metrics.replies,
    views: t.metrics.views,
    isRetweet: t.isRetweet,
    isReply: t.isReply,
    isQuote: Boolean(t.quotedTweet),
    hashtags: t.hashtags,
    mentions: t.mentions.map((m) => m.username),
    urls: t.urls,
    photos: t.media.filter((m) => m.type === 'photo'),
    videos: t.media.filter((m) => m.type !== 'photo'),
    quotes: t.metrics.quotes,
    bookmarks: t.metrics.bookmarks,
  };
}

/** An HTTP-scraper profile in the shape the account report reads. */
function reportProfile(p) {
  return {
    username: p.username,
    name: p.name,
    bio: p.bio,
    location: p.location,
    website: p.website,
    avatar: p.avatar,
    banner: p.header,
    verified: p.verified,
    protected: p.protected,
    joined: p.joined,
    followersCount: p.followers,
    followingCount: p.following,
    tweetCount: p.tweets,
  };
}

/**
 * The engagement report for a period, from a profile and recent posts already
 * in report shape.
 */
function analyticsResult({ period, ms, now, profile, posts, timelineEnded, engine }) {
  const from = new Date(now.getTime() - ms);
  const inPeriod = posts.filter((p) => p.timeParsed && Date.parse(p.timeParsed) >= from.getTime());
  const oldest = posts.reduce((min, p) => Math.min(min, Date.parse(p.timeParsed) || Infinity), Infinity);
  const report = buildAccountReport({ profile, tweets: inPeriod, now });
  report.meta = { ...report.meta, tier: engine, source: engine === 'oauth' ? 'X API v2, OAuth' : 'x.com GraphQL, logged-in session' };
  const authored = inPeriod.filter((p) => !p.isRetweet);
  const sum = (key) => authored.reduce((s, p) => s + (p[key] || 0), 0);
  return {
    success: true,
    period,
    window: { from: from.toISOString(), to: now.toISOString() },
    account: profile.username,
    engine,
    coverage: {
      postsRead: posts.length,
      postsInPeriod: inPeriod.length,
      complete: timelineEnded || oldest < from.getTime(),
    },
    totals: {
      posts: authored.length,
      likes: sum('likes'),
      retweets: sum('retweets'),
      replies: sum('replies'),
      quotes: sum('quotes'),
      bookmarks: sum('bookmarks'),
      views: sum('views'),
      engagements: sum('likes') + sum('retweets') + sum('replies') + sum('quotes'),
    },
    report,
  };
}

/**
 * Engagement analytics through the X API v2 with an OAuth client, for a
 * dashboard user who connected X by OAuth instead of saving a session.
 *
 * @param {{ get: Function }} api - axios instance on https://api.x.com/2
 * @param {{ period?: string, now?: Date }} options
 */
export async function analyticsViaOAuth(api, { period = '7d', now = new Date() } = {}) {
  const ms = periodMs(period);
  const meRes = await api.get('/users/me', {
    params: { 'user.fields': 'created_at,description,location,public_metrics,verified,protected,url,profile_image_url' },
  });
  const me = meRes.data?.data;
  if (!me?.id) throw Object.assign(new Error('X API did not return the connected account'), { retryable: false });

  const limit = sampleFor(ms);
  const tweets = [];
  let token;
  let timelineEnded = false;
  while (tweets.length < limit) {
    const res = await api.get(`/users/${me.id}/tweets`, {
      params: {
        max_results: 100,
        start_time: new Date(now.getTime() - ms).toISOString(),
        'tweet.fields': 'created_at,public_metrics,entities,referenced_tweets,attachments',
        ...(token ? { pagination_token: token } : {}),
      },
    });
    tweets.push(...(res.data?.data || []));
    token = res.data?.meta?.next_token;
    if (!token) {
      timelineEnded = true;
      break;
    }
  }

  const profile = {
    username: me.username,
    name: me.name,
    bio: me.description || '',
    location: me.location || '',
    website: me.url || '',
    avatar: me.profile_image_url || '',
    verified: Boolean(me.verified),
    protected: Boolean(me.protected),
    joined: me.created_at || null,
    followersCount: me.public_metrics?.followers_count || 0,
    followingCount: me.public_metrics?.following_count || 0,
    tweetCount: me.public_metrics?.tweet_count || 0,
  };
  const posts = tweets.slice(0, limit).map((t) => {
    const refs = (t.referenced_tweets || []).map((r) => r.type);
    const m = t.public_metrics || {};
    return {
      id: t.id,
      text: t.text,
      timeParsed: t.created_at,
      likes: m.like_count || 0,
      retweets: m.retweet_count || 0,
      replies: m.reply_count || 0,
      quotes: m.quote_count || 0,
      bookmarks: m.bookmark_count || 0,
      views: m.impression_count || 0,
      isRetweet: refs.includes('retweeted'),
      isReply: refs.includes('replied_to'),
      isQuote: refs.includes('quoted'),
      hashtags: (t.entities?.hashtags || []).map((h) => h.tag),
      mentions: (t.entities?.mentions || []).map((h) => h.username),
      urls: t.entities?.urls || [],
      photos: t.attachments?.media_keys || [],
      videos: [],
    };
  });
  return analyticsResult({ period, ms, now, profile, posts, timelineEnded, engine: 'oauth' });
}

/** An X API v2 client for a dashboard user connected by OAuth. */
async function oauthApiFor(userId) {
  // Loaded on first use, so processors that never take the OAuth fallback never load Prisma.
  const { prisma } = await import('../../../src/utils/prisma.js');
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.twitterAccessToken) {
    throw Object.assign(
      new Error('No X account is connected. Connect X, or save a session with POST /api/session/save-session.'),
      { name: 'XSessionError', code: 'NO_SESSION', status: 400, retryable: false },
    );
  }
  const { getTwitterClient } = await import('../../routes/twitter.js');
  return getTwitterClient(user);
}

async function engagementAnalytics(ctx) {
  const period = String(ctx.config.period || '7d');
  const ms = periodMs(period);
  if (ctx.userId && !(await ctx.hasSession())) {
    ctx.progress(`Reading your posts for the last ${period} (X API)`);
    return analyticsViaOAuth(await oauthApiFor(ctx.userId), { period });
  }

  const client = await ctx.http();
  const me = await whoAmI(ctx, client);
  const limit = sampleFor(ms);
  ctx.progress(`Reading your posts for the last ${period}`);
  const tweets = await x(() => scrapeTweets(client, me.username, { limit }));
  const now = new Date();
  return analyticsResult({
    period,
    ms,
    now,
    profile: reportProfile(me),
    posts: tweets.map(reportPost),
    timelineEnded: tweets.length < limit,
    engine: 'session',
  });
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export default {
  followUser: {
    run: onUser({ action: 'follow', capClass: 'follow', fn: followUser, after: recordFollow }),
    write: true,
    concurrency: 3,
    description: 'Follow one account',
  },
  unfollowUser: {
    run: onUser({ action: 'unfollow', capClass: 'unfollow', fn: unfollowUser, after: forgetFollow }),
    write: true,
    concurrency: 3,
    description: 'Unfollow one account',
  },
  muteUser: {
    run: onUser({ action: 'mute', capClass: 'mute', fn: muteUser }),
    write: true,
    concurrency: 3,
    description: 'Mute one account',
  },
  unmuteUser: {
    run: onUser({ action: 'unmute', capClass: 'mute', fn: unmuteUser }),
    write: true,
    concurrency: 3,
    description: 'Unmute one account',
  },
  likeTweet: {
    run: onPost({ action: 'like', capClass: 'like', fn: likeTweet }),
    write: true,
    concurrency: 3,
    description: 'Like one post',
  },
  unlikeTweet: {
    run: onPost({ action: 'unlike', capClass: 'like', fn: unlikeTweet }),
    write: true,
    concurrency: 3,
    description: 'Unlike one post',
  },
  retweetTweet: {
    run: onPost({ action: 'retweet', capClass: 'repost', fn: retweet }),
    write: true,
    concurrency: 3,
    description: 'Repost one post',
  },
  bookmarkTweet: {
    run: onPost({ action: 'bookmark', capClass: 'like', fn: bookmarkTweet }),
    write: true,
    concurrency: 3,
    description: 'Bookmark one post',
  },
  quoteTweet: {
    run: quote,
    write: true,
    description: 'Quote a post with a comment',
  },
  replyToTweet: {
    run: reply,
    write: true,
    description: 'Reply to a post',
  },
  autoFollow: {
    run: autoFollow,
    write: true,
    concurrency: 1,
    description: "Follow a user's followers, or the authors of a hashtag or keyword",
  },
  smartUnfollow: {
    run: smartUnfollow,
    write: true,
    concurrency: 1,
    description: 'Unfollow accounts that do not follow back, after a grace period',
  },
  autoRetweet: {
    run: autoRetweet,
    write: true,
    concurrency: 1,
    description: 'Repost recent posts from a user, hashtag or keyword',
  },
  bulkExecute: {
    run: bulkExecute,
    write: true,
    concurrency: 1,
    description: 'Run a list of likes, reposts, follows and other actions in order',
  },
  getNotifications: {
    run: getNotifications,
    concurrency: 3,
    description: "Read the account's notifications",
  },
  smartTarget: {
    run: smartTarget,
    description: 'Rank the accounts worth engaging with in a niche',
  },
  audienceInsights: {
    run: audienceInsights,
    description: "Describe an account's audience from a sample of its followers",
  },
  engagementAnalytics: {
    run: engagementAnalytics,
    description: "Engagement report for the account's posts over a period",
  },
};
