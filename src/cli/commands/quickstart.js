// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * `xactions quickstart` — the first thing a new user should run.
 *
 * With fifty-plus commands, the honest answer to "what do I do now?" is not a
 * command list. It is: here are three commands that work without an account,
 * here is what logging in buys you, and here is how to reach the rest. This
 * prints that, and adapts to whether a session is already saved so the advice
 * is never stale.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 */

import fs from 'fs/promises';
import path from 'path';
import { xactionsHome } from '../../utils/savedSession.js';
import chalk from 'chalk';

const CONFIG_DIR = xactionsHome();

/**
 * Detect what the user has set up, so the guidance matches their machine.
 *
 * @returns {Promise<{hasSession: boolean, hasConfig: boolean}>}
 */
async function detectSetup() {
  const [cookies, config] = await Promise.all([
    fs
      .access(path.join(CONFIG_DIR, 'cookies.json'))
      .then(() => true)
      .catch(() => false),
    fs
      .access(path.join(CONFIG_DIR, 'config.json'))
      .then(() => true)
      .catch(() => false),
  ]);
  return { hasSession: cookies, hasConfig: config };
}

function step(number, title, lines) {
  return [
    `  ${chalk.bold.cyan(`${number}.`)} ${chalk.bold(title)}`,
    ...lines.map((line) => `     ${line}`),
    '',
  ].join('\n');
}

/**
 * Register the quickstart command.
 *
 * @param {import('commander').Command} program
 * @param {{version: string}} deps
 */
export function registerQuickstartCommand(program, deps = {}) {
  program
    .command('quickstart')
    .description('Guided first run: what works now, and what logging in unlocks')
    .option('--json', 'Emit the setup state as JSON instead of the guide')
    .action(async (options) => {
      const setup = await detectSetup();

      if (options.json) {
        console.log(
          JSON.stringify(
            {
              version: deps.version ?? null,
              configDir: CONFIG_DIR,
              hasSession: setup.hasSession,
              hasConfig: setup.hasConfig,
              tier: setup.hasSession ? 'session' : 'guest',
            },
            null,
            2
          )
        );
        return;
      }

      const out = [];
      out.push('');
      out.push(
        `${chalk.bold.cyan('⚡ xactions quickstart')}  ${chalk.dim('three commands to a real result')}`
      );
      out.push('');
      out.push(
        `  ${chalk.dim('XActions reads X/Twitter with no API key. Most reads need no account at all.')}`
      );
      out.push('');

      out.push(
        step(1, 'Check the install', [
          chalk.cyan('xactions doctor'),
          chalk.dim('Verifies Node, the browser, the MCP server, and whether reads work'),
          chalk.dim('right now. Every failure it reports comes with the fix.'),
        ])
      );

      out.push(
        step(2, 'Read a public account (no login)', [
          chalk.cyan('xactions profile NASA'),
          chalk.cyan('xactions tweets NASA --limit 20'),
          chalk.cyan('xactions analyze NASA'),
          chalk.dim('analyze gives engagement rate, posting cadence, content mix, and the'),
          chalk.dim('hour of day that actually performs for that account.'),
        ])
      );

      if (setup.hasSession) {
        out.push(
          step(3, 'You are logged in, so these work too', [
            chalk.cyan('xactions search "your topic" --limit 50'),
            chalk.cyan('xactions followers yourhandle --limit 200'),
            chalk.cyan('xactions non-followers yourhandle'),
            chalk.dim(`Session found in ${CONFIG_DIR}. If reads start failing, re-run`),
            `${chalk.dim('     ')}${chalk.cyan('xactions connect')}${chalk.dim(' to refresh it.')}`,
          ])
        );
      } else {
        out.push(
          step(3, 'Log in once to unlock the rest', [
            chalk.cyan('xactions connect'),
            chalk.dim('Opens a real browser, you log in normally, and the session is saved.'),
            chalk.dim('No DevTools, no copying cookies by hand. This unlocks search,'),
            chalk.dim('followers, following, likes, bookmarks, and DMs.'),
          ])
        );
      }

      // Pad on the raw string, before colouring: chalk adds invisible escape
      // bytes, so padding a coloured string aligns to the wrong width.
      const directions = [
        ['xactions export NASA', 'everything about an account, to disk'],
        ['xactions monitor "your brand"', 'watch mentions and sentiment over time'],
        ['xactions ai analyze yourhandle', 'learn your voice, then draft in it'],
        ['xactions workflow create', 'chain actions into a repeatable job'],
        ['xactions mcp-config', 'wire 145 tools into Claude, Cursor, or Windsurf'],
      ];
      const directionWidth = directions.reduce((max, [cmd]) => Math.max(max, cmd.length), 0);

      out.push(`  ${chalk.bold('Then pick a direction')}`);
      out.push('');
      for (const [command, description] of directions) {
        out.push(`    ${chalk.cyan(command.padEnd(directionWidth))}  ${chalk.dim(description)}`);
      }
      out.push('');

      out.push(`  ${chalk.bold('Two things worth knowing')}`);
      out.push('');
      out.push(
        `    ${chalk.dim('Every read command takes')} ${chalk.cyan('--json')}${chalk.dim(', and pipes cleanly:')}`
      );
      out.push(
        `      ${chalk.gray('xactions tweets NASA --limit 100 --json | jq -r \'.[].text\'')}`
      );
      out.push('');
      out.push(
        `    ${chalk.dim('Run')} ${chalk.cyan('xactions')} ${chalk.dim('with no arguments for the full command list, grouped by task.')}`
      );
      out.push('');
      out.push(`  ${chalk.dim('Docs: https://xactions.app   Issues: github.com/nirholas/xactions')}`);
      out.push('');

      console.log(out.join('\n'));
    });
}
