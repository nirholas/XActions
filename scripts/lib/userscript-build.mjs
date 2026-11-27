// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Turns manifest entries (browser/index.json) into userscripts for
 * Tampermonkey and Violentmonkey.
 *
 * Each output file is: the metadata block, the runtime from
 * userscript-runtime.js, src/automation/core.js when the script needs it, and
 * the script itself wrapped in a function the menu calls. Nothing runs on page
 * load. The script's settings literal is wrapped in a call that applies what
 * the user saved, so the defaults stay in the script.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseScript, findConfigObject } from './script-manifest.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

export const REPOSITORY = 'nirholas/XActions';
export const NAMESPACE = `https://github.com/${REPOSITORY}`;
export const RELEASE_DOWNLOAD = `https://github.com/${REPOSITORY}/releases/latest/download`;
export const SUPPORT_URL = `https://github.com/${REPOSITORY}/issues`;

/** File stem of the userscript that carries every tool. */
export const COMBINED_ID = 'xactions';

/** Keys every generated metadata block must carry. */
export const REQUIRED_KEYS = [
  'name', 'namespace', 'version', 'description', 'match', 'grant', 'run-at',
  'homepageURL', 'supportURL', 'updateURL', 'downloadURL',
];

/** Identifier the build wraps each script's settings literal in. */
export const CONFIG_HOOK = '__xactionsConfig';

/**
 * @param {string} id
 * @returns {string}
 */
export function userscriptFileName(id) {
  return `${id}.user.js`;
}

/**
 * The stable address a userscript manager installs from and checks for updates.
 *
 * @param {string} id
 * @returns {string}
 */
export function installUrl(id) {
  return `${RELEASE_DOWNLOAD}/${userscriptFileName(id)}`;
}

/**
 * @match lines: x.com and twitter.com always, plus any other x.com host a
 * script's page names (ads.x.com, pro.x.com, studio.x.com).
 *
 * @param {Array<{pages: string[]}>} entries
 * @returns {string[]}
 */
export function matchesFor(entries) {
  const hosts = new Set();
  for (const entry of entries) {
    for (const page of entry.pages) {
      const host = new URL(page.replace(/\*+/g, 'x')).host;
      if (host !== 'x.com') hosts.add(host);
    }
  }
  return ['https://x.com/*', 'https://twitter.com/*', ...[...hosts].sort().map((h) => `https://${h}/*`)];
}

/**
 * Userscript manager APIs a piece of code calls, which is exactly what its
 * @grant lines must list.
 *
 * @param {string} code
 * @returns {string[]}
 */
export function grantsUsed(code) {
  const names = new Set(code.match(/\bGM_[A-Za-z]+\b/g) || []);
  if (/\bunsafeWindow\b/.test(code)) names.add('unsafeWindow');
  return [...names].sort();
}

/**
 * Render a metadata block. Values are kept to one line.
 *
 * @param {Array<[string, string]>} pairs
 * @returns {string}
 */
export function renderMetadata(pairs) {
  const width = Math.max(...pairs.map(([key]) => key.length)) + 1;
  const lines = pairs.map(([key, value]) => `// @${key.padEnd(width)} ${String(value).replace(/\s+/g, ' ').trim()}`.trimEnd());
  return ['// ==UserScript==', ...lines, '// ==/UserScript=='].join('\n');
}

/**
 * Parse the metadata block at the top of a userscript.
 *
 * @param {string} text
 * @returns {Record<string, string[]>} Each key maps to every value it was given.
 */
export function parseMetadata(text) {
  const start = text.indexOf('// ==UserScript==');
  const end = text.indexOf('// ==/UserScript==');
  if (start !== 0 || end === -1) throw new Error('No metadata block at the top of the file.');
  const meta = {};
  for (const line of text.slice(start, end).split('\n').slice(1)) {
    const match = line.match(/^\/\/\s+@([\w:-]+)(?:\s+(.*))?$/);
    if (!match) continue;
    (meta[match[1]] ||= []).push((match[2] || '').trim());
  }
  return meta;
}

/**
 * The runtime source with its `export` keywords removed, ready to inline.
 *
 * @returns {string}
 */
export function runtimeSource() {
  const text = readFileSync(join(HERE, 'userscript-runtime.js'), 'utf8');
  if (/^\s*import\b/m.test(text)) throw new Error('userscript-runtime.js must not import anything: it is inlined.');
  return text.replace(/^export (?=(?:async )?function |const |let )/gm, '');
}

/**
 * Wrap the script's settings literal in CONFIG_HOOK(...).
 *
 * @param {string} source
 * @param {string} path - For error messages.
 * @returns {string}
 */
export function transformBody(source, path) {
  if (/\bGM_[A-Za-z]+\b|\bunsafeWindow\b|==UserScript==/.test(source)) {
    throw new Error(`${path} uses userscript manager APIs itself; the wrapper owns those.`);
  }
  if (source.includes(CONFIG_HOOK)) throw new Error(`${path} already contains ${CONFIG_HOOK}.`);
  const { ast } = parseScript(source, path);
  const config = findConfigObject(ast);
  if (!config) return source;
  const { start, end } = config.node;
  return `${source.slice(0, start)}${CONFIG_HOOK}(${source.slice(start, end)})${source.slice(end)}`;
}

/**
 * The fields of a manifest entry the runtime needs.
 *
 * @param {object} entry
 * @returns {object}
 */
export function toolDescriptor(entry) {
  const { id, title, description, category, page, pages, writes, needsCore, config } = entry;
  return { id, title, description, category, page, pages, writes, needsCore, config };
}

/**
 * The host bindings every userscript shares: the page window and the four
 * manager calls the runtime makes. These lines are where the @grant list
 * comes from.
 */
const HOST_BINDINGS = `const sandbox = window;
const page = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
const gm = {
  getValue: (key, fallback) => GM_getValue(key, fallback),
  setValue: (key, value) => GM_setValue(key, value),
  registerMenuCommand: (caption, onClick) => GM_registerMenuCommand(caption, onClick),
  unregisterMenuCommand: (id) => GM_unregisterMenuCommand(id),
};`;

/**
 * A tool as JavaScript source: its descriptor plus a run function holding the
 * script body.
 *
 * @param {object} entry
 * @param {string} source
 * @returns {string}
 */
function toolSource(entry, source) {
  const body = transformBody(source, entry.path);
  return [
    `Object.assign(${JSON.stringify(toolDescriptor(entry))}, {`,
    `  // ${entry.path}, unchanged except for the settings hook.`,
    `  run: function (window, ${CONFIG_HOOK}) {`,
    body.replace(/\s+$/, ''),
    '  },',
    '})',
  ].join('\n');
}

/**
 * src/automation/core.js as a function of the window it installs into.
 *
 * @param {string} coreSource
 * @returns {string}
 */
function coreFunction(coreSource) {
  return ['const core = function (window) {', '  // src/automation/core.js', coreSource.replace(/\s+$/, ''), '};'].join('\n');
}

/**
 * Header lines common to every file.
 *
 * @param {object} options
 * @returns {Array<[string, string]>}
 */
function metadataPairs({ id, name, description, version, homepage, entries, grants }) {
  return [
    ['name', name],
    ['namespace', NAMESPACE],
    ['version', version],
    ['description', description],
    ['author', 'nich (@nichxbt)'],
    ['license', 'Apache-2.0'],
    ...matchesFor(entries).map((m) => ['match', m]),
    ...grants.map((g) => ['grant', g]),
    ['run-at', 'document-idle'],
    ['noframes', ''],
    ['homepageURL', homepage],
    ['supportURL', SUPPORT_URL],
    ['updateURL', installUrl(id)],
    ['downloadURL', installUrl(id)],
  ];
}

const NOTICE = (from) => [
  '// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.',
  `// Generated by scripts/build-userscripts.mjs from ${from}. Do not edit: changes are`,
  '// lost on the next build. Nothing here runs until you pick it from the userscript menu.',
].join('\n');

/**
 * One userscript for one manifest entry.
 *
 * @param {{entry: object, source: string, coreSource: string, version: string}} input
 * @returns {string}
 */
export function renderToolScript({ entry, source, coreSource, version }) {
  const runtime = runtimeSource();
  const header = renderMetadata(metadataPairs({
    id: entry.id,
    name: `XActions: ${entry.title}`,
    description: entry.description,
    version,
    homepage: `${NAMESPACE}/blob/main/${entry.path}`,
    entries: [entry],
    grants: grantsUsed(`${HOST_BINDINGS}\n${runtime}`),
  }));
  return [
    header,
    NOTICE(entry.path),
    '(function () {',
    HOST_BINDINGS,
    '',
    runtime,
    '',
    entry.needsCore ? coreFunction(coreSource) : 'const core = null;',
    '',
    `const TOOL = ${toolSource(entry, source)};`,
    '',
    'installToolMenu(sandbox, gm, TOOL, { core, page });',
    '})();',
    '',
  ].join('\n');
}

/**
 * The userscript with every tool behind one menu entry.
 *
 * @param {{entries: object[], sources: Map<string, string>, coreSource: string, version: string}} input
 * @returns {string}
 */
export function renderCombinedScript({ entries, sources, coreSource, version }) {
  const runtime = runtimeSource();
  const header = renderMetadata(metadataPairs({
    id: COMBINED_ID,
    name: 'XActions: all tools',
    description: `Every XActions browser script (${entries.length}) behind one menu on x.com. Pick a tool, check its settings, run it. Nothing runs on page load.`,
    version,
    homepage: `${NAMESPACE}/blob/main/docs/browser-scripts.md#install-as-a-userscript`,
    entries,
    grants: grantsUsed(`${HOST_BINDINGS}\n${runtime}`),
  }));
  const tools = entries.map((entry) => toolSource(entry, sources.get(entry.id)));
  return [
    header,
    NOTICE('browser/index.json'),
    '(function () {',
    HOST_BINDINGS,
    '',
    runtime,
    '',
    entries.some((e) => e.needsCore) ? coreFunction(coreSource) : 'const core = null;',
    '',
    'const TOOLS = [',
    tools.map((t) => `${t},`).join('\n'),
    '];',
    '',
    'installPickerMenu(sandbox, gm, TOOLS, { core, page });',
    '})();',
    '',
  ].join('\n');
}

/**
 * Entries grouped by category, categories in first-seen order of the rules.
 *
 * @param {object[]} entries
 * @param {string[]} order - Category names in display order.
 * @returns {Array<[string, object[]]>}
 */
export function groupByCategory(entries, order) {
  const groups = new Map(order.map((c) => [c, []]));
  for (const entry of entries) {
    if (!groups.has(entry.category)) groups.set(entry.category, []);
    groups.get(entry.category).push(entry);
  }
  return [...groups].filter(([, list]) => list.length > 0).map(([c, list]) => [c, list.sort((a, b) => a.title.localeCompare(b.title))]);
}

/**
 * Markdown install list for docs/browser-scripts.md.
 *
 * @param {object[]} entries
 * @param {string[]} order
 * @returns {string}
 */
export function installLinksMarkdown(entries, order) {
  const out = [
    `_${entries.length} userscripts plus one with every tool. Generated by \`npm run build:userscripts\` from [\`browser/index.json\`](../browser/index.json)._`,
    '',
    `**Everything in one install:** [XActions: all tools](${installUrl(COMBINED_ID)})`,
  ];
  for (const [category, list] of groupByCategory(entries, order)) {
    out.push('', `#### ${category}`, '', '| Install | What it does | Run it on | Acts on your account |', '|---|---|---|---|');
    for (const e of list) {
      const writes = e.writes ? (e.supportsDryRun ? `yes, dry run ${e.dryRunDefault ? 'on' : 'off'} by default` : 'yes, no dry run') : 'no';
      const page = e.page.replace(/^https:\/\//, '').replace(/\/\*\*$/, ' (any page)');
      out.push(`| [${escapeCell(e.title)}](${installUrl(e.id)}) | ${escapeCell(e.description)} | \`${page}\` | ${writes} |`);
    }
  }
  return out.join('\n');
}

/**
 * HTML install list for dashboard/run.html.
 *
 * @param {object[]} entries
 * @param {string[]} order
 * @returns {string}
 */
export function installLinksHtml(entries, order) {
  const out = [
    '<section class="category" id="userscripts">',
    '      <h2>Install as a userscript</h2>',
    '      <p>One click installs a script into <a href="https://www.tampermonkey.net/">Tampermonkey</a> or <a href="https://violentmonkey.github.io/">Violentmonkey</a>. It waits in the userscript menu on x.com, runs only when you pick it, keeps its settings, and updates itself. <a href="/docs/guides/browser-scripts#install-as-a-userscript">How it works</a>.</p>',
    `      <p><a class="server-btn" href="${installUrl(COMBINED_ID)}">Install all ${entries.length} tools in one userscript</a></p>`,
  ];
  for (const [category, list] of groupByCategory(entries, order)) {
    out.push(`      <h3>${escapeHtml(category)}</h3>`, '      <ul class="userscript-list">');
    for (const e of list) {
      const tag = e.writes ? ' <span class="tag">acts on your account</span>' : '';
      out.push(`        <li><a href="${installUrl(e.id)}">${escapeHtml(e.title)}</a>${tag}: ${escapeHtml(e.description)}</li>`);
    }
    out.push('      </ul>');
  }
  out.push('    </section>');
  return out.join('\n');
}

/**
 * @param {string} text
 * @returns {string}
 */
function escapeCell(text) {
  return text.replace(/\|/g, '\\|');
}

/**
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

