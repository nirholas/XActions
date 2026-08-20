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
import os from 'node:os';

import { VERSION } from '../../version.js';

const CONFIG_DIR = path.join(os.homedir(), '.xactions');
const COOKIE_FILE = path.join(CONFIG_DIR, 'cookies.json');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

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
  try {
    const { Scraper } = await import('../../client/index.js');
    const scraper = new Scraper();
    await scraper.loadCookies(COOKIE_FILE).catch(async () => {
      const config = JSON.parse(await fs.readFile(CONFIG_FILE, 'utf-8'));
      await scraper.setCookies(`auth_token=${config.authToken}; ct0=${config.csrfToken}`);
    });
    try {
      const me = await scraper.me();
      if (me?.username) {
        return { status: 'ok', detail: `Signed in as @${me.username}` };
      }
    } catch {
      // me() needs a twid cookie, which the config-file session doesn't store.
      // Fall back to an authenticated read (Followers) to prove the session works.
    }
    const probe = scraper.getFollowers('nasa', 1);
    const first = await probe.next();
    if (first.value?.username) {
      return { status: 'ok', detail: 'Session valid (authenticated read OK)' };
    }
    throw new Error('authenticated read attempt returned no data');
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
  try {
    const puppeteer = (await import('puppeteer')).default;
    const executable = puppeteer.executablePath();
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
 * Run every check and summarise.
 * @returns {Promise<void>}
 */
export async function doctorCommand() {
  console.log(chalk.cyan(`\n⚡ XActions doctor  ${chalk.gray(`v${VERSION}`)}\n`));

  const results = [];

  /**
   * @param {string} name
   * @param {CheckResult|Promise<CheckResult>} check
   * @returns {Promise<CheckResult>}
   */
  const run = async (name, check) => {
    const result = await check;
    printCheck(name, result);
    results.push(result);
    return result;
  };

  console.log(chalk.bold('  Environment'));
  await run('Node', checkNode());
  await run('Browser', await checkBrowser());
  await run('MCP server', await checkMcp());

  console.log('');
  console.log(chalk.bold('  Guest tier'), chalk.gray('(works with no account)'));
  await run('Profile read', await checkGuestTier());
  await run('Timeline read', await checkTimeline());

  console.log('');
  console.log(chalk.bold('  Session tier'), chalk.gray('(search, followers, DMs)'));
  const stored = await checkSessionStored();
  printCheck('Session saved', stored);
  results.push(stored);
  await run('Session valid', await checkSessionLive(stored));

  const failed = results.filter((r) => r.status === 'fail').length;
  const warned = results.filter((r) => r.status === 'warn').length;

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
    .description('Check the install, the guest tier, the saved session and the MCP server')
    .action(doctorCommand);
}
