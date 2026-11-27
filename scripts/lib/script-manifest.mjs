// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Reads a browser console script and describes it as one manifest entry.
 *
 * Everything here is derived from the file itself: the header comment gives
 * the title, description, version and the page to run it on, and the AST gives
 * the CONFIG object (name, type and default of each option). Nothing is kept by
 * hand, so a new script lands in browser/index.json the moment it exists, and
 * an edited header changes the manifest on the next build.
 *
 * Used by scripts/build-script-manifest.mjs (writes browser/index.json) and by
 * scripts/build-userscripts.mjs (reads it back to wrap each script).
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { parse } from 'acorn';

/** Identifiers a script uses for its settings object, in order of preference. */
export const CONFIG_NAMES = ['CONFIG', 'OPTIONS', 'SETTINGS'];

/** Option names that switch a script into preview mode. */
export const DRY_RUN_NAMES = ['dryRun', 'DRY_RUN'];

/**
 * Category rules, first match wins. They key on the script id and its
 * description, so a new script is placed without editing this file as long as
 * its name says what it does. The last rule catches everything else.
 *
 * @type {Array<{category: string, test: RegExp}>}
 */
export const CATEGORY_RULES = [
  { category: 'Block, mute and report', test: /block|mute|reportSpam|bots/i },
  { category: 'Unfollow and clean up', test: /^unfollow|^smartUnfollow|^unlike|^clearAll|^bulkDelete|^leaveAll|^removeFollowers|^protectActiveUsers/i },
  { category: 'Followers and audience', test: /unfollowers|follower|audience|^monitorAccount|^continuousMonitor|^followRatio/i },
  { category: 'Analytics', test: /analytic|performance|bestTime|optimizer|sentiment|viral|trending|shadowban|competitor|leaderboard|health|abtester|keywordMonitor/i },
  { category: 'Messages', test: /dm|message/i },
  { category: 'Communities and Spaces', test: /communit|space/i },
  { category: 'Follow and grow', test: /^follow|^keywordFollow|^growth|^algorithm/i },
  { category: 'Engagement', test: /like|repost|reply|replies|engag|quoteTweet|commenter|mention|interactions|plug|customerService/i },
  { category: 'Posting and content', test: /post|thread|tweet|poll|schedul|composer|formatting|content|media|caption|pin/i },
  { category: 'Scrape and export', test: /scrape|scraper|download|backup|export|timelineViewer|embed|qrCode/i },
  { category: 'Lists, bookmarks and search', test: /list|bookmark|topic|search/i },
  { category: 'Automation toolkit', test: /^actions$|controlPanel|multiAccount|quotaSupervisor|sessionLogger/i },
  { category: 'Account, settings and Premium', test: /.*/ },
];

/**
 * Signals that a script changes the account. Any one is enough. These are the
 * buttons X only shows for an action (confirm sheets, send and post buttons,
 * follow state toggles), plus a dry-run switch, which only a writing script
 * needs. A false positive costs the user one confirmation dialog; a false
 * negative would let a write run without one, so the list leans wide.
 */
const WRITE_SIGNALS = [
  /\b(?:dryRun|DRY_RUN)\b/,
  /confirmationSheetConfirm/,
  /tweetButton(?:Inline)?\b/,
  /dmComposerSendButton/,
  /(?:un)?retweetConfirm/,
  /\$="-(?:un)?(?:follow|block|mute)"/,
  /data-testid\$?=\\?["']?-?(?:un)?(?:follow|block|mute)\\?["']?\]/,
  /"(?:un)?(?:follow|block|mute)"\s*[,}\]]/,
  /removeBookmark/,
  // core.js selector names, used by the src/automation scripts
  /SELECTORS\.(?:follow|unfollow|like|retweet|reply|confirm)Button\b/,
  // likeBtn.click(), followButton?.click(), deleteOption.click() ...
  /\b\w*(?:like|retweet|repost|follow|block|mute|delete|send|post|pin|join|leave|reply|submit|confirm|bookmark|gift)\w*\s*(?:\?\.|\.)click\(\)/i,
];

/** Placeholder path segments in "Go to x.com/YOUR_USERNAME/following" lines. */
const PLACEHOLDER = /^(?:[A-Z][A-Z0-9_]*[A-Z0-9]|your[a-z_]*|username|handle|user)$/;

/**
 * Turn a camelCase id into words, keeping the acronyms X uses.
 *
 * @param {string} id
 * @returns {string}
 */
export function humanizeId(id) {
  const words = id
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/\s+/)
    .map((word) => {
      const lower = word.toLowerCase();
      if (['dm', 'id', 'qr', 'ab'].includes(lower)) return lower.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1);
    });
  return words.join(' ');
}

/**
 * Replace em and en dashes in text copied from a script, because generated
 * docs follow the house style, which uses neither: a spaced em dash becomes a
 * colon, any other dash a hyphen.
 *
 * @param {string} text
 * @returns {string}
 */
export function plainDashes(text) {
  return text.replace(/\s+[\u2014\u2013]\s+/g, ': ').replace(/[\u2014\u2013]/g, '-');
}

/**
 * Strip emoji, decoration and boilerplate from a header title.
 *
 * @param {string} text
 * @returns {string}
 */
function cleanTitle(text) {
  return text
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, '')
    .replace(/\s+[\u2014-]\s+(?:Production Grade|by nichxbt).*$/i, '')
    .replace(/\s+v\d+(?:\.\d+)*$/i, '')
    .replace(/\s+(?:on|from) X(?:\/Twitter)?$/i, '')
    .trim();
}

/**
 * The leading comment of a file: every `//` line and the first block comment,
 * up to the first line of code. Returned as plain text lines.
 *
 * @param {string} source
 * @returns {string[]}
 */
export function headerLines(source) {
  const lines = source.split('\n');
  const out = [];
  let inBlock = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (inBlock) {
      if (line.includes('*/')) {
        inBlock = false;
        const before = line.slice(0, line.indexOf('*/')).replace(/^\*\s?/, '').trim();
        if (before) out.push(before);
        continue;
      }
      out.push(line.replace(/^\*\s?/, ''));
      continue;
    }
    if (line.startsWith('//')) {
      out.push(line.replace(/^\/\/\s?/, ''));
      continue;
    }
    if (line.startsWith('/*')) {
      const rest = line.replace(/^\/\*+\s?/, '');
      if (rest.includes('*/')) {
        out.push(rest.slice(0, rest.indexOf('*/')).trim());
      } else {
        inBlock = true;
        if (rest) out.push(rest);
      }
      continue;
    }
    if (line === '') {
      out.push('');
      continue;
    }
    break;
  }
  return out.filter((l) => !/^copyright\b/i.test(l));
}

/**
 * Read one JSDoc tag, joining its continuation lines.
 *
 * @param {string[]} lines
 * @param {string} tag
 * @returns {string|null}
 */
function readTag(lines, tag) {
  const index = lines.findIndex((l) => l.startsWith(`@${tag} `) || l.startsWith(`@${tag}\t`));
  if (index === -1) return null;
  const parts = [lines[index].slice(tag.length + 1).trim()];
  for (let i = index + 1; i < lines.length; i++) {
    const next = lines[i];
    if (next.trim() === '' || next.startsWith('@') || /^[=]{5,}/.test(next)) break;
    parts.push(next.trim());
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

/** Lines that carry no description: links, bylines, file names, usage steps. */
function isNoise(line, id) {
  return (
    line === '' ||
    /^https?:\/\//.test(line) ||
    /^by\s/i.test(line) ||
    /^@/.test(line) ||
    /^[=─-]{3,}/.test(line) ||
    /^(?:browser|scripts|src)\/\S+\.js$/.test(line) ||
    new RegExp(`^${id}\\.js$`, 'i').test(line) ||
    /^\d+\.\s/.test(line) ||
    /^(?:how to use|usage|features|controls|available tools|requires)\b/i.test(line) ||
    /^last updated/i.test(line) ||
    /paste (?:in|this|core)/i.test(line) ||
    /^XActions Automation\b/i.test(line)
  );
}

/**
 * Title, description and version from the header comment.
 *
 * @param {string} source
 * @param {string} id
 * @returns {{title: string, description: string, version: string|null, date: string|null}}
 */
export function parseHeader(source, id) {
  const lines = headerLines(source);
  let title = null;
  let description = readTag(lines, 'description');

  // Banner style: a title line between two rows of '='.
  const bannerIndex = lines.findIndex((l) => /^={10,}$/.test(l));
  if (bannerIndex !== -1 && lines[bannerIndex + 1] && !lines[bannerIndex + 1].startsWith('@')) {
    title = cleanTitle(lines[bannerIndex + 1]);
  }

  // "XActions Automation - Timeline Auto-Liker"
  const automation = lines.find((l) => /^XActions Automation\s*[\u2014-]+\s*/.test(l));
  if (!title && automation) title = cleanTitle(automation.replace(/^XActions Automation\s*[\u2014-]+\s*/, ''));

  // "Audit Followers on X - by nichxbt", and the em dash form of the same
  const byline = lines.find((l) => /\s[\u2014-]\s*by nichxbt\s*$/i.test(l));
  if (!title && byline) title = cleanTitle(byline.replace(/\s[\u2014-]\s*by nichxbt\s*$/i, ''));

  // "DetectUnfollowers.js - Find out who unfollowed you", or with an em dash
  const named = lines.find((l) => new RegExp(`^${id}\\.js\\s+[\\u2014-]\\s+`, 'i').test(l));
  if (!description && named) description = named.replace(/^\S+\.js\s+[\u2014-]\s+/, '').trim();

  if (!description) {
    const candidate = lines.find((l) => !isNoise(l, id) && l !== byline && !/^\s*[-*]\s/.test(l));
    if (candidate) description = candidate.replace(/^Browser console script for /i, '');
  }

  title = title || humanizeId(id);
  description = (description || title).replace(/\s+/g, ' ').trim();
  if (!/[.!?]$/.test(description)) description += '.';
  description = description.charAt(0).toUpperCase() + description.slice(1);

  return {
    title: plainDashes(title),
    description: plainDashes(description),
    version: readTag(lines, 'version'),
    date: readTag(lines, 'date'),
  };
}

/**
 * Glob patterns for the page a script expects, from its "Go to ..." step.
 * `*` matches one path segment and `**` matches anything. Hosts are written as
 * x.com; the runtime treats twitter.com as the same site.
 *
 * @param {string} source
 * @returns {string[]} Never empty: a script that names no page runs anywhere on x.com.
 */
export function parsePages(source) {
  const ANY = 'https://x.com/**';
  const lines = source.split('\n').slice(0, 80).map((l) => l.replace(/^\s*(?:\/\/|\*)\s?/, ''));
  const step =
    lines.find((l) => /^\s*\d+\.\s*(?:go to|navigate to|open)\b/i.test(l) && /(?:x|twitter)\.com/i.test(l)) ||
    lines.find((l) => /paste (?:this script )?in(?: the)? devtools console on\b/i.test(l) && /(?:x|twitter)\.com/i.test(l)) ||
    lines.find((l) => /^\s*\d+\.\s*(?:go to|navigate to)\b/i.test(l));
  if (!step) return [ANY];

  const tokenRe = /(?:https?:\/\/)?((?:[a-z]+\.)?(?:x|twitter)\.com)(\/[^\s,)'"`]*)?/gi;
  const patterns = [];
  let rest = step;
  for (const match of step.matchAll(tokenRe)) {
    rest = rest.replace(match[0], ' ');
    let host = match[1].toLowerCase().replace(/twitter\.com$/, 'x.com');
    if (host === 'www.x.com' || host === 'mobile.x.com') host = 'x.com';
    const path = (match[2] || '').replace(/[?#].*$/, '').replace(/[.:;]+$/, '');
    const segments = path.split('/').filter(Boolean).map((s) => (PLACEHOLDER.test(s) ? '*' : s));
    patterns.push(segments.length ? `https://${host}/${segments.join('/')}` : `https://${host}/**`);
  }
  // "x.com/home or a specific tweet", "x.com (any page)": the step allows pages
  // its URLs do not name, so the script is not tied to one.
  if (patterns.length === 0 || /\b(?:any|specific|existing|or an? )\b/i.test(rest)) {
    const extraHosts = patterns.map((p) => new URL(p.replace(/\*+/g, 'x')).host).filter((h) => h !== 'x.com');
    return [...new Set([ANY, ...extraHosts.map((h) => `https://${h}/**`)])];
  }
  return [...new Set(patterns)];
}

/**
 * Evaluate a literal AST node to a JSON value.
 *
 * @param {object} node
 * @returns {{ok: true, value: unknown}|{ok: false}}
 */
function literalValue(node) {
  switch (node.type) {
    case 'Literal':
      if (node.regex) return { ok: false };
      return { ok: true, value: node.value };
    case 'TemplateLiteral':
      if (node.expressions.length) return { ok: false };
      return { ok: true, value: node.quasis.map((q) => q.value.cooked).join('') };
    case 'UnaryExpression': {
      if (node.operator !== '-' && node.operator !== '+') return { ok: false };
      const inner = literalValue(node.argument);
      if (!inner.ok || typeof inner.value !== 'number') return { ok: false };
      return { ok: true, value: node.operator === '-' ? -inner.value : inner.value };
    }
    case 'ArrayExpression': {
      const values = [];
      for (const element of node.elements) {
        if (!element) return { ok: false };
        const v = literalValue(element);
        if (!v.ok) return { ok: false };
        values.push(v.value);
      }
      return { ok: true, value: values };
    }
    case 'ObjectExpression': {
      const value = {};
      for (const prop of node.properties) {
        if (prop.type !== 'Property' || prop.computed || prop.kind !== 'init') return { ok: false };
        const key = prop.key.type === 'Identifier' ? prop.key.name : String(prop.key.value);
        const v = literalValue(prop.value);
        if (!v.ok) return { ok: false };
        value[key] = v.value;
      }
      return { ok: true, value };
    }
    default:
      return { ok: false };
  }
}

/**
 * Type name for an option value.
 *
 * @param {object} node
 * @param {unknown} value
 * @param {boolean} ok
 * @returns {string}
 */
function optionType(node, value, ok) {
  if (ok) {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }
  if (node.type === 'Identifier' && (node.name === 'Infinity' || node.name === 'NaN')) return 'number';
  if (node.type === 'UnaryExpression' && node.argument.type === 'Identifier' && node.argument.name === 'Infinity') return 'number';
  if (node.type === 'Literal' && node.regex) return 'regexp';
  if (node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression') return 'function';
  if (node.type === 'TemplateLiteral') return 'string';
  if (node.type === 'ArrayExpression') return 'array';
  if (node.type === 'ObjectExpression') return 'object';
  return 'expression';
}

/**
 * Parse a script, returning the AST and its comments, or throwing with the
 * file name in the message.
 *
 * @param {string} source
 * @param {string} label
 * @returns {{ast: object, comments: Array<{value: string, start: number, end: number, loc: object}>}}
 */
export function parseScript(source, label) {
  const comments = [];
  try {
    const ast = parse(source, {
      ecmaVersion: 'latest',
      sourceType: 'script',
      locations: true,
      allowHashBang: true,
      onComment: comments,
    });
    return { ast, comments };
  } catch (error) {
    throw new Error(`${label}: cannot parse: ${error.message}`, { cause: error });
  }
}

/**
 * Find the settings object: the first CONFIG/OPTIONS/SETTINGS declaration
 * whose initialiser is an object literal, preferring the shallowest one.
 *
 * @param {object} ast
 * @returns {{name: string, node: object}|null} node is the ObjectExpression.
 */
export function findConfigObject(ast) {
  const found = [];
  const visit = (node, depth) => {
    if (!node || typeof node.type !== 'string') return;
    if (
      node.type === 'VariableDeclarator' &&
      node.id.type === 'Identifier' &&
      CONFIG_NAMES.includes(node.id.name) &&
      node.init &&
      node.init.type === 'ObjectExpression'
    ) {
      found.push({ name: node.id.name, node: node.init, depth });
    }
    const isFunction = /Function/.test(node.type);
    for (const key of Object.keys(node)) {
      if (key === 'loc') continue;
      const child = node[key];
      if (Array.isArray(child)) child.forEach((c) => visit(c, depth + (isFunction ? 1 : 0)));
      else if (child && typeof child.type === 'string') visit(child, depth + (isFunction ? 1 : 0));
    }
  };
  visit(ast, 0);
  if (found.length === 0) return null;
  found.sort((a, b) => a.depth - b.depth || CONFIG_NAMES.indexOf(a.name) - CONFIG_NAMES.indexOf(b.name) || a.node.start - b.node.start);
  return { name: found[0].name, node: found[0].node };
}

/**
 * Describe each option of the settings object.
 *
 * @param {string} source
 * @param {object} objectNode - The ObjectExpression from findConfigObject.
 * @param {Array<{value: string, start: number, loc: object}>} comments
 * @returns {Array<{name: string, type: string, default?: unknown, expression?: string, description?: string}>}
 */
export function describeConfig(source, objectNode, comments) {
  const options = [];
  for (const prop of objectNode.properties) {
    if (prop.type !== 'Property' || prop.computed) continue;
    const name = prop.key.type === 'Identifier' ? prop.key.name : String(prop.key.value);
    const evaluated = literalValue(prop.value);
    const entry = { name, type: optionType(prop.value, evaluated.value, evaluated.ok) };
    if (evaluated.ok) entry.default = evaluated.value;
    else entry.expression = source.slice(prop.value.start, prop.value.end).replace(/\s+/g, ' ');

    const line = prop.loc.end.line;
    const trailing = comments.find((c) => c.type === 'Line' && c.loc.start.line === line && c.start >= prop.value.end);
    const leading = comments.find((c) => c.type === 'Line' && c.loc.start.line === prop.loc.start.line && c.start > prop.key.end && c.start < prop.value.start);
    const text = (trailing || leading)?.value.trim().replace(/^[-\u2014\s]+/, '');
    if (text) entry.description = plainDashes(text);
    options.push(entry);
  }
  return options;
}

/**
 * True when the script stops unless src/automation/core.js was pasted first.
 *
 * @param {string} source
 * @returns {boolean}
 */
export function detectNeedsCore(source) {
  const head = headerLines(source).join('\n');
  if (/REQUIRES:\s*Paste core\.js first/i.test(head)) return true;
  if (/Paste core\.js FIRST/.test(head) && !/optional/i.test(head)) return true;
  return /if\s*\(\s*!\s*(?:window\.)?XActions\?\.Core\s*\)|if\s*\(\s*!\s*Core\s*\)/.test(source);
}

/**
 * True when the script changes the account (see WRITE_SIGNALS).
 *
 * @param {string} source
 * @returns {boolean}
 */
export function detectWrites(source) {
  return WRITE_SIGNALS.some((re) => re.test(source));
}

/**
 * Pick the category for a script.
 *
 * @param {string} id
 * @returns {string}
 */
export function categorize(id) {
  return CATEGORY_RULES.find((rule) => rule.test.test(id)).category;
}

/**
 * Build the manifest entry for one script.
 *
 * @param {{id: string, path: string, source: string}} input
 * @returns {object}
 */
export function describeScript({ id, path, source }) {
  const header = parseHeader(source, id);
  const pages = parsePages(source);
  const { ast, comments } = parseScript(source, path);
  const configObject = findConfigObject(ast);
  const config = configObject ? describeConfig(source, configObject.node, comments) : [];
  const dryRunOption = config.find((o) => DRY_RUN_NAMES.includes(o.name));

  return {
    id,
    title: header.title,
    description: header.description,
    category: categorize(id),
    path,
    version: header.version,
    page: pages[0],
    pages,
    writes: detectWrites(source),
    supportsDryRun: Boolean(dryRunOption),
    dryRunDefault: dryRunOption && dryRunOption.type === 'boolean' ? dryRunOption.default : null,
    needsCore: detectNeedsCore(source),
    configName: configObject ? configObject.name : null,
    config,
    aliases: [],
  };
}
