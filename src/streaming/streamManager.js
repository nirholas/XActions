/**
 * XActions Stream Manager
 * Manages active streams, polling intervals, deduplication via Redis,
 * and emits diffs over Socket.IO.
 *
 * Streams are scheduled as repeatable Bull jobs so they survive restarts.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import { randomUUID } from 'crypto';
import Queue from 'bull';
import { pollTweets } from './tweetStream.js';
import { pollFollowers } from './followerStream.js';
import { pollMentions } from './mentionStream.js';
import { getPoolStatus, closeAll as closeBrowserPool } from './browserPool.js';

// ============================================================================
// Constants
// ============================================================================

const STREAM_TYPES = ['tweet', 'follower', 'mention'];
const DEFAULT_INTERVAL_MS = 60_000; // 60 seconds
const MIN_INTERVAL_MS = 15_000;
const MAX_HISTORY = 200; // events kept per stream

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
    };
  }
  return redisOpts;
}

// Simple Redis client for state persistence (uses ioredis from Bull)
let _redis = null;

async function getRedis() {
  if (_redis) return _redis;
  const Redis = (await import('ioredis')).default;
  _redis = new Redis(getRedisOpts());
  return _redis;
}

// ============================================================================
// State keys
// ============================================================================

const stateKey = (streamId) => `xactions:stream:${streamId}:state`;
const historyKey = (streamId) => `xactions:stream:${streamId}:history`;
const metaKey = (streamId) => `xactions:stream:${streamId}:meta`;

// ============================================================================
// In-memory registry (augmented by Redis persistence)
// ============================================================================

/** @type {Map<string, import('./types').StreamMeta>} */
const activeStreams = new Map();

// ============================================================================
// Bull Queue
// ============================================================================

let streamQueue = null;

function getQueue() {
  if (!streamQueue) {
    streamQueue = new Queue('xactions-streams', {
      redis: getRedisOpts(),
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: true,
        removeOnFail: true,
      },
    });

    // Process poll jobs
    streamQueue.process('poll', 3, async (job) => {
      const { streamId } = job.data;
      await executePoll(streamId);
    });
  }
  return streamQueue;
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
 * @returns {Promise<Object>} Stream descriptor
 */
export async function createStream({ type, username, interval, authToken, userId }) {
  if (!STREAM_TYPES.includes(type)) {
    throw new Error(`Invalid stream type "${type}". Must be one of: ${STREAM_TYPES.join(', ')}`);
  }
  if (!username) throw new Error('username is required');

  const id = `stream_${type}_${username}_${randomUUID().slice(0, 8)}`;
  const intervalMs = Math.max(MIN_INTERVAL_MS, interval || DEFAULT_INTERVAL_MS);

  const meta = {
    id,
    type,
    username: username.replace(/^@/, ''),
    interval: intervalMs,
    authToken: authToken || null,
    userId: userId || null,
    status: 'running',
    createdAt: new Date().toISOString(),
    lastPollAt: null,
    pollCount: 0,
    errorCount: 0,
    backoffUntil: null,
  };

  // Persist meta to Redis
  const redis = await getRedis();
  await redis.set(metaKey(id), JSON.stringify(meta));

  // Initialize state
  await redis.set(stateKey(id), JSON.stringify({ seenIds: [], followers: [], followerCount: null }));

  // Register in memory
  activeStreams.set(id, meta);

  // Schedule repeatable job
  const queue = getQueue();
  await queue.add('poll', { streamId: id }, {
    repeat: { every: intervalMs },
    jobId: id,
  });

  // Do an immediate first poll
  executePoll(id).catch((err) => {
    console.error(`⚠️ Stream ${id} initial poll failed:`, err.message);
  });

  console.log(`📡 Stream created: ${id} (${type} @${username} every ${intervalMs / 1000}s)`);

  return sanitizeMeta(meta);
}

/**
 * Stop and remove a stream.
 */
export async function stopStream(streamId) {
  const queue = getQueue();

  // Remove repeatable job
  try {
    const repeatableJobs = await queue.getRepeatableJobs();
    const match = repeatableJobs.find((j) => j.id === streamId);
    if (match) {
      await queue.removeRepeatableByKey(match.key);
    }
  } catch { /* best effort */ }

  // Clean Redis
  const redis = await getRedis();
  await redis.del(stateKey(streamId), historyKey(streamId), metaKey(streamId));

  activeStreams.delete(streamId);

  console.log(`🛑 Stream stopped: ${streamId}`);
  return { success: true, streamId };
}

/**
 * List all active streams.
 */
export async function listStreams() {
  // Refresh from Redis in case this process restarted
  await refreshFromRedis();
  return Array.from(activeStreams.values()).map(sanitizeMeta);
}

/**
 * Get recent event history for a stream.
 */
export async function getStreamHistory(streamId, limit = 50) {
  const redis = await getRedis();
  const raw = await redis.lrange(historyKey(streamId), 0, limit - 1);
  return raw.map((r) => JSON.parse(r));
}

/**
 * Get status information for a single stream.
 */
export async function getStreamStatus(streamId) {
  const meta = activeStreams.get(streamId);
  if (!meta) {
    // Try Redis
    const redis = await getRedis();
    const raw = await redis.get(metaKey(streamId));
    if (!raw) return null;
    return sanitizeMeta(JSON.parse(raw));
  }
  return sanitizeMeta(meta);
}

// ============================================================================
// Poll execution
// ============================================================================

async function executePoll(streamId) {
  const redis = await getRedis();

  // Load meta
  const metaRaw = await redis.get(metaKey(streamId));
  if (!metaRaw) return; // stream was removed
  const meta = JSON.parse(metaRaw);

  // Check backoff
  if (meta.backoffUntil && Date.now() < new Date(meta.backoffUntil).getTime()) {
    return;
  }

  // Load state
  const stateRaw = await redis.get(stateKey(streamId));
  const state = stateRaw ? JSON.parse(stateRaw) : { seenIds: [], followers: [], followerCount: null };

  try {
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

      // Emit individual follow/unfollow events
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

      // Always emit a summary if count changed
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

    // Persist state
    await redis.set(stateKey(streamId), JSON.stringify(state));

    // Emit events over Socket.IO
    if (_io && events.length > 0) {
      const room = `stream:${streamId}`;
      for (const event of events) {
        _io.to(room).emit(event.type, event);
        // Also emit to a global stream room
        _io.to('streams').emit(event.type, event);
      }
    }

    // Store in history (newest first)
    if (events.length > 0) {
      const pipeline = redis.pipeline();
      for (const event of events) {
        pipeline.lpush(historyKey(streamId), JSON.stringify(event));
      }
      pipeline.ltrim(historyKey(streamId), 0, MAX_HISTORY - 1);
      await pipeline.exec();
    }

    // Update meta
    meta.lastPollAt = new Date().toISOString();
    meta.pollCount++;
    meta.errorCount = 0;
    meta.backoffUntil = null;
    meta.status = 'running';
    await redis.set(metaKey(streamId), JSON.stringify(meta));
    activeStreams.set(streamId, meta);

    if (events.length > 0) {
      console.log(`📡 Stream ${streamId}: ${events.length} new event(s)`);
    }
  } catch (err) {
    console.error(`❌ Stream ${streamId} poll error:`, err.message);

    meta.errorCount = (meta.errorCount || 0) + 1;

    // Exponential backoff: 1min, 2min, 4min, 8min, max 15min
    const backoffMs = Math.min(
      meta.interval * Math.pow(2, meta.errorCount),
      15 * 60 * 1000
    );
    meta.backoffUntil = new Date(Date.now() + backoffMs).toISOString();
    meta.status = 'backoff';
    meta.lastError = err.message;

    await redis.set(metaKey(streamId), JSON.stringify(meta));
    activeStreams.set(streamId, meta);
  }
}

// ============================================================================
// Helpers
// ============================================================================

function sanitizeMeta(meta) {
  const { authToken, ...rest } = meta;
  return rest;
}

/**
 * Refresh in-memory registry from Redis (for process restarts).
 */
async function refreshFromRedis() {
  try {
    const redis = await getRedis();
    const keys = await redis.keys('xactions:stream:*:meta');
    for (const key of keys) {
      const raw = await redis.get(key);
      if (raw) {
        const meta = JSON.parse(raw);
        if (!activeStreams.has(meta.id)) {
          activeStreams.set(meta.id, meta);
        }
      }
    }
  } catch { /* Redis unavailable */ }
}

/**
 * Clean shutdown — close pool and queue.
 */
export async function shutdown() {
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

export { STREAM_TYPES, getPoolStatus };
