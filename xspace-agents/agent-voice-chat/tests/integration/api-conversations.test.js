// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 nirholas (https://github.com/nirholas/xspace-agent)

import request from "supertest"
import createConversationRoutes from "../../src/server/routes/conversations.js"
import { createTestApp } from "../helpers/create-test-app.js"

function makeSpaceState(messages = []) {
  return { messages }
}

describe("Conversations API routes", () => {
  let app, convRouter, spaceState, ctx

  beforeEach(() => {
    ctx = createTestApp()
    app = ctx.app
    spaceState = makeSpaceState()
    convRouter = createConversationRoutes({ spaceState })
    app.use("/api/conversations", convRouter)
  })

  afterEach(() => {
    ctx.roomManager.destroy()
  })

  // ── GET /api/conversations ────────────────────────────────────

  describe("GET /api/conversations", () => {
    beforeEach(() => {
      // Archive a couple of conversations manually
      spaceState.messages = [
        { id: "m1", agentId: "bob", name: "Bob", text: "Hello there", timestamp: Date.now() - 2000, isUser: false }
      ]
      convRouter._archiveConversation({ title: "First chat" })

      spaceState.messages = [
        { id: "m2", agentId: "alice", name: "Alice", text: "World peace", timestamp: Date.now() - 1000, isUser: false }
      ]
      convRouter._archiveConversation({ title: "Second chat" })
    })

    it("lists all conversations", async () => {
      const res = await request(app).get("/api/conversations")
      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
      expect(Array.isArray(res.body.data.items)).toBe(true)
      expect(res.body.data.items.length).toBe(2)
      expect(res.body.data.total).toBe(2)
    })

    it("filters by search query matching title", async () => {
      const res = await request(app).get("/api/conversations?search=First")
      expect(res.status).toBe(200)
      expect(res.body.data.items.length).toBe(1)
      expect(res.body.data.items[0].title).toBe("First chat")
    })

    it("filters by search query matching message text", async () => {
      const res = await request(app).get("/api/conversations?search=peace")
      expect(res.status).toBe(200)
      expect(res.body.data.items.length).toBe(1)
    })

    it("handles search with special regex characters safely", async () => {
      // Should not throw — regex special chars must be treated as literals
      const res = await request(app).get("/api/conversations?search=(.*)%5B%5D%7B%7D")
      expect(res.status).toBe(200)
      expect(res.body.data.items.length).toBe(0)
    })

    it("paginates results with limit and offset", async () => {
      const res = await request(app).get("/api/conversations?limit=1&offset=1")
      expect(res.status).toBe(200)
      expect(res.body.data.items.length).toBe(1)
      expect(res.body.data.limit).toBe(1)
      expect(res.body.data.offset).toBe(1)
    })

    it("caps limit at the shared maximum page size (100)", async () => {
      const res = await request(app).get("/api/conversations?limit=999")
      expect(res.status).toBe(200)
      expect(res.body.data.limit).toBe(100)
    })
  })

  // ── POST /api/conversations ───────────────────────────────────

  describe("POST /api/conversations", () => {
    it("archives current session messages into a new conversation", async () => {
      spaceState.messages = [
        { id: "m1", agentId: "bob", name: "Bob", text: "Hi", timestamp: Date.now(), isUser: false }
      ]
      const res = await request(app)
        .post("/api/conversations")
        .send({ title: "My Archive" })
      expect(res.status).toBe(201)
      expect(res.body.data.title).toBe("My Archive")
      expect(res.body.data.id).toBeDefined()
      expect(res.body.data.messageCount).toBe(1)
    })

    it("returns 400 when there are no messages to archive", async () => {
      spaceState.messages = []
      const res = await request(app).post("/api/conversations").send({})
      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe("VALIDATION_ERROR")
      expect(res.body.error.message).toMatch(/no messages/i)
    })

    it("creates a conversation with a generated title when title is omitted", async () => {
      spaceState.messages = [
        { id: "m1", agentId: "bob", text: "Hello", timestamp: Date.now() }
      ]
      const res = await request(app).post("/api/conversations").send({})
      expect(res.status).toBe(201)
      expect(res.body.data.title).toMatch(/Conversation/)
    })
  })

  // ── GET /api/conversations/stats ─────────────────────────────

  describe("GET /api/conversations/stats", () => {
    it("returns overall stats", async () => {
      spaceState.messages = [
        { id: "m1", agentId: "bob", text: "Hi", timestamp: Date.now() }
      ]
      convRouter._archiveConversation({ title: "Stat test" })
      spaceState.messages = []

      const res = await request(app).get("/api/conversations/stats")
      expect(res.status).toBe(200)
      expect(res.body.data.totalConversations).toBe(1)
      expect(res.body.data.totalMessages).toBe(1)
    })

    it("returns zeroes when no conversations exist", async () => {
      const res = await request(app).get("/api/conversations/stats")
      expect(res.status).toBe(200)
      expect(res.body.data.totalConversations).toBe(0)
    })
  })

  // ── GET /api/conversations/:id ────────────────────────────────

  describe("GET /api/conversations/:id", () => {
    let convId

    beforeEach(() => {
      spaceState.messages = [
        { id: "m1", agentId: "bob", name: "Bob", text: "Howdy", timestamp: Date.now(), isUser: false }
      ]
      const conv = convRouter._archiveConversation({ title: "Detail test" })
      convId = conv.id
    })

    it("returns conversation with messages", async () => {
      const res = await request(app).get(`/api/conversations/${convId}`)
      expect(res.status).toBe(200)
      expect(res.body.data.id).toBe(convId)
      expect(Array.isArray(res.body.data.messages)).toBe(true)
      expect(res.body.data.messages.length).toBe(1)
    })

    it("returns 404 for a non-existent conversation", async () => {
      const res = await request(app).get("/api/conversations/no-such-id")
      expect(res.status).toBe(404)
      expect(res.body.error.code).toBe("NOT_FOUND")
    })
  })

  // ── DELETE /api/conversations/:id ─────────────────────────────

  describe("DELETE /api/conversations/:id", () => {
    let convId

    beforeEach(() => {
      spaceState.messages = [
        { id: "m1", agentId: "bob", text: "Bye", timestamp: Date.now() }
      ]
      const conv = convRouter._archiveConversation({})
      convId = conv.id
    })

    it("deletes an existing conversation", async () => {
      const res = await request(app).delete(`/api/conversations/${convId}`)
      expect(res.status).toBe(200)
      expect(res.body.data.deleted).toBe(true)

      // Verify it's gone
      const check = await request(app).get(`/api/conversations/${convId}`)
      expect(check.status).toBe(404)
    })

    it("returns 404 for a non-existent conversation", async () => {
      const res = await request(app).delete("/api/conversations/ghost-id")
      expect(res.status).toBe(404)
      expect(res.body.error.code).toBe("NOT_FOUND")
    })
  })

  // ── GET /api/conversations/:id/transcript ─────────────────────

  describe("GET /api/conversations/:id/transcript", () => {
    let convId

    beforeEach(() => {
      spaceState.messages = [
        { id: "m1", agentId: "bob", name: "Bob", text: "Good morning", timestamp: 1700000000000, isUser: false },
        { id: "m2", agentId: -1, name: "User", text: "Hello back", timestamp: 1700000001000, isUser: true }
      ]
      const conv = convRouter._archiveConversation({ title: "Transcript test" })
      convId = conv.id
    })

    it("exports conversation as plain text transcript", async () => {
      const res = await request(app).get(`/api/conversations/${convId}/transcript`)
      expect(res.status).toBe(200)
      expect(res.headers["content-type"]).toMatch(/text\/plain/)
      expect(res.text).toContain("Bob: Good morning")
      expect(res.text).toContain("User: Hello back")
    })

    it("sets the correct content-disposition header", async () => {
      const res = await request(app).get(`/api/conversations/${convId}/transcript`)
      expect(res.headers["content-disposition"]).toMatch(/attachment/)
      expect(res.headers["content-disposition"]).toContain(`conversation-${convId}.txt`)
    })

    it("exports as JSON when format=json is specified", async () => {
      const res = await request(app).get(`/api/conversations/${convId}/transcript?format=json`)
      expect(res.status).toBe(200)
      // The JSON export is the whole conversation, wrapped in the standard envelope
      expect(res.body.data.id).toBe(convId)
      expect(Array.isArray(res.body.data.messages)).toBe(true)
      expect(res.headers["content-disposition"]).toMatch(/\.json"/)
    })

    it("returns 404 for a non-existent conversation", async () => {
      const res = await request(app).get("/api/conversations/ghost-id/transcript")
      expect(res.status).toBe(404)
      expect(res.body.error.code).toBe("NOT_FOUND")
    })
  })
})
