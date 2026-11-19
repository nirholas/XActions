// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * `xactions download` - download every photo, video and GIF from a target.
 *
 * The gap this closes: XActions could always find media and could not save it.
 * Anyone wanting an archive reached for gallery-dl, which is excellent at
 * exactly this and knows nothing about the rest of the toolkit.
 *
 *   xactions download @nichxbt
 *   xactions download @nichxbt:all --output ./archive --archive
 *   xactions download "search:from:nichxbt filter:videos" --type video
 *   xactions download https://x.com/nichxbt/status/123 --filename '{date}_{media_filename}.{ext}'
 *
 * `media <username>` already existed and scrapes media *metadata* to JSON;
 * this writes the files themselves, so it gets the verb people reach for.
 *
 * Re-runs are incremental: with `--archive`, anything already fetched is
 * skipped before a byte is requested, so a nightly sync costs one timeline
 * walk. Identical bytes reached through a retweet and the author's own media
 * tab are hard-linked rather than stored twice.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license Apache-2.0
 */

import { join } from 'node:path';

import chalk from 'chalk';

import { DEFAULT_ARCHIVE, DEFAULT_TEMPLATE, TEMPLATE_KEYS, downloadMediaFor, parseTarget } from '../../media/index.js';

/** Human-readable byte size. */
function humanBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const power = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** power).toFixed(power ? 1 : 0)} ${units[power]}`;
}

const OUTCOME_STYLE = {
  downloaded: (t) => chalk.green(t),
  deduped: (t) => chalk.cyan(t),
  skipped: (t) => chalk.dim(t),
  planned: (t) => chalk.yellow(t),
  failed: (t) => chalk.red(t),
};

export async function downloadCommand(target, options, deps) {
  const { createMediaScrapers, loadConfig } = deps;

  let parsed;
  try {
    parsed = parseTarget(target);
  } catch (error) {
    console.error(chalk.red(error.message));
    process.exitCode = 1;
    return;
  }

  const types = options.type?.length ? options.type : undefined;
  const since = options.since ? new Date(options.since) : null;
  const until = options.until ? new Date(options.until) : null;
  for (const [flag, value] of [['--since', since], ['--until', until]]) {
    if (value && Number.isNaN(value.getTime())) {
      console.error(chalk.red(`${flag} is not a date I can read. Use YYYY-MM-DD.`));
      process.exitCode = 1;
      return;
    }
  }

  const outputDir = options.output || './media';
  // `--archive` with no value means "beside the files", which is what someone
  // syncing a folder nightly wants; an explicit path wins.
  const archivePath =
    options.archive === true ? join(outputDir, DEFAULT_ARCHIVE) : typeof options.archive === 'string' ? options.archive : null;

  const json = Boolean(options.json);
  const quiet = json || options.quiet;

  let scrapers;
  try {
    // The factory from scrapers/twitter/http, not the client Scraper: target
    // resolution calls scrapeMedia, scrapeProfile, scrapeTweetById,
    // searchTweets and scrapeCommunityMedia, none of which the Scraper has.
    const config = await loadConfig();
    scrapers = await createMediaScrapers(config.httpScraper || {});
  } catch (error) {
    console.error(chalk.red(`Could not start a scraper: ${error.message}`));
    console.error(chalk.dim('Run `xactions login` first, or `xactions doctor` to see what is missing.'));
    process.exitCode = 1;
    return;
  }

  if (!quiet) {
    console.log(chalk.dim(`Resolving ${chalk.bold(target)} (${parsed.kind})...`));
  }

  const controller = new AbortController();
  const onSigint = () => {
    if (!quiet) console.log(chalk.yellow('\nStopping. Partial files are kept and will resume next run.'));
    controller.abort();
  };
  process.once('SIGINT', onSigint);

  try {
    const { items, results, summary } = await downloadMediaFor(target, {
      scrapers,
      outputDir,
      template: options.filename || DEFAULT_TEMPLATE,
      archivePath,
      limit: Number(options.limit) || 100,
      types,
      since,
      until,
      concurrency: Number(options.concurrency) || 4,
      overwrite: Boolean(options.overwrite),
      dryRun: Boolean(options.dryRun),
      signal: controller.signal,
      onResult: quiet
        ? undefined
        : (result, index, total) => {
            const style = OUTCOME_STYLE[result.outcome] || ((t) => t);
            const counter = chalk.dim(`[${String(index + 1).padStart(String(total).length)}/${total}]`);
            const detail = result.outcome === 'failed' ? chalk.dim(` ${result.reason}`) : result.bytes ? chalk.dim(` ${humanBytes(result.bytes)}`) : '';
            console.log(`${counter} ${style(result.outcome.padEnd(10))} ${result.relativePath}${detail}`);
          },
    });

    if (json) {
      console.log(JSON.stringify({ target: parsed, found: items.length, summary, results }, null, 2));
      // An empty result is an error, not a zero; a partial failure is too.
      if (!items.length || summary.failed) process.exitCode = 1;
      return;
    }

    if (!items.length) {
      console.error(chalk.yellow('No media matched that target.'));
      if (types) console.error(chalk.dim(`Filtered to: ${types.join(', ')}. Try without --type.`));
      process.exitCode = 1;
      return;
    }

    console.log('');
    const parts = [
      `${chalk.green(summary.downloaded)} downloaded`,
      summary.deduped ? `${chalk.cyan(summary.deduped)} deduped` : null,
      summary.skipped ? `${chalk.dim(summary.skipped)} already had` : null,
      summary.planned ? `${chalk.yellow(summary.planned)} planned` : null,
      summary.failed ? `${chalk.red(summary.failed)} failed` : null,
    ].filter(Boolean);
    console.log(`${parts.join(', ')}  ${chalk.dim(`(${humanBytes(summary.bytes)} in ${outputDir})`)}`);
    if (archivePath) console.log(chalk.dim(`Archive: ${archivePath} (re-runs skip what it lists)`));
    if (summary.failed) process.exitCode = 1;
  } catch (error) {
    console.error(chalk.red(`Download failed: ${error.message}`));
    process.exitCode = 1;
  } finally {
    process.off('SIGINT', onSigint);
    await scrapers.close?.().catch(() => {});
  }
}

export function registerDownloadCommand(program, deps) {
  program
    .command('download <target>')
    .alias('dl')
    .description('Download photos, videos and GIFs from a profile, tweet, search or community')
    .option('-o, --output <dir>', 'Where files land', './media')
    .option('-f, --filename <template>', `Filename template (${Object.keys(TEMPLATE_KEYS).length} keys, listed under --help)`, DEFAULT_TEMPLATE)
    .option('-a, --archive [path]', 'Record what was downloaded so re-runs are incremental')
    .option('-l, --limit <n>', 'How many source items to walk', '100')
    .option('-c, --concurrency <n>', 'Parallel downloads', '4')
    .option('-t, --type <type...>', 'Only these types: photo, video, gif')
    .option('--since <date>', 'Only media from this date onward (YYYY-MM-DD)')
    .option('--until <date>', 'Only media up to this date (YYYY-MM-DD)')
    .option('--overwrite', 'Re-download even when the file or archive entry exists')
    .option('--dry-run', 'List what would be downloaded, write nothing')
    .option('--json', 'Print the plan and results as JSON')
    .option('-q, --quiet', 'Summary only, no per-file lines')
    .addHelpText(
      'after',
      `\nTemplate keys:\n${Object.entries(TEMPLATE_KEYS)
        .map(([key, description]) => `  {${key}}`.padEnd(20) + description)
        .join('\n')}\n\nExamples:\n  xactions download @nichxbt --archive\n  xactions download @nichxbt:all -o ./archive -f '{username}/{kind}/{date}_{media_filename}.{ext}'\n  xactions download "search:from:nichxbt filter:videos" -t video\n  xactions download https://x.com/nichxbt/status/123 --dry-run`
    )
    .action((target, options) => downloadCommand(target, options, deps));
}
