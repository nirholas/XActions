#!/usr/bin/env node
// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Report OpenRouter model ids in the code that OpenRouter no longer serves.
 *
 * OpenRouter retires model ids, and a retired id fails every request with an
 * error most callers swallow: the feature quietly drops to its offline
 * fallback, or answers "temporarily unavailable" forever. By 2026-11-20 seven
 * ids in use had gone that way (gemini-flash-1.5, llama-3-8b-instruct:free,
 * claude-3.5-haiku, grok-2-vision-1212, ...), and nothing noticed.
 *
 * This reads OpenRouter's public model list (no key needed) and checks every
 * quoted `vendor/model` string under api/ and src/ whose vendor OpenRouter
 * knows. Defaults live in src/ai/models.js; paste-in browser scripts carry
 * their own literals, which this covers too.
 *
 * A line can opt out with the comment `check:models ignore`, for example a
 * cost table that still prices usage recorded under a retired id.
 *
 * Usage:
 *   node scripts/check-models.mjs
 *   node scripts/check-models.mjs --json
 *
 * Exits 1 when any id is retired, 2 when the model list cannot be fetched.
 *
 * Direct-provider ids (claude-*, gpt-*, grok-* without a vendor prefix) are
 * not covered: their lists need each provider's API key.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIRS = ['api', 'src'];
const MODELS_URL = 'https://openrouter.ai/api/v1/models';
const ID_RE = /['"`]([a-z0-9][a-z0-9-]*\/[a-zA-Z0-9][a-zA-Z0-9._-]*(?::[a-z]+)?)['"`]/g;
const json = process.argv.includes('--json');

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (/\.(c|m)?js$/.test(entry.name)) yield full;
  }
}

let list;
try {
  const res = await fetch(MODELS_URL, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  list = (await res.json()).data;
  if (!Array.isArray(list) || !list.length) throw new Error('empty model list');
} catch (error) {
  console.error(`Could not read ${MODELS_URL}: ${error.message}`);
  process.exit(2);
}

const live = new Set(list.map((m) => m.id));
const vendors = new Set(list.map((m) => m.id.split('/')[0]));

/** @type {Map<string, string[]>} */
const found = new Map();
for (const dir of DIRS) {
  for (const file of walk(path.join(ROOT, dir))) {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (line.includes('check:models ignore')) return;
      for (const [, id] of line.matchAll(ID_RE)) {
        if (!vendors.has(id.split('/')[0])) continue;
        const where = `${path.relative(ROOT, file)}:${i + 1}`;
        found.set(id, [...(found.get(id) ?? []), where]);
      }
    });
  }
}

const results = [...found].sort(([a], [b]) => a.localeCompare(b)).map(([id, where]) => ({ id, live: live.has(id), where }));
const retired = results.filter((r) => !r.live);

if (json) {
  console.log(JSON.stringify({ checked: results.length, retired }, null, 2));
} else {
  for (const r of results) console.log(`  ${r.live ? 'ok     ' : 'RETIRED'}  ${r.id}${r.live ? '' : `\n           ${r.where.join('\n           ')}`}`);
  console.log(`\n${results.length} model ids checked against ${live.size} live OpenRouter models.`);
  console.log(retired.length
    ? `${retired.length} retired. Replace them, preferably through src/ai/models.js.`
    : 'No retired model ids.');
}
process.exit(retired.length ? 1 : 0);
