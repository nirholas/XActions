#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 nirholas (https://github.com/nirholas/xspace-agent)

/**
 * Migration script: encrypt existing plain JSON data files at rest.
 *
 * Usage:
 *   ENCRYPTION_KEY=your-secret-key node scripts/encrypt-existing-data.js
 *
 * What it does:
 *   1. Scans memory/ and knowledge/ directories for plain JSON files
 *   2. Reads each file, encrypts it with AES-256-GCM, writes it back
 *   3. Skips files that are already encrypted (magic header check)
 *   4. Creates a .bak backup of each file before encrypting
 *
 * To rollback:
 *   Rename .bak files back to their original names.
 */

const fs = require("fs")
const path = require("path")
const { FileEncryption } = require("../lib/encryption")
const { EncryptedFileStore, MAGIC_HEADER, HEADER_LENGTH } = require("../lib/encrypted-store")

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY
if (!ENCRYPTION_KEY) {
  console.error("Error: ENCRYPTION_KEY environment variable is required")
  console.error("Usage: ENCRYPTION_KEY=your-secret-key node scripts/encrypt-existing-data.js")
  process.exit(1)
}

const ROOT = path.join(__dirname, "..")
const DIRS_TO_SCAN = [
  path.join(ROOT, "memory"),
  path.join(ROOT, "knowledge"),
]

const encryption = new FileEncryption(ENCRYPTION_KEY)
const store = new EncryptedFileStore(encryption)

function isEncrypted(filePath) {
  try {
    const raw = fs.readFileSync(filePath)
    if (raw.length < HEADER_LENGTH) return false
    return raw.subarray(0, HEADER_LENGTH).toString() === MAGIC_HEADER
  } catch {
    return false
  }
}

function findJsonFiles(dir) {
  if (!fs.existsSync(dir)) return []
  const results = []

  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...findJsonFiles(fullPath))
    } else if (entry.name.endsWith(".json")) {
      results.push(fullPath)
    }
  }
  return results
}

let encrypted = 0
let skipped = 0
let failed = 0

for (const dir of DIRS_TO_SCAN) {
  const files = findJsonFiles(dir)
  for (const filePath of files) {
    const rel = path.relative(ROOT, filePath)

    if (isEncrypted(filePath)) {
      console.log(`  SKIP (already encrypted): ${rel}`)
      skipped++
      continue
    }

    try {
      // Read plain JSON
      const raw = fs.readFileSync(filePath, "utf-8")
      const data = JSON.parse(raw)

      // Create backup
      const backupPath = filePath + ".bak"
      fs.copyFileSync(filePath, backupPath)

      // Write encrypted
      store.write(filePath, data)
      encrypted++
      console.log(`  ENCRYPTED: ${rel}`)
    } catch (err) {
      console.error(`  FAILED: ${rel} — ${err.message}`)
      failed++
    }
  }
}

console.log("")
console.log(`Done. Encrypted: ${encrypted}, Skipped: ${skipped}, Failed: ${failed}`)
if (encrypted > 0) {
  console.log("Backup files (.bak) were created. Remove them after verifying encryption works.")
}
