// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 nirholas (https://github.com/nirholas/xspace-agent)

'use strict'

const { DEFAULT_RATE_LIMIT_WINDOW_MS, RATE_LIMIT_TIERS } = require("../constants")
const rateLimit = require("express-rate-limit")
const { ipKeyGenerator } = rateLimit

const RATE_LIMIT_MESSAGE = parseInt(process.env.RATE_LIMIT_MESSAGE, 10) || 20
const RATE_LIMIT_SESSION = parseInt(process.env.RATE_LIMIT_SESSION, 10) || 5
const RATE_LIMIT_GENERAL = parseInt(process.env.RATE_LIMIT_GENERAL, 10) || 100

// ── Key generator: user ID > API key hash > IP fallback ──────────────────────

/**
 * Generates a rate-limit key from the request.
 * Priority: JWT sub > API key hash > IP address.
 *
 * IPv6 clients are keyed by their /56 subnet (ipKeyGenerator) rather than the raw
 * address: a single host usually controls a whole /64 or larger, so keying on the full
 * address lets it dodge the limit by rotating addresses.
 */
function keyGenerator(req) {
  if (req.user?.sub) return `user:${req.user.sub}`
  if (req.user?.apiKeyHash) return `key:${req.user.apiKeyHash}`
  return `ip:${ipKeyGenerator(req.ip)}`
}

// ── Redis store setup (optional) ─────────────────────────────────────────────

let redisStoreInstance = null

/**
 * Initialize the Redis store for distributed rate limiting.
 * Call this once at startup if REDIS_URL is configured.
 * @param {import('redis').RedisClientType} redisClient - Connected redis client
 */
function initRedisStore(redisClient) {
  if (!redisClient) return
  try {
    const RedisStore = require("rate-limit-redis")
    redisStoreInstance = new RedisStore({
      sendCommand: (...args) => redisClient.sendCommand(args),
      prefix: "rl:"
    })
  } catch {
    // rate-limit-redis not installed — fall back to in-memory
    redisStoreInstance = null
  }
}

/**
 * Returns the Redis store if available, otherwise undefined (in-memory fallback).
 */
function getStore() {
  return redisStoreInstance || undefined
}

// ── Role-based dynamic max ───────────────────────────────────────────────────

/**
 * Create a dynamic max function that returns the rate limit based on user role.
 * @param {'general' | 'message' | 'session'} tier
 * @param {number} defaultMax - fallback limit for anonymous users
 */
function dynamicMax(tier, defaultMax) {
  return (req) => {
    const role = req.user?.role || "anonymous"
    const limits = RATE_LIMIT_TIERS[role]
    if (limits && limits[tier] !== undefined) return limits[tier]
    return defaultMax
  }
}

// ── Rate limit response handler ──────────────────────────────────────────────

const rateLimitResponse = (req, res) => {
  const resetTime = req.rateLimit?.resetTime
  // Retry-After is a delay in seconds (RFC 9110), not an absolute timestamp
  const resetMs = resetTime instanceof Date ? resetTime.getTime() : resetTime
  const retryAfter = resetMs ? Math.max(1, Math.ceil((resetMs - Date.now()) / 1000)) : 60

  res.set("Retry-After", String(retryAfter))
  res.status(429).json({
    error: {
      code: "RATE_LIMITED",
      message: "Too many requests. Please try again later.",
      retryAfter
    }
  })
}

// ── Limiter factories ────────────────────────────────────────────────────────

/**
 * Creates an express-rate-limit middleware with per-user keying, optional Redis
 * store, and role-based dynamic limits.
 */
function createLimiter(tier, defaultMax) {
  return rateLimit({
    windowMs: DEFAULT_RATE_LIMIT_WINDOW_MS,
    max: dynamicMax(tier, defaultMax),
    keyGenerator,
    store: getStore(),
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitResponse
  })
}

// General API rate limit
const generalLimiter = createLimiter("general", RATE_LIMIT_GENERAL)

// Stricter limit for message endpoints (LLM calls are expensive)
const messageLimiter = createLimiter("message", RATE_LIMIT_MESSAGE)

// Strictest limit for session creation (creates billable OpenAI sessions)
const sessionLimiter = createLimiter("session", RATE_LIMIT_SESSION)

// ── Socket.IO per-socket rate limiting (in-memory) ───────────────────────────

function createSocketRateLimiter() {
  const limits = new Map()

  // Periodically evict expired window entries to prevent unbounded growth
  const cleanupInterval = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of limits) {
      if (now - entry.windowStart > DEFAULT_RATE_LIMIT_WINDOW_MS) {
        limits.delete(key)
      }
    }
  }, 60000)

  return {
    /**
     * Check if an event from a socket should be rate-limited.
     * @param {string} socketId
     * @param {string} event - event name
     * @param {number} maxPerMinute
     * @returns {boolean} true if the event should be BLOCKED
     */
    check(socketId, event, maxPerMinute) {
      const key = `${socketId}:${event}`
      const now = Date.now()

      if (!limits.has(key)) {
        limits.set(key, { count: 1, windowStart: now })
        return false
      }

      const entry = limits.get(key)

      // Reset window if expired
      if (now - entry.windowStart > DEFAULT_RATE_LIMIT_WINDOW_MS) {
        entry.count = 1
        entry.windowStart = now
        return false
      }

      entry.count++
      return entry.count > maxPerMinute
    },

    // Clean up disconnected sockets
    cleanup(socketId) {
      for (const key of limits.keys()) {
        if (key.startsWith(socketId + ":")) {
          limits.delete(key)
        }
      }
    },

    // Stop the background cleanup interval (call on server shutdown)
    stopCleanup() {
      clearInterval(cleanupInterval)
    },

    // Expose current map size for metrics
    get size() {
      return limits.size
    }
  }
}

module.exports = {
  generalLimiter,
  messageLimiter,
  sessionLimiter,
  createSocketRateLimiter,
  createLimiter,
  keyGenerator,
  dynamicMax,
  initRedisStore,
  rateLimitResponse,
  RATE_LIMIT_TIERS
}
