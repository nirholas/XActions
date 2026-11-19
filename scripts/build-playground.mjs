#!/usr/bin/env node
// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Assemble the playground's browser assets, and emit the static-site copy.
 *
 * The playground page imports two modules that also run on the server and in
 * the CLI: the query translator and the account report. Rather than keeping a
 * browser fork of either, this script copies the originals into the asset
 * directory with a generated-file header. One implementation, three surfaces.
 *
 * It also emits `dashboard/playground.html`, which is the same page with its
 * asset paths rewritten for the static site's layout and the API base pointed
 * at the deployed service, since on that origin the API lives elsewhere.
 *
 * Usage:
 *   node scripts/build-playground.mjs
 *   PLAYGROUND_API_BASE=https://xactions-playground-xyz.run.app node scripts/build-playground.mjs
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license Apache-2.0
 */

import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = path.join(ROOT, 'playground/public/assets');
const DASHBOARD = path.join(ROOT, 'dashboard');

/**
 * The deployed playground API. The page served by the Cloud Run container
 * talks to itself, so only the static-site copy needs this.
 */
const API_BASE = process.env.PLAYGROUND_API_BASE || 'https://playground.xactions.app';

/** Modules that are authored once and shipped to the browser verbatim. */
const SHARED_MODULES = [
  { from: 'src/codegen/queryTranslator.js', to: 'query-translator.js' },
  { from: 'src/analysis/accountReport.js', to: 'account-report.js' },
];

/**
 * Copy a module into the asset directory, prefixed with a header that tells
 * anyone who opens it where the real file lives.
 * @param {{from: string, to: string}} module
 * @returns {Promise<number>} Bytes written
 */
async function copyModule({ from, to }) {
  const source = await readFile(path.join(ROOT, from), 'utf8');
  const banner = `// GENERATED FILE. Do not edit.\n// Source: ${from}\n// Rebuild: node scripts/build-playground.mjs\n\n`;
  const output = banner + source;
  await writeFile(path.join(ASSETS, to), output);
  return output.length;
}

/**
 * Emit the static-site copy of the page.
 *
 * Two rewrites: asset paths move under /playground/assets/ because the static
 * site serves the page as /playground.html, and the API base is stamped in
 * because on that origin the API is a different service.
 * @returns {Promise<void>}
 */
async function emitStaticPage() {
  const source = await readFile(path.join(ROOT, 'playground/public/index.html'), 'utf8');

  const rewritten = source
    .replace(/(href|src)="\/assets\//g, '$1="/playground/assets/')
    .replace(/<meta name="playground-api" content="">/, `<meta name="playground-api" content="${API_BASE}">`)
    .replace(
      '<head>',
      '<head>\n<!-- GENERATED FILE. Do not edit. Source: playground/public/index.html. Rebuild: node scripts/build-playground.mjs -->'
    );

  if (rewritten === source) {
    throw new Error('Static page rewrite changed nothing, so the asset paths or the API meta tag moved. Fix this script.');
  }

  await writeFile(path.join(DASHBOARD, 'playground.html'), rewritten);

  await mkdir(path.join(DASHBOARD, 'playground/assets'), { recursive: true });
  for (const name of ['playground.css', 'playground.js', ...SHARED_MODULES.map((m) => m.to)]) {
    await copyFile(path.join(ASSETS, name), path.join(DASHBOARD, 'playground/assets', name));
  }
  // The theme lives with the docs on the static site, so the page reuses that
  // copy rather than shipping a second one.
  await copyFile(path.join(DASHBOARD, 'docs/assets/docs.css'), path.join(DASHBOARD, 'playground/assets/docs.css'));
}

async function main() {
  await mkdir(ASSETS, { recursive: true });

  for (const module of SHARED_MODULES) {
    const bytes = await copyModule(module);
    console.log(`  ${module.from} -> playground/public/assets/${module.to} (${(bytes / 1024).toFixed(1)} kB)`);
  }

  // The playground served from its own container needs the theme locally.
  await copyFile(path.join(DASHBOARD, 'docs/assets/docs.css'), path.join(ASSETS, 'docs.css'));
  console.log('  dashboard/docs/assets/docs.css -> playground/public/assets/docs.css');

  await emitStaticPage();
  console.log(`  playground/public/index.html -> dashboard/playground.html (API ${API_BASE})`);

  console.log('Playground assets built.');
}

main().catch((error) => {
  console.error(`build-playground failed: ${error.message}`);
  process.exitCode = 1;
});
