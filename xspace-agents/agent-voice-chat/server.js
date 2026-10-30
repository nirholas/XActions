// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 nirholas (https://github.com/nirholas/xspace-agent)

require("dotenv").config()

// Logger must be loaded early (before other modules that use it)
const { logger, safeMessage, requestLogger } = require("./src/server/logger")

// Validate environment before doing anything else
const { validateEnv } = require("./src/server/env-validation")
validateEnv()

const express = require("express")
const path = require("path")
const http = require("http")
const { Server } = require("socket.io")
const { createProvider, AI_PROVIDER } = require("./providers")
const stt = require("./providers/stt")
const tts = require("./providers/tts")
const AgentRegistry = require("./agent-registry")
const { RoomManager, DEFAULT_ROOM_ID } = require("./room-manager")

// Shared constants & utilities
const {
  SOCKET_PING_TIMEOUT_MS, SOCKET_PING_INTERVAL_MS, MAX_AUDIO_SIZE_BYTES,
  MAX_HISTORY_SLICE, PROVIDER_TYPES, STREAM_TIMEOUT_MS: DEFAULT_STREAM_TIMEOUT_MS,
  SOCKET_AUDIO_RATE_LIMIT, SOCKET_MESSAGE_RATE_LIMIT,
  MEMORY_WARNING_THRESHOLD_BYTES, SOCKET_WARNING_THRESHOLD,
  MAX_DISPLAY_NAME_LENGTH
} = require("./src/server/constants")
const { createTurnManager } = require("./src/server/turn-manager-utils")

// Security & middleware
const { apiKeyAuth, socketAuth, logAuthStatus } = require("./src/server/middleware/auth")
const { generalLimiter, sessionLimiter, createSocketRateLimiter } = require("./src/server/middleware/rate-limit")
const { sanitizeMessage, validateAgentId, validateRoomId, formatChatForLLM } = require("./src/server/middleware/sanitize")
const { randomUUID } = require("crypto")
const {
  JoinRoomSchema, AgentConnectSchema, AgentDisconnectSchema, StatusChangeSchema,
  RequestTurnSchema, ReleaseTurnSchema, TextDeltaSchema, TextCompleteSchema,
  AudioDataSchema, UserMessageSchema, TextToAgentDirectSchema, AudioLevelSchema,
  validateSocketEvent
} = require("./src/server/socket-schemas")
const { getCorsConfig, getHelmetMiddleware, JSON_BODY_LIMIT, MAX_AUDIO_SIZE } = require("./src/server/middleware/security")
const { startHealthChecks, stopHealthChecks, getHealthResponse, setCircuitBreakers } = require("./src/server/health")
const { requestId } = require("./src/server/middleware/request-id")
const { CircuitBreaker, withRetry } = require("./src/server/circuit-breaker")
const { requestTimeout } = require("./src/server/middleware/timeout")
// REST API route modules
const swaggerUi = require("swagger-ui-express")
const { responseHelpers } = require("./src/server/middleware/response")
const createAgentRoutes = require("./src/server/routes/agents")
const createAgentControlRoutes = require("./src/server/routes/agent-control")
const createRoomRoutes = require("./src/server/routes/rooms")
const createSystemRoutes = require("./src/server/routes/system")
const createConversationRoutes = require("./src/server/routes/conversations")
const createPersonalityRoutes = require("./src/server/routes/personalities")
const { MetricsTracker } = require("./src/server/metrics")
const createMemoryRoutes = require("./src/server/routes/memory")
const createKnowledgeRoutes = require("./src/server/routes/knowledge")
const createRegistryRoutes = require("./src/server/routes/registry")

// Memory & RAG
const { MemoryStore } = require("./lib/memory-store")
const { KnowledgeBase } = require("./lib/knowledge-base")
const { ContextInjector } = require("./lib/context-injector")
const { extractFacts, isExtractable } = require("./lib/memory-extractor")

// ===== CONFIG =====
const PORT = process.env.PORT || 3000
const PROJECT_NAME = process.env.PROJECT_NAME || "AI Agents"
const AVATAR_URL_1 = process.env.AVATAR_URL_1 || ""
const AVATAR_URL_2 = process.env.AVATAR_URL_2 || ""
const INPUT_CHAT = process.env.INPUT_CHAT !== "false"
const MAX_ROOMS = parseInt(process.env.MAX_ROOMS) || 100
const MAX_MESSAGES_PER_ROOM = parseInt(process.env.MAX_MESSAGES_PER_ROOM) || 500
const SHUTDOWN_TIMEOUT = parseInt(process.env.SHUTDOWN_TIMEOUT_MS) || 10_000

// ===== PROVIDER =====
const provider = createProvider()

// ===== CIRCUIT BREAKERS =====
const llmBreaker = new CircuitBreaker("llm")
const sttBreaker = new CircuitBreaker("stt")
const ttsBreaker = new CircuitBreaker("tts")

// Register breakers with health module so cached health includes circuit breaker state
setCircuitBreakers({ llm: llmBreaker, stt: sttBreaker, tts: ttsBreaker })

// ===== AGENT REGISTRY =====
const registry = new AgentRegistry()

// ===== ROOM MANAGER =====
function buildDefaultAgentsMap() {
  const map = {}
  for (const agent of registry.getAllAgents()) {
    map[agent.id] = { id: agent.id, name: agent.name }
  }
  return map
}

const roomManager = new RoomManager({
  defaultAgents: buildDefaultAgentsMap()
})
// Create the default room so simple deploys work out of the box
roomManager.createRoom({ id: DEFAULT_ROOM_ID, ttlMinutes: 0 }) // never expires

// ===== MEMORY & RAG =====
const MEMORY_ENABLED = process.env.MEMORY_ENABLED !== "false"
const memoryStore = MEMORY_ENABLED ? new MemoryStore({
  storagePath: process.env.MEMORY_STORAGE_PATH || path.join(__dirname, "memory"),
  maxMemories: parseInt(process.env.MEMORY_MAX_MEMORIES) || 1000
}) : null

const knowledgeBase = new KnowledgeBase({
  directory: process.env.KNOWLEDGE_DIRECTORY || path.join(__dirname, "knowledge"),
  indexPath: process.env.KNOWLEDGE_INDEX_PATH || path.join(__dirname, "memory", "kb-index.json"),
  chunkSize: parseInt(process.env.KNOWLEDGE_CHUNK_SIZE) || 500,
  chunkOverlap: parseInt(process.env.KNOWLEDGE_CHUNK_OVERLAP) || 50,
  maxRetrievedChunks: parseInt(process.env.KNOWLEDGE_MAX_CHUNKS) || 3
})

const contextInjector = new ContextInjector({ memoryStore, knowledgeBase })

if (MEMORY_ENABLED) {
  logger.info(memoryStore.getStats(), "Memory system initialized")
}
logger.info(knowledgeBase.getStats(), "Knowledge base initialized")

// ===== EXPRESS + HTTP =====
const app = express()
const server = http.createServer(app)

const corsConfig = getCorsConfig()
const io = new Server(server, {
  cors: corsConfig,
  pingTimeout: SOCKET_PING_TIMEOUT_MS,
  pingInterval: SOCKET_PING_INTERVAL_MS,
  maxHttpBufferSize: MAX_AUDIO_SIZE_BYTES
})

// ===== GLOBAL MIDDLEWARE =====
app.use(getHelmetMiddleware())
app.use(requestId)
app.use(requestLogger)
app.use(express.static(path.join(__dirname, "public")))
app.use(express.json({ limit: JSON_BODY_LIMIT }))

// ===== HEALTH CHECK (unauthenticated) =====
app.get("/api/health", (req, res) => {
  const base = getHealthResponse()
  const mem = process.memoryUsage()
  const health = {
    ...base,
    checks: {
      memory: {
        rss: mem.rss,
        heapUsed: mem.heapUsed,
        heapTotal: mem.heapTotal,
        status: mem.heapUsed < MEMORY_WARNING_THRESHOLD_BYTES ? "ok" : "warning"
      },
      sockets: {
        connected: activeSockets.size,
        status: activeSockets.size < SOCKET_WARNING_THRESHOLD ? "ok" : "warning"
      },
      rooms: {
        active: roomManager.rooms.size,
        max: MAX_ROOMS,
        status: roomManager.rooms.size < MAX_ROOMS ? "ok" : "warning"
      },
      providers: {
        llm: { type: AI_PROVIDER, breaker: llmBreaker.getState().state },
        stt: { type: stt.STT_PROVIDER, breaker: sttBreaker.getState().state },
        tts: { type: tts.TTS_PROVIDER, breaker: ttsBreaker.getState().state }
      }
    }
  }
  const hasWarning = Object.values(health.checks)
    .filter(c => c && typeof c.status === "string")
    .some(c => c.status === "warning")
  const statusCode = base.status === "starting" ? 503 : hasWarning ? 207 : 200
  res.status(statusCode).json(health)
})

// ===== API MIDDLEWARE (rate limit + auth for /api/* routes, after health check) =====
app.use("/api", generalLimiter, apiKeyAuth, requestTimeout())

// ===== ROUTES =====

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")))

// Backwards-compatible routes for old agent1/agent2 URLs
app.get("/agent1", (req, res) => res.redirect("/voice/bob"))
app.get("/agent2", (req, res) => res.redirect("/voice/alice"))

// Dynamic voice page — serves the unified template for any agent
app.get("/voice/:agentId", (req, res) => {
  const agent = registry.getAgent(req.params.agentId)
  if (!agent) return res.status(404).send("Agent not found")
  res.sendFile(path.join(__dirname, "public", "voice.html"))
})

// ===== SOCKET.IO NAMESPACE (defined early so route modules can reference it) =====
const spaceNS = io.of("/space")

// ===== ACTIVE SOCKET TRACKING =====
const activeSockets = new Map()

// ===== METRICS TRACKER =====
const metrics = new MetricsTracker()

// ===== PERSONALITY ROUTES (created early so store is available to agent routes) =====
const personalityRoutes = createPersonalityRoutes()

// ===== MODULAR API ROUTES =====
app.use("/api", responseHelpers)

// Default room provides spaceState for non-room-scoped API endpoints
const defaultRoom = roomManager.getOrCreateRoom(DEFAULT_ROOM_ID)

function broadcastDefaultRoom() {
  spaceNS.to(DEFAULT_ROOM_ID).emit("stateUpdate", {
    agents: defaultRoom.agents,
    currentTurn: defaultRoom.currentTurn,
    turnQueue: defaultRoom.turnQueue
  })
}

const routeDeps = {
  registry, roomManager, DEFAULT_ROOM_ID, provider, spaceNS, tts, AI_PROVIDER, metrics,
  spaceState: defaultRoom,
  broadcastState: broadcastDefaultRoom,
  breakers: { llm: llmBreaker, stt: sttBreaker, tts: ttsBreaker }
}
app.use("/api/agents", createAgentRoutes(routeDeps))
app.use("/api/rooms", createRoomRoutes(routeDeps))
app.use("/api", createSystemRoutes(routeDeps))

// New API routes: agent control, conversations, personalities
app.use("/api/personalities", apiKeyAuth, personalityRoutes)
const controlDeps = {
  registry,
  spaceState: defaultRoom,
  provider,
  spaceNS,
  broadcastState: broadcastDefaultRoom,
  handleLLMResponse: (socket, agentId, text) => handleLLMResponse(socket || spaceNS, defaultRoom, agentId, text),
  personalityStore: personalityRoutes._store,
  metrics
}
app.use("/api/agent", apiKeyAuth, createAgentControlRoutes(controlDeps))
app.use("/api/conversations", apiKeyAuth, createConversationRoutes({ spaceState: defaultRoom }))

// Memory & Knowledge API routes
if (memoryStore) {
  app.use("/api/memory", createMemoryRoutes({ memoryStore }))
}
app.use("/api/knowledge", createKnowledgeRoutes({ knowledgeBase }))
app.use("/api/agents/registry", apiKeyAuth, createRegistryRoutes({ registry, ttsProvider: tts }))

// Start watching config for hot-reload
registry.watchConfig((agents) => {
  // Broadcast updated agent list to all connected clients
  spaceNS.emit("registryUpdated", { agents: registry.getPublicAgents() })
})

// Swagger UI for API documentation
try {
  const swaggerDoc = require("./openapi.json")
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerDoc, {
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "Agent Voice Chat API"
  }))
} catch (err) {
  logger.warn({ err: err.message }, "Failed to load openapi.json for Swagger UI")
}

// ===== LEGACY ROUTES =====

app.get("/config", (req, res) => res.json({
  inputChat: INPUT_CHAT,
  avatarUrl1: AVATAR_URL_1,
  avatarUrl2: AVATAR_URL_2,
  aiProvider: AI_PROVIDER,
  providerType: provider.type,
  ttsMode: tts.TTS_PROVIDER
}))

app.get("/state", (req, res) => {
  const roomId = req.query.room || DEFAULT_ROOM_ID
  const room = roomManager.getRoom(roomId)
  if (!room) return res.status(404).json({ error: "Room not found" })
  res.json({
    roomId: room.id,
    agents: room.agents,
    currentTurn: room.currentTurn,
    messages: room.messages.slice(-MAX_HISTORY_SLICE)
  })
})

// Session endpoint — protected + strict rate limit (creates billable sessions)
app.get("/session/:agentId", apiKeyAuth, sessionLimiter, async (req, res) => {
  const agentId = req.params.agentId
  const agent = registry.getAgent(agentId)
  if (!agent) return res.status(400).json({ error: "Invalid agent ID" })
  if (provider.type !== PROVIDER_TYPES.WEBRTC) return res.json({ type: "socket", provider: AI_PROVIDER })
  try {
    const prompts = registry.getPromptsMap()
    const voices = registry.getVoicesMap()
    const data = await provider.createSession(agentId, prompts, voices)
    logger.info({ agentId }, "Created OpenAI Realtime session")
    res.json(data)
  } catch (error) {
    logger.error({ err: error, agentId }, "Session creation failed")
    res.status(500).json({ error: "Failed to create session" })
  }
})

// ===== NOT FOUND (unmatched /api routes answer JSON; everything else keeps Express's default 404) =====
const { AppError, ERROR_CODES } = require("./src/server/errors")
const { notFound } = require("./src/server/middleware/not-found")

app.use("/api", notFound)

// ===== GLOBAL ERROR HANDLER =====

app.use((err, req, res, _next) => {
  if (err instanceof AppError) {
    logger.warn({ err: err.message, code: err.code, requestId: req.id, path: req.path }, "Application error")
    return res.status(err.httpStatus).json({
      ok: false,
      error: { code: err.code, message: err.message, requestId: req.id }
    })
  }

  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      ok: false,
      error: { code: ERROR_CODES.VALIDATION_ERROR, message: "Invalid JSON in request body", requestId: req.id }
    })
  }

  logger.error({ err, requestId: req.id, path: req.path, method: req.method }, "Unhandled route error")
  res.status(500).json({
    ok: false,
    error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An unexpected error occurred", requestId: req.id }
  })
})

// ============================================================
// VOICE CHAT — Socket.IO handlers
// ============================================================

// Apply Socket.IO auth middleware
spaceNS.use(socketAuth)

// Socket.IO rate limiter
const socketLimiter = createSocketRateLimiter()

// Track in-flight LLM responses for graceful shutdown (Map: requestId → startTime)
const inFlightRequests = new Map()
const IN_FLIGHT_MAX_TTL_MS = parseInt(process.env.IN_FLIGHT_MAX_TTL_MS) || 5 * 60_000 // 5 minutes

// Periodic cleanup of stale in-flight entries that leaked past the finally block
const inFlightCleanupInterval = setInterval(() => {
  const now = Date.now()
  for (const [id, startTime] of inFlightRequests) {
    if (now - startTime > IN_FLIGHT_MAX_TTL_MS) {
      logger.warn({ requestId: id, ageMs: now - startTime }, "Cleaning up stale in-flight request")
      inFlightRequests.delete(id)
    }
  }
}, 60_000)
inFlightCleanupInterval.unref()

// Concurrency gate for background memory extractions
const MAX_CONCURRENT_EXTRACTIONS = parseInt(process.env.MAX_CONCURRENT_EXTRACTIONS, 10) || 3
let activeExtractions = 0

// ── Audio processing queue (backpressure) ──
const MAX_CONCURRENT_STT = parseInt(process.env.MAX_CONCURRENT_STT, 10) || 3
const AUDIO_QUEUE_MAX = parseInt(process.env.AUDIO_QUEUE_MAX, 10) || 20
let activeSttCount = 0
const audioQueue = []

function drainAudioQueue() {
  while (audioQueue.length > 0 && activeSttCount < MAX_CONCURRENT_STT) {
    const task = audioQueue.shift()
    activeSttCount++
    task().finally(() => {
      activeSttCount--
      drainAudioQueue()
    })
  }
}

function isWallet(str) {
  return str && str.length >= 32 && /^[a-zA-Z0-9]+$/.test(str)
}

function shortenNick(name) {
  if (isWallet(name)) return name.slice(0, 4) + "..." + name.slice(-4)
  return name
}

// ===== Room-scoped helpers =====

function broadcastState(room) {
  spaceNS.to(room.id).emit("stateUpdate", {
    agents: room.agents,
    currentTurn: room.currentTurn,
    turnQueue: room.turnQueue
  })
}

function requestTurn(room, agentId) {
  return createTurnManager(
    room,
    {
      broadcast: () => broadcastState(room),
      grantTurn: (id) => spaceNS.to(room.id).emit("turnGranted", { agentId: id })
    }
  ).requestTurn(agentId)
}

function releaseTurn(room, agentId) {
  createTurnManager(
    room,
    {
      broadcast: () => broadcastState(room),
      grantTurn: (id) => spaceNS.to(room.id).emit("turnGranted", { agentId: id })
    }
  ).releaseTurn(agentId)
}

/**
 * Extract speaker name from structured chat text.
 * Supports both legacy "[CHAT - nickname]: msg" and new "[USER_MESSAGE speaker="nickname"]" formats.
 */
function extractSpeaker(text) {
  // New structured format
  const structured = text.match(/\[USER_MESSAGE\s+speaker="([^"]+)"\]/)
  if (structured) return structured[1].trim()
  // Legacy format (for backward compatibility)
  const legacy = text.match(/\[CHAT\s*-\s*([^\]]+)\]/)
  return legacy ? legacy[1].trim() : null
}

async function handleLLMResponse(socket, room, agentId, userText) {
  const requestId = randomUUID()
  inFlightRequests.set(requestId, Date.now())

  requestTurn(room, agentId)
  const messageId = requestId
  const agentName = room.agents[agentId]?.name
  roomManager.touchRoom(room.id)

  spaceNS.to(room.id).emit("agentStatus", { agentId, status: "speaking", name: agentName })
  if (room.agents[agentId]) room.agents[agentId].status = "speaking"
  broadcastState(room)

  let systemPrompt = registry.getSystemPrompt(agentId)
  const voice = registry.getVoice(agentId)

  // ── Memory & RAG context injection ──
  const speaker = extractSpeaker(userText)
  try {
    const context = await contextInjector.getContext({
      userText,
      speaker,
      roomId: room.id
    })
    if (context) {
      systemPrompt += context
    }
  } catch (err) {
    logger.warn({ err: err.message }, "Context injection failed, proceeding without augmentation")
  }

  // Record user interaction for profile tracking
  if (MEMORY_ENABLED && memoryStore && speaker) {
    memoryStore.recordInteraction(speaker)
  }

  let fullText = ""
  const streamTimeoutMs = parseInt(process.env.STREAM_TIMEOUT_MS) || DEFAULT_STREAM_TIMEOUT_MS
  const ac = new AbortController()
  const streamTimer = setTimeout(() => ac.abort(), streamTimeoutMs)

  try {
    logger.info({ agentId, roomId: room.id, userText: safeMessage(userText) }, "LLM request started")
    await llmBreaker.execute(async () => {
      for await (const delta of provider.streamResponse(agentId, userText, systemPrompt, room.id)) {
        if (ac.signal.aborted) throw new Error("Stream timeout — provider took too long to respond")
        fullText += delta
        spaceNS.to(room.id).emit("textDelta", { agentId, delta, messageId, name: agentName })
      }
    })
    logger.info({ agentId, roomId: room.id, responseLength: fullText.length }, "LLM response complete")

    const msg = { id: messageId, agentId, name: agentName, text: fullText, timestamp: Date.now() }
    pushMessage(room, msg)
    spaceNS.to(room.id).emit("textComplete", msg)

    // ── Memory extraction (async, non-blocking, concurrency-limited) ──
    if (MEMORY_ENABLED && memoryStore && isExtractable(userText)) {
      if (activeExtractions >= MAX_CONCURRENT_EXTRACTIONS) {
        logger.debug({ activeExtractions }, "Memory extraction skipped: concurrency limit reached")
      } else {
        const speakerName = speaker || "User"
        activeExtractions++
        extractFacts({ speaker: speakerName, text: userText, response: fullText })
          .then(async (facts) => {
            if (facts.length === 0) return
            // Store as episodic memories
            for (const fact of facts) {
              await memoryStore.addMemory({
                type: "episodic",
                content: fact,
                speaker: speakerName,
                roomId: room.id
              })
            }
            // Update user profile with extracted facts
            if (speakerName !== "User") {
              memoryStore.addUserFacts(speakerName, facts)
            }
            logger.debug({ speaker: speakerName, facts: facts.length }, "Memories extracted from exchange")
          })
          .catch(err => logger.warn({ err: err.message }, "Background memory extraction failed"))
          .finally(() => { activeExtractions-- })
      }
    }

    try {
      const audioBuffer = await ttsBreaker.execute(() =>
        withRetry(() => tts.synthesize(fullText, agentId, voice), { maxRetries: 2 })
      )
      if (audioBuffer) {
        logger.debug({ agentId, audioSize: audioBuffer.length }, "TTS synthesis complete")
        socket.emit("ttsAudio", { agentId, audio: audioBuffer.toString("base64"), format: "mp3" })
      } else {
        socket.emit("ttsBrowser", { agentId, text: fullText })
      }
    } catch (ttsErr) {
      const ttsErrData = ttsErr.response?.data
      const ttsErrMsg = Buffer.isBuffer(ttsErrData) ? ttsErrData.toString("utf8") : (ttsErrData || ttsErr.message)
      logger.error({ err: ttsErrMsg, agentId }, "TTS error")
      socket.emit("ttsBrowser", { agentId, text: fullText })
    }
  } catch (err) {
    logger.error({ err: err.message, agentId, provider: AI_PROVIDER }, "LLM error")
  } finally {
    clearTimeout(streamTimer)
    inFlightRequests.delete(requestId)
    if (room.agents[agentId]) room.agents[agentId].status = "idle"
    spaceNS.to(room.id).emit("agentStatus", { agentId, status: "idle", name: agentName })
    releaseTurn(room, agentId)
  }
}

// ===== DEAD SOCKET CLEANUP =====
const STALE_SOCKET_THRESHOLD_MS = parseInt(process.env.STALE_SOCKET_THRESHOLD_MS, 10) || 10 * 60_000 // 10 min
const staleSocketInterval = setInterval(() => {
  const now = Date.now()
  for (const [socketId, meta] of activeSockets) {
    if (now - meta.lastActivity > STALE_SOCKET_THRESHOLD_MS) {
      const socket = spaceNS.sockets.get(socketId)
      if (socket) {
        logger.warn({ socketId, idleMs: now - meta.lastActivity }, "Disconnecting stale socket")
        socket.disconnect(true)
      }
      activeSockets.delete(socketId)
    }
  }
}, 5 * 60_000)
staleSocketInterval.unref()

// ===== MESSAGE TRIMMING HELPER =====
function pushMessage(room, msg) {
  room.messages.push(msg)
  // Enforce max messages per room to prevent unbounded memory growth
  if (room.messages.length > MAX_MESSAGES_PER_ROOM) {
    room.messages.splice(0, room.messages.length - MAX_MESSAGES_PER_ROOM)
  }
}

// ===== Socket.IO connection handler =====

spaceNS.on("connection", (socket) => {
  logger.info({ socketId: socket.id }, "Client connected")
  let currentRoom = null

  // Track socket metadata for stale-socket cleanup and health reporting
  activeSockets.set(socket.id, {
    connectedAt: Date.now(),
    lastActivity: Date.now(),
    roomId: null,
    nickname: null
  })

  // Update last activity on any incoming event
  socket.onAny(() => {
    const meta = activeSockets.get(socket.id)
    if (meta) meta.lastActivity = Date.now()
  })

  // Client must join a room before doing anything else
  socket.on("joinRoom", (data, ack) => {
    const v = validateSocketEvent(JoinRoomSchema, data)
    if (!v.ok) {
      socket.emit("error", v.error)
      if (typeof ack === "function") ack({ ok: false, ...v.error })
      return
    }
    const targetRoomId = v.data.roomId || DEFAULT_ROOM_ID

    // Enforce MAX_ROOMS cap — reject if creating a new room would exceed limit
    if (!roomManager.getRoom(targetRoomId) && roomManager.rooms.size >= MAX_ROOMS) {
      logger.warn({ socketId: socket.id, roomId: targetRoomId, maxRooms: MAX_ROOMS }, "Room cap reached")
      const err = { message: "Server room limit reached. Try again later.", code: "ROOM_LIMIT" }
      socket.emit("error", err)
      if (typeof ack === "function") ack({ ok: false, ...err })
      return
    }

    const room = roomManager.getOrCreateRoom(targetRoomId)

    // Leave previous room if any
    if (currentRoom && currentRoom.id !== room.id) {
      socket.leave(currentRoom.id)
      roomManager.removeClient(currentRoom.id, socket.id)
      // Clean up agent state in old room
      for (const id in currentRoom.agents) {
        if (currentRoom.agents[id].socketId === socket.id) {
          currentRoom.agents[id].connected = false
          currentRoom.agents[id].status = "offline"
          currentRoom.agents[id].socketId = null
          if (currentRoom.currentTurn === id) releaseTurn(currentRoom, id)
          currentRoom.turnQueue = currentRoom.turnQueue.filter(aid => aid !== id)
        }
      }
      broadcastState(currentRoom)
    }

    // Join new room
    socket.join(room.id)
    roomManager.addClient(room.id, socket.id)
    currentRoom = room

    // Update socket metadata
    const socketMeta = activeSockets.get(socket.id)
    if (socketMeta) {
      socketMeta.roomId = room.id
      if (v.data.nickname) socketMeta.nickname = v.data.nickname
    }

    logger.info({ socketId: socket.id, roomId: room.id }, "Joined room")

    // Send initial state for this room
    const roomState = {
      roomId: room.id,
      agents: room.agents,
      currentTurn: room.currentTurn,
      turnQueue: room.turnQueue
    }
    socket.emit("roomJoined", { roomId: room.id })
    socket.emit("stateUpdate", {
      agents: room.agents,
      currentTurn: room.currentTurn,
      turnQueue: room.turnQueue
    })
    socket.emit("messageHistory", room.messages.slice(-MAX_HISTORY_SLICE))

    // Acknowledge success if client used callback pattern
    if (typeof ack === "function") ack({ ok: true, room: roomState })
  })

  socket.on("agentConnect", (data, ack) => {
    if (!currentRoom) return
    const v = validateSocketEvent(AgentConnectSchema, data)
    if (!v.ok) { socket.emit("error", v.error); return }
    const { agentId } = v.data
    if (!validateAgentId(registry, agentId)) {
      logger.warn({ agentId, socketId: socket.id }, "Rejected connection for unknown agent ID")
      socket.emit("error", { message: "Unknown agent ID", code: "VALIDATION_ERROR" })
      return
    }
    // If agent is registered but not yet in room state, add it
    if (!currentRoom.agents[agentId] && registry.getAgent(agentId)) {
      const agent = registry.getAgent(agentId)
      currentRoom.agents[agentId] = { id: agent.id, name: agent.name, status: "offline", connected: false, socketId: null }
    }
    if (currentRoom.agents[agentId]) {
      currentRoom.agents[agentId].connected = true
      currentRoom.agents[agentId].status = "idle"
      currentRoom.agents[agentId].socketId = socket.id
      logger.info({ agentId, name: currentRoom.agents[agentId].name, roomId: currentRoom.id }, "Agent connected")
      broadcastState(currentRoom)
    }
    if (typeof ack === "function") ack({ ok: true, agentId })
  })

  socket.on("agentDisconnect", (data) => {
    if (!currentRoom) return
    const v = validateSocketEvent(AgentDisconnectSchema, data)
    if (!v.ok) { socket.emit("error", v.error); return }
    const { agentId } = v.data
    if (currentRoom.agents[agentId]) {
      currentRoom.agents[agentId].connected = false
      currentRoom.agents[agentId].status = "offline"
      currentRoom.agents[agentId].socketId = null
      if (currentRoom.currentTurn === agentId) releaseTurn(currentRoom, agentId)
      currentRoom.turnQueue = currentRoom.turnQueue.filter(id => id !== agentId)
      logger.info({ agentId, roomId: currentRoom.id }, "Agent disconnected")
      broadcastState(currentRoom)
    }
  })

  socket.on("statusChange", (data) => {
    if (!currentRoom) return
    const v = validateSocketEvent(StatusChangeSchema, data)
    if (!v.ok) { socket.emit("error", v.error); return }
    const { agentId, status } = v.data
    if (currentRoom.agents[agentId]) {
      currentRoom.agents[agentId].status = status
      spaceNS.to(currentRoom.id).emit("agentStatus", { agentId, status, name: currentRoom.agents[agentId].name })
      broadcastState(currentRoom)
    }
  })

  socket.on("requestTurn", (data) => {
    if (!currentRoom) return
    const v = validateSocketEvent(RequestTurnSchema, data)
    if (!v.ok) { socket.emit("error", v.error); return }
    const granted = requestTurn(currentRoom, v.data.agentId)
    socket.emit("turnResponse", { granted, currentTurn: currentRoom.currentTurn })
  })

  socket.on("releaseTurn", (data) => {
    if (!currentRoom) return
    const v = validateSocketEvent(ReleaseTurnSchema, data)
    if (!v.ok) { socket.emit("error", v.error); return }
    releaseTurn(currentRoom, v.data.agentId)
  })

  socket.on("textDelta", (data) => {
    if (!currentRoom) return
    const v = validateSocketEvent(TextDeltaSchema, data)
    if (!v.ok) { socket.emit("error", v.error); return }
    const { agentId, delta, messageId } = v.data
    spaceNS.to(currentRoom.id).emit("textDelta", { agentId, delta, messageId, name: currentRoom.agents[agentId]?.name })
  })

  socket.on("textComplete", (data) => {
    if (!currentRoom) return
    const v = validateSocketEvent(TextCompleteSchema, data)
    if (!v.ok) { socket.emit("error", v.error); return }
    const { agentId, text, messageId } = v.data
    const msg = {
      id: messageId,
      agentId,
      name: currentRoom.agents[agentId]?.name,
      text,
      timestamp: Date.now()
    }
    pushMessage(currentRoom, msg)
    spaceNS.to(currentRoom.id).emit("textComplete", msg)
    roomManager.touchRoom(currentRoom.id)
  })

  socket.on("audioData", async ({ agentId, audio, mimeType }) => {
    if (!currentRoom) return
    // Rate limit: max 10 audio events per minute per socket
    if (socketLimiter.check(socket.id, "audioData", SOCKET_AUDIO_RATE_LIMIT)) {
      logger.warn({ socketId: socket.id }, "Audio data rate limited")
      socket.emit("error", { message: "Too many audio events. Please slow down.", code: "RATE_LIMITED" })
      return
    }
    if (provider.type === PROVIDER_TYPES.WEBRTC) return
    // Validate agent ID
    if (!validateAgentId(registry, agentId)) {
      socket.emit("error", { message: "Unknown agent ID" })
      return
    }
    // Check audio size
    if (audio && Buffer.byteLength(audio, "base64") > MAX_AUDIO_SIZE_BYTES) {
      logger.warn({ socketId: socket.id, agentId }, "Audio data too large, rejected")
      socket.emit("error", { message: "Audio data exceeds 5MB limit" })
      return
    }
    try {
      spaceNS.to(currentRoom.id).emit("agentStatus", { agentId, status: "listening", name: currentRoom.agents[agentId]?.name })
      if (currentRoom.agents[agentId]) currentRoom.agents[agentId].status = "listening"
      broadcastState(currentRoom)

      const audioBuffer = Buffer.from(audio, "base64")
      const { text } = await sttBreaker.execute(() =>
        withRetry(() => stt.transcribe(audioBuffer, mimeType || "audio/webm"), { maxRetries: 2 })
      )

      if (!text?.trim()) {
        if (currentRoom.agents[agentId]) currentRoom.agents[agentId].status = "idle"
        spaceNS.to(currentRoom.id).emit("agentStatus", { agentId, status: "idle", name: currentRoom.agents[agentId]?.name })
        broadcastState(currentRoom)
        return
      }

      logger.debug({ agentId, roomId: currentRoom.id, text: safeMessage(text) }, "STT transcription")
      const userMsg = { id: randomUUID(), agentId: -1, name: "User (voice)", text, timestamp: Date.now(), isUser: true }
      pushMessage(currentRoom, userMsg)
      spaceNS.to(currentRoom.id).emit("textComplete", userMsg)
      await handleLLMResponse(socket, currentRoom, agentId, text)
    } catch (err) {
      logger.error({ err: err.message, agentId, roomId: currentRoom.id }, "Audio pipeline error")
      if (currentRoom.agents[agentId]) currentRoom.agents[agentId].status = "idle"
      spaceNS.to(currentRoom.id).emit("agentStatus", { agentId, status: "idle", name: currentRoom.agents[agentId]?.name })
      broadcastState(currentRoom)
    }
  })

  socket.on("userMessage", ({ text, from }) => {
    if (!currentRoom) return
    // Rate limit: max 30 user messages per minute per socket
    if (socketLimiter.check(socket.id, "userMessage", SOCKET_MESSAGE_RATE_LIMIT)) {
      logger.warn({ socketId: socket.id }, "User message rate limited")
      socket.emit("error", { message: "Too many messages. Please slow down.", code: "RATE_LIMITED" })
      return
    }
    // Sanitize input
    const cleanText = sanitizeMessage(text)
    if (!cleanText) return
    const cleanFrom = sanitizeMessage(from || "").slice(0, MAX_DISPLAY_NAME_LENGTH) || "User"

    const msg = { id: randomUUID(), agentId: -1, name: cleanFrom, text: cleanText, timestamp: Date.now(), isUser: true }
    pushMessage(currentRoom, msg)
    spaceNS.to(currentRoom.id).emit("userMessage", msg)
    spaceNS.to(currentRoom.id).emit("textComplete", msg)
    roomManager.touchRoom(currentRoom.id)
    // Send to first registered agent — skip if none available
    const firstAgent = registry.getAllAgents()[0]
    if (!firstAgent) {
      socket.emit("error", { message: "No agents available", code: "NO_AGENTS" })
      return
    }
    if (provider.type === PROVIDER_TYPES.SOCKET) {
      handleLLMResponse(socket, currentRoom, firstAgent.id, formatChatForLLM(shortenNick(cleanFrom), cleanText))
    } else {
      spaceNS.to(currentRoom.id).emit("textToAgent", { text: cleanText, from: shortenNick(cleanFrom) })
    }
  })

  socket.on("textToAgentDirect", async ({ agentId, text, from }) => {
    if (!currentRoom) return
    if (provider.type === PROVIDER_TYPES.WEBRTC) return
    // Validate agent ID
    if (!validateAgentId(registry, agentId)) {
      socket.emit("error", { message: "Unknown agent ID" })
      return
    }
    const cleanText = sanitizeMessage(text)
    if (!cleanText) return
    const cleanFrom = from ? sanitizeMessage(from).slice(0, MAX_DISPLAY_NAME_LENGTH) : ""
    const chatText = cleanFrom ? formatChatForLLM(shortenNick(cleanFrom), cleanText) : cleanText
    await handleLLMResponse(socket, currentRoom, agentId, chatText)
  })

  socket.on("audioLevel", ({ agentId, level }) => {
    if (!currentRoom) return
    spaceNS.to(currentRoom.id).emit("audioLevel", { agentId, level })
  })

  socket.on("disconnect", () => {
    if (currentRoom) {
      for (const id in currentRoom.agents) {
        if (currentRoom.agents[id].socketId === socket.id) {
          currentRoom.agents[id].connected = false
          currentRoom.agents[id].status = "offline"
          currentRoom.agents[id].socketId = null
          if (currentRoom.currentTurn === id) releaseTurn(currentRoom, id)
          currentRoom.turnQueue = currentRoom.turnQueue.filter(aid => aid !== id)
        }
      }
      broadcastState(currentRoom)
      roomManager.removeClient(currentRoom.id, socket.id)
    }
    socketLimiter.cleanup(socket.id)
    activeSockets.delete(socket.id)
    logger.info({ socketId: socket.id }, "Client disconnected")
  })
})

// ============================================================
// GRACEFUL SHUTDOWN
// ============================================================
async function drainInFlight(timeoutMs) {
  if (inFlightRequests.size === 0) return
  logger.info({ count: inFlightRequests.size }, "Waiting for in-flight requests to complete")
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      logger.warn({ remaining: inFlightRequests.size }, "Shutdown timeout — forcing exit")
      resolve()
    }, timeoutMs)

    const check = setInterval(() => {
      if (inFlightRequests.size === 0) {
        clearInterval(check)
        clearTimeout(timeout)
        resolve()
      }
    }, 100)
  })
}

let isShuttingDown = false

async function shutdown(signal) {
  if (isShuttingDown) return
  isShuttingDown = true

  logger.info({ signal }, "Shutting down...")

  // Force exit after timeout as a safety net
  const forceTimer = setTimeout(() => {
    logger.error("Forced shutdown after timeout")
    process.exit(1)
  }, SHUTDOWN_TIMEOUT + 2000)
  forceTimer.unref()

  // 1. Stop health checks & cleanup intervals
  stopHealthChecks()
  clearInterval(staleSocketInterval)
  clearInterval(inFlightCleanupInterval)
  socketLimiter.stopCleanup()

  // 2. Stop accepting new connections
  server.close(() => {
    logger.info("HTTP server closed")
  })

  // 3. Notify all connected clients before disconnecting
  spaceNS.emit("serverShutdown", { message: "Server is shutting down", reconnectIn: 5000, signal })
  logger.info({ connectedSockets: activeSockets.size }, "Notified clients of shutdown")

  // 4. Wait for in-flight LLM responses to complete
  await drainInFlight(SHUTDOWN_TIMEOUT)

  // 5. Flush memory store to disk
  if (memoryStore) {
    try {
      await memoryStore.flush()
      logger.info("Memory store flushed")
    } catch (err) {
      logger.error({ err: err.message }, "Failed to flush memory store")
    }
  }

  // 6. Close knowledge base
  if (knowledgeBase && typeof knowledgeBase.close === "function") {
    try {
      await knowledgeBase.close()
      logger.info("Knowledge base closed")
    } catch (err) {
      logger.error({ err: err.message }, "Failed to close knowledge base")
    }
  }

  // 7. Close Socket.IO connections
  io.close()
  logger.info("Socket.IO connections closed")

  logger.info("Shutdown complete")
  process.exit(0)
}

process.on("SIGTERM", () => shutdown("SIGTERM"))
process.on("SIGINT", () => shutdown("SIGINT"))

process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught exception")
  shutdown("uncaughtException")
})

process.on("unhandledRejection", (reason) => {
  logger.fatal({ reason: reason instanceof Error ? reason.message : reason }, "Unhandled rejection")
  // Log but don't exit — allows in-flight work to complete
})

// ============================================================
// START SERVER
// ============================================================
// Helper to redact secrets for startup logging
function redactKey(val) {
  if (!val || typeof val !== "string") return "[unset]"
  if (val.length <= 8) return "***"
  return val.slice(0, 4) + "..." + val.slice(-4)
}

server.once("error", (err) => {
  logger.fatal({ err, port: PORT, code: err.code }, err.code === "EADDRINUSE"
    ? `Port ${PORT} is already in use. Set PORT to a free port.`
    : "HTTP server failed to start")
  process.exit(1)
})

server.listen(PORT, () => {
  logAuthStatus()
  startHealthChecks()

  // Log resolved config at startup (secrets redacted)
  logger.info({
    port: PORT,
    nodeEnv: process.env.NODE_ENV || "development",
    provider: AI_PROVIDER,
    providerMode: provider.type,
    sttProvider: stt.STT_PROVIDER,
    ttsProvider: tts.TTS_PROVIDER,
    maxRooms: MAX_ROOMS,
    maxMessagesPerRoom: MAX_MESSAGES_PER_ROOM,
    shutdownTimeoutMs: SHUTDOWN_TIMEOUT,
    memoryEnabled: MEMORY_ENABLED,
    apiKey: redactKey(process.env.API_KEY),
    openaiKey: redactKey(process.env.OPENAI_API_KEY),
    anthropicKey: redactKey(process.env.ANTHROPIC_API_KEY),
    groqKey: redactKey(process.env.GROQ_API_KEY)
  }, "Resolved configuration")

  const agents = registry.getAllAgents()
  logger.info({ port: PORT, url: `http://localhost:${PORT}` }, "Server started")
  agents.forEach(a => {
    logger.info({ agent: a.name, url: `http://localhost:${PORT}/voice/${a.id}` }, "Agent route")
  })
  logger.info({
    provider: AI_PROVIDER,
    mode: provider.type,
    agents: agents.map(a => a.name),
    nodeEnv: process.env.NODE_ENV || "development"
  }, "Server ready")
})
