#!/usr/bin/env node
// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Build the retrieval index behind Ask XActions (/ask and POST /api/ask).
 *
 * Reads everything a user might ask about and writes one JSON file the
 * engine searches with BM25 (src/ask/engine.js):
 *
 *   docs/**\/*.md, skills/*\/SKILL.md, tutorials/**\/*.md   -> the live docs page
 *                                                           (via dashboard/docs/_pages-manifest.json)
 *   README.md, CHANGELOG.md, AGENTS.md                      -> GitHub blob URL
 *   browser/*.js and scripts/*.js browser scripts (header docs) -> /scripts/<slug> when a page exists
 *   dashboard/*.html marketing pages (FAQ, pricing, ...)    -> the page URL
 *
 * Output: dashboard/data/ask-index.json (served as /data/ask-index.json), plus a
 * browser copy of the engine at dashboard/js/ask/ so the page can answer even
 * when no API origin is reachable. Delegates to build-ask-actions.mjs for the
 * catalog of runnable scripts, commands and MCP tools, so one command (and one
 * --check) keeps every Ask artifact in step.
 *
 * Usage:
 *   node scripts/build-ask-index.mjs           # write
 *   node scripts/build-ask-index.mjs --check   # exit 1 if the committed index is stale
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license Apache-2.0
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { join, dirname, relative, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'dashboard', 'data', 'ask-index.json');
const ENGINE_SRC = join(ROOT, 'src', 'ask');
const ENGINE_OUT = join(ROOT, 'dashboard', 'js', 'ask');
const BLOB = 'https://github.com/nirholas/XActions/blob/main/';
const CHECK = process.argv.includes('--check');
const MAX_CHUNK = 1100;

const manifest = JSON.parse(readFileSync(join(ROOT, 'dashboard', 'docs', '_pages-manifest.json'), 'utf8'));
const pageBySource = new Map(manifest.map((p) => [p.sourcePath, p]));
const scriptPages = new Set(readdirSync(join(ROOT, 'dashboard', 'scripts')).filter((f) => f.endsWith('.html')).map((f) => f.replace(/\.html$/, '')));

function* walk(dir, ext) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full, ext);
    else if (entry.name.endsWith(ext)) yield full;
  }
}

const rel = (p) => relative(ROOT, p).split('\\').join('/');

/**
 * Pull YAML frontmatter off a markdown file. Raw frontmatter used to land in
 * the index verbatim, so a retrieved passage could read
 * "--- name: x description: y license: Apache-2.0 metadata: author: n..."
 * instead of prose. The description is real content, so it is kept as a
 * sentence; the rest of the keys are dropped.
 */
function stripFrontmatter(md) {
  const match = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return md;
  const description = match[1].match(/^description:\s*(.+)$/m)?.[1]?.replace(/^["']|["']$/g, '').trim();
  const body = md.slice(match[0].length);
  return description ? `${description}\n\n${body}` : body;
}

/**
 * Keyword stuffing (the long comma-separated runs in SEO meta tags) matches
 * many queries and teaches the reader nothing, so it never becomes a chunk.
 * Code is comma-heavy too, which is why anything with code punctuation or
 * line breaks is exempt: this only catches a single run-on line of short
 * comma-separated phrases.
 */
function isKeywordDump(text) {
  if (text.includes('\n') || /[{};=()<>[\]`]/.test(text)) return false;
  const parts = text.split(',');
  if (parts.length < 12) return false;
  const short = parts.filter((p) => {
    const words = p.trim().split(/\s+/).length;
    return words >= 1 && words <= 6;
  }).length;
  return short / parts.length > 0.9;
}

function cleanMarkdown(text) {
  return text
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/<\/?[a-z][^>]*>/gi, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function titleOf(md, fallback) {
  const m = md.match(/^#\s+(.+)$/m);
  return (m ? m[1] : fallback).replace(/[*_`]/g, '').trim();
}

/** Split markdown into heading-scoped sections, then into MAX_CHUNK pieces at paragraph boundaries. */
function chunkMarkdown(rawMd, docTitle) {
  const md = stripFrontmatter(rawMd);
  const sections = [];
  let heading = '';
  let buf = [];
  const flush = () => {
    const body = cleanMarkdown(buf.join('\n'));
    if (body.length > 40 && !isKeywordDump(body)) sections.push({ heading, body });
    buf = [];
  };
  for (const line of md.split('\n')) {
    const h = line.match(/^(#{1,4})\s+(.+)$/);
    if (h) {
      flush();
      heading = h[2].replace(/[*_`#]/g, '').trim();
      if (heading === docTitle) heading = '';
      continue;
    }
    buf.push(line);
  }
  flush();
  const chunks = [];
  for (const { heading: h, body } of sections) {
    const title = h ? `${docTitle} › ${h}` : docTitle;
    let current = '';
    for (const para of body.split(/\n\n+/)) {
      if (current && current.length + para.length + 2 > MAX_CHUNK) {
        chunks.push({ t: title, x: current });
        current = '';
      }
      if (para.length > MAX_CHUNK) {
        if (current) chunks.push({ t: title, x: current });
        current = '';
        for (let i = 0; i < para.length; i += MAX_CHUNK) chunks.push({ t: title, x: para.slice(i, i + MAX_CHUNK) });
        continue;
      }
      if (isKeywordDump(para)) continue;
      current = current ? `${current}\n\n${para}` : para;
    }
    if (current) chunks.push({ t: title, x: current });
  }
  return chunks;
}

const chunks = [];
const counts = {};
function add(kind, path, url, list) {
  for (const c of list) chunks.push({ t: c.t, u: url, p: path, k: kind, x: c.x });
  counts[kind] = (counts[kind] || 0) + list.length;
}

// 1. Markdown that has a live docs page (docs/, skills/, tutorials/, prompts).
const SKIP_MD = /^(docs\/(audits|pr-reviews|research|seo|seo-articles|launch|articles)\/|docs\/GROWTH_STRATEGY|node_modules|archive)/;
// docs/examples/*.md run to 40 KB each (152 files): the first sections carry the
// what/where/how a question needs, the long tail is configuration tables.
const EXAMPLE_CHUNK_CAP = 6;
// Any single document is capped so one sprawling reference cannot crowd the
// index (and the browser fallback download) on its own.
const DOC_CHUNK_CAP = 40;
const mdRoots = ['docs', 'skills', 'tutorials'];
for (const root of mdRoots) {
  for (const file of walk(join(ROOT, root), '.md')) {
    const path = rel(file);
    if (SKIP_MD.test(path)) continue;
    const md = readFileSync(file, 'utf8');
    const page = pageBySource.get(path);
    const title = page ? page.title : titleOf(md, basename(path, '.md'));
    const url = page ? `https://xactions.app${page.urlPath}` : `${BLOB}${path}`;
    let list = chunkMarkdown(md, title);
    list = list.slice(0, path.startsWith('docs/examples/') ? EXAMPLE_CHUNK_CAP : DOC_CHUNK_CAP);
    add(page ? (root === 'skills' ? 'skill' : 'doc') : 'repo', path, url, list);
  }
}

// 2. Top-level repo documents.
for (const name of ['README.md', 'CHANGELOG.md', 'AGENTS.md', 'SECURITY.md', 'CONTRIBUTING.md']) {
  const file = join(ROOT, name);
  if (!existsSync(file)) continue;
  let md = readFileSync(file, 'utf8');
  if (name === 'CHANGELOG.md') md = md.slice(0, 40000);
  add('repo', name, `${BLOB}${name}`, chunkMarkdown(md, titleOf(md, name)));
}

// 3. Browser scripts: the header block documents what the script does and where to paste it.
const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
for (const dir of ['browser', 'scripts']) {
  for (const entry of readdirSync(join(ROOT, dir))) {
    if (!entry.endsWith('.js') || entry.endsWith('.mjs')) continue;
    const file = join(ROOT, dir, entry);
    if (!statSync(file).isFile()) continue;
    const source = readFileSync(file, 'utf8');
    const headerLines = [];
    for (const line of source.split('\n').slice(0, 80)) {
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
        headerLines.push(trimmed.replace(/^\/\*+|^\*+\/?|^\/\/+/g, '').replace(/^@(\w+)\s+/, '$1: ').trim());
      } else if (trimmed && headerLines.length) break;
    }
    const header = headerLines.filter((l) => l && !/^=+$/.test(l) && !/Copyright/.test(l)).join('\n');
    if (header.length < 80) continue;
    const slug = kebab(basename(entry, '.js'));
    const path = `${dir}/${entry}`;
    const url = scriptPages.has(slug) ? `https://xactions.app/scripts/${slug}` : `${BLOB}${path}`;
    const title = (header.match(/(?:name|description):\s*(.+)/)?.[1] || basename(entry, '.js')).replace(/\.js$/, '');
    add('script', path, url, chunkMarkdown(`# ${basename(entry, '.js')} (${path})\n\n${header}`, `${title} (${path})`));
  }
}

// 4. Dashboard marketing pages: FAQ, pricing, features, security, extension, MCP, ...
const PAGES = ['faq', 'pricing', 'features', 'about', 'extension', 'mcp', 'compare', 'use-cases', 'security', 'privacy', 'terms', 'contact', 'integrations', 'a2a', 'ai-api', 'agent', 'unfollowers', 'video', 'run'];
for (const page of PAGES) {
  const file = join(ROOT, 'dashboard', `${page}.html`);
  if (!existsSync(file)) continue;
  const html = readFileSync(file, 'utf8');
  const main = html.match(/<main[\s\S]*?<\/main>/i)?.[0] || html;
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1].split('|')[0].replace(/[—-]\s*XActions.*$/, '').trim() || page;
  const text = main
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<(h[1-4])[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, h) => `\n## ${h.replace(/<[^>]+>/g, '').trim()}\n`)
    .replace(/<(li|p|tr|div|section|article|br)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n\n');
  add('page', `dashboard/${page}.html`, `https://xactions.app/${page}`, chunkMarkdown(`# ${title}\n${text}`, title));
}

chunks.sort((a, b) => a.p.localeCompare(b.p) || a.t.localeCompare(b.t) || a.x.localeCompare(b.x));
const digest = createHash('sha256').update(JSON.stringify(chunks)).digest('hex').slice(0, 16);
// One chunk per line: a doc edit then shows up as a few changed lines in git
// instead of rewriting a single multi-megabyte line.
const json = `{"version":1,"digest":${JSON.stringify(digest)},"counts":${JSON.stringify(counts)},"chunks":[\n${chunks.map((c) => JSON.stringify(c)).join(',\n')}\n]}`;

const engineFiles = readdirSync(ENGINE_SRC).filter((f) => f.endsWith('.js'));
const stale = [];
if (!existsSync(OUT) || readFileSync(OUT, 'utf8') !== json) stale.push(rel(OUT));
for (const f of engineFiles) {
  const out = join(ENGINE_OUT, f);
  if (!existsSync(out) || readFileSync(out, 'utf8') !== readFileSync(join(ENGINE_SRC, f), 'utf8')) stale.push(rel(out));
}

// The action catalog ships beside the index and is checked with it.
execFileSync(process.execPath, [join(ROOT, 'scripts', 'build-ask-actions.mjs'), ...(CHECK ? ['--check'] : [])], { stdio: 'inherit' });

if (CHECK) {
  if (stale.length) {
    console.error(`❌ Ask index is stale: ${stale.join(', ')}\n   Run: npm run ask:index`);
    process.exit(1);
  }
  console.log(`✅ Ask index is current (${chunks.length} chunks, digest ${digest})`);
  process.exit(0);
}

mkdirSync(dirname(OUT), { recursive: true });
mkdirSync(ENGINE_OUT, { recursive: true });
writeFileSync(OUT, json);
for (const f of engineFiles) writeFileSync(join(ENGINE_OUT, f), readFileSync(join(ENGINE_SRC, f), 'utf8'));
console.log(`✅ ${rel(OUT)}: ${chunks.length} chunks, ${(json.length / 1024).toFixed(0)} KB (${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(', ')})`);
console.log(`✅ ${rel(ENGINE_OUT)}/: ${engineFiles.join(', ')} mirrored from src/ask/`);
