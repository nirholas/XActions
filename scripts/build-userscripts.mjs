#!/usr/bin/env node
// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Build one userscript per browser script, plus one with every tool.
 *
 * Reads browser/index.json (scripts/build-script-manifest.mjs writes it) and
 * writes <id>.user.js for each entry and xactions.user.js for all of them to
 * dist/userscripts/, which is gitignored: the files are attached to each
 * GitHub release by .github/workflows/release.yml, and their @updateURL points
 * at releases/latest, so installed copies update when a release ships.
 *
 * It also rewrites the install lists in docs/browser-scripts.md and
 * dashboard/run.html, between their AUTOGEN:USERSCRIPTS markers.
 *
 * Usage:
 *   node scripts/build-userscripts.mjs                  # build, and refresh the install lists
 *   node scripts/build-userscripts.mjs --out <dir>      # build somewhere else
 *   node scripts/build-userscripts.mjs --check          # fail when an install list is stale
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { CATEGORY_RULES } from './lib/script-manifest.mjs';
import {
  COMBINED_ID,
  renderToolScript,
  renderCombinedScript,
  userscriptFileName,
  installLinksMarkdown,
  installLinksHtml,
} from './lib/userscript-build.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = join(ROOT, 'browser', 'index.json');
const DEFAULT_OUT = join(ROOT, 'dist', 'userscripts');

const LIST_TARGETS = [
  {
    file: join(ROOT, 'docs', 'browser-scripts.md'),
    start: '<!-- AUTOGEN:USERSCRIPTS start -->',
    end: '<!-- AUTOGEN:USERSCRIPTS end -->',
    render: (entries, order) => `\n\n${installLinksMarkdown(entries, order)}\n\n`,
  },
  {
    file: join(ROOT, 'dashboard', 'run.html'),
    start: '<!-- AUTOGEN:USERSCRIPTS start -->',
    end: '<!-- AUTOGEN:USERSCRIPTS end -->',
    render: (entries, order) => `\n    ${installLinksHtml(entries, order)}\n    `,
  },
];

/**
 * @returns {{scripts: object[], core: string}}
 */
export function readManifest() {
  if (!existsSync(MANIFEST)) {
    throw new Error('browser/index.json is missing. Run: node scripts/build-script-manifest.mjs');
  }
  return JSON.parse(readFileSync(MANIFEST, 'utf8'));
}

/**
 * Category names in display order.
 *
 * @returns {string[]}
 */
export function categoryOrder() {
  return CATEGORY_RULES.map((rule) => rule.category);
}

/**
 * Replace the region between two markers.
 *
 * @param {string} text
 * @param {{start: string, end: string, file: string}} target
 * @param {string} inner
 * @returns {string}
 */
function replaceRegion(text, target, inner) {
  const a = text.indexOf(target.start);
  const b = text.indexOf(target.end);
  if (a === -1 || b === -1 || b < a) throw new Error(`Markers ${target.start} / ${target.end} not found in ${target.file}.`);
  return text.slice(0, a + target.start.length) + inner + text.slice(b);
}

/**
 * Write every userscript into a directory.
 *
 * @param {string} outDir
 * @returns {{files: string[]}}
 */
export function buildUserscripts(outDir) {
  const manifest = readManifest();
  const version = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version;
  const coreSource = readFileSync(join(ROOT, manifest.core), 'utf8');
  const sources = new Map(manifest.scripts.map((e) => [e.id, readFileSync(join(ROOT, e.path), 'utf8')]));
  if (sources.has(COMBINED_ID)) throw new Error(`A script is named "${COMBINED_ID}", which is the combined userscript's file name.`);

  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  const files = [];
  for (const entry of manifest.scripts) {
    const file = join(outDir, userscriptFileName(entry.id));
    writeFileSync(file, renderToolScript({ entry, source: sources.get(entry.id), coreSource, version }));
    files.push(file);
  }
  const combined = join(outDir, userscriptFileName(COMBINED_ID));
  writeFileSync(combined, renderCombinedScript({ entries: manifest.scripts, sources, coreSource, version }));
  files.push(combined);
  return { files };
}

/**
 * `node --check` each file, so a wrapper that breaks a script fails the build.
 *
 * @param {string[]} files
 */
function syntaxCheck(files) {
  const failed = [];
  for (const file of files) {
    try {
      execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
    } catch (error) {
      failed.push(`${file}\n${error.stderr}`);
    }
  }
  if (failed.length) throw new Error(`node --check failed:\n${failed.join('\n')}`);
}

/**
 * Rewrite (or, with check, compare) the install lists.
 *
 * @param {boolean} check
 * @returns {string[]} Files that are stale (check) or were written.
 */
export function updateInstallLists(check) {
  const { scripts } = readManifest();
  const order = categoryOrder();
  const changed = [];
  for (const target of LIST_TARGETS) {
    const current = readFileSync(target.file, 'utf8');
    const next = replaceRegion(current, target, target.render(scripts, order));
    if (next === current) continue;
    changed.push(target.file);
    if (!check) writeFileSync(target.file, next);
  }
  return changed;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const args = process.argv.slice(2);
  try {
    if (args.includes('--check')) {
      const stale = updateInstallLists(true);
      if (stale.length) {
        console.error(`Userscript install lists are out of date in:\n${stale.map((f) => `  ${f.slice(ROOT.length + 1)}`).join('\n')}\nRun: npm run build:userscripts`);
        process.exit(1);
      }
      console.log('Userscript install lists are up to date.');
    } else {
      const outIndex = args.indexOf('--out');
      const outDir = outIndex === -1 ? DEFAULT_OUT : resolve(args[outIndex + 1]);
      const { files } = buildUserscripts(outDir);
      syntaxCheck(files);
      const written = updateInstallLists(false);
      console.log(`Wrote ${files.length} userscripts (${files.length - 1} tools and ${userscriptFileName(COMBINED_ID)}) to ${outDir}. All pass node --check.`);
      for (const file of written) console.log(`Updated the install list in ${file.slice(ROOT.length + 1)}.`);
    }
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
