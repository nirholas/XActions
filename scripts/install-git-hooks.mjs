#!/usr/bin/env node
// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Points git at the hooks committed in .githooks/, so a contributor's commits get
 * the same lint and type check CI runs, before CI has to tell them.
 *
 * Runs from the `prepare` script, which npm also runs in places with no git
 * checkout (a Docker build, an install from a tarball), so every reason not to
 * install is a quiet no-op rather than a failure. It never overrides a hooks path
 * the developer set themselves.
 *
 * @author nich (@nichxbt)
 */

import { execFileSync } from 'node:child_process';
import { existsSync, chmodSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hooksDir = '.githooks';

function git(...args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

function main() {
  if (process.env.CI || process.env.XACTIONS_SKIP_HOOKS) return;
  if (!existsSync(path.join(root, hooksDir))) return;

  let top;
  try {
    top = git('rev-parse', '--show-toplevel');
  } catch {
    return; // not a git checkout, or git is not installed
  }
  // Installed as a dependency inside someone else's repository: not ours to configure.
  if (path.resolve(top) !== root) return;

  let current = '';
  try {
    current = git('config', '--get', 'core.hooksPath');
  } catch {
    // unset: `git config --get` exits 1, which is the normal case
  }
  if (current === hooksDir) return;
  if (current) {
    console.log(`xactions: core.hooksPath is already "${current}"; leaving it. To use the project hooks: git config core.hooksPath ${hooksDir}`);
    return;
  }

  try {
    chmodSync(path.join(root, hooksDir, 'pre-commit'), 0o755);
  } catch {
    // a read-only checkout still gets the config; git reports a non-executable hook
  }
  git('config', 'core.hooksPath', hooksDir);
  console.log(`xactions: git hooks installed from ${hooksDir}/ (skip once with --no-verify).`);
}

main();
