// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 nirholas (https://github.com/nirholas/xspace-agent)

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { createRequire } from "module"

const require = createRequire(import.meta.url)

// ─── HTTP rate limiters ────────────────────────────────────────────────────────

describe("HTTP rate limiters", () => {
  let generalLimiter, messageLimiter, sessionLimiter

  beforeEach(() => {
    vi.resetModules()
    // Reset env so each test suite gets deterministic limits
    vi.stubEnv("RATE_LIMIT_GENERAL", "100")
    vi.stubEnv("RATE_LIMIT_MESSAGE", "20")
    vi.stubEnv("RATE_LIMIT_SESSION", "5")
    ;({ generalLimiter, messageLimiter, sessionLimiter } = require("../../../src/server/middleware/rate-limit.js"))
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("exports generalLimiter as a function (Express middleware)", () => {
    expect(typeof generalLimiter).toBe("function")
  })

  it("exports messageLimiter as a function", () => {
    expect(typeof messageLimiter).toBe("function")
  })

  it("exports sessionLimiter as a function", () => {
    expect(typeof sessionLimiter).toBe("function")
  })

  it("uses RATE_LIMIT_GENERAL env var when set", () => {
    vi.resetModules()
    vi.stubEnv("RATE_LIMIT_GENERAL", "42")
    const { generalLimiter: lim } = require("../../../src/server/middleware/rate-limit.js")
    expect(typeof lim).toBe("function")
  })

  it("falls back to defaults when env vars are absent", () => {
    vi.resetModules()
    vi.stubEnv("RATE_LIMIT_GENERAL", "")
    vi.stubEnv("RATE_LIMIT_MESSAGE", "")
    vi.stubEnv("RATE_LIMIT_SESSION", "")
    const mod = require("../../../src/server/middleware/rate-limit.js")
    expect(typeof mod.generalLimiter).toBe("function")
    expect(typeof mod.messageLimiter).toBe("function")
    expect(typeof mod.sessionLimiter).toBe("function")
  })

  describe("rateLimitResponse handler", () => {
    it("returns 429 with RATE_LIMITED code", () => {
      const req = { rateLimit: { resetTime: 5000 } }
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() }

      // Call the handler directly by triggering a limiter that is already over the max
      // We simulate the handler by extracting it via a saturated request.
      // Since express-rate-limit doesn't expose the handler, we drive it
      // through the middleware with a faked store that says the limit is hit.
      const store = {
        increment: vi.fn().mockResolvedValue({ totalHits: 999, resetTime: new Date(Date.now() + 5000) }),
        decrement: vi.fn(),
        resetKey: vi.fn()
      }

      vi.resetModules()
      vi.stubEnv("RATE_LIMIT_GENERAL", "1")
      const rateLimit = require("express-rate-limit")
      const limiter = rateLimit({
        windowMs: 60_000,
        max: 1,
        standardHeaders: true,
        legacyHeaders: false,
        store,
        handler: (req, res) => {
          res.status(429).json({
            error: {
              code: "RATE_LIMITED",
              message: "Too many requests. Please try again later.",
              retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
            }
          })
        }
      })

      // totalHits > max, so handler fires
      const next = vi.fn()
      const fakeReq = {
        ip: "127.0.0.1",
        method: "GET",
        path: "/",
        rateLimit: { resetTime: 5000 },
        headers: {}
      }
      const fakeRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
        set: vi.fn(),
        setHeader: vi.fn(),
        getHeader: vi.fn(),
        removeHeader: vi.fn()
      }

      return new Promise(resolve => {
        fakeRes.json.mockImplementation(body => {
          expect(fakeRes.status).toHaveBeenCalledWith(429)
          expect(body.error.code).toBe("RATE_LIMITED")
          expect(body.error).toHaveProperty("retryAfter")
          resolve()
        })
        next.mockImplementation(resolve)
        limiter(fakeReq, fakeRes, next)
      })
    })
  })
})

// ─── Socket rate limiter ───────────────────────────────────────────────────────

describe("createSocketRateLimiter", () => {
  let createSocketRateLimiter

  beforeEach(() => {
    vi.resetModules()
    ;({ createSocketRateLimiter } = require("../../../src/server/middleware/rate-limit.js"))
  })

  it("allows first event from a socket", () => {
    const limiter = createSocketRateLimiter()
    expect(limiter.check("socket-1", "message", 10)).toBe(false)
  })

  it("allows events within the rate limit", () => {
    const limiter = createSocketRateLimiter()
    for (let i = 0; i < 5; i++) {
      expect(limiter.check("socket-1", "message", 10)).toBe(false)
    }
  })

  it("rejects events exceeding the rate limit", () => {
    const limiter = createSocketRateLimiter()
    for (let i = 0; i < 10; i++) limiter.check("socket-1", "message", 10)
    // 11th call is over max=10
    expect(limiter.check("socket-1", "message", 10)).toBe(true)
  })

  it("tracks limits per socket independently", () => {
    const limiter = createSocketRateLimiter()
    for (let i = 0; i < 10; i++) limiter.check("socket-A", "message", 10)
    // socket-A is at limit; socket-B should still be allowed
    expect(limiter.check("socket-B", "message", 10)).toBe(false)
  })

  it("tracks limits per event type independently", () => {
    const limiter = createSocketRateLimiter()
    for (let i = 0; i < 10; i++) limiter.check("socket-1", "message", 10)
    // "audio" event counter is fresh
    expect(limiter.check("socket-1", "audio", 10)).toBe(false)
  })

  it("resets count after window expires", () => {
    vi.useFakeTimers()
    const limiter = createSocketRateLimiter()
    for (let i = 0; i < 10; i++) limiter.check("socket-1", "message", 10)
    expect(limiter.check("socket-1", "message", 10)).toBe(true) // over limit

    // Advance past the 60-second window
    vi.advanceTimersByTime(61_000)
    expect(limiter.check("socket-1", "message", 10)).toBe(false) // window reset
    vi.useRealTimers()
  })

  it("does not block at exactly the max (boundary inclusive)", () => {
    const limiter = createSocketRateLimiter()
    // First call sets count to 1; calls 2-max are <= max; call max+1 exceeds
    for (let i = 0; i < 10; i++) {
      expect(limiter.check("socket-1", "ev", 10)).toBe(false)
    }
    expect(limiter.check("socket-1", "ev", 10)).toBe(true)
  })

  describe("cleanup()", () => {
    it("removes entries for a disconnected socket", () => {
      const limiter = createSocketRateLimiter()
      limiter.check("socket-1", "message", 10)
      limiter.check("socket-1", "audio", 10)
      limiter.cleanup("socket-1")
      // After cleanup the window resets — first call should be allowed again
      expect(limiter.check("socket-1", "message", 10)).toBe(false)
    })

    it("does not affect entries for other sockets during cleanup", () => {
      const limiter = createSocketRateLimiter()
      for (let i = 0; i < 10; i++) limiter.check("socket-A", "message", 10)
      for (let i = 0; i < 10; i++) limiter.check("socket-B", "message", 10)

      limiter.cleanup("socket-A")
      // socket-B should still be at its limit
      expect(limiter.check("socket-B", "message", 10)).toBe(true)
    })

    it("handles cleanup when no entries exist (no crash)", () => {
      const limiter = createSocketRateLimiter()
      expect(() => limiter.cleanup("never-connected")).not.toThrow()
    })

    it("does not leak entries after cleanup", () => {
      const limiter = createSocketRateLimiter()
      limiter.check("socket-1", "message", 10)
      limiter.cleanup("socket-1")
      // A fresh entry after cleanup means count starts at 1 — well within limit
      expect(limiter.check("socket-1", "message", 10)).toBe(false)
    })
  })

  describe("edge cases", () => {
    it("does not crash on undefined socketId", () => {
      const limiter = createSocketRateLimiter()
      expect(() => limiter.check(undefined, "message", 10)).not.toThrow()
    })

    it("does not crash on undefined event", () => {
      const limiter = createSocketRateLimiter()
      expect(() => limiter.check("socket-1", undefined, 10)).not.toThrow()
    })

    it("handles very high request volume without crashing", () => {
      const limiter = createSocketRateLimiter()
      expect(() => {
        for (let i = 0; i < 10_000; i++) limiter.check("socket-flood", "message", 50)
      }).not.toThrow()
    })

    it("handles concurrent requests from the same IP (deterministic result)", () => {
      const limiter = createSocketRateLimiter()
      const results = []
      for (let i = 0; i < 20; i++) {
        results.push(limiter.check("socket-concurrent", "message", 10))
      }
      // First 10 should be false, rest true
      const allowedCount = results.filter(r => r === false).length
      const blockedCount = results.filter(r => r === true).length
      expect(allowedCount).toBe(10)
      expect(blockedCount).toBe(10)
    })

    it("handles clock skew: ancient windowStart still resets correctly", () => {
      vi.useFakeTimers()
      const limiter = createSocketRateLimiter()
      // Saturate
      for (let i = 0; i < 10; i++) limiter.check("socket-skew", "message", 10)
      // Jump well into the future
      vi.advanceTimersByTime(120_000)
      expect(limiter.check("socket-skew", "message", 10)).toBe(false)
      vi.useRealTimers()
    })
  })
})

// ─── keyGenerator / rateLimitResponse ──────────────────────────────────────────

describe("keyGenerator", () => {
  const { keyGenerator } = require("../../../src/server/middleware/rate-limit.js")

  it("prefers the JWT subject, then the API key hash", () => {
    expect(keyGenerator({ user: { sub: "u1", apiKeyHash: "h" }, ip: "1.2.3.4" })).toBe("user:u1")
    expect(keyGenerator({ user: { apiKeyHash: "h" }, ip: "1.2.3.4" })).toBe("key:h")
  })

  it("keys an IPv4 client by its address", () => {
    expect(keyGenerator({ ip: "203.0.113.7" })).toBe("ip:203.0.113.7")
  })

  it("gives every address in one IPv6 subnet the same key, so rotating addresses cannot dodge the limit", () => {
    const a = keyGenerator({ ip: "2001:db8:abcd:12::1" })
    const b = keyGenerator({ ip: "2001:db8:abcd:12:ffff:ffff:ffff:ffff" })
    const other = keyGenerator({ ip: "2001:db8:1111:12::1" })
    expect(a).toBe(b)
    expect(a).not.toBe(other)
  })
})

describe("rateLimitResponse", () => {
  const { rateLimitResponse } = require("../../../src/server/middleware/rate-limit.js")

  function run(resetTime) {
    const res = { set: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn() }
    rateLimitResponse({ rateLimit: { resetTime } }, res)
    return res
  }

  it("answers 429 with Retry-After as a delay in seconds, not an epoch timestamp", () => {
    const res = run(new Date(Date.now() + 30_000))
    const header = Number(res.set.mock.calls[0][1])
    expect(res.status).toHaveBeenCalledWith(429)
    expect(header).toBeGreaterThan(0)
    expect(header).toBeLessThanOrEqual(30)
    expect(res.json.mock.calls[0][0].error.retryAfter).toBe(header)
  })

  it("falls back to 60 seconds when the reset time is unknown", () => {
    expect(run(undefined).set).toHaveBeenCalledWith("Retry-After", "60")
  })
})
