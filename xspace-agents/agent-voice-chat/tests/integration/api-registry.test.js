// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 nirholas (https://github.com/nirholas/xspace-agent)

import request from "supertest"
import { createTestApp } from "../helpers/create-test-app.js"
import createRegistryRoutes from "../../src/server/routes/registry.js"

describe("Registry API", () => {
  let app, registry

  beforeEach(() => {
    const ctx = createTestApp()
    app = ctx.app
    registry = ctx.registry

    // Add registry-specific methods the test app mock doesn't have
    registry.defaults = { voice: "alloy", maxHistoryLength: 50 }
    registry.getLastValidationErrors = vi.fn().mockReturnValue(null)
    registry.reload = vi.fn().mockReturnValue({ ok: true, agents: 2 })

    const ttsProvider = {
      listVoices: vi.fn().mockResolvedValue([
        { id: "verse", name: "Verse" },
        { id: "sage", name: "Sage" },
        { id: "alloy", name: "Alloy" }
      ])
    }

    app.use("/api/agents/registry", createRegistryRoutes({ registry, ttsProvider }))
  })

  describe("GET /api/agents/registry", () => {
    it("should return all registered agents", async () => {
      const res = await request(app).get("/api/agents/registry")
      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
      expect(res.body.data.agents).toHaveLength(2)
      expect(res.body.data.count).toBe(2)
      expect(res.body.data.defaults).toBeDefined()
    })

    it("should include validation errors if present", async () => {
      registry.getLastValidationErrors.mockReturnValue("agents: Duplicate agent ID")

      const res = await request(app).get("/api/agents/registry")
      expect(res.status).toBe(200)
      expect(res.body.data.lastValidationErrors).toBe("agents: Duplicate agent ID")
    })
  })

  describe("GET /api/agents/registry/voices", () => {
    it("should return available voices with agent assignments", async () => {
      const res = await request(app).get("/api/agents/registry/voices")
      expect(res.status).toBe(200)
      expect(res.body.data.voices).toHaveLength(3)
      expect(res.body.data.agentAssignments.verse).toContain("bob")
      expect(res.body.data.agentAssignments.sage).toContain("alice")
    })

    it("should return 501 when TTS provider lacks listVoices", async () => {
      const app2 = createTestApp()
      app2.registry.defaults = { voice: "alloy" }
      app2.registry.getLastValidationErrors = vi.fn()
      app2.app.use("/api/agents/registry", createRegistryRoutes({
        registry: app2.registry,
        ttsProvider: {}
      }))

      const res = await request(app2.app).get("/api/agents/registry/voices")
      expect(res.status).toBe(501)
    })
  })

  describe("POST /api/agents/registry/reload", () => {
    it("should reload config successfully", async () => {
      const res = await request(app).post("/api/agents/registry/reload")
      expect(res.status).toBe(200)
      expect(res.body.data.reloaded).toBe(true)
      expect(registry.reload).toHaveBeenCalled()
    })

    it("should return error on failed reload", async () => {
      registry.reload.mockReturnValue({ ok: false, errors: "Invalid config" })

      const res = await request(app).post("/api/agents/registry/reload")
      expect(res.status).toBe(400)
      expect(res.body.error.message).toContain("Invalid config")
    })
  })

  describe("POST /api/agents/registry/validate", () => {
    it("should validate a correct config", async () => {
      const res = await request(app)
        .post("/api/agents/registry/validate")
        .send({
          agents: [
            { id: "test", name: "Test", personality: "Test agent personality text." }
          ]
        })
      expect(res.status).toBe(200)
      expect(res.body.data.valid).toBe(true)
      expect(res.body.data.agents).toBe(1)
      expect(res.body.data.agentIds).toContain("test")
    })

    it("should return validation errors for bad config", async () => {
      const res = await request(app)
        .post("/api/agents/registry/validate")
        .send({ agents: [] })
      expect(res.status).toBe(400)
      expect(res.body.ok).toBe(false)
      expect(res.body.error.code).toBe("VALIDATION_ERROR")
      expect(res.body.error.details.length).toBeGreaterThan(0)
    })

    it("should detect duplicate IDs in validation", async () => {
      const res = await request(app)
        .post("/api/agents/registry/validate")
        .send({
          agents: [
            { id: "dup", name: "Dup1", personality: "Dup personality one." },
            { id: "dup", name: "Dup2", personality: "Dup personality two." }
          ]
        })
      expect(res.status).toBe(400)
      expect(res.body.error.details.some(e => e.message.includes("Duplicate"))).toBe(true)
    })

    it("should reject empty body", async () => {
      const res = await request(app)
        .post("/api/agents/registry/validate")
        .send("")
      expect(res.status).toBe(400)
    })
  })
})
