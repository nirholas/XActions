#!/usr/bin/env node
// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Write browser/index.json and the legacy mirrors from the browser/ scripts.
 *
 * Each browser console script has one canonical file in browser/. Its header
 * and CONFIG object describe it; this builder reads them into the manifest
 * that every other script list in the repository reads (the docs catalog, the
 * script pages, the command center, Ask, the scripts API).
 *
 * Old paths keep working: every path a canonical script lists in @aliases is
 * rewritten as a byte copy of it with one generated line in front, so a raw
 * GitHub URL someone saved still pastes and runs.
 *
 * Usage:
 *   node scripts/build-script-manifest.mjs           # write index.json and the mirrors
 *   node scripts/build-script-manifest.mjs --check   # exit 1 if anything is stale
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildScriptManifest, serializeManifest } from './lib/script-manifest.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = 'browser/index.json';
const check = process.argv.includes('--check');

const { manifest, mirrors, problems } = buildScriptManifest(ROOT);

if (problems.length) {
  console.error(`Browser script manifest: ${problems.length} problem(s)\n  ${problems.join('\n  ')}`);
  process.exit(1);
}

const outputs = [{ path: MANIFEST, content: serializeManifest(manifest) }, ...mirrors];
const stale = outputs.filter(({ path, content }) => {
  const abs = join(ROOT, path);
  return !existsSync(abs) || readFileSync(abs, 'utf8') !== content;
});

if (check) {
  if (stale.length) {
    console.error(`Out of date (${stale.length}):\n  ${stale.map((o) => o.path).join('\n  ')}\n\nRun: npm run browser:build`);
    process.exit(1);
  }
  console.log(`${MANIFEST} is current: ${manifest.count} scripts, ${mirrors.length} legacy mirrors.`);
  process.exit(0);
}

for (const { path, content } of stale) writeFileSync(join(ROOT, path), content);
console.log(`${MANIFEST}: ${manifest.count} scripts, ${mirrors.length} legacy mirrors (${stale.length} file(s) written).`);
