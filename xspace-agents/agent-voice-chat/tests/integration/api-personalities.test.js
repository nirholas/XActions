// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 nirholas (https://github.com/nirholas/xspace-agent)

import request from "supertest"
import createPersonalityRoutes from "../../src/server/routes/personalities.js"
import { createTestApp } from "../helpers/create-test-app.js"

describe("Personalities API routes", () => {
  let app, personalityRouter, ctx

  beforeEach(() => {
    ctx = createTestApp()
    app = ctx.app
    personalityRouter = createPersonalityRoutes()
    app.use("/api/personalities", personalityRouter)
  })

  afterEach(() => {
    ctx.roomManager.destroy()
  })

  // ── GET /api/personalities ────────────────────────────────────

  describe("GET /api/personalities", () => {
    it("returns an empty list when no personalities exist", async () => {
      const res = await request(app).get("/api/personalities")
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.data)).toBe(true)
      expect(res.body.data.length).toBe(0)
    })

    it("lists all created personalities", async () => {
      await request(app)
        .post("/api/personalities")
        .send({ name: "Friendly", prompt: "Be very friendly and warm." })
      await request(app)
        .post("/api/personalities")
        .send({ name: "Concise", prompt: "Be brief and to the point." })

      const res = await request(app).get("/api/personalities")
      expect(res.status).toBe(200)
      expect(res.body.data.length).toBe(2)
    })

    it("does not expose the prompt field in the list (only metadata)", async () => {
      await request(app)
        .post("/api/personalities")
        .send({ name: "Secret", prompt: "Top secret instructions." })

      const res = await request(app).get("/api/personalities")
      expect(res.status).toBe(200)
      // GET list should not expose full prompt
      const personality = res.body.data[0]
      expect(personality).toHaveProperty("id")
      expect(personality).toHaveProperty("name")
      expect(personality).not.toHaveProperty("prompt")
    })
  })

  // ── POST /api/personalities ───────────────────────────────────

  describe("POST /api/personalities", () => {
    it("creates a new personality and returns 201", async () => {
      const res = await request(app)
        .post("/api/personalities")
        .send({ name: "Sherlock", prompt: "You are a brilliant detective.", tags: ["detective"] })
      expect(res.status).toBe(201)
      expect(res.body.data.id).toBeDefined()
      expect(res.body.data.name).toBe("Sherlock")
      expect(res.body.data.prompt).toBe("You are a brilliant detective.")
      expect(res.body.data.tags).toEqual(["detective"])
    })

    it("returns 400 when name is missing", async () => {
      const res = await request(app)
        .post("/api/personalities")
        .send({ prompt: "No name provided." })
      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe("VALIDATION_ERROR")
    })

    it("returns 400 when prompt is missing", async () => {
      const res = await request(app)
        .post("/api/personalities")
        .send({ name: "No Prompt" })
      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe("VALIDATION_ERROR")
    })

    it("returns 400 when name is empty string", async () => {
      const res = await request(app)
        .post("/api/personalities")
        .send({ name: "", prompt: "Some prompt" })
      expect(res.status).toBe(400)
    })

    it("returns 400 when prompt is empty string", async () => {
      const res = await request(app)
        .post("/api/personalities")
        .send({ name: "Valid", prompt: "" })
      expect(res.status).toBe(400)
    })

    it("allows creating two personalities with the same name (current behavior)", async () => {
      const first = await request(app)
        .post("/api/personalities")
        .send({ name: "Duplicate", prompt: "First one." })
      const second = await request(app)
        .post("/api/personalities")
        .send({ name: "Duplicate", prompt: "Second one." })
      expect(first.status).toBe(201)
      expect(second.status).toBe(201)
      expect(first.body.data.id).not.toBe(second.body.data.id)
    })

    it("accepts an optional voice field", async () => {
      const res = await request(app)
        .post("/api/personalities")
        .send({ name: "With Voice", prompt: "Test prompt.", voice: "shimmer" })
      expect(res.status).toBe(201)
      expect(res.body.data.voice).toBe("shimmer")
    })

    it("accepts an optional description field", async () => {
      const res = await request(app)
        .post("/api/personalities")
        .send({ name: "With Desc", prompt: "Test prompt.", description: "A short description." })
      expect(res.status).toBe(201)
      expect(res.body.data.description).toBe("A short description.")
    })
  })

  // ── GET /api/personalities/:id ────────────────────────────────

  describe("GET /api/personalities/:id", () => {
    let createdId

    beforeEach(async () => {
      const res = await request(app)
        .post("/api/personalities")
        .send({ name: "DetailTest", prompt: "Full details here." })
      createdId = res.body.data.id
    })

    it("returns the full personality by ID", async () => {
      const res = await request(app).get(`/api/personalities/${createdId}`)
      expect(res.status).toBe(200)
      expect(res.body.data.id).toBe(createdId)
      expect(res.body.data.name).toBe("DetailTest")
      expect(res.body.data.prompt).toBe("Full details here.")
    })

    it("returns 404 for a non-existent personality", async () => {
      const res = await request(app).get("/api/personalities/no-such-id")
      expect(res.status).toBe(404)
      expect(res.body.error.code).toBe("NOT_FOUND")
    })
  })

  // ── PUT /api/personalities/:id ────────────────────────────────

  describe("PUT /api/personalities/:id", () => {
    let createdId

    beforeEach(async () => {
      const res = await request(app)
        .post("/api/personalities")
        .send({ name: "Original", prompt: "Original prompt." })
      createdId = res.body.data.id
    })

    it("updates personality fields", async () => {
      const res = await request(app)
        .put(`/api/personalities/${createdId}`)
        .send({ name: "Updated Name" })
      expect(res.status).toBe(200)
      expect(res.body.data.name).toBe("Updated Name")
      expect(res.body.data.prompt).toBe("Original prompt.") // unchanged
    })

    it("updates the prompt", async () => {
      const res = await request(app)
        .put(`/api/personalities/${createdId}`)
        .send({ prompt: "Completely new prompt." })
      expect(res.status).toBe(200)
      expect(res.body.data.prompt).toBe("Completely new prompt.")
    })

    it("updates the updatedAt timestamp", async () => {
      const before = Date.now()
      const res = await request(app)
        .put(`/api/personalities/${createdId}`)
        .send({ name: "Timestamped" })
      expect(res.status).toBe(200)
      expect(res.body.data.updatedAt).toBeGreaterThanOrEqual(before)
    })

    it("returns 404 for a non-existent personality", async () => {
      const res = await request(app)
        .put("/api/personalities/no-such-id")
        .send({ name: "Ghost Update" })
      expect(res.status).toBe(404)
      expect(res.body.error.code).toBe("NOT_FOUND")
    })
  })

  // ── DELETE /api/personalities/:id ─────────────────────────────

  describe("DELETE /api/personalities/:id", () => {
    let createdId

    beforeEach(async () => {
      const res = await request(app)
        .post("/api/personalities")
        .send({ name: "ToDelete", prompt: "Will be deleted." })
      createdId = res.body.data.id
    })

    it("deletes an existing personality", async () => {
      const res = await request(app).delete(`/api/personalities/${createdId}`)
      expect(res.status).toBe(200)
      expect(res.body.data.deleted).toBe(true)

      // Verify it is gone
      const check = await request(app).get(`/api/personalities/${createdId}`)
      expect(check.status).toBe(404)
    })

    it("returns 404 for a non-existent personality", async () => {
      const res = await request(app).delete("/api/personalities/no-such-id")
      expect(res.status).toBe(404)
      expect(res.body.error.code).toBe("NOT_FOUND")
    })
  })

  // ── _store accessor ───────────────────────────────────────────

  describe("router._store (internal API for agent routes)", () => {
    it("exposes get() and getAll() on the store", async () => {
      const createRes = await request(app)
        .post("/api/personalities")
        .send({ name: "StoreTest", prompt: "Store access." })
      const id = createRes.body.data.id

      const found = personalityRouter._store.get(id)
      expect(found).not.toBeNull()
      expect(found.name).toBe("StoreTest")

      const all = personalityRouter._store.getAll()
      expect(all.length).toBeGreaterThanOrEqual(1)
    })

    it("returns null for get() with an unknown id", () => {
      expect(personalityRouter._store.get("ghost")).toBeNull()
    })
  })
})
