#!/usr/bin/env node
// Copyright (c) 2024-2026 nich (@nichxbt). All rights reserved.
/**
 * Builds scripts/twitter/xactions-command-center.js: the single "master"
 * browser-console script that bundles every standalone XActions console tool
 * behind a searchable command-palette UI. Users paste ONE script and pick any
 * tool from a menu instead of hunting for individual files.
 *
 * How it works:
 *   1. Reads the UI shell (scripts/twitter/_command-center-shell.js).
 *   2. Reads browser/index.json (built by scripts/build-script-manifest.mjs)
 *      and takes every script that runs without core.js. Title, description,
 *      category, page and whether it writes all come from there.
 *   3. Reads each tool's canonical browser/<id>.js, extracts its CONFIG
 *      defaults, injects a launcher-config override hook, strips the leading
 *      comment banner, and wraps it as register('<id>', function(){ ...tool... }).
 *   4. Injects the catalog + all registrations into the shell at the
 *      __XA_INJECT_DATA__ marker.
 *   5. Writes the runnable bundle and validates it with `node --check`.
 *
 * Run:  node scripts/build-toolkit.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';
import { loadScriptManifest } from './lib/script-manifest.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TW = join(ROOT, 'scripts', 'twitter');
const SHELL = join(TW, '_command-center-shell.js');
const OUT = join(TW, 'xactions-command-center.js');
const VERSION = '1.1.0';

const manifest = loadScriptManifest(ROOT);

// Ordered categories shown as filter chips in the palette.
const CATEGORIES = manifest.categories;

// Writes in these categories are bulk removals: unfollow, unlike, delete, block.
const DESTRUCTIVE = new Set(['cleanup', 'safety']);

/**
 * danger: 'safe' (read/export) | 'caution' (writes at human pace) |
 * 'destructive' (bulk / irreversible).
 * @param {object} script - A manifest entry.
 * @returns {'safe'|'caution'|'destructive'}
 */
function dangerOf(script) {
  if (!script.writes) return 'safe';
  return DESTRUCTIVE.has(script.category) ? 'destructive' : 'caution';
}

/**
 * The "where to run" hint: a label, a link when the page is a fixed URL, and
 * the path patterns the palette checks against location.pathname + search.
 * @param {object} script - A manifest entry.
 * @returns {{label: string, url?: string, match?: string[]}}
 */
function whereOf(script) {
  const label = script.pages.join(' or ');
  if (script.pages.some((p) => p === 'x.com/*')) return { label: 'Any X page' };
  const where = { label };
  const fixed = script.pages.find((p) => !/[<*]/.test(p));
  if (fixed) where.url = `https://${fixed}`;
  where.match = script.pages.map((p) => {
    const path = p.replace(/^x\.com/, '').split('?')[0];
    const rx = path
      .split(/(<[^>]+>|\*)/)
      .map((part) => (part === '*' ? '.*' : part.startsWith('<') ? '[^/]+' : part.replace(/[.+?^${}()|[\]\\]/g, '\\$&')))
      .join('');
    return `^${rx}`;
  });
  return where;
}

// ---------------------------------------------------------------------------
// Source processing
// ---------------------------------------------------------------------------

// Locate the top-level `var CONFIG = { ... }` object literal via a brace scan
// that skips strings and comments. Returns { open, close } indices of the {}.
function findConfig(src) {
  const m = /(?:^|\n)\s*(?:var|const|let)\s+CONFIG\s*=\s*\{/.exec(src);
  if (!m) return null;
  const open = src.indexOf('{', m.index);
  let depth = 0, inStr = null, esc = false;
  for (let i = open; i < src.length; i++) {
    const c = src[i], n = src[i + 1];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === inStr) inStr = null;
      continue;
    }
    if (c === '/' && n === '/') { const nl = src.indexOf('\n', i); i = nl < 0 ? src.length : nl; continue; }
    if (c === '/' && n === '*') { const end = src.indexOf('*/', i + 2); i = end < 0 ? src.length : end + 1; continue; }
    if (c === '\'' || c === '"' || c === '`') { inStr = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return { open, close: i }; }
  }
  return null;
}

// Strip the leading license line + first JSDoc banner so the bundle is smaller.
function stripBanner(src) {
  let i = 0;
  const len = src.length;
  for (;;) {
    while (i < len && /\s/.test(src[i])) i++;
    if (src.startsWith('//', i)) { const nl = src.indexOf('\n', i); i = nl < 0 ? len : nl + 1; continue; }
    if (src.startsWith('/*', i)) { const end = src.indexOf('*/', i + 2); i = end < 0 ? len : end + 2; continue; }
    break;
  }
  return src.slice(i);
}

const OVERRIDE_HOOK = "\ntry{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}\n";

function processTool(id, raw) {
  // Extract CONFIG defaults (best effort) and inject the override hook.
  let defaults = {};
  const cf = findConfig(raw);
  let src = raw;
  if (cf) {
    const objText = raw.slice(cf.open, cf.close + 1);
    try { defaults = vm.runInNewContext('(' + objText + ')', {}, { timeout: 1000 }); }
    catch { defaults = {}; }
    // Insert the hook after the statement's terminating semicolon (or the `}`).
    let insertAt = cf.close + 1;
    while (insertAt < raw.length && /[\s;]/.test(raw[insertAt])) { if (raw[insertAt] === ';') { insertAt++; break; } insertAt++; }
    src = raw.slice(0, insertAt) + OVERRIDE_HOOK + raw.slice(insertAt);
  }
  src = stripBanner(src);
  return { defaults, src };
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------
const tools = manifest.scripts.filter((script) => !script.needsCore);
const emojiOf = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.emoji]));

const catalog = [];
const registrations = [];

for (const script of tools) {
  const raw = readFileSync(join(ROOT, script.path), 'utf-8');
  const stopGlobal = (raw.match(/window\.(stop\w+)\s*=/) || [])[1] || null;
  const { defaults, src } = processTool(script.id, raw);
  catalog.push({
    id: script.id,
    title: script.title,
    emoji: emojiOf[script.category],
    category: script.category,
    danger: dangerOf(script),
    desc: script.description,
    where: whereOf(script),
    defaults,
    stopGlobal,
  });
  registrations.push(`  register(${JSON.stringify(script.id)}, function(){\n${src}\n});`);
}

// Order the catalog by category order, then title, so the palette reads well.
const catOrder = Object.fromEntries(CATEGORIES.map((c, i) => [c.id, i]));
catalog.sort((a, b) => (catOrder[a.category] - catOrder[b.category]) || a.title.localeCompare(b.title));

const dataBlock = [
  'const CATALOG = ' + JSON.stringify(catalog) + ';',
  'const CATEGORIES = ' + JSON.stringify(CATEGORIES) + ';',
  'const TOOLS = {};',
  'function register(id, fn){ TOOLS[id] = fn; }',
  ...registrations
].join('\n');

let shell = readFileSync(SHELL, 'utf-8');
// Use function replacers: a string replacement would interpret `$` sequences in
// the tool source (e.g. a regex template literal like `/?$`) as special replace
// patterns and corrupt the output.
shell = shell.replace('/* __XA_INJECT_DATA__ */', () => dataBlock).replace(/__XA_VERSION__/g, () => VERSION);

const header = `// Copyright (c) 2024-2026 nich (@nichxbt). All rights reserved.
/**
 * ============================================================
 * ⚡ XActions Command Center  (v${VERSION})
 * ============================================================
 * The one script to run them all. Paste this into your browser's DevTools
 * console on x.com and a searchable command palette appears with every
 * XActions tool (${catalog.length} of them): scrape, analyze, grow, engage,
 * clean up, moderate, and more. Pick a tool, set its options, press Run.
 *
 *   1. Open x.com and press F12 (or Cmd+Option+I) → Console tab.
 *   2. Paste this entire file and press Enter.
 *   3. Search, choose a tool, and click Run. Reopen anytime with the
 *      ⚡ button (bottom-right) or Cmd/Ctrl+K.
 *
 * @name        XActions Command Center
 * @description One console script that opens a searchable menu of every XActions tool (scrape, analyze, grow, engage, clean up, and moderate) with per-tool options and one-click run.
 * @version     ${VERSION}
 * @author      nichxbt (https://x.com/nichxbt)
 *
 * GENERATED FILE. Do not edit by hand. Source: scripts/twitter/_command-center-shell.js,
 * browser/index.json and the browser/ scripts it lists, + scripts/build-toolkit.mjs.
 * Regenerate with: node scripts/build-toolkit.mjs
 * @repository https://github.com/nirholas/XActions
 */
`;

writeFileSync(OUT, header + shell);

// Validate the generated bundle actually parses.
try {
  execFileSync('node', ['--check', OUT], { stdio: 'pipe' });
} catch (e) {
  console.error('✖ Generated bundle failed `node --check`:');
  console.error(e.stderr ? e.stderr.toString() : e.message);
  process.exit(1);
}

const bytes = Buffer.byteLength(header + shell);
console.log(`✅ Built ${OUT.replace(ROOT + '/', '')}`);
console.log(`   ${catalog.length} tools bundled across ${CATEGORIES.length} categories · ${(bytes / 1024).toFixed(0)} KB`);
