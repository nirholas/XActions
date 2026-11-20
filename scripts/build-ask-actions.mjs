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
 *   browser scripts  browser/*.js + scripts/*.js, cross-checked against the
 *                    generated /scripts/<slug> pages, with the raw source URL
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

import { readFileSync, writeFileSync, readdirSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { isNodeProgram } from './lib/is-node-program.mjs';
import { join, dirname, basename, relative } from 'node:path';
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

/** Titles and categories the script pages already publish; better than re-deriving them. */
const scriptManifest = new Map(
  JSON.parse(read('dashboard/scripts/_manifest.json')).map((e) => [e.slug, e])
);

/** X routes that are a real destination rather than someone's profile. */
const X_ROUTES = new Set(['home', 'messages', 'explore', 'notifications', 'settings', 'compose', 'search', 'i', 'bookmarks', 'lists', 'communities', 'topics']);

/**
 * Where a browser script must be pasted, taken from its header block.
 *
 * The author credit (`https://x.com/nichxbt`) appears in every header, so a
 * bare handle is only accepted when it is a placeholder (USERNAME) or a real
 * X route; otherwise the answer would tell people to run an unfollow script
 * on the author's profile.
 */
function findRunOn(head) {
  const explicit = head.match(/(?:Run on|Paste (?:this |in )?(?:on|at)|Navigate to):?\s*(?:https?:\/\/)?(x\.com\/[^\s*,)]+)/i);
  if (explicit) return clean(explicit[1]);
  for (const m of head.matchAll(/(?:https?:\/\/)?(x\.com\/[A-Za-z0-9_\/<>{}:$-]+)/g)) {
    const url = clean(m[1]);
    const segments = url.split('/').slice(1).filter(Boolean);
    if (!segments.length) continue;
    const first = segments[0];
    if (segments.length === 1 && !/^[A-Z_]{4,}$/.test(first) && !X_ROUTES.has(first.toLowerCase())) continue;
    if (/^(nichxbt|nirholas)$/i.test(first)) continue;
    return url;
  }
  return '';
}

const clean = (url) => url.replace(/[.,)]+$/, '');

/**
 * Browser scripts. The header comment block carries the human description and,
 * for most scripts, the page it must be pasted on: that "run on" line is the
 * single most useful thing to hand someone who just asked how to do it.
 */
function collectScripts() {
  const actions = [];
  for (const dir of ['browser', 'scripts']) {
    for (const entry of readdirSync(join(ROOT, dir))) {
      if (!entry.endsWith('.js') || entry.endsWith('.mjs')) continue;
      const path = `${dir}/${entry}`;
      if (!statSync(join(ROOT, path)).isFile()) continue;
      const source = read(path);
      if (!/paste|console|DevTools|@name|@description/i.test(source.slice(0, 2000))) continue;
      // Node tools (build and audit scripts) live here too; they cannot be pasted
      // into a browser console, so they are not runnable script actions.
      if (isNodeProgram(source)) continue;

      const head = source.slice(0, 3000);
      const description =
        head.match(/@description\s+(.+)/)?.[1] ||
        head.match(/^\s*(?:\/\/|\*)\s*([A-Z][^@\n]{25,140})$/m)?.[1] ||
        '';
      // "Paste in DevTools console on x.com/USERNAME/following" and friends.
      // An explicit instruction wins. The loose fallback has to reject the
      // author's own profile link, which sits in every header block and is
      // not where anyone should paste anything.
      const runOn = findRunOn(head);
      const slug = kebab(basename(entry, '.js'));
      const manifest = scriptManifest.get(slug);
      actions.push({
        kind: 'script',
        id: slug,
        title: (manifest?.title || slug.replace(/-/g, ' ')).trim(),
        description: description.trim().replace(/\s+/g, ' ').slice(0, 200),
        category: manifest?.category || 'Scripts',
        path,
        raw: `${RAW}${path}`,
        source: `${BLOB}${path}`,
        page: scriptPages.has(slug) ? `/scripts/${slug}` : null,
        runOn,
        needsCore: /XActions\?\.Core|Core module not loaded/.test(source),
      });
    }
  }
  return actions;
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

/**
 * 61 scripts exist in both browser/ and scripts/. The generated page was built
 * from one of them, so the catalog keeps that copy: linking a user to a page
 * whose source differs from the file quoted beside it is how a "just paste
 * this" answer stops matching what the page shows.
 */
function dedupeScripts(list) {
  const bySlug = new Map();
  for (const action of list) {
    const preferred = scriptManifest.get(action.id)?.sourceDir;
    const existing = bySlug.get(action.id);
    if (!existing) { bySlug.set(action.id, action); continue; }
    const wins = preferred ? action.path.startsWith(`${preferred}/`) : action.description.length > existing.description.length;
    if (wins) bySlug.set(action.id, action);
  }
  return [...bySlug.values()];
}

const actions = [...dedupeScripts(collectScripts()), ...collectCli(), ...collectMcp()];
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
