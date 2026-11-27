// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * `xactions doctor` - find out what actually works before you need it to.
 *
 * Almost every issue filed against this project is one of six things, and all
 * six are detectable in a few seconds: an old Node, a missing session, a
 * session with `auth_token` but no `ct0`, X rotating its GraphQL query IDs,
 * Chromium not installed for the browser-driven commands, or the guest tier
 * being rate limited. Rather than making people discover these one failure at
 * a time, this runs every check and prints the exact fix for whatever failed.
 *
 * Each check has a stable id and reports one of three states, and the process
 * exit code follows: 0 when nothing failed, 1 when something did. The same
 * results print four ways: for a person (the default), as JSON (`--json`), as
 * a redacted Markdown block to paste into an issue (`--report`), and as that
 * block plus a prefilled new-issue link (`--issue`). Nothing is ever sent
 * anywhere; the link is printed and opened only with `--open`.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license Apache-2.0
 */

import chalk from 'chalk';
import { Option } from 'commander';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { xactionsHome } from '../../utils/savedSession.js';
import { BROWSER_INSTALL, isMissingPackage } from '../../utils/optionalDeps.js';
import { openUrl } from '../../utils/openUrl.js';

import { VERSION } from '../../version.js';
import { countInstalledSkills } from './skills.js';
import {
  checkClock,
  checkHome,
  checkNode,
  checkShadowing,
  checkSqlite,
  gatherInstall,
  optionalDepsInventory,
  readOwnPackage,
} from '../doctor/checks.js';
import { issueUrl, readSessionSecrets, renderReport, reportTitle } from '../doctor/report.js';

const CONFIG_DIR = xactionsHome();
const COOKIE_FILE = path.join(CONFIG_DIR, 'cookies.json');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

/** A stable, public, high-traffic account to probe the guest tier with. */
const PROBE_ACCOUNT = 'nasa';

/**
 * @typedef {import('../doctor/checks.js').CheckResult} CheckResult
 */

/**
 * Can a logged-out client still read public data. This is the check that
 * catches X rotating its GraphQL query IDs, because a rotated ID answers with
 * a 404 whose body says "Query not found".
 * @returns {Promise<CheckResult>}
 */
async function checkGuestTier() {
  try {
    const { Scraper } = await import('../../client/index.js');
    const scraper = new Scraper();
    const profile = await scraper.getProfile(PROBE_ACCOUNT);
    if (!profile?.id) {
      return {
        status: 'fail',
        detail: `X answered but returned no data for @${PROBE_ACCOUNT}`,
        fix: 'Run `npm run check:endpoints` to see whether a GraphQL query ID has rotated.',
      };
    }
    return {
      status: 'ok',
      detail: `Read @${profile.username} without a login (${profile.followersCount.toLocaleString('en-US')} followers)`,
    };
  } catch (error) {
    if (error.code === 'RATE_LIMITED') {
      return {
        status: 'warn',
        detail: 'X is rate limiting the guest token',
        fix: 'Wait a few minutes. Connecting a session with `xactions connect` raises the ceiling considerably.',
      };
    }
    if (/Query not found/i.test(error.message)) {
      return {
        status: 'fail',
        detail: 'X has rotated a GraphQL query ID',
        fix: 'Run `npm run check:endpoints` to identify it, then update src/scrapers/twitter/http/endpoints.js.',
      };
    }
    return {
      status: 'fail',
      detail: error.message,
      fix: 'Check your network and any proxy. If this persists, open an issue with this output.',
    };
  }
}

/**
 * Can a logged-out client still read a public timeline. Separate from the
 * profile check because the two use different GraphQL operations and one has
 * broken without the other before.
 * @returns {Promise<CheckResult>}
 */
async function checkTimeline() {
  try {
    const { Scraper } = await import('../../client/index.js');
    const scraper = new Scraper();
    let count = 0;
    for await (const _tweet of scraper.getTweets(PROBE_ACCOUNT, 3)) {
      count += 1;
      if (count >= 3) break;
    }
    if (count === 0) {
      return {
        status: 'fail',
        detail: 'The timeline endpoint answered with no posts',
        fix: 'Run `npm run check:endpoints`. This is the signature of a rotated UserTweets query ID.',
      };
    }
    return { status: 'ok', detail: `Pulled ${count} posts from @${PROBE_ACCOUNT} without a login` };
  } catch (error) {
    return { status: 'fail', detail: error.message, fix: 'Run `npm run check:endpoints` to locate the broken operation.' };
  }
}

/**
 * Is a session saved, and does it carry both cookies. `facts` says so in a
 * form the report can print without printing the cookies.
 * @returns {Promise<CheckResult>}
 */
async function checkSessionStored() {
  try {
    const jar = JSON.parse(await fs.readFile(COOKIE_FILE, 'utf-8'));
    const cookies = Object.fromEntries(jar.map((c) => [c.name, c.value]));
    if (!cookies.auth_token) {
      return {
        status: 'fail',
        detail: 'Cookie jar exists but has no auth_token',
        fix: 'Run `xactions connect`.',
        facts: { saved: false, ct0: Boolean(cookies.ct0), source: 'cookies.json' },
      };
    }
    if (!cookies.ct0) {
      return {
        status: 'fail',
        detail: 'Session has auth_token but no ct0',
        fix: 'X treats a session without ct0 as logged out, so search, followers and DMs all fail with a bare 404. Run `xactions connect` to capture both.',
        facts: { saved: true, ct0: false, source: 'cookies.json' },
      };
    }
    return {
      status: 'ok',
      detail: `Both cookies present in ${COOKIE_FILE}`,
      facts: { saved: true, ct0: true, source: 'cookies.json' },
    };
  } catch {
    // Fall back to the values `xactions login` writes.
    try {
      const config = JSON.parse(await fs.readFile(CONFIG_FILE, 'utf-8'));
      if (!config.authToken) throw new Error('no token');
      if (!config.csrfToken) {
        return {
          status: 'fail',
          detail: 'config.json has auth_token but no ct0',
          fix: 'Run `xactions connect` to capture both in one step.',
          facts: { saved: true, ct0: false, source: 'config.json' },
        };
      }
      return {
        status: 'ok',
        detail: `Both cookies present in ${CONFIG_FILE}`,
        facts: { saved: true, ct0: true, source: 'config.json' },
      };
    } catch {
      return {
        status: 'warn',
        detail: 'No session saved, so only the guest tier is available',
        fix: 'Run `xactions connect` to unlock search, followers, following, likes, bookmarks and DMs.',
        facts: { saved: false, ct0: false, source: null },
      };
    }
  }
}

/**
 * Does the saved session still work. A session can be present and expired,
 * which looks identical to a broken tool from the outside.
 * @param {CheckResult} stored
 * @returns {Promise<CheckResult>}
 */
async function checkSessionLive(stored) {
  if (stored.status === 'warn') {
    return { status: 'warn', detail: 'Skipped, no session saved' };
  }
  try {
    const { Scraper } = await import('../../client/index.js');
    const scraper = new Scraper();
    await scraper.loadCookies(COOKIE_FILE).catch(async () => {
      const config = JSON.parse(await fs.readFile(CONFIG_FILE, 'utf-8'));
      await scraper.setCookies(`auth_token=${config.authToken}; ct0=${config.csrfToken}`);
    });
    const me = await scraper.me();
    if (!me?.username) throw new Error('X returned no account for this session');
    return {
      status: 'ok',
      detail: `Signed in as @${me.username}`,
      secrets: [me.username, me.name, me.id].filter((v) => typeof v === 'string' && v),
    };
  } catch (error) {
    return {
      status: 'fail',
      detail: `Session did not authenticate: ${error.message}`,
      fix: 'The session has probably expired or been revoked. Run `xactions connect` again.',
    };
  }
}

/**
 * Is Chromium available for the commands that still drive a browser.
 * @returns {Promise<CheckResult>}
 */
async function checkBrowser() {
  let puppeteer;
  try {
    puppeteer = (await import('puppeteer')).default;
  } catch (err) {
    if (!isMissingPackage(err, 'puppeteer')) {
      return { status: 'warn', detail: `Puppeteer failed to load: ${err.message}` };
    }
    return {
      status: 'warn',
      detail: 'Puppeteer is not installed (an install with --omit=optional leaves it out)',
      fix: `Run \`${BROWSER_INSTALL}\`. Only \`xactions connect\` and the posting commands need it; every read works without it.`,
    };
  }
  try {
    // Puppeteer 25 resolves the path asynchronously.
    const executable = await puppeteer.executablePath();
    await fs.access(executable);
    return { status: 'ok', detail: 'Chromium installed for browser-driven commands' };
  } catch {
    return {
      status: 'warn',
      detail: 'Chromium is not installed',
      fix: 'Run `npx puppeteer browsers install chrome`. Only `xactions connect` and the posting commands need it; every read works without it.',
    };
  }
}

/**
 * Does the MCP server load and expose its tools.
 * @returns {Promise<CheckResult>}
 */
async function checkMcp() {
  try {
    const mod = await import('../../mcp/server.js');
    const tools = mod.TOOLS || mod.default?.TOOLS;
    if (!Array.isArray(tools) || tools.length === 0) {
      return { status: 'warn', detail: 'MCP server loaded but exposed no tool list' };
    }
    return { status: 'ok', detail: `MCP server exposes ${tools.length} tools`, facts: { tools: tools.length } };
  } catch (error) {
    return {
      status: 'fail',
      detail: `MCP server failed to load: ${error.message}`,
      fix: 'Reinstall with `npm install -g xactions`, or open an issue with this output.',
    };
  }
}

/**
 * Are the bundled skills installed anywhere an agent will read them.
 * @returns {Promise<CheckResult>}
 */
async function checkSkills() {
  try {
    const counts = await countInstalledSkills();
    const perTarget = ['claude', 'cursor', 'codex', 'windsurf'].map((t) => `${t} ${counts[t]}`).join(', ');
    if (counts.total === 0) {
      return {
        status: 'warn',
        detail: `No skills installed (${perTarget})`,
        fix: 'Run `xactions skills install --all --global` so your agent knows which script to reach for.',
        facts: { total: 0 },
      };
    }
    return {
      status: 'ok',
      detail: `${counts.total} skill install${counts.total === 1 ? '' : 's'} found (${perTarget})`,
      facts: { total: counts.total },
    };
  } catch (error) {
    return { status: 'fail', detail: `Could not read the skills catalogue: ${error.message}`, fix: 'Reinstall with `npm install -g xactions`.' };
  }
}

/**
 * Human age of an ISO timestamp for the query-ID line: `12m old`, `3h old`.
 * @param {string} iso
 * @param {number} [now=Date.now()]
 * @returns {string}
 */
export function formatCacheAge(iso, now = Date.now()) {
  const ms = now - Date.parse(iso);
  if (!Number.isFinite(ms) || ms < 0) return 'unknown age';
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return 'under a minute old';
  if (minutes < 60) return `${minutes}m old`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h old`;
  return `${Math.floor(hours / 24)}d old`;
}

/**
 * Turn a query-ID cache status into a check result. Pure, so it is testable
 * without a cache on disk or a network.
 * @param {{cached: boolean, fetchedAt: string|null, count: number, cachePath: string, stale: boolean}} status
 * @param {number} [now=Date.now()]
 * @returns {CheckResult}
 */
export function describeQueryIds(status, now = Date.now()) {
  if (!status.cached) {
    return {
      status: 'warn',
      detail: 'No discovered query IDs cached; the pinned table in endpoints.js is in use',
      fix: `Run \`xactions doctor --refresh-ids\` to pull the current IDs from x.com into ${status.cachePath}.`,
    };
  }
  const age = status.fetchedAt ? formatCacheAge(status.fetchedAt, now) : 'unknown age';
  if (status.stale) {
    return {
      status: 'warn',
      detail: `${status.count} query IDs cached, ${age}, past the 24h freshness window`,
      fix: 'Run `xactions doctor --refresh-ids`. A stale ID answers "404 Query not found" the day X ships a new bundle.',
    };
  }
  return { status: 'ok', detail: `${status.count} query IDs cached, ${age} (${status.cachePath})` };
}

/**
 * Are the GraphQL query IDs fresh. With `refresh`, discover them from x.com
 * first and report that run instead.
 * @param {{refresh?: boolean}} [options]
 * @returns {Promise<CheckResult>}
 */
async function checkQueryIds({ refresh = false } = {}) {
  const { queryIdStatus, refreshQueryIds } = await import('../../scrapers/twitter/http/queryIds.js');
  const facts = () => {
    const status = queryIdStatus();
    return {
      cached: status.cached,
      count: status.count,
      age: status.fetchedAt ? formatCacheAge(status.fetchedAt) : 'unknown age',
      stale: status.stale,
    };
  };
  if (refresh) {
    try {
      const result = await refreshQueryIds();
      return { status: 'ok', detail: `Refreshed ${result.count} query IDs from x.com into ${result.cachePath}`, facts: facts() };
    } catch (error) {
      return { ...describeRefreshFailure(error, describeQueryIds(queryIdStatus())), facts: facts() };
    }
  }
  return { ...describeQueryIds(queryIdStatus()), facts: facts() };
}

/**
 * Turn a failed query-ID refresh into a check result. Pure, for tests.
 *
 * An `X_WEB_CLIENT` failure means x.com answered with its newer client, so
 * blaming the network or a proxy would send people the wrong way.
 *
 * @param {Error & {code?: string}} error
 * @param {CheckResult} previous - describeQueryIds() for what stays in use
 * @returns {CheckResult}
 */
export function describeRefreshFailure(error, previous) {
  if (error.code === 'X_WEB_CLIENT') {
    return {
      status: 'warn',
      detail: `x.com served its newer x-web client, which this version cannot read query IDs from. Still using: ${previous.detail}`,
      fix: 'Nothing on this machine needs fixing. The query IDs shipped with XActions stay in use; update XActions when a release adds x-web discovery.',
    };
  }
  return {
    status: 'fail',
    detail: `Refresh failed: ${error.message}. Still using: ${previous.detail}`,
    fix: 'Check your network and any proxy, then run `xactions doctor --refresh-ids` again.',
  };
}

/**
 * Turn account-pool stats into a check result. Pure, for tests.
 * @param {{storePath: string, total: number, locked: number, available: number, coolingDown: number, nextResetAt: number|null}|null} stats
 *   null when no pool database exists yet
 * @param {string} storePath
 * @param {number} [now=Date.now()]
 * @returns {CheckResult}
 */
export function describeAccounts(stats, storePath, now = Date.now()) {
  if (!stats) {
    return {
      status: 'warn',
      detail: `No account pool at ${storePath}; every call uses the single saved session`,
      fix: 'Optional. Add sessions with createAccountPool().add() to spread rate limits over several accounts.',
    };
  }
  if (stats.total === 0) {
    return { status: 'warn', detail: `Account pool at ${storePath} is empty`, fix: 'Add at least one account to the pool, or delete the file.' };
  }
  const parts = [`${stats.total} account${stats.total === 1 ? '' : 's'}`, `${stats.available} available`];
  if (stats.coolingDown > 0) {
    const wait = stats.nextResetAt ? `, next reset in ${Math.max(0, Math.ceil((stats.nextResetAt - now) / 60000))}m` : '';
    parts.push(`${stats.coolingDown} rate limited${wait}`);
  }
  if (stats.locked > 0) parts.push(`${stats.locked} locked`);
  const detail = parts.join(', ');
  if (stats.available === 0 && stats.coolingDown === 0) {
    return { status: 'fail', detail, fix: 'Every pooled account is locked (401/403). Refresh their cookies and unlock them, or remove them from the pool.' };
  }
  if (stats.locked > 0) {
    return { status: 'warn', detail, fix: 'A locked account answered 401/403. Refresh its cookies, then unlock it.' };
  }
  return { status: 'ok', detail };
}

/**
 * Is a multi-account pool configured, and how much of it can serve right now.
 * Only opens the database when one already exists, so doctor never creates one.
 * @returns {Promise<CheckResult>}
 */
async function checkAccounts() {
  try {
    const { resolveCacheDir } = await import('../../scrapers/twitter/http/queryIds.js');
    const storePath = path.join(resolveCacheDir(), 'accounts.db');
    try {
      await fs.access(storePath);
    } catch {
      return describeAccounts(null, storePath);
    }
    const { createAccountPool } = await import('../../scrapers/twitter/http/accountPool.js');
    const pool = createAccountPool({ storePath });
    try {
      return describeAccounts(pool.stats(), storePath);
    } finally {
      pool.close();
    }
  } catch (error) {
    return { status: 'fail', detail: `Could not read the account pool: ${error.message}`, fix: 'Delete or repair accounts.db under ~/.xactions (or XACTIONS_HOME).' };
  }
}

/**
 * @typedef {object} CheckSpec
 * @property {string} id - Stable: scripts, `--json` consumers and issue triage key on it
 * @property {'environment'|'guest'|'session'} group
 * @property {string} name - Label in the human output
 * @property {boolean} [network] - Reaches x.com, so `--offline` skips it
 * @property {(ctx: {refreshIds: boolean, offline: boolean}, done: Map<string, CheckResult>) => CheckResult|Promise<CheckResult>} run
 */

/**
 * Every check, in the order it runs and prints. Ids never change once
 * published; a new check gets a new id.
 * @type {CheckSpec[]}
 */
const CHECKS = [
  { id: 'node', group: 'environment', name: 'Node', run: () => checkNode() },
  { id: 'sqlite', group: 'environment', name: 'SQLite module', run: () => checkSqlite() },
  { id: 'home', group: 'environment', name: 'XACTIONS_HOME', run: () => checkHome(xactionsHome()) },
  { id: 'shadowed-install', group: 'environment', name: 'Install on PATH', run: () => checkShadowing(VERSION) },
  { id: 'browser', group: 'environment', name: 'Browser', run: () => checkBrowser() },
  { id: 'mcp', group: 'environment', name: 'MCP server', run: () => checkMcp() },
  { id: 'skills', group: 'environment', name: 'Skills', run: () => checkSkills() },
  {
    id: 'query-ids',
    group: 'environment',
    name: 'GraphQL query IDs',
    run: (ctx) => checkQueryIds({ refresh: ctx.refreshIds && !ctx.offline }),
  },
  { id: 'clock', group: 'environment', name: 'Clock', network: true, run: () => checkClock() },
  { id: 'guest-profile', group: 'guest', name: 'Profile read', network: true, run: () => checkGuestTier() },
  { id: 'guest-timeline', group: 'guest', name: 'Timeline read', network: true, run: () => checkTimeline() },
  { id: 'session-saved', group: 'session', name: 'Session saved', run: () => checkSessionStored() },
  {
    id: 'session-valid',
    group: 'session',
    name: 'Session valid',
    network: true,
    run: (_ctx, done) => checkSessionLive(/** @type {CheckResult} */ (done.get('session-saved'))),
  },
  { id: 'accounts', group: 'session', name: 'Accounts', run: () => checkAccounts() },
];

/** The ids `--json` reports, in order. */
export const CHECK_IDS = CHECKS.map((c) => c.id);

const GROUP_HEADINGS = {
  environment: ['Environment', ''],
  guest: ['Guest tier', '(works with no account)'],
  session: ['Session tier', '(search, followers, DMs)'],
};

/**
 * @typedef {CheckResult & {id: string, group: string, name: string, fix: string|null}} DoctorResult
 */

/**
 * Run every check in order. A check that throws is reported as failed, so
 * one broken check never hides the rest.
 * @param {{refreshIds?: boolean, offline?: boolean, onResult?: (result: DoctorResult) => void}} [options]
 * @returns {Promise<DoctorResult[]>}
 */
export async function collectChecks({ refreshIds = false, offline = false, onResult } = {}) {
  const ctx = { refreshIds, offline };
  /** @type {Map<string, CheckResult>} */
  const done = new Map();
  const results = [];
  for (const spec of CHECKS) {
    /** @type {CheckResult} */
    let result;
    if (spec.network && offline) {
      result = { status: 'warn', detail: 'Skipped: --offline' };
    } else {
      try {
        result = await spec.run(ctx, done);
      } catch (error) {
        result = { status: 'fail', detail: `The check itself failed: ${error.message}`, fix: 'Open an issue with `xactions doctor --issue`.' };
      }
    }
    done.set(spec.id, result);
    const full = { ...result, id: spec.id, group: spec.group, name: spec.name, fix: result.fix ?? null };
    results.push(full);
    onResult?.(full);
  }
  return results;
}

/**
 * Process exit code for a set of results: 1 when anything failed.
 * @param {Array<{status: string}>} results
 * @returns {number}
 */
export function exitCodeFor(results) {
  return results.some((r) => r.status === 'fail') ? 1 : 0;
}

/**
 * @param {Array<{status: 'ok'|'warn'|'fail'}>} results
 * @returns {{ok: number, warn: number, fail: number}}
 */
function summarise(results) {
  const counts = { ok: 0, warn: 0, fail: 0 };
  for (const r of results) counts[r.status] += 1;
  return counts;
}

/**
 * The `--json` document: the public fields only, never facts or secrets.
 * @param {DoctorResult[]} results
 * @returns {{version: string, checks: Array<{id: string, group: string, name: string, status: string, detail: string, fix: string|null}>, summary: {ok: number, warn: number, fail: number}}}
 */
export function toJson(results) {
  return {
    version: VERSION,
    checks: results.map(({ id, group, name, status, detail, fix }) => ({ id, group, name, status, detail, fix })),
    summary: summarise(results),
  };
}

/**
 * Print the result of one check.
 * @param {string} name
 * @param {CheckResult} result
 */
function printCheck(name, result) {
  const mark = { ok: chalk.green('✓'), warn: chalk.yellow('!'), fail: chalk.red('✗') }[result.status];
  console.log(`  ${mark} ${chalk.bold(name.padEnd(20))} ${chalk.gray(result.detail)}`);
  if (result.fix) console.log(`    ${chalk.cyan('→')} ${result.fix}`);
}

/**
 * Everything the report needs beyond the check results.
 * @param {DoctorResult[]} results
 * @returns {Promise<import('../doctor/report.js').ReportState>}
 */
async function reportState(results) {
  let username = '';
  try {
    username = os.userInfo().username;
  } catch {
    // No passwd entry (some containers): nothing to redact by that name.
  }
  const node = results.find((r) => r.id === 'node')?.facts || {};
  return {
    version: VERSION,
    install: gatherInstall(),
    node: { version: process.versions.node, engines: node.engines || 'unknown' },
    os: { platform: process.platform, release: os.release(), arch: process.arch },
    optionalDeps: optionalDepsInventory(),
    env: process.env,
    homedir: os.homedir(),
    username,
    hostname: os.hostname(),
    sessionValues: await readSessionSecrets(xactionsHome()),
    checks: results,
  };
}

/**
 * Where new issues go, from package.json.
 * @returns {string}
 */
function bugsUrl() {
  try {
    const url = readOwnPackage().bugs?.url;
    if (url) return url;
  } catch {
    // Fall through to the canonical repository.
  }
  return 'https://github.com/nirholas/xactions/issues';
}

/**
 * Run every check and print the result in the requested form.
 *
 * - default: the human report, printed as each check finishes
 * - `json`: one JSON document on stdout
 * - `report`: redacted Markdown on stdout, ready to paste
 * - `issue`: the report plus a prefilled new-issue link; `open` also opens it
 *
 * Every form exits 1 when a check failed.
 *
 * @param {{refreshIds?: boolean, offline?: boolean, json?: boolean, report?: boolean, issue?: boolean, open?: boolean}} [options]
 * @returns {Promise<void>}
 */
export async function doctorCommand(options = {}) {
  const collect = { refreshIds: Boolean(options.refreshIds), offline: Boolean(options.offline) };

  if (options.json) {
    const results = await collectChecks(collect);
    console.log(JSON.stringify(toJson(results), null, 2));
    process.exitCode = exitCodeFor(results);
    return;
  }

  if (options.report || options.issue) {
    const results = await collectChecks(collect);
    const state = await reportState(results);
    const report = renderReport(state);
    console.log(report);
    if (options.issue) {
      const url = issueUrl({ bugsUrl: bugsUrl(), title: reportTitle(state), report });
      console.log('');
      console.log(url);
      if (options.open) {
        console.error(openUrl(url) ? 'Opening the issue form in your browser.' : 'Could not start a browser; open the link above.');
      } else {
        console.error('Open the link above to start an issue with this report filled in (or pass --open).');
      }
    } else {
      console.error(`Paste everything above into the doctor report field of a new issue: ${bugsUrl().replace(/\/+$/, '')}/new/choose`);
    }
    process.exitCode = exitCodeFor(results);
    return;
  }

  console.log(chalk.cyan(`\n⚡ XActions doctor  ${chalk.gray(`v${VERSION}`)}\n`));
  let group = null;
  const results = await collectChecks({
    ...collect,
    onResult(result) {
      if (result.group !== group) {
        if (group) console.log('');
        const [title, note] = GROUP_HEADINGS[result.group];
        console.log(chalk.bold(`  ${title}`), note ? chalk.gray(note) : '');
        group = result.group;
      }
      printCheck(result.name, result);
    },
  });

  const { fail: failed, warn: warned } = summarise(results);
  console.log('');
  if (failed === 0 && warned === 0) {
    console.log(chalk.green('  Everything checks out.\n'));
  } else if (failed === 0) {
    console.log(chalk.yellow(`  ${warned} thing${warned === 1 ? '' : 's'} to look at, nothing broken.\n`));
  } else {
    console.log(chalk.red(`  ${failed} failure${failed === 1 ? '' : 's'}, ${warned} warning${warned === 1 ? '' : 's'}.`));
    console.log(chalk.gray('  Each one above has the fix next to it. To report a bug: xactions doctor --issue\n'));
  }
  process.exitCode = exitCodeFor(results);
}

/**
 * Register the command.
 * @param {import('commander').Command} program
 */
export function registerDoctorCommand(program) {
  program
    .command('doctor')
    .description('Check the install, the guest tier, the saved session, the query-ID cache and the MCP server')
    .option('--refresh-ids', 'Discover the current GraphQL query IDs from x.com before checking them')
    .option('--offline', 'Skip the checks that reach x.com (clock, guest tier, session)')
    .addOption(new Option('--json', 'Print every check as JSON: id, status, detail, fix (not redacted; share --report instead)').conflicts(['report', 'issue']))
    .option('--report', 'Print a redacted Markdown report to paste into a bug report')
    .option('--issue', 'Print the report and a prefilled new-issue link')
    .addOption(new Option('--open', 'With --issue, also open the link in your browser').implies({ issue: true }))
    .action((options) => doctorCommand(options));
}
