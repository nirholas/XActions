// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';

const ROOT = resolve('/workspaces/XActions');

const MIT = '// Copyright (c) 2024-2026 nich (@nichxbt). MIT License.';
const BSL = '// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.';

function addNotice(filePath, notice) {
  let content;
  try {
    content = readFileSync(filePath, 'utf8');
  } catch {
    return;
  }

  // Skip if already has a copyright notice
  const firstFiveLines = content.split('\n').slice(0, 5).join('\n');
  if (firstFiveLines.includes('Copyright')) return;

  // If first line is a shebang, insert after it
  const lines = content.split('\n');
  if (lines[0].startsWith('#!')) {
    lines.splice(1, 0, notice);
  } else {
    lines.unshift(notice);
  }

  writeFileSync(filePath, lines.join('\n'));
}

function walkDir(dir, ext, excludes = []) {
  const results = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return results;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    if (excludes.some(ex => full.includes(ex))) continue;
    let stat;
    try { stat = statSync(full); } catch { continue; }
    if (stat.isDirectory()) {
      results.push(...walkDir(full, ext, excludes));
    } else if (full.endsWith(ext)) {
      results.push(full);
    }
  }
  return results;
}

const EXCLUDES = ['node_modules', 'xspace-agents', 'python', '.git'];

let total = 0, added = 0;

// src/*.js (top-level only) → MIT
const srcTopLevel = readdirSync(join(ROOT, 'src'))
  .filter(f => f.endsWith('.js'))
  .map(f => join(ROOT, 'src', f))
  .filter(f => statSync(f).isFile());

for (const file of srcTopLevel) {
  const before = readFileSync(file, 'utf8').split('\n').slice(0, 5).join('\n');
  addNotice(file, MIT);
  const after = readFileSync(file, 'utf8').split('\n').slice(0, 5).join('\n');
  total++;
  if (before !== after) added++;
}
console.log(`src/*.js: ${srcTopLevel.length} files (MIT)`);

// archive/*.js → MIT
const archiveFiles = walkDir(join(ROOT, 'archive'), '.js', EXCLUDES);
for (const file of archiveFiles) {
  const before = readFileSync(file, 'utf8').split('\n').slice(0, 5).join('\n');
  addNotice(file, MIT);
  const after = readFileSync(file, 'utf8').split('\n').slice(0, 5).join('\n');
  total++;
  if (before !== after) added++;
}
console.log(`archive/*.js: ${archiveFiles.length} files (MIT)`);

// src subdirectories → BSL
const srcSubdirs = readdirSync(join(ROOT, 'src'))
  .filter(f => statSync(join(ROOT, 'src', f)).isDirectory())
  .flatMap(d => walkDir(join(ROOT, 'src', d), '.js', EXCLUDES));

for (const file of srcSubdirs) {
  const before = readFileSync(file, 'utf8').split('\n').slice(0, 5).join('\n');
  addNotice(file, BSL);
  const after = readFileSync(file, 'utf8').split('\n').slice(0, 5).join('\n');
  total++;
  if (before !== after) added++;
}
console.log(`src subdirs: ${srcSubdirs.length} files (BSL)`);

// Other directories → BSL
const bslDirs = ['api', 'tests', 'scripts', 'packages', 'integrations'];
for (const dir of bslDirs) {
  const files = walkDir(join(ROOT, dir), '.js', EXCLUDES);
  for (const file of files) {
    // skip this script itself
    if (file.endsWith('add-license-notices.mjs')) continue;
    const before = readFileSync(file, 'utf8').split('\n').slice(0, 5).join('\n');
    addNotice(file, BSL);
    const after = readFileSync(file, 'utf8').split('\n').slice(0, 5).join('\n');
    total++;
    if (before !== after) added++;
  }
  console.log(`${dir}/: ${files.length} files (BSL)`);
}

// bin/unfollowx (shell script) → BSL as a shell comment
const binFile = join(ROOT, 'bin', 'unfollowx');
try {
  const content = readFileSync(binFile, 'utf8');
  if (!content.split('\n').slice(0, 5).join('\n').includes('Copyright')) {
    const lines = content.split('\n');
    const shellNotice = '# Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.';
    if (lines[0].startsWith('#!')) {
      lines.splice(1, 0, shellNotice);
    } else {
      lines.unshift(shellNotice);
    }
    writeFileSync(binFile, lines.join('\n'));
    added++;
  }
  total++;
  console.log('bin/unfollowx: 1 file (BSL shell comment)');
} catch {}

console.log(`\nDone. Added notices to ${added} / ${total} files.`);
