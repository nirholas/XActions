#!/usr/bin/env node
// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Keep the one `x-changed` issue in step with the nightly live check.
 *
 * Reads the status.json that scripts/live-check.mjs wrote and acts on it with
 * the GitHub CLI:
 *
 *   - a check that passed last time fails now: open an `x-changed` issue
 *     listing the failing checks, or comment on the one already open;
 *   - every check that regressed passes again: close it;
 *   - anything else: do nothing.
 *
 * There is never more than one open: if several carry the label, the oldest
 * is the one that gets commented on and closed. The decision itself is
 * `planIssueAction()` in src/utils/liveStatus.js, which is tested.
 *
 * Usage (in the workflow, with GH_TOKEN set):
 *   node scripts/live-check-notify.mjs out/status.json
 *   node scripts/live-check-notify.mjs out/status.json --dry-run
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

import { ISSUE_LABEL, planIssueAction, validateStatus } from '../src/utils/liveStatus.js';

/**
 * Run gh with arguments, never through a shell. `input` goes to stdin.
 * @param {string[]} args
 * @param {string} [input]
 */
function gh(args, input) {
  return execFileSync('gh', args, { encoding: 'utf8', input, stdio: ['pipe', 'pipe', 'inherit'] });
}

function main() {
  const [file, ...rest] = process.argv.slice(2);
  const dryRun = rest.includes('--dry-run');
  if (!file) throw new Error('Usage: node scripts/live-check-notify.mjs <status.json> [--dry-run]');

  const status = JSON.parse(fs.readFileSync(file, 'utf8'));
  const problems = validateStatus(status);
  if (problems.length) throw new Error(`${file} is not a live-check status file: ${problems.join('; ')}`);

  let openIssue = null;
  if (!dryRun) {
    gh(['label', 'create', ISSUE_LABEL, '--color', 'B60205', '--description', 'The nightly live check found that x.com changed something XActions depends on', '--force']);
    const open = JSON.parse(gh(['issue', 'list', '--label', ISSUE_LABEL, '--state', 'open', '--json', 'number', '--limit', '50']));
    openIssue = open.map((i) => i.number).sort((a, b) => a - b)[0] ?? null;
  }

  const plan = planIssueAction({ status, openIssue, runUrl: status.run?.url });
  if (dryRun) {
    console.log(JSON.stringify(plan, null, 2));
    return;
  }

  if (plan.action === 'open') {
    const url = gh(['issue', 'create', '--title', plan.title, '--label', ISSUE_LABEL, '--body-file', '-'], plan.body).trim();
    console.log(`Opened ${url}`);
  } else if (plan.action === 'comment') {
    gh(['issue', 'comment', String(plan.issue), '--body-file', '-'], plan.body);
    console.log(`Commented on #${plan.issue}`);
  } else if (plan.action === 'close') {
    gh(['issue', 'close', String(plan.issue), '--comment', plan.body]);
    console.log(`Closed #${plan.issue}`);
  } else {
    console.log(openIssue ? `Nothing new; #${openIssue} stays open.` : 'Nothing to report.');
  }
}

try {
  main();
} catch (error) {
  console.error(`live-check-notify: ${error.message}`);
  process.exitCode = 1;
}
