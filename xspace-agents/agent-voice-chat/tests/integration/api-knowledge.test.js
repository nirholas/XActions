// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 nirholas (https://github.com/nirholas/xspace-agent)

import request from "supertest"
import createKnowledgeRoutes from "../../src/server/routes/knowledge.js"
import { createTestApp } from "../helpers/create-test-app.js"

/**
 * Create a lightweight in-memory mock of KnowledgeBase.
 * Avoids filesystem, embeddings API, and logger calls.
 */
function createMockKnowledgeBase() {
  const documents = {}
  const chunks = []

  return {
    directory: "/tmp/mock-knowledge",

    // The real KnowledgeBase exposes its document map; routes read it directly
    documents,

    getStats: vi.fn(() => ({
      documents: Object.keys(documents).length,
      chunks: chunks.length,
      directory: "/tmp/mock-knowledge",
      supportedFormats: [".md", ".txt", ".json"]
    })),

    listDocuments: vi.fn(() => Object.values(documents)),

    ingestDocument: vi.fn(async (filePath) => {
      const name = filePath.split("/").pop()
      documents[name] = { name, path: filePath, chunksCount: 3, indexedAt: new Date().toISOString() }
      return { name, chunksCount: 3 }
    }),

    ingestAll: vi.fn(async () => {
      return { ingested: 0, total_chunks: 0 }
    }),

    search: vi.fn(async (query, opts = {}) => {
      if (!query) return []
      return [
        { content: `Mock result for "${query}"`, docName: "sample.md", chunkIndex: 0, score: 0.92 }
      ]
    }),

    removeDocument: vi.fn((docName) => {
      delete documents[docName]
    }),

    clearIndex: vi.fn(() => {
      for (const k of Object.keys(documents)) delete documents[k]
      chunks.length = 0
    }),

    // Expose for seeding
    _addDocument: (name) => {
      documents[name] = { name, path: `/tmp/${name}`, chunksCount: 2, indexedAt: new Date().toISOString() }
    },
    _documents: documents
  }
}

describe("Knowledge API routes", () => {
  let app, knowledgeBase, ctx

  beforeEach(() => {
    ctx = createTestApp()
    app = ctx.app
    knowledgeBase = createMockKnowledgeBase()
    const knowledgeRouter = createKnowledgeRoutes({ knowledgeBase })
    app.use("/api/knowledge", knowledgeRouter)
  })

  afterEach(() => {
    ctx.roomManager.destroy()
  })

  // ── GET /api/knowledge/stats ──────────────────────────────────

  describe("GET /api/knowledge/stats", () => {
    it("returns knowledge base statistics", async () => {
      const res = await request(app).get("/api/knowledge/stats")
      expect(res.status).toBe(200)
      expect(res.body.data).toHaveProperty("documents")
      expect(res.body.data).toHaveProperty("chunks")
      expect(res.body.data).toHaveProperty("supportedFormats")
      expect(knowledgeBase.getStats).toHaveBeenCalled()
    })
  })

  // ── GET /api/knowledge/documents ──────────────────────────────

  describe("GET /api/knowledge/documents", () => {
    it("returns empty list when no documents are indexed", async () => {
      const res = await request(app).get("/api/knowledge/documents")
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.data)).toBe(true)
      expect(res.body.data.length).toBe(0)
    })

    it("lists all indexed knowledge documents", async () => {
      knowledgeBase._addDocument("guide.md")
      knowledgeBase._addDocument("faq.txt")

      const res = await request(app).get("/api/knowledge/documents")
      expect(res.status).toBe(200)
      expect(res.body.data.length).toBe(2)
      const names = res.body.data.map(d => d.name)
      expect(names).toContain("guide.md")
      expect(names).toContain("faq.txt")
    })
  })

  // ── POST /api/knowledge/ingest ────────────────────────────────

  describe("POST /api/knowledge/ingest", () => {
    it("ingests a specific document by filename", async () => {
      // Mock fs.existsSync to return true for the mocked knowledge dir
      const fs = (await import("fs")).default
      const existsSyncSpy = vi.spyOn(fs, "existsSync").mockReturnValue(true)

      const res = await request(app)
        .post("/api/knowledge/ingest")
        .send({ filename: "guide.md" })

      existsSyncSpy.mockRestore()

      expect(res.status).toBe(200)
      expect(res.body.data.name).toBe("guide.md")
      expect(res.body.data.chunksCount).toBe(3)
    })

    it("returns 404 when the file does not exist", async () => {
      const fs = (await import("fs")).default
      const existsSyncSpy = vi.spyOn(fs, "existsSync").mockReturnValue(false)

      const res = await request(app)
        .post("/api/knowledge/ingest")
        .send({ filename: "missing.md" })

      existsSyncSpy.mockRestore()

      expect(res.status).toBe(404)
      expect(res.body.error.code).toBe("NOT_FOUND")
    })

    it("returns 400 when filename is missing", async () => {
      const res = await request(app)
        .post("/api/knowledge/ingest")
        .send({})
      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe("VALIDATION_ERROR")
    })

    it("prevents path traversal by using only the basename of the filename", async () => {
      const fs = (await import("fs")).default
      const existsSyncSpy = vi.spyOn(fs, "existsSync").mockReturnValue(false)

      const res = await request(app)
        .post("/api/knowledge/ingest")
        .send({ filename: "../../etc/passwd" })

      existsSyncSpy.mockRestore()

      // After path.basename() the filename becomes "passwd", which won't exist
      expect(res.status).toBe(404)
      // Crucially, the injected path traversal is stripped
      expect(knowledgeBase.ingestDocument).not.toHaveBeenCalledWith(
        expect.stringContaining("..")
      )
    })

    it("handles ingestion errors gracefully", async () => {
      const fs = (await import("fs")).default
      const existsSyncSpy = vi.spyOn(fs, "existsSync").mockReturnValue(true)
      knowledgeBase.ingestDocument.mockRejectedValue(new Error("Embedding service down"))

      const res = await request(app)
        .post("/api/knowledge/ingest")
        .send({ filename: "broken.md" })

      existsSyncSpy.mockRestore()

      expect(res.status).toBe(500)
      expect(res.body.error.code).toBe("INTERNAL_ERROR")
    })
  })

  // ── POST /api/knowledge/ingest-all ────────────────────────────

  describe("POST /api/knowledge/ingest-all", () => {
    it("ingests all documents and returns a summary", async () => {
      knowledgeBase.ingestAll.mockResolvedValue({ ingested: 3, total_chunks: 9 })
      const res = await request(app).post("/api/knowledge/ingest-all").send()
      expect(res.status).toBe(200)
      expect(res.body.data.ingested).toBe(3)
      expect(res.body.data.total_chunks).toBe(9)
    })

    it("handles errors during batch ingestion gracefully", async () => {
      knowledgeBase.ingestAll.mockRejectedValue(new Error("Disk IO error"))
      const res = await request(app).post("/api/knowledge/ingest-all").send()
      expect(res.status).toBe(500)
      expect(res.body.error.code).toBe("INTERNAL_ERROR")
    })
  })

  // ── POST /api/knowledge/search ────────────────────────────────

  describe("POST /api/knowledge/search", () => {
    it("returns relevant chunks for a query", async () => {
      const res = await request(app)
        .post("/api/knowledge/search")
        .send({ query: "How does it work?" })
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.data)).toBe(true)
      expect(res.body.data.length).toBeGreaterThanOrEqual(1)
      expect(res.body.data[0]).toHaveProperty("content")
      expect(res.body.data[0]).toHaveProperty("docName")
      expect(res.body.data[0]).toHaveProperty("score")
    })

    it("returns 400 when query is missing", async () => {
      const res = await request(app)
        .post("/api/knowledge/search")
        .send({})
      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe("VALIDATION_ERROR")
    })

    it("returns 400 when query is empty string", async () => {
      const res = await request(app)
        .post("/api/knowledge/search")
        .send({ query: "" })
      expect(res.status).toBe(400)
    })

    it("passes limit and threshold options to the knowledge base", async () => {
      const res = await request(app)
        .post("/api/knowledge/search")
        .send({ query: "test", limit: 5, threshold: 0.8 })
      expect(res.status).toBe(200)
      expect(knowledgeBase.search).toHaveBeenCalledWith("test", expect.objectContaining({
        limit: 5,
        threshold: 0.8
      }))
    })

    it("handles search errors gracefully", async () => {
      knowledgeBase.search.mockRejectedValue(new Error("Vector DB unavailable"))
      const res = await request(app)
        .post("/api/knowledge/search")
        .send({ query: "test" })
      expect(res.status).toBe(500)
      expect(res.body.error.code).toBe("INTERNAL_ERROR")
    })
  })

  // ── DELETE /api/knowledge/documents/:name ─────────────────────

  describe("DELETE /api/knowledge/documents/:name", () => {
    beforeEach(() => {
      knowledgeBase._addDocument("removable.md")
    })

    it("deletes an indexed document and its chunks", async () => {
      const res = await request(app).delete("/api/knowledge/documents/removable.md")
      expect(res.status).toBe(200)
      expect(res.body.data.deleted).toBe(true)
      expect(res.body.data.name).toBe("removable.md")
      expect(knowledgeBase.removeDocument).toHaveBeenCalledWith("removable.md")
    })

    it("returns 404 for a document not in the index", async () => {
      const res = await request(app).delete("/api/knowledge/documents/not-indexed.md")
      expect(res.status).toBe(404)
      expect(res.body.error.code).toBe("NOT_FOUND")
    })
  })

  // ── DELETE /api/knowledge (clear all) ─────────────────────────

  describe("DELETE /api/knowledge", () => {
    it("clears the entire knowledge index", async () => {
      knowledgeBase._addDocument("doc1.md")
      knowledgeBase._addDocument("doc2.txt")

      const res = await request(app).delete("/api/knowledge")
      expect(res.status).toBe(200)
      expect(res.body.data.cleared).toBe(true)
      expect(knowledgeBase.clearIndex).toHaveBeenCalled()
    })
  })

  // ── GET /api/knowledge/files ──────────────────────────────────

  describe("GET /api/knowledge/files", () => {
    it("returns empty array when knowledge directory does not exist", async () => {
      const fs = (await import("fs")).default
      const existsSyncSpy = vi.spyOn(fs, "existsSync").mockReturnValue(false)

      const res = await request(app).get("/api/knowledge/files")

      existsSyncSpy.mockRestore()
      expect(res.status).toBe(200)
      expect(res.body.data).toEqual([])
    })

    it("lists files in the knowledge directory with indexed status", async () => {
      const fs = (await import("fs")).default
      knowledgeBase._addDocument("indexed.md")

      vi.spyOn(fs, "existsSync").mockReturnValue(true)
      vi.spyOn(fs, "readdirSync").mockReturnValue(["indexed.md", "unindexed.txt"])
      vi.spyOn(fs, "statSync").mockReturnValue({
        size: 1024,
        mtime: new Date("2024-01-01")
      })

      const res = await request(app).get("/api/knowledge/files")

      vi.restoreAllMocks()

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.data)).toBe(true)
      const indexed = res.body.data.find(f => f.name === "indexed.md")
      const unindexed = res.body.data.find(f => f.name === "unindexed.txt")
      expect(indexed.indexed).toBe(true)
      expect(unindexed.indexed).toBe(false)
    })
  })
})
