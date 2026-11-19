#!/usr/bin/env node
// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Registry manifest sync.
 *
 * Every registry we publish to keeps its own copy of two facts that only have
 * one source of truth: the package version (package.json) and the MCP tool
 * count (the TOOLS array in src/mcp/server.js). Left alone, those copies drift:
 * plugin.json said 3.1.0 and "87+ tools" while the server shipped 3.5.0 with 145.
 *
 * This rewrites the version and tool-count fields in:
 *   plugins/xactions/.claude-plugin/plugin.json and .claude-plugin/marketplace.json
 *     (tool count only: the plugin carries its own semver, independent of the package),
 *   server.json, glama.json (validated only: it carries neither field),
 *   smithery.yaml (stdio start command, env schema mirrored from server.json).
 *
 * Usage:
 *   node scripts/sync-registry.mjs           # rewrite files in place
 *   node scripts/sync-registry.mjs --check   # exit 1 if anything is out of date
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license Apache-2.0
 */

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const checkOnly = process.argv.includes('--check');

const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const VERSION = pkg.version;

/** Count `name: 'x_...'` entries inside the TOOLS array literal of the MCP server. */
function countMcpTools() {
  const source = readFileSync(join(ROOT, 'src', 'mcp', 'server.js'), 'utf8');
  const start = source.indexOf('const TOOLS = [');
  if (start === -1) throw new Error('src/mcp/server.js: TOOLS array not found');
  const end = source.indexOf('\n];', start);
  const body = source.slice(start, end === -1 ? undefined : end);
  const count = (body.match(/^\s*name:\s*['"]x_[a-z0-9_]+['"]/gm) || []).length;
  if (count === 0) throw new Error('src/mcp/server.js: no x_ tools found inside TOOLS');
  return count;
}

const TOOL_COUNT = countMcpTools();
const TOOL_RE = /\b\d+\+?\s+MCP tools\b/g;
const toolPhrase = `${TOOL_COUNT} MCP tools`;

const readJson = (rel) => JSON.parse(readFileSync(join(ROOT, rel), 'utf8'));
const serialize = (obj) => JSON.stringify(obj, null, 2) + '\n';

/** @type {Array<{file: string, before: string, after: string}>} */
const changes = [];

function reconcile(rel, mutate) {
  const before = readFileSync(join(ROOT, rel), 'utf8');
  const next = JSON.parse(before);
  mutate(next);
  const after = serialize(next);
  if (after !== before) changes.push({ file: rel, before, after });
}

reconcile('plugins/xactions/.claude-plugin/plugin.json', (j) => {
  j.description = j.description.replace(TOOL_RE, toolPhrase);
});

reconcile('.claude-plugin/marketplace.json', (j) => {
  j.description = j.description.replace(TOOL_RE, toolPhrase);
  for (const plugin of j.plugins || []) {
    plugin.description = plugin.description.replace(TOOL_RE, toolPhrase);
  }
});

// The XACTIONS_MCP_TOOLS description tells registry users what loading every
// tool costs. Its count was typed by hand and said 151 while the server shipped
// 155, so it is rewritten from TOOLS like every other count here. smithery.yaml
// copies the description from this file, so it follows. The token figure stays
// prose: measuring it means importing the server, and this script runs before
// any dependency is installed.
const ALL_TOOLS_RE = /\bAll \d+ tools\b/g;

reconcile('server.json', (j) => {
  j.version = VERSION;
  for (const p of j.packages || []) {
    p.version = VERSION;
    for (const v of p.environmentVariables || []) {
      if (typeof v.description === 'string') {
        v.description = v.description.replace(ALL_TOOLS_RE, `All ${TOOL_COUNT} tools`);
      }
    }
  }
});

// skills/index.json describes the MCP-server skill to every agent that browses
// the catalogue, and its description quoted a tool count nobody was updating
// (it said 144 while the server shipped 152). It is JSON, so the markdown
// auditor never saw it.
reconcile('skills/index.json', (j) => {
  const walk = (node) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== 'object') return;
    if (typeof node.description === 'string') {
      node.description = node.description.replace(TOOL_RE, toolPhrase);
    }
    for (const value of Object.values(node)) walk(value);
  };
  walk(j);
});

// glama.json holds neither version nor tool count; make sure it stays valid JSON.
reconcile('glama.json', () => {});

// smithery.yaml: derived entirely from server.json's env schema, regenerated whole.
function buildSmithery() {
  // Mirror server.json as this run is about to write it, not as it sits on disk,
  // so one run settles both files instead of leaving smithery.yaml a run behind.
  const pending = changes.find((c) => c.file === 'server.json');
  const server = pending ? JSON.parse(pending.after) : readJson('server.json');
  const envVars = (server.packages?.[0]?.environmentVariables) || [];
  const yamlStr = (s) => JSON.stringify(String(s));
  const lines = [
    '# Smithery registry manifest for the XActions MCP server.',
    '# Generated by scripts/sync-registry.mjs from package.json and server.json. Do not edit by hand.',
    `# Version ${VERSION}, ${toolPhrase}.`,
    'startCommand:',
    '  type: stdio',
    '  configSchema:',
    '    type: object',
    '    properties:',
  ];
  for (const v of envVars) {
    lines.push(`      ${v.name}:`);
    lines.push('        type: string');
    lines.push(`        description: ${yamlStr(v.description)}`);
  }
  const required = envVars.filter((v) => v.isRequired).map((v) => v.name);
  if (required.length) {
    lines.push('    required:');
    for (const r of required) lines.push(`      - ${r}`);
  }
  lines.push('  commandFunction: |-');
  lines.push('    (config) => ({');
  lines.push('      command: "node",');
  lines.push('      args: ["src/mcp/server.js"],');
  lines.push('      env: Object.fromEntries(');
  lines.push(`        [${envVars.map((v) => JSON.stringify(v.name)).join(', ')}]`);
  lines.push('          .filter((k) => config[k] !== undefined && config[k] !== "")');
  lines.push('          .map((k) => [k, String(config[k])])');
  lines.push('      )');
  lines.push('    })');
  return lines.join('\n') + '\n';
}

{
  const rel = 'smithery.yaml';
  const path = join(ROOT, rel);
  const before = existsSync(path) ? readFileSync(path, 'utf8') : '';
  const after = buildSmithery();
  if (after !== before) changes.push({ file: rel, before, after });
}

/**
 * Every environment variable a registry advertises must be one the server
 * actually reads. Until 2026-08-27 server.json told the public MCP Registry
 * to set X_COOKIES, X_USERNAME and X_PASSWORD, none of which appear anywhere
 * in src/, so every registry and Smithery install landed unauthenticated and
 * nothing here noticed. Manifest drift is invisible; this check is not.
 */
function checkEnvVarsAreRead() {
  const declared = new Set();
  for (const p of readJson('server.json').packages ?? []) {
    for (const v of p.environmentVariables ?? []) declared.add(v.name);
  }
  if (!declared.size) return [];

  const read = new Set();
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.js')) {
        const src = readFileSync(full, 'utf8');
        for (const m of src.matchAll(/process\.env\.([A-Z0-9_]+)/g)) read.add(m[1]);
        for (const m of src.matchAll(/process\.env\[['"]([A-Z0-9_]+)['"]\]/g)) read.add(m[1]);
      }
    }
  };
  walk(join(ROOT, 'src'));

  return [...declared].filter((name) => !read.has(name));
}


/**
 * Agent-facing docs each used to carry their own hand-typed skill count. They
 * disagreed: 26, 31, 32 and 49 across four files, against 49 real directories.
 * An agent reading the wrong number works from a stale map of the repository,
 * so the count is checked against `skills/` rather than trusted.
 *
 * @returns {Array<{file: string, claimed: string, actual: number}>}
 */
function checkSkillCounts() {
  const actual = readdirSync(join(ROOT, 'skills'), { withFileTypes: true }).filter(
    (e) => e.isDirectory() && existsSync(join(ROOT, 'skills', e.name, 'SKILL.md'))
  ).length;

  const files = ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md', '.github/copilot-instructions.md', 'README.md'];
  const wrong = [];
  for (const file of files) {
    const full = join(ROOT, file);
    if (!existsSync(full)) continue;
    const text = readFileSync(full, 'utf8');
    for (const m of text.matchAll(/\b(\d+)\+?\s+(?:agent\s+)?skills\b/gi)) {
      // "26, 31, 32 and 49 agent skills" in a sentence explaining the drift is
      // prose about the bug, not a claim; only flag a number that is not current.
      if (Number(m[1]) !== actual && !/simultaneously claimed/.test(text.slice(Math.max(0, m.index - 200), m.index))) {
        wrong.push({ file, claimed: m[0], actual });
      }
    }
  }
  return wrong;
}

const staleSkillCounts = checkSkillCounts();

const phantomEnv = checkEnvVarsAreRead();

console.log(`Registry sync: version ${VERSION}, ${toolPhrase}`);

if (staleSkillCounts.length) {
  console.error('Stale skill counts (skills/ has ' + staleSkillCounts[0].actual + '):');
  for (const w of staleSkillCounts) console.error(`  ${w.file}: "${w.claimed}"`);
  process.exit(1);
}

if (phantomEnv.length) {
  console.error(
    `server.json advertises ${phantomEnv.length} environment variable(s) that nothing in src/ reads: ${phantomEnv.join(', ')}`
  );
  console.error('Anyone installing from a registry would set them and get an unauthenticated server.');
  process.exit(1);
}

if (changes.length === 0) {
  console.log('All registry manifests are in sync.');
  process.exit(0);
}

if (checkOnly) {
  console.error(`Out of date (${changes.length}): ${changes.map((c) => c.file).join(', ')}`);
  console.error('Run: node scripts/sync-registry.mjs');
  process.exit(1);
}

for (const c of changes) {
  writeFileSync(join(ROOT, c.file), c.after);
  console.log(`  updated ${c.file}`);
}
