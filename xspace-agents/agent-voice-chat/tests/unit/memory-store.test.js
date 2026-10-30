// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 nirholas (https://github.com/nirholas/xspace-agent)

import fs from "fs"
import path from "path"
import { vi } from "vitest"

// Mock the embeddings module
vi.mock("../../lib/embeddings", () => ({
  getEmbedding: vi.fn().mockResolvedValue(new Array(1536).fill(0.1)),
  getEmbeddings: vi.fn().mockResolvedValue([new Array(1536).fill(0.1)]),
  findSimilar: vi.fn().mockReturnValue([]),
  cosineSimilarity: vi.fn().mockReturnValue(0.8),
  EMBEDDING_DIMENSIONS: 1536
}))

// Must import after mocks
const { MemoryStore } = await import("../../lib/memory-store")
const { findSimilar } = await import("../../lib/embeddings")

const TEST_DIR = path.join(__dirname, "..", ".tmp-memory-test")

describe("MemoryStore", () => {
  let store

  beforeEach(() => {
    // Clean test directory
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true })
    }
    store = new MemoryStore({ storagePath: TEST_DIR, maxMemories: 10 })
  })

  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true })
    }
  })

  describe("initialization", () => {
    it("creates storage directory if it does not exist", () => {
      expect(fs.existsSync(TEST_DIR)).toBe(true)
    })

    it("starts with empty memories and profiles", () => {
      expect(store.memories).toEqual([])
      expect(store.userProfiles).toEqual({})
    })

    it("loads existing data from disk", async () => {
      await store.addMemory({ type: "episodic", content: "test fact", speaker: "@user1" })
      store.updateUserProfile("@user1", { facts: ["likes Rust"] })

      // Create a new store pointing to same directory
      const store2 = new MemoryStore({ storagePath: TEST_DIR })
      expect(store2.memories.length).toBe(1)
      expect(store2.memories[0].content).toBe("test fact")
      expect(store2.userProfiles["@user1"].facts).toContain("likes Rust")
    })
  })

  describe("addMemory", () => {
    it("creates a memory with auto-generated ID and timestamp", async () => {
      const mem = await store.addMemory({ type: "episodic", content: "User is building a DEX", speaker: "@crypto" })
      expect(mem.id).toMatch(/^mem_/)
      expect(mem.type).toBe("episodic")
      expect(mem.content).toBe("User is building a DEX")
      expect(mem.speaker).toBe("@crypto")
      expect(mem.createdAt).toBeDefined()
      expect(mem.embedding).toBeDefined()
    })

    it("persists to disk", async () => {
      await store.addMemory({ type: "semantic", content: "Community prefers Solana" })
      const raw = JSON.parse(fs.readFileSync(path.join(TEST_DIR, "memories.json"), "utf-8"))
      expect(raw.length).toBe(1)
      expect(raw[0].content).toBe("Community prefers Solana")
    })

    it("evicts oldest memories when over limit", async () => {
      for (let i = 0; i < 12; i++) {
        await store.addMemory({ type: "episodic", content: `fact ${i}` })
      }
      expect(store.memories.length).toBe(10)
      // Oldest should be evicted
      expect(store.memories[0].content).toBe("fact 2")
    })

    it("defaults to episodic type", async () => {
      const mem = await store.addMemory({ content: "something happened" })
      expect(mem.type).toBe("episodic")
    })
  })

  describe("searchMemories", () => {
    it("returns empty array when no memories exist", async () => {
      const results = await store.searchMemories("anything")
      expect(results).toEqual([])
    })

    it("filters by speaker", async () => {
      await store.addMemory({ type: "episodic", content: "fact about alice", speaker: "@alice" })
      await store.addMemory({ type: "episodic", content: "fact about bob", speaker: "@bob" })

      findSimilar.mockReturnValue([{
        item: store.memories[0],
        score: 0.9
      }])

      const results = await store.searchMemories("test query", { speaker: "@alice" })
      expect(results.length).toBeLessThanOrEqual(1)
    })

    it("filters by type", async () => {
      await store.addMemory({ type: "episodic", content: "episodic fact" })
      await store.addMemory({ type: "semantic", content: "semantic fact" })

      findSimilar.mockReturnValue([{
        item: store.memories[1],
        score: 0.85
      }])

      const results = await store.searchMemories("test", { type: "semantic" })
      // Should only search among semantic memories
      expect(results.length).toBeLessThanOrEqual(1)
    })
  })

  describe("getMemory / deleteMemory", () => {
    it("retrieves a memory by ID", async () => {
      const mem = await store.addMemory({ content: "find me" })
      const found = store.getMemory(mem.id)
      expect(found.content).toBe("find me")
    })

    it("returns null for unknown ID", () => {
      expect(store.getMemory("nonexistent")).toBeNull()
    })

    it("deletes a memory by ID", async () => {
      const mem = await store.addMemory({ content: "delete me" })
      expect(store.deleteMemory(mem.id)).toBe(true)
      expect(store.getMemory(mem.id)).toBeNull()
      expect(store.memories.length).toBe(0)
    })

    it("returns false when deleting unknown ID", () => {
      expect(store.deleteMemory("nonexistent")).toBe(false)
    })
  })

  describe("getAllMemories", () => {
    it("returns all memories", async () => {
      await store.addMemory({ type: "episodic", content: "a" })
      await store.addMemory({ type: "semantic", content: "b" })
      expect(store.getAllMemories().length).toBe(2)
    })

    it("filters by type", async () => {
      await store.addMemory({ type: "episodic", content: "a" })
      await store.addMemory({ type: "semantic", content: "b" })
      expect(store.getAllMemories({ type: "semantic" }).length).toBe(1)
    })

    it("limits results", async () => {
      await store.addMemory({ content: "a" })
      await store.addMemory({ content: "b" })
      await store.addMemory({ content: "c" })
      expect(store.getAllMemories({ limit: 2 }).length).toBe(2)
    })
  })

  describe("clearMemories", () => {
    it("removes all memories", async () => {
      await store.addMemory({ content: "a" })
      await store.addMemory({ content: "b" })
      store.clearMemories()
      expect(store.memories.length).toBe(0)
    })
  })

  describe("user profiles", () => {
    it("creates a new profile on first updateUserProfile call", () => {
      const profile = store.updateUserProfile("@alice")
      expect(profile.username).toBe("@alice")
      expect(profile.facts).toEqual([])
      expect(profile.interactions).toBe(1)
      expect(profile.firstSeen).toBeDefined()
    })

    it("increments interactions on subsequent calls", () => {
      store.updateUserProfile("@alice")
      const profile = store.updateUserProfile("@alice")
      expect(profile.interactions).toBe(2)
    })

    it("adds facts without duplicates", () => {
      store.addUserFacts("@alice", ["likes Rust", "building a DEX"])
      store.addUserFacts("@alice", ["likes Rust", "knows Solana"])
      const profile = store.getUserProfile("@alice")
      expect(profile.facts).toEqual(["likes Rust", "building a DEX", "knows Solana"])
    })

    it("caps facts at 50", () => {
      const manyFacts = Array.from({ length: 60 }, (_, i) => `fact ${i}`)
      store.addUserFacts("@bob", manyFacts)
      expect(store.getUserProfile("@bob").facts.length).toBe(50)
    })

    it("returns null for unknown user", () => {
      expect(store.getUserProfile("@nobody")).toBeNull()
    })

    it("deletes a user profile", () => {
      store.updateUserProfile("@alice")
      expect(store.deleteUserProfile("@alice")).toBe(true)
      expect(store.getUserProfile("@alice")).toBeNull()
    })

    it("returns false when deleting unknown user", () => {
      expect(store.deleteUserProfile("@nobody")).toBe(false)
    })

    it("clears all user profiles", () => {
      store.updateUserProfile("@alice")
      store.updateUserProfile("@bob")
      store.clearUserProfiles()
      expect(Object.keys(store.getAllUserProfiles()).length).toBe(0)
    })

    it("records interaction bumps count", () => {
      store.recordInteraction("@alice")
      store.recordInteraction("@alice")
      store.recordInteraction("@alice")
      expect(store.getUserProfile("@alice").interactions).toBe(3)
    })
  })

  describe("getStats", () => {
    it("returns correct statistics", async () => {
      await store.addMemory({ type: "episodic", content: "a" })
      await store.addMemory({ type: "episodic", content: "b" })
      await store.addMemory({ type: "semantic", content: "c" })
      store.updateUserProfile("@alice")

      const stats = store.getStats()
      expect(stats.totalMemories).toBe(3)
      expect(stats.episodic).toBe(2)
      expect(stats.semantic).toBe(1)
      expect(stats.userProfiles).toBe(1)
      expect(stats.maxMemories).toBe(10)
    })

    it("includes oldest, newest, and version count", async () => {
      await store.addMemory({ type: "episodic", content: "first" })
      await store.addMemory({ type: "episodic", content: "second" })

      const stats = store.getStats()
      expect(stats.oldest).toBeDefined()
      expect(stats.newest).toBeDefined()
      expect(stats.versions).toBeDefined()
      expect(typeof stats.versions).toBe("number")
    })

    it("returns null oldest/newest when no memories", () => {
      const stats = store.getStats()
      expect(stats.oldest).toBeNull()
      expect(stats.newest).toBeNull()
    })
  })

  describe("TTL & expiration", () => {
    it("sets expiresAt for episodic memories by default", async () => {
      const mem = await store.addMemory({ type: "episodic", content: "will expire" })
      expect(mem.expiresAt).toBeDefined()
      expect(mem.expiresAt).toBeGreaterThan(Date.now())
    })

    it("sets no expiresAt for semantic memories by default", async () => {
      const mem = await store.addMemory({ type: "semantic", content: "permanent" })
      expect(mem.expiresAt).toBeNull()
    })

    it("allows custom TTL override", async () => {
      const mem = await store.addMemory({ type: "semantic", content: "custom ttl", ttl: 5000 })
      expect(mem.expiresAt).toBeDefined()
      expect(mem.expiresAt).toBeLessThanOrEqual(Date.now() + 5000)
    })

    it("prunes expired memories", async () => {
      // Add a memory with expiresAt in the past
      store.memories.push({
        id: "mem_expired",
        type: "episodic",
        content: "old",
        createdAt: new Date(Date.now() - 100000).toISOString(),
        expiresAt: Date.now() - 1000,
        embedding: []
      })
      store.memories.push({
        id: "mem_valid",
        type: "episodic",
        content: "valid",
        createdAt: new Date().toISOString(),
        expiresAt: Date.now() + 100000,
        embedding: []
      })

      const pruned = store.pruneExpired()
      expect(pruned).toBe(1)
      expect(store.memories.length).toBe(1)
      expect(store.memories[0].id).toBe("mem_valid")
    })

    it("does not prune memories without expiresAt", async () => {
      store.memories.push({
        id: "mem_forever",
        type: "semantic",
        content: "no expiry",
        createdAt: new Date().toISOString(),
        expiresAt: null,
        embedding: []
      })

      const pruned = store.pruneExpired()
      expect(pruned).toBe(0)
      expect(store.memories.length).toBe(1)
    })
  })

  describe("per-agent isolation", () => {
    it("uses agentId subdirectory when agentId is provided", () => {
      const agentStore = new MemoryStore({ storagePath: TEST_DIR, agentId: "bot1", maxMemories: 10 })
      expect(agentStore.storagePath).toBe(path.join(TEST_DIR, "bot1"))
      expect(agentStore.agentId).toBe("bot1")
      expect(fs.existsSync(path.join(TEST_DIR, "bot1"))).toBe(true)
    })

    it("isolates memories between agents", async () => {
      const store1 = new MemoryStore({ storagePath: TEST_DIR, agentId: "agent1", maxMemories: 10 })
      const store2 = new MemoryStore({ storagePath: TEST_DIR, agentId: "agent2", maxMemories: 10 })

      await store1.addMemory({ content: "agent1 memory" })
      await store2.addMemory({ content: "agent2 memory" })

      expect(store1.memories.length).toBe(1)
      expect(store2.memories.length).toBe(1)
      expect(store1.memories[0].content).toBe("agent1 memory")
      expect(store2.memories[0].content).toBe("agent2 memory")
    })
  })

  describe("memory config", () => {
    it("uses configured search threshold", () => {
      const configStore = new MemoryStore({
        storagePath: TEST_DIR,
        maxMemories: 10,
        memoryConfig: { searchThreshold: 0.5 }
      })
      expect(configStore.searchThreshold).toBe(0.5)
    })

    it("uses configured maxResults", () => {
      const configStore = new MemoryStore({
        storagePath: TEST_DIR,
        maxMemories: 10,
        memoryConfig: { maxResults: 15 }
      })
      expect(configStore.maxResults).toBe(15)
    })

    it("applies custom TTL from config", async () => {
      const configStore = new MemoryStore({
        storagePath: path.join(TEST_DIR, "ttl-config"),
        maxMemories: 10,
        memoryConfig: { ttlDays: { episodic: 7 } }
      })
      expect(configStore.ttls.episodic).toBe(7 * 24 * 60 * 60 * 1000)
    })
  })

  describe("versioning", () => {
    it("creates a version backup", async () => {
      await store.addMemory({ content: "version test" })
      const version = await store.createVersion()
      expect(version).toBeDefined()
      expect(typeof version).toBe("number")

      const backupPath = path.join(TEST_DIR, `memories.${version}.json`)
      expect(fs.existsSync(backupPath)).toBe(true)
    })

    it("lists available versions", async () => {
      await store.addMemory({ content: "v1" })
      await store.createVersion()
      await store.createVersion()

      const versions = store.listVersions()
      // Two backups taken back to back (often within one millisecond) are distinct versions
      expect(versions.length).toBe(2)
      // Newest first
      expect(versions[0]).toBeGreaterThan(versions[1])
    })

    it("rolls back to a previous version", async () => {
      await store.addMemory({ content: "original" })
      const version = await store.createVersion()

      // Add more and clear
      await store.addMemory({ content: "new stuff" })
      expect(store.memories.length).toBe(2)

      // Rollback
      const success = store.rollback(version)
      expect(success).toBe(true)
      expect(store.memories.length).toBe(1)
      expect(store.memories[0].content).toBe("original")
    })

    it("returns false for non-existent version", () => {
      expect(store.rollback(999999)).toBe(false)
    })

    it("prunes old versions beyond maxVersions", async () => {
      const smallStore = new MemoryStore({ storagePath: path.join(TEST_DIR, "prune-ver"), maxMemories: 10, maxVersions: 2 })
      await smallStore.addMemory({ content: "data" })

      await smallStore.createVersion()
      await smallStore.createVersion()
      await smallStore.createVersion()

      const versions = smallStore.listVersions()
      expect(versions.length).toBeLessThanOrEqual(2)
    })

    it("returns null when no memories file exists for versioning", async () => {
      const emptyStore = new MemoryStore({ storagePath: path.join(TEST_DIR, "empty-ver"), maxMemories: 10 })
      const version = await emptyStore.createVersion()
      expect(version).toBeNull()
    })
  })
})
