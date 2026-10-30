// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 nirholas (https://github.com/nirholas/xspace-agent)

const fs = require("fs")
const crypto = require("crypto")
const path = require("path")
const { nanoid } = require("nanoid")
const { logger } = require("../src/server/logger")
const { getEmbeddings, getEmbedding, findSimilar, cosineSimilarity } = require("./embeddings")

const DEFAULT_KNOWLEDGE_PATH = path.join(__dirname, "..", "knowledge")
const DEFAULT_INDEX_PATH = path.join(__dirname, "..", "memory", "kb-index.json")

const INDEX_VERSION = 2

const SUPPORTED_EXTENSIONS = new Set([".md", ".txt", ".json", ".csv", ".html"])

// ── Document Parsers ──────────────────────────────────────────

function parsePlainText(content) {
  return content
}

function parseMarkdown(content) {
  return content
}

function parseJSON(content) {
  try {
    const parsed = JSON.parse(content)
    return JSON.stringify(parsed, null, 2)
  } catch {
    return content
  }
}

function parseCSV(content) {
  const lines = content.split("\n").filter(l => l.trim())
  if (lines.length === 0) return ""

  const headers = lines[0].split(",").map(h => h.trim())
  const rows = lines.slice(1)

  return rows.map(row => {
    const values = row.split(",").map(v => v.trim())
    return headers.map((h, i) => `${h}: ${values[i] || ""}`).join(", ")
  }).join("\n")
}

function parseHTML(content) {
  // Strip script and style blocks
  let text = content.replace(/<script[\s\S]*?<\/script>/gi, "")
  text = text.replace(/<style[\s\S]*?<\/style>/gi, "")
  // Strip nav, footer, header elements (non-content)
  text = text.replace(/<nav[\s\S]*?<\/nav>/gi, "")
  text = text.replace(/<footer[\s\S]*?<\/footer>/gi, "")
  // Replace block-level tags with newlines
  text = text.replace(/<\/(p|div|h[1-6]|li|tr|br|hr)[^>]*>/gi, "\n")
  text = text.replace(/<br\s*\/?>/gi, "\n")
  // Strip remaining tags
  text = text.replace(/<[^>]+>/g, " ")
  // Decode common HTML entities
  text = text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  text = text.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
  // Normalize whitespace
  text = text.replace(/[ \t]+/g, " ")
  text = text.replace(/\n{3,}/g, "\n\n")
  return text.trim()
}

const PARSERS = {
  ".md": parseMarkdown,
  ".txt": parsePlainText,
  ".json": parseJSON,
  ".csv": parseCSV,
  ".html": parseHTML,
}

// ── Preprocessing ─────────────────────────────────────────────

function preprocessText(text) {
  // Normalize Unicode (NFKC)
  let result = text.normalize("NFKC")
  // Normalize whitespace (preserve newlines)
  result = result.replace(/[ \t]+/g, " ")
  // Remove duplicate blank lines
  result = result.replace(/\n{3,}/g, "\n\n")
  return result.trim()
}

function extractHeaders(text, format) {
  const headers = []
  if (format === ".md" || format === ".html") {
    const headerRegex = /^(#{1,6})\s+(.+)$/gm
    let match
    while ((match = headerRegex.exec(text)) !== null) {
      headers.push({ level: match[1].length, text: match[2].trim() })
    }
  }
  return headers
}

// ── Chunking Strategies ───────────────────────────────────────

function splitSentences(text) {
  // Split on sentence boundaries: period/question/exclamation followed by space or newline
  const parts = text.split(/(?<=[.!?])\s+/)
  return parts.filter(s => s.trim().length > 0)
}

function combineSentencesIntoChunks(sentences, chunkSize, overlap) {
  const wordsPerChunk = Math.floor(chunkSize * 0.75)
  const overlapWords = Math.floor(overlap * 0.75)
  const chunks = []
  let currentChunk = []
  let currentWordCount = 0

  for (const sentence of sentences) {
    const sentenceWords = sentence.split(/\s+/).length
    if (currentWordCount + sentenceWords > wordsPerChunk && currentChunk.length > 0) {
      chunks.push(currentChunk.join(" "))

      // Build overlap from end of current chunk
      const allWords = currentChunk.join(" ").split(/\s+/)
      const overlapText = allWords.slice(-overlapWords).join(" ")
      currentChunk = overlapText ? [overlapText] : []
      currentWordCount = overlapText ? overlapWords : 0
    }
    currentChunk.push(sentence)
    currentWordCount += sentenceWords
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(" "))
  }

  return chunks.length > 0 ? chunks : [sentences.join(" ")]
}

function chunkByParagraphs(text, chunkSize, overlap) {
  const wordsPerChunk = Math.floor(chunkSize * 0.75)
  // A single paragraph larger than one chunk is windowed so no chunk balloons past the limit
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim()).flatMap(p =>
    p.trim().split(/\s+/).length > wordsPerChunk ? chunkByWordWindows(p, chunkSize, overlap) : [p]
  )
  const overlapWords = Math.floor(overlap * 0.75)
  const chunks = []
  let currentGroup = []
  let currentWordCount = 0

  for (const para of paragraphs) {
    const paraWords = para.trim().split(/\s+/).length
    if (currentWordCount + paraWords > wordsPerChunk && currentGroup.length > 0) {
      chunks.push(currentGroup.join("\n\n"))

      // Overlap: take last paragraph words
      const allWords = currentGroup.join("\n\n").split(/\s+/)
      const overlapText = allWords.slice(-overlapWords).join(" ")
      currentGroup = overlapText ? [overlapText] : []
      currentWordCount = overlapText ? overlapWords : 0
    }
    currentGroup.push(para.trim())
    currentWordCount += paraWords
  }

  if (currentGroup.length > 0) {
    chunks.push(currentGroup.join("\n\n"))
  }

  return chunks.length > 0 ? chunks : [text]
}

/**
 * Split text into fixed-size, overlapping word windows. Last resort for text with no
 * paragraph or sentence structure to split on.
 */
function chunkByWordWindows(text, chunkSize, overlap) {
  const words = text.split(/\s+/).filter(Boolean)
  const wordsPerChunk = Math.max(1, Math.floor(chunkSize * 0.75))
  // The window must always advance, even if the overlap is configured >= the chunk size.
  const overlapWords = Math.min(Math.floor(overlap * 0.75), wordsPerChunk - 1)
  const chunks = []

  let start = 0
  while (start < words.length) {
    const end = Math.min(start + wordsPerChunk, words.length)
    chunks.push(words.slice(start, end).join(" "))
    if (end >= words.length) break
    start = end - overlapWords
  }

  return chunks.length > 0 ? chunks : [text]
}

/**
 * Break a block that is bigger than one chunk (for example a markdown section with no
 * sub-headers) into chunk-sized pieces: by paragraph first, then by word window for any
 * paragraph that is still too large.
 */
function splitOversizedBlock(text, chunkSize, overlap) {
  const wordsPerChunk = Math.floor(chunkSize * 0.75)
  const wordCount = text.split(/\s+/).filter(Boolean).length
  if (wordCount <= wordsPerChunk) return [text]

  return chunkByParagraphs(text, chunkSize, overlap).flatMap(piece =>
    piece.split(/\s+/).filter(Boolean).length > wordsPerChunk
      ? chunkByWordWindows(piece, chunkSize, overlap)
      : [piece]
  )
}

function chunkMarkdown(text, chunkSize, overlap) {
  const wordsPerChunk = Math.floor(chunkSize * 0.75)
  const overlapWords = Math.floor(overlap * 0.75)

  // Split into sections by headers, preserving code blocks and lists
  const sections = []
  let currentSection = []

  const lines = text.split("\n")
  let inCodeBlock = false

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      inCodeBlock = !inCodeBlock
      currentSection.push(line)
      continue
    }

    // Split on headers only when not in a code block
    if (!inCodeBlock && /^#{1,6}\s+/.test(line) && currentSection.length > 0) {
      sections.push(currentSection.join("\n"))
      currentSection = [line]
    } else {
      currentSection.push(line)
    }
  }
  if (currentSection.length > 0) {
    sections.push(currentSection.join("\n"))
  }

  // Now chunk sections, keeping small sections together. A section larger than one
  // chunk (a long run of prose under a single header) is split first, otherwise it
  // would be embedded as one oversized chunk.
  const chunks = []
  let group = []
  let groupWordCount = 0

  const units = sections.flatMap(section => splitOversizedBlock(section, chunkSize, overlap))

  for (const section of units) {
    const sectionWords = section.split(/\s+/).length
    if (groupWordCount + sectionWords > wordsPerChunk && group.length > 0) {
      chunks.push(group.join("\n\n"))
      const allWords = group.join("\n\n").split(/\s+/)
      const overlapText = allWords.slice(-overlapWords).join(" ")
      group = overlapText ? [overlapText] : []
      groupWordCount = overlapText ? overlapWords : 0
    }
    group.push(section)
    groupWordCount += sectionWords
  }

  if (group.length > 0) {
    chunks.push(group.join("\n\n"))
  }

  return chunks.length > 0 ? chunks : [text]
}

// ── BM25-like Keyword Search ──────────────────────────────────

function tokenize(text) {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 1)
}

function computeIDF(term, chunks) {
  const docsWithTerm = chunks.filter(c => tokenize(c.content).includes(term)).length
  if (docsWithTerm === 0) return 0
  return Math.log((chunks.length - docsWithTerm + 0.5) / (docsWithTerm + 0.5) + 1)
}

function bm25Score(queryTerms, chunkContent, avgDocLen, chunks) {
  const k1 = 1.2
  const b = 0.75
  const docTokens = tokenize(chunkContent)
  const docLen = docTokens.length

  let score = 0
  for (const term of queryTerms) {
    const tf = docTokens.filter(t => t === term).length
    const idf = computeIDF(term, chunks)
    const numerator = tf * (k1 + 1)
    const denominator = tf + k1 * (1 - b + b * (docLen / avgDocLen))
    score += idf * (numerator / denominator)
  }
  return score
}

// ── Content Hashing ───────────────────────────────────────────

function contentHash(text) {
  return crypto.createHash("sha256").update(text).digest("hex")
}

function fileHash(filePath) {
  const content = fs.readFileSync(filePath)
  return crypto.createHash("sha256").update(content).digest("hex")
}

// ── KnowledgeBase Class ───────────────────────────────────────

class KnowledgeBase {
  /**
   * @param {object} opts
   * @param {string} [opts.directory] - Path to knowledge documents
   * @param {string} [opts.indexPath] - Path to store the chunk index
   * @param {number} [opts.chunkSize=500] - Approximate tokens per chunk
   * @param {number} [opts.chunkOverlap=50] - Overlap tokens between chunks
   * @param {number} [opts.maxRetrievedChunks=3] - Max chunks per query
   */
  constructor(opts = {}) {
    this.directory = opts.directory || DEFAULT_KNOWLEDGE_PATH
    this.indexPath = opts.indexPath || DEFAULT_INDEX_PATH
    this.chunkSize = opts.chunkSize || 500
    this.chunkOverlap = opts.chunkOverlap || 50
    this.maxRetrievedChunks = opts.maxRetrievedChunks || 3

    // chunks: [{ id, docName, chunkIndex, content, contentHash, embedding, section }]
    this.chunks = []
    // documents: { docName: { name, path, chunksCount, indexedAt, fileHash, headers, tags } }
    this.documents = {}
    // embeddingCache: { contentHash: embedding }
    this.embeddingCache = {}
    this.indexVersion = INDEX_VERSION
    this.lastReindexAt = null

    this._ensureDirs()
    this._loadIndex()
  }

  _ensureDirs() {
    if (!fs.existsSync(this.directory)) {
      fs.mkdirSync(this.directory, { recursive: true })
    }
    const indexDir = path.dirname(this.indexPath)
    if (!fs.existsSync(indexDir)) {
      fs.mkdirSync(indexDir, { recursive: true })
    }
  }

  _loadIndex() {
    try {
      if (fs.existsSync(this.indexPath)) {
        const data = JSON.parse(fs.readFileSync(this.indexPath, "utf-8"))

        // Check index version — rebuild if outdated
        if (data.version && data.version >= INDEX_VERSION) {
          this.chunks = data.chunks || []
          this.documents = data.documents || {}
          this.embeddingCache = data.embeddingCache || {}
          this.lastReindexAt = data.lastReindexAt || null
          logger.info({ docs: Object.keys(this.documents).length, chunks: this.chunks.length }, "Loaded knowledge base index")
        } else {
          logger.info({ oldVersion: data.version, newVersion: INDEX_VERSION }, "Index version outdated, will rebuild on next ingest")
          this.chunks = []
          this.documents = {}
          this.embeddingCache = data.embeddingCache || {}
        }
      }
    } catch (err) {
      logger.error({ err: err.message }, "Failed to load KB index")
      this.chunks = []
      this.documents = {}
      this.embeddingCache = {}
    }
  }

  _saveIndex() {
    try {
      fs.writeFileSync(this.indexPath, JSON.stringify({
        version: INDEX_VERSION,
        lastReindexAt: this.lastReindexAt,
        chunks: this.chunks,
        documents: this.documents,
        embeddingCache: this.embeddingCache
      }, null, 2))
    } catch (err) {
      logger.error({ err: err.message }, "Failed to save KB index")
    }
  }

  // ── Document Chunking ─────────────────────────────────────────

  /**
   * Split text into overlapping chunks of ~chunkSize tokens.
   * Uses a simple word-based approximation (1 token ≈ 0.75 words).
   */
  _chunkText(text, format = ".txt") {
    if (format === ".md") {
      return chunkMarkdown(text, this.chunkSize, this.chunkOverlap)
    }

    // Paragraph-aware: if text has paragraph breaks, use paragraph chunking
    if (text.includes("\n\n")) {
      return chunkByParagraphs(text, this.chunkSize, this.chunkOverlap)
    }

    // Sentence-aware chunking
    const sentences = splitSentences(text)
    if (sentences.length > 1) {
      return combineSentencesIntoChunks(sentences, this.chunkSize, this.chunkOverlap)
    }

    // Fallback: word-based chunking
    return chunkByWordWindows(text, this.chunkSize, this.chunkOverlap)
  }

  /**
   * Read and chunk a document file.
   * @param {string} filePath
   * @returns {{ name: string, chunks: string[], format: string, headers: object[], hash: string }}
   */
  _readAndChunk(filePath) {
    const ext = path.extname(filePath).toLowerCase()
    const name = path.basename(filePath)

    if (!SUPPORTED_EXTENSIONS.has(ext)) {
      throw new Error(`Unsupported file type: ${ext}`)
    }

    const rawContent = fs.readFileSync(filePath, "utf-8")
    const hash = contentHash(rawContent)

    // Parse based on format
    const parser = PARSERS[ext] || parsePlainText
    let content = parser(rawContent)

    // Preprocess
    content = preprocessText(content)

    // Extract headers for metadata
    const headers = extractHeaders(content, ext)

    return { name, chunks: this._chunkText(content, ext), format: ext, headers, hash }
  }

  // ── Embedding Cache ─────────────────────────────────────────

  _getCachedEmbedding(hash) {
    return this.embeddingCache[hash] || null
  }

  _setCachedEmbedding(hash, embedding) {
    this.embeddingCache[hash] = embedding
  }

  _cleanCache() {
    const activeHashes = new Set(this.chunks.map(c => c.contentHash).filter(Boolean))
    for (const key of Object.keys(this.embeddingCache)) {
      if (!activeHashes.has(key)) {
        delete this.embeddingCache[key]
      }
    }
  }

  // ── Ingestion ─────────────────────────────────────────────────

  /**
   * Ingest a single document: chunk it, embed chunks, add to index.
   * Skips re-embedding if the file hasn't changed (by hash).
   * @param {string} filePath - Absolute or relative path to document
   * @returns {Promise<{ name: string, chunksCount: number }>}
   */
  async ingestDocument(filePath) {
    const absPath = path.isAbsolute(filePath) ? filePath : path.join(this.directory, filePath)
    const { name, chunks, format, headers, hash } = this._readAndChunk(absPath)

    // Check if document hasn't changed
    const existing = this.documents[name]
    if (existing && existing.fileHash === hash) {
      logger.info({ doc: name }, "Document unchanged, skipping re-ingestion")
      return { name, chunksCount: existing.chunksCount }
    }

    // Remove existing chunks for this document
    this.chunks = this.chunks.filter(c => c.docName !== name)

    // Embed all chunks in batches of 20, using cache where possible
    const BATCH_SIZE = 20
    const newChunks = []

    // Separate cached vs uncached chunks
    const chunkData = chunks.map(text => ({
      text,
      hash: contentHash(text),
    }))

    const uncachedIndices = []
    const uncachedTexts = []
    for (let i = 0; i < chunkData.length; i++) {
      if (!this._getCachedEmbedding(chunkData[i].hash)) {
        uncachedIndices.push(i)
        uncachedTexts.push(chunkData[i].text)
      }
    }

    // Batch-embed only uncached chunks
    const freshEmbeddings = {}
    for (let i = 0; i < uncachedTexts.length; i += BATCH_SIZE) {
      const batch = uncachedTexts.slice(i, i + BATCH_SIZE)
      const batchIndices = uncachedIndices.slice(i, i + BATCH_SIZE)
      try {
        const embeddings = await getEmbeddings(batch)
        for (let j = 0; j < batch.length; j++) {
          const idx = batchIndices[j]
          freshEmbeddings[idx] = embeddings[j] || []
          if (embeddings[j] && embeddings[j].length > 0) {
            this._setCachedEmbedding(chunkData[idx].hash, embeddings[j])
          }
        }
      } catch (err) {
        logger.warn({ err: err.message, doc: name, batch: i }, "Failed to embed batch, storing without embeddings")
        for (let j = 0; j < batch.length; j++) {
          freshEmbeddings[batchIndices[j]] = []
        }
      }
    }

    // Build chunk objects with embeddings (cached or fresh)
    for (let i = 0; i < chunkData.length; i++) {
      const embedding = this._getCachedEmbedding(chunkData[i].hash) || freshEmbeddings[i] || []
      newChunks.push({
        id: `chunk_${nanoid(10)}`,
        docName: name,
        chunkIndex: i,
        content: chunkData[i].text,
        contentHash: chunkData[i].hash,
        embedding,
      })
    }

    this.chunks.push(...newChunks)
    this.documents[name] = {
      name,
      path: absPath,
      chunksCount: newChunks.length,
      indexedAt: new Date().toISOString(),
      fileHash: hash,
      headers,
      tags: existing?.tags || [],
    }

    this._saveIndex()
    logger.info({ doc: name, chunks: newChunks.length, cached: chunkData.length - uncachedTexts.length }, "Document ingested")
    return { name, chunksCount: newChunks.length }
  }

  /**
   * Ingest all supported documents from the knowledge directory.
   * @returns {Promise<{ ingested: number, total_chunks: number }>}
   */
  async ingestAll() {
    if (!fs.existsSync(this.directory)) {
      return { ingested: 0, total_chunks: 0 }
    }

    const files = fs.readdirSync(this.directory)
      .filter(f => SUPPORTED_EXTENSIONS.has(path.extname(f).toLowerCase()))

    let ingested = 0
    for (const file of files) {
      try {
        await this.ingestDocument(file)
        ingested++
      } catch (err) {
        logger.error({ err: err.message, file }, "Failed to ingest document")
      }
    }

    this.lastReindexAt = new Date().toISOString()
    this._cleanCache()
    this._saveIndex()
    return { ingested, total_chunks: this.chunks.length }
  }

  /**
   * Force-rebuild the entire index, ignoring file hashes.
   * @returns {Promise<{ ingested: number, total_chunks: number }>}
   */
  async reindex() {
    // Clear documents so hash check is bypassed
    this.documents = {}
    this.chunks = []
    const result = await this.ingestAll()
    return result
  }

  // ── Retrieval ─────────────────────────────────────────────────

  /**
   * BM25-like keyword search across chunks.
   */
  keywordSearch(query, candidates, topK = 10) {
    const queryTerms = tokenize(query)
    if (queryTerms.length === 0) return []

    const totalWords = candidates.reduce((sum, c) => sum + tokenize(c.content).length, 0)
    const avgDocLen = candidates.length > 0 ? totalWords / candidates.length : 1

    const scored = candidates.map(chunk => ({
      item: chunk,
      score: bm25Score(queryTerms, chunk.content, avgDocLen, candidates)
    }))
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)

    return scored
  }

  /**
   * Deduplicate results: if two chunks from the same document are very similar, keep the higher-scored one.
   */
  _deduplicateResults(results, similarityThreshold = 0.95) {
    const deduped = []
    for (const result of results) {
      const isDupe = deduped.some(existing =>
        existing.docName === result.docName &&
        existing.embedding?.length > 0 &&
        result.embedding?.length > 0 &&
        cosineSimilarity(existing.embedding, result.embedding) > similarityThreshold
      )
      if (!isDupe) {
        deduped.push(result)
      }
    }
    return deduped
  }

  /**
   * Search knowledge base by semantic similarity, with optional hybrid keyword matching.
   * @param {string} query
   * @param {object} [opts]
   * @param {number} [opts.limit] - Override maxRetrievedChunks
   * @param {number} [opts.threshold=0.3] - Minimum similarity
   * @param {string} [opts.docName] - Filter to specific document
   * @param {string[]} [opts.tags] - Filter by document tags
   * @param {boolean} [opts.hybrid=true] - Combine semantic + keyword search
   * @returns {Promise<{ content: string, docName: string, chunkIndex: number, score: number, section: string|null }[]>}
   */
  async search(query, opts = {}) {
    const limit = opts.limit || this.maxRetrievedChunks
    const threshold = opts.threshold ?? 0.3
    const hybrid = opts.hybrid !== false

    let candidates = this.chunks
    if (opts.docName) {
      candidates = candidates.filter(c => c.docName === opts.docName)
    }
    if (opts.tags && opts.tags.length > 0) {
      const tagSet = new Set(opts.tags)
      const matchingDocs = new Set(
        Object.values(this.documents)
          .filter(d => d.tags && d.tags.some(t => tagSet.has(t)))
          .map(d => d.name)
      )
      candidates = candidates.filter(c => matchingDocs.has(c.docName))
    }

    if (candidates.length === 0) return []

    const hasEmbeddings = candidates.some(c => c.embedding?.length > 0)

    try {
      let mergedScores = new Map() // chunk id -> { item, score }

      // Semantic search
      if (hasEmbeddings) {
        const queryEmbedding = await getEmbedding(query)
        const semanticResults = findSimilar(queryEmbedding, candidates, limit * 2, threshold)
        for (const r of semanticResults) {
          mergedScores.set(r.item.id, { item: r.item, score: r.score, embedding: r.item.embedding })
        }
      }

      // Keyword search (hybrid)
      if (hybrid) {
        const keywordResults = this.keywordSearch(query, candidates, limit * 2)

        // Normalize keyword scores to 0-1 range
        const maxKw = keywordResults.length > 0 ? keywordResults[0].score : 1
        for (const r of keywordResults) {
          const normalizedScore = maxKw > 0 ? r.score / maxKw : 0
          const existing = mergedScores.get(r.item.id)
          if (existing) {
            // Combine: 70% semantic, 30% keyword
            existing.score = existing.score * 0.7 + normalizedScore * 0.3
          } else {
            mergedScores.set(r.item.id, {
              item: r.item,
              score: normalizedScore * 0.3, // keyword-only gets 30% weight
              embedding: r.item.embedding,
            })
          }
        }
      }

      let results = Array.from(mergedScores.values())
        .filter(r => r.score >= threshold)
        .sort((a, b) => b.score - a.score)

      // Deduplicate similar chunks from the same document
      results = this._deduplicateResults(results)

      results = results.slice(0, limit)

      // Find the section header for each result
      return results.map(r => {
        const doc = this.documents[r.item.docName]
        let section = null
        if (doc && doc.headers && doc.headers.length > 0) {
          // Find the nearest header before this chunk's content
          for (const h of doc.headers) {
            if (r.item.content.includes(h.text)) {
              section = h.text
              break
            }
          }
        }
        return {
          content: r.item.content,
          docName: r.item.docName,
          chunkIndex: r.item.chunkIndex,
          score: Math.round(r.score * 1000) / 1000,
          section,
        }
      })
    } catch (err) {
      logger.error({ err: err.message }, "Knowledge base search failed")
      return []
    }
  }

  // ── Management ────────────────────────────────────────────────

  /**
   * Remove a document and its chunks from the index.
   */
  removeDocument(docName) {
    this.chunks = this.chunks.filter(c => c.docName !== docName)
    delete this.documents[docName]
    this._cleanCache()
    this._saveIndex()
    logger.info({ doc: docName }, "Document removed from knowledge base")
  }

  /**
   * List all indexed documents.
   */
  listDocuments() {
    return Object.values(this.documents)
  }

  /**
   * Get details for a specific document.
   */
  getDocument(docName) {
    return this.documents[docName] || null
  }

  /**
   * Set tags on a document for filtering.
   */
  setDocumentTags(docName, tags) {
    if (this.documents[docName]) {
      this.documents[docName].tags = tags
      this._saveIndex()
    }
  }

  /**
   * Check which documents have changed on disk since last indexing.
   * @returns {string[]} Names of changed documents
   */
  getChangedDocuments() {
    const changed = []
    for (const [name, doc] of Object.entries(this.documents)) {
      try {
        if (!fs.existsSync(doc.path)) {
          changed.push(name)
          continue
        }
        const currentHash = fileHash(doc.path)
        if (currentHash !== doc.fileHash) {
          changed.push(name)
        }
      } catch {
        changed.push(name)
      }
    }
    return changed
  }

  /**
   * Clear the entire index.
   */
  clearIndex() {
    this.chunks = []
    this.documents = {}
    this.embeddingCache = {}
    this.lastReindexAt = null
    this._saveIndex()
    logger.info("Knowledge base index cleared")
  }

  /**
   * Get stats about the knowledge base.
   */
  getStats() {
    return {
      documents: Object.keys(this.documents).length,
      chunks: this.chunks.length,
      directory: this.directory,
      supportedFormats: [...SUPPORTED_EXTENSIONS],
      indexVersion: INDEX_VERSION,
      lastReindexAt: this.lastReindexAt,
      embeddingCacheSize: Object.keys(this.embeddingCache).length,
    }
  }
}

module.exports = { KnowledgeBase, splitSentences, combineSentencesIntoChunks, chunkByParagraphs, chunkMarkdown, parseCSV, parseHTML, preprocessText, extractHeaders, tokenize, bm25Score }
