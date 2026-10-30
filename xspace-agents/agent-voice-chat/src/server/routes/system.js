// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 nirholas (https://github.com/nirholas/xspace-agent)

const { Router } = require("express")
const path = require("path")
const { getConfig, redactConfig, validateConfigHealth } = require("../config")
const { getProviderHealth, isReady, refreshProviderStatus } = require("../health")
const { checkAllProviders } = require("../health/provider-checker")

/**
 * System routes: health, config, providers, metrics, docs.
 *
 * @param {object} deps
 * @param {object} deps.provider - LLM provider
 * @param {string} deps.AI_PROVIDER - provider name
 * @param {object} deps.tts - TTS provider module
 * @param {object} deps.registry - AgentRegistry
 * @param {object} deps.spaceState - shared server state
 * @param {object} deps.metrics - metrics tracker
 * @param {object} [deps.breakers] - { llm, stt, tts } circuit breaker instances
 */
module.exports = function createSystemRoutes(deps) {
  const { provider, AI_PROVIDER, tts, registry, spaceState, metrics, breakers } = deps
  const router = Router()

  const startTime = Date.now()

  // ── GET /api/health ────────────────────────────────────────────
  // Supports ?depth=shallow (load balancer) | ?depth=deep (full connectivity check)
  // Default: shallow + cached provider status
  router.get("/health", async (req, res) => {
    const depth = req.query.depth || "default"

    // Shallow: minimal response for load balancers
    if (depth === "shallow") {
      return res.json({ status: "ok", uptime: Math.floor(process.uptime()) })
    }

    const apiKeyOk = isApiKeySet(AI_PROVIDER)

    // Deep: force a live provider connectivity check
    if (depth === "deep") {
      try {
        await refreshProviderStatus()
      } catch {
        // continue with stale data
      }
    }

    const providerHealth = getProviderHealth(breakers)
    const status = apiKeyOk ? "ok" : "degraded"

    res.status(apiKeyOk ? 200 : 503).json({
      status,
      uptime: Math.floor(process.uptime()),
      version: require(path.join(__dirname, "..", "..", "..", "package.json")).version,
      provider: {
        name: AI_PROVIDER,
        type: provider.type,
        apiKeyConfigured: apiKeyOk
      },
      tts: {
        provider: tts.TTS_PROVIDER
      },
      memory: {
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
      },
      providers: providerHealth,
      lastError: metrics ? metrics.lastError : null
    })
  })

  // ── GET /api/health/providers ────────────────────────────────────
  // Returns per-provider health with circuit breaker state (cached data)
  router.get("/health/providers", (req, res) => {
    res.json(getProviderHealth(breakers))
  })

  // ── POST /api/health/providers/check ─────────────────────────────
  // Force immediate provider health check with live connectivity validation
  router.post("/health/providers/check", async (req, res) => {
    try {
      const results = await checkAllProviders(breakers)
      res.json(results)
    } catch (err) {
      res.status(500).json({
        error: { code: "HEALTH_CHECK_FAILED", message: err.message }
      })
    }
  })

  // ── GET /api/health/live ─────────────────────────────────────────
  // Liveness probe: process is alive (always 200 if server responds)
  // Kubernetes: livenessProbe
  router.get("/health/live", (req, res) => {
    res.json({ status: "alive", uptime: Math.floor(process.uptime()) })
  })

  // ── GET /api/health/ready ────────────────────────────────────────
  // Readiness probe: ready to serve (200 only if providers are connected)
  // Kubernetes: readinessProbe
  router.get("/health/ready", (req, res) => {
    const ready = isReady(breakers)
    const providerHealth = getProviderHealth(breakers)

    res.status(ready ? 200 : 503).json({
      status: ready ? "ready" : "not_ready",
      providers: providerHealth
    })
  })

  // ── GET /api/config ────────────────────────────────────────────
  router.get("/config", (req, res) => {
    const agents = registry.getAllAgents().map(a => ({
      id: a.id,
      name: a.name,
      voice: a.voice
    }))

    res.json({
      provider: AI_PROVIDER,
      model: getModelName(AI_PROVIDER),
      providerType: provider.type,
      agents,
      tts: tts.TTS_PROVIDER,
      features: {
        voiceChat: true,
        textChat: true,
        sseStreaming: provider.type === "socket",
        webrtc: provider.type === "webrtc"
      }
    })
  })

  // ── PUT /api/config ────────────────────────────────────────────
  router.put("/config", (req, res) => {
    // Runtime config updates are limited (provider changes require restart)
    // This endpoint allows updating agent-level config
    const { agents } = req.body || {}
    if (agents && Array.isArray(agents)) {
      for (const agentUpdate of agents) {
        if (agentUpdate.id && registry.getAgent(agentUpdate.id)) {
          try {
            registry.updateAgent(agentUpdate.id, agentUpdate)
          } catch (err) {
            // skip invalid updates
          }
        }
      }
    }

    res.json({
      updated: true,
      config: {
        provider: AI_PROVIDER,
        model: getModelName(AI_PROVIDER),
        agents: registry.getAllAgents().map(a => ({ id: a.id, name: a.name, voice: a.voice }))
      }
    })
  })

  // ── GET /api/config/validate (admin-only health check) ────────
  router.get("/config/validate", (req, res) => {
    const config = getConfig()
    const issues = validateConfigHealth(config)
    const healthy = issues.every(i => i.level !== "error")

    res.status(healthy ? 200 : 503).json({
      healthy,
      issues,
      config: redactConfig(config)
    })
  })

  // ── GET /api/providers ─────────────────────────────────────────
  router.get("/providers", (req, res) => {
    res.json([
      {
        name: "openai",
        type: "webrtc",
        models: ["gpt-4o-realtime-preview-2024-12-17"],
        current: AI_PROVIDER === "openai"
      },
      {
        name: "openai-chat",
        type: "socket",
        models: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo"],
        current: AI_PROVIDER === "openai-chat"
      },
      {
        name: "claude",
        type: "socket",
        models: ["claude-sonnet-5-5", "claude-opus-5-5"],
        current: AI_PROVIDER === "claude"
      },
      {
        name: "groq",
        type: "socket",
        models: ["llama-3.3-70b-versatile", "mixtral-8x7b-32768"],
        current: AI_PROVIDER === "groq"
      }
    ])
  })

  // ── GET /api/metrics ───────────────────────────────────────────
  router.get("/metrics", (req, res) => {
    const m = metrics ? metrics.getSnapshot() : getDefaultMetrics()
    res.json(m)
  })

  // ── GET /api/docs/openapi.json ─────────────────────────────────
  router.get("/docs/openapi.json", (req, res) => {
    try {
      const spec = require(path.join(__dirname, "..", "..", "..", "openapi.json"))
      res.json(spec)
    } catch (err) {
      res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Failed to load OpenAPI spec" }
      })
    }
  })

  return router
}

function isApiKeySet(providerName) {
  switch (providerName) {
    case "claude": return !!process.env.ANTHROPIC_API_KEY
    case "openai":
    case "openai-chat": return !!process.env.OPENAI_API_KEY
    case "groq": return !!process.env.GROQ_API_KEY
    default: return false
  }
}

function getModelName(providerName) {
  switch (providerName) {
    case "claude": return process.env.CLAUDE_MODEL || "claude-sonnet-5-5"
    case "openai": return process.env.OPENAI_REALTIME_MODEL || "gpt-4o-realtime-preview-2024-12-17"
    case "openai-chat": return process.env.OPENAI_MODEL || "gpt-4o-mini"
    case "groq": return process.env.GROQ_MODEL || "llama-3.3-70b-versatile"
    default: return "unknown"
  }
}

function getDefaultMetrics() {
  return {
    stt: { calls: 0, avgLatencyMs: 0, errors: 0 },
    llm: { calls: 0, avgLatencyMs: 0, errors: 0, tokensUsed: 0 },
    tts: { calls: 0, avgLatencyMs: 0, errors: 0 },
    audio: { chunksPerSecond: 0, vadState: "idle" },
    cost: { today: 0, total: 0 }
  }
}
