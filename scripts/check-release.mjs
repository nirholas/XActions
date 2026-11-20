#!/usr/bin/env node
// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Pre-publish guard, run by `npm publish` through the `prepublishOnly` hook.
 *
 * xactions 4.0.0 and 4.0.1 were published from a local commit (65a704b) that
 * never reached GitHub. The `latest` tag then pointed at code nobody could read,
 * rebuild or fix: issue #87 reported a crash in a file that did not exist in the
 * repository, and main still said 3.5.0, so the next tag-driven release would
 * have shipped a lower version than the one users already had.
 *
 * This refuses a publish unless:
 *   1. the version is not already on the registry and sorts above `latest`;
 *   2. outside CI, the working tree is clean and HEAD is already on GitHub's
 *      main, so the published tarball is built from commits anyone can check out.
 *
 * In GitHub Actions the checkout came from GitHub by definition, so only the
 * version rule applies there. Set XACTIONS_SKIP_RELEASE_CHECK=1 to bypass in an
 * emergency; the bypass is printed, never silent.
 *
 * Dependency-free on purpose: it runs before anything else in a publish.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const REPO_PATTERN = /github\.com[:/]nirholas\/xactions(\.git)?$/i;

/**
 * Parse a semver string into comparable parts. Build metadata is ignored.
 * @param {string} version
 * @returns {{ core: number[], pre: string[] }}
 */
export function parseVersion(version) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+.*)?$/.exec(String(version).trim());
  if (!match) throw new Error(`Not a semver version: ${version}`);
  return {
    core: [Number(match[1]), Number(match[2]), Number(match[3])],
    pre: match[4] ? match[4].split('.') : [],
  };
}

/**
 * Compare two versions by semver precedence.
 * @returns {number} negative when a < b, 0 when equal, positive when a > b
 */
export function compareVersions(a, b) {
  const left = parseVersion(a);
  const right = parseVersion(b);
  for (let i = 0; i < 3; i++) {
    if (left.core[i] !== right.core[i]) return left.core[i] - right.core[i];
  }
  // A release outranks any prerelease of the same core version.
  if (!left.pre.length || !right.pre.length) return right.pre.length - left.pre.length;
  for (let i = 0; i < Math.max(left.pre.length, right.pre.length); i++) {
    const x = left.pre[i];
    const y = right.pre[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const xNum = /^\d+$/.test(x);
    const yNum = /^\d+$/.test(y);
    if (xNum && yNum && Number(x) !== Number(y)) return Number(x) - Number(y);
    if (xNum !== yNum) return xNum ? -1 : 1;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

/**
 * The version rule, separated from I/O so it can be tested.
 * @param {string} version - The version about to be published
 * @param {{ latest?: string, versions?: string[] }} registry - What npm already has
 * @returns {string[]} Reasons to refuse; empty when the version is publishable
 */
export function versionProblems(version, registry) {
  const problems = [];
  if ((registry.versions || []).includes(version)) {
    problems.push(`${version} is already on npm. Bump "version" in package.json.`);
  } else if (registry.latest && compareVersions(version, registry.latest) <= 0) {
    problems.push(
      `${version} does not sort above npm's latest (${registry.latest}). ` +
        `Publishing it would move \`latest\` backwards for everyone who runs npx xactions.`,
    );
  }
  return problems;
}

function git(args) {
  // trimEnd, not trim: `git status --porcelain` lines start with a significant space.
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trimEnd();
}

/** The remote that points at GitHub's nirholas/xactions, whatever it is called. */
function upstreamRemote() {
  for (const name of git(['remote']).split('\n').filter(Boolean)) {
    const url = git(['remote', 'get-url', name]);
    if (REPO_PATTERN.test(url)) return name;
  }
  return null;
}

function sourceProblems() {
  const problems = [];
  const dirty = git(['status', '--porcelain']);
  if (dirty) {
    problems.push(
      'The working tree has uncommitted or untracked files, and npm packs whatever is on disk:\n' +
        dirty.split('\n').slice(0, 10).map((line) => `      ${line}`).join('\n'),
    );
  }
  const remote = upstreamRemote();
  if (!remote) {
    problems.push('No git remote points at github.com/nirholas/xactions, so nothing proves HEAD is public.');
    return problems;
  }
  git(['fetch', '--quiet', remote, 'main']);
  try {
    git(['merge-base', '--is-ancestor', 'HEAD', `${remote}/main`]);
  } catch {
    const head = git(['rev-parse', '--short', 'HEAD']);
    problems.push(
      `HEAD (${head}) is not on ${remote}/main. Merge it to main on GitHub first, ` +
        'then publish from that commit, so the release can be read and rebuilt.',
    );
  }
  return problems;
}

async function registryState(name) {
  const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}`, {
    headers: { accept: 'application/vnd.npm.install-v1+json' },
  });
  if (res.status === 404) return { versions: [] };
  if (!res.ok) throw new Error(`npm registry answered ${res.status} for ${name}`);
  const body = await res.json();
  return { latest: body['dist-tags']?.latest, versions: Object.keys(body.versions || {}) };
}

async function main() {
  if (process.env.XACTIONS_SKIP_RELEASE_CHECK === '1') {
    console.warn('⚠️  XACTIONS_SKIP_RELEASE_CHECK=1: publishing without the release check.');
    return;
  }
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  const problems = [];

  try {
    problems.push(...versionProblems(pkg.version, await registryState(pkg.name)));
  } catch (err) {
    problems.push(`Could not read ${pkg.name} from the npm registry (${err.message}). Refusing rather than guessing.`);
  }

  if (process.env.GITHUB_ACTIONS !== 'true') {
    try {
      problems.push(...sourceProblems());
    } catch (err) {
      problems.push(`Could not check the git state (${err.message.split('\n')[0]}).`);
    }
  }

  if (problems.length) {
    console.error(`\n✖ Refusing to publish ${pkg.name}@${pkg.version}:\n`);
    for (const problem of problems) console.error(`  • ${problem}\n`);
    console.error('  Emergency bypass: XACTIONS_SKIP_RELEASE_CHECK=1 npm publish\n');
    process.exit(1);
  }
  console.log(`✔ ${pkg.name}@${pkg.version} is publishable.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await main();
}
