// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 nirholas (https://github.com/nirholas/xspace-agent)

import fs from "fs"
import path from "path"
import { vi } from "vitest"

// Import the real modules for direct testing
import { KnowledgeBase } from "../../lib/knowledge-base"
import { cosineSimilarity, findSimilar } from "../../lib/embeddings"

const TEST_KB_DIR = path.join(__dirname, "..", ".tmp-kb-test")
const TEST_INDEX_DIR = path.join(__dirname, "..", ".tmp-kb-index")

describe("KnowledgeBase", () => {
  let kb

  beforeEach(() => {
    // Clean test directories
    for (const dir of [TEST_KB_DIR, TEST_INDEX_DIR]) {
      if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true })
    }
    fs.mkdirSync(TEST_KB_DIR, { recursive: true })

    kb = new KnowledgeBase({
      directory: TEST_KB_DIR,
      indexPath: path.join(TEST_INDEX_DIR, "kb-index.json"),
      chunkSize: 50,
      chunkOverlap: 10,
      maxRetrievedChunks: 3
    })
  })

  afterEach(() => {
    for (const dir of [TEST_KB_DIR, TEST_INDEX_DIR]) {
      if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true })
    }
  })

  describe("initialization", () => {
    it("creates knowledge directory if missing", () => {
      expect(fs.existsSync(TEST_KB_DIR)).toBe(true)
    })

    it("starts with empty chunks and documents", () => {
      expect(kb.chunks).toEqual([])
      expect(kb.documents).toEqual({})
    })

    it("loads existing index from disk", () => {
      // Write a fake index
      fs.mkdirSync(TEST_INDEX_DIR, { recursive: true })
      const indexData = {
        version: 2,
        chunks: [{ id: "c1", docName: "test.md", chunkIndex: 0, content: "hello", embedding: [1, 2] }],
        documents: { "test.md": { name: "test.md", chunksCount: 1, indexedAt: "2026-01-01" } }
      }
      fs.writeFileSync(path.join(TEST_INDEX_DIR, "kb-index.json"), JSON.stringify(indexData))

      const kb2 = new KnowledgeBase({
        directory: TEST_KB_DIR,
        indexPath: path.join(TEST_INDEX_DIR, "kb-index.json")
      })
      expect(kb2.chunks.length).toBe(1)
      expect(kb2.documents["test.md"]).toBeDefined()
    })
  })

  describe("chunking", () => {
    it("splits text into chunks of approximately chunkSize tokens", () => {
      const words = Array.from({ length: 100 }, (_, i) => `word${i}`)
      const text = words.join(" ")
      const chunks = kb._chunkText(text)
      expect(chunks.length).toBeGreaterThan(1)
      chunks.forEach(c => expect(c.length).toBeGreaterThan(0))
    })

    it("returns a single chunk for short text", () => {
      const chunks = kb._chunkText("hello world this is short")
      expect(chunks.length).toBe(1)
    })

    it("chunks overlap correctly", () => {
      const words = Array.from({ length: 100 }, (_, i) => `w${i}`)
      const text = words.join(" ")
      const chunks = kb._chunkText(text)
      if (chunks.length >= 2) {
        const chunk0Words = chunks[0].split(" ")
        const chunk1Words = chunks[1].split(" ")
        const overlapWords = Math.floor(10 * 0.75)
        const tailOfChunk0 = chunk0Words.slice(-overlapWords)
        const headOfChunk1 = chunk1Words.slice(0, overlapWords)
        expect(tailOfChunk0).toEqual(headOfChunk1)
      }
    })

    it("handles empty text", () => {
      const chunks = kb._chunkText("")
      expect(chunks.length).toBe(1)
    })
  })

  describe("oversized blocks", () => {
    it("splits a long markdown section under a single header", () => {
      const body = Array.from({ length: 200 }, (_, i) => `word${i}`).join(" ")
      const chunks = kb._chunkText(`# Title\n\n${body}`, ".md")
      // A chunk may carry the overlap seed from the previous one on top of the window
      const maxWords = Math.floor(50 * 0.75) + Math.floor(10 * 0.75)
      expect(chunks.length).toBeGreaterThan(1)
      chunks.forEach(c => expect(c.split(/\s+/).length).toBeLessThanOrEqual(maxWords))
    })

    it("splits a single oversized paragraph in a multi-paragraph text file", () => {
      const long = Array.from({ length: 200 }, (_, i) => `w${i}`).join(" ")
      const chunks = kb._chunkText(`short intro paragraph\n\n${long}`, ".txt")
      const maxWords = Math.floor(50 * 0.75) + Math.floor(10 * 0.75)
      expect(chunks.length).toBeGreaterThan(1)
      chunks.forEach(c => expect(c.split(/\s+/).length).toBeLessThanOrEqual(maxWords))
    })

    it("always advances when the overlap is not smaller than the chunk size", () => {
      const tight = new KnowledgeBase({
        directory: TEST_KB_DIR,
        indexPath: path.join(TEST_INDEX_DIR, "tight.json"),
        chunkSize: 4,
        chunkOverlap: 40
      })
      const text = Array.from({ length: 30 }, (_, i) => `t${i}`).join(" ")
      const chunks = tight._chunkText(text, ".txt")
      expect(chunks.length).toBeGreaterThan(1)
      expect(chunks.length).toBeLessThan(100)
    })
  })

  describe("_readAndChunk", () => {
    it("reads and chunks a markdown file", () => {
      const content = Array.from({ length: 200 }, (_, i) => `word${i}`).join(" ")
      fs.writeFileSync(path.join(TEST_KB_DIR, "test.md"), content)
      const result = kb._readAndChunk(path.join(TEST_KB_DIR, "test.md"))
      expect(result.name).toBe("test.md")
      expect(result.chunks.length).toBeGreaterThan(1)
    })

    it("reads and chunks a text file", () => {
      fs.writeFileSync(path.join(TEST_KB_DIR, "notes.txt"), "Some important notes about the project")
      const result = kb._readAndChunk(path.join(TEST_KB_DIR, "notes.txt"))
      expect(result.name).toBe("notes.txt")
      expect(result.chunks.length).toBeGreaterThanOrEqual(1)
    })

    it("reads and chunks a JSON file", () => {
      fs.writeFileSync(path.join(TEST_KB_DIR, "data.json"), JSON.stringify({ key: "value", nested: { a: 1 } }))
      const result = kb._readAndChunk(path.join(TEST_KB_DIR, "data.json"))
      expect(result.name).toBe("data.json")
      expect(result.chunks.length).toBeGreaterThanOrEqual(1)
    })

    it("throws for unsupported file types", () => {
      fs.writeFileSync(path.join(TEST_KB_DIR, "image.png"), "fake")
      expect(() => kb._readAndChunk(path.join(TEST_KB_DIR, "image.png"))).toThrow("Unsupported file type")
    })
  })

  describe("ingestDocument (without API)", () => {
    it("ingests a file, chunks it, and stores metadata (embedding may fail without API key)", async () => {
      const content = Array.from({ length: 200 }, (_, i) => `word${i}`).join(" ")
      fs.writeFileSync(path.join(TEST_KB_DIR, "test.md"), content)

      const result = await kb.ingestDocument("test.md")
      expect(result.name).toBe("test.md")
      expect(result.chunksCount).toBeGreaterThan(1)
      expect(kb.chunks.length).toBe(result.chunksCount)
      expect(kb.documents["test.md"]).toBeDefined()
      expect(kb.documents["test.md"].indexedAt).toBeDefined()
      // Each chunk should have content and docName
      kb.chunks.forEach(c => {
        expect(c.content).toBeDefined()
        expect(c.docName).toBe("test.md")
        expect(c.id).toMatch(/^chunk_/)
      })
    })

    it("replaces existing chunks when re-ingesting", async () => {
      fs.writeFileSync(path.join(TEST_KB_DIR, "doc.md"), "original content here with enough words to matter")
      await kb.ingestDocument("doc.md")

      fs.writeFileSync(path.join(TEST_KB_DIR, "doc.md"), "updated content here with different words to check")
      await kb.ingestDocument("doc.md")
      expect(kb.chunks.every(c => c.docName === "doc.md")).toBe(true)
    })

    it("persists index to disk", async () => {
      fs.writeFileSync(path.join(TEST_KB_DIR, "test.md"), "content to index")
      await kb.ingestDocument("test.md")

      const indexPath = path.join(TEST_INDEX_DIR, "kb-index.json")
      expect(fs.existsSync(indexPath)).toBe(true)
      const data = JSON.parse(fs.readFileSync(indexPath, "utf-8"))
      expect(data.chunks.length).toBeGreaterThan(0)
      expect(data.documents["test.md"]).toBeDefined()
    })
  })

  describe("ingestAll", () => {
    it("ingests all supported files from directory", async () => {
      fs.writeFileSync(path.join(TEST_KB_DIR, "doc1.md"), "first document content")
      fs.writeFileSync(path.join(TEST_KB_DIR, "doc2.txt"), "second document content")
      fs.writeFileSync(path.join(TEST_KB_DIR, "skip.png"), "should be skipped")

      const result = await kb.ingestAll()
      expect(result.ingested).toBe(2)
      expect(result.total_chunks).toBeGreaterThan(0)
    })

    it("returns zeros for empty directory", async () => {
      const result = await kb.ingestAll()
      expect(result.ingested).toBe(0)
      expect(result.total_chunks).toBe(0)
    })
  })

  describe("search (with pre-set embeddings)", () => {
    it("returns empty array when no chunks exist", async () => {
      const results = await kb.search("anything")
      expect(results).toEqual([])
    })

    it("falls back to keyword matching when chunks have no embeddings", async () => {
      kb.chunks = [
        { id: "c1", docName: "doc.md", chunkIndex: 0, content: "hello", embedding: [] }
      ]
      const results = await kb.search("hello")
      expect(results).toHaveLength(1)
      expect(results[0].docName).toBe("doc.md")
      expect(results[0].content).toBe("hello")
    })

    it("returns empty array when chunks have no embeddings and nothing matches by keyword", async () => {
      kb.chunks = [
        { id: "c1", docName: "doc.md", chunkIndex: 0, content: "hello", embedding: [] }
      ]
      const results = await kb.search("zebra")
      expect(results).toEqual([])
    })
  })

  describe("management", () => {
    it("removes a document and its chunks", async () => {
      fs.writeFileSync(path.join(TEST_KB_DIR, "doc.md"), "content to remove")
      await kb.ingestDocument("doc.md")
      expect(kb.chunks.length).toBeGreaterThan(0)

      kb.removeDocument("doc.md")
      expect(kb.chunks.length).toBe(0)
      expect(kb.documents["doc.md"]).toBeUndefined()
    })

    it("only removes chunks belonging to target document", async () => {
      fs.writeFileSync(path.join(TEST_KB_DIR, "a.md"), "content A")
      fs.writeFileSync(path.join(TEST_KB_DIR, "b.md"), "content B")
      await kb.ingestDocument("a.md")
      await kb.ingestDocument("b.md")

      const totalBefore = kb.chunks.length
      const bChunks = kb.chunks.filter(c => c.docName === "b.md").length

      kb.removeDocument("a.md")
      expect(kb.chunks.length).toBe(bChunks)
      expect(kb.chunks.every(c => c.docName === "b.md")).toBe(true)
    })

    it("lists all documents", async () => {
      fs.writeFileSync(path.join(TEST_KB_DIR, "a.md"), "content")
      fs.writeFileSync(path.join(TEST_KB_DIR, "b.txt"), "content")
      await kb.ingestDocument("a.md")
      await kb.ingestDocument("b.txt")

      const docs = kb.listDocuments()
      expect(docs.length).toBe(2)
      expect(docs.map(d => d.name).sort()).toEqual(["a.md", "b.txt"])
    })

    it("clears entire index", async () => {
      fs.writeFileSync(path.join(TEST_KB_DIR, "doc.md"), "content")
      await kb.ingestDocument("doc.md")
      kb.clearIndex()
      expect(kb.chunks.length).toBe(0)
      expect(Object.keys(kb.documents).length).toBe(0)
    })

    it("returns correct stats", async () => {
      fs.writeFileSync(path.join(TEST_KB_DIR, "doc.md"), "content")
      await kb.ingestDocument("doc.md")

      const stats = kb.getStats()
      expect(stats.documents).toBe(1)
      expect(stats.chunks).toBeGreaterThan(0)
      expect(stats.supportedFormats).toContain(".md")
      expect(stats.supportedFormats).toContain(".txt")
      expect(stats.supportedFormats).toContain(".json")
    })
  })
})
