#!/usr/bin/env node
// Copyright (c) 2024-2026 nich (@nichxbt). All rights reserved.
/**
 * Post-build link fixer for generated dashboard pages.
 *
 * Markdown sources cross-link each other with relative .md hrefs (correct on
 * GitHub). The page generators render those hrefs into HTML unchanged, which
 * 404s on the website. This rewrites every .md href in dashboard/ to the URL
 * of the generated page:
 *   1. resolved path with .md -> .html exists in dashboard/  => clean URL
 *   2. basename slug found in dashboard/docs/_pages-manifest  => its urlPath
 *   3. same-slug page exists at /docs/<slug>.html            => /docs/<slug>
 *   4. target file exists in the repo (source, no page)      => GitHub blob
 *   5. unique basename match anywhere in the repo            => GitHub blob
 *   else leave and report.
 *
 * Run after the doc generators:  node scripts/fix-doc-links.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DASH = path.join(ROOT, 'dashboard');
const GITHUB_BLOB = 'https://github.com/nirholas/XActions/blob/main';

const manifestPath = path.join(DASH, 'docs', '_pages-manifest.json');
const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) : [];
const bySlug = new Map();
for (const e of manifest) if (e.slug && e.urlPath && !bySlug.has(e.slug.toLowerCase())) bySlug.set(e.slug.toLowerCase(), e.urlPath);

let mdIndex = null;
function findByBasename(base) {
  if (!mdIndex) {
    mdIndex = new Map();
    const skip = new Set(['node_modules', '.git', 'dashboard', 'pages-out']);
    (function walk(dir) {
      for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
        if (skip.has(d.name)) continue;
        const full = path.join(dir, d.name);
        if (d.isDirectory()) walk(full);
        else if (d.name.endsWith('.md')) {
          const rel = path.relative(ROOT, full).split(path.sep).join('/');
          if (!mdIndex.has(d.name)) mdIndex.set(d.name, []);
          mdIndex.get(d.name).push(rel);
        }
      }
    })(ROOT);
  }
  return mdIndex.get(base) || [];
}

function* htmlFiles(dir) {
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, d.name);
    if (d.isDirectory()) yield* htmlFiles(full);
    else if (d.name.endsWith('.html')) yield full;
  }
}
function cleanUrl(rel) { return ('/' + rel.split(path.sep).join('/')).replace(/\.html$/, '').replace(/\/index$/, '/'); }

const unresolved = new Map();
let filesChanged = 0, linksFixed = 0;

for (const file of htmlFiles(DASH)) {
  const pageDir = path.dirname(file);
  let html = fs.readFileSync(file, 'utf-8');
  let changed = false;
  html = html.replace(/(href\s*=\s*")([^"]+\.md)((?:#[^"]*)?")/gi, (whole, pre, target, post) => {
    if (/^(https?:)?\/\//i.test(target)) return whole;
    const resolved = target.startsWith('/') ? path.join(DASH, target.slice(1)) : path.resolve(pageDir, target);
    const asHtml = resolved.replace(/\.md$/i, '.html');
    if (asHtml.startsWith(DASH) && fs.existsSync(asHtml)) { linksFixed++; changed = true; return pre + cleanUrl(path.relative(DASH, asHtml)) + post; }
    const slug = path.basename(resolved, path.extname(resolved)).toLowerCase();
    if (bySlug.has(slug)) { linksFixed++; changed = true; return pre + bySlug.get(slug) + post; }
    if (fs.existsSync(path.join(DASH, 'docs', `${slug}.html`))) { linksFixed++; changed = true; return pre + `/docs/${slug}` + post; }
    const repoRel = target.startsWith('/') ? target.slice(1) : path.relative(DASH, resolved).split(path.sep).join('/');
    if (fs.existsSync(path.join(ROOT, repoRel))) { linksFixed++; changed = true; return pre + `${GITHUB_BLOB}/${repoRel}` + post; }
    const hits = findByBasename(path.basename(target.split('#')[0]));
    if (hits.length === 1) { linksFixed++; changed = true; return pre + `${GITHUB_BLOB}/${hits[0]}` + post; }
    unresolved.set(target, (unresolved.get(target) || 0) + 1);
    return whole;
  });
  if (changed) { fs.writeFileSync(file, html); filesChanged++; }
}

console.log(`Fixed ${linksFixed} .md links across ${filesChanged} files.`);
if (unresolved.size) {
  console.log(`\nUnresolved (${unresolved.size} unique):`);
  for (const [t, n] of [...unresolved.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(3)}x ${t}`);
}
