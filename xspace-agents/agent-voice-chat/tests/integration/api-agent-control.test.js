// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 nirholas (https://github.com/nirholas/xspace-agent)

import request from "supertest"
import createAgentControlRoutes from "../../src/server/routes/agent-control.js"
import { createTestApp } from "../helpers/create-test-app.js"

function createSpaceState(overrides = {}) {
  return {
    agents: {
      bob: { id: "bob", name: "Bob", status: "idle", connected: true, muted: false },
      alice: { id: "alice", name: "Alice", status: "offline", connected: false, muted: false }
    },
    messages: [],
    currentTurn: null,
    turnQueue: [],
    isProcessing: false,
    spaceUrl: null,
    ...overrides
  }
}

describe("Agent Control API routes", () => {
  let app, registry, spaceNS, provider, spaceState, broadcastState, handleLLMResponse, ctx

  beforeEach(() => {
    ctx = createTestApp()
    app = ctx.app
    registry = ctx.registry
    spaceNS = ctx.spaceNS
    provider = ctx.provider

    spaceState = createSpaceState()
    broadcastState = vi.fn()
    handleLLMResponse = vi.fn().mockResolvedValue(undefined)

    const agentControlRouter = createAgentControlRoutes({
      registry,
      spaceState,
      provider,
      spaceNS,
      broadcastState,
      handleLLMResponse
    })
    app.use("/api/agent", agentControlRouter)
  })

  afterEach(() => {
    ctx.roomManager.destroy()
  })

  // ── Lifecycle ────────────────────────────────────────────────

  describe("POST /api/agent/start", () => {
    it("returns launching status with a session id", async () => {
      const res = await request(app).post("/api/agent/start").send({})
      expect(res.status).toBe(200)
      expect(res.body.status).toBe("launching")
      expect(res.body.sessionId).toBeDefined()
      expect(broadcastState).toHaveBeenCalled()
    })

    it("accepts headless flag", async () => {
      const res = await request(app).post("/api/agent/start").send({ headless: true })
      expect(res.status).toBe(200)
      expect(res.body.headless).toBe(true)
    })
  })

  describe("POST /api/agent/join", () => {
    it("returns joining status with spaceUrl", async () => {
      const res = await request(app)
        .post("/api/agent/join")
        .send({ spaceUrl: "https://twitter.com/i/spaces/abc123" })
      expect(res.status).toBe(200)
      expect(res.body.status).toBe("joining")
      expect(res.body.spaceUrl).toBe("https://twitter.com/i/spaces/abc123")
    })

    it("returns 400 when spaceUrl is missing", async () => {
      const res = await request(app).post("/api/agent/join").send({})
      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe("VALIDATION_ERROR")
    })

    it("returns 404 when a specified agentId does not exist", async () => {
      const res = await request(app)
        .post("/api/agent/join")
        .send({ spaceUrl: "https://twitter.com/i/spaces/abc", agents: [{ id: "ghost" }] })
      expect(res.status).toBe(404)
      expect(res.body.error.code).toBe("NOT_FOUND")
    })
  })

  describe("POST /api/agent/leave", () => {
    it("returns disconnected status", async () => {
      const res = await request(app).post("/api/agent/leave").send()
      expect(res.status).toBe(200)
      expect(res.body.status).toBe("disconnected")
      expect(broadcastState).toHaveBeenCalled()
    })
  })

  describe("POST /api/agent/stop", () => {
    it("returns stopped status", async () => {
      const res = await request(app).post("/api/agent/stop").send()
      expect(res.status).toBe(200)
      expect(res.body.status).toBe("stopped")
    })
  })

  describe("GET /api/agent/status", () => {
    it("returns overall system status with agent list", async () => {
      const res = await request(app).get("/api/agent/status")
      expect(res.status).toBe(200)
      expect(res.body.status).toBe("idle")
      expect(Array.isArray(res.body.agents)).toBe(true)
      expect(res.body.agents.length).toBeGreaterThanOrEqual(2)
      expect(res.body.uptime).toBeGreaterThanOrEqual(0)
    })

    it("reports processing status when a turn is active", async () => {
      spaceState.isProcessing = true
      const res = await request(app).get("/api/agent/status")
      expect(res.status).toBe(200)
      expect(res.body.status).toBe("processing")
    })
  })

  // ── Say ──────────────────────────────────────────────────────

  describe("POST /api/agent/:id/say", () => {
    it("queues the text and returns queued:true", async () => {
      const res = await request(app)
        .post("/api/agent/bob/say")
        .send({ text: "Hello world" })
      expect(res.status).toBe(200)
      expect(res.body.queued).toBe(true)
      expect(handleLLMResponse).toHaveBeenCalledWith(null, "bob", "Hello world")
    })

    it("returns 404 for a non-existent agent", async () => {
      const res = await request(app)
        .post("/api/agent/ghost/say")
        .send({ text: "Hello" })
      expect(res.status).toBe(404)
      expect(res.body.error.code).toBe("NOT_FOUND")
    })

    it("returns 400 when text is empty", async () => {
      const res = await request(app)
        .post("/api/agent/bob/say")
        .send({ text: "" })
      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe("VALIDATION_ERROR")
    })

    it("returns 400 when text is missing", async () => {
      const res = await request(app)
        .post("/api/agent/bob/say")
        .send({})
      expect(res.status).toBe(400)
    })

    it("returns 400 when the agent is muted", async () => {
      spaceState.agents.bob.muted = true
      const res = await request(app)
        .post("/api/agent/bob/say")
        .send({ text: "Should not say this" })
      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe("AGENT_MUTED")
    })

    it("returns 400 for WebRTC provider", async () => {
      provider.type = "webrtc"
      const res = await request(app)
        .post("/api/agent/bob/say")
        .send({ text: "Hello" })
      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe("UNSUPPORTED")
      provider.type = "socket" // restore
    })

    it("reports an LLM failure as a 500 instead of claiming the message was queued", async () => {
      handleLLMResponse.mockRejectedValue(new Error("LLM exploded"))
      const res = await request(app)
        .post("/api/agent/bob/say")
        .send({ text: "Trigger error" })
      // The route awaits the LLM pipeline (it answers completed: true on success), so a
      // failure must surface to the caller rather than be reported as queued.
      expect(res.status).toBe(500)
      expect(res.body.error.code).toBe("LLM_ERROR")
      expect(res.body.error.message).toContain("LLM exploded")
      expect(res.body.queued).toBeUndefined()
    })
  })

  // ── Prompt ───────────────────────────────────────────────────

  describe("POST /api/agent/:id/prompt", () => {
    it("updates the agent system prompt", async () => {
      const res = await request(app)
        .post("/api/agent/bob/prompt")
        .send({ systemPrompt: "You are a helpful assistant." })
      expect(res.status).toBe(200)
      expect(res.body.updated).toBe(true)
    })

    it("returns 404 for a non-existent agent", async () => {
      const res = await request(app)
        .post("/api/agent/ghost/prompt")
        .send({ systemPrompt: "Any prompt" })
      expect(res.status).toBe(404)
    })

    it("returns 400 when systemPrompt is empty", async () => {
      const res = await request(app)
        .post("/api/agent/bob/prompt")
        .send({ systemPrompt: "" })
      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe("VALIDATION_ERROR")
    })
  })

  // ── Mute / Unmute ────────────────────────────────────────────

  describe("POST /api/agent/:id/mute", () => {
    it("mutes an active agent", async () => {
      const res = await request(app).post("/api/agent/bob/mute").send()
      expect(res.status).toBe(200)
      expect(res.body.muted).toBe(true)
      expect(spaceState.agents.bob.muted).toBe(true)
      expect(broadcastState).toHaveBeenCalled()
    })

    it("returns 404 for a non-existent agent", async () => {
      const res = await request(app).post("/api/agent/ghost/mute").send()
      expect(res.status).toBe(404)
      expect(res.body.error.code).toBe("NOT_FOUND")
    })

    it("successfully mutes an already-muted agent", async () => {
      spaceState.agents.bob.muted = true
      const res = await request(app).post("/api/agent/bob/mute").send()
      expect(res.status).toBe(200)
      expect(res.body.muted).toBe(true)
    })
  })

  describe("POST /api/agent/:id/unmute", () => {
    it("unmutes a muted agent", async () => {
      spaceState.agents.bob.muted = true
      const res = await request(app).post("/api/agent/bob/unmute").send()
      expect(res.status).toBe(200)
      expect(res.body.muted).toBe(false)
      expect(spaceState.agents.bob.muted).toBe(false)
    })

    it("returns 404 for a non-existent agent", async () => {
      const res = await request(app).post("/api/agent/ghost/unmute").send()
      expect(res.status).toBe(404)
      expect(res.body.error.code).toBe("NOT_FOUND")
    })

    it("successfully unmutes an already-unmuted agent", async () => {
      const res = await request(app).post("/api/agent/bob/unmute").send()
      expect(res.status).toBe(200)
      expect(res.body.muted).toBe(false)
    })
  })

  // ── History ──────────────────────────────────────────────────

  describe("GET /api/agent/:id/history", () => {
    beforeEach(() => {
      spaceState.messages = [
        { id: "m1", agentId: "bob", text: "Hello", timestamp: Date.now() },
        { id: "m2", agentId: -1, text: "Broadcast", timestamp: Date.now() },
        { id: "m3", agentId: "alice", text: "World", timestamp: Date.now() },
        { id: "m4", agentId: "bob", text: "Goodbye", timestamp: Date.now() }
      ]
    })

    it("returns message history for the agent (includes agent and broadcast messages)", async () => {
      const res = await request(app).get("/api/agent/bob/history")
      expect(res.status).toBe(200)
      expect(res.body.messages).toBeDefined()
      // bob + broadcast messages (agentId === "bob" or agentId === -1)
      expect(res.body.messages.length).toBe(3)
      expect(res.body.total).toBe(3)
    })

    it("respects the limit query parameter", async () => {
      const res = await request(app).get("/api/agent/bob/history?limit=1")
      expect(res.status).toBe(200)
      expect(res.body.messages.length).toBe(1)
    })

    it("caps limit at 100", async () => {
      const res = await request(app).get("/api/agent/bob/history?limit=999")
      expect(res.status).toBe(200)
      expect(res.body.messages.length).toBeLessThanOrEqual(100)
    })

    it("returns 404 for a non-existent agent", async () => {
      const res = await request(app).get("/api/agent/ghost/history")
      expect(res.status).toBe(404)
      expect(res.body.error.code).toBe("NOT_FOUND")
    })
  })

  // ── Delete History ───────────────────────────────────────────

  describe("DELETE /api/agent/:id/history", () => {
    beforeEach(() => {
      spaceState.messages = [
        { id: "m1", agentId: "bob", text: "Hello" },
        { id: "m2", agentId: "alice", text: "World" }
      ]
    })

    it("clears the agent's messages", async () => {
      const res = await request(app).delete("/api/agent/bob/history")
      expect(res.status).toBe(200)
      expect(res.body.cleared).toBe(true)
      expect(spaceState.messages.every(m => m.agentId !== "bob")).toBe(true)
    })

    it("returns 404 for a non-existent agent", async () => {
      const res = await request(app).delete("/api/agent/ghost/history")
      expect(res.status).toBe(404)
    })
  })

  // ── Personality Assignment ───────────────────────────────────

  describe("POST /api/agent/:id/personality", () => {
    it("returns 501 when personalityStore is not provided", async () => {
      const res = await request(app)
        .post("/api/agent/bob/personality")
        .send({ personalityId: "p1" })
      expect(res.status).toBe(501)
      expect(res.body.error.code).toBe("NOT_IMPLEMENTED")
    })

    it("returns 404 for a non-existent agent", async () => {
      const res = await request(app)
        .post("/api/agent/ghost/personality")
        .send({ personalityId: "p1" })
      expect(res.status).toBe(404)
    })

    it("returns 400 when personalityId is missing", async () => {
      const res = await request(app)
        .post("/api/agent/bob/personality")
        .send({})
      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe("VALIDATION_ERROR")
    })
  })

  describe("POST /api/agent/:id/personality with personalityStore", () => {
    let appWithPersonality

    beforeEach(() => {
      const ctx2 = createTestApp()
      appWithPersonality = ctx2.app

      const personalityStore = {
        get: vi.fn().mockImplementation(id => {
          if (id === "p-exists") {
            return { id: "p-exists", name: "Test", prompt: "Be helpful.", voice: "shimmer" }
          }
          return null
        }),
        getAll: vi.fn().mockReturnValue([])
      }

      const router = createAgentControlRoutes({
        registry: ctx2.registry,
        spaceState: createSpaceState(),
        provider: ctx2.provider,
        spaceNS: ctx2.spaceNS,
        broadcastState: vi.fn(),
        handleLLMResponse: vi.fn().mockResolvedValue(undefined),
        personalityStore
      })
      appWithPersonality.use("/api/agent", router)
    })

    it("applies personality to agent when both agent and personality exist", async () => {
      const res = await request(appWithPersonality)
        .post("/api/agent/bob/personality")
        .send({ personalityId: "p-exists" })
      expect(res.status).toBe(200)
      expect(res.body.updated).toBe(true)
      expect(res.body.personalityId).toBe("p-exists")
    })

    it("returns 404 when the personality does not exist", async () => {
      const res = await request(appWithPersonality)
        .post("/api/agent/bob/personality")
        .send({ personalityId: "no-such-personality" })
      expect(res.status).toBe(404)
      expect(res.body.error.code).toBe("NOT_FOUND")
    })
  })
})
