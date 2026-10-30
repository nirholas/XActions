// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 nirholas (https://github.com/nirholas/xspace-agent)

import { describe, it, expect, beforeEach, afterEach } from "vitest"
import fs from "fs"
import path from "path"
import os from "os"

const { FileEncryption } = require("../../lib/encryption")
const { EncryptedFileStore, PlainFileStore, createFileStore, MAGIC_HEADER } = require("../../lib/encrypted-store")

describe("FileEncryption", () => {
  it("encrypts and decrypts a string roundtrip", () => {
    const enc = new FileEncryption("test-key-123")
    const plaintext = "Hello, world! This is secret data."
    const encrypted = enc.encrypt(plaintext)
    const decrypted = enc.decrypt(encrypted)
    expect(decrypted).toBe(plaintext)
  })

  it("encrypts and decrypts JSON roundtrip", () => {
    const enc = new FileEncryption("test-key-456")
    const data = { memories: [{ id: "m1", content: "User likes cats" }], count: 42 }
    const json = JSON.stringify(data)
    const encrypted = enc.encrypt(json)
    const decrypted = enc.decrypt(encrypted)
    expect(JSON.parse(decrypted)).toEqual(data)
  })

  it("produces different ciphertext for the same plaintext (random IV)", () => {
    const enc = new FileEncryption("test-key")
    const plaintext = "same input"
    const a = enc.encrypt(plaintext)
    const b = enc.encrypt(plaintext)
    expect(a.equals(b)).toBe(false)
  })

  it("decrypts correctly regardless of IV variation", () => {
    const enc = new FileEncryption("test-key")
    const plaintext = "same input"
    expect(enc.decrypt(enc.encrypt(plaintext))).toBe(plaintext)
    expect(enc.decrypt(enc.encrypt(plaintext))).toBe(plaintext)
  })

  it("throws on wrong key", () => {
    const enc1 = new FileEncryption("key-one")
    const enc2 = new FileEncryption("key-two")
    const encrypted = enc1.encrypt("secret")
    expect(() => enc2.decrypt(encrypted)).toThrow(/wrong key|corrupted/)
  })

  it("throws on corrupted data", () => {
    const enc = new FileEncryption("test-key")
    const encrypted = enc.encrypt("hello")
    // Corrupt a byte in the ciphertext
    encrypted[encrypted.length - 1] ^= 0xff
    expect(() => enc.decrypt(encrypted)).toThrow(/wrong key|corrupted/)
  })

  it("throws on truncated data", () => {
    const enc = new FileEncryption("test-key")
    expect(() => enc.decrypt(Buffer.alloc(10))).toThrow(/too short/)
  })

  it("throws if master key is empty", () => {
    expect(() => new FileEncryption("")).toThrow(/non-empty/)
    expect(() => new FileEncryption(null)).toThrow(/non-empty/)
  })

  it("handles empty string plaintext", () => {
    const enc = new FileEncryption("test-key")
    const encrypted = enc.encrypt("")
    expect(enc.decrypt(encrypted)).toBe("")
  })

  it("handles unicode plaintext", () => {
    const enc = new FileEncryption("test-key")
    const plaintext = "こんにちは世界 🌍 émojis & spëcial çhars"
    expect(enc.decrypt(enc.encrypt(plaintext))).toBe(plaintext)
  })

  it("handles large plaintext", () => {
    const enc = new FileEncryption("test-key")
    const plaintext = "x".repeat(100_000)
    expect(enc.decrypt(enc.encrypt(plaintext))).toBe(plaintext)
  })
})

describe("EncryptedFileStore", () => {
  let tmpDir

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "enc-test-"))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it("writes encrypted files and reads them back", () => {
    const enc = new FileEncryption("store-key")
    const store = new EncryptedFileStore(enc)
    const filePath = path.join(tmpDir, "data.json")
    const data = { items: [1, 2, 3], name: "test" }

    store.write(filePath, data)
    const result = store.read(filePath)
    expect(result).toEqual(data)
  })

  it("writes files with magic header", () => {
    const enc = new FileEncryption("store-key")
    const store = new EncryptedFileStore(enc)
    const filePath = path.join(tmpDir, "data.json")

    store.write(filePath, { x: 1 })
    const raw = fs.readFileSync(filePath)
    expect(raw.subarray(0, 8).toString()).toBe(MAGIC_HEADER)
  })

  it("detects encrypted files correctly", () => {
    const enc = new FileEncryption("store-key")
    const store = new EncryptedFileStore(enc)
    const encFile = path.join(tmpDir, "enc.json")
    const plainFile = path.join(tmpDir, "plain.json")

    store.write(encFile, { encrypted: true })
    fs.writeFileSync(plainFile, JSON.stringify({ plain: true }))

    expect(store.isEncrypted(fs.readFileSync(encFile))).toBe(true)
    expect(store.isEncrypted(fs.readFileSync(plainFile))).toBe(false)
  })

  it("reads plain JSON files (backward compatible / auto-migration)", () => {
    const enc = new FileEncryption("store-key")
    const store = new EncryptedFileStore(enc)
    const filePath = path.join(tmpDir, "legacy.json")
    const data = { legacy: true, items: ["a", "b"] }

    // Write as plain JSON (simulating pre-encryption data)
    fs.writeFileSync(filePath, JSON.stringify(data))

    // Should read plain JSON without error
    const result = store.read(filePath)
    expect(result).toEqual(data)
  })

  it("throws meaningful error for corrupted encrypted file", () => {
    const enc = new FileEncryption("store-key")
    const store = new EncryptedFileStore(enc)
    const filePath = path.join(tmpDir, "corrupt.json")

    // Write valid encrypted file, then corrupt it
    store.write(filePath, { valid: true })
    const raw = fs.readFileSync(filePath)
    raw[raw.length - 1] ^= 0xff
    fs.writeFileSync(filePath, raw)

    expect(() => store.read(filePath)).toThrow(/Failed to decrypt/)
  })
})

describe("PlainFileStore", () => {
  let tmpDir

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "plain-test-"))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it("reads and writes plain JSON", () => {
    const store = new PlainFileStore()
    const filePath = path.join(tmpDir, "data.json")
    const data = { items: [1, 2, 3] }

    store.write(filePath, data)
    expect(store.read(filePath)).toEqual(data)
  })

  it("isEncrypted always returns false", () => {
    const store = new PlainFileStore()
    expect(store.isEncrypted()).toBe(false)
  })
})

describe("createFileStore", () => {
  it("returns EncryptedFileStore when key provided", () => {
    const store = createFileStore("my-secret-key")
    expect(store).toBeInstanceOf(EncryptedFileStore)
  })

  it("returns PlainFileStore when no key", () => {
    expect(createFileStore(null)).toBeInstanceOf(PlainFileStore)
    expect(createFileStore("")).toBeInstanceOf(PlainFileStore)
    expect(createFileStore(undefined)).toBeInstanceOf(PlainFileStore)
  })
})

describe("Performance", () => {
  // The claim under test is the overhead ENCRYPTION adds, so each operation is compared
  // against the same operation on a PlainFileStore (JSON serialisation and disk I/O are
  // common to both). Medians over many iterations keep one slow disk flush or GC pause
  // from deciding the result.
  function median(values) {
    const sorted = [...values].sort((a, b) => a - b)
    return sorted[Math.floor(sorted.length / 2)]
  }

  function timeEach(iterations, fn) {
    const samples = []
    for (let i = 0; i < iterations; i++) {
      const start = performance.now()
      fn()
      samples.push(performance.now() - start)
    }
    return median(samples)
  }

  it("encryption adds < 5ms per read/write for typical memory files", () => {
    const encrypted = new EncryptedFileStore(new FileEncryption("perf-key"))
    const plain = new PlainFileStore()
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "perf-test-"))
    const encPath = path.join(tmpDir, "perf-enc.json")
    const plainPath = path.join(tmpDir, "perf-plain.json")

    try {
      // Simulate a typical memory file (~100 memories)
      const data = {
        memories: Array.from({ length: 100 }, (_, i) => ({
          id: `mem_${i}`,
          type: "episodic",
          content: `This is memory number ${i} with some content that represents a typical memory entry.`,
          embedding: Array.from({ length: 256 }, () => Math.random()),
          createdAt: new Date().toISOString(),
        })),
      }

      // Warm up both paths (JIT, page cache)
      for (let i = 0; i < 10; i++) {
        encrypted.write(encPath, data)
        encrypted.read(encPath)
        plain.write(plainPath, data)
        plain.read(plainPath)
      }

      const ITERATIONS = 51
      const writeOverhead =
        timeEach(ITERATIONS, () => encrypted.write(encPath, data)) -
        timeEach(ITERATIONS, () => plain.write(plainPath, data))
      const readOverhead =
        timeEach(ITERATIONS, () => encrypted.read(encPath)) -
        timeEach(ITERATIONS, () => plain.read(plainPath))

      expect(writeOverhead).toBeLessThan(5)
      expect(readOverhead).toBeLessThan(5)
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })
})
