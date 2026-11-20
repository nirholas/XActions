#!/usr/bin/env node
// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Normalize source license headers to the project licence.
 *
 * LICENSE and package.json both say Apache-2.0, but 283 source files carried an
 * MIT header and `bin/unfollowx` claimed Business Source License 1.1. Three
 * different licences across one repository is an adoption blocker: a company's
 * legal review cannot tell which one governs, so the safe answer is "don't use it".
 *
 * This script rewrites the project's own headers to Apache-2.0 and leaves
 * third-party code alone. Vendored files keep the licence they arrived under, and
 * are listed in THIRD_PARTY below.
 *
 * Usage:
 *   node scripts/normalize-license-headers.mjs           # report only
 *   node scripts/normalize-license-headers.mjs --write   # apply
 *
 * `npm run check:licenses` runs the report form and exits non-zero when a stray
 * header reappears, so this cannot silently drift back.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license Apache-2.0
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Directories walked for source headers. */
const ROOTS = ['src', 'browser', 'api', 'scripts', 'bin', 'types', 'tests', 'examples'];

/** Never skipped by extension: bin entries have no suffix. */
const EXTENSIONS = ['.js', '.mjs', '.cjs', '.ts'];

/**
 * Vendored third-party code. These keep their original licence and attribution;
 * rewriting them would misstate who owns the code and under what terms.
 */
const THIRD_PARTY = new Set([
  join('src', 'scrapers', 'twitter', 'http', 'transactionId.js'), // x-client-transaction-id, MIT, (c) 2025 Lami
]);

const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage']);

const APACHE_LINE =
  '// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.';

/** Header forms this project has used, all of which mean "ours". */
const REPLACEMENTS = [
  [/^\/\/ Copyright \(c\) 2024-2026 nich \(@nichxbt\)\. MIT License\.$/m, APACHE_LINE],
  [/^\/\/ Copyright \(c\) 2024-2026 nich \(@nichxbt\)\. Business Source License 1\.1\.$/m, APACHE_LINE],
  [/^(\s*\*\s*@license\s+)MIT\s*$/m, '$1Apache-2.0'],
  [/^(\s*\*\s*@license\s+)BUSL-1\.1\s*$/m, '$1Apache-2.0'],
];

/** Patterns that still indicate a non-project licence after rewriting. */
const STRAY = /MIT License|@license\s+MIT|Business Source License|BUSL-1\.1/;

/**
 * Every source file under the walked roots.
 * @param {string} dir
 * @returns {string[]} absolute paths
 */
function walk(dir) {
  let out = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out = out.concat(walk(full));
    } else if (EXTENSIONS.some((e) => entry.endsWith(e)) || !entry.includes('.')) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Rewrite one file's header.
 * @param {string} file absolute path
 * @param {boolean} write
 * @returns {'changed' | 'clean' | 'stray'}
 */
function normalize(file, write) {
  const rel = relative(ROOT, file).split(sep).join(sep);
  if (THIRD_PARTY.has(rel)) return 'clean';

  let source;
  try {
    source = readFileSync(file, 'utf8');
  } catch {
    return 'clean';
  }
  if (!source.includes('license') && !source.includes('License')) return 'clean';

  let updated = source;
  for (const [pattern, replacement] of REPLACEMENTS) {
    updated = updated.replace(pattern, replacement);
  }

  if (updated !== source) {
    if (write) writeFileSync(file, updated, 'utf8');
    return 'changed';
  }
  // Only the header region declares a licence; a script that merely mentions
  // "MIT" further down (a rewriting tool, a docs footer template) is not itself
  // MIT-licensed and must not be reported as one.
  const header = source.split('\n').slice(0, 30).join('\n');
  return STRAY.test(header) ? 'stray' : 'clean';
}

const write = process.argv.includes('--write');
// This file names the licences it rewrites, in its own header. Checking itself would
// report those mentions as a stray licence forever.
const files = ROOTS.flatMap((r) => walk(join(ROOT, r))).filter(
  (f) => !f.endsWith('normalize-license-headers.mjs')
);

const changed = [];
const stray = [];
for (const file of files) {
  const result = normalize(file, write);
  const rel = relative(ROOT, file);
  if (result === 'changed') changed.push(rel);
  else if (result === 'stray') stray.push(rel);
}

if (write) {
  console.log(`Normalized ${changed.length} file(s) to Apache-2.0.`);
} else if (changed.length > 0) {
  console.error(`${changed.length} file(s) carry a licence header that is not Apache-2.0:`);
  for (const file of changed.slice(0, 20)) console.error(`  ${file}`);
  if (changed.length > 20) console.error(`  ... and ${changed.length - 20} more`);
  console.error('Run: node scripts/normalize-license-headers.mjs --write');
  process.exit(1);
} else {
  console.log(`License headers OK (${files.length} files checked, ${THIRD_PARTY.size} vendored exception).`);
}

if (stray.length > 0) {
  console.error('\nFiles mentioning another licence that this script does not know how to rewrite:');
  for (const file of stray) console.error(`  ${file}`);
  console.error('Add them to THIRD_PARTY if they are vendored, or fix the header by hand.');
  process.exit(1);
}
