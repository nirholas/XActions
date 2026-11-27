#!/usr/bin/env node
// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Prove that XActions still works against x.com today.
 *
 * Runs the real read paths against the live site with no account and no
 * secrets: query-ID discovery, the profile, posts, thread, media and hashtag
 * reads, request signing, the hosted MCP endpoint, and the documented DOM
 * selectors on public pages. With a dedicated test account's cookies in
 * XACTIONS_LIVE_CHECK_COOKIES it also checks search, followers and the
 * selectors on signed-in pages. Nothing is ever written to X.
 *
 * Writes three files to --out (see src/utils/liveStatus.js for their shape):
 *
 *   status.json   one row per check with id, status, ms and detail, plus the
 *                 timestamp, the package version and the regression state
 *   badge.json    the shields.io endpoint document for the README badge
 *   history.json  the published history with this run appended
 *
 * Exits 1 when a check that passed last time fails now (a regression), 2 when
 * the probe itself crashed, and 0 otherwise. A rate-limited check is recorded
 * as `limited` and is never a regression.
 *
 * The nightly workflow (.github/workflows/live-check.yml) runs this and
 * publishes the files on the `status` branch.
 *
 * Usage:
 *   node scripts/live-check.mjs
 *   node scripts/live-check.mjs --only profile,tweets --json
 *   node scripts/live-check.mjs --previous status/status.json --history status/history.json --out out
 *
 * Options:
 *   --out <dir>          Where to write the files (default live-check-out)
 *   --previous <path>    Last run's status.json, a file or URL (default: the published one)
 *   --history <path>     The history.json to append to, a file or URL (default: the published one)
 *   --no-previous        Compare against nothing and start a fresh history
 *   --only <ids>         Run only these checks, comma separated
 *   --json               Print status.json to stdout instead of the table
 *
 * The probe runs with a fresh, empty XACTIONS_HOME so no saved session, query-
 * ID cache or signing-key cache on the machine can colour the result.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

const USAGE = 'Usage: node scripts/live-check.mjs [--out dir] [--previous file|url] [--history file|url] [--no-previous] [--only ids] [--json]';

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
  const out = { out: 'live-check-out', previous: undefined, history: undefined, noPrevious: false, only: null, json: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const value = () => {
      const v = argv[++i];
      if (v === undefined || v.startsWith('--')) throw new Error(`${arg} needs a value. ${USAGE}`);
      return v;
    };
    if (arg === '--out') out.out = value();
    else if (arg === '--previous') out.previous = value();
    else if (arg === '--history') out.history = value();
    else if (arg === '--no-previous') out.noPrevious = true;
    else if (arg === '--only') out.only = value().split(',').map((s) => s.trim()).filter(Boolean);
    else if (arg === '--json') out.json = true;
    else if (arg === '--help' || arg === '-h') out.help = true;
    else throw new Error(`Unknown option ${arg}. ${USAGE}`);
  }
  return out;
}

/**
 * Read JSON from a file or URL. Null when it is missing, unreachable or not JSON.
 * @param {string} source
 */
async function loadJson(source) {
  try {
    if (/^https?:\/\//.test(source)) {
      const res = await fetch(source, { signal: AbortSignal.timeout(10_000), headers: { accept: 'application/json' } });
      return res.ok ? JSON.parse(await res.text()) : null;
    }
    return JSON.parse(fs.readFileSync(source, 'utf8'));
  } catch {
    return null;
  }
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

/** The run's GitHub Actions URL and commit, when there is one. */
function runInfo() {
  const { GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID, GITHUB_SHA } = process.env;
  if (!GITHUB_RUN_ID || !GITHUB_REPOSITORY) return undefined;
  return { url: `${GITHUB_SERVER_URL || 'https://github.com'}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`, sha: GITHUB_SHA };
}

/** Markdown for the Actions job summary. */
function summaryMarkdown(status) {
  const icon = { pass: 'pass', fail: 'FAIL', limited: 'limited', skipped: 'skipped' };
  const fresh = new Set(status.regressions);
  const rows = status.checks.map((c) =>
    `| \`${c.id}\` | ${icon[c.status]}${fresh.has(c.id) ? ' (new)' : ''} | ${c.ms} | ${c.detail.replace(/\|/g, '\\|')} |`);
  return [
    `### Verified against x.com, ${status.date}`,
    '',
    `${status.summary.pass}/${status.summary.checked} pass, ${status.summary.limited} limited, ${status.summary.skipped} skipped. xactions ${status.package.version}.`,
    '',
    '| Check | Result | ms | Detail |',
    '|---|---|---|---|',
    ...rows,
    '',
  ].join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(USAGE);
    return 0;
  }

  // Before any module that reads it is loaded: an empty home has no saved
  // session, no query-ID cache and no signing keys, so this is the guest tier
  // exactly as a fresh install sees it.
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'xactions-live-check-'));
  process.env.XACTIONS_HOME = home;

  const { CHECKS, COOKIE_ENV, createContext, runChecks } = await import('./live-check/checks.mjs');
  const { LIVE_HISTORY_URL, LIVE_STATUS_URL, appendHistory, buildBadge, buildStatus, exitCodeFor, validateStatus } = await import('../src/utils/liveStatus.js');
  const { VERSION } = await import('../src/version.js');

  if (args.only) {
    const unknown = args.only.filter((id) => !CHECKS.some((c) => c.id === id));
    if (unknown.length) throw new Error(`Unknown check id: ${unknown.join(', ')}. Known: ${CHECKS.map((c) => c.id).join(', ')}`);
  }

  let previous = null;
  let history = [];
  if (!args.noPrevious) {
    previous = await loadJson(args.previous ?? LIVE_STATUS_URL);
    if (previous && validateStatus(previous).length > 0) {
      console.error('Ignoring the previous status file: it is not a live-check status.json.');
      previous = null;
    }
    history = (await loadJson(args.history ?? LIVE_HISTORY_URL)) ?? [];
  }

  const cookies = process.env[COOKIE_ENV]?.trim() || null;
  const ctx = createContext({ cookies });
  const generatedAt = new Date().toISOString();
  const started = performance.now();

  if (!args.json) {
    console.log(`\nXActions live check, xactions ${VERSION}, ${generatedAt}`);
    console.log(`Tier: guest${cookies ? ' and session (test account)' : ' only'}; comparing against ${previous ? `the run of ${previous.generatedAt}` : 'nothing'}\n`);
  }

  let results;
  try {
    results = await runChecks(ctx, {
      only: args.only ?? undefined,
      onResult: (r) => {
        if (!args.json) console.log(`  ${r.status.padEnd(8)} ${r.id.padEnd(18)} ${String(r.ms).padStart(6)}ms  ${r.detail}`);
      },
    });
  } finally {
    await ctx.close();
    fs.rmSync(home, { recursive: true, force: true });
  }

  const status = buildStatus({
    checks: results.map(({ attempts: _attempts, ...rest }) => rest),
    previous,
    generatedAt,
    packageVersion: VERSION,
    node: process.version,
    durationMs: Math.round(performance.now() - started),
    run: runInfo(),
  });

  const outDir = path.resolve(args.out);
  writeJson(path.join(outDir, 'status.json'), status);
  writeJson(path.join(outDir, 'badge.json'), buildBadge(status));
  writeJson(path.join(outDir, 'history.json'), appendHistory(history, status));

  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summaryMarkdown(status));

  if (args.json) {
    console.log(JSON.stringify(status, null, 2));
  } else {
    const s = status.summary;
    console.log(`\n${s.pass}/${s.checked} pass, ${s.fail} fail, ${s.limited} limited, ${s.skipped} skipped, in ${(status.durationMs / 1000).toFixed(1)}s`);
    if (status.regressions.length) console.log(`Regressed since the last run: ${status.regressions.join(', ')}`);
    if (status.openRegressions.length) console.log(`Still open: ${status.openRegressions.join(', ')}`);
    console.log(`Wrote status.json, badge.json and history.json to ${path.relative(process.cwd(), outDir) || '.'}`);
  }

  return exitCodeFor(status);
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (error) => {
    console.error(`live-check: ${error.message}`);
    process.exitCode = 2;
  },
);
