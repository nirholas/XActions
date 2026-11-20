// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * XActions Stream Manager
 * Manages active streams, polling intervals, deduplication via Redis,
 * and emits diffs over Socket.IO.
 *
 * Features:
 * - Bull-queue scheduled polling that survives restarts
 * - Per-stream concurrency lock (prevents overlapping polls)
 * - Pause / resume / update interval
 * - Duplicate stream prevention (same type + username)
 * - Graceful Redis connection error handling
 * - Stream stats aggregation
 * - Auto-stop after configurable consecutive errors (maxErrors)
 * - stopAll for clean shutdown
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license Apache-2.0
 */

import { randomUUID } from 'crypto';
import { pollTweets } from './tweetStream.js';
import { pollFollowers } from './followerStream.js';
import { pollMentions } from './mentionStream.js';
import { getPoolStatus, closeAll as closeBrowserPool, isHealthy as isBrowserPoolHealthy } from './browserPool.js';
import { createLivePipeline } from './livePipeline.js';
import { TwitterHttpClient } from '../scrapers/twitter/http/client.js';
import { importOptional } from '../utils/optionalDeps.js';

// ============================================================================
// Constants
// ============================================================================

const STREAM_TYPES = ['tweet', 'follower', 'mention'];
const DEFAULT_INTERVAL_MS = 60_000; // 60 seconds
const MIN_INTERVAL_MS = 15_000;
const MAX_INTERVAL_MS = 3_600_000; // 1 hour
const MAX_HISTORY = 200; // events kept per stream
const MAX_CONSECUTIVE_ERRORS = 10; // auto-stop after this many
const REDIS_KEY_TTL = 7 * 24 * 3600; // 7 days — auto-expire stale keys

/**
 * How a stream receives its data. `poll` is the default and unchanged
 * behaviour: scheduled scrapes on an interval. `live` holds x.com's own event
 * pipeline open and receives pushes, falling back to `poll` when that
 * connection cannot be established or is lost for good.
 */
const TRANSPORTS = ['poll', 'live'];

/** Live-pipeline event types that are forwarded to clients as stream events. */
const FORWARDED_LIVE_TYPES = ['engagement', 'dm', 'typing', 'unknown'];

// ============================================================================
// Redis helpers
// ============================================================================

let redisOpts = null;

function getRedisOpts() {
  if (!redisOpts) {
    redisOpts = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        return Math.min(times * 200, 5000);
      },
    };
  }
  return redisOpts;
}

let _redis = null;
let _redisHealthy = true;

async function getRedis() {
  if (_redis && _redisHealthy) return _redis;
  try {
    const Redis = (await importOptional('ioredis', { feature: 'Streams (which keep their state in Redis)' })).default;
    if (!_redis) {
      _redis = new Redis(getRedisOpts());

      _redis.on('error', (err) => {
        if (_redisHealthy) {
          console.error('❌ Stream Redis connection error:', err.message);
          _redisHealthy = false;
        }
      });

      _redis.on('connect', () => {
        if (!_redisHealthy) {
          console.log('✅ Stream Redis reconnected');
        }
        _redisHealthy = true;
      });
    }
    return _redis;
  } catch (err) {
    _redisHealthy = false;
    throw new Error(`Redis unavailable: ${err.message}`);
  }
}

// ============================================================================
// State keys (all under xactions:stream: namespace)
// ============================================================================

const stateKey = (streamId) => `xactions:stream:${streamId}:state`;
const historyKey = (streamId) => `xactions:stream:${streamId}:history`;
const metaKey = (streamId) => `xactions:stream:${streamId}:meta`;
const lockKey = (streamId) => `xactions:stream:${streamId}:lock`;

// ============================================================================
// In-memory registry (augmented by Redis persistence)
// ============================================================================

/** @type {Map<string, Object>} */
const activeStreams = new Map();

// Track in-flight polls to prevent overlap
const pollingNow = new Set();

// ============================================================================
// Bull Queue
// ============================================================================

let streamQueue = null;
/** @type {Promise<any> | null} */
let streamQueueLoading = null;

/**
 * The Bull queue that schedules poll-transport streams, created on first use.
 *
 * `bull` is an optional peer dependency, imported here rather than at the top
 * of the file, so live-transport streams and everything else that imports this
 * module work without it.
 */
async function getQueue() {
  if (streamQueue) return streamQueue;
  if (!streamQueueLoading) {
    streamQueueLoading = importOptional('bull', {
      feature: 'Poll-transport streams (scheduled on a Bull queue in Redis)',
    }).then(({ default: Queue }) => {
      streamQueue = new Queue('xactions-streams', {
        redis: getRedisOpts(),
        defaultJobOptions: {
          attempts: 1,
          removeOnComplete: true,
          removeOnFail: true,
        },
      });

      // Process poll jobs — concurrency 3 (one per browser)
      streamQueue.process('poll', 3, async (job) => {
        const { streamId } = job.data;
        await executePoll(streamId);
      });

      streamQueue.on('error', (err) => {
        console.error('❌ Stream queue error:', err.message);
      });
      return streamQueue;
    }).finally(() => {
      streamQueueLoading = null;
    });
  }
  return streamQueueLoading;
}

// ============================================================================
// Socket.IO reference (set externally)
// ============================================================================

/** @type {import('socket.io').Server | null} */
let _io = null;

/**
 * Set the Socket.IO server instance so streams can emit events.
 */
export function setIO(io) {
  _io = io;
}

// ============================================================================
// Core API
// ============================================================================

/**
 * Create and start a new stream.
 *
 * @param {Object} params
 * @param {string} params.type - 'tweet' | 'follower' | 'mention'
 * @param {string} params.username - Target X/Twitter username (without @)
 * @param {number} [params.interval] - Poll interval in ms (default 60 000)
 * @param {string} [params.authToken] - X/Twitter auth_token cookie
 * @param {string} [params.userId] - Owner user ID
 * @param {'poll'|'live'} [params.transport='poll'] - `poll` scrapes on the interval
 *   (unchanged default). `live` holds x.com's live_pipeline open instead and
 *   pushes events as they happen; it needs `topics` and a logged-in session,
 *   and falls back to polling when the pipeline cannot be reached.
 * @param {string[]} [params.topics] - live_pipeline topics, built with the `Topic`
 *   helpers in `./livePipeline.js`. Required when `transport` is `live`.
 * @param {string} [params.cookies] - Full cookie string (`auth_token=...; ct0=...`).
 *   The live transport needs the ct0 cookie for the CSRF header, which
 *   `authToken` alone does not carry.
 * @returns {Promise<Object>} Stream descriptor
 */
export async function createStream({
  type,
  username,
  interval,
  authToken,
  userId,
  transport = 'poll',
  topics = [],
  cookies,
}) {
  if (!STREAM_TYPES.includes(type)) {
    throw new Error(`Invalid stream type "${type}". Must be one of: ${STREAM_TYPES.join(', ')}`);
  }
  if (!TRANSPORTS.includes(transport)) {
    throw new Error(`Invalid transport "${transport}". Must be one of: ${TRANSPORTS.join(', ')}`);
  }
  if (!username) throw new Error('username is required');

  const cleanUsername = username.replace(/^@/, '');
  const intervalMs = clampInterval(interval || DEFAULT_INTERVAL_MS);

  // Duplicate prevention — reject if same type + username stream already running
  for (const existing of activeStreams.values()) {
    if (existing.type === type && existing.username === cleanUsername && existing.status !== 'stopped') {
      throw new Error(`Stream already exists for ${type}:@${cleanUsername} → ${existing.id}. Stop it first or use update.`);
    }
  }

  const id = `stream_${type}_${cleanUsername}_${randomUUID().slice(0, 8)}`;

  const meta = {
    id,
    type,
    username: cleanUsername,
    interval: intervalMs,
    authToken: authToken || null,
    cookies: cookies || null,
    userId: userId || null,
    transport: 'poll',
    requestedTransport: transport,
    topics: [...new Set((topics || []).map((t) => String(t).trim()).filter(Boolean))],
    liveSessionId: null,
    transportFallbackReason: null,
    status: 'running',
    createdAt: new Date().toISOString(),
    lastPollAt: null,
    pollCount: 0,
    eventCount: 0,
    errorCount: 0,
    consecutiveErrors: 0,
    backoffUntil: null,
    lastError: null,
  };

  // Persist to Redis
  const redis = await getRedis();
  const pipeline = redis.pipeline();
  pipeline.set(metaKey(id), JSON.stringify(meta));
  pipeline.expire(metaKey(id), REDIS_KEY_TTL);
  pipeline.set(stateKey(id), JSON.stringify({ seenIds: [], followers: [], followerCount: null }));
  pipeline.expire(stateKey(id), REDIS_KEY_TTL);
  await pipeline.exec();

  // Register in memory
  activeStreams.set(id, meta);

  // Live transport first when it was asked for; polling is the fallback, so a
  // pipeline that cannot open never leaves the stream without data.
  let live = { attached: false };
  if (transport === 'live') {
    live = await attachLiveTransport(meta);
  }

  if (live.attached) {
    console.log(`📡 Stream created: ${id} (${type} @${cleanUsername} over the live pipeline, ${meta.topics.length} topic(s))`);
  } else {
    await schedulePollJob(meta);
    console.log(`📡 Stream created: ${id} (${type} @${cleanUsername} every ${intervalMs / 1000}s)`);
  }

  await saveMeta(id, meta);
  return sanitizeMeta(meta);
}

/**
 * Stop and remove a stream.
 */
export async function stopStream(streamId) {
  await detachLiveTransport(streamId);
  await removeRepeatableJob(streamId);

  // Clean Redis
  try {
    const redis = await getRedis();
    await redis.del(stateKey(streamId), historyKey(streamId), metaKey(streamId), lockKey(streamId));
  } catch { /* Redis may be down */ }

  activeStreams.delete(streamId);
  pollingNow.delete(streamId);

  console.log(`🛑 Stream stopped: ${streamId}`);
  return { success: true, streamId };
}

/**
 * Stop all active streams (for shutdown or emergency).
 */
export async function stopAllStreams() {
  const ids = Array.from(activeStreams.keys());
  const results = await Promise.allSettled(ids.map((id) => stopStream(id)));

  const stopped = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;

  console.log(`🛑 Stopped ${stopped} stream(s), ${failed} failed`);
  return { stopped, failed, total: ids.length };
}

/**
 * Pause a stream (stops polling but retains state).
 */
export async function pauseStream(streamId) {
  const meta = await loadMeta(streamId);
  if (!meta) throw new Error(`Stream ${streamId} not found`);
  if (meta.status === 'paused') return sanitizeMeta(meta);

  await detachLiveTransport(streamId);
  await removeRepeatableJob(streamId);

  meta.status = 'paused';
  await saveMeta(streamId, meta);

  console.log(`⏸️ Stream paused: ${streamId}`);
  return sanitizeMeta(meta);
}

/**
 * Resume a paused stream.
 */
export async function resumeStream(streamId) {
  const meta = await loadMeta(streamId);
  if (!meta) throw new Error(`Stream ${streamId} not found`);
  if (meta.status !== 'paused') throw new Error(`Stream ${streamId} is not paused (status: ${meta.status})`);

  meta.status = 'running';
  meta.backoffUntil = null;
  meta.consecutiveErrors = 0;
  meta.transportFallbackReason = null;
  await saveMeta(streamId, meta);

  // A stream created with the live transport tries the pipeline again on
  // resume; polling still covers it if the pipeline stays unreachable.
  let live = { attached: false };
  if (meta.requestedTransport === 'live') {
    live = await attachLiveTransport(meta);
  }
  if (!live.attached) {
    await schedulePollJob(meta);
  }
  await saveMeta(streamId, meta);

  console.log(`▶️ Stream resumed: ${streamId}`);
  return sanitizeMeta(meta);
}

/**
 * Update stream settings (interval).
 */
export async function updateStream(streamId, updates = {}) {
  const meta = await loadMeta(streamId);
  if (!meta) throw new Error(`Stream ${streamId} not found`);

  let rescheduled = false;

  if (updates.topics !== undefined) {
    await applyTopicUpdate(meta, updates.topics);
  }

  if (updates.interval !== undefined) {
    const newInterval = clampInterval(updates.interval);
    if (newInterval !== meta.interval) {
      meta.interval = newInterval;
      rescheduled = true;
    }
  }

  await saveMeta(streamId, meta);

  // Reschedule the Bull job with the new interval. A live stream has no poll
  // job to reschedule; its interval only matters if it falls back later.
  if (rescheduled && meta.status === 'running' && meta.transport === 'poll') {
    await removeRepeatableJob(streamId);
    const queue = await getQueue();
    await queue.add('poll', { streamId }, {
      repeat: { every: meta.interval },
      jobId: streamId,
    });
    console.log(`🔄 Stream ${streamId}: interval updated to ${meta.interval / 1000}s`);
  }

  return sanitizeMeta(meta);
}

/**
 * List all active streams.
 */
export async function listStreams() {
  await refreshFromRedis();
  return Array.from(activeStreams.values()).map(sanitizeMeta);
}

/**
 * Get recent event history for a stream.
 * @param {string} streamId
 * @param {number} [limit=50]
 * @param {string} [eventType] - Optional filter: 'stream:tweet', 'stream:follower', 'stream:mention'
 */
export async function getStreamHistory(streamId, limit = 50, eventType) {
  const redis = await getRedis();
  // Fetch more than requested so filtering still returns enough
  const fetchLimit = eventType ? limit * 3 : limit;
  const raw = await redis.lrange(historyKey(streamId), 0, fetchLimit - 1);
  let events = raw.map((r) => JSON.parse(r));

  if (eventType) {
    events = events.filter((e) => e.type === eventType);
  }

  return events.slice(0, limit);
}

/**
 * Get status information for a single stream.
 */
export async function getStreamStatus(streamId) {
  let meta = activeStreams.get(streamId);
  if (!meta) {
    meta = await loadMetaFromRedis(streamId);
    if (!meta) return null;
  }
  return sanitizeMeta(meta);
}

/**
 * Get aggregate stats across all streams.
 */
export function getStreamStats() {
  const streams = Array.from(activeStreams.values());
  const byStatus = { running: 0, paused: 0, backoff: 0, stopped: 0, error: 0 };
  let totalPolls = 0;
  let totalEvents = 0;
  let totalErrors = 0;

  for (const s of streams) {
    byStatus[s.status] = (byStatus[s.status] || 0) + 1;
    totalPolls += s.pollCount || 0;
    totalEvents += s.eventCount || 0;
    totalErrors += s.errorCount || 0;
  }

  return {
    total: streams.length,
    byStatus,
    totalPolls,
    totalEvents,
    totalErrors,
    liveTransports: liveTransports.size,
    pool: getPoolStatus(),
  };
}

/**
 * Health check — Redis connected AND browser pool can serve.
 */
export async function isHealthy() {
  const browserOk = await isBrowserPoolHealthy();
  return _redisHealthy && browserOk;
}

// ============================================================================
// Poll execution
// ============================================================================

async function executePoll(streamId) {
  // Concurrency guard — skip if already polling this stream
  if (pollingNow.has(streamId)) {
    return;
  }
  pollingNow.add(streamId);

  try {
    await _executePollInner(streamId);
  } finally {
    pollingNow.delete(streamId);
  }
}

async function _executePollInner(streamId) {
  const redis = await getRedis();

  // Acquire a short Redis lock (prevents multi-process overlap)
  const lockAcquired = await redis.set(lockKey(streamId), '1', 'EX', 120, 'NX');
  if (!lockAcquired) return; // another process is polling this stream

  try {
    const meta = await loadMeta(streamId);
    if (!meta) return; // stream was removed

    // Skip if paused or stopped
    if (meta.status === 'paused' || meta.status === 'stopped') return;

    // Check backoff
    if (meta.backoffUntil && Date.now() < new Date(meta.backoffUntil).getTime()) {
      return;
    }

    // Load state
    const stateRaw = await redis.get(stateKey(streamId));
    const state = stateRaw ? JSON.parse(stateRaw) : { seenIds: [], followers: [], followerCount: null };

    let events = [];

    if (meta.type === 'tweet') {
      const result = await pollTweets({
        username: meta.username,
        lastSeenIds: state.seenIds,
        authToken: meta.authToken,
      });
      state.seenIds = result.seenIds;
      events = result.tweets.map((t) => ({
        type: 'stream:tweet',
        streamId,
        username: meta.username,
        data: t,
        timestamp: new Date().toISOString(),
      }));
    } else if (meta.type === 'follower') {
      const result = await pollFollowers({
        username: meta.username,
        lastFollowers: state.followers,
        lastCount: state.followerCount,
        authToken: meta.authToken,
      });
      state.followers = result.followers;
      state.followerCount = result.followerCount;

      for (const u of result.newFollowers) {
        events.push({
          type: 'stream:follower',
          streamId,
          username: meta.username,
          data: { action: 'follow', follower: u, count: result.followerCount },
          timestamp: new Date().toISOString(),
        });
      }
      for (const u of result.lostFollowers) {
        events.push({
          type: 'stream:follower',
          streamId,
          username: meta.username,
          data: { action: 'unfollow', follower: u, count: result.followerCount },
          timestamp: new Date().toISOString(),
        });
      }

      if (result.countDelta !== 0 && events.length === 0) {
        events.push({
          type: 'stream:follower',
          streamId,
          username: meta.username,
          data: { action: 'count_change', delta: result.countDelta, count: result.followerCount },
          timestamp: new Date().toISOString(),
        });
      }
    } else if (meta.type === 'mention') {
      const result = await pollMentions({
        username: meta.username,
        lastSeenIds: state.seenIds,
        authToken: meta.authToken,
      });
      state.seenIds = result.seenIds;
      events = result.mentions.map((m) => ({
        type: 'stream:mention',
        streamId,
        username: meta.username,
        data: m,
        timestamp: new Date().toISOString(),
      }));
    }

    // Persist state with TTL
    const statePipeline = redis.pipeline();
    statePipeline.set(stateKey(streamId), JSON.stringify(state));
    statePipeline.expire(stateKey(streamId), REDIS_KEY_TTL);

    // Store events in history (newest first)
    if (events.length > 0) {
      for (const event of events) {
        statePipeline.lpush(historyKey(streamId), JSON.stringify(event));
      }
      statePipeline.ltrim(historyKey(streamId), 0, MAX_HISTORY - 1);
      statePipeline.expire(historyKey(streamId), REDIS_KEY_TTL);
    }
    await statePipeline.exec();

    // Emit events over Socket.IO
    if (_io && events.length > 0) {
      const room = `stream:${streamId}`;
      for (const event of events) {
        _io.to(room).emit(event.type, event);
        _io.to('streams').emit(event.type, event);
      }
    }

    // Update meta
    meta.lastPollAt = new Date().toISOString();
    meta.pollCount++;
    meta.eventCount = (meta.eventCount || 0) + events.length;
    meta.consecutiveErrors = 0;
    meta.backoffUntil = null;
    meta.status = 'running';
    meta.lastError = null;
    await saveMeta(streamId, meta);

    if (events.length > 0) {
      console.log(`📡 Stream ${streamId}: ${events.length} new event(s)`);
    }
  } catch (err) {
    console.error(`❌ Stream ${streamId} poll error:`, err.message);

    // Load meta to update error state
    let meta;
    try { meta = await loadMeta(streamId); } catch { return; }
    if (!meta) return;

    meta.errorCount = (meta.errorCount || 0) + 1;
    meta.consecutiveErrors = (meta.consecutiveErrors || 0) + 1;
    meta.lastError = err.message;

    // Auto-stop after too many consecutive errors
    if (meta.consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
      meta.status = 'stopped';
      meta.lastError = `Auto-stopped after ${MAX_CONSECUTIVE_ERRORS} consecutive errors. Last: ${err.message}`;
      await saveMeta(streamId, meta);
      await removeRepeatableJob(streamId);
      console.error(`🛑 Stream ${streamId} auto-stopped after ${MAX_CONSECUTIVE_ERRORS} errors`);
      return;
    }

    // Exponential backoff: interval * 2^errors, capped at 15 min
    const backoffMs = Math.min(
      meta.interval * Math.pow(2, meta.consecutiveErrors),
      15 * 60 * 1000
    );
    meta.backoffUntil = new Date(Date.now() + backoffMs).toISOString();
    meta.status = 'backoff';

    await saveMeta(streamId, meta);
  } finally {
    // Release Redis lock
    try {
      const redis = await getRedis();
      await redis.del(lockKey(streamId));
    } catch { /* ignore */ }
  }
}

// ============================================================================
// Live transport (x.com live_pipeline)
// ============================================================================

/**
 * Open live pipelines, keyed by stream id.
 * @type {Map<string, import('./livePipeline.js').LivePipeline>}
 */
const liveTransports = new Map();

/**
 * Schedule the repeatable poll job for a stream and run one poll straight
 * away. This is the transport every stream ends up on unless a live pipeline
 * is holding it.
 *
 * @param {Object} meta - Stream metadata (mutated: `transport` becomes `poll`)
 * @param {Object} [options]
 * @param {boolean} [options.immediate=true] - Also run one poll now
 */
async function schedulePollJob(meta, { immediate = true } = {}) {
  meta.transport = 'poll';
  const queue = await getQueue();
  await queue.add('poll', { streamId: meta.id }, {
    repeat: { every: meta.interval },
    jobId: meta.id,
  });

  if (immediate) {
    executePoll(meta.id).catch((err) => {
      console.error(`⚠️ Stream ${meta.id} initial poll failed:`, err.message);
    });
  }
}

/**
 * Build the HTTP client the live pipeline authenticates with. The pipeline
 * needs the ct0 cookie for the CSRF header, so a stream carrying only
 * `authToken` will be told to log in properly rather than silently degrade.
 */
function buildLiveClient(meta) {
  const cookies = meta.cookies || (meta.authToken ? `auth_token=${meta.authToken}` : '');
  return new TwitterHttpClient({ cookies });
}

/**
 * Try to run a stream over x.com's live pipeline.
 *
 * Never throws: a pipeline that cannot open is reported as `attached: false`
 * with the reason, and the caller starts polling instead.
 *
 * @param {Object} meta - Stream metadata (mutated with transport state)
 * @param {Object} [options]
 * @param {function} [options.createPipeline] - Pipeline factory (injectable for tests)
 * @param {function} [options.onStreamEvent] - Sink for normalised stream events
 * @param {function} [options.schedulePoll] - How to start polling on a later fallback
 * @returns {Promise<{ attached: boolean, reason?: string, error?: Error, pipeline?: Object }>}
 */
export async function attachLiveTransport(meta, options = {}) {
  const {
    createPipeline = createLivePipeline,
    onStreamEvent = emitStreamEvent,
    schedulePoll = schedulePollJob,
  } = options;

  const topics = meta.topics || [];
  if (topics.length === 0) {
    const reason =
      'no live_pipeline topics were given; build them with the Topic helpers in src/streaming/livePipeline.js';
    noteFallback(meta, reason);
    return { attached: false, reason };
  }

  let pipeline = null;
  try {
    pipeline = createPipeline({
      client: buildLiveClient(meta),
      topics,
      onEvent: (event) => handleLiveEvent(meta, event, onStreamEvent),
      onError: (err, info) => {
        meta.lastError = err.message;
        if (!info || !info.fatal) return;
        fallbackToPolling(meta, err.message, schedulePoll).catch((fallbackErr) => {
          console.error(`❌ Stream ${meta.id} could not fall back to polling:`, fallbackErr.message);
        });
      },
    });
    await pipeline.open();
  } catch (err) {
    if (pipeline && typeof pipeline.close === 'function') {
      await pipeline.close().catch(() => {});
    }
    noteFallback(meta, err.message);
    return { attached: false, reason: err.message, error: err };
  }

  liveTransports.set(meta.id, pipeline);
  meta.transport = 'live';
  meta.liveSessionId = pipeline.sessionId || null;
  meta.transportFallbackReason = null;
  return { attached: true, pipeline };
}

/**
 * Close a stream's live pipeline, if it has one.
 * @param {string} streamId
 * @returns {Promise<boolean>} true when a pipeline was closed
 */
export async function detachLiveTransport(streamId) {
  const pipeline = liveTransports.get(streamId);
  if (!pipeline) return false;
  liveTransports.delete(streamId);
  try {
    await pipeline.close();
  } catch (err) {
    console.error(`⚠️ Stream ${streamId}: live pipeline did not close cleanly:`, err.message);
  }
  return true;
}

/**
 * Give up on the live pipeline for this stream and start polling instead.
 * Called when the pipeline reports a fatal error (auth rejected, or reconnect
 * attempts exhausted).
 */
async function fallbackToPolling(meta, reason, schedulePoll = schedulePollJob) {
  await detachLiveTransport(meta.id);
  noteFallback(meta, reason);
  if (meta.status === 'paused' || meta.status === 'stopped') return;
  meta.errorCount = (meta.errorCount || 0) + 1;
  await schedulePoll(meta);
}

/**
 * Record why a stream is polling rather than streaming, and say so in the log
 * once per distinct reason instead of on every retry.
 * @returns {boolean} true when this call produced the log line
 */
function noteFallback(meta, reason) {
  if (meta.transportFallbackReason === reason) return false;
  meta.transportFallbackReason = reason;
  console.warn(`⚠️ Stream ${meta.id}: live transport unavailable, using polling. Reason: ${reason}`);
  return true;
}

/**
 * Turn one live-pipeline event into a stream event and hand it to the sink.
 * Session config frames are bookkeeping, not user-facing events: they update
 * the stream's session id and go no further.
 *
 * @returns {Object|null} The forwarded stream event, or null when nothing was forwarded
 */
function handleLiveEvent(meta, event, onStreamEvent) {
  if (event.type === 'config') {
    if (event.payload.kind === 'session' && event.payload.sessionId) {
      meta.liveSessionId = event.payload.sessionId;
    }
    if (event.payload.kind === 'subscriptions' && event.payload.errors.length > 0) {
      console.warn(
        `⚠️ Stream ${meta.id}: live pipeline rejected ${event.payload.errors.length} subscription(s)`
      );
    }
    return null;
  }

  if (!FORWARDED_LIVE_TYPES.includes(event.type)) return null;

  const streamEvent = {
    type: `stream:${event.type}`,
    streamId: meta.id,
    username: meta.username,
    transport: 'live',
    topic: event.topic,
    data: event.payload,
    timestamp: event.receivedAt,
  };

  meta.eventCount = (meta.eventCount || 0) + 1;
  meta.lastPollAt = event.receivedAt;
  meta.consecutiveErrors = 0;
  meta.status = meta.status === 'backoff' ? 'running' : meta.status;

  onStreamEvent(streamEvent);
  return streamEvent;
}

/** Default sink: emit over Socket.IO and append to the stream's history. */
function emitStreamEvent(event) {
  if (_io) {
    _io.to(`stream:${event.streamId}`).emit(event.type, event);
    _io.to('streams').emit(event.type, event);
  }
  persistEvent(event).catch(() => {});
}

/** Append one event to a stream's Redis history. Best effort: Redis may be down. */
async function persistEvent(event) {
  try {
    const redis = await getRedis();
    const pipeline = redis.pipeline();
    pipeline.lpush(historyKey(event.streamId), JSON.stringify(event));
    pipeline.ltrim(historyKey(event.streamId), 0, MAX_HISTORY - 1);
    pipeline.expire(historyKey(event.streamId), REDIS_KEY_TTL);
    await pipeline.exec();
  } catch {
    // History is a convenience; a live event is already delivered by now.
  }
}

/**
 * Apply a topic change to a live stream. Topics are added and removed on the
 * running session, so subscribers keep receiving events across the change.
 */
async function applyTopicUpdate(meta, topics) {
  const next = [...new Set((topics || []).map((t) => String(t).trim()).filter(Boolean))];
  const current = meta.topics || [];
  const added = next.filter((t) => !current.includes(t));
  const removed = current.filter((t) => !next.includes(t));

  const pipeline = liveTransports.get(meta.id);
  if (!pipeline || (added.length === 0 && removed.length === 0)) {
    meta.topics = next;
    return { added, removed };
  }

  // The session is changed first, so a rejected change leaves the recorded
  // topics matching what the pipeline is actually subscribed to.
  if (added.length > 0) await pipeline.subscribe(added);
  if (removed.length > 0) await pipeline.unsubscribe(removed);
  meta.topics = next;
  console.log(`🔄 Stream ${meta.id}: live topics updated (+${added.length} / -${removed.length})`);
  return { added, removed };
}

// ============================================================================
// Helpers
// ============================================================================

function sanitizeMeta(meta) {
  const { authToken, cookies, ...rest } = meta;
  return rest;
}

function clampInterval(ms) {
  return Math.max(MIN_INTERVAL_MS, Math.min(MAX_INTERVAL_MS, ms));
}

async function loadMeta(streamId) {
  // Memory first, then Redis
  const mem = activeStreams.get(streamId);
  if (mem) return mem;
  return loadMetaFromRedis(streamId);
}

async function loadMetaFromRedis(streamId) {
  try {
    const redis = await getRedis();
    const raw = await redis.get(metaKey(streamId));
    if (!raw) return null;
    const meta = JSON.parse(raw);
    activeStreams.set(streamId, meta);
    return meta;
  } catch {
    return null;
  }
}

async function saveMeta(streamId, meta) {
  activeStreams.set(streamId, meta);
  try {
    const redis = await getRedis();
    const pipeline = redis.pipeline();
    pipeline.set(metaKey(streamId), JSON.stringify(meta));
    pipeline.expire(metaKey(streamId), REDIS_KEY_TTL);
    await pipeline.exec();
  } catch { /* Redis may be down — memory is still updated */ }
}

async function removeRepeatableJob(streamId) {
  try {
    const queue = await getQueue();
    const repeatableJobs = await queue.getRepeatableJobs();
    const match = repeatableJobs.find((j) => j.id === streamId);
    if (match) {
      await queue.removeRepeatableByKey(match.key);
    }
  } catch { /* best effort */ }
}

/**
 * Refresh in-memory registry from Redis (for process restarts).
 * Re-opens the live pipeline for streams that were created on it, and
 * re-registers Bull jobs for every stream that polls.
 */
async function refreshFromRedis() {
  try {
    const redis = await getRedis();
    const keys = await redis.keys('xactions:stream:*:meta');
    for (const key of keys) {
      const raw = await redis.get(key);
      if (!raw) continue;
      const meta = JSON.parse(raw);
      if (!activeStreams.has(meta.id)) {
        activeStreams.set(meta.id, meta);

        // Re-open the live pipeline for a stream that was created with it:
        // a restart must not silently downgrade a live stream to polling.
        let live = { attached: false };
        if (
          meta.requestedTransport === 'live' &&
          !liveTransports.has(meta.id) &&
          (meta.status === 'running' || meta.status === 'backoff')
        ) {
          live = await attachLiveTransport(meta);
          if (live.attached) await saveMeta(meta.id, meta);
        }

        // Re-register Bull job if stream should be running
        if (!live.attached && (meta.status === 'running' || meta.status === 'backoff')) {
          try {
            const queue = await getQueue();
            const repeatableJobs = await queue.getRepeatableJobs();
            const exists = repeatableJobs.find((j) => j.id === meta.id);
            if (!exists) {
              await queue.add('poll', { streamId: meta.id }, {
                repeat: { every: meta.interval },
                jobId: meta.id,
              });
            }
          } catch { /* queue error */ }
        }
      }
    }
  } catch { /* Redis unavailable */ }
}

/**
 * Clean shutdown — close pool and queue.
 */
export async function shutdown() {
  await Promise.allSettled(
    Array.from(liveTransports.keys()).map((streamId) => detachLiveTransport(streamId))
  );
  if (streamQueue) {
    await streamQueue.close();
    streamQueue = null;
  }
  await closeBrowserPool();
  if (_redis) {
    _redis.disconnect();
    _redis = null;
  }
}

export { STREAM_TYPES, TRANSPORTS, getPoolStatus };
