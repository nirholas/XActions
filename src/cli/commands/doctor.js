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
 * Each check reports one of three states, and the process exit code follows:
 * 0 when nothing failed, 1 when something did.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license Apache-2.0
 */

import chalk from 'chalk';
import fs from 'node:fs/promises';
import path from 'node:path';
import { xactionsHome } from '../../utils/savedSession.js';
import { BROWSER_INSTALL, isMissingPackage } from '../../utils/optionalDeps.js';

import { VERSION } from '../../version.js';
import { countInstalledSkills } from './skills.js';

// Resolved per call, not at import: the MCP server imports this module and a
// test or host may point XACTIONS_HOME somewhere else after that.
const cookieFile = () => path.join(xactionsHome(), 'cookies.json');
const configFile = () => path.join(xactionsHome(), 'config.json');

/** Minimum Node the client's syntax and APIs require. */
const MIN_NODE_MAJOR = 20;

/** A stable, public, high-traffic account to probe the guest tier with. */
const PROBE_ACCOUNT = 'nasa';

/**
 * @typedef {object} CheckResult
 * @property {'ok'|'warn'|'fail'} status
 * @property {string} detail
 * @property {string} [fix]
 */

/**
 * Is the runtime new enough.
 * @returns {CheckResult}
 */
function checkNode() {
  const major = Number(process.versions.node.split('.')[0]);
  if (major >= MIN_NODE_MAJOR) {
    return { status: 'ok', detail: `Node ${process.versions.node}` };
  }
  return {
    status: 'fail',
    detail: `Node ${process.versions.node}, which is below the minimum of ${MIN_NODE_MAJOR}`,
    fix: `Install Node ${MIN_NODE_MAJOR} or newer: https://nodejs.org`,
  };
}

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
 * Is a session saved, and does it carry both cookies.
 * @returns {Promise<CheckResult & {cookies?: Record<string, string>}>}
 */
async function checkSessionStored() {
  const COOKIE_FILE = cookieFile();
  const CONFIG_FILE = configFile();
  try {
    const jar = JSON.parse(await fs.readFile(COOKIE_FILE, 'utf-8'));
    const cookies = Object.fromEntries(jar.map((c) => [c.name, c.value]));
    if (!cookies.auth_token) {
      return { status: 'fail', detail: 'Cookie jar exists but has no auth_token', fix: 'Run `xactions connect`.' };
    }
    if (!cookies.ct0) {
      return {
        status: 'fail',
        detail: 'Session has auth_token but no ct0',
        fix: 'X treats a session without ct0 as logged out, so search, followers and DMs all fail with a bare 404. Run `xactions connect` to capture both.',
        cookies,
      };
    }
    return { status: 'ok', detail: `Both cookies present in ${COOKIE_FILE}`, cookies };
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
        };
      }
      return { status: 'ok', detail: `Both cookies present in ${CONFIG_FILE}` };
    } catch {
      return {
        status: 'warn',
        detail: 'No session saved, so only the guest tier is available',
        fix: 'Run `xactions connect` to unlock search, followers, following, likes, bookmarks and DMs.',
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
  const COOKIE_FILE = cookieFile();
  const CONFIG_FILE = configFile();
  try {
    const { Scraper } = await import('../../client/index.js');
    const scraper = new Scraper();
    await scraper.loadCookies(COOKIE_FILE).catch(async () => {
      const config = JSON.parse(await fs.readFile(CONFIG_FILE, 'utf-8'));
      await scraper.setCookies(`auth_token=${config.authToken}; ct0=${config.csrfToken}`);
    });
    const me = await scraper.me();
    if (!me?.username) throw new Error('X returned no account for this session');
    return { status: 'ok', detail: `Signed in as @${me.username}` };
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
    return { status: 'ok', detail: `MCP server exposes ${tools.length} tools` };
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
      };
    }
    return { status: 'ok', detail: `${counts.total} skill install${counts.total === 1 ? '' : 's'} found (${perTarget})` };
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
  if (refresh) {
    try {
      const result = await refreshQueryIds();
      return { status: 'ok', detail: `Refreshed ${result.count} query IDs from x.com into ${result.cachePath}` };
    } catch (error) {
      return describeRefreshFailure(error, describeQueryIds(queryIdStatus()));
    }
  }
  return describeQueryIds(queryIdStatus());
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
 * @typedef {object} DoctorReport
 * @property {string} version
 * @property {string} generatedAt - ISO time the checks finished
 * @property {boolean} offline - true when the checks that call x.com were skipped
 * @property {Array<{name: string, note?: string, checks: Array<{name: string} & CheckResult>}>} sections
 * @property {{ok: number, warn: number, fail: number}} summary
 */

/**
 * Run every check and return the results as data, for `--json` and for the
 * MCP server's status resource. Cookie values never leave this function.
 *
 * `offline` skips the checks that call x.com (the guest reads and whether the
 * saved session still signs in), so the report is instant and side-effect free.
 *
 * @param {{refreshIds?: boolean, offline?: boolean, onCheck?: (section: string, name: string, result: CheckResult) => void, onSection?: (name: string, note?: string) => void}} [options]
 * @returns {Promise<DoctorReport>}
 */
export async function runDoctorChecks(options = {}) {
  const offline = Boolean(options.offline);
  /** @type {DoctorReport['sections']} */
  const sections = [];
  let section = null;

  /** @param {string} name @param {string} [note] */
  const begin = (name, note) => {
    section = { name, ...(note ? { note } : {}), checks: [] };
    sections.push(section);
    options.onSection?.(name, note);
  };
  /**
   * @param {string} name
   * @param {CheckResult|Promise<CheckResult>} check
   * @returns {Promise<CheckResult>}
   */
  const run = async (name, check) => {
    const result = await check;
    // checkSessionStored hands its cookies to checkSessionLive; they are not output.
    const { status, detail, fix } = result;
    const clean = { status, detail, ...(fix ? { fix } : {}) };
    section.checks.push({ name, ...clean });
    options.onCheck?.(section.name, name, clean);
    return result;
  };

  begin('Environment');
  await run('Node', checkNode());
  await run('Browser', checkBrowser());
  await run('MCP server', checkMcp());
  await run('Skills', checkSkills());
  await run('GraphQL query IDs', checkQueryIds({ refresh: !offline && Boolean(options.refreshIds) }));

  if (!offline) {
    begin('Guest tier', '(works with no account)');
    await run('Profile read', checkGuestTier());
    await run('Timeline read', checkTimeline());
  }

  begin('Session tier', '(search, followers, DMs)');
  const stored = await run('Session saved', checkSessionStored());
  if (!offline) await run('Session valid', checkSessionLive(stored));
  await run('Accounts', checkAccounts());

  const all = sections.flatMap((s) => s.checks);
  return {
    version: VERSION,
    generatedAt: new Date().toISOString(),
    offline,
    sections,
    summary: {
      ok: all.filter((c) => c.status === 'ok').length,
      warn: all.filter((c) => c.status === 'warn').length,
      fail: all.filter((c) => c.status === 'fail').length,
    },
  };
}

/**
 * Run every check and summarise.
 * @param {{refreshIds?: boolean, offline?: boolean, json?: boolean}} [options]
 * @returns {Promise<void>}
 */
export async function doctorCommand(options = {}) {
  if (options.json) {
    const report = await runDoctorChecks(options);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (report.summary.fail > 0) process.exitCode = 1;
    return;
  }

  console.log(chalk.cyan(`\n⚡ XActions doctor  ${chalk.gray(`v${VERSION}`)}\n`));

  let first = true;
  const report = await runDoctorChecks({
    ...options,
    onSection: (name, note) => {
      if (!first) console.log('');
      first = false;
      console.log(note ? `${chalk.bold(`  ${name}`)} ${chalk.gray(note)}` : chalk.bold(`  ${name}`));
    },
    onCheck: (_section, name, result) => printCheck(name, result),
  });

  const { fail: failed, warn: warned } = report.summary;

  console.log('');
  if (failed === 0 && warned === 0) {
    console.log(chalk.green('  Everything checks out.\n'));
  } else if (failed === 0) {
    console.log(chalk.yellow(`  ${warned} thing${warned === 1 ? '' : 's'} to look at, nothing broken.\n`));
  } else {
    console.log(chalk.red(`  ${failed} failure${failed === 1 ? '' : 's'}, ${warned} warning${warned === 1 ? '' : 's'}.`));
    console.log(chalk.gray('  Each one above has the fix next to it.\n'));
    process.exitCode = 1;
  }
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
    .option('--offline', 'Skip the checks that call x.com (guest reads, session sign-in, --refresh-ids)')
    .option('--json', 'Print the report as JSON (cookie values are never included)')
    .action((options) => doctorCommand(options));
}
