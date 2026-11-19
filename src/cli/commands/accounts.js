// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * `xactions accounts` - manage the per-platform account vault.
 *
 * The vault (`accounts.db`, table `vault_accounts`, inside
 * `resolveCacheDir()` — `$XACTIONS_HOME` or `~/.xactions`) stores
 * credentials for twitter, bluesky and mastodon accounts so agents can
 * keep several logins per platform. `list`/`add`/`remove`/`use`/`test` are
 * thin wrappers over `createAccountVault()` in `src/vault/accountVault.js`;
 * the MCP tools `x_accounts_*` call the same module.
 *
 * Secret hygiene: credential material enters only through flags or a file
 * the user points at (`--cookies-file`, or the credential flags for
 * bluesky/mastodon). Nothing here echoes a stored credential back — `list`
 * shows platform, name, proxy host and timestamps only.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import chalk from 'chalk';
import fs from 'node:fs';

import {
  createAccountVault,
  SUPPORTED_PLATFORMS,
} from '../../vault/accountVault.js';

/**
 * Print a JSON document to stdout.
 * @param {unknown} data
 */
function printJson(data) {
  console.log(JSON.stringify(data, null, 2));
}

/**
 * Run an action and turn a thrown error into a red line plus exit code 1,
 * or a JSON error object when `--json` was asked for.
 * @param {Function} fn
 * @returns {Function}
 */
function guarded(fn) {
  return async (...args) => {
    const options = args.find((a) => a && typeof a === 'object' && !Array.isArray(a) && 'json' in a) || {};
    try {
      await fn(...args);
    } catch (error) {
      if (options.json) printJson({ error: error.message });
      else console.error(chalk.red(`\n  ${error.message}\n`));
      process.exitCode = 1;
    }
  };
}

/**
 * Open the vault for one command, run `fn(vault)`, always close.
 * @param {Function} fn
 */
async function withVault(fn) {
  const vault = createAccountVault();
  try {
    return await fn(vault);
  } finally {
    vault.close();
  }
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

async function listCommand(options = {}) {
  const accounts = await withVault((vault) => vault.list({ platform: options.platform }));

  if (options.json) {
    printJson(accounts);
    return;
  }

  if (accounts.length === 0) {
    console.log(chalk.gray('\n  No accounts in the vault.'));
    console.log(chalk.gray(`  Add one with: xactions accounts add <name> --platform ${SUPPORTED_PLATFORMS.join('|')} ...\n`));
    return;
  }

  console.log('');
  console.log(
    `  ${chalk.bold('PLATFORM'.padEnd(10))}${chalk.bold('NAME'.padEnd(20))}${chalk.bold('PROXY'.padEnd(24))}${chalk.bold('LAST USED')}`
  );
  for (const account of accounts) {
    console.log(
      `  ${chalk.cyan(account.platform.padEnd(10))}${account.name.padEnd(20)}` +
        `${(account.proxy ?? chalk.gray('direct')).padEnd(24)}` +
        `${account.lastUsedAt ? account.lastUsedAt.slice(0, 10) : chalk.gray('never')}`
    );
  }
  console.log('');
}

async function addCommand(name, options = {}) {
  const accountName = name || options.name;
  if (!accountName) throw new Error('Account name required: `accounts add <name>` or `--name <name>`.');
  if (!options.platform) {
    throw new Error(`--platform is required. Supported: ${SUPPORTED_PLATFORMS.join(', ')} (aliases: x, bsky, masto).`);
  }

  // File inputs are preferred over inline secret flags so credentials stay
  // out of shell history and process listings. Precedence: --credentials-file
  // (JSON, any platform) > --cookies-file (twitter session file) > inline flags.
  let credentials = {};
  if (options.credentialsFile) {
    let parsed;
    try {
      parsed = JSON.parse(fs.readFileSync(options.credentialsFile, 'utf8'));
    } catch (error) {
      throw new Error(`Cannot read credentials file "${options.credentialsFile}": ${error.message}`);
    }
    if (Array.isArray(parsed)) credentials = { cookies: parsed };
    else if (parsed && typeof parsed === 'object') credentials = { ...parsed };
    else throw new Error('Credentials file must contain a JSON object (or cookie array for twitter).');
  }
  if (options.cookiesFile) {
    credentials.cookies = fs.readFileSync(options.cookiesFile, 'utf8');
  } else if (options.cookies) {
    credentials.cookies = options.cookies;
  }
  if (options.identifier) credentials.identifier = options.identifier;
  if (options.password) credentials.password = options.password;
  if (options.service) credentials.service = options.service;
  if (options.instance) credentials.instance = options.instance;
  if (options.accessToken) credentials.accessToken = options.accessToken;

  const result = await withVault((vault) =>
    vault.add({
      platform: options.platform,
      name: accountName,
      credentials,
      proxy: options.proxy,
    })
  );

  if (options.json) {
    printJson(result);
    return;
  }

  console.log(
    chalk.green(`\n  ${result.replaced ? 'Updated' : 'Added'} ${result.platform} account "${result.name}"`) +
      (result.proxy ? chalk.gray(` via ${result.proxy}`) : '') +
      '\n'
  );
}

async function removeCommand(name, options = {}) {
  const result = await withVault((vault) => vault.remove({ platform: options.platform, name }));
  if (options.json) {
    printJson(result);
    return;
  }
  console.log(chalk.green(`\n  Removed ${result.platform} account "${result.name}"\n`));
}

async function useCommand(name, options = {}) {
  const result = await withVault((vault) => vault.use({ platform: options.platform, name }));
  if (options.json) {
    printJson(result);
    return;
  }
  console.log(
    chalk.green(`\n  X session now uses twitter account "${result.activated}" (${result.cookies} cookies)`) +
      (result.backup ? chalk.gray(' — previous cookies.json saved as cookies.json.bak') : '') +
      '\n'
  );
}

async function testCommand(name, options = {}) {
  const result = await withVault((vault) => vault.test({ platform: options.platform, name }));
  if (options.json) {
    printJson(result);
  } else {
    const paint = result.ok ? chalk.green : chalk.red;
    console.log(`\n  ${paint(result.ok ? 'ok' : 'failed')} ${result.platform}/${result.name}: ${result.reason}\n`);
  }
  if (!result.ok) process.exitCode = 1;
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/** Credential flags shared by `add`; each platform uses its own subset. */
const CREDENTIAL_OPTIONS = [
  ['--credentials-file <path>', 'PREFERRED for all platforms: JSON file with credential fields (twitter: {"cookies": [...]} or cookie array; bluesky: {"identifier","password","service"?}; mastodon: {"instance","accessToken"})'],
  ['--cookies <string>', 'Twitter: session cookies as a header string (fallback — prefer --credentials-file/--cookies-file)'],
  ['--cookies-file <path>', 'Twitter: file with the session cookies (cookies.txt, Cookie-Editor JSON, Playwright storageState, or "auth_token=...; ct0=...")'],
  ['--identifier <id>', 'Bluesky: account identifier (handle or did) — fallback, prefer --credentials-file'],
  ['--password <password>', 'Bluesky: app password — fallback, prefer --credentials-file'],
  ['--service <url>', 'Bluesky: PDS/AppView URL (default public.api.bsky.app); must be https'],
  ['--instance <url>', 'Mastodon: instance URL (e.g. mastodon.social); must be https'],
  ['--access-token <token>', 'Mastodon: access token — fallback, prefer --credentials-file'],
  ['--proxy <url>', 'Proxy URL for requests with this account'],
];

/**
 * Register `xactions accounts` and its sub-commands.
 * @param {import('commander').Command} program
 */
export function registerAccountsCommand(program) {
  const accounts = program
    .command('accounts')
    .description(`Manage stored credentials for ${SUPPORTED_PLATFORMS.join(', ')} accounts`);

  accounts
    .command('list')
    .description('List vault accounts (secrets are never shown)')
    .option('--platform <platform>', 'Filter by platform')
    .option('--json', 'Print the accounts as JSON')
    .action(guarded(listCommand));

  // Bare `xactions accounts` behaves like `list`.
  accounts.action(guarded(listCommand));

  const add = accounts
    .command('add [name]')
    .description('Store credentials for a platform account (re-adding updates it)')
    .option('--platform <platform>', 'twitter|x, bluesky|bsky, mastodon|masto', null)
    .option('--name <name>', 'Account name (alternative to the positional argument)')
    .option('--json', 'Print the result as JSON');
  for (const [flags, description] of CREDENTIAL_OPTIONS) add.option(flags, description);
  add.action(guarded(addCommand));

  accounts
    .command('remove <name>')
    .description('Delete a vault account')
    .option('--platform <platform>', 'Required only when the name exists on several platforms')
    .option('--json', 'Print the result as JSON')
    .action(guarded(removeCommand));

  accounts
    .command('use <name>')
    .description('Activate a twitter account as the live X session (backs up cookies.json)')
    .option('--platform <platform>', 'Required only when the name exists on several platforms')
    .option('--json', 'Print the result as JSON')
    .action(guarded(useCommand));

  accounts
    .command('test <name>')
    .description('Check stored credentials against the platform (never prints them)')
    .option('--platform <platform>', 'Required only when the name exists on several platforms')
    .option('--json', 'Print the result as JSON')
    .action(guarded(testCommand));
}
