// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Messaging processors: direct messages, account and keyword monitors,
 * alerts, notifications, webhooks, streams, and the automation suite.
 *
 * Three families live here.
 *
 * One-shot work (sendDM, exportDMs, snapshots, the automation suite) runs to
 * completion inside its job through the session's HTTP client.
 *
 * Monitors (monitorKeyword, followerAlerts, trackEngagement,
 * reputationMonitor, streamStart, continuousMonitor, keywordMonitor) outlive
 * the job that starts them. The start job takes a first reading, stores the
 * monitor under the caller's owner key, and schedules one tick on the
 * operations queue. Each tick polls once, stores what changed, delivers it to
 * the caller's webhooks and schedules the next tick. None of them loops inside
 * its job: a monitor holding a worker slot for days would starve every other
 * job on the queue. Every start result names the endpoints that read, pause,
 * resume and stop the monitor.
 *
 * Per-caller state (monitors, their events, snapshots, webhooks and the
 * automation ledgers that stop a post being answered twice) is kept in Redis,
 * which the queue already requires, under ctx.ownerKey. A monitor started by
 * an agent keeps the agent's session sealed with AES-256-GCM, because it has
 * to act as that session after the request is gone; the seal is dropped the
 * moment the monitor stops.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { lookup as dnsLookup } from 'node:dns/promises';
import { PublicUrlError, assertPublicUrl as assertPublic, publicFetch } from '../../utils/publicUrl.js';
import { JobInputError, createJobContext, isPermanentFailure, ownerKeyForSession } from './context.js';
import { searchTweets } from '../../../src/scrapers/twitter/http/search.js';
import { scrapeTweets, scrapeTweetById } from '../../../src/scrapers/twitter/http/tweets.js';
import { scrapeProfile } from '../../../src/scrapers/twitter/http/profile.js';
import { scrapeFollowers, scrapeFollowing } from '../../../src/scrapers/twitter/http/relationships.js';
import { quoteTweet, replyToTweet, schedulePost } from '../../../src/scrapers/twitter/http/actions.js';
import { likeTweet, retweet } from '../../../src/scrapers/twitter/http/engagement.js';
import { mimeFromBuffer, uploadChunked } from '../../../src/scrapers/twitter/http/media.js';
import { REST_BASE } from '../../../src/scrapers/twitter/http/endpoints.js';
import { AuthError, NotFoundError, TwitterApiError } from '../../../src/scrapers/twitter/http/errors.js';
import { sendDM } from '../../../src/scrapers/twitter/http/dm.js';
import { deliverWebhook } from '../../../src/notifications/webhook.js';
import { Notifier } from '../../../src/notifications/notifier.js';
import { aggregateResults, analyzeBatch } from '../../../src/analytics/sentiment.js';
import { varyTweet } from '../../../src/automation/evergreenRecycler.js';
import { PROVIDER_ENV_KEYS, chatCompletion, resolveProvider } from '../../../src/ai/commentGenerator.js';

// ── Constants ───────────────────────────────────────────────────────────────

/** Internal job type: one poll of one monitor. No route queues it. */
export const MONITOR_TICK = 'messagingMonitorTick';

/** Every event a monitor can emit, and so every event a webhook can subscribe to. */
export const WEBHOOK_EVENTS = Object.freeze([
  'new_follower',
  'unfollower',
  'followed',
  'unfollowed',
  'keyword_match',
  'mention',
  'stream_item',
  'engagement_update',
  'reputation_alert',
]);

const SESSION_KEYS = ['sessionCookie', 'session', 'authToken', 'cookie'];
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const MAX_INTERVAL_MS = DAY;
const BACKOFF_CAP_MS = HOUR;
const MAX_ACTIVE_MONITORS = 25;
const MAX_WEBHOOKS = 10;
const MAX_EVENTS = 1000;
const MAX_CONSECUTIVE_ERRORS = 10;
const RETAIN_SECONDS = 7 * 24 * 3600;
const MIN_WRITE_DELAY_MS = 2000;
const SNAPSHOTS_KEPT = 10;
const LEDGER_IDS_KEPT = 5000;
const EXPORT_CONVERSATIONS_SCANNED = 500;
const REPUTATION_ALERT_AT = -0.3;
const REPUTATION_RECOVERED_AT = -0.1;
const DEFAULT_POST_HOURS_UTC = [13, 16, 19, 22, 10];
const TIME_SENSITIVE_WORDS = ['breaking', 'just now', 'today', 'right now', 'happening', 'just happened', 'this morning', 'tonight', 'yesterday', 'live now'];
const DM_MEDIA = {
  'image/jpeg': { category: 'dm_image', max: 5 * 1024 * 1024 },
  'image/png': { category: 'dm_image', max: 5 * 1024 * 1024 },
  'image/webp': { category: 'dm_image', max: 5 * 1024 * 1024 },
  'image/gif': { category: 'dm_gif', max: 15 * 1024 * 1024 },
  'video/mp4': { category: 'dm_video', max: 64 * 1024 * 1024 },
  'video/quicktime': { category: 'dm_video', max: 64 * 1024 * 1024 },
};
const MAX_DM_MEDIA_BYTES = 64 * 1024 * 1024;
const REPURPOSE_FORMATS = ['thread', 'single', 'blog', 'linkedin', 'newsletter', 'hooks'];
const STREAM_TYPES = ['keyword', 'user', 'hashtag', 'mentions'];
const LLM_PROVIDERS = ['openrouter', 'anthropic', 'openai', 'xai'];

/** Where each monitor type is read and controlled. */
const MONITOR_ROUTES = {
  monitorKeyword: { endpoint: '/api/ai/monitor/keyword', idField: 'monitorId' },
  followerAlerts: { endpoint: '/api/ai/monitor/follower-alerts', idField: 'alertId' },
  trackEngagement: { endpoint: '/api/ai/monitor/track-engagement', idField: 'monitorId' },
  reputationMonitor: { endpoint: '/api/ai/sentiment/monitor', idField: 'monitorId' },
  continuousMonitor: { endpoint: '/api/ai/automation/continuous-monitor', idField: 'monitorId' },
  keywordMonitor: { endpoint: '/api/ai/automation/keyword-monitor', idField: 'monitorId' },
};

// ── Small helpers ───────────────────────────────────────────────────────────

const nowIso = () => new Date().toISOString();

function toList(value) {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((v) => v.trim()).filter(Boolean);
  return [];
}

function toInt(value, fallback, min, max) {
  const n = Number.parseInt(value, 10);
  return Math.min(Math.max(Number.isFinite(n) ? n : fallback, min), max);
}

const DURATION_UNITS = { ms: 1, s: 1000, m: MINUTE, h: HOUR, d: DAY };

/** "30s", "15m", "1h", "2d", or a number of milliseconds. */
function parseDuration(value, label) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  const match = String(value ?? '').trim().toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(ms|s|m|h|d)$/);
  if (!match) throw new JobInputError(`${label} must be a duration such as "30s", "15m", "1h" or "2d"`);
  return Math.round(Number(match[1]) * DURATION_UNITS[match[2]]);
}

function requireUsername(value, label = 'username') {
  const username = String(value ?? '').trim().replace(/^@/, '').toLowerCase();
  if (!/^[a-z0-9_]{1,15}$/.test(username)) {
    throw new JobInputError(`${label} must be an X username: letters, digits and underscores, up to 15 characters`);
  }
  return username;
}

function requireList(ctx, field, max) {
  const list = toList(ctx.config[field]);
  if (!list.length) throw new JobInputError(`${field} is required`);
  if (list.length > max) throw new JobInputError(`${field} takes at most ${max} entries`);
  return list;
}

function tweetIdFrom(value) {
  const s = String(value ?? '').trim();
  if (/^\d{1,25}$/.test(s)) return s;
  const match = s.match(/status(?:es)?\/(\d{1,25})/);
  return match ? match[1] : null;
}

function compareIds(a, b) {
  const x = BigInt(a);
  const y = BigInt(b);
  return x < y ? -1 : x > y ? 1 : 0;
}

const byIdAscending = (a, b) => compareIds(a.id, b.id);

/** Fill `{username}` / `{{username}}` style placeholders. Unknown ones are left as written. */
function renderTemplate(template, vars) {
  return String(template).replace(/\{\{?\s*(\w+)\s*\}?\}/g, (whole, key) => (key in vars ? String(vars[key] ?? '') : whole));
}

/** The caller's delay, never under the floor that keeps an account safe, with jitter. */
function humanDelay(ms) {
  const base = Math.max(ms, MIN_WRITE_DELAY_MS);
  return base + Math.floor(Math.random() * base * 0.3);
}

function keywordQuery(keywords, extra = '') {
  const terms = keywords.map((k) => (/\s/.test(k) && !/^".*"$/.test(k) ? `"${k}"` : k));
  const query = terms.length > 1 ? `(${terms.join(' OR ')})` : terms[0];
  return extra ? `${query} ${extra}` : query;
}

function matchedKeywords(text, keywords) {
  const lower = String(text ?? '').toLowerCase();
  return keywords.filter((k) => lower.includes(k.replace(/^"|"$/g, '').toLowerCase()));
}

function engagementOf(tweet) {
  const m = tweet.metrics || {};
  return (m.likes || 0) + (m.retweets || 0) + (m.replies || 0) + (m.quotes || 0);
}

function tweetUrl(tweet) {
  return `https://x.com/${tweet.author?.username || 'i'}/status/${tweet.id}`;
}

function compactTweet(tweet) {
  return {
    id: tweet.id,
    url: tweetUrl(tweet),
    text: tweet.text,
    createdAt: tweet.createdAt,
    author: {
      id: tweet.author?.id || null,
      username: tweet.author?.username || null,
      name: tweet.author?.name || null,
      verified: Boolean(tweet.author?.verified),
    },
    metrics: tweet.metrics,
    isReply: Boolean(tweet.isReply),
    lang: tweet.lang || null,
  };
}

function compactUser(user) {
  return {
    id: user.id,
    username: user.username,
    name: user.name ?? null,
    bio: user.bio ?? null,
    verified: Boolean(user.verified),
    protected: Boolean(user.protected),
    followersCount: user.followersCount ?? null,
    followingCount: user.followingCount ?? null,
  };
}

function postedId(result) {
  return result?.rest_id ?? result?.legacy?.id_str ?? result?.tweet?.rest_id ?? null;
}

/** A failure the queue must not retry: repeating it would repeat a delivery or a message. */
function finalError(message) {
  const err = new Error(message);
  err.retryable = false;
  return err;
}

/** A UUID derived from a seed, so a retried job sends X the same request id. */
function requestIdFor(seed) {
  const hex = createHash('sha256').update(seed).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function requireOwner(ctx) {
  if (!ctx.ownerKey) {
    throw new JobInputError(
      'This operation keeps state for its caller, so it needs an identity: send your X session as sessionCookie or the X-Session-Cookie header.',
    );
  }
  return ctx.ownerKey;
}

/** The owner key the queue gives a job carrying this session value, for routes. */
export const sessionOwnerKey = ownerKeyForSession;

// ── Session sealing ─────────────────────────────────────────────────────────

function sealingKey() {
  const secret = process.env.COOKIE_ENCRYPTION_KEY || process.env.SESSION_SECRET || process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('COOKIE_ENCRYPTION_KEY must be set before a monitor can hold a session');
  }
  return createHash('sha256').update(`xactions-monitor-session:${secret || 'dev-only-key'}`).digest();
}

function sealSession(text) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', sealingKey(), iv);
  const body = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), body].map((b) => b.toString('base64url')).join('.');
}

function openSession(sealed) {
  const [iv, tag, body] = sealed.split('.').map((part) => Buffer.from(part, 'base64url'));
  const decipher = createDecipheriv('aes-256-gcm', sealingKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body), decipher.final()]).toString('utf8');
}

// ── Outbound URL safety ─────────────────────────────────────────────────────

/** The shared outbound URL check, failing the job as an input error. */
export async function assertPublicUrl(raw, label, lookup) {
  try {
    return await assertPublic(raw, label, lookup);
  } catch (err) {
    if (err instanceof PublicUrlError) throw new JobInputError(err.message);
    throw err;
  }
}

// ── Stores ──────────────────────────────────────────────────────────────────

function escapeGlob(s) {
  return s.replace(/[*?[\]\\]/g, '\\$&');
}

/** JSON values and capped newest-first lists in Redis. Connects on first use. */
class RedisStore {
  constructor(prefix) {
    this.prefix = prefix;
    this.client = null;
  }

  async redis() {
    if (!this.client) {
      const { default: Redis } = await import('ioredis');
      this.client = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: 3,
      });
      this.client.on('error', (err) => console.error(`Messaging store Redis error: ${err.message}`));
    }
    return this.client;
  }

  async get(key) {
    const raw = await (await this.redis()).get(this.prefix + key);
    return raw ? JSON.parse(raw) : null;
  }

  async set(key, value, ttlSeconds) {
    const redis = await this.redis();
    const json = JSON.stringify(value);
    if (ttlSeconds) await redis.set(this.prefix + key, json, 'EX', ttlSeconds);
    else await redis.set(this.prefix + key, json);
  }

  async del(...keys) {
    if (keys.length) await (await this.redis()).del(...keys.map((k) => this.prefix + k));
  }

  async expire(key, ttlSeconds) {
    await (await this.redis()).expire(this.prefix + key, ttlSeconds);
  }

  async keys(prefix) {
    const redis = await this.redis();
    const pattern = `${escapeGlob(this.prefix + prefix)}*`;
    const found = new Set();
    let cursor = '0';
    do {
      const [next, batch] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 500);
      cursor = next;
      for (const key of batch) found.add(key.slice(this.prefix.length));
    } while (cursor !== '0');
    return [...found];
  }

  async push(key, items, max) {
    if (!items.length) return;
    const redis = await this.redis();
    const full = this.prefix + key;
    await redis.multi().lpush(full, ...items.map((i) => JSON.stringify(i))).ltrim(full, 0, max - 1).exec();
  }

  async range(key, limit) {
    const raw = await (await this.redis()).lrange(this.prefix + key, 0, limit - 1);
    return raw.map((r) => JSON.parse(r));
  }
}

/**
 * The same interface as the Redis store, held in this process. For tests and
 * for embedding the processors where no Redis is running.
 */
export class MemoryStore {
  constructor() {
    this.values = new Map();
    this.lists = new Map();
    this.expiry = new Map();
  }

  alive(key) {
    const at = this.expiry.get(key);
    if (at && at <= Date.now()) {
      this.values.delete(key);
      this.lists.delete(key);
      this.expiry.delete(key);
      return false;
    }
    return true;
  }

  async get(key) {
    this.alive(key);
    return this.values.has(key) ? structuredClone(this.values.get(key)) : null;
  }

  async set(key, value, ttlSeconds) {
    this.values.set(key, structuredClone(value));
    if (ttlSeconds) this.expiry.set(key, Date.now() + ttlSeconds * 1000);
    else this.expiry.delete(key);
  }

  async del(...keys) {
    for (const key of keys) {
      this.values.delete(key);
      this.lists.delete(key);
      this.expiry.delete(key);
    }
  }

  async expire(key, ttlSeconds) {
    if (this.values.has(key) || this.lists.has(key)) this.expiry.set(key, Date.now() + ttlSeconds * 1000);
  }

  async keys(prefix) {
    return [...new Set([...this.values.keys(), ...this.lists.keys()])].filter((k) => k.startsWith(prefix) && this.alive(k));
  }

  async push(key, items, max) {
    this.alive(key);
    const list = this.lists.get(key) || [];
    for (const item of items) list.unshift(structuredClone(item));
    this.lists.set(key, list.slice(0, max));
  }

  async range(key, limit) {
    this.alive(key);
    return structuredClone((this.lists.get(key) || []).slice(0, limit));
  }
}

/** Monitor ticks go on the operations queue, delayed, one at a time per monitor. */
const queueScheduler = {
  async schedule(tick, delayMs) {
    const { operationsQueue } = await import('../jobQueue.js');
    const jobId = `${tick.monitorId}.g${tick.generation}.t${tick.seq}`;
    await operationsQueue.add(
      MONITOR_TICK,
      { type: MONITOR_TICK, id: jobId, monitorId: tick.monitorId, ownerKey: tick.ownerKey, generation: tick.generation, config: {} },
      { jobId, delay: Math.max(0, Math.round(delayMs)), attempts: 1, removeOnComplete: true, removeOnFail: true, priority: 20 },
    );
  },
};

// ── X helpers ───────────────────────────────────────────────────────────────

const viewers = new WeakMap();

/** The account the session is logged in as. */
function viewer(ctx) {
  if (!viewers.has(ctx)) {
    viewers.set(ctx, (async () => {
      const client = await ctx.http();
      const data = await client.request(`${REST_BASE}/1.1/account/verify_credentials.json?include_entities=false&skip_status=true`);
      const id = data?.id_str ?? data?.id;
      if (!id || !data?.screen_name) throw new TwitterApiError('X did not identify the logged-in account', { data });
      return { id: String(id), username: String(data.screen_name), name: data.name || '' };
    })());
  }
  return viewers.get(ctx);
}

async function readProfile(client, username) {
  try {
    return await scrapeProfile(client, username);
  } catch (err) {
    if (err instanceof NotFoundError) throw new JobInputError(`@${username} does not exist or is unavailable`);
    throw err;
  }
}

async function readTweet(client, tweetId) {
  try {
    return await scrapeTweetById(client, tweetId);
  } catch (err) {
    if (err instanceof NotFoundError) throw new JobInputError(`Post ${tweetId} does not exist or is unavailable`);
    throw err;
  }
}

/**
 * Send one DM with the shared sender. The request id is derived from the job,
 * so a retried job cannot send the same message twice.
 */
async function sendDirectMessage(ctx, { recipient, text, mediaId, seed }) {
  const client = await ctx.http();
  const me = await viewer(ctx);
  if (recipient.id === me.id) throw new JobInputError('An account cannot send a direct message to itself');
  try {
    const sent = await sendDM(client, recipient.id, text, {
      senderId: me.id,
      mediaId,
      requestId: requestIdFor(seed || `${ctx.operationId}:${recipient.id}:${text}`),
    });
    return { messageId: sent.messageId, conversationId: sent.conversationId, sentAt: sent.createdAt };
  } catch (err) {
    // The session was just used successfully to identify the account, so a
    // 403 here is X refusing this conversation, not a dead session.
    if (err instanceof AuthError && err.status === 403) {
      throw new JobInputError(`X refused the message to @${recipient.username} (HTTP 403): the account does not accept direct messages from you.`);
    }
    // An answer without the sent message is X refusing it; retrying will not help.
    if (err instanceof TwitterApiError && err.status === 200) throw finalError(err.message);
    throw err;
  }
}

/**
 * Fetch a URL pinned to the public address it was checked against
 * (publicFetch), with a refused URL failing the job as an input error.
 */
async function pinnedFetch(fetchImpl, lookup, url, init, label) {
  try {
    return await publicFetch(url, init, { label, lookup, fetch: fetchImpl });
  } catch (err) {
    if (err instanceof PublicUrlError) throw new JobInputError(err.message);
    throw err;
  }
}

async function downloadMedia(fetchImpl, lookup, mediaUrl) {
  let url = await assertPublicUrl(mediaUrl, 'mediaUrl', lookup);
  for (let hop = 0; hop < 4; hop++) {
    const res = await pinnedFetch(fetchImpl, lookup, url, { signal: AbortSignal.timeout(30_000) }, 'mediaUrl');
    const location = res.headers?.get?.('location');
    if (res.status >= 300 && res.status < 400 && location) {
      url = await assertPublicUrl(new URL(location, url).href, 'mediaUrl redirect', lookup);
      continue;
    }
    if (!res.ok) throw new JobInputError(`mediaUrl answered HTTP ${res.status}`);
    const declared = Number(res.headers?.get?.('content-length'));
    if (declared > MAX_DM_MEDIA_BYTES) throw new JobInputError('mediaUrl is larger than a DM attachment can be');
    const buffer = Buffer.from(await res.arrayBuffer());
    const mediaType = mimeFromBuffer(buffer) || String(res.headers?.get?.('content-type') || '').split(';')[0].trim();
    const spec = DM_MEDIA[mediaType];
    if (!spec) throw new JobInputError(`mediaUrl must be a JPEG, PNG, WebP, GIF, MP4 or MOV file (got ${mediaType || 'an unknown type'})`);
    if (buffer.length > spec.max) {
      throw new JobInputError(`mediaUrl is ${(buffer.length / 1048576).toFixed(1)} MB; X allows ${spec.max / 1048576} MB for ${mediaType} in a DM`);
    }
    return { buffer, mediaType, category: spec.category };
  }
  throw new JobInputError('mediaUrl redirected too many times');
}

/** Upload a DM attachment with the shared uploader, in its DM media category. */
async function uploadDmMedia(ctx, client, media) {
  try {
    const { mediaId } = await uploadChunked(client, media.buffer, media.mediaType, media.category);
    return mediaId;
  } catch (err) {
    if (/Media processing failed/.test(err.message)) throw finalError(`X could not process the attachment: ${err.message}`);
    throw err;
  }
}

async function captureList(ctx, client, which, username, limit, total) {
  const scrape = which === 'followers' ? scrapeFollowers : scrapeFollowing;
  ctx.progress(`Reading the ${which} of @${username}`);
  const users = await scrape(client, username, {
    limit,
    onProgress: ({ fetched }) => ctx.progress(`Read ${fetched} ${which} of @${username}`),
  });
  return {
    users,
    list: { entries: users.map((u) => [u.id, u.username]), total, complete: users.length >= total || users.length < limit },
  };
}

/**
 * What changed between two captures of one list. Losses are only reported
 * when both captures hold the whole list; otherwise an account that slipped
 * past the capture limit would read as lost.
 */
function diffList(before, after, fullUsers = []) {
  const beforeIds = new Set(before.entries.map(([id]) => id));
  const afterIds = new Set(after.entries.map(([id]) => id));
  const details = new Map(fullUsers.map((u) => [u.id, u]));
  const gained = after.entries
    .filter(([id]) => !beforeIds.has(id))
    .map(([id, username]) => (details.has(id) ? compactUser(details.get(id)) : { id, username }));
  const reliable = Boolean(before.complete && after.complete);
  const lost = reliable ? before.entries.filter(([id]) => !afterIds.has(id)).map(([id, username]) => ({ id, username })) : [];
  return { gained, lost, lossesKnown: reliable, netChange: after.total - before.total };
}

const PROFILE_FIELDS = ['name', 'bio', 'location', 'website', 'avatar', 'verified', 'protected'];
const STAT_FIELDS = ['followers', 'following', 'tweets', 'likes'];

function diffAccountSnapshots(before, after) {
  const changes = {
    profile: PROFILE_FIELDS.filter((f) => before.profile?.[f] !== after.profile?.[f]).map((field) => ({
      field,
      from: before.profile?.[field] ?? null,
      to: after.profile?.[field] ?? null,
    })),
  };
  if (before.stats && after.stats) {
    changes.stats = Object.fromEntries(STAT_FIELDS.map((f) => [f, { from: before.stats[f], to: after.stats[f], delta: after.stats[f] - before.stats[f] }]));
  }
  if (before.followers && after.followers) changes.followers = diffList(before.followers, after.followers);
  if (before.following && after.following) {
    const d = diffList(before.following, after.following);
    changes.following = { added: d.gained, removed: d.lost, removalsKnown: d.lossesKnown, netChange: d.netChange };
  }
  return changes;
}

function summarizeList(list) {
  return list ? { total: list.total, captured: list.entries.length, complete: list.complete } : null;
}

function hasInlineMentions(text) {
  return (text.match(/@\w+/g) || []).some((m) => !text.startsWith(m));
}

function isTimeSensitive(text) {
  const lower = text.toLowerCase();
  return TIME_SENSITIVE_WORDS.some((w) => lower.includes(w));
}

function csvCell(value) {
  let s = Array.isArray(value) ? value.join(' ') : String(value ?? '');
  // A cell starting with these is run as a formula by spreadsheet apps.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

// ── LLM ─────────────────────────────────────────────────────────────────────

function llmTarget() {
  const provider = LLM_PROVIDERS.find((p) => PROVIDER_ENV_KEYS[p].some((name) => process.env[name]));
  if (!provider) {
    const names = LLM_PROVIDERS.flatMap((p) => PROVIDER_ENV_KEYS[p]).join(', ');
    throw new JobInputError(`No language model is configured on this server. Set one of ${names}.`);
  }
  return resolveProvider({ provider });
}

function parseModelJson(text) {
  const cleaned = String(text).replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  const start = cleaned.search(/[[{]/);
  const end = Math.max(cleaned.lastIndexOf(']'), cleaned.lastIndexOf('}'));
  const candidate = start !== -1 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  try {
    return JSON.parse(candidate);
  } catch {
    throw new Error('The language model did not answer with valid JSON; the job will retry');
  }
}

async function askModel(target, fetchImpl, system, user, maxTokens) {
  const reply = await chatCompletion(
    target,
    [{ role: 'system', content: system }, { role: 'user', content: user }],
    { temperature: 0.7, maxTokens, fetchImpl },
  );
  return { json: parseModelJson(reply.text), model: reply.model };
}

const REPURPOSE_PROMPTS = {
  thread: 'Expand the post into an X thread of 3 to 8 posts, each under 270 characters. Answer as JSON: {"posts": ["..."]}',
  single: 'Rewrite the post as one sharper standalone post under 270 characters. Answer as JSON: {"text": "..."}',
  blog: 'Turn the post into a blog article outline. Answer as JSON: {"title": "...", "outline": ["Section heading: one sentence on what it covers"]}',
  linkedin: 'Rewrite the post as a LinkedIn post of 80 to 200 words with short paragraphs. Answer as JSON: {"text": "..."}',
  newsletter: 'Turn the post into a short newsletter section. Answer as JSON: {"subject": "...", "text": "..."}',
  hooks: 'Write five alternative opening lines that would make the same point land harder, each under 200 characters. Answer as JSON: {"hooks": ["..."]}',
};

function shapeRepurposed(format, json) {
  const strings = (v) => (Array.isArray(v) ? v.map(String).filter(Boolean) : []);
  switch (format) {
    case 'thread': {
      const posts = strings(json.posts);
      if (!posts.length) throw new Error('The language model returned no thread posts; the job will retry');
      return { posts, overLimit: posts.map((p, i) => (p.length > 280 ? i : -1)).filter((i) => i >= 0) };
    }
    case 'blog':
      if (!json.title || !strings(json.outline).length) throw new Error('The language model returned an incomplete outline; the job will retry');
      return { title: String(json.title), outline: strings(json.outline) };
    case 'newsletter':
      if (!json.subject || !json.text) throw new Error('The language model returned an incomplete newsletter section; the job will retry');
      return { subject: String(json.subject), text: String(json.text) };
    case 'hooks': {
      const hooks = strings(json.hooks);
      if (!hooks.length) throw new Error('The language model returned no hooks; the job will retry');
      return { hooks };
    }
    default:
      if (!json.text) throw new Error('The language model returned no text; the job will retry');
      return { text: String(json.text), ...(format === 'single' ? { overLimit: String(json.text).length > 280 } : {}) };
  }
}

/** The UTC hours the account's own posts have drawn the most engagement at. */
function bestPostingHours(tweets, count) {
  const byHour = new Map();
  for (const t of tweets) {
    if (t.isRetweet || t.isReply || !t.createdAt) continue;
    const hour = new Date(t.createdAt).getUTCHours();
    const bucket = byHour.get(hour) || { posts: 0, engagement: 0 };
    bucket.posts++;
    bucket.engagement += engagementOf(t);
    byHour.set(hour, bucket);
  }
  const ranked = [...byHour.entries()]
    .filter(([, b]) => b.posts >= 2)
    .map(([hour, b]) => ({ hour, posts: b.posts, avgEngagement: Math.round((b.engagement / b.posts) * 10) / 10 }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement);
  const chosen = ranked.slice(0, count).map((r) => r.hour);
  const fromHistory = chosen.length;
  for (const hour of DEFAULT_POST_HOURS_UTC) {
    if (chosen.length >= count) break;
    if (!chosen.includes(hour)) chosen.push(hour);
  }
  return {
    hours: chosen.sort((a, b) => a - b),
    source: fromHistory === 0 ? 'default' : fromHistory < count ? 'mixed' : 'history',
    ranked: ranked.slice(0, 10),
  };
}

// ── Monitor pollers ─────────────────────────────────────────────────────────
// Each takes one reading, updates `state` in place, and returns the events
// the reading produced. A baseline reading records what exists without
// treating it as new.

function collectNewTweets(record, state, tweets, toEvent) {
  const seen = new Set(state.seenIds || []);
  let fresh = tweets.filter((t) => t.id && !seen.has(t.id)).sort(byIdAscending);
  const collected = state.collected || 0;
  let complete = false;
  if (record.maxItems && collected + fresh.length >= record.maxItems) {
    fresh = fresh.slice(0, record.maxItems - collected);
    complete = true;
  }
  state.seenIds = [...new Set([...tweets.map((t) => t.id).filter(Boolean), ...(state.seenIds || [])])].slice(0, 2000);
  state.collected = collected + fresh.length;
  return {
    events: fresh.map(toEvent),
    complete,
    completeReason: complete ? `collected ${record.maxItems} items (maxItems)` : null,
    summary: { fetched: tweets.length, new: fresh.length, collected: state.collected },
  };
}

async function pollSearch(ctx, record, state) {
  const client = await ctx.http();
  const { query, keywords = [], eventType } = record.params;
  const tweets = await searchTweets(client, query, { limit: 40, type: 'Latest' });
  return collectNewTweets(record, state, tweets, (tweet) => ({
    type: eventType,
    data: { tweet: compactTweet(tweet), ...(keywords.length ? { matched: matchedKeywords(tweet.text, keywords) } : {}) },
  }));
}

async function pollUserTweets(ctx, record, state) {
  const client = await ctx.http();
  const tweets = await scrapeTweets(client, record.params.username, { limit: 20 });
  return collectNewTweets(record, state, tweets, (tweet) => ({ type: record.params.eventType, data: { tweet: compactTweet(tweet) } }));
}

async function pollFollowers(ctx, record, state, { baseline }) {
  const client = await ctx.http();
  const { username, trackFollowing = false, limit = 1000 } = record.params;
  const profile = await scrapeProfile(client, username);
  const events = [];
  const summary = { username, followers: profile.followers, following: profile.following };
  const lists = [['followers', 'new_follower', 'unfollower', profile.followers]];
  if (trackFollowing) lists.push(['following', 'followed', 'unfollowed', profile.following]);

  for (const [which, gainedType, lostType, total] of lists) {
    ctx.throwIfCancelled();
    const { users, list } = await captureList(ctx, client, which, username, limit, total);
    const previous = state[which];
    if (previous && !baseline) {
      const diff = diffList(previous, list, users);
      for (const user of diff.gained) events.push({ type: gainedType, data: { username, user } });
      for (const user of diff.lost) events.push({ type: lostType, data: { username, user } });
    }
    state[which] = { ...list, at: nowIso() };
    summary[`${which}List`] = summarizeList(list);
  }
  return { events, summary };
}

function metricDelta(now, before) {
  return Object.fromEntries(Object.keys(now).map((k) => [k, (now[k] || 0) - (before[k] || 0)]));
}

async function pollEngagement(ctx, record, state) {
  const client = await ctx.http();
  const previous = state.latest || {};
  const latest = {};
  const events = [];
  const unavailable = [];
  for (const tweetId of record.params.tweetIds) {
    ctx.throwIfCancelled();
    try {
      const tweet = await scrapeTweetById(client, tweetId);
      latest[tweetId] = tweet.metrics;
      events.push({
        type: 'engagement_update',
        data: { tweetId, url: tweetUrl(tweet), metrics: tweet.metrics, delta: previous[tweetId] ? metricDelta(tweet.metrics, previous[tweetId]) : null },
      });
    } catch (err) {
      if (!(err instanceof NotFoundError)) throw err;
      unavailable.push(tweetId);
    }
  }
  if (!Object.keys(latest).length) throw new NotFoundError('None of the tracked posts are available any more');
  state.latest = { ...previous, ...latest };
  state.samples = (state.samples || 0) + 1;
  const complete = Date.now() >= Date.parse(record.endsAt);
  return {
    events,
    complete,
    completeReason: complete ? 'the tracking window ended' : null,
    summary: { tracked: record.params.tweetIds.length, unavailable, samples: state.samples, latest: state.latest },
  };
}

async function pollReputation(ctx, record, state) {
  const client = await ctx.http();
  const { username } = record.params;
  const tweets = await searchTweets(client, `@${username} -from:${username}`, { limit: 50, type: 'Latest' });
  const seen = new Set(state.seenIds || []);
  const fresh = tweets.filter((t) => t.id && !seen.has(t.id)).sort(byIdAscending);
  state.seenIds = [...new Set([...tweets.map((t) => t.id).filter(Boolean), ...(state.seenIds || [])])].slice(0, 2000);

  const scored = await analyzeBatch(fresh.map((t) => t.text), { mode: 'rules' });
  const events = fresh.map((tweet, i) => ({
    type: 'mention',
    data: { tweet: compactTweet(tweet), sentiment: { score: scored[i].score, label: scored[i].label, keywords: scored[i].keywords } },
  }));
  state.window = [...(state.window || []), ...scored.map((s) => ({ score: s.score, label: s.label }))].slice(-100);
  const sentiment = aggregateResults(state.window);
  if (state.window.length >= 10 && sentiment.average <= REPUTATION_ALERT_AT && !state.alerting) {
    state.alerting = true;
    events.push({ type: 'reputation_alert', data: { username, sentiment, mentionsInWindow: state.window.length } });
  } else if (sentiment.average > REPUTATION_RECOVERED_AT) {
    state.alerting = false;
  }
  return {
    events,
    summary: { username, newMentions: fresh.length, sentiment, mentionsInWindow: state.window.length, alerting: Boolean(state.alerting) },
  };
}

const POLLERS = {
  search: pollSearch,
  user: pollUserTweets,
  followers: pollFollowers,
  engagement: pollEngagement,
  reputation: pollReputation,
};

function monitorLinks(type, id) {
  if (type === 'streamStart') {
    const call = (endpoint) => ({ method: 'POST', endpoint, body: { streamId: id } });
    return {
      status: call('/api/ai/streams/status'),
      history: call('/api/ai/streams/history'),
      pause: call('/api/ai/streams/pause'),
      resume: call('/api/ai/streams/resume'),
      stop: call('/api/ai/streams/stop'),
    };
  }
  const { endpoint, idField } = MONITOR_ROUTES[type];
  const call = (action) => ({ method: 'POST', endpoint, body: { action, [idField]: id } });
  return { status: call('status'), pause: call('pause'), resume: call('resume'), stop: call('stop'), list: call('list') };
}

function clampInterval(ms, min) {
  return Math.min(Math.max(ms, min), MAX_INTERVAL_MS);
}

// ── The processors ──────────────────────────────────────────────────────────

/**
 * Build the messaging processors and the stores behind them.
 *
 * @param {object} [deps]
 * @param {object} [deps.store] - key-value store (Redis in production)
 * @param {{ schedule: (tick: object, delayMs: number) => Promise<void> }} [deps.scheduler]
 * @param {typeof fetch} [deps.fetch] - network boundary for X, webhooks, media and the LLM
 * @param {typeof dnsLookup} [deps.lookup] - DNS, for the outbound URL check
 */
export function createMessaging(deps = {}) {
  const store = deps.store || new RedisStore(`${process.env.REDIS_QUEUE_PREFIX || 'xactions'}:messaging:`);
  const scheduler = deps.scheduler || queueScheduler;
  const fetchImpl = deps.fetch || ((...args) => globalThis.fetch(...args));
  const lookup = deps.lookup || dnsLookup;
  const contextDeps = { ...(deps.fetch ? { fetch: deps.fetch } : {}), ...(deps.decrypt ? { decrypt: deps.decrypt } : {}) };

  const keys = {
    monitor: (owner, id) => `${owner}:monitor:${id}`,
    state: (owner, id) => `${owner}:monitor-state:${id}`,
    events: (owner, id) => `${owner}:monitor-events:${id}`,
    webhook: (owner, id) => `${owner}:webhook:${id}`,
    snapshots: (owner, kind, username) => `${owner}:snapshots:${kind}:${username}`,
    ledger: (owner, name) => `${owner}:ledger:${name}`,
  };

  // ── Ledgers: what an automation already did for this owner ──

  const ledgers = {
    async read(owner, name, fallback) {
      return (await store.get(keys.ledger(owner, name))) || fallback;
    },
    async write(owner, name, value) {
      await store.set(keys.ledger(owner, name), value);
    },
  };

  // ── Snapshots ──

  const snapshots = {
    async save(owner, snapshot) {
      await store.push(keys.snapshots(owner, snapshot.kind, snapshot.username), [snapshot], SNAPSHOTS_KEPT);
    },
    async history(owner, kind, username, limit = SNAPSHOTS_KEPT) {
      return store.range(keys.snapshots(owner, kind, username), limit);
    },
    async latest(owner, kind, username) {
      return (await store.range(keys.snapshots(owner, kind, username), 1))[0] || null;
    },
    async find(owner, id) {
      const [kind, username] = String(id).split('.');
      if (!kind || !username) return null;
      return (await snapshots.history(owner, kind, username)).find((s) => s.id === id) || null;
    },
    /** Usernames this owner has snapshots of, with the latest per kind. */
    async accounts(owner) {
      const prefix = `${owner}:snapshots:`;
      const byUser = new Map();
      for (const key of await store.keys(prefix)) {
        const [kind, username] = key.slice(prefix.length).split(':');
        const items = await store.range(key, SNAPSHOTS_KEPT);
        if (!items.length) continue;
        const entry = byUser.get(username) || { username, snapshotCount: 0, lastSnapshotAt: null, latestFollowerCount: null, latestFollowingCount: null, kinds: [] };
        entry.snapshotCount += items.length;
        entry.kinds.push(kind);
        const latest = items[0];
        if (!entry.lastSnapshotAt || latest.createdAt > entry.lastSnapshotAt) {
          entry.lastSnapshotAt = latest.createdAt;
          entry.latestFollowerCount = latest.stats?.followers ?? latest.followers?.total ?? entry.latestFollowerCount;
          entry.latestFollowingCount = latest.stats?.following ?? latest.following?.total ?? entry.latestFollowingCount;
        }
        byUser.set(username, entry);
      }
      return [...byUser.values()].sort((a, b) => (a.lastSnapshotAt < b.lastSnapshotAt ? 1 : -1));
    },
    async remove(owner, username) {
      const found = await store.keys(`${owner}:snapshots:`);
      const mine = found.filter((key) => key.endsWith(`:${username}`));
      let count = 0;
      for (const key of mine) count += (await store.range(key, SNAPSHOTS_KEPT)).length;
      await store.del(...mine);
      return count;
    },
    diffAccount: diffAccountSnapshots,
    diffList,
  };

  function newSnapshot(kind, username) {
    return { id: `${kind}.${username}.${Date.now().toString(36)}${randomBytes(3).toString('hex')}`, kind, username, createdAt: nowIso() };
  }

  // ── Webhooks ──

  function publicWebhook(hook) {
    return {
      webhookId: hook.id,
      url: hook.url,
      events: hook.events,
      createdAt: hook.createdAt,
      lastDelivery: hook.lastDelivery || null,
    };
  }

  const webhooks = {
    async all(owner) {
      const found = await Promise.all((await store.keys(`${owner}:webhook:`)).map((key) => store.get(key)));
      return found.filter(Boolean).sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
    },
    async list(owner) {
      return (await webhooks.all(owner)).map(publicWebhook);
    },
    async get(owner, id) {
      return store.get(keys.webhook(owner, id));
    },
  };

  // A redirect could point a delivery at a host assertPublicUrl refused, so
  // deliveries do not follow one; the 3xx is recorded as the outcome.
  // Each delivery connects to the address that passed the public check, so
  // a webhook host cannot pass the check and then resolve to this server's
  // own network for the request itself.
  const deliveryFetch = (url, init) => pinnedFetch(fetchImpl, lookup, url, init, 'webhook URL');

  async function deliver(target, event, payload) {
    const record = await deliverWebhook({ url: target.url, secret: target.secret, event, payload, fetchImpl: deliveryFetch });
    const last = record.attempts[record.attempts.length - 1];
    return {
      deliveryId: record.id,
      status: record.status,
      signed: record.signed,
      attempts: record.attempts.length,
      httpStatus: last?.status ?? null,
      error: last?.error || null,
      at: record.completedAt || nowIso(),
    };
  }

  // ── Monitors ──

  const monitors = {};

  function publicMonitor(record, state) {
    return {
      monitorId: record.id,
      type: record.jobType,
      label: record.label,
      status: record.status,
      statusReason: record.statusReason || null,
      params: record.params,
      intervalMs: record.intervalMs,
      webhookUrl: record.webhookUrl || null,
      endsAt: record.endsAt || null,
      maxItems: record.maxItems || null,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      nextPollAt: record.status === 'running' ? state?.nextPollAt || null : null,
      stats: state?.stats || null,
      latest: state?.summary || null,
      links: monitorLinks(record.jobType, record.id),
    };
  }

  const freshState = () => ({
    seq: 0,
    stats: { polls: 0, events: 0, errors: 0, consecutiveErrors: 0, lastPollAt: null, lastEventAt: null, lastError: null, lastDelivery: null },
  });

  async function loadState(record) {
    return (await store.get(keys.state(record.ownerKey, record.id))) || freshState();
  }

  async function scheduleNext(record, state, delayMs) {
    state.seq = (state.seq || 0) + 1;
    state.nextPollAt = new Date(Date.now() + delayMs).toISOString();
    await store.set(keys.state(record.ownerKey, record.id), state);
    await scheduler.schedule({ monitorId: record.id, ownerKey: record.ownerKey, generation: record.generation, seq: state.seq }, delayMs);
  }

  async function finish(record, state, status, reason) {
    record.status = status;
    record.statusReason = reason;
    record.generation += 1;
    record.updatedAt = nowIso();
    record.endedAt = record.updatedAt;
    delete record.auth;
    await store.set(keys.monitor(record.ownerKey, record.id), record, RETAIN_SECONDS);
    await store.set(keys.state(record.ownerKey, record.id), state, RETAIN_SECONDS);
    await store.expire(keys.events(record.ownerKey, record.id), RETAIN_SECONDS);
  }

  async function deliverEvents(record, events) {
    const targets = [];
    if (record.webhookUrl) targets.push({ url: record.webhookUrl, secret: undefined, events: null, webhookId: null });
    for (const hook of await webhooks.all(record.ownerKey)) {
      targets.push({ url: hook.url, secret: hook.secret, events: hook.events, webhookId: hook.id });
    }
    const results = [];
    for (const target of targets) {
      const matching = target.events ? events.filter((e) => target.events.includes(e.type)) : events;
      if (!matching.length) continue;
      const types = [...new Set(matching.map((e) => e.type))];
      const event = types.length === 1 ? types[0] : 'monitor.events';
      const outcome = await deliver(target, event, {
        event,
        monitorId: record.id,
        monitorType: record.jobType,
        label: record.label,
        events: matching,
        deliveredAt: nowIso(),
      });
      results.push({ webhookId: target.webhookId, url: target.url, events: matching.length, ...outcome });
    }
    return results.length ? { at: nowIso(), results } : null;
  }

  async function recordEvents(record, state, events, { deliverNow, baseline = false }) {
    if (!events.length) return [];
    const at = nowIso();
    const stamped = events.map((e, i) => ({
      id: `${record.id}.${state.seq}.${i}`,
      monitorId: record.id,
      type: e.type,
      at,
      ...(baseline ? { baseline: true } : {}),
      data: e.data,
    }));
    await store.push(keys.events(record.ownerKey, record.id), [...stamped], MAX_EVENTS);
    state.stats.events += stamped.length;
    state.stats.lastEventAt = at;
    if (deliverNow) {
      const delivery = await deliverEvents(record, stamped);
      if (delivery) state.stats.lastDelivery = delivery;
    }
    return stamped;
  }

  function monitorContext(record) {
    const config = record.auth?.sealed ? { sessionCookie: openSession(record.auth.sealed) } : {};
    const sessionHash = record.ownerKey.startsWith('session:') ? record.ownerKey.slice('session:'.length) : undefined;
    return createJobContext(
      { id: record.id, name: record.jobType, data: { type: record.jobType, id: record.id, userId: record.auth?.userId, sessionHash, config } },
      { ...contextDeps, isCancelled: () => false },
    );
  }

  /**
   * Start a monitor from its start job: take the first reading with the
   * job's own session, store the monitor, schedule the next reading.
   */
  monitors.start = async (ctx, spec) => {
    const owner = requireOwner(ctx);
    const existing = await store.get(keys.monitor(owner, ctx.operationId));
    if (existing) {
      // A retried start job: the monitor already exists, so report it.
      return { success: true, ...publicMonitor(existing, await loadState(existing)) };
    }
    const all = await monitors.list(owner);
    const active = all.filter((m) => m.status === 'running' || m.status === 'paused');
    if (active.length >= MAX_ACTIVE_MONITORS) {
      throw new JobInputError(`You already have ${active.length} monitors running or paused (the limit is ${MAX_ACTIVE_MONITORS}); stop one first.`);
    }
    const webhookUrl = spec.webhookUrl ? (await assertPublicUrl(spec.webhookUrl, 'webhookUrl', lookup)).href : null;

    await ctx.cookieHeader();
    const raw = SESSION_KEYS.map((k) => ctx.config[k]).find((v) => typeof v === 'string' && v.trim());
    const createdAt = nowIso();
    const record = {
      id: ctx.operationId,
      ownerKey: owner,
      jobType: ctx.type,
      kind: spec.kind,
      label: spec.label,
      params: spec.params,
      intervalMs: spec.intervalMs,
      webhookUrl,
      endsAt: spec.endsAt || null,
      maxItems: spec.maxItems || null,
      status: 'running',
      generation: 1,
      createdAt,
      updatedAt: createdAt,
      auth: raw ? { sealed: sealSession(raw.trim()) } : { userId: ctx.userId },
    };
    const state = freshState();

    ctx.progress(`Taking the first reading for ${spec.label}`);
    const first = await POLLERS[spec.kind](ctx, record, state, { baseline: true });
    ctx.throwIfCancelled();
    state.stats.polls = 1;
    state.stats.lastPollAt = nowIso();
    state.summary = first.summary;

    await store.set(keys.monitor(owner, record.id), record);
    const stamped = await recordEvents(record, state, first.events, { deliverNow: false, baseline: true });
    if (first.complete) await finish(record, state, 'completed', first.completeReason);
    else await scheduleNext(record, state, record.intervalMs);

    return {
      success: true,
      ...publicMonitor(record, state),
      ...(spec.adjusted ? { adjusted: spec.adjusted } : {}),
      firstReading: { at: state.stats.lastPollAt, events: stamped.length, summary: first.summary, sample: stamped.slice(-10) },
      note: 'The monitor keeps running after this job completes. Use links.status to read what it finds and links.stop to end it.',
    };
  };

  /** One reading of one monitor, then the next is scheduled. */
  monitors.tick = async (ctx) => {
    const { monitorId, ownerKey, generation } = ctx.data;
    const record = ownerKey ? await store.get(keys.monitor(ownerKey, monitorId)) : null;
    if (!record || record.generation !== generation || record.status !== 'running') {
      return { monitorId, skipped: true, reason: record ? `the monitor is ${record.status}` : 'the monitor no longer exists' };
    }
    const state = await loadState(record);
    const inner = monitorContext(record);
    let outcome = null;
    let failure = null;
    try {
      outcome = await POLLERS[record.kind](inner, record, state, { baseline: false });
      state.stats.consecutiveErrors = 0;
      state.stats.lastError = null;
      state.summary = outcome.summary;
    } catch (err) {
      failure = err;
      state.stats.errors++;
      state.stats.consecutiveErrors++;
      state.stats.lastError = { at: nowIso(), message: err.message };
    } finally {
      await inner.dispose();
    }
    state.stats.polls++;
    state.stats.lastPollAt = nowIso();
    if (outcome) await recordEvents(record, state, outcome.events, { deliverNow: true });

    // A stop or pause may have landed while the poll ran.
    const current = await store.get(keys.monitor(ownerKey, monitorId));
    if (!current || current.generation !== generation || current.status !== 'running') {
      if (current) await store.set(keys.state(ownerKey, monitorId), state, current.status === 'paused' ? undefined : RETAIN_SECONDS);
      return { monitorId, status: current?.status || 'removed', events: outcome?.events.length ?? 0 };
    }
    if (outcome?.complete) {
      await finish(current, state, 'completed', outcome.completeReason);
      return { monitorId, status: 'completed', events: outcome.events.length };
    }
    if (failure && (isPermanentFailure(failure) || failure instanceof NotFoundError || state.stats.consecutiveErrors >= MAX_CONSECUTIVE_ERRORS)) {
      const reason = state.stats.consecutiveErrors >= MAX_CONSECUTIVE_ERRORS
        ? `stopped after ${MAX_CONSECUTIVE_ERRORS} failed readings in a row; last: ${failure.message}`
        : failure.message;
      await finish(current, state, 'failed', reason);
      return { monitorId, status: 'failed', error: reason };
    }
    const delayMs = failure ? Math.min(current.intervalMs * 2 ** state.stats.consecutiveErrors, BACKOFF_CAP_MS) : current.intervalMs;
    await scheduleNext(current, state, delayMs);
    return { monitorId, status: 'running', events: outcome?.events.length ?? 0, error: failure?.message || null, nextPollAt: state.nextPollAt };
  };

  monitors.list = async (owner, { type } = {}) => {
    const found = await Promise.all((await store.keys(`${owner}:monitor:`)).map((key) => store.get(key)));
    const records = found.filter((r) => r && (!type || r.jobType === type));
    const views = await Promise.all(records.map(async (r) => publicMonitor(r, await loadState(r))));
    return views.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  };

  monitors.get = async (owner, id) => {
    const record = await store.get(keys.monitor(owner, id));
    return record ? publicMonitor(record, await loadState(record)) : null;
  };

  monitors.events = async (owner, id, { limit = 100, type } = {}) => {
    const events = await store.range(keys.events(owner, id), type ? MAX_EVENTS : limit);
    return (type ? events.filter((e) => e.type === type) : events).slice(0, limit);
  };

  monitors.status = async (owner, id, { limit = 50, type } = {}) => {
    const view = await monitors.get(owner, id);
    if (!view) return null;
    return { ...view, events: await monitors.events(owner, id, { limit, type }) };
  };

  monitors.stop = async (owner, id) => {
    const record = await store.get(keys.monitor(owner, id));
    if (!record) return null;
    const state = await loadState(record);
    if (record.status === 'running' || record.status === 'paused') await finish(record, state, 'stopped', 'stopped by its owner');
    return publicMonitor(record, state);
  };

  monitors.pause = async (owner, id) => {
    const record = await store.get(keys.monitor(owner, id));
    if (!record) return null;
    if (record.status === 'paused') return publicMonitor(record, await loadState(record));
    if (record.status !== 'running') throw new JobInputError(`Monitor ${id} is ${record.status} and cannot be paused`);
    record.status = 'paused';
    record.generation += 1;
    record.updatedAt = nowIso();
    await store.set(keys.monitor(owner, id), record);
    return publicMonitor(record, await loadState(record));
  };

  monitors.resume = async (owner, id) => {
    const record = await store.get(keys.monitor(owner, id));
    if (!record) return null;
    if (record.status === 'running') return publicMonitor(record, await loadState(record));
    if (record.status !== 'paused') throw new JobInputError(`Monitor ${id} is ${record.status}; only a paused monitor can be resumed`);
    record.status = 'running';
    record.generation += 1;
    record.updatedAt = nowIso();
    await store.set(keys.monitor(owner, id), record);
    const state = await loadState(record);
    await scheduleNext(record, state, 1000);
    return publicMonitor(record, state);
  };

  // ── Automation: one write per candidate, charged and paced ──

  /**
   * Perform one write per item: charge the daily cap first, pause between
   * items, record an outcome for every one. A rate limit or a spent cap ends
   * the batch early with the reason; a dead session fails the job.
   */
  async function writeBatch(ctx, { items, actionClass, delayMs, dryRun, label, describe, act }) {
    const outcomes = [];
    let stoppedReason = null;
    for (const [i, item] of items.entries()) {
      ctx.throwIfCancelled();
      if (dryRun) {
        outcomes.push({ ...describe(item), status: 'dry-run' });
        continue;
      }
      try {
        await ctx.charge(actionClass, 1);
      } catch (err) {
        if (err.name !== 'ActionCapExceededError') throw err;
        stoppedReason = err.message;
        break;
      }
      try {
        outcomes.push({ ...describe(item), status: 'done', ...(await act(item)) });
      } catch (err) {
        if (err.name === 'AuthError' || err.name === 'XSessionError') throw err;
        outcomes.push({ ...describe(item), status: 'failed', error: err.message });
        if (err.name === 'RateLimitError') {
          stoppedReason = `X rate limited the account: ${err.message}`;
          break;
        }
      }
      ctx.progress(`${label}: ${i + 1} of ${items.length}`, { done: i + 1, total: items.length });
      if (i < items.length - 1) await ctx.sleep(humanDelay(delayMs));
    }
    return {
      dryRun,
      attempted: outcomes.length,
      succeeded: outcomes.filter((o) => o.status === 'done').length,
      failed: outcomes.filter((o) => o.status === 'failed').length,
      stoppedReason,
      outcomes,
    };
  }

  /** A set of ids an automation has handled, persisted after every addition. */
  async function idLedger(owner, name) {
    const saved = await ledgers.read(owner, name, { ids: [] });
    const ids = new Set(saved.ids);
    return {
      has: (id) => ids.has(id),
      async add(id) {
        ids.add(id);
        await ledgers.write(owner, name, { ids: [...ids].slice(-LEDGER_IDS_KEPT), updatedAt: nowIso() });
      },
    };
  }

  function writeSettings(ctx, defaultDelay) {
    return { delayMs: toInt(ctx.config.delayMs, defaultDelay, 0, 600_000), dryRun: Boolean(ctx.config.dryRun) };
  }

  /** Search for posts matching keywords that this owner has not handled yet. */
  async function keywordCandidates(ctx, { keywords, ledger, limit, extra }) {
    const client = await ctx.http();
    const me = await viewer(ctx);
    ctx.progress(`Searching for ${keywords.join(', ')}`);
    const found = await searchTweets(client, keywordQuery(keywords, `-from:${me.username} ${extra}`.trim()), {
      limit: Math.min(limit * 3, 200),
      type: 'Latest',
    });
    const candidates = found.filter((t) => t.author?.id !== me.id && !ledger.has(t.id)).slice(0, limit);
    return { client, me, found: found.length, candidates };
  }

  function templateFor(templates, keyword, triggers) {
    if (typeof templates === 'string') return templates;
    if (Array.isArray(templates)) {
      const index = triggers.findIndex((t) => t.toLowerCase() === keyword.toLowerCase());
      return templates[index] ?? templates[0] ?? null;
    }
    if (templates && typeof templates === 'object') {
      const key = Object.keys(templates).find((k) => k.toLowerCase() === keyword.toLowerCase());
      return templates[key] ?? templates.default ?? null;
    }
    return null;
  }

  const describeTweet = (t) => ({ tweetId: t.id, author: t.author?.username || null, url: tweetUrl(t) });

  // ── Monitor start jobs ──

  async function requireStream(owner, streamId) {
    const view = await monitors.get(owner, streamId);
    if (!view || view.type !== 'streamStart') throw new JobInputError(`No stream ${streamId} belongs to this session`);
    return view;
  }

  const processors = {
    // ── Direct messages ──

    sendDM: {
      write: true,
      description: 'Send a direct message, optionally with an image, GIF or video',
      run: async (ctx) => {
        const username = requireUsername(ctx.require('username'));
        const message = String(ctx.require('message'));
        if (message.length > 10_000) throw new JobInputError('message exceeds 10,000 characters');
        const client = await ctx.http();
        const recipient = await readProfile(client, username);

        let media = null;
        if (ctx.config.mediaUrl) {
          ctx.progress('Uploading the attachment');
          const file = await downloadMedia(fetchImpl, lookup, ctx.config.mediaUrl);
          const mediaId = await uploadDmMedia(ctx, client, file);
          media = { mediaId, mediaType: file.mediaType, bytes: file.buffer.length };
        }

        await ctx.charge('dm');
        ctx.progress(`Sending the message to @${recipient.username}`);
        const sent = await sendDirectMessage(ctx, {
          recipient: { id: recipient.id, username: recipient.username },
          text: message,
          mediaId: media?.mediaId,
          seed: `${ctx.operationId}:dm`,
        });
        return {
          success: true,
          recipient: { id: recipient.id, username: recipient.username, name: recipient.name },
          ...sent,
          messageLength: message.length,
          media,
        };
      },
    },

    getDMConversations: {
      concurrency: 3,
      description: 'List DM conversations',
      run: async (ctx) => {
        const limit = toInt(ctx.config.limit, 20, 1, 100);
        const scraper = await ctx.scraper();
        const conversations = [];
        for await (const conversation of scraper.getDmConversations(limit)) conversations.push(conversation);
        return { success: true, count: conversations.length, conversations };
      },
    },

    exportDMs: {
      description: 'Export DM history as JSON, CSV or text',
      run: async (ctx) => {
        const format = ctx.config.format ?? 'json';
        if (!['json', 'csv', 'txt'].includes(format)) throw new JobInputError('format must be json, csv or txt');
        const limit = toInt(ctx.config.limit, 1000, 1, 5000);
        const scraper = await ctx.scraper();

        ctx.progress('Reading the inbox');
        const conversations = [];
        for await (const c of scraper.getDmConversations(EXPORT_CONVERSATIONS_SCANNED)) conversations.push(c);

        const messages = [];
        for (const [i, conversation] of conversations.entries()) {
          if (messages.length >= limit) break;
          ctx.throwIfCancelled();
          ctx.progress(`Reading conversation ${i + 1} of ${conversations.length}`, { messages: messages.length });
          for await (const message of scraper.getDmMessages(conversation.id, limit - messages.length)) {
            messages.push(message.toJSON());
          }
        }

        const exportedAt = nowIso();
        const result = {
          success: true,
          format,
          exportedAt,
          filename: `xactions-dms-${exportedAt.slice(0, 10)}.${format}`,
          conversationCount: conversations.length,
          messageCount: messages.length,
          truncated: messages.length >= limit,
          conversations: conversations.map((c) => ({
            id: c.id,
            type: c.type,
            participants: c.participants,
            ...(c.name ? { name: c.name } : {}),
            updatedAt: c.updatedAt,
          })),
        };
        if (format === 'json') return { ...result, messages };
        if (format === 'csv') {
          const header = ['conversation_id', 'message_id', 'created_at', 'sender_id', 'recipient_id', 'text', 'media_urls'].join(',');
          const rows = messages.map((m) => [m.conversationId, m.id, m.createdAt, m.senderId, m.recipientId, m.text, m.mediaUrls].map(csvCell).join(','));
          return { ...result, content: [header, ...rows].join('\n') };
        }
        const byConversation = Map.groupBy(messages, (m) => m.conversationId);
        const text = conversations
          .filter((c) => byConversation.has(c.id))
          .map((c) => {
            const lines = byConversation.get(c.id).map((m) => `[${m.createdAt}] ${m.senderId}: ${m.text}${m.mediaUrls.length ? ` (${m.mediaUrls.join(' ')})` : ''}`);
            return `== ${c.name || `Conversation ${c.id}`} (participants: ${c.participants.join(', ')}) ==\n${lines.join('\n')}`;
          })
          .join('\n\n');
        return { ...result, content: text };
      },
    },

    // ── Snapshots ──

    monitorAccount: {
      description: 'Snapshot an account (profile, followers, following) and compare with the last snapshot',
      run: async (ctx) => {
        const owner = requireOwner(ctx);
        const username = requireUsername(ctx.require('username'));
        const includeFollowers = ctx.config.includeFollowers !== false;
        const includeFollowing = ctx.config.includeFollowing !== false;
        const includeStats = ctx.config.includeStats !== false;
        const limit = toInt(ctx.config.limit, 1000, 1, 5000);
        const client = await ctx.http();
        const profile = await readProfile(client, username);

        const snapshot = {
          ...newSnapshot('account', username),
          profile: Object.fromEntries(PROFILE_FIELDS.map((f) => [f, profile[f] ?? null])),
          ...(includeStats ? { stats: Object.fromEntries(STAT_FIELDS.map((f) => [f, profile[f] ?? 0])) } : {}),
        };
        if (includeFollowers) snapshot.followers = (await captureList(ctx, client, 'followers', username, limit, profile.followers)).list;
        ctx.throwIfCancelled();
        if (includeFollowing) snapshot.following = (await captureList(ctx, client, 'following', username, limit, profile.following)).list;

        const previous = await snapshots.latest(owner, 'account', username);
        await snapshots.save(owner, snapshot);
        return {
          success: true,
          username,
          snapshotId: snapshot.id,
          createdAt: snapshot.createdAt,
          isFirstSnapshot: !previous,
          previousSnapshot: previous ? { id: previous.id, createdAt: previous.createdAt } : null,
          profile: snapshot.profile,
          stats: snapshot.stats || null,
          followers: summarizeList(snapshot.followers),
          following: summarizeList(snapshot.following),
          changes: previous ? diffAccountSnapshots(previous, snapshot) : null,
          read: { method: 'GET', endpoint: `/api/ai/monitor/snapshot/${username}` },
          compare: { method: 'POST', endpoint: '/api/ai/monitor/compare', body: { username } },
        };
      },
    },

    monitorFollowers: {
      description: 'Capture an account\'s followers and report who followed and unfollowed since the last capture',
      run: (ctx) => listSnapshot(ctx, 'followers'),
    },

    monitorFollowing: {
      description: 'Capture who an account follows and report follows and unfollows since the last capture',
      run: (ctx) => listSnapshot(ctx, 'following'),
    },

    // ── Monitors ──

    monitorKeyword: {
      description: 'Watch search for new posts about a keyword',
      run: (ctx) => {
        const keyword = String(ctx.require('keyword')).trim();
        const requested = parseDuration(ctx.config.interval ?? '15m', 'interval');
        const intervalMs = clampInterval(requested, MINUTE);
        return monitors.start(ctx, {
          kind: 'search',
          label: `posts about "${keyword}"`,
          params: { query: keyword, keywords: [keyword], eventType: 'keyword_match' },
          intervalMs,
          adjusted: intervalMs !== requested ? { requestedIntervalMs: requested, intervalMs } : null,
        });
      },
    },

    followerAlerts: {
      description: 'Alert (and optionally POST to a webhook) when an account gains or loses followers',
      run: (ctx) => {
        const username = requireUsername(ctx.require('username'));
        const intervalMs = clampInterval(parseDuration(ctx.config.interval ?? '5m', 'interval'), 5 * MINUTE);
        return monitors.start(ctx, {
          kind: 'followers',
          label: `followers of @${username}`,
          params: { username, trackFollowing: false, limit: 1000 },
          intervalMs,
          webhookUrl: ctx.config.webhookUrl || null,
        });
      },
    },

    trackEngagement: {
      description: 'Sample likes, reposts, replies, quotes, bookmarks and views of up to 20 posts over time',
      run: (ctx) => {
        const tweetIds = [...new Set(toList(ctx.config.tweetIds).map(tweetIdFrom).filter(Boolean))];
        if (!tweetIds.length) throw new JobInputError('tweetIds is required');
        if (tweetIds.length > 20) throw new JobInputError('trackEngagement follows at most 20 posts');
        const intervalMs = clampInterval(parseDuration(ctx.config.interval ?? '1h', 'interval'), 5 * MINUTE);
        const durationMs = Math.min(parseDuration(ctx.config.duration ?? '24h', 'duration'), 7 * DAY);
        if (durationMs < intervalMs) throw new JobInputError('duration must be at least one interval long');
        return monitors.start(ctx, {
          kind: 'engagement',
          label: `engagement on ${tweetIds.length} post${tweetIds.length === 1 ? '' : 's'}`,
          params: { tweetIds, durationMs },
          intervalMs,
          endsAt: new Date(Date.now() + durationMs).toISOString(),
        });
      },
    },

    reputationMonitor: {
      description: 'Score the sentiment of new mentions of an account and alert on a downturn',
      run: (ctx) => {
        const username = requireUsername(ctx.require('username'));
        const intervalMs = clampInterval(parseDuration(ctx.config.interval ?? '1h', 'interval'), 5 * MINUTE);
        return monitors.start(ctx, {
          kind: 'reputation',
          label: `reputation of @${username}`,
          params: { username },
          intervalMs,
          webhookUrl: ctx.config.webhookUrl || null,
        });
      },
    },

    streamStart: {
      description: 'Stream new posts for a keyword, hashtag, account or mentions of an account',
      run: (ctx) => {
        const streamType = ctx.config.streamType || 'keyword';
        if (!STREAM_TYPES.includes(streamType)) throw new JobInputError(`streamType must be one of ${STREAM_TYPES.join(', ')}`);
        const intervalMs = toInt(ctx.config.intervalSeconds, 60, 30, 3600) * 1000;
        const maxItems = toInt(ctx.config.maxItems, 1000, 1, 10_000);
        let spec;
        if (streamType === 'user') {
          const username = requireUsername(ctx.config.username);
          spec = { kind: 'user', label: `posts by @${username}`, params: { username, eventType: 'stream_item' } };
        } else if (streamType === 'mentions') {
          const username = requireUsername(ctx.config.username);
          spec = { kind: 'search', label: `mentions of @${username}`, params: { query: `@${username} -from:${username}`, eventType: 'stream_item' } };
        } else if (streamType === 'hashtag') {
          const hashtag = String(ctx.require('hashtag')).replace(/^#/, '').trim();
          if (!/^\w{1,100}$/u.test(hashtag)) throw new JobInputError('hashtag must be a single word');
          spec = { kind: 'search', label: `#${hashtag}`, params: { query: `#${hashtag}`, keywords: [`#${hashtag}`], eventType: 'stream_item' } };
        } else {
          const keyword = String(ctx.require('keyword')).trim();
          spec = { kind: 'search', label: `"${keyword}"`, params: { query: keyword, keywords: [keyword], eventType: 'stream_item' } };
        }
        return monitors.start(ctx, { ...spec, params: { ...spec.params, streamType }, intervalMs, maxItems });
      },
    },

    streamPause: {
      description: 'Pause a running stream',
      run: async (ctx) => {
        const owner = requireOwner(ctx);
        const streamId = String(ctx.require('streamId'));
        await requireStream(owner, streamId);
        return { success: true, streamId, ...(await monitors.pause(owner, streamId)) };
      },
    },

    streamResume: {
      description: 'Resume a paused stream',
      run: async (ctx) => {
        const owner = requireOwner(ctx);
        const streamId = String(ctx.require('streamId'));
        await requireStream(owner, streamId);
        return { success: true, streamId, ...(await monitors.resume(owner, streamId)) };
      },
    },

    continuousMonitor: {
      description: 'Watch an account\'s followers and following continuously and report every change',
      run: async (ctx) => {
        const username = ctx.config.username ? requireUsername(ctx.config.username) : (await viewer(ctx)).username.toLowerCase();
        const intervalMs = toInt(ctx.config.intervalMs, 5 * MINUTE, 5 * MINUTE, MAX_INTERVAL_MS);
        return monitors.start(ctx, {
          kind: 'followers',
          label: `followers and following of @${username}`,
          params: { username, trackFollowing: true, limit: 1000 },
          intervalMs,
          webhookUrl: ctx.config.webhookUrl || null,
        });
      },
    },

    keywordMonitor: {
      description: 'Watch search for new posts matching any of several keywords',
      run: (ctx) => {
        const keywords = requireList(ctx, 'keywords', 20);
        const intervalMs = toInt(ctx.config.intervalMs, MINUTE, MINUTE, MAX_INTERVAL_MS);
        return monitors.start(ctx, {
          kind: 'search',
          label: `posts about ${keywords.map((k) => `"${k}"`).join(', ')}`,
          params: { query: keywordQuery(keywords, '-filter:retweets'), keywords, eventType: 'keyword_match' },
          intervalMs,
          webhookUrl: ctx.config.webhookUrl || null,
        });
      },
    },

    [MONITOR_TICK]: {
      concurrency: 4,
      quiet: true,
      description: 'Take one reading of one running monitor and schedule the next',
      run: (ctx) => monitors.tick(ctx),
    },

    // ── Notifications and webhooks ──

    sendNotification: {
      description: 'Deliver one notification to a webhook, Slack or Discord URL',
      run: async (ctx) => {
        const channel = ctx.config.channel || 'webhook';
        if (!['webhook', 'slack', 'discord'].includes(channel)) throw new JobInputError('channel must be webhook, slack or discord');
        const url = (await assertPublicUrl(ctx.require('webhookUrl'), 'webhookUrl', lookup)).href;
        const event = String(ctx.config.event || 'xactions.notification');
        const data = ctx.config.data && typeof ctx.config.data === 'object' ? ctx.config.data : {};

        if (channel === 'webhook') {
          const delivery = await deliver({ url }, event, { event, data, sentAt: nowIso() });
          if (delivery.status !== 'delivered') {
            throw finalError(`The webhook was not delivered after ${delivery.attempts} attempt(s): ${delivery.error || `HTTP ${delivery.httpStatus}`}`);
          }
          return { success: true, channel, event, delivery };
        }

        const notifier = new Notifier();
        notifier.config = { [channel]: { enabled: true, webhookUrl: url } };
        const message = typeof data.message === 'string' ? data.message : `\`\`\`${JSON.stringify(data, null, 2).slice(0, 2800)}\`\`\``;
        const results = await notifier.send({ type: event, title: String(data.title || event), message, data, severity: data.severity || 'info' });
        const outcome = results[channel];
        if (!outcome || outcome.error) throw finalError(`The ${channel} notification was not delivered: ${outcome?.error || 'no response'}`);
        return { success: true, channel, event, delivery: outcome };
      },
    },

    webhookCreate: {
      description: 'Register a signed webhook for monitor events',
      run: async (ctx) => {
        const owner = requireOwner(ctx);
        const url = (await assertPublicUrl(ctx.require('url'), 'url', lookup)).href;
        const requested = toList(ctx.config.events);
        const unknown = requested.filter((e) => !WEBHOOK_EVENTS.includes(e));
        if (unknown.length) throw new JobInputError(`Unknown event(s): ${unknown.join(', ')}. Valid events: ${WEBHOOK_EVENTS.join(', ')}`);
        const existing = await webhooks.all(owner);
        if (existing.length >= MAX_WEBHOOKS) throw new JobInputError(`You already have ${existing.length} webhooks (the limit is ${MAX_WEBHOOKS}); delete one first.`);
        const hook = {
          id: `wh_${randomBytes(8).toString('hex')}`,
          url,
          events: requested.length ? [...new Set(requested)] : [...WEBHOOK_EVENTS],
          secret: `whsec_${randomBytes(24).toString('base64url')}`,
          createdAt: nowIso(),
        };
        await store.set(keys.webhook(owner, hook.id), hook);
        return {
          success: true,
          ...publicWebhook(hook),
          secret: hook.secret,
          signing: {
            header: 'X-XActions-Signature',
            scheme: 'sha256=<hex HMAC-SHA256 of "<X-XActions-Timestamp>.<raw body>" keyed with this secret>',
            verify: 'verifyWebhookSignature(rawBody, headers, secret) from the xactions package',
          },
          note: 'The secret is shown only once. Every monitor event you subscribed to is POSTed to this URL.',
        };
      },
    },

    webhookDelete: {
      description: 'Delete a webhook',
      run: async (ctx) => {
        const owner = requireOwner(ctx);
        const webhookId = String(ctx.require('webhookId'));
        const hook = await webhooks.get(owner, webhookId);
        if (!hook) throw new JobInputError(`No webhook ${webhookId} belongs to this session`);
        await store.del(keys.webhook(owner, webhookId));
        return { success: true, webhookId, deleted: true, url: hook.url };
      },
    },

    webhookTest: {
      description: 'Send a signed test event to a webhook',
      run: async (ctx) => {
        const owner = requireOwner(ctx);
        const webhookId = String(ctx.require('webhookId'));
        const hook = await webhooks.get(owner, webhookId);
        if (!hook) throw new JobInputError(`No webhook ${webhookId} belongs to this session`);
        const delivery = await deliver(hook, 'webhook.test', {
          event: 'webhook.test',
          webhookId,
          subscribedEvents: hook.events,
          message: 'Test delivery from XActions. Verify the X-XActions-Signature header with your webhook secret.',
          sentAt: nowIso(),
        });
        hook.lastDelivery = delivery;
        await store.set(keys.webhook(owner, webhookId), hook);
        return { success: true, webhookId, url: hook.url, delivered: delivery.status === 'delivered', delivery };
      },
    },

    // ── Automation suite ──

    autoReply: {
      write: true,
      description: 'Reply to new posts matching keywords with a template',
      run: async (ctx) => {
        const owner = requireOwner(ctx);
        const keywords = requireList(ctx, 'keywords', 20);
        const template = String(ctx.require('replyTemplate'));
        const limit = toInt(ctx.config.limit, 50, 1, 100);
        const { delayMs, dryRun } = writeSettings(ctx, 2000);
        const ledger = await idLedger(owner, 'autoReply');
        const { client, found, candidates } = await keywordCandidates(ctx, { keywords, ledger, limit, extra: '-filter:retweets -filter:replies' });
        const batch = await writeBatch(ctx, {
          items: candidates,
          actionClass: 'reply',
          delayMs,
          dryRun,
          label: 'Auto-reply',
          describe: describeTweet,
          act: async (tweet) => {
            const text = renderTemplate(template, {
              username: tweet.author.username,
              name: tweet.author.name,
              keyword: matchedKeywords(tweet.text, keywords)[0] || keywords[0],
            });
            const posted = await replyToTweet(client, tweet.id, text);
            await ledger.add(tweet.id);
            return { replyId: postedId(posted), text };
          },
        });
        return { success: true, keywords, searched: found, candidates: candidates.length, ...batch };
      },
    },

    autoRepost: {
      write: true,
      description: 'Repost new posts matching keywords',
      run: async (ctx) => {
        const owner = requireOwner(ctx);
        const keywords = requireList(ctx, 'keywords', 20);
        const limit = toInt(ctx.config.limit, 20, 1, 100);
        const { delayMs, dryRun } = writeSettings(ctx, 3000);
        const ledger = await idLedger(owner, 'autoRepost');
        const { client, found, candidates } = await keywordCandidates(ctx, { keywords, ledger, limit, extra: '-filter:retweets -filter:replies' });
        const batch = await writeBatch(ctx, {
          items: candidates,
          actionClass: 'repost',
          delayMs,
          dryRun,
          label: 'Auto-repost',
          describe: describeTweet,
          act: async (tweet) => {
            await retweet(client, tweet.id);
            await ledger.add(tweet.id);
            return {};
          },
        });
        return { success: true, keywords, searched: found, candidates: candidates.length, ...batch };
      },
    },

    quoteTweetAuto: {
      write: true,
      description: 'Quote new posts matching keywords with a comment template',
      run: async (ctx) => {
        const owner = requireOwner(ctx);
        const keywords = requireList(ctx, 'keywords', 20);
        const template = String(ctx.require('commentTemplate'));
        const limit = toInt(ctx.config.limit, 10, 1, 50);
        const { delayMs, dryRun } = writeSettings(ctx, 5000);
        const ledger = await idLedger(owner, 'quoteTweetAuto');
        const { client, found, candidates } = await keywordCandidates(ctx, { keywords, ledger, limit, extra: '-filter:retweets -filter:replies' });
        const batch = await writeBatch(ctx, {
          items: candidates,
          actionClass: 'post',
          delayMs,
          dryRun,
          label: 'Quote posts',
          describe: describeTweet,
          act: async (tweet) => {
            const text = renderTemplate(template, {
              username: tweet.author.username,
              name: tweet.author.name,
              keyword: matchedKeywords(tweet.text, keywords)[0] || keywords[0],
            });
            const posted = await quoteTweet(client, tweet.id, text);
            await ledger.add(tweet.id);
            return { quoteId: postedId(posted), text };
          },
        });
        return { success: true, keywords, searched: found, candidates: candidates.length, ...batch };
      },
    },

    plugReplies: {
      write: true,
      description: 'Reply to your own posts that pass a like threshold with a plug',
      run: async (ctx) => {
        const owner = requireOwner(ctx);
        const plugText = String(ctx.require('plugText'));
        if (plugText.length > 280) throw new JobInputError('plugText must fit in one post (280 characters)');
        const minLikes = toInt(ctx.config.minLikes, 100, 0, 1_000_000_000);
        const limit = toInt(ctx.config.limit, 5, 1, 20);
        const { delayMs, dryRun } = writeSettings(ctx, 3000);
        const client = await ctx.http();
        const me = await viewer(ctx);
        const ledger = await idLedger(owner, 'plugReplies');

        let posts;
        if (ctx.config.tweetUrl) {
          const id = tweetIdFrom(ctx.config.tweetUrl);
          if (!id) throw new JobInputError('tweetUrl must be a link to a post or a post id');
          const tweet = await readTweet(client, id);
          if (tweet.author?.id !== me.id) throw new JobInputError(`Plug replies go under your own posts; that post is by @${tweet.author?.username}`);
          posts = [tweet];
        } else {
          ctx.progress('Reading your recent posts');
          posts = (await scrapeTweets(client, me.username, { limit: 50 })).filter((t) => !t.isRetweet && !t.isReply);
        }

        const skipped = [];
        const eligible = [];
        for (const post of posts) {
          if (ledger.has(post.id)) skipped.push({ ...describeTweet(post), status: 'skipped', reason: 'already plugged' });
          else if ((post.metrics?.likes || 0) < minLikes) skipped.push({ ...describeTweet(post), status: 'skipped', reason: `${post.metrics?.likes || 0} likes, under minLikes ${minLikes}` });
          else eligible.push(post);
        }
        const batch = await writeBatch(ctx, {
          items: eligible.slice(0, limit),
          actionClass: 'reply',
          delayMs,
          dryRun,
          label: 'Plug replies',
          describe: (t) => ({ ...describeTweet(t), likes: t.metrics?.likes || 0 }),
          act: async (tweet) => {
            const posted = await replyToTweet(client, tweet.id, plugText);
            await ledger.add(tweet.id);
            return { replyId: postedId(posted) };
          },
        });
        return { success: true, minLikes, scanned: posts.length, eligible: eligible.length, ...batch, outcomes: [...batch.outcomes, ...skipped] };
      },
    },

    engagementBooster: {
      write: true,
      description: 'Like recent posts from target accounts within a daily action budget',
      run: async (ctx) => {
        const owner = requireOwner(ctx);
        const targets = requireList(ctx, 'targetAccounts', 25).map((u) => requireUsername(u, 'targetAccounts'));
        const actionsPerDay = toInt(ctx.config.actionsPerDay, 50, 1, 500);
        const { delayMs, dryRun } = writeSettings(ctx, 3000);
        const client = await ctx.http();
        const saved = await ledgers.read(owner, 'engagementBooster', { actions: [], liked: [] });
        const windowStart = Date.now() - DAY;
        const recent = saved.actions.filter((at) => at > windowStart);
        const budget = actionsPerDay - recent.length;
        if (budget <= 0) {
          return {
            success: true,
            actionsPerDay,
            usedInLast24h: recent.length,
            budget: 0,
            nextActionAt: new Date(Math.min(...recent) + DAY).toISOString(),
            attempted: 0,
            succeeded: 0,
            failed: 0,
            outcomes: [],
          };
        }

        const liked = new Set(saved.liked);
        const queues = [];
        const skipped = [];
        for (const username of targets) {
          ctx.throwIfCancelled();
          ctx.progress(`Reading recent posts by @${username}`);
          try {
            const posts = (await scrapeTweets(client, username, { limit: 10 })).filter((t) => !t.isRetweet && !t.isReply && !liked.has(t.id));
            queues.push(posts);
          } catch (err) {
            if (!(err instanceof NotFoundError)) throw err;
            skipped.push({ author: username, status: 'skipped', reason: 'account not found' });
          }
        }
        const picks = [];
        for (let round = 0; picks.length < budget && queues.some((q) => q.length > round); round++) {
          for (const queue of queues) {
            if (picks.length >= budget) break;
            if (queue[round]) picks.push(queue[round]);
          }
        }

        const record = async (tweetId) => {
          liked.add(tweetId);
          recent.push(Date.now());
          await ledgers.write(owner, 'engagementBooster', { actions: recent, liked: [...liked].slice(-LEDGER_IDS_KEPT) });
        };
        const batch = await writeBatch(ctx, {
          items: picks,
          actionClass: 'like',
          delayMs,
          dryRun,
          label: 'Engagement booster',
          describe: describeTweet,
          act: async (tweet) => {
            await likeTweet(client, tweet.id);
            await record(tweet.id);
            return { action: 'like' };
          },
        });
        return { success: true, targets, actionsPerDay, usedInLast24h: recent.length, budget, ...batch, outcomes: [...batch.outcomes, ...skipped] };
      },
    },

    welcomeFollowers: {
      write: true,
      description: 'DM a welcome message to accounts that followed since the last run',
      run: async (ctx) => {
        const owner = requireOwner(ctx);
        const template = String(ctx.require('messageTemplate'));
        if (template.length > 10_000) throw new JobInputError('messageTemplate exceeds 10,000 characters');
        const max = toInt(ctx.config.maxMessages, 20, 1, 50);
        const { delayMs, dryRun } = writeSettings(ctx, 5000);
        const client = await ctx.http();
        const me = await viewer(ctx);
        ctx.progress('Reading your newest followers');
        const followers = await scrapeFollowers(client, me.username, { limit: 200 });
        const saved = await ledgers.read(owner, 'welcomeFollowers', null);

        if (!saved) {
          if (!dryRun) await ledgers.write(owner, 'welcomeFollowers', { ids: followers.map((u) => u.id), baselineAt: nowIso() });
          return {
            success: true,
            baseline: true,
            followersRecorded: followers.length,
            attempted: 0,
            succeeded: 0,
            failed: 0,
            outcomes: [],
            message: 'First run: your current followers are recorded as already welcomed. Run this again to welcome everyone who follows you from now on.',
          };
        }

        const known = new Set(saved.ids);
        const persist = async () => ledgers.write(owner, 'welcomeFollowers', { ...saved, ids: [...known].slice(-20_000) });
        const fresh = followers.filter((u) => !known.has(u.id)).reverse();
        const batch = await writeBatch(ctx, {
          items: fresh.slice(0, max),
          actionClass: 'dm',
          delayMs,
          dryRun,
          label: 'Welcome messages',
          describe: (u) => ({ userId: u.id, username: u.username }),
          act: async (user) => {
            try {
              const sent = await sendDirectMessage(ctx, {
                recipient: { id: user.id, username: user.username },
                text: renderTemplate(template, { username: user.username, name: user.name || user.username }),
                seed: `welcome:${owner}:${user.id}`,
              });
              known.add(user.id);
              await persist();
              return { messageId: sent.messageId };
            } catch (err) {
              // An account that does not accept messages would refuse again next run.
              if (err instanceof JobInputError) {
                known.add(user.id);
                await persist();
              }
              throw err;
            }
          },
        });
        return { success: true, baseline: false, newFollowers: fresh.length, remaining: Math.max(0, fresh.length - batch.attempted), ...batch };
      },
    },

    customerService: {
      write: true,
      description: 'Answer mentions that contain trigger keywords with the matching template',
      run: async (ctx) => {
        const owner = requireOwner(ctx);
        const triggers = requireList(ctx, 'triggerKeywords', 50);
        const templates = ctx.require('responseTemplates');
        const limit = toInt(ctx.config.limit, 20, 1, 50);
        const { delayMs, dryRun } = writeSettings(ctx, 2000);
        const client = await ctx.http();
        const me = await viewer(ctx);
        const ledger = await idLedger(owner, 'customerService');

        ctx.progress('Reading your mentions');
        const mentions = await searchTweets(client, `@${me.username} -from:${me.username}`, { limit: 100, type: 'Latest' });
        const skipped = [];
        const work = [];
        for (const tweet of mentions) {
          if (ledger.has(tweet.id)) continue;
          const keyword = matchedKeywords(tweet.text, triggers)[0];
          if (!keyword) continue;
          const template = templateFor(templates, keyword, triggers);
          if (!template) skipped.push({ ...describeTweet(tweet), status: 'skipped', reason: `no response template for "${keyword}"` });
          else work.push({ tweet, keyword, template: String(template) });
        }
        const batch = await writeBatch(ctx, {
          items: work.slice(0, limit),
          actionClass: 'reply',
          delayMs,
          dryRun,
          label: 'Customer service replies',
          describe: (w) => ({ ...describeTweet(w.tweet), keyword: w.keyword }),
          act: async ({ tweet, template }) => {
            const text = renderTemplate(template, { username: tweet.author.username, name: tweet.author.name });
            const posted = await replyToTweet(client, tweet.id, text);
            await ledger.add(tweet.id);
            return { replyId: postedId(posted), text };
          },
        });
        return { success: true, scanned: mentions.length, matched: work.length, ...batch, outcomes: [...batch.outcomes, ...skipped] };
      },
    },

    evergreenRecycle: {
      write: true,
      description: 'Schedule your best older posts to go out again, one slot at a time',
      run: async (ctx) => {
        const owner = requireOwner(ctx);
        const minAgeDays = toInt(ctx.config.minAge, 30, 1, 3650);
        const minEngagement = toInt(ctx.config.minEngagement, 10, 0, 1_000_000_000);
        const limit = toInt(ctx.config.limit, 20, 1, 50);
        const perDay = toInt(ctx.config.perDay, 1, 1, 4);
        const hourUtc = toInt(ctx.config.hourUtc, 15, 0, 23);
        const dryRun = Boolean(ctx.config.dryRun);
        const client = await ctx.http();
        const me = await viewer(ctx);
        const saved = await ledgers.read(owner, 'evergreenRecycle', { recycled: {} });
        const recentCutoff = Date.now() - 90 * DAY;

        ctx.progress('Reading your posts');
        const posts = await scrapeTweets(client, me.username, { limit: 200 });
        const minAgeMs = minAgeDays * DAY;
        const candidates = posts
          .filter((t) => !t.isReply && !t.isRetweet && !t.quotedTweet && !t.media?.length && t.text)
          .filter((t) => Date.now() - Date.parse(t.createdAt) >= minAgeMs)
          .filter((t) => engagementOf(t) >= minEngagement)
          .filter((t) => !hasInlineMentions(t.text) && !isTimeSensitive(t.text))
          .filter((t) => !(saved.recycled[t.id] && Date.parse(saved.recycled[t.id]) > recentCutoff))
          .sort((a, b) => engagementOf(b) - engagementOf(a))
          .slice(0, limit);

        const tomorrow = new Date();
        tomorrow.setUTCHours(0, 0, 0, 0);
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
        const spacing = Math.floor(24 / perDay);
        const plan = candidates.map((tweet, i) => {
          const at = new Date(tomorrow);
          at.setUTCDate(at.getUTCDate() + Math.floor(i / perDay));
          at.setUTCHours((hourUtc + (i % perDay) * spacing) % 24);
          return { tweet, at, text: varyTweet(tweet.text).varied };
        });

        const batch = await writeBatch(ctx, {
          items: plan,
          actionClass: 'post',
          delayMs: 2000,
          dryRun,
          label: 'Evergreen scheduling',
          describe: ({ tweet, at, text }) => ({ ...describeTweet(tweet), engagement: engagementOf(tweet), scheduledFor: at.toISOString(), text }),
          act: async ({ tweet, at, text }) => {
            const { scheduledTweetId } = await schedulePost(client, text, at);
            if (!scheduledTweetId) throw new TwitterApiError('X did not confirm the scheduled post');
            saved.recycled[tweet.id] = at.toISOString();
            await ledgers.write(owner, 'evergreenRecycle', saved);
            return { scheduledTweetId };
          },
        });
        return {
          success: true,
          scanned: posts.length,
          criteria: { minAgeDays, minEngagement, perDay, hourUtc },
          candidates: candidates.length,
          ...batch,
          note: 'Scheduled posts are held by X and appear under your scheduled posts, where they can be edited or cancelled.',
        };
      },
    },

    contentRepurpose: {
      description: 'Rewrite posts into a thread, a single post, a blog outline, a LinkedIn post, a newsletter section or new hooks',
      run: async (ctx) => {
        const format = ctx.config.format || 'thread';
        if (!REPURPOSE_FORMATS.includes(format)) throw new JobInputError(`format must be one of ${REPURPOSE_FORMATS.join(', ')}`);
        const ids = [...new Set(toList(ctx.config.tweetIds).map(tweetIdFrom).filter(Boolean))];
        if (!ids.length) throw new JobInputError('tweetIds is required');
        if (ids.length > 10) throw new JobInputError('contentRepurpose takes at most 10 posts');
        const target = llmTarget();
        const client = await ctx.http();

        const results = [];
        let model = null;
        for (const [i, id] of ids.entries()) {
          ctx.throwIfCancelled();
          ctx.progress(`Repurposing post ${i + 1} of ${ids.length}`);
          let tweet;
          try {
            tweet = await scrapeTweetById(client, id);
          } catch (err) {
            if (!(err instanceof NotFoundError)) throw err;
            results.push({ tweetId: id, error: 'post not found or unavailable' });
            continue;
          }
          const reply = await askModel(
            target,
            fetchImpl,
            'You repurpose posts from X into other formats. Keep the author\'s voice, facts and claims. Never invent statistics, quotes or links. Answer with JSON only.',
            `${REPURPOSE_PROMPTS[format]}\n\nPost by @${tweet.author?.username}:\n"""${tweet.text}"""`,
            1200,
          );
          model = reply.model;
          results.push({ tweetId: id, original: { url: tweetUrl(tweet), text: tweet.text, metrics: tweet.metrics }, output: shapeRepurposed(format, reply.json) });
        }
        if (results.every((r) => r.error)) throw new JobInputError('None of the posts could be read');
        return { success: true, format, model, count: results.filter((r) => !r.error).length, results };
      },
    },

    contentCalendar: {
      description: 'Plan posts for a niche in your voice, timed to the hours your posts do best',
      run: async (ctx) => {
        const niche = String(ctx.require('niche')).trim();
        if (niche.length > 200) throw new JobInputError('niche must be under 200 characters');
        const perDay = toInt(ctx.config.tweetsPerDay, 3, 1, 5);
        const days = toInt(ctx.config.days, 7, 1, 14);
        const target = llmTarget();
        const client = await ctx.http();
        const me = await viewer(ctx);

        ctx.progress('Reading your recent posts for voice and timing');
        const history = await scrapeTweets(client, me.username, { limit: 100 });
        const timing = bestPostingHours(history, perDay);
        const voice = history
          .filter((t) => !t.isRetweet && !t.isReply)
          .sort((a, b) => engagementOf(b) - engagementOf(a))
          .slice(0, 5)
          .map((t) => `- ${t.text.replace(/\s+/g, ' ').slice(0, 280)}`);

        ctx.progress('Drafting the calendar');
        const total = perDay * days;
        const reply = await askModel(
          target,
          fetchImpl,
          'You plan social media calendars for X. Every post is under 270 characters, specific, and useful to the audience. Never invent statistics or links. Answer with JSON only.',
          [
            `Plan ${total} posts about "${niche}": ${perDay} per day for ${days} days.`,
            voice.length ? `Match the voice of these posts by @${me.username}:\n${voice.join('\n')}` : `The account is @${me.username}.`,
            'Vary the formats: tip, question, story, opinion, thread-hook, resource.',
            'Answer as a JSON array of objects: {"day": 1, "slot": 1, "topic": "...", "format": "...", "text": "..."} with day from 1 and slot from 1.',
          ].join('\n\n'),
          Math.min(8000, 200 + total * 120),
        );
        if (!Array.isArray(reply.json)) throw new Error('The language model did not return a list of posts; the job will retry');

        const start = new Date();
        start.setUTCHours(0, 0, 0, 0);
        start.setUTCDate(start.getUTCDate() + 1);
        const calendar = reply.json
          .filter((item) => item && typeof item.text === 'string' && item.text.trim())
          .map((item) => ({ ...item, day: toInt(item.day, 1, 1, days), slot: toInt(item.slot, 1, 1, perDay) }))
          .sort((a, b) => a.day - b.day || a.slot - b.slot)
          .slice(0, total)
          .map((item) => {
            const at = new Date(start);
            at.setUTCDate(at.getUTCDate() + item.day - 1);
            at.setUTCHours(timing.hours[item.slot - 1] ?? timing.hours[0]);
            const text = item.text.trim();
            return {
              day: item.day,
              slot: item.slot,
              scheduledFor: at.toISOString(),
              topic: String(item.topic || niche),
              format: String(item.format || 'post'),
              text,
              characters: text.length,
              overLimit: text.length > 280,
            };
          });
        if (!calendar.length) throw new Error('The language model returned an empty calendar; the job will retry');
        return {
          success: true,
          niche,
          days,
          tweetsPerDay: perDay,
          account: me.username,
          timing: { source: timing.source, hoursUtc: timing.hours, basedOnPosts: history.length, bestHours: timing.ranked },
          model: reply.model,
          count: calendar.length,
          calendar,
        };
      },
    },
  };

  /** monitorFollowers / monitorFollowing: capture one list and compare it with the last capture. */
  async function listSnapshot(ctx, which) {
    const owner = requireOwner(ctx);
    const username = requireUsername(ctx.require('username'));
    const compareWithPrevious = ctx.config.compareWithPrevious !== false;
    const limit = toInt(ctx.config.limit, 1000, 1, 5000);
    const client = await ctx.http();
    const profile = await readProfile(client, username);
    const total = which === 'followers' ? profile.followers : profile.following;
    const { users, list } = await captureList(ctx, client, which, username, limit, total);

    const previous = compareWithPrevious ? await snapshots.latest(owner, which, username) : null;
    const snapshot = { ...newSnapshot(which, username), [which]: list };
    await snapshots.save(owner, snapshot);

    const result = {
      success: true,
      username,
      list: which,
      snapshotId: snapshot.id,
      createdAt: snapshot.createdAt,
      ...summarizeList(list),
      isBaseline: !previous,
      previousSnapshot: previous ? { id: previous.id, createdAt: previous.createdAt, total: previous[which].total } : null,
    };
    if (!previous) return { ...result, note: compareWithPrevious ? 'First capture: saved as the baseline for the next comparison.' : 'Saved as a new baseline.' };
    const diff = diffList(previous[which], list, users);
    return which === 'followers'
      ? { ...result, gained: diff.gained, lost: diff.lost, lossesKnown: diff.lossesKnown, netChange: diff.netChange }
      : { ...result, added: diff.gained, removed: diff.lost, removalsKnown: diff.lossesKnown, netChange: diff.netChange };
  }

  return { processors, monitors, webhooks, snapshots, store };
}

// ── Route support ───────────────────────────────────────────────────────────

const messaging = createMessaging();

export const monitors = messaging.monitors;
export const webhooks = messaging.webhooks;
export const snapshots = messaging.snapshots;

const MONITOR_ACTIONS = ['list', 'status', 'stop', 'pause', 'resume'];

/**
 * Answer the list / status / stop / pause / resume actions a monitor route
 * accepts next to `start`. Returns false (and sends nothing) for any other
 * action, so the route goes on to start a monitor.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {{ type: string, idField?: string, session: string, api?: object }} options
 * @returns {Promise<boolean>} whether a response was sent
 */
export async function handleMonitorAction(req, res, { type, idField = 'monitorId', session, api = messaging.monitors }) {
  const body = req.body || {};
  const action = body.action;
  if (!MONITOR_ACTIONS.includes(action)) return false;
  const owner = sessionOwnerKey(session);
  if (!owner) {
    res.status(400).json({ success: false, error: 'SESSION_REQUIRED', message: 'Send the same X session that started the monitor.' });
    return true;
  }

  if (action === 'list') {
    const list = await api.list(owner, { type });
    res.json({ success: true, data: { monitors: list, count: list.length } });
    return true;
  }

  const id = body[idField] || body.monitorId;
  if (!id) {
    res.status(400).json({ success: false, error: 'INVALID_INPUT', message: `${idField} is required for action "${action}"` });
    return true;
  }

  const existing = await api.get(owner, String(id));
  if (existing && existing.type !== type) {
    res.status(404).json({ success: false, error: 'NOT_FOUND', message: `${id} is a ${existing.type} monitor, not ${type}` });
    return true;
  }

  let view = null;
  try {
    if (existing && action === 'status') {
      view = await api.status(owner, String(id), { limit: toInt(body.limit, 50, 1, MAX_EVENTS), type: body.eventType });
    } else if (existing) {
      view = await api[action](owner, String(id));
    }
  } catch (err) {
    if (err instanceof JobInputError) {
      res.status(409).json({ success: false, error: 'INVALID_STATE', message: err.message });
      return true;
    }
    throw err;
  }

  if (!view && action === 'stop') {
    // The start job may still be queued: cancelling it means the monitor never starts.
    const { cancelJob, getJob } = await import('../jobQueue.js');
    const job = await getJob(String(id));
    if (job && job.type === type && job.status === 'queued') {
      await cancelJob(String(id));
      res.json({ success: true, data: { [idField]: id, status: 'cancelled', note: 'The start was still queued; it will not run.' } });
      return true;
    }
  }
  if (!view) {
    res.status(404).json({
      success: false,
      error: 'NOT_FOUND',
      message: `No monitor ${id} belongs to this session. A start that is still queued has not created it yet: poll /api/ai/action/status/${id}.`,
    });
    return true;
  }
  res.json({ success: true, data: { [idField]: id, ...view } });
  return true;
}

export default messaging.processors;
