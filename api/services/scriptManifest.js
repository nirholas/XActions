// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Public script ids, resolved through browser/index.json.
 *
 * The scripts API names console scripts by public id: `src/<name>` for the
 * top-level scripts and `automation/<name>` for the old src/automation/ suite.
 * Those ids are in published URLs and in SCRIPT_PRICES, so they stay. Each
 * now resolves to the canonical browser/<id>.js file the manifest lists, so
 * the download route and the Puppeteer runner serve the same script a user
 * would paste, not a stale copy.
 *
 * A few priced ids name Node modules (src/automation/rssMonitor.js and the
 * like) rather than console scripts; those resolve to their file in src/ as
 * before.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC_ROOT = path.join(REPO_ROOT, 'src');
const SAFE_NAME = /^[a-zA-Z0-9_-]+$/;

/**
 * @typedef {object} ScriptEntry
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {string} category
 * @property {string} path
 * @property {string} page
 * @property {boolean} writes
 * @property {string[]} aliases
 */

/** @type {{scripts: ScriptEntry[]}|null} */
let manifest = null;

/** @returns {{scripts: ScriptEntry[]}} The committed browser/index.json, read once. */
function loadManifest() {
  if (!manifest) manifest = JSON.parse(readFileSync(path.join(REPO_ROOT, 'browser', 'index.json'), 'utf8'));
  return manifest;
}

/**
 * Split a public id into its collection and name, or null when it is not one.
 * @param {string} scriptPath - e.g. "src/unfollowback" or "automation/autoLiker"
 * @returns {{collection: 'src'|'automation', name: string}|null}
 */
function parseId(scriptPath) {
  const m = /^(src|automation)\/([^/]+)$/.exec(String(scriptPath).replace(/\.js$/, ''));
  if (!m || !SAFE_NAME.test(m[2])) return null;
  return { collection: /** @type {'src'|'automation'} */ (m[1]), name: m[2] };
}

/**
 * The repository paths a public id has meant over time, most specific first.
 * @param {{collection: string, name: string}} id
 * @returns {string[]}
 */
function candidatePaths({ collection, name }) {
  if (collection === 'automation') return [`src/automation/${name}.js`];
  return [`browser/${name}.js`, `scripts/${name}.js`];
}

/**
 * The manifest entry a public id names, or null.
 * @param {string} scriptPath
 * @returns {ScriptEntry|null}
 */
export function findScript(scriptPath) {
  const id = parseId(scriptPath);
  if (!id) return null;
  const { scripts } = loadManifest();
  for (const candidate of candidatePaths(id)) {
    const entry = scripts.find((s) => s.path === candidate || s.aliases.includes(candidate));
    if (entry) return entry;
  }
  return null;
}

/**
 * What the free listing shows about a script, or null for an id that is not
 * a console script.
 * @param {string} scriptPath
 * @returns {{id: string, title: string, description: string, category: string, page: string, writes: boolean, file: string}|null}
 */
export function describeScript(scriptPath) {
  const entry = findScript(scriptPath);
  if (!entry) return null;
  return {
    id: entry.id,
    title: entry.title,
    description: entry.description,
    category: entry.category,
    page: entry.page,
    writes: entry.writes,
    file: entry.path,
  };
}

/**
 * The absolute file that serves a public id, or null when the id is malformed
 * or escapes its tree.
 * @param {string} scriptPath
 * @returns {string|null}
 */
export function resolveScriptFile(scriptPath) {
  const id = parseId(scriptPath);
  if (!id) return null;
  const entry = findScript(scriptPath);
  if (entry) return path.join(REPO_ROOT, entry.path);

  // Not a console script: a Node module that still lives in src/.
  const root = id.collection === 'automation' ? path.join(SRC_ROOT, 'automation') : SRC_ROOT;
  const filePath = path.resolve(root, `${id.name}.js`);
  if (!filePath.startsWith(root + path.sep)) return null;
  if (existsSync(filePath)) return filePath;
  return path.join(REPO_ROOT, 'browser', `${id.name}.js`);
}
