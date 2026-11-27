#!/usr/bin/env node
// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Build the action catalog behind Ask XActions.
 *
 * An answer that only explains is half an answer. XActions is a toolkit of
 * runnable things, so every question should end with the thing you actually
 * run. This catalogs all three executable surfaces straight from source, so
 * the catalog cannot drift from what the code offers:
 *
 *   browser scripts  browser/index.json (built by scripts/build-script-manifest.mjs),
 *                    cross-checked against the generated /scripts/<slug> pages,
 *                    with the raw source URL
 *   CLI commands     the .command()/.description() calls in src/cli/**
 *   MCP tools        the tool definitions in src/mcp/server.js
 *
 * Output: dashboard/data/ask-actions.json, served at /data/ask-actions.json
 * and read by src/ask/actions.js on every surface (page, API, CLI, MCP).
 *
 * Usage:
 *   node scripts/build-ask-actions.mjs           # write
 *   node scripts/build-ask-actions.mjs --check   # exit 1 if the committed file is stale
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license Apache-2.0
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { loadScriptManifest } from './lib/script-manifest.mjs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'dashboard', 'data', 'ask-actions.json');
const RAW = 'https://raw.githubusercontent.com/nirholas/XActions/main/';
const BLOB = 'https://github.com/nirholas/XActions/blob/main/';
const CHECK = process.argv.includes('--check');

const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

/** Pages the script generator produced, so a script only links to a page that exists. */
const scriptPages = new Set(
  readdirSync(join(ROOT, 'dashboard', 'scripts'))
    .filter((f) => f.endsWith('.html'))
    .map((f) => f.replace(/\.html$/, ''))
);

/**
 * Browser scripts, one per manifest entry. The manifest already carries the
 * page each script must be pasted on, which is the single most useful thing
 * to hand someone who just asked how to do it. Legacy paths ride along so a
 * question that quotes an old file name still finds the script.
 */
function collectScripts() {
  const manifest = loadScriptManifest(ROOT);
  const labels = Object.fromEntries(manifest.categories.map((c) => [c.id, c.label]));
  return manifest.scripts.map((script) => {
    const slug = kebab(script.id);
    return {
      kind: 'script',
      id: slug,
      title: script.title,
      description: script.description,
      category: labels[script.category],
      path: script.path,
      raw: `${RAW}${script.path}`,
      source: `${BLOB}${script.path}`,
      page: scriptPages.has(slug) ? `/scripts/${slug}` : null,
      runOn: script.page === 'x.com/*' ? '' : script.page,
      needsCore: script.needsCore,
      writes: script.writes,
      aliases: script.aliases,
    };
  });
}

/**
 * CLI commands, read from the commander definitions. Subcommands are attached
 * to the parent variable that declared them (`pluginCmd.command('install')` is
 * `xactions plugin install`), because handing someone `xactions install` would
 * be handing them a command that does not exist.
 */
function collectCli() {
  const sources = [{ path: 'src/cli/index.js', text: read('src/cli/index.js') }];
  const dir = join(ROOT, 'src', 'cli', 'commands');
  if (existsSync(dir)) {
    for (const entry of readdirSync(dir)) {
      if (entry.endsWith('.js')) sources.push({ path: `src/cli/commands/${entry}`, text: read(`src/cli/commands/${entry}`) });
    }
  }

  const actions = [];
  for (const { path, text } of sources) {
    // Map `const fooCmd = program.command('foo')` so nested commands can be prefixed.
    const parents = new Map();
    for (const m of text.matchAll(/(?:const|let)\s+(\w+)\s*=\s*\w+\s*\n?\s*\.command\(\s*'([\w-]+)/g)) {
      parents.set(m[1], m[2]);
    }
    const pattern = /(\w+)?\s*\n?\s*\.command\(\s*'([^']+)'\s*\)\s*(?:\.alias\(\s*'([^']+)'\s*\)\s*)?\.description\(\s*'([^']+)'\s*\)/g;
    for (const m of text.matchAll(pattern)) {
      const [, receiver, signature, alias, description] = m;
      const parent = receiver && parents.get(receiver);
      const name = signature.split(/\s+/)[0];
      if (parent === name) continue; // the parent's own declaration, not a subcommand
      const full = parent ? `${parent} ${signature}` : signature;
      actions.push({
        kind: 'cli',
        id: (parent ? `${parent}-${name}` : name).toLowerCase(),
        title: `xactions ${full}`,
        command: `xactions ${full}`,
        description: description.trim(),
        alias: alias || null,
        path,
      });
    }
  }
  return actions;
}

/** MCP tools, read from the tool definitions the server advertises. */
function collectMcp() {
  const text = read('src/mcp/server.js');
  const actions = [];
  const pattern = /name:\s*'(x_[\w]+)',\s*\n\s*description:\s*'((?:[^'\\]|\\.)*)'/g;
  for (const m of text.matchAll(pattern)) {
    const [, name, description] = m;
    // Required params make the tool call copy-pasteable rather than a guess.
    const after = text.slice(m.index, m.index + 2600);
    const required = after.match(/required:\s*\[([^\]]*)\]/)?.[1] || '';
    actions.push({
      kind: 'mcp',
      id: name,
      title: name,
      description: description.replace(/\\'/g, "'").trim(),
      required: required.split(',').map((s) => s.trim().replace(/'/g, '')).filter(Boolean),
      path: 'src/mcp/server.js',
    });
  }
  return actions;
}

const actions = [...collectScripts(), ...collectCli(), ...collectMcp()];
actions.sort((a, b) => a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id));

const counts = actions.reduce((acc, a) => ({ ...acc, [a.kind]: (acc[a.kind] || 0) + 1 }), {});
const digest = createHash('sha256').update(JSON.stringify(actions)).digest('hex').slice(0, 16);
const json = `{"version":1,"digest":${JSON.stringify(digest)},"counts":${JSON.stringify(counts)},"actions":[\n${actions.map((a) => JSON.stringify(a)).join(',\n')}\n]}`;

if (CHECK) {
  if (!existsSync(OUT) || readFileSync(OUT, 'utf8') !== json) {
    console.error(`❌ Ask action catalog is stale: ${relative(ROOT, OUT)}\n   Run: npm run ask:index`);
    process.exit(1);
  }
  console.log(`✅ Ask action catalog is current (${actions.length} actions, digest ${digest})`);
  process.exit(0);
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, json);
console.log(`✅ ${relative(ROOT, OUT)}: ${actions.length} actions (${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(', ')})`);
