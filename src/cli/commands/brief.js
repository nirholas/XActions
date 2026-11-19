// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * `xactions brief` - research a list of accounts before you post about them.
 *
 * Give it the accounts you are going to tag, and optionally a topic, and it
 * reads each one's profile and recent timeline and writes one brief: what each
 * account is posting, the numbers they are publishing about themselves, their
 * own account statistics, who they tag, and which other accounts several of
 * them keep mentioning. Markdown by default, so it reads in a terminal and
 * pastes straight into a doc or an LLM prompt; JSON for scripts.
 *
 * Timelines are cached for a few hours, so re-running the same list while you
 * write, or adding one account to it, only fetches what is new.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license Apache-2.0
 */

import fs from 'fs/promises';
import path from 'path';

import chalk from 'chalk';

import { createSpinner, printCompact, resolveOutputMode } from '../../utils/output.js';

import { parseAccountList, renderBriefMarkdown } from '../../analysis/accountBrief.js';
import { clampInt, DEFAULT_CACHE_HOURS, DEFAULT_LIMIT, MAX_LIMIT, MIN_LIMIT, runBrief } from '../../analysis/briefSource.js';

/**
 * Collect usernames from the arguments and an optional list file.
 * @param {string[]} args
 * @param {string|undefined} file
 * @returns {Promise<{accounts: string[], rejected: string[]}>}
 */
async function resolveAccounts(args, file) {
  const parts = [];
  if (file) parts.push(await fs.readFile(file, 'utf-8'));
  if (args?.length) parts.push(args.join('\n'));
  const rejected = [];
  const accounts = parseAccountList(parts.join('\n'), rejected);
  return { accounts, rejected };
}

/**
 * One line per account for `--compact`.
 * @param {object} brief
 * @returns {object}
 */
function compactRow(brief) {
  const top = brief.figures[0];
  return {
    username: brief.username,
    name: brief.name,
    followers: brief.stats.followers,
    engagementRate: brief.stats.engagementRate,
    medianEngagement: brief.stats.medianEngagement,
    topicPosts: brief.topicPostCount,
    figures: brief.figures.length,
    recentPosts: brief.recentPosts.length,
    daysSinceLastPost: brief.stats.daysSinceLastPost,
    topFigure: top ? `${top.figures.map((f) => f.value).join(', ')}: ${top.figures[0].context}` : '',
    topFigureUrl: top ? top.url : '',
    sampleOrder: brief.sampleOrder,
    mentions: brief.mentions.map((m) => m.value).join(','),
    url: brief.url,
  };
}

/**
 * Register the command.
 *
 * @param {import('commander').Command} program
 * @param {object} deps
 * @param {() => Promise<import('../../client/index.js').Scraper>} deps.createHttpScraper
 */
export function registerBriefCommand(program, { createHttpScraper }) {
  program
    .command('brief [usernames...]')
    .description('Research accounts before you tag them: recent posts, numbers they publish, stats, who they tag')
    .option('-f, --file <path>', 'Read accounts from a file: one per line, or comma separated, # for comments')
    .option('-t, --topic <keywords>', 'Comma-separated keywords that make a post on topic, e.g. "x402,agent payments"')
    .option('-l, --limit <number>', `Posts to read per account (${MIN_LIMIT} to ${MAX_LIMIT})`, String(DEFAULT_LIMIT))
    .option('-d, --days <number>', 'Only list posts and figures from the last N days', '30')
    .option('--recent <number>', 'Recent posts to list per account', '5')
    .option('-o, --output <file>', 'Write the brief to a file: .md for Markdown, .json for the full data')
    .option('--json', 'Print the full brief as JSON instead of Markdown')
    .option('--refresh', 'Ignore cached timelines and fetch everything again')
    .option('--cache-hours <number>', 'Reuse timelines fetched within this many hours (0 turns the cache off)', String(DEFAULT_CACHE_HOURS))
    .addHelpText(
      'after',
      `
Examples:
  $ xactions brief coinbasedev base --topic x402
  $ xactions brief --file accounts.txt --topic "x402,agent payments" -o brief.md
  $ xactions brief --file accounts.txt --compact
  $ xactions brief --file accounts.txt --json | jq '.alsoTag[].username'`
    )
    .action(async (usernames, options) => {
      const mode = resolveOutputMode(program, options);

      let accounts;
      try {
        const resolved = await resolveAccounts(usernames, options.file);
        accounts = resolved.accounts;
        for (const token of resolved.rejected) {
          console.error(chalk.yellow(`  Skipping "${token}": not a valid X handle (letters, digits and _, at most 15).`));
        }
      } catch (error) {
        console.error(chalk.red(`Could not read ${options.file}: ${error.message}`));
        process.exitCode = 1;
        return;
      }
      if (!accounts.length) {
        console.error(chalk.red('No accounts given. Pass usernames, or --file with one per line.'));
        process.exitCode = 1;
        return;
      }

      const limit = clampInt(options.limit, DEFAULT_LIMIT, MIN_LIMIT, MAX_LIMIT);
      const days = clampInt(options.days, 30, 1, 3650);
      const recent = clampInt(options.recent, 5, 0, 50);
      const cacheHours = options.refresh ? 0 : Math.max(parseFloat(options.cacheHours) || 0, 0);

      // Spinners go to stderr, so Markdown on stdout still pipes cleanly.
      const spinner = createSpinner(`Reading ${accounts.length} account${accounts.length === 1 ? '' : 's'}...`, mode);

      let scraperPromise = null;
      const { ecosystem, fromCache } = await runBrief({
        accounts,
        getScraper: () => (scraperPromise ??= createHttpScraper()),
        topic: options.topic,
        limit,
        days,
        recent,
        cacheHours,
        onProgress: (username, index) => {
          spinner.text = `@${username} (${index + 1}/${accounts.length})`;
        },
      });
      const briefs = ecosystem.accounts;
      const failures = ecosystem.failures;

      spinner.stop();

      if (!briefs.length) {
        console.error(chalk.red('Could not read any of the accounts:'));
        for (const failure of failures) console.error(chalk.red(`  @${failure.username}: ${failure.error}`));
        process.exitCode = 1;
        return;
      }

      if (mode.compact) {
        printCompact(briefs.map(compactRow), { kind: 'brief', fields: mode.fields });
      } else if (options.json) {
        console.log(JSON.stringify(ecosystem, null, 2));
      } else if (!options.output) {
        console.log(renderBriefMarkdown(ecosystem));
      }

      if (options.output) {
        const asJson = path.extname(options.output).toLowerCase() === '.json';
        try {
          await fs.writeFile(options.output, asJson ? JSON.stringify(ecosystem, null, 2) : renderBriefMarkdown(ecosystem));
        } catch (error) {
          console.error(chalk.red(`Could not write ${options.output}: ${error.message}`));
          process.exitCode = 1;
          return;
        }
        if (!mode.compact && !options.json) {
          console.error(chalk.green(`✓ Brief for ${briefs.length} account${briefs.length === 1 ? '' : 's'} saved to ${options.output}`));
        }
      }

      if (mode.compact || options.json) {
        // The Markdown lists failures under "Not included"; the machine
        // formats would otherwise drop them without a word.
        for (const failure of failures) console.error(`failed\tusername=${failure.username}\terror=${failure.error}`);
      } else {
        const notes = [];
        if (fromCache) notes.push(`${fromCache} from cache (--refresh to refetch)`);
        if (failures.length) notes.push(`${failures.length} failed, listed under "Not included"`);
        if (notes.length) console.error(chalk.gray(`  ${notes.join('; ')}`));
      }

      if (failures.length) process.exitCode = 2;
    });
}
