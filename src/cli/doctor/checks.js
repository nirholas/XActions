// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Environment checks for `xactions doctor`: the facts that settled past
 * install and start-up issues, each with the fix next to it.
 *
 * - Node against the `engines` range in package.json, not a number copied
 *   into this file that drifts from it.
 * - The native SQLite module loads. A Node upgrade leaves better-sqlite3
 *   built for the old ABI, and the account pool then fails to open.
 * - XACTIONS_HOME is writable, since sessions, caches and the action ledger
 *   all live there.
 * - The clock agrees with x.com. Signed requests carry a timestamp and X
 *   refuses ones too far from its own clock.
 * - A stale global install is not shadowing a newer one on PATH.
 * - How XActions was installed, and which optional packages are present.
 *
 * Every describer is pure so it can be tested without the machine state it
 * describes; the functions that touch the machine are thin around them.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { OPTIONAL_PACKAGES, isMissingPackage } from '../../utils/optionalDeps.js';

/**
 * @typedef {object} CheckResult
 * @property {'ok'|'warn'|'fail'} status
 * @property {string} detail
 * @property {string} [fix]
 * @property {Record<string, any>} [facts]
 * @property {string[]} [secrets]
 */

/** The root of this XActions install: the directory holding its package.json. */
export const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

/**
 * @returns {{name: string, version: string, engines?: {node?: string}, bugs?: {url?: string}}}
 */
export function readOwnPackage() {
  return JSON.parse(readFileSync(path.join(PACKAGE_ROOT, 'package.json'), 'utf-8'));
}

/**
 * @param {string} version
 * @returns {{nums: number[], pre: string|null}|null}
 */
function parseVersion(version) {
  const match = String(version).trim().match(/^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:-([\w.]+))?(?:\+[\w.]+)?$/);
  if (!match) return null;
  return { nums: [Number(match[1]), Number(match[2] || 0), Number(match[3] || 0)], pre: match[4] || null };
}

/**
 * Semver ordering of two versions; a prerelease sorts before its release.
 * @param {string} a
 * @param {string} b
 * @returns {number} negative, zero or positive
 */
export function compareVersions(a, b) {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  if (!pa || !pb) return String(a).localeCompare(String(b));
  for (let i = 0; i < 3; i += 1) {
    if (pa.nums[i] !== pb.nums[i]) return pa.nums[i] - pb.nums[i];
  }
  if (pa.pre === pb.pre) return 0;
  if (!pa.pre) return 1;
  if (!pb.pre) return -1;
  return pa.pre.localeCompare(pb.pre);
}

/**
 * Does a version satisfy an engines-style range: `>=22.19`,
 * `^22.19 || >=24`, `>=22.19 <23`, `~20.1`.
 * @param {string} version
 * @param {string} range
 * @returns {boolean|null} null when the range uses syntax this does not read
 */
export function satisfiesRange(version, range) {
  const v = parseVersion(version);
  if (!v) return null;
  const base = `${v.nums.join('.')}${v.pre ? `-${v.pre}` : ''}`;
  const clauses = String(range).split('||').map((c) => c.trim().replace(/(>=|<=|>|<|=|\^|~)\s+/g, '$1'));
  let anyReadable = false;
  for (const clause of clauses) {
    const tokens = clause.split(/\s+/).filter(Boolean);
    let ok = true;
    for (const token of tokens) {
      const m = token.match(/^(>=|<=|>|<|=|\^|~)?v?(\d+)(?:\.(\d+))?(?:\.(\d+))?$/);
      if (!m) return null;
      const [, op = '=', major, minor, patch] = m;
      const target = `${major}.${minor || 0}.${patch || 0}`;
      const cmp = compareVersions(base, target);
      const M = Number(major);
      const m2 = Number(minor || 0);
      let pass;
      if (op === '>=') pass = cmp >= 0;
      else if (op === '>') pass = cmp > 0;
      else if (op === '<=') pass = cmp <= 0;
      else if (op === '<') pass = cmp < 0;
      else if (op === '^') pass = cmp >= 0 && compareVersions(base, M > 0 ? `${M + 1}.0.0` : `0.${m2 + 1}.0`) < 0;
      else if (op === '~') pass = cmp >= 0 && compareVersions(base, minor === undefined ? `${M + 1}.0.0` : `${M}.${m2 + 1}.0`) < 0;
      else {
        // `=` or a bare version: match the parts given.
        pass = v.nums[0] === M && (minor === undefined || v.nums[1] === m2) && (patch === undefined || v.nums[2] === Number(patch));
      }
      if (!pass) ok = false;
    }
    anyReadable = true;
    if (ok && tokens.length > 0) return true;
  }
  return anyReadable ? false : null;
}

/**
 * The lowest version a range names, for the install hint.
 * @param {string} range
 * @returns {string|null}
 */
function minimumOf(range) {
  const m = String(range).match(/(?:>=|\^|~)\s*v?(\d+(?:\.\d+){0,2})/);
  return m ? m[1] : null;
}

/**
 * Node against the package's `engines.node`.
 * @param {string} version - process.versions.node
 * @param {string} range - engines.node
 * @returns {CheckResult}
 */
export function describeNode(version, range) {
  const satisfied = satisfiesRange(version, range);
  if (satisfied === null) {
    return { status: 'warn', detail: `Node ${version}; could not read the engines range "${range}"` };
  }
  if (satisfied) return { status: 'ok', detail: `Node ${version} satisfies ${range}` };
  const min = minimumOf(range);
  const major = min ? min.split('.')[0] : 'lts';
  return {
    status: 'fail',
    detail: `Node ${version} does not satisfy ${range}`,
    fix: `Install Node ${min || range} or newer: https://nodejs.org, or \`nvm install ${major}\`.`,
  };
}

/**
 * @returns {CheckResult}
 */
export function checkNode() {
  let range = '>=22.19';
  try {
    range = readOwnPackage().engines?.node || range;
  } catch {
    // An unreadable package.json is reported by every other check; keep the floor.
  }
  return { ...describeNode(process.versions.node, range), facts: { version: process.versions.node, engines: range } };
}

/**
 * Does the native SQLite module this install ships load and answer.
 * @returns {Promise<CheckResult>}
 */
export async function checkSqlite() {
  const rebuild = 'It was built for a different Node. Run `npm rebuild better-sqlite3` where XActions is installed, or for a global install run `npm install -g xactions` again.';
  let Database;
  try {
    Database = (await import('better-sqlite3')).default;
  } catch (err) {
    if (isMissingPackage(err, 'better-sqlite3')) {
      return {
        status: 'fail',
        detail: 'better-sqlite3 is not installed',
        fix: 'Reinstall: `npm install -g xactions`, or `npm ci` in a clone. The account pool needs it.',
      };
    }
    return { status: 'fail', detail: `better-sqlite3 failed to load: ${err.message}`, fix: rebuild };
  }
  try {
    const db = new Database(':memory:');
    try {
      const row = db.prepare('select sqlite_version() as v').get();
      return { status: 'ok', detail: `better-sqlite3 loads (SQLite ${row.v})` };
    } finally {
      db.close();
    }
  } catch (err) {
    return { status: 'fail', detail: `better-sqlite3 failed to open a database: ${err.message}`, fix: rebuild };
  }
}

/**
 * Can XActions write its home directory. Never creates it: a missing home is
 * fine as long as it can be created on first save.
 * @param {string} home
 * @returns {Promise<CheckResult>}
 */
export async function checkHome(home) {
  const elsewhere = 'or point XACTIONS_HOME at a directory you can write.';
  let stat;
  try {
    stat = await fs.stat(home);
  } catch (err) {
    if (err.code !== 'ENOENT' && err.code !== 'ENOTDIR') {
      return { status: 'fail', detail: `Cannot read ${home}: ${err.code || err.message}`, fix: `Fix its permissions, ${elsewhere}` };
    }
  }
  if (stat) {
    if (!stat.isDirectory()) {
      return { status: 'fail', detail: `${home} exists but is not a directory`, fix: `Move that file aside, ${elsewhere}` };
    }
    const probe = path.join(home, `.doctor-write-${process.pid}-${Date.now()}`);
    try {
      await fs.writeFile(probe, '', { flag: 'wx' });
      await fs.unlink(probe);
      return { status: 'ok', detail: `${home} is writable` };
    } catch (err) {
      return {
        status: 'fail',
        detail: `${home} is not writable (${err.code || err.message})`,
        fix: `Take ownership with \`sudo chown -R "$(id -un)" ${home}\`, ${elsewhere}`,
      };
    }
  }
  // Walk up to the nearest thing that exists and ask whether it can hold the home.
  let ancestor = path.dirname(home);
  for (;;) {
    try {
      const st = await fs.stat(ancestor);
      if (!st.isDirectory()) {
        return { status: 'fail', detail: `${home} cannot be created: ${ancestor} is a file`, fix: `Move that file aside, ${elsewhere}` };
      }
      await fs.access(ancestor, fs.constants.W_OK);
      return { status: 'ok', detail: `${home} does not exist yet; it will be created on first save` };
    } catch (err) {
      if (err.code === 'ENOENT' && path.dirname(ancestor) !== ancestor) {
        ancestor = path.dirname(ancestor);
        continue;
      }
      return {
        status: 'fail',
        detail: `${home} cannot be created: ${ancestor} is not writable`,
        fix: `Create it yourself with the right owner, ${elsewhere}`,
      };
    }
  }
}

/** Skew beyond which signed requests are at risk, and beyond which they fail. */
const SKEW_WARN_SECONDS = 30;
const SKEW_FAIL_SECONDS = 300;

/**
 * Compare this machine's clock with the Date header x.com sent.
 * @param {{serverDate: string|null, localMs: number, rttMs: number}} sample
 *   localMs is when the response arrived; half the round trip is taken off.
 * @returns {CheckResult}
 */
export function describeClockSkew({ serverDate, localMs, rttMs }) {
  const serverMs = serverDate ? Date.parse(serverDate) : NaN;
  if (!Number.isFinite(serverMs)) {
    return { status: 'warn', detail: 'x.com sent no usable Date header to compare clocks with' };
  }
  const skew = Math.round((localMs - rttMs / 2 - serverMs) / 1000);
  const abs = Math.abs(skew);
  if (abs <= SKEW_WARN_SECONDS) return { status: 'ok', detail: `Clock within ${abs}s of x.com` };
  const fix = 'Turn on automatic time sync: `sudo timedatectl set-ntp true` on Linux, Date & Time > Set time automatically on macOS, Settings > Time & language > Sync now on Windows.';
  const detail = `Clock is ${abs}s ${skew > 0 ? 'ahead of' : 'behind'} x.com`;
  if (abs <= SKEW_FAIL_SECONDS) {
    return { status: 'warn', detail, fix: `${fix} Signed requests carry a timestamp, and the gap is growing toward where X refuses them.` };
  }
  return { status: 'fail', detail, fix: `${fix} Signed requests carry a timestamp and X refuses ones this far off.` };
}

/**
 * @param {{url?: string, timeoutMs?: number}} [options]
 * @returns {Promise<CheckResult>}
 */
export async function checkClock({ url = 'https://x.com/', timeoutMs = 5000 } = {}) {
  const started = Date.now();
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(timeoutMs) });
    const arrived = Date.now();
    return describeClockSkew({ serverDate: res.headers.get('date'), localMs: arrived, rttMs: arrived - started });
  } catch (err) {
    return {
      status: 'warn',
      detail: `Could not reach x.com to compare clocks: ${err.cause?.code || err.message}`,
      fix: 'Check your network and any proxy; the guest tier checks say more.',
    };
  }
}

/**
 * @param {string} p
 * @returns {string}
 */
const slashes = (p) => String(p).replace(/\\/g, '/').replace(/\/+$/, '');

const METHOD_LABELS = {
  npx: 'npx',
  global: 'global npm',
  'local-clone': 'local clone',
  source: 'source copy (no git)',
  dependency: 'project dependency',
};

/**
 * How was XActions installed, from where its package root sits.
 * @param {object} input
 * @param {string} input.packageRoot
 * @param {string} input.execPath - process.execPath
 * @param {string} input.platform
 * @param {Record<string, string|undefined>} input.env
 * @param {boolean} input.inContainer
 * @param {boolean} input.hasGit - packageRoot holds a .git
 * @returns {{method: string, container: boolean, label: string}}
 */
export function detectInstall({ packageRoot, execPath, platform, env, inContainer, hasGit }) {
  const root = slashes(packageRoot);
  const lower = root.toLowerCase();
  const globalRoots = [];
  const nodeDir = slashes(path.dirname(execPath));
  if (platform === 'win32') {
    globalRoots.push(`${nodeDir}/node_modules`);
    if (env.APPDATA) globalRoots.push(`${slashes(env.APPDATA)}/npm/node_modules`);
    if (env.npm_config_prefix) globalRoots.push(`${slashes(env.npm_config_prefix)}/node_modules`);
  } else {
    globalRoots.push(`${slashes(path.posix.dirname(nodeDir))}/lib/node_modules`);
    if (env.npm_config_prefix) globalRoots.push(`${slashes(env.npm_config_prefix)}/lib/node_modules`);
  }

  let method;
  if (/\/_npx\//.test(lower)) method = 'npx';
  else if (!lower.includes('/node_modules/')) method = hasGit ? 'local-clone' : 'source';
  else if (
    globalRoots.some((g) => lower.startsWith(`${g.toLowerCase()}/`)) ||
    /\/pnpm\/global\/|\/\.config\/yarn\/global\/|\/\.volta\/tools\/image\/packages\//.test(lower)
  ) method = 'global';
  else method = 'dependency';

  const label = inContainer ? `Docker (${METHOD_LABELS[method]})` : METHOD_LABELS[method];
  return { method, container: inContainer, label };
}

/**
 * Is this process running inside a container.
 * @returns {boolean}
 */
function inContainer() {
  if (existsSync('/.dockerenv') || existsSync('/run/.containerenv') || process.env.container) return true;
  try {
    return /docker|containerd|kubepods|libpod|lxc/.test(readFileSync('/proc/1/cgroup', 'utf-8'));
  } catch {
    return false;
  }
}

/**
 * Install method of the running copy, with the commit for a clone.
 * @returns {{method: string, container: boolean, label: string, root: string}}
 */
export function gatherInstall() {
  let root = PACKAGE_ROOT;
  try {
    root = realpathSync(PACKAGE_ROOT);
  } catch {
    // Keep the unresolved path.
  }
  const hasGit = existsSync(path.join(root, '.git'));
  const result = detectInstall({ packageRoot: root, execPath: process.execPath, platform: process.platform, env: process.env, inContainer: inContainer(), hasGit });
  if (result.method === 'local-clone') {
    try {
      const commit = execFileSync('git', ['-C', root, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf-8', timeout: 3000, stdio: ['ignore', 'pipe', 'ignore'] }).trim();
      if (/^[0-9a-f]{4,12}$/.test(commit)) result.label = `${result.label} (${commit})`;
    } catch {
      // git missing or not a work tree: the method alone is still right.
    }
  }
  return { ...result, root };
}

/**
 * The xactions package that owns a file, walking up from it.
 * @param {string} file
 * @returns {{root: string, version: string}|null}
 */
function owningPackage(file) {
  let dir = path.dirname(file);
  for (let i = 0; i < 8; i += 1) {
    try {
      const pkg = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf-8'));
      if (pkg.name === 'xactions') return { root: dir, version: pkg.version };
    } catch {
      // No package.json here; keep walking.
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/**
 * Every distinct xactions install reachable through PATH, in PATH order.
 * npm links the bin on POSIX and writes a `.cmd` shim beside a
 * `node_modules` folder on Windows; both are followed to the package.
 * @param {{pathEnv?: string, platform?: string}} [options]
 * @returns {Promise<Array<{bin: string, root: string, version: string}>>}
 */
export async function findInstallsOnPath({ pathEnv = process.env.PATH || '', platform = process.platform } = {}) {
  const delimiter = platform === 'win32' ? ';' : ':';
  const names = platform === 'win32' ? ['xactions.cmd', 'xactions'] : ['xactions'];
  const seenDirs = new Set();
  const seenRoots = new Set();
  const found = [];
  for (const dir of pathEnv.split(delimiter).filter(Boolean)) {
    if (seenDirs.has(dir)) continue;
    seenDirs.add(dir);
    for (const name of names) {
      const bin = path.join(dir, name);
      if (!existsSync(bin)) continue;
      let owner;
      try {
        owner = owningPackage(realpathSync(bin));
      } catch {
        // A dangling link: fall back to the Windows shim layout below.
        owner = null;
      }
      if (!owner) owner = owningPackage(path.join(dir, 'node_modules', 'xactions', 'package.json'));
      if (owner && !seenRoots.has(owner.root)) {
        seenRoots.add(owner.root);
        found.push({ bin, root: owner.root, version: owner.version });
      }
      break;
    }
  }
  return found;
}

/**
 * Is the `xactions` a shell runs the one the user thinks it is.
 * @param {{running: {version: string, root: string}, installs: Array<{bin: string, root: string, version: string}>}} input
 * @returns {CheckResult}
 */
export function describeShadowing({ running, installs }) {
  if (installs.length === 0) {
    return { status: 'ok', detail: `xactions is not on PATH (this run is ${running.version})` };
  }
  const [first] = installs;
  const newest = installs.reduce((a, b) => (compareVersions(b.version, a.version) > 0 ? b : a));
  if (compareVersions(first.version, newest.version) < 0) {
    return {
      status: 'warn',
      detail: `The xactions first on PATH is ${first.version} at ${first.root}, which hides ${newest.version} at ${newest.root}`,
      fix: `Remove the older one (\`npm uninstall -g xactions\` with the Node that installed it active), or put ${path.dirname(newest.bin)} earlier on PATH.`,
    };
  }
  if (first.root !== running.root) {
    const cmp = compareVersions(running.version, first.version);
    if (cmp > 0) {
      return {
        status: 'warn',
        detail: `xactions on PATH is ${first.version} at ${first.root}, older than this ${running.version}`,
        fix: 'Update it with `npm install -g xactions@latest`.',
      };
    }
    if (cmp < 0) {
      return {
        status: 'warn',
        detail: `This run is ${running.version}, but xactions on PATH is ${first.version}; npx or a local copy may be stale`,
        fix: 'Run `npx xactions@latest`, or use the xactions on PATH.',
      };
    }
    return { status: 'ok', detail: `xactions on PATH is ${first.version}, the same version as this run` };
  }
  return { status: 'ok', detail: `xactions on PATH is this install (${running.version})` };
}

/**
 * @param {string} version
 * @returns {Promise<CheckResult>}
 */
export async function checkShadowing(version) {
  let root = PACKAGE_ROOT;
  try {
    root = realpathSync(PACKAGE_ROOT);
  } catch {
    // Keep the unresolved path.
  }
  return describeShadowing({ running: { version, root }, installs: await findInstallsOnPath() });
}

/**
 * Which optional packages this install can load, with their versions. Reads
 * package.json files along Node's own lookup path; imports nothing.
 * @param {{fromDir?: string}} [options]
 * @returns {Array<{name: string, feature: string, present: boolean, version: string|null}>}
 */
export function optionalDepsInventory({ fromDir = PACKAGE_ROOT } = {}) {
  const require = createRequire(path.join(fromDir, 'package.json'));
  return OPTIONAL_PACKAGES.map(({ name, feature }) => {
    for (const dir of require.resolve.paths(name) || []) {
      try {
        const pkg = JSON.parse(readFileSync(path.join(dir, name, 'package.json'), 'utf-8'));
        if (pkg.name === name) return { name, feature, present: true, version: String(pkg.version) };
      } catch {
        // Not in this node_modules; try the next one up.
      }
    }
    return { name, feature, present: false, version: null };
  });
}
