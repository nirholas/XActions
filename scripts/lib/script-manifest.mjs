// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * The browser console script manifest: one entry per tool, read from the
 * scripts themselves.
 *
 * Every console script has one canonical file in browser/. Its first doc block
 * carries the metadata (title, description, category, the x.com page to run
 * it on, whether it writes, and the legacy paths it replaces), and its first
 * `CONFIG` object literal carries the options. Nothing here is a hand-kept
 * list: add a script to browser/ with a header and it is in the manifest.
 *
 * Legacy paths (scripts/, scripts/twitter/, src/automation/ and old browser/
 * names) are kept as generated mirrors, because people paste from raw GitHub
 * URLs. A mirror is the canonical file with one generated line in front.
 *
 * Used by scripts/build-script-manifest.mjs (write and --check) and by the
 * test that holds the manifest to the tree.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'acorn';
import { isNodeProgram } from './is-node-program.mjs';

/** Where canonical scripts live. */
export const CANONICAL_DIR = 'browser';

/** Trees that may hold a legacy path (a generated mirror). */
export const LEGACY_DIRS = ['browser', 'scripts', 'scripts/twitter', 'src/automation'];

/**
 * Files in the legacy trees that are neither console scripts nor mirrors. The
 * Node programs among them are recognised by isNodeProgram; these two are
 * not Node programs but are not pasteable tools either.
 */
export const NOT_CONSOLE_SCRIPTS = new Set([
  // The command-center UI template that scripts/build-toolkit.mjs fills in.
  'scripts/twitter/_command-center-shell.js',
  // The bundle that scripts/build-toolkit.mjs writes.
  'scripts/twitter/xactions-command-center.js',
]);

/** Categories, in display order. A script's @category must be one of these ids. */
export const CATEGORIES = [
  { id: 'post', label: 'Post', emoji: '✍️' },
  { id: 'scrape', label: 'Scrape and Export', emoji: '📥' },
  { id: 'analytics', label: 'Analytics', emoji: '📊' },
  { id: 'monitor', label: 'Monitor', emoji: '👀' },
  { id: 'grow', label: 'Grow', emoji: '🌱' },
  { id: 'engage', label: 'Engage', emoji: '💬' },
  { id: 'cleanup', label: 'Clean Up', emoji: '🧹' },
  { id: 'safety', label: 'Safety', emoji: '🛡️' },
  { id: 'lists', label: 'Lists', emoji: '🗂️' },
  { id: 'communities', label: 'Communities', emoji: '👥' },
  { id: 'messages', label: 'Messages', emoji: '✉️' },
  { id: 'spaces', label: 'Spaces', emoji: '🎙️' },
  { id: 'profile', label: 'Profile and Settings', emoji: '🪪' },
  { id: 'premium', label: 'Premium and Business', emoji: '💎' },
  { id: 'ai', label: 'AI', emoji: '🤖' },
  { id: 'automation', label: 'Automation Suite', emoji: '⚙️' },
];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

const MIRROR_PREFIX = '// GENERATED FILE: a copy of ';

/**
 * The one line put in front of a mirror.
 * @param {string} canonicalPath - e.g. browser/unfollowEveryone.js
 * @returns {string}
 */
export function mirrorHeader(canonicalPath) {
  return `${MIRROR_PREFIX}${canonicalPath}, written by scripts/build-script-manifest.mjs. Edit ${canonicalPath} instead, then run: npm run browser:build`;
}

/**
 * A mirror's full contents.
 * @param {string} canonicalPath
 * @param {string} canonicalSource
 * @returns {string}
 */
export function mirrorContent(canonicalPath, canonicalSource) {
  return `${mirrorHeader(canonicalPath)}\n${canonicalSource}`;
}

/**
 * @param {string} source
 * @returns {boolean} True when the file is a generated mirror.
 */
export function isMirror(source) {
  return source.startsWith(MIRROR_PREFIX);
}

/**
 * The tags of the file's first doc block, as raw strings. Only a doc block
 * that sits in the leading comment region counts, so a helper's docstring deep
 * in the code is never read as the script's header.
 *
 * @param {string} source
 * @returns {Record<string, string>}
 */
export function parseHeader(source) {
  const lead = source.match(/^(?:\s*(?:\/\/[^\n]*|\/\*(?!\*)[\s\S]*?\*\/))*\s*(\/\*\*[\s\S]*?\*\/)/);
  if (!lead) return {};
  const tags = {};
  for (const line of lead[1].split('\n')) {
    const m = line.match(/^\s*\*\s*@(\w+)\s+(.*?)\s*$/);
    if (m && !(m[1] in tags)) tags[m[1]] = m[2];
  }
  return tags;
}

/**
 * Walk an acorn AST depth first, in source order, until visit returns true.
 * @param {object} node
 * @param {(node: object) => boolean} visit
 * @returns {boolean}
 */
function walk(node, visit) {
  if (!node || typeof node.type !== 'string') return false;
  if (visit(node)) return true;
  for (const key of Object.keys(node)) {
    if (key === 'loc' || key === 'start' || key === 'end') continue;
    const child = node[key];
    if (Array.isArray(child)) {
      for (const c of child) if (walk(c, visit)) return true;
    } else if (child && typeof child === 'object' && typeof child.type === 'string') {
      if (walk(child, visit)) return true;
    }
  }
  return false;
}

/** Thrown inside evaluate() when a value is not a constant. */
const NOT_CONSTANT = Symbol('not constant');

/**
 * The value of a constant expression, or NOT_CONSTANT.
 * @param {object} node
 * @returns {unknown}
 */
function evaluate(node) {
  switch (node.type) {
    case 'Literal':
      if (node.regex) return NOT_CONSTANT;
      return node.value;
    case 'TemplateLiteral':
      return node.expressions.length === 0 ? node.quasis.map((q) => q.value.cooked).join('') : NOT_CONSTANT;
    case 'Identifier':
      if (node.name === 'undefined') return null;
      return NOT_CONSTANT;
    case 'UnaryExpression': {
      const v = evaluate(node.argument);
      if (v === NOT_CONSTANT) return NOT_CONSTANT;
      if (node.operator === '-' && typeof v === 'number') return -v;
      if (node.operator === '+' && typeof v === 'number') return v;
      if (node.operator === '!') return !v;
      return NOT_CONSTANT;
    }
    case 'BinaryExpression': {
      const l = evaluate(node.left);
      const r = evaluate(node.right);
      if (l === NOT_CONSTANT || r === NOT_CONSTANT) return NOT_CONSTANT;
      if (node.operator === '+' && (typeof l === 'string' || typeof r === 'string')) return String(l) + String(r);
      if (typeof l !== 'number' || typeof r !== 'number') return NOT_CONSTANT;
      const out = { '*': l * r, '/': l / r, '+': l + r, '-': l - r, '%': l % r, '**': l ** r }[node.operator];
      return out === undefined || !Number.isFinite(out) ? NOT_CONSTANT : out;
    }
    case 'ArrayExpression': {
      const out = [];
      for (const el of node.elements) {
        if (!el || el.type === 'SpreadElement') return NOT_CONSTANT;
        const v = evaluate(el);
        if (v === NOT_CONSTANT) return NOT_CONSTANT;
        out.push(v);
      }
      return out;
    }
    case 'ObjectExpression': {
      const out = {};
      for (const prop of node.properties) {
        if (prop.type !== 'Property' || prop.computed || prop.kind !== 'init' || prop.method) return NOT_CONSTANT;
        const v = evaluate(prop.value);
        if (v === NOT_CONSTANT) return NOT_CONSTANT;
        out[prop.key.name ?? String(prop.key.value)] = v;
      }
      return out;
    }
    default:
      return NOT_CONSTANT;
  }
}

/**
 * @param {object} node - The value node.
 * @param {unknown} value - Its constant value, or NOT_CONSTANT.
 * @returns {string}
 */
function typeOf(node, value) {
  if (node.type === 'Literal' && node.regex) return 'regexp';
  if (node.type === 'Identifier' && (node.name === 'Infinity' || node.name === 'NaN')) return 'number';
  if (value === NOT_CONSTANT) {
    if (/Function/.test(node.type)) return 'function';
    return 'expression';
  }
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

/**
 * Parse a console script. They are classic scripts, so try that first; a few
 * use top-level await or return the way the console allows.
 * @param {string} source
 * @param {object[]} comments - Filled with the comments acorn sees.
 * @returns {object|null}
 */
function parseScript(source, comments) {
  const options = {
    ecmaVersion: 'latest',
    allowHashBang: true,
    allowReturnOutsideFunction: true,
    allowAwaitOutsideFunction: true,
    locations: true,
    onComment: comments,
  };
  for (const sourceType of ['script', 'module']) {
    comments.length = 0;
    try {
      return parse(source, { ...options, sourceType });
    } catch {
      // try the next source type
    }
  }
  return null;
}

/**
 * The options of a script: the keys of its first `CONFIG` object literal, with
 * each value's type, its default when the value is a constant, and the comment
 * that trails it on the same line.
 *
 * A value that is not plain JSON (Infinity, a regex, an expression that reads
 * the page) has `default: null` and its source text in `source`.
 *
 * @param {string} source
 * @returns {{name: string, type: string, default: unknown, description?: string, source?: string}[]}
 */
export function readConfig(source) {
  const comments = [];
  const ast = parseScript(source, comments);
  if (!ast) return [];
  let object = null;
  walk(ast, (node) => {
    if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier' && node.id.name === 'CONFIG') {
      if (node.init?.type === 'ObjectExpression') object = node.init;
      return true;
    }
    return false;
  });
  if (!object) return [];

  const lineComments = comments.filter((c) => c.type === 'Line');
  const out = [];
  for (const prop of object.properties) {
    if (prop.type !== 'Property' || prop.computed) continue;
    const name = prop.key.type === 'Identifier' ? prop.key.name : String(prop.key.value);
    const value = prop.value.type === 'Identifier' && (prop.value.name === 'Infinity' || prop.value.name === 'NaN')
      ? NOT_CONSTANT
      : evaluate(prop.value);
    const entry = { name, type: typeOf(prop.value, value), default: value === NOT_CONSTANT ? null : value };
    const trailing = lineComments.find((c) => c.start >= prop.end && c.loc.start.line === prop.loc.end.line);
    if (trailing) {
      const text = trailing.value.trim();
      if (text) entry.description = text;
    }
    if (value === NOT_CONSTANT) entry.source = source.slice(prop.value.start, prop.value.end).replace(/\s+/g, ' ');
    out.push(entry);
  }
  return out;
}

const DRY_RUN_KEYS = ['dryRun', 'DRY_RUN', 'dry_run'];

/**
 * One manifest entry, and the problems with its header.
 * @param {string} path - e.g. browser/unfollowEveryone.js
 * @param {string} source
 * @returns {{entry: object, problems: string[]}}
 */
export function describeScript(path, source) {
  const id = path.split('/').pop().replace(/\.js$/, '');
  const tags = parseHeader(source);
  const problems = [];
  const need = (tag) => {
    if (!tags[tag]) problems.push(`${path}: missing @${tag} in the first doc block`);
    return tags[tag] ?? '';
  };

  if (!source.startsWith('// Copyright')) problems.push(`${path}: line 1 must be the licence line`);
  const name = need('name');
  if (name && name !== `${id}.js`) problems.push(`${path}: @name is ${name}, expected ${id}.js`);
  const title = need('title');
  const description = need('description');
  const category = need('category');
  if (category && !CATEGORY_IDS.includes(category)) {
    problems.push(`${path}: @category ${category} is not one of ${CATEGORY_IDS.join(', ')}`);
  }
  const pageTag = need('page');
  const pages = pageTag.split(/\s+or\s+/).map((p) => p.trim()).filter(Boolean);
  for (const p of pages) if (!/^x\.com\//.test(p)) problems.push(`${path}: @page ${p} must start with x.com/`);
  const writesTag = need('writes');
  if (writesTag && writesTag !== 'true' && writesTag !== 'false') {
    problems.push(`${path}: @writes must be true or false, not ${writesTag}`);
  }
  const aliases = (tags.aliases ?? '').split(',').map((a) => a.trim()).filter(Boolean);

  const config = readConfig(source);
  // A top-level CONFIG.dryRun, or one inside an option group (CONFIG.cleanup.dryRun).
  let dryRun = config.find((c) => DRY_RUN_KEYS.includes(c.name));
  if (!dryRun) {
    for (const group of config.filter((c) => c.type === 'object' && c.default)) {
      const key = DRY_RUN_KEYS.find((k) => k in group.default);
      if (key) { dryRun = { default: group.default[key] }; break; }
    }
  }
  const supportsDryRun = Boolean(dryRun);

  return {
    entry: {
      id,
      title,
      description,
      category,
      path,
      page: pages[0] ?? '',
      pages,
      writes: writesTag === 'true',
      supportsDryRun,
      dryRunDefault: supportsDryRun ? (typeof dryRun.default === 'boolean' ? dryRun.default : null) : null,
      needsCore: id !== 'core' && /Core module not loaded/.test(source),
      version: tags.version ?? null,
      config,
      aliases,
    },
    problems,
  };
}

/** @param {string} root @param {string} dir @returns {string[]} repo-relative .js paths */
function listJs(root, dir) {
  const abs = join(root, dir);
  if (!existsSync(abs)) return [];
  return readdirSync(abs)
    .filter((f) => f.endsWith('.js') && statSync(join(abs, f)).isFile())
    .sort()
    .map((f) => `${dir}/${f}`);
}

/**
 * Build the manifest and the mirrors from the tree.
 *
 * @param {string} root - Repository root.
 * @returns {{manifest: object, mirrors: {path: string, content: string}[], problems: string[]}}
 */
export function buildScriptManifest(root) {
  const problems = [];
  const read = (p) => readFileSync(join(root, p), 'utf8');

  const described = [];
  for (const path of listJs(root, CANONICAL_DIR)) {
    const source = read(path);
    if (isMirror(source)) continue;
    described.push({ path, source, ...describeScript(path, source) });
  }
  // A browser/ file another script lists in @aliases is a renamed script whose
  // old name is about to become a mirror, not a second canonical script.
  const aliased = new Set(described.flatMap((d) => d.entry.aliases));
  const entries = [];
  const sources = new Map();
  for (const d of described) {
    if (aliased.has(d.path)) continue;
    entries.push(d.entry);
    sources.set(d.path, d.source);
    problems.push(...d.problems);
  }
  entries.sort((a, b) => a.id.localeCompare(b.id));

  const canonical = new Set(entries.map((e) => e.path));
  const claimedBy = new Map();
  const mirrors = [];
  for (const entry of entries) {
    for (const alias of entry.aliases) {
      if (!LEGACY_DIRS.some((d) => alias.startsWith(`${d}/`) && !alias.slice(d.length + 1).includes('/')) || !alias.endsWith('.js')) {
        problems.push(`${entry.path}: alias ${alias} is not a .js file in ${LEGACY_DIRS.join(', ')}`);
        continue;
      }
      if (canonical.has(alias)) {
        problems.push(`${entry.path}: alias ${alias} is itself a canonical script`);
        continue;
      }
      if (claimedBy.has(alias)) {
        problems.push(`${alias} is claimed by both ${claimedBy.get(alias)} and ${entry.path}`);
        continue;
      }
      claimedBy.set(alias, entry.path);
      mirrors.push({ path: alias, content: mirrorContent(entry.path, sources.get(entry.path)) });
    }
  }

  // Every console script in a legacy tree must be a mirror, so a new script
  // cannot land outside browser/ and quietly become a second copy again. Every
  // mirror must be claimed, so a renamed canonical cannot leave an orphan.
  for (const dir of LEGACY_DIRS) {
    for (const path of listJs(root, dir)) {
      if (canonical.has(path) || claimedBy.has(path) || NOT_CONSOLE_SCRIPTS.has(path)) continue;
      const source = read(path);
      if (isMirror(source)) {
        problems.push(`${path} is a generated mirror that no script lists in @aliases`);
      } else if (dir !== CANONICAL_DIR && !isNodeProgram(source)) {
        problems.push(`${path} is a console script outside browser/. Move it to browser/ with a header, and list this path in its @aliases`);
      }
    }
  }

  const manifest = {
    $comment: 'Generated by scripts/build-script-manifest.mjs from the header and CONFIG of each browser/*.js script. Do not edit by hand: run npm run browser:build.',
    version: 1,
    count: entries.length,
    categories: CATEGORIES,
    scripts: entries,
  };
  mirrors.sort((a, b) => a.path.localeCompare(b.path));
  return { manifest, mirrors, problems };
}

/**
 * The committed manifest.
 * @param {string} root
 * @returns {object}
 */
export function loadScriptManifest(root) {
  return JSON.parse(readFileSync(join(root, CANONICAL_DIR, 'index.json'), 'utf8'));
}

/**
 * Serialise the manifest the way it is committed.
 * @param {object} manifest
 * @returns {string}
 */
export function serializeManifest(manifest) {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}
