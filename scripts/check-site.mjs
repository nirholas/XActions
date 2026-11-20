#!/usr/bin/env node
// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Static check of the site exactly as Cloudflare Pages serves it.
 *
 * Models the deploy/cloudflare/build.sh layout without copying anything:
 * public/ then dashboard/ at the root (dashboard wins), site/index.html as /,
 * dashboard/index.html as /dashboard, plus the 200 rewrites in
 * deploy/cloudflare/_redirects. Pages serves /x from x, x.html or x/index.html.
 *
 * Fails on:
 *   - an internal href/src that the site does not serve
 *   - a #fragment link to an id that does not exist on the target page
 *   - an og:image / twitter:image on xactions.app that does not exist
 *   - a sitemap <loc> the site does not serve
 *   - an indexable page without <title>, meta description, canonical or og:image
 *   - an indexable page without exactly one <h1>
 *   - a generated copy of site/assets/* that differs from its source
 *
 * Runs offline in about a second. No browser, no network.
 *
 * Usage: node scripts/check-site.mjs [--verbose]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const VERBOSE = process.argv.includes('--verbose');
const SITE = 'https://xactions.app';

// ── The served file map: URL path -> file on disk ─────────────────────────
const served = new Map();
function addTree(dir, prefix = '') {
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, d.name);
    const url = `${prefix}/${d.name}`;
    if (d.isDirectory()) addTree(full, url);
    else served.set(url, full);
  }
}
addTree(path.join(ROOT, 'public'));
addTree(path.join(ROOT, 'dashboard'));
served.set('/dashboard.html', path.join(ROOT, 'dashboard', 'index.html'));
served.set('/index.html', path.join(ROOT, 'site', 'index.html'));
for (const f of ['llms.txt', 'llms-full.txt']) served.set(`/${f}`, path.join(ROOT, f));

const rewrites = new Map();
const redirectsFile = path.join(ROOT, 'deploy', 'cloudflare', '_redirects');
for (const line of fs.readFileSync(redirectsFile, 'utf8').split('\n')) {
  const [from, to] = line.trim().split(/\s+/);
  if (from?.startsWith('/') && to && !/^https?:/.test(to)) rewrites.set(from, to);
}

// Paths handled by Pages Functions or the API, never by static files.
const DYNAMIC = [/^\/api(\/|$)/, /^\/mcp$/, /^\/openapi\.json$/, /^\/\.well-known\//, /^\/thread\/[^/]+$/];

/** @returns {string|null} the file Pages would serve for a URL path */
function resolve(urlPath) {
  let p = urlPath;
  try { p = decodeURI(p); } catch { /* keep raw */ }
  const trimmed = p.replace(/\/+$/, '') || '';
  if (rewrites.has(trimmed)) p = rewrites.get(trimmed);
  const t = p.replace(/\/+$/, '');
  for (const c of [p, `${t}.html`, `${t}/index.html`]) if (served.has(c)) return served.get(c);
  return null;
}
const isDynamic = (u) => DYNAMIC.some((re) => re.test(u));

// ── Page facts, cached ────────────────────────────────────────────────────
const idCache = new Map();
function idsOf(file) {
  if (!idCache.has(file)) {
    const html = fs.readFileSync(file, 'utf8');
    idCache.set(file, new Set([...html.matchAll(/\s(?:id|name)\s*=\s*["']([^"']+)["']/g)].map((m) => m[1])));
  }
  return idCache.get(file);
}

const problems = new Map(); // kind -> Map(detail -> Set(pages))
function report(kind, detail, page) {
  if (!problems.has(kind)) problems.set(kind, new Map());
  const byDetail = problems.get(kind);
  if (!byDetail.has(detail)) byDetail.set(detail, new Set());
  byDetail.get(detail).add(page);
}

/** Strip code so example markup inside <pre>/<code> and scripts is not checked. */
function checkable(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<pre\b[\s\S]*?<\/pre>/gi, '')
    .replace(/<code\b[\s\S]*?<\/code>/gi, '')
    .replace(/<template\b[\s\S]*?<\/template>/gi, '');
}

// ── Pages ─────────────────────────────────────────────────────────────────
const pages = [...served.entries()].filter(([u]) => u.endsWith('.html'));
for (const [pageUrl, file] of pages) {
  const raw = fs.readFileSync(file, 'utf8');
  const html = checkable(raw);
  const head = raw.slice(0, raw.search(/<\/head>/i) + 1 || 20000);
  const indexable = !/<meta[^>]+name=["']robots["'][^>]+noindex/i.test(head) && pageUrl !== '/404.html';

  if (indexable) {
    if (!/<title\b[^>]*>[^<]+<\/title>/i.test(head)) report('missing <title>', '', pageUrl);
    if (!/<meta[^>]+name=["']description["']/i.test(head)) report('missing meta description', '', pageUrl);
    if (!/<link[^>]+rel=["']canonical["']/i.test(head)) report('missing canonical', '', pageUrl);
    if (!/<meta[^>]+property=["']og:image["']/i.test(head)) report('missing og:image', '', pageUrl);
    const h1 = (html.match(/<h1[\s>]/gi) || []).length;
    if (h1 !== 1) report('h1 count is not 1', `${h1} h1`, pageUrl);
  }

  for (const m of head.matchAll(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)["']/gi)) {
    if (m[1].startsWith(`${SITE}/`) && !resolve(m[1].slice(SITE.length))) report('og/twitter image does not exist', m[1], pageUrl);
  }

  for (const m of html.matchAll(/\s(href|src)\s*=\s*["']([^"']+)["']/gi)) {
    let href = m[2].trim();
    if (href.includes('${') || href.includes('{{')) continue; // template placeholders
    if (href.startsWith(SITE)) href = href.slice(SITE.length) || '/';
    else if (/^([a-z][a-z0-9+.-]*:|\/\/)/i.test(href)) continue; // external, mailto:, data:, javascript:
    const [pathPart, fragment] = href.split('#');
    const target = pathPart.split('?')[0];
    const pageDir = path.posix.dirname(pageUrl);
    const abs = target === '' ? pageUrl : target.startsWith('/') ? target : path.posix.join(pageDir, target);
    if (isDynamic(abs)) continue;
    const targetFile = target === '' ? file : resolve(abs);
    if (!targetFile) { report('broken internal link', abs, pageUrl); continue; }
    if (fragment && m[1].toLowerCase() === 'href' && targetFile.endsWith('.html') && !/^[/!]/.test(fragment)) {
      let decoded = fragment;
      try { decoded = decodeURIComponent(fragment); } catch { /* keep raw */ }
      const ids = idsOf(targetFile);
      if (!ids.has(fragment) && !ids.has(decoded)) report('dead #anchor', `${target === '' ? '(same page)' : abs}#${fragment}`, pageUrl);
    }
  }
}

// ── Sitemaps ──────────────────────────────────────────────────────────────
for (const sm of ['/sitemap.xml']) {
  const file = resolve(sm);
  if (!file) { report('sitemap missing', sm, sm); continue; }
  for (const m of fs.readFileSync(file, 'utf8').matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) {
    const u = m[1].startsWith(SITE) ? m[1].slice(SITE.length) || '/' : null;
    if (u && u !== '/' && !resolve(u) && !isDynamic(u)) report('sitemap URL not served', m[1], sm);
  }
}

// ── Generated copies ──────────────────────────────────────────────────────
// build-all-docs.js copies site/assets/* to dashboard/docs/assets/ on every
// run, and build-playground.mjs copies docs.css into the playground. An edit
// made to a copy is silently undone by the next build, so a copy must match
// its source: edit site/assets/, then regenerate.
const assetSrc = path.join(ROOT, 'site', 'assets');
const copies = [
  ...fs.readdirSync(assetSrc).map((f) => [f, path.join(ROOT, 'dashboard', 'docs', 'assets', f)]),
  ['docs.css', path.join(ROOT, 'dashboard', 'playground', 'assets', 'docs.css')],
];
for (const [name, copy] of copies) {
  if (!fs.existsSync(copy)) continue;
  if (!fs.readFileSync(copy).equals(fs.readFileSync(path.join(assetSrc, name)))) {
    report('generated copy differs from site/assets source', `site/assets/${name}`, path.relative(ROOT, copy));
  }
}

// ── Report ────────────────────────────────────────────────────────────────
let total = 0;
for (const [kind, byDetail] of problems) {
  const count = [...byDetail.values()].reduce((n, s) => n + s.size, 0);
  total += count;
  console.log(`✗ ${kind}: ${count}`);
  const rows = [...byDetail.entries()].sort((a, b) => b[1].size - a[1].size);
  for (const [detail, where] of VERBOSE ? rows : rows.slice(0, 15)) {
    const sample = [...where].slice(0, 3).join(', ');
    console.log(`    ${detail ? `${detail}  ←  ` : ''}${sample}${where.size > 3 ? ` (+${where.size - 3})` : ''}`);
  }
  if (!VERBOSE && rows.length > 15) console.log(`    … ${rows.length - 15} more (--verbose)`);
}

if (total) {
  console.log(`\nSite check failed: ${total} problem(s) across ${pages.length} pages.`);
  process.exit(1);
}
console.log(`✅ Site check passed: ${pages.length} pages, links, anchors, images, sitemap and metadata all resolve.`);
