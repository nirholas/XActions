// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 nirholas (https://github.com/nirholas/xspace-agent)

const { MAX_AUDIO_SIZE_BYTES } = require("../constants")
const helmet = require("helmet")

// Read at call time, not import time: the CORS/CSP posture is a security decision and
// must follow the environment the process is actually running in.
function isProduction() {
  return process.env.NODE_ENV === "production"
}

// Localhost patterns allowed in development
const DEV_ORIGIN_RE = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/

/**
 * Parse ALLOWED_ORIGINS or CORS_ORIGINS env var into an allowlist array,
 * or return a sentinel value:
 *   false  → same-origin only (production default)
 *   "dev"  → allow localhost:* patterns (development default)
 */
function getAllowedOrigins() {
  const raw = process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGINS

  if (raw) {
    return raw.split(",").map(o => o.trim()).filter(Boolean)
  }

  // In production with no explicit list, same-origin only
  if (isProduction()) {
    return false
  }

  // In development, allow localhost patterns
  return "dev"
}

/**
 * Build a cors() origin callback from the allowlist.
 * Never uses `origin: true` (which reflects any origin).
 */
function getCorsConfig() {
  const allowed = getAllowedOrigins()

  if (allowed === false) {
    // Same-origin only — disable CORS entirely
    return { origin: false, methods: ["GET", "POST"], credentials: false }
  }

  const originFn = (origin, callback) => {
    // Same-origin requests (no Origin header) are always OK
    if (!origin) return callback(null, true)

    if (allowed === "dev") {
      if (DEV_ORIGIN_RE.test(origin)) return callback(null, true)
      return callback(null, false)
    }

    // Explicit allowlist
    if (allowed.includes(origin)) return callback(null, true)
    return callback(null, false)
  }

  return { origin: originFn, methods: ["GET", "POST"], credentials: true }
}

/**
 * Derive WebSocket origins for CSP connect-src from the same allowlist.
 * Returns an array of wss:// equivalents for each allowed origin.
 */
function getWsOrigins() {
  const allowed = getAllowedOrigins()
  if (allowed === false) return []
  if (allowed === "dev") return ["ws://localhost:*", "ws://127.0.0.1:*"]
  return allowed.map(o => o.replace(/^http/, "ws"))
}

// Helmet with settings compatible with Socket.IO and WebRTC
function getHelmetMiddleware() {
  const frameable = process.env.X_FRAME_OPTIONS || "SAMEORIGIN"
  const wsOrigins = getWsOrigins()

  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdn.jsdelivr.net"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net", "https://cdn.tailwindcss.com"],
        connectSrc: ["'self'", ...wsOrigins, "https://api.openai.com", "https://*.openai.com", "https://cdn.jsdelivr.net", "https://cdn.tailwindcss.com"],
        mediaSrc: ["'self'", "blob:"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        fontSrc: ["'self'", "https:", "data:"],
        frameSrc: frameable === "DENY" ? ["'none'"] : ["'self'"]
      }
    },
    crossOriginEmbedderPolicy: false, // Required for WebRTC
    xFrameOptions: frameable === "DENY" ? { action: "deny" } : { action: "sameorigin" }
  })
}

// JSON body size limit
const JSON_BODY_LIMIT = "1mb"

// Audio data size limit (5MB) — enforced in Socket.IO handler
const MAX_AUDIO_SIZE = MAX_AUDIO_SIZE_BYTES

module.exports = { getCorsConfig, getHelmetMiddleware, JSON_BODY_LIMIT, MAX_AUDIO_SIZE, getAllowedOrigins }
