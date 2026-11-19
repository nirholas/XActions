// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * `xactions report` - a quantified read on any public account.
 *
 * Uses the same analyser as the web playground and the `x_account_report` MCP
 * tool, so a number printed here is the same number rendered there. Needs no
 * login: profile and public timeline are the two endpoints X still serves to
 * a logged-out client, and every figure below is derived from those.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license Apache-2.0
 */

import chalk from 'chalk';

import { createSpinner, printCompact, resolveOutputMode } from '../../utils/output.js';

import { buildAccountReport, compareReports, formatCount, WEEKDAYS } from '../../analysis/accountReport.js';

/** Bar characters, lightest to fullest, for the inline hour histogram. */
const BLOCKS = [' ', '▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

/**
 * Collect a profile and a timeline sample for one account.
 * @param {import('../../client/index.js').Scraper} scraper
 * @param {string} username
 * @param {number} limit
 * @returns {Promise<object>} A report
 */
async function reportFor(scraper, username, limit) {
  const profile = await scraper.getProfile(username);
  if (!profile?.id) {
    throw new Error(`X returned no profile for @${username}. Check the spelling, or the account may be suspended.`);
  }

  const tweets = [];
  for await (const tweet of scraper.getTweets(username, limit)) {
    tweets.push(tweet);
    if (tweets.length >= limit) break;
  }

  return buildAccountReport({ profile, tweets });
}

/**
 * Render the hour histogram as a single line of block characters.
 * @param {object} timing
 * @returns {string}
 */
function hourHistogram(timing) {
  const peak = Math.max(...timing.byHourUTC.map((b) => b.medianEngagement), 1);
  return timing.byHourUTC
    .map((bucket) => {
      if (!bucket.posts) return chalk.gray(BLOCKS[0]);
      const level = Math.max(1, Math.round((bucket.medianEngagement / peak) * (BLOCKS.length - 1)));
      const block = BLOCKS[level];
      return bucket.index === timing.bestHourUTC ? chalk.green(block) : chalk.cyan(block);
    })
    .join('');
}

/**
 * @param {string} label
 * @param {string|number} value
 * @param {string} [note]
 * @returns {string}
 */
function line(label, value, note = '') {
  const padded = `${label}:`.padEnd(22);
  return `  ${chalk.gray(padded)}${chalk.bold(value)}${note ? chalk.gray(`  ${note}`) : ''}`;
}

/**
 * Print one report to the terminal.
 * @param {object} report
 */
function printReport(report) {
  const { identity, audience, output, engagement, mix, timing, meta } = report;

  console.log('');
  console.log(chalk.bold.cyan(`  ${identity.name}`), chalk.gray(`@${identity.username}`), identity.verified ? chalk.blue('✓') : '');
  if (identity.bio) console.log(chalk.gray(`  ${identity.bio.replace(/\n/g, ' ').slice(0, 100)}`));
  console.log('');

  console.log(chalk.bold('  Audience'));
  console.log(line('Followers', formatCount(audience.followers), `${formatCount(audience.following)} following`));
  console.log(line('Follower ratio', formatCount(audience.followerRatio)));
  console.log(line('Growth', `${formatCount(audience.followersPerDay)}/day`, `lifetime average over ${formatCount(audience.accountAgeDays)} days`));
  console.log('');

  console.log(chalk.bold('  Output'));
  console.log(line('Posts, lifetime', formatCount(output.lifetimePosts), `${output.lifetimePostsPerDay}/day`));
  console.log(line('Posts, sampled', `${output.postsPerDay}/day`, `${meta.sampleSize} posts over ${meta.sampleSpanDays} days`));
  console.log(line('Typical gap', `${output.medianGapHours}h`));
  if (output.daysSinceLastPost !== null) {
    const age =
      output.daysSinceLastPost < 1
        ? `${Math.round(output.daysSinceLastPost * 24)}h ago`
        : `${output.daysSinceLastPost} days ago`;
    console.log(line('Last post', age));
  }
  console.log('');

  console.log(chalk.bold('  Engagement'));
  console.log(line('Rate', `${engagement.rate}%`, 'median original post, as a share of followers'));
  console.log(line('Median per post', formatCount(engagement.medianPerOriginal), `♥ ${formatCount(engagement.medianLikes)}  ↻ ${formatCount(engagement.medianRetweets)}  💬 ${formatCount(engagement.medianReplies)}`));
  console.log(line('Best in sample', formatCount(engagement.bestPost)));
  if (engagement.viewSampleSize) {
    console.log(line('Median views', formatCount(engagement.medianViews), `${engagement.viewRate}% of viewers interact, n=${engagement.viewSampleSize}`));
  }
  console.log('');

  console.log(chalk.bold('  Content mix'));
  console.log(line('Original', `${mix.originalShare}%`, `replies ${mix.replyShare}%  reposts ${mix.retweetShare}%  quotes ${mix.quoteShare}%`));
  console.log(line('With media', `${mix.mediaShare}%`, `links ${mix.linkShare}%  hashtags ${mix.hashtagShare}%`));
  if (report.topHashtags.length) {
    console.log(line('Top hashtags', report.topHashtags.slice(0, 5).map((h) => `#${h.value}`).join(' ')));
  }
  console.log('');

  console.log(chalk.bold('  Timing'), chalk.gray('(UTC)'));
  console.log(`  ${chalk.gray('00'.padEnd(2))}${hourHistogram(timing)}${chalk.gray('23')}`);
  console.log(line('Best hour', timing.bestHourUTC === null ? 'not enough data' : `${String(timing.bestHourUTC).padStart(2, '0')}:00`, timing.bestHourUTC === null ? `needs ${timing.minimumBucketSample}+ posts in an hour` : `median ${formatCount(timing.bestHourMedianEngagement)}`));
  console.log(line('Best weekday', timing.bestWeekday || 'not enough data', timing.bestWeekday ? `median ${formatCount(timing.bestWeekdayMedianEngagement)}` : ''));
  console.log('');

  if (report.signals.length) {
    console.log(chalk.bold('  Observations'));
    const mark = { good: chalk.green('✓'), watch: chalk.yellow('!'), info: chalk.blue('i') };
    for (const signal of report.signals) {
      console.log(`  ${mark[signal.level] || '·'} ${chalk.bold(signal.title)}`);
      console.log(chalk.gray(`    ${signal.detail}`));
    }
    console.log('');
  }

  if (report.topPosts.length) {
    console.log(chalk.bold('  Top posts'));
    for (const post of report.topPosts.slice(0, 3)) {
      const text = post.text.replace(/\s+/g, ' ').slice(0, 88);
      console.log(`  ${chalk.bold(formatCount(post.engagement).padStart(7))}  ${text}`);
      console.log(chalk.gray(`           ${post.url}`));
    }
    console.log('');
  }

  console.log(chalk.gray(`  Source: ${meta.source}. No login used.`));
  console.log('');
}

/**
 * Print a side-by-side table when several accounts were requested.
 * @param {object[]} reports
 */
function printComparison(reports) {
  const { accounts, leaders } = compareReports(reports);

  const rows = [
    ['Followers', 'followers', formatCount],
    ['Follower ratio', 'followerRatio', formatCount],
    ['Followers/day', 'followersPerDay', formatCount],
    ['Posts, lifetime', 'lifetimePosts', formatCount],
    ['Posts/day', 'postsPerDay', String],
    ['Median engagement', 'medianEngagement', formatCount],
    ['Engagement rate', 'engagementRate', (v) => `${v}%`],
    ['With media', 'mediaShare', (v) => `${v}%`],
    ['Original posts', 'originalShare', (v) => `${v}%`],
  ];

  const labelWidth = 20;
  const colWidth = Math.max(14, ...accounts.map((a) => a.username.length + 2));

  console.log('');
  console.log(
    `  ${''.padEnd(labelWidth)}${accounts.map((a) => chalk.bold.cyan(`@${a.username}`.padStart(colWidth))).join('')}`
  );
  console.log(chalk.gray(`  ${'-'.repeat(labelWidth + colWidth * accounts.length)}`));

  for (const [label, key, format] of rows) {
    const cells = accounts
      .map((a) => {
        const text = format(a[key]).padStart(colWidth);
        return leaders[key] === a.username ? chalk.green(text) : text;
      })
      .join('');
    console.log(`  ${chalk.gray(label.padEnd(labelWidth))}${cells}`);
  }

  console.log('');
  console.log(chalk.gray(`  Green marks the leading account on that row.`));
  console.log(
    chalk.gray(`  Samples: ${accounts.map((a) => `@${a.username} ${a.sampleSize} posts`).join(', ')}.`)
  );
  console.log('');
}

/**
 * Register the command.
 *
 * @param {import('commander').Command} program
 * @param {object} deps
 * @param {() => Promise<import('../../client/index.js').Scraper>} deps.createHttpScraper
 * @param {(data: object[], options: object, defaultName: string) => Promise<void>} deps.smartOutput
 */
export function registerReportCommand(program, { createHttpScraper, smartOutput }) {
  program
    // Named `analyze` rather than `report` because `report` already belongs to
    // the reputation monitor, which needs a monitor running first. These are
    // different jobs and taking that name would have broken existing users.
    .command('analyze <usernames...>')
    .description('Account report: engagement rate, cadence, content mix, best posting hour. No login needed.')
    .option('-l, --limit <number>', 'Posts to sample per account', '50')
    .option('-o, --output <file>', 'Write the raw report to .json, .csv or .xlsx')
    .option('--json', 'Print raw JSON instead of the formatted report')
    .action(async (usernames, options) => {
      const limit = Math.min(Math.max(parseInt(options.limit, 10) || 50, 5), 200);
      const mode = resolveOutputMode(program, options);
      const spinner = createSpinner(`Sampling ${limit} posts...`, mode);

      try {
        const scraper = await createHttpScraper();
        const reports = [];

        for (const username of usernames) {
          spinner.text = `Sampling @${username.replace(/^@/, '')}...`;
          reports.push(await reportFor(scraper, username.replace(/^@/, ''), limit));
        }

        spinner.stop();

        if (mode.compact) {
          printCompact(reports, { kind: 'report', fields: mode.fields });
        } else if (options.json) {
          console.log(JSON.stringify(reports.length === 1 ? reports[0] : reports, null, 2));
        } else if (reports.length === 1) {
          printReport(reports[0]);
        } else {
          printComparison(reports);
          for (const report of reports) printReport(report);
        }

        // -o always writes the file. Passing it through smartOutput's stdout
        // branches meant `--json -o f` or `--compact -o f` printed twice and
        // never wrote anything.
        if (options.output) {
          await smartOutput(reports, options, 'report', { toFile: true });
        }
      } catch (error) {
        spinner.fail(chalk.red(error.message));
        if (error.code === 'AUTH_REQUIRED') {
          console.log(chalk.gray('\n  X restricted this read to logged-in sessions.'));
          console.log(chalk.gray('  Run `xactions connect` to use your own session.\n'));
        }
        process.exitCode = 1;
      }
    });
}

export { reportFor, printReport, printComparison, WEEKDAYS };
