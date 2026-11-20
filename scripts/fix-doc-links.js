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
 *   2. resolved AGAINST THE PAGE'S MARKDOWN SOURCE, found in the manifest
 *      => its urlPath. A relative link is written relative to the .md file it
 *      lives in, not to the page that .md renders into, so
 *      skills/a/SKILL.md linking ../skills/b/SKILL.md means skills/b/SKILL.md.
 *      Resolving against the rendered page's directory instead misses every
 *      one of those, and their basename ("SKILL") is too generic for step 3.
 *   3. basename slug found in dashboard/docs/_pages-manifest  => its urlPath
 *   4. same-slug page exists at /docs/<slug>.html            => /docs/<slug>
 *   5. target file exists in the repo (source, no page)      => GitHub blob
 *   6. unique basename match anywhere in the repo            => GitHub blob
 *   else leave and report.
 *
 * A second pass handles every other relative href on a page rendered from
 * markdown: links to source files and folders (../scripts/foo.js,
 * ../examples/, ../LICENSE). They are correct on GitHub and 404 on the site.
 * When the href does not reach a file the site serves, it is resolved against
 * the page's markdown source; a repo file becomes a GitHub blob link and a
 * repo folder a GitHub tree link. Hrefs that already work are left alone.
 *
 * Run after the doc generators:  node scripts/fix-doc-links.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DASH = path.join(ROOT, 'dashboard');
const GITHUB_BLOB = 'https://github.com/nirholas/XActions/blob/main';
const GITHUB_TREE = 'https://github.com/nirholas/XActions/tree/main';
const GITHUB_RAW = 'https://raw.githubusercontent.com/nirholas/XActions/main';

const manifestPath = path.join(DASH, 'docs', '_pages-manifest.json');
const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) : [];
const bySlug = new Map();
for (const e of manifest) if (e.slug && e.urlPath && !bySlug.has(e.slug.toLowerCase())) bySlug.set(e.slug.toLowerCase(), e.urlPath);
const bySourcePath = new Map();
for (const e of manifest) if (e.sourcePath && e.urlPath) bySourcePath.set(e.sourcePath.toLowerCase(), e.urlPath);
// Output page -> the markdown it was rendered from, so relative links can be
// resolved the way their author wrote them.
const sourceOfPage = new Map();
for (const e of manifest) {
  if (!e.sourcePath || !e.slug) continue;
  const out = path.join(DASH, 'docs', e.outSubdir || '', `${e.slug}.html`);
  sourceOfPage.set(out, e.sourcePath);
}
// scripts/build-docs-pages.js renders docs/examples/<slug>.md to /docs/<slug>
// and docs/examples/tutorials/<slug>.md to /docs/step-by-step/<slug>, outside
// the manifest. Register those too so their relative links resolve.
for (const [outSub, srcDir] of [['', 'docs/examples'], ['step-by-step', 'docs/examples/tutorials']]) {
  const dir = path.join(ROOT, srcDir);
  if (!fs.existsSync(dir)) continue;
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.md')) continue;
    const out = path.join(DASH, 'docs', outSub, name.replace(/\.md$/, '.html'));
    if (!sourceOfPage.has(out) && fs.existsSync(out)) sourceOfPage.set(out, `${srcDir}/${name}`);
  }
}

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
/**
 * Whether the production site serves a path, the way Pages' clean URLs do:
 * the file itself, <path>.html, or <path>/index.html. Production is
 * deploy/cloudflare/build.sh, which publishes public/ and dashboard/ at the
 * root and, from site/, only site/index.html (as /). site/video/** and
 * site/assets/** are not deployed, so a link to them must go to GitHub.
 */
const SERVED_ROOTS = [DASH, path.join(ROOT, 'public')];
function siteServes(urlPath) {
  const clean = urlPath.replace(/\/+$/, '');
  if (!clean || clean === '/index.html') return true;
  return SERVED_ROOTS.some((base) => {
    const p = path.join(base, clean.slice(1));
    if (!p.startsWith(base)) return false;
    if (fs.existsSync(`${p}.html`) || fs.existsSync(path.join(p, 'index.html'))) return true;
    return fs.existsSync(p) && fs.statSync(p).isFile();
  });
}

function cleanUrl(rel) { return ('/' + rel.split(path.sep).join('/')).replace(/\.html$/, '').replace(/\/index$/, '/'); }

const unresolved = new Map();
let filesChanged = 0, linksFixed = 0, repoLinksFixed = 0;

for (const file of htmlFiles(DASH)) {
  const pageDir = path.dirname(file);
  const sourcePath = sourceOfPage.get(file);
  const sourceDir = sourcePath ? path.join(ROOT, path.dirname(sourcePath)) : null;
  let html = fs.readFileSync(file, 'utf-8');
  let changed = false;
  html = html.replace(/(href\s*=\s*")([^"]+\.md)((?:#[^"]*)?")/gi, (whole, pre, target, post) => {
    if (/^(https?:)?\/\//i.test(target)) return whole;
    const resolved = target.startsWith('/') ? path.join(DASH, target.slice(1)) : path.resolve(pageDir, target);
    const asHtml = resolved.replace(/\.md$/i, '.html');
    if (asHtml.startsWith(DASH) && fs.existsSync(asHtml)) { linksFixed++; changed = true; return pre + cleanUrl(path.relative(DASH, asHtml)) + post; }
    if (sourceDir && !target.startsWith('/')) {
      const fromSource = path
        .relative(ROOT, path.resolve(sourceDir, target.split('#')[0]))
        .split(path.sep)
        .join('/')
        .toLowerCase();
      if (bySourcePath.has(fromSource)) { linksFixed++; changed = true; return pre + bySourcePath.get(fromSource) + post; }
      if (fs.existsSync(path.join(ROOT, fromSource))) { linksFixed++; changed = true; return pre + `${GITHUB_BLOB}/${fromSource}` + post; }
    }
    const repoPath = (target.startsWith('/') ? target.slice(1) : path.relative(ROOT, resolved).split(path.sep).join('/')).toLowerCase();
    if (bySourcePath.has(repoPath)) { linksFixed++; changed = true; return pre + bySourcePath.get(repoPath) + post; }
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
  if (sourceDir) {
    const pageUrl = '/' + path.relative(DASH, file).split(path.sep).join('/');
    html = html.replace(/(\s(href|src|srcset)\s*=\s*")([^"\s,]+)(")/gi, (whole, pre, attr, href, post) => {
      if (/^([a-z][a-z0-9+.-]*:|\/\/|#|\/)/i.test(href) || href.includes('${')) return whole;
      const [target, hash = ''] = href.split(/(?=#)/);
      if (/\.md$/i.test(target)) return whole; // first pass owns these
      let decoded;
      try { decoded = decodeURI(target.split('?')[0]); } catch { return whole; }
      if (siteServes(path.posix.join(path.posix.dirname(pageUrl), decoded))) return whole;
      const repoAbs = path.resolve(sourceDir, decoded);
      if (!repoAbs.startsWith(ROOT + path.sep) || !fs.existsSync(repoAbs)) {
        unresolved.set(href, (unresolved.get(href) || 0) + 1);
        return whole;
      }
      const repoRel = path.relative(ROOT, repoAbs).split(path.sep).join('/');
      repoLinksFixed++; changed = true;
      // A file the site publishes from public/ or dashboard/ keeps its site URL.
      const published = repoRel.match(/^(?:public|dashboard)(\/.+)$/);
      if (published && siteServes(published[1])) return pre + encodeURI(published[1]) + hash + post;
      // An <img src> needs the raw file; a GitHub blob page is HTML.
      if (attr.toLowerCase() !== 'href') return pre + `${GITHUB_RAW}/${encodeURI(repoRel)}` + post;
      const base = fs.statSync(repoAbs).isDirectory() ? GITHUB_TREE : GITHUB_BLOB;
      return pre + `${base}/${encodeURI(repoRel)}${hash}` + post;
    });
  }
  if (changed) { fs.writeFileSync(file, html); filesChanged++; }
}

console.log(`Fixed ${linksFixed} .md links and ${repoLinksFixed} repo-file links across ${filesChanged} files.`);
if (unresolved.size) {
  console.log(`\nUnresolved (${unresolved.size} unique):`);
  for (const [t, n] of [...unresolved.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(3)}x ${t}`);
}
