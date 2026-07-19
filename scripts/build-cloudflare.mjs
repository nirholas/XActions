#!/usr/bin/env node
// Copyright (c) 2024-2026 nich (@nichxbt). Business Source License 1.1.
/**
 * Assemble dist-cloudflare/ for the Cloudflare Worker deploy.
 *
 * Replicates the vercel.json route table with plain file placement so
 * Workers static assets (html_handling: auto) can serve every clean URL
 * without a rewrite engine:
 *
 *   dashboard/**  -> /            (routed pages, /js, /css, /docs, /blog, ...)
 *   dashboard/index.html -> /dashboard (as dashboard.html)
 *   site/**       -> /            (root landing page, catch-all winner)
 *   public/**     -> /            (og images, icons, robots.txt, sitemap.xml)
 *   dashboard/manifest.json -> /manifest.json  (PWA manifest wins over public/)
 *   llms.txt, llms-full.txt -> /
 *
 * /api/*, /openapi.json, /.well-known/x402 and /thread/* are handled by
 * worker/index.js (see wrangler.toml run_worker_first).
 *
 * Usage: node scripts/build-cloudflare.mjs
 */

import { cpSync, rmSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist-cloudflare');

// Workers static assets hard limits
const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MiB per asset
const MAX_FILES = 20000;

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

// 1. Dashboard pages live at the root of the site (/pricing, /docs/..., /js/...)
cpSync(join(root, 'dashboard'), dist, { recursive: true });

// Pages-era redirect file: replaced by the Worker + html_handling. An external
// 200-proxy rule in _redirects is not supported on Workers and would shadow
// the Worker's /api handling if left in place.
rmSync(join(dist, '_redirects'), { force: true });

// 2. /dashboard keeps the app shell. Placed as dashboard.html (not
// dashboard/index.html) so html_handling serves /dashboard directly with no
// trailing-slash redirect — the shell's relative asset paths resolve from /.
cpSync(join(root, 'dashboard', 'index.html'), join(dist, 'dashboard.html'));

// 3. The site/ landing page wins the root (vercel.json catch-all)
cpSync(join(root, 'site'), dist, { recursive: true });

// 4. public/ wins its explicitly routed assets (icons, og-*, robots, sitemap)
cpSync(join(root, 'public'), dist, { recursive: true });

// ...except /manifest.json, which the route table maps to the dashboard PWA manifest
cpSync(join(root, 'dashboard', 'manifest.json'), join(dist, 'manifest.json'));

// 5. AI discovery files
cpSync(join(root, 'llms.txt'), join(dist, 'llms.txt'));
cpSync(join(root, 'llms-full.txt'), join(dist, 'llms-full.txt'));

// Guardrails: stay inside Workers asset limits
let count = 0;
let bytes = 0;
const walk = (dir) => {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) {
      walk(p);
    } else {
      count += 1;
      bytes += s.size;
      if (s.size > MAX_FILE_BYTES) {
        console.error(`✗ ${p} is ${(s.size / 1024 / 1024).toFixed(1)} MiB (limit 25 MiB per asset)`);
        process.exitCode = 1;
      }
    }
  }
};
walk(dist);

if (count > MAX_FILES) {
  console.error(`✗ ${count} files exceeds the ${MAX_FILES} asset limit`);
  process.exitCode = 1;
}

console.log(`dist-cloudflare/ ready: ${count} files, ${(bytes / 1024 / 1024).toFixed(1)} MiB total`);
