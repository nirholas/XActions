#!/usr/bin/env node
// Copyright (c) 2024-2026 nich (@nichxbt). All rights reserved.
/**
 * Builds the complete sitemap for xactions.app from what actually ships:
 * every .html page in dashboard/ (served with clean URLs on Cloudflare Pages)
 * plus the landing page. Replaces the stale hand-maintained sitemap.
 * Run after the page generators:  node scripts/build-sitemap.js
 * Writes dashboard/sitemap.xml and public/sitemap.xml (kept identical).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DASH = path.join(ROOT, 'dashboard');
const SITE = 'https://xactions.app';
const EXCLUDE = new Set(['/404', '/50x', '/admin', '/team']);

function* htmlFiles(dir) {
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, d.name);
    if (d.isDirectory()) yield* htmlFiles(full);
    else if (d.name.endsWith('.html') && !d.name.startsWith('_')) yield full;
  }
}
function urlFor(file) {
  let rel = '/' + path.relative(DASH, file).split(path.sep).join('/');
  rel = rel.replace(/\.html$/, '').replace(/\/index$/, '/');
  if (rel === '/index' || rel === '') rel = '/dashboard';
  return rel;
}
function priorityFor(url) {
  if (url === '/') return '1.0';
  if (['/features', '/pricing', '/docs', '/scripts', '/tutorials/'].includes(url)) return '0.9';
  const depth = url.split('/').filter(Boolean).length;
  if (depth === 1) return '0.8';
  if (url.startsWith('/scripts/') || url.startsWith('/tutorials/') || url.startsWith('/blog/')) return '0.7';
  return '0.6';
}

const urls = new Set(['/']);
for (const file of htmlFiles(DASH)) { const u = urlFor(file); if (!EXCLUDE.has(u)) urls.add(u); }

const today = new Date().toISOString().slice(0, 10);
const entries = [...urls].sort().map((u) => `  <url>
    <loc>${SITE}${u === '/' ? '' : u}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u === '/' || u === '/changelog' ? 'weekly' : 'monthly'}</changefreq>
    <priority>${priorityFor(u)}</priority>
  </url>`);
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(DASH, 'sitemap.xml'), xml);
fs.writeFileSync(path.join(ROOT, 'public', 'sitemap.xml'), xml);
console.log(`Sitemap written with ${urls.size} URLs (dashboard/ + public/).`);
