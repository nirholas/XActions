#!/usr/bin/env node
// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Type-check ratchet.
 *
 * jsconfig.json turns on checkJs for src/ and api/. The codebase predates that and
 * carries a few thousand errors, so a plain `tsc` gate could never pass. Instead
 * this runs tsc, counts errors per file, and compares with the committed baseline
 * in config/typecheck-baseline.json:
 *
 *   - a file with more errors than its baseline fails the check;
 *   - a file not in the baseline must have none, so new code starts type-clean;
 *   - a file with fewer errors passes, and the run asks you to lower the baseline
 *     with --update so the improvement cannot quietly regress later.
 *
 * Run:
 *   npm run typecheck              check against the baseline
 *   npm run typecheck -- --update  rewrite the baseline to the current counts
 *                                  (refuses to raise any count unless --allow-increase)
 *
 * @author nich (@nichxbt)
 */

import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baselinePath = path.join(root, 'config', 'typecheck-baseline.json');
const args = new Set(process.argv.slice(2));
const update = args.has('--update');
const allowIncrease = args.has('--allow-increase');

const tsc = path.join(root, 'node_modules', 'typescript', 'bin', 'tsc');
if (!existsSync(tsc)) {
  console.error('typescript is not installed. Run `npm ci` first.');
  process.exit(2);
}

const run = spawnSync(process.execPath, [tsc, '-p', 'jsconfig.json', '--pretty', 'false'], {
  cwd: root,
  encoding: 'utf8',
  maxBuffer: 256 * 1024 * 1024,
});
if (run.error) throw run.error;

const output = `${run.stdout}${run.stderr}`;
const line = /^(.+?)\((\d+),(\d+)\): error (TS\d+): (.*)$/;
const counts = {};
const messages = {};
let configErrors = 0;

for (const raw of output.split('\n')) {
  const m = raw.match(line);
  if (!m) {
    if (/error TS\d+/.test(raw)) {
      configErrors++;
      console.error(raw);
    }
    continue;
  }
  const file = m[1].split(path.sep).join('/');
  // Third-party JavaScript that a checked file imports gets checked too; it is
  // not ours to fix and must not move the count.
  if (file.includes('node_modules/')) continue;
  counts[file] = (counts[file] || 0) + 1;
  (messages[file] ||= []).push(`${file}:${m[2]}:${m[3]} ${m[4]} ${m[5]}`);
}

if (configErrors) {
  console.error(`\ntsc reported ${configErrors} error(s) that do not belong to a file (configuration?).`);
  process.exit(2);
}

const sorted = (obj) => Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)));
const total = (obj) => Object.values(obj).reduce((a, b) => a + b, 0);
const hasBaseline = existsSync(baselinePath);
const baseline = hasBaseline ? JSON.parse(readFileSync(baselinePath, 'utf8')).files : {};

const worse = [];
const better = [];
for (const [file, n] of Object.entries(counts)) {
  const allowed = baseline[file] ?? 0;
  if (n > allowed) worse.push([file, allowed, n]);
  else if (n < allowed) better.push([file, allowed, n]);
}
for (const [file, allowed] of Object.entries(baseline)) {
  if (!(file in counts)) better.push([file, allowed, 0]);
}

if (update) {
  // The very first run has nothing to compare with, so it records what is there.
  if (worse.length && hasBaseline && !allowIncrease) {
    console.error(`Refusing to raise the baseline for ${worse.length} file(s):`);
    for (const [file, allowed, n] of worse.slice(0, 40)) console.error(`  ${file}: ${allowed} -> ${n}`);
    if (worse.length > 40) console.error(`  ...and ${worse.length - 40} more`);
    console.error('Fix the new errors, or pass --allow-increase if raising it is deliberate.');
    process.exit(1);
  }
  const body = {
    $comment: 'Per-file tsc error counts that scripts/typecheck.mjs tolerates. Counts may only go down. Regenerate with `npm run typecheck -- --update`.',
    total: total(counts),
    files: sorted(counts),
  };
  writeFileSync(baselinePath, `${JSON.stringify(body, null, 2)}\n`);
  console.log(`Baseline written: ${body.total} errors in ${Object.keys(counts).length} files.`);
  process.exit(0);
}

if (worse.length) {
  console.error('Type errors above the baseline:\n');
  for (const [file, allowed, n] of worse) {
    console.error(`${file}: ${n} error(s), baseline ${allowed}`);
    // Show every error in the file: the baseline is a count, so tsc cannot say
    // which of them is new. The new one is usually in the lines you changed.
    for (const msg of messages[file]) console.error(`  ${msg}`);
    console.error('');
  }
  console.error(`${worse.length} file(s) gained type errors. New code must type-check; see jsconfig.json.`);
  process.exit(1);
}

const now = total(counts);
const was = total(baseline);
console.log(`Type check: ${now} known errors across ${Object.keys(counts).length} files (baseline ${was}). No file got worse.`);
if (better.length) {
  console.log(`${better.length} file(s) improved. Lock it in: npm run typecheck -- --update`);
  if (process.env.CI) process.exit(1);
}
