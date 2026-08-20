// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * `xactions connect` - session capture without DevTools.
 *
 * The old path was eight manual steps: open x.com, open DevTools, find the
 * Application tab, expand Cookies, pick the x.com origin, locate `auth_token`,
 * locate `ct0`, and paste both into a prompt without transposing a character.
 * People got it wrong constantly, usually by taking `auth_token` and skipping
 * `ct0`, which leaves X treating the session as logged out and every
 * session-tier command failing with a bare 404.
 *
 * This replaces all of it with one command. A real Chrome window opens on
 * x.com's login page, the person logs in the way they always do, and the
 * cookies are read out of the browser's own jar the moment both are present.
 *
 * Nothing is transmitted. The cookies are written to ~/.xactions/cookies.json
 * with owner-only permissions and never leave the machine.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license Apache-2.0
 */

import chalk from 'chalk';
import ora from 'ora';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const CONFIG_DIR = path.join(os.homedir(), '.xactions');
const COOKIE_FILE = path.join(CONFIG_DIR, 'cookies.json');

/** The two cookies X needs before it will treat a request as logged in. */
const REQUIRED_COOKIES = ['auth_token', 'ct0'];

/** How long to wait for a login before giving up. */
const DEFAULT_TIMEOUT_MS = 5 * 60_000;

/** How often to check the cookie jar. */
const POLL_INTERVAL_MS = 1000;

/**
 * Read the cookies X has set for the x.com origin.
 * @param {import('puppeteer').Page} page
 * @returns {Promise<Record<string, string>>}
 */
async function readXCookies(page) {
  const jar = await page.cookies('https://x.com', 'https://twitter.com');
  const found = {};
  for (const cookie of jar) {
    if (REQUIRED_COOKIES.includes(cookie.name) && cookie.value) found[cookie.name] = cookie.value;
  }
  return found;
}

/**
 * Poll the browser until both cookies exist, the user closes the window, or
 * the deadline passes.
 *
 * @param {import('puppeteer').Browser} browser
 * @param {import('puppeteer').Page} page
 * @param {number} timeoutMs
 * @param {(seconds: number) => void} onTick
 * @returns {Promise<Record<string, string>>}
 * @throws {Error} On timeout or if the window is closed first
 */
async function waitForSession(browser, page, timeoutMs, onTick) {
  const deadline = Date.now() + timeoutMs;
  let closed = false;
  browser.on('disconnected', () => {
    closed = true;
  });

  while (Date.now() < deadline) {
    if (closed) throw new Error('Browser window was closed before the login finished.');

    let cookies;
    try {
      cookies = await readXCookies(page);
    } catch {
      // The page navigates during login, and a read can land mid-navigation.
      // That is expected, so retry on the next tick rather than failing.
      cookies = {};
    }

    if (REQUIRED_COOKIES.every((name) => cookies[name])) return cookies;

    onTick(Math.round((deadline - Date.now()) / 1000));
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error(`No session appeared within ${Math.round(timeoutMs / 60000)} minutes.`);
}

/**
 * Prove the captured session actually works by calling an endpoint that only
 * answers a logged-in request.
 *
 * Saving unverified cookies is how people end up debugging a bad session an
 * hour later, so the command refuses to claim success it has not checked.
 *
 * @param {Record<string, string>} cookies
 * @returns {Promise<{username: string, followers: number}>}
 */
async function verifySession(cookies) {
  const { Scraper } = await import('../../client/index.js');
  const scraper = new Scraper();
  await scraper.setCookies(`auth_token=${cookies.auth_token}; ct0=${cookies.ct0}`);
  try {
    const me = await scraper.me();
    if (me?.username) {
      return { username: me.username, followers: me.followersCount || 0 };
    }
  } catch {
    // me() needs a twid cookie, which the config-file session doesn't store.
    // Fall back to an authenticated read (Followers) to prove the session works.
  }
  const probe = scraper.getFollowers('nasa', 1);
  const first = await probe.next();
  if (first.value?.username) {
    return { username: null, followers: null };
  }
  throw new Error('X accepted the connection but an authenticated read attempt returned no data.');
}

/**
 * Write the cookie jar in the shape `Scraper.loadCookies` expects, readable
 * only by the owner.
 * @param {Record<string, string>} cookies
 * @returns {Promise<string>} The path written
 */
async function saveCookieJar(cookies) {
  await fs.mkdir(CONFIG_DIR, { recursive: true, mode: 0o700 });
  const jar = REQUIRED_COOKIES.map((name) => ({ name, value: cookies[name] }));
  await fs.writeFile(COOKIE_FILE, JSON.stringify(jar, null, 2), { encoding: 'utf-8', mode: 0o600 });
  return COOKIE_FILE;
}

/**
 * Run the connect flow.
 *
 * @param {object} [options]
 * @param {number} [options.timeout] - Minutes to wait for the login
 * @param {boolean} [options.keepOpen] - Leave the browser open afterwards
 * @returns {Promise<void>}
 */
export async function connectCommand(options = {}) {
  const timeoutMs = options.timeout ? Number(options.timeout) * 60_000 : DEFAULT_TIMEOUT_MS;

  console.log(chalk.cyan('\n⚡ Connect your X session\n'));
  console.log(chalk.gray('  A Chrome window is opening on the X login page.'));
  console.log(chalk.gray('  Log in exactly as you normally would, including any 2FA step.'));
  console.log(chalk.gray('  This command reads the session out of the browser when you are done.\n'));
  console.log(chalk.gray('  Nothing is sent anywhere. The session is written to'));
  console.log(chalk.gray(`  ${COOKIE_FILE} and stays on this machine.\n`));

  const { createBrowser, createPage } = await import('../../scrapers/twitter/index.js');

  let browser;
  const spinner = ora('Opening browser...').start();

  try {
    browser = await createBrowser({ headless: false });
    const page = await createPage(browser);
    await page.goto('https://x.com/login', { waitUntil: 'domcontentloaded' });

    spinner.text = 'Waiting for you to log in...';

    const cookies = await waitForSession(browser, page, timeoutMs, (secondsLeft) => {
      spinner.text = `Waiting for you to log in... ${Math.floor(secondsLeft / 60)}m ${secondsLeft % 60}s left`;
    });

    spinner.text = 'Verifying the session with X...';
    const identity = await verifySession(cookies);

    const savedTo = await saveCookieJar(cookies);
    spinner.succeed(
      identity.username
        ? chalk.green(`Connected as @${identity.username}`)
        : chalk.green('Connected — session verified'),
    );

    console.log(chalk.gray(`\n  Saved to ${savedTo} (owner-only)`));
    console.log(
      identity.followers != null
        ? chalk.gray(`  Verified against X: ${identity.followers.toLocaleString('en-US')} followers\n`)
        : chalk.gray('  Verified against X: authenticated read OK\n'),
    );
    console.log('  Session-tier commands are now unlocked:\n');
    console.log(chalk.cyan(`    xactions search "your brand" --limit 50`));
    console.log(chalk.cyan(`    xactions followers ${identity.username ?? 'yourhandle'} --limit 200`));
    console.log(chalk.cyan(`    xactions non-followers ${identity.username ?? 'yourhandle'}`));
    console.log(chalk.gray('\n  Revoke at any time with `xactions logout`.\n'));
  } catch (error) {
    spinner.fail(chalk.red(error.message));
    console.log(chalk.gray('\n  If the browser could not start, this machine may have no display.'));
    console.log(chalk.gray('  On a headless server, run `xactions connect` on your laptop and copy'));
    console.log(chalk.gray(`  ${COOKIE_FILE} across, or fall back to \`xactions login\`.\n`));
    process.exitCode = 1;
  } finally {
    if (browser && !options.keepOpen) {
      await browser.close().catch(() => {
        // The user may already have closed the window. Nothing to clean up.
      });
    }
  }
}

/**
 * Register the command.
 * @param {import('commander').Command} program
 */
export function registerConnectCommand(program) {
  program
    .command('connect')
    .description('Log in through a real browser and capture the session. No DevTools needed.')
    .option('-t, --timeout <minutes>', 'How long to wait for the login', '5')
    .option('--keep-open', 'Leave the browser window open after connecting')
    .action(connectCommand);
}
