// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 nirholas (https://github.com/nirholas/xspace-agent)

const { logger } = require("./logger")
const { HEALTH_CHECK_INTERVAL_MS } = require("./constants")

const startTime = Date.now()

// Track provider status (updated periodically and on-demand)
const providerStatus = {
  llm: { provider: null, status: "unknown", lastCheck: null },
  tts: { provider: null, status: "unknown", lastCheck: null },
  stt: { provider: null, status: "unknown", lastCheck: null }
}

// Circuit breaker references (set via setCircuitBreakers)
let circuitBreakers = null

// Simple key validity check — makes a minimal API call
async function checkOpenAI() {
  try {
    const key = process.env.OPENAI_API_KEY
    if (!key) return "unconfigured"
    const res = await fetch("https://api.openai.com/v1/models?limit=1", {
      method: "GET",
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(5000)
    })
    return res.ok ? "connected" : "error"
  } catch {
    return "error"
  }
}

async function checkAnthropic() {
  try {
    const key = process.env.ANTHROPIC_API_KEY
    if (!key) return "unconfigured"
    return /^sk-ant-/.test(key) ? "available" : "error"
  } catch {
    return "error"
  }
}

async function checkGroq() {
  try {
    const key = process.env.GROQ_API_KEY
    if (!key) return "unconfigured"
    const res = await fetch("https://api.groq.com/openai/v1/models", {
      method: "GET",
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(5000)
    })
    return res.ok ? "connected" : "error"
  } catch {
    return "error"
  }
}

const PROVIDER_CHECKS = {
  openai: checkOpenAI,
  "openai-chat": checkOpenAI,
  claude: checkAnthropic,
  groq: checkGroq
}

async function refreshProviderStatus() {
  const aiProvider = process.env.AI_PROVIDER || "openai"
  const sttProvider = process.env.STT_PROVIDER || "groq"
  const ttsProvider = process.env.TTS_PROVIDER || "openai"

  const now = new Date().toISOString()

  // Check LLM provider
  const llmCheck = PROVIDER_CHECKS[aiProvider]
  if (llmCheck) {
    providerStatus.llm = {
      provider: aiProvider,
      status: await llmCheck(),
      lastCheck: now
    }
  }

  // Check STT
  const sttCheck = PROVIDER_CHECKS[sttProvider]
  if (sttCheck) {
    providerStatus.stt = {
      provider: sttProvider,
      status: await sttCheck(),
      lastCheck: now
    }
  }

  // Check TTS
  if (ttsProvider === "browser") {
    providerStatus.tts = { provider: "browser", status: "available", lastCheck: now }
  } else {
    const ttsCheck = PROVIDER_CHECKS[ttsProvider] || PROVIDER_CHECKS.openai
    if (ttsCheck) {
      providerStatus.tts = {
        provider: ttsProvider,
        status: await ttsCheck(),
        lastCheck: now
      }
    }
  }

  logger.debug({ providerStatus }, "Provider health check completed")
}

// Start periodic health checks (every 5 minutes)
let healthCheckInterval = null

function startHealthChecks() {
  // Initial check
  refreshProviderStatus().catch(err => logger.error({ err }, "Initial health check failed"))

  healthCheckInterval = setInterval(() => {
    refreshProviderStatus().catch(err => logger.error({ err }, "Periodic health check failed"))
  }, HEALTH_CHECK_INTERVAL_MS)

  // Don't block process exit
  if (healthCheckInterval.unref) healthCheckInterval.unref()
}

function stopHealthChecks() {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval)
    healthCheckInterval = null
  }
}

/**
 * Register circuit breaker instances so health responses can include their state.
 * @param {{ llm: CircuitBreaker, stt: CircuitBreaker, tts: CircuitBreaker }} breakers
 */
function setCircuitBreakers(breakers) {
  circuitBreakers = breakers
}

function getHealthResponse() {
  const allStatuses = [providerStatus.llm.status, providerStatus.tts.status, providerStatus.stt.status]
  const hasError = allStatuses.some(s => s === "error")
  const allUnknown = allStatuses.every(s => s === "unknown")

  let status = "healthy"
  if (hasError) status = "degraded"
  if (allUnknown) status = "starting"

  return {
    status,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    provider: {
      name: providerStatus.llm.provider,
      status: providerStatus.llm.status,
      lastCheck: providerStatus.llm.lastCheck
    },
    dependencies: {
      tts: { provider: providerStatus.tts.provider, status: providerStatus.tts.status },
      stt: { provider: providerStatus.stt.provider, status: providerStatus.stt.status }
    }
  }
}

/**
 * Returns per-provider health with circuit breaker state (cached data).
 * @param {{ llm?: object, stt?: object, tts?: object }} [breakers] Breakers to report on.
 *   Defaults to the ones registered with setCircuitBreakers(), so callers that own
 *   their breakers (the system routes) do not depend on module-global state.
 */
function getProviderHealth(breakers = circuitBreakers) {
  const roles = ["llm", "stt", "tts"]
  const result = {}

  for (const role of roles) {
    const cached = providerStatus[role]
    const breaker = breakers?.[role]
    const breakerState = breaker ? breaker.getState() : null

    result[role] = {
      provider: cached.provider,
      status: cached.status,
      lastCheck: cached.lastCheck,
      circuitBreaker: breakerState ? breakerState.state : "N/A",
      failureCount: breakerState ? breakerState.failureCount : 0,
      lastSuccess: breakerState ? breakerState.lastSuccess : null,
      lastFailure: breakerState ? breakerState.lastFailure : null,
      successRate: breakerState ? breakerState.successRate : 1.0,
      avgLatencyMs: breakerState ? breakerState.avgLatencyMs : 0
    }
  }

  return result
}

/**
 * Determines if the system is ready to serve requests.
 * Checks that at least the LLM provider is not in error/unconfigured state
 * and that no circuit breaker is OPEN.
 */
function isReady(breakers = circuitBreakers) {
  const llmStatus = providerStatus.llm.status
  if (llmStatus === "error" || llmStatus === "unconfigured") return false
  if (breakers?.llm?.state === "OPEN") return false
  return true
}

module.exports = {
  startHealthChecks,
  stopHealthChecks,
  setCircuitBreakers,
  getHealthResponse,
  getProviderHealth,
  isReady,
  refreshProviderStatus
}
