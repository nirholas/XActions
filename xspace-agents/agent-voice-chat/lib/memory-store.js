// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 nirholas (https://github.com/nirholas/xspace-agent)

const fs = require("fs")
const path = require("path")
const { nanoid } = require("nanoid")
const { logger } = require("../src/server/logger")
const { getEmbedding, findSimilar } = require("./embeddings")

const DEFAULT_STORAGE_PATH = path.join(__dirname, "..", "memory")
const MAX_MEMORIES = 1000
const MAX_VERSIONS = 5

// Default TTLs in milliseconds (null = no expiry)
const DEFAULT_TTLS = {
  episodic: 30 * 24 * 60 * 60 * 1000,  // 30 days
  semantic: null,                         // no expiry
  user_profile: null                      // no expiry
}

class MemoryStore {
  /**
   * @param {object} opts
   * @param {string} [opts.storagePath] - Directory for JSON files
   * @param {number} [opts.maxMemories] - Max episodic+semantic memories
   * @param {string} [opts.agentId] - Agent ID for per-agent isolation
   * @param {object} [opts.memoryConfig] - Per-agent memory configuration
   * @param {number} [opts.memoryConfig.searchThreshold] - Similarity threshold for search
   * @param {number} [opts.memoryConfig.maxResults] - Max search results
   * @param {object} [opts.memoryConfig.ttlDays] - TTL overrides by type { episodic, semantic }
   * @param {boolean} [opts.memoryConfig.enableCrossAgentSearch] - Allow cross-agent memory search
   * @param {number} [opts.maxVersions] - Max backup versions to keep
   */
  constructor(opts = {}) {
    this.agentId = opts.agentId || null
    this.memoryConfig = opts.memoryConfig || {}
    this.maxVersions = opts.maxVersions || MAX_VERSIONS

    // Resolve storage path: per-agent subdirectory if agentId provided
    const basePath = opts.storagePath || DEFAULT_STORAGE_PATH
    this.storagePath = this.agentId ? path.join(basePath, this.agentId) : basePath
    this.basePath = basePath
    this.maxMemories = opts.maxMemories || MAX_MEMORIES

    // Resolve TTLs from config (ttlDays → milliseconds)
    this.ttls = { ...DEFAULT_TTLS }
    if (this.memoryConfig.ttlDays) {
      if (this.memoryConfig.ttlDays.episodic != null) {
        this.ttls.episodic = this.memoryConfig.ttlDays.episodic * 24 * 60 * 60 * 1000
      }
      if (this.memoryConfig.ttlDays.semantic != null) {
        this.ttls.semantic = this.memoryConfig.ttlDays.semantic * 24 * 60 * 60 * 1000
      }
    }

    // Search defaults
    this.searchThreshold = this.memoryConfig.searchThreshold ?? 0.3
    this.maxResults = this.memoryConfig.maxResults ?? 5
    this.enableCrossAgentSearch = this.memoryConfig.enableCrossAgentSearch ?? false

    // In-memory state
    this.memories = []       // episodic + semantic
    this.userProfiles = {}   // keyed by username

    this._ensureDir()
    this._load()
  }

  _ensureDir() {
    if (!fs.existsSync(this.storagePath)) {
      fs.mkdirSync(this.storagePath, { recursive: true })
    }
  }

  _memoriesPath() {
    return path.join(this.storagePath, "memories.json")
  }

  _usersPath() {
    return path.join(this.storagePath, "users.json")
  }

  _load() {
    try {
      if (fs.existsSync(this._memoriesPath())) {
        this.memories = JSON.parse(fs.readFileSync(this._memoriesPath(), "utf-8"))
        logger.info({ count: this.memories.length, agentId: this.agentId }, "Loaded memories from disk")
      }
    } catch (err) {
      logger.error({ err: err.message }, "Failed to load memories.json")
      this.memories = []
    }

    try {
      if (fs.existsSync(this._usersPath())) {
        this.userProfiles = JSON.parse(fs.readFileSync(this._usersPath(), "utf-8"))
        logger.info({ count: Object.keys(this.userProfiles).length }, "Loaded user profiles from disk")
      }
    } catch (err) {
      logger.error({ err: err.message }, "Failed to load users.json")
      this.userProfiles = {}
    }

    // Prune expired memories on load
    this.pruneExpired()
  }

  _saveMemories() {
    try {
      fs.writeFileSync(this._memoriesPath(), JSON.stringify(this.memories, null, 2))
    } catch (err) {
      logger.error({ err: err.message }, "Failed to save memories.json")
    }
  }

  _saveUsers() {
    try {
      fs.writeFileSync(this._usersPath(), JSON.stringify(this.userProfiles, null, 2))
    } catch (err) {
      logger.error({ err: err.message }, "Failed to save users.json")
    }
  }

  // ── TTL & Expiration ────────────────────────────────────────────

  /**
   * Remove memories that have passed their expiresAt timestamp.
   * @returns {number} Number of memories pruned
   */
  pruneExpired() {
    const now = Date.now()
    const before = this.memories.length
    this.memories = this.memories.filter(m => !m.expiresAt || m.expiresAt > now)
    const pruned = before - this.memories.length
    if (pruned > 0) {
      this._saveMemories()
      logger.info({ pruned, agentId: this.agentId }, "Pruned expired memories")
    }
    return pruned
  }

  // ── Versioning ──────────────────────────────────────────────────

  /**
   * Create a versioned backup of the current memories file.
   * Keeps the last N versions (default 5).
   */
  async createVersion() {
    const memoriesPath = this._memoriesPath()
    if (!fs.existsSync(memoriesPath)) return null

    // Versions are millisecond timestamps used as file names. Two backups taken in the
    // same millisecond must not share a name (the second would silently overwrite the
    // first), so keep versions strictly increasing.
    const latest = this.listVersions()[0] || 0
    const version = Math.max(Date.now(), latest + 1)
    const backupPath = path.join(this.storagePath, `memories.${version}.json`)
    try {
      fs.copyFileSync(memoriesPath, backupPath)
      await this._pruneOldVersions()
      logger.debug({ version, agentId: this.agentId }, "Memory version created")
      return version
    } catch (err) {
      logger.error({ err: err.message }, "Failed to create memory version")
      return null
    }
  }

  /**
   * List available memory versions (timestamps).
   * @returns {number[]} Array of version timestamps, newest first
   */
  listVersions() {
    try {
      const files = fs.readdirSync(this.storagePath)
      return files
        .filter(f => /^memories\.\d+\.json$/.test(f))
        .map(f => parseInt(f.match(/memories\.(\d+)\.json/)[1]))
        .sort((a, b) => b - a)
    } catch {
      return []
    }
  }

  /**
   * Rollback memories to a specific version.
   * @param {number} version - Timestamp of the version to restore
   * @returns {boolean} Success
   */
  rollback(version) {
    const backupPath = path.join(this.storagePath, `memories.${version}.json`)
    if (!fs.existsSync(backupPath)) return false

    try {
      const data = fs.readFileSync(backupPath, "utf-8")
      this.memories = JSON.parse(data)
      this._saveMemories()
      logger.info({ version, agentId: this.agentId }, "Rolled back to memory version")
      return true
    } catch (err) {
      logger.error({ err: err.message }, "Failed to rollback memory version")
      return false
    }
  }

  /**
   * Remove old versions, keeping only the last N.
   */
  async _pruneOldVersions() {
    const versions = this.listVersions()
    if (versions.length <= this.maxVersions) return

    const toRemove = versions.slice(this.maxVersions)
    for (const v of toRemove) {
      try {
        fs.unlinkSync(path.join(this.storagePath, `memories.${v}.json`))
      } catch {
        // ignore cleanup errors
      }
    }
  }

  // ── Episodic & Semantic Memories ──────────────────────────────

  /**
   * Add a new memory. Embedding is computed automatically.
   * @param {object} mem
   * @param {'episodic'|'semantic'} mem.type
   * @param {string} mem.content
   * @param {string} [mem.speaker]
   * @param {string} [mem.spaceUrl]
   * @param {string} [mem.roomId]
   * @param {number} [mem.ttl] - Custom TTL in ms (overrides default)
   * @returns {Promise<object>} The stored memory
   */
  async addMemory(mem) {
    const memType = mem.type || "episodic"
    const ttl = mem.ttl != null ? mem.ttl : this.ttls[memType]

    const memory = {
      id: `mem_${nanoid(10)}`,
      type: memType,
      content: mem.content,
      speaker: mem.speaker || null,
      spaceUrl: mem.spaceUrl || null,
      roomId: mem.roomId || null,
      createdAt: new Date().toISOString(),
      expiresAt: ttl ? Date.now() + ttl : null,
      embedding: []
    }

    try {
      memory.embedding = await getEmbedding(mem.content)
    } catch (err) {
      logger.warn({ err: err.message }, "Failed to embed memory, storing without embedding")
    }

    this.memories.push(memory)

    // Evict oldest if over limit
    if (this.memories.length > this.maxMemories) {
      this.memories = this.memories.slice(-this.maxMemories)
    }

    this._saveMemories()
    logger.debug({ id: memory.id, type: memory.type, agentId: this.agentId }, "Memory added")
    return memory
  }

  /**
   * Search memories by semantic similarity.
   * @param {string} query
   * @param {object} [opts]
   * @param {number} [opts.limit] - Max results (defaults to agent config or 5)
   * @param {string} [opts.speaker] - Filter by speaker
   * @param {'episodic'|'semantic'} [opts.type] - Filter by type
   * @param {number} [opts.threshold] - Min similarity (defaults to agent config or 0.3)
   * @returns {Promise<object[]>}
   */
  async searchMemories(query, opts = {}) {
    const limit = opts.limit ?? this.maxResults
    const threshold = opts.threshold ?? this.searchThreshold
    const { speaker, type } = opts

    // Prune expired before searching
    this.pruneExpired()

    let candidates = this.memories
    if (speaker) {
      candidates = candidates.filter(m => m.speaker === speaker)
    }
    if (type) {
      candidates = candidates.filter(m => m.type === type)
    }

    // If no candidates have embeddings, return empty
    if (!candidates.some(m => m.embedding?.length > 0)) {
      return []
    }

    try {
      const queryEmbedding = await getEmbedding(query)
      const results = findSimilar(queryEmbedding, candidates, limit, threshold)
      return results.map(r => ({ ...r.item, score: r.score }))
    } catch (err) {
      logger.error({ err: err.message }, "Memory search failed")
      return []
    }
  }

  /**
   * Get a memory by ID.
   */
  getMemory(id) {
    return this.memories.find(m => m.id === id) || null
  }

  /**
   * Delete a memory by ID.
   */
  deleteMemory(id) {
    const idx = this.memories.findIndex(m => m.id === id)
    if (idx === -1) return false
    this.memories.splice(idx, 1)
    this._saveMemories()
    return true
  }

  /**
   * Get all memories, optionally filtered.
   */
  getAllMemories(opts = {}) {
    // Prune expired before returning
    this.pruneExpired()
    let result = this.memories
    if (opts.type) result = result.filter(m => m.type === opts.type)
    if (opts.speaker) result = result.filter(m => m.speaker === opts.speaker)
    if (opts.limit) result = result.slice(-opts.limit)
    return result
  }

  /**
   * Clear all memories.
   */
  clearMemories() {
    this.memories = []
    this._saveMemories()
    logger.info("All memories cleared")
  }

  // ── User Profiles ─────────────────────────────────────────────

  /**
   * Get or create a user profile.
   * @param {string} username
   * @returns {object}
   */
  getUserProfile(username) {
    if (!username) return null
    return this.userProfiles[username] || null
  }

  /**
   * Update a user profile, creating it if it doesn't exist.
   * @param {string} username
   * @param {object} updates - Fields to merge
   * @returns {object} Updated profile
   */
  updateUserProfile(username, updates = {}) {
    if (!this.userProfiles[username]) {
      this.userProfiles[username] = {
        username,
        facts: [],
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        interactions: 0
      }
    }

    const profile = this.userProfiles[username]
    profile.lastSeen = new Date().toISOString()
    profile.interactions = (profile.interactions || 0) + 1

    if (updates.facts && Array.isArray(updates.facts)) {
      // Merge new facts, avoiding duplicates
      for (const fact of updates.facts) {
        if (!profile.facts.includes(fact)) {
          profile.facts.push(fact)
        }
      }
      // Cap facts at 50 per user
      if (profile.facts.length > 50) {
        profile.facts = profile.facts.slice(-50)
      }
    }

    this._saveUsers()
    return profile
  }

  /**
   * Add facts to a user profile.
   * @param {string} username
   * @param {string[]} facts
   */
  addUserFacts(username, facts) {
    return this.updateUserProfile(username, { facts })
  }

  /**
   * Record an interaction (bump counter + lastSeen).
   */
  recordInteraction(username) {
    return this.updateUserProfile(username)
  }

  /**
   * Get all user profiles.
   */
  getAllUserProfiles() {
    return { ...this.userProfiles }
  }

  /**
   * Delete a user profile.
   */
  deleteUserProfile(username) {
    if (!this.userProfiles[username]) return false
    delete this.userProfiles[username]
    this._saveUsers()
    return true
  }

  /**
   * Clear all user profiles.
   */
  clearUserProfiles() {
    this.userProfiles = {}
    this._saveUsers()
    logger.info("All user profiles cleared")
  }

  // ── Stats ─────────────────────────────────────────────────────

  getStats() {
    const episodic = this.memories.filter(m => m.type === "episodic").length
    const semantic = this.memories.filter(m => m.type === "semantic").length
    const oldest = this.memories.length > 0
      ? this.memories.reduce((min, m) => m.createdAt < min ? m.createdAt : min, this.memories[0].createdAt)
      : null
    const newest = this.memories.length > 0
      ? this.memories.reduce((max, m) => m.createdAt > max ? m.createdAt : max, this.memories[0].createdAt)
      : null
    const expiredCount = this.memories.filter(m => m.expiresAt && m.expiresAt <= Date.now()).length

    return {
      totalMemories: this.memories.length,
      episodic,
      semantic,
      userProfiles: Object.keys(this.userProfiles).length,
      maxMemories: this.maxMemories,
      storagePath: this.storagePath,
      agentId: this.agentId,
      oldest,
      newest,
      expiredCount,
      versions: this.listVersions().length
    }
  }
}

module.exports = { MemoryStore }
