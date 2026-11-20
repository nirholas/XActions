#!/usr/bin/env node
// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Add the project licence notice to source files that have none.
 *
 * One licence, everywhere: Apache-2.0, matching LICENSE and package.json. This
 * script used to stamp three different notices depending on which directory a file
 * sat in (MIT on `src/*.js` and `archive/`, Apache elsewhere, logged as "BSL"),
 * which is how the repository ended up claiming MIT in 283 files and Business
 * Source License 1.1 in `bin/unfollowx` while LICENSE said Apache-2.0.
 *
 * It also inserted a `#` shell comment as line 2 of `bin/unfollowx`, which is a
 * `#!/usr/bin/env node` script. Node only tolerates `#` on line 1, so that one
 * line made the command a SyntaxError on every invocation. The notice is now
 * always a `//` comment, because every file this touches is JavaScript.
 *
 * Files that already carry a notice are left alone. To rewrite an existing wrong
 * notice, use `scripts/normalize-license-headers.mjs`.
 *
 * Usage:
 *   node scripts/add-license-notices.mjs           # report what is missing
 *   node scripts/add-license-notices.mjs --write   # add them
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license Apache-2.0
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const NOTICE =
  '// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.';

// `fixtures` holds captured third-party payloads (x.com bundle chunks recorded for
// offline tests). They are not our code and must keep whatever they arrived as.
const EXCLUDES = [
  'node_modules',
  'xspace-agents',
  'python',
  '.git',
  'dist',
  'build',
  `${sep}fixtures${sep}`,
];

/** Directories scanned for JavaScript sources. */
const DIRS = ['src', 'browser', 'api', 'tests', 'scripts', 'packages', 'integrations', 'archive'];

const BIN_DIR = join(ROOT, 'bin');

/**
 * Insert a notice below the shebang, or at the top when there is none.
 *
 * @param {string} filePath
 * @param {boolean} write
 * @returns {boolean} whether the file was missing a notice
 */
function addNotice(filePath, write) {
  let content;
  try {
    content = readFileSync(filePath, 'utf8');
  } catch {
    return false;
  }

  const lines = content.split('\n');
  if (lines.slice(0, 5).join('\n').includes('Copyright')) return false;

  // A shebang must stay on line 1; everything after it is JavaScript, so the
  // notice is a `//` comment, never a `#` one.
  if (lines[0].startsWith('#!')) lines.splice(1, 0, NOTICE);
  else lines.unshift(NOTICE);

  if (write) writeFileSync(filePath, lines.join('\n'));
  return true;
}

/**
 * @param {string} dir
 * @param {string} ext
 * @returns {string[]}
 */
function walkDir(dir, ext) {
  const results = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return results;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    if (EXCLUDES.some((ex) => full.includes(ex))) continue;
    let stat;
    try {
      stat = statSync(full);
    } catch {
      continue;
    }
    if (stat.isDirectory()) results.push(...walkDir(full, ext));
    else if (full.endsWith(ext)) results.push(full);
  }
  return results;
}

/**
 * Executables in bin/ that are JavaScript, identified by shebang rather than suffix.
 * @returns {string[]}
 */
function binScripts() {
  let entries;
  try {
    entries = readdirSync(BIN_DIR);
  } catch {
    return [];
  }
  return entries
    .map((e) => join(BIN_DIR, e))
    .filter((f) => {
      try {
        return statSync(f).isFile() && readFileSync(f, 'utf8').startsWith('#!');
      } catch {
        return false;
      }
    });
}

const write = process.argv.includes('--write');
const files = [...DIRS.flatMap((d) => walkDir(join(ROOT, d), '.js')), ...binScripts()].filter(
  (f) => !f.endsWith('add-license-notices.mjs')
);

const missing = files.filter((file) => addNotice(file, write));

if (write) {
  console.log(`Added a notice to ${missing.length} of ${files.length} files.`);
} else if (missing.length > 0) {
  console.error(`${missing.length} of ${files.length} file(s) have no licence notice:`);
  for (const file of missing.slice(0, 20)) console.error(`  ${relative(ROOT, file)}`);
  if (missing.length > 20) console.error(`  ... and ${missing.length - 20} more`);
  console.error('Run: node scripts/add-license-notices.mjs --write');
  process.exit(1);
} else {
  console.log(`Every source file carries a licence notice (${files.length} checked).`);
}
