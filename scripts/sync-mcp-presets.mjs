#!/usr/bin/env node
// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Write the MCP preset table (tool count, schema size, approval default) into
 * every doc that carries one, from the live tool list.
 *
 * The table sits between `<!-- mcp-presets:start ... -->` and
 * `<!-- mcp-presets:end -->`. tests/mcp/presets.test.js fails when a copy is
 * stale and names this script, so a tool added or a description changed shows
 * up in the docs in the same change.
 *
 * Usage:
 *   node scripts/sync-mcp-presets.mjs           rewrite the tables
 *   node scripts/sync-mcp-presets.mjs --check   exit 1 when a table is stale
 *
 * It imports the MCP server for its tool list, so it needs `npm ci` first.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license Apache-2.0
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Every doc that carries the generated table. */
export const PRESET_DOCS = ['docs/mcp-setup.md', 'AGENTS.md', 'CLAUDE.md', 'README.md'];

const checkOnly = process.argv.includes('--check');

const { TOOLS } = await import('../src/mcp/server.js');
const { renderPresetTable, extractPresetBlock, replacePresetBlock } = await import('../src/mcp/presets.js');

const table = renderPresetTable(TOOLS);
const stale = [];

for (const rel of PRESET_DOCS) {
  const file = join(ROOT, rel);
  const text = readFileSync(file, 'utf8');
  const block = extractPresetBlock(text);
  if (block === null) {
    console.error(`${rel}: no mcp-presets block`);
    process.exitCode = 1;
    continue;
  }
  if (block === table) continue;
  stale.push(rel);
  if (!checkOnly) writeFileSync(file, replacePresetBlock(text, table));
}

if (checkOnly && stale.length) {
  console.error(`Stale MCP preset table in: ${stale.join(', ')}\nRun: node scripts/sync-mcp-presets.mjs`);
  process.exitCode = 1;
} else if (!checkOnly) {
  console.log(stale.length ? `Updated the preset table in: ${stale.join(', ')}` : 'Preset tables already current.');
}
