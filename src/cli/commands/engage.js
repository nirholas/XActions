// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * `xactions engage`: like, repost, and reply across a profile, a search, or a
 * list, with comments from templates or from an LLM given a one-line brief.
 *
 * This is the no-browser twin of `scripts/engageProfile.js`. The sweep itself
 * lives in `src/engage/` so the MCP tool runs exactly the same code; this file
 * is argument parsing and rendering, nothing more.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license Apache-2.0
 */
import fs from 'fs/promises';
import chalk from 'chalk';
import ora from 'ora';

import { createCommentGenerator, DEFAULT_MODELS } from '../../ai/commentGenerator.js';
import {
  resolveSource,
  collectTweets,
  runEngage,
  parseTemplates,
  pickTemplate,
  selectTweets,
} from '../../engage/runner.js';
import { createEngageState, statePath } from '../../engage/state.js';

/** Re-exported so callers (and tests) can reach the engine through the command. */
export { selectTweets, parseTemplates, pickTemplate, statePath };

/**
 * Split a repeatable comma-friendly flag into a clean list.
 * @param {string} value
 * @param {string[]} previous
 * @returns {string[]}
 */
function collectList(value, previous = []) {
  const parts = String(value).split(',').map((s) => s.trim()).filter(Boolean);
  return [...previous, ...parts];
}

/**
 * Register the command.
 *
 * @param {import('commander').Command} program
 * @param {object} deps
 * @param {() => Promise<import('../../client/index.js').Scraper>} deps.createHttpScraper
 * @param {() => Promise<object>} deps.loadConfig
 * @param {string} deps.configDir
 */
export function registerEngageCommand(program, { createHttpScraper, loadConfig, configDir }) {
  program
    .command('engage [username]')
    .description('Like, repost, and reply across a profile, a search, or a list, with template or AI-written comments')
    .option('--search <query>', 'Sweep search results instead of a profile')
    .option('--list <id>', 'Sweep a list timeline instead of a profile (digits from x.com/i/lists/<id>)')
    .option('--mode <mode>', 'Search ranking: Latest or Top', 'Latest')
    .option('--like', 'Like each post')
    .option('--repost', 'Repost each post')
    .option('--comment', 'Reply to each post')
    .option('-l, --limit <number>', 'Maximum posts to engage this run', '100')
    .option('--replies', "Include replies, not just top-level posts")
    .option('--reposts', 'Include posts the account reposted from others')
    .option('--since <date>', 'Only posts on or after this date (ISO, e.g. 2026-08-01)')
    .option('--from <handles>', 'Only engage posts by these authors (comma-separated, repeatable)', collectList, [])
    .option('--skip-user <handles>', 'Never engage posts by these authors', collectList, [])
    .option('--keyword <words>', 'Only posts containing one of these words', collectList, [])
    .option('--skip-keyword <words>', 'Skip posts containing any of these words', collectList, [])
    .option('--min-likes <n>', 'Only posts with at least this many likes', '0')
    .option('--max-likes <n>', 'Only posts with at most this many likes (0 = no ceiling)', '0')
    .option('--prompt <brief>', 'AI mode: how the replies should sound. Turns on AI comments.')
    .option('--persona <text>', 'AI mode: who is writing, e.g. "You are @you, a founder building X"')
    .option('--template <text>', 'Reply template ({author}, {name} are filled in). Repeatable.', (v, all) => [...(all || []), v], [])
    .option('--templates-file <path>', 'File with one reply template per line')
    .option('--provider <name>', 'LLM provider: free (default, no key needed), or your own key with openrouter, openai, xai, anthropic, ollama, custom', 'free')
    .option('--model <name>', 'LLM model for a non-free provider (provider default if omitted)')
    .option('--api-key <key>', 'Your own key for a non-free provider (or set OPENROUTER_API_KEY / OPENAI_API_KEY / XAI_API_KEY / ANTHROPIC_API_KEY)')
    .option('--base-url <url>', 'Custom OpenAI-compatible chat-completions URL (provider custom)')
    .option('--delay <seconds>', 'Seconds to wait between posts', '20')
    .option('--jitter <seconds>', 'Random spread added to --delay', '10')
    .option('--dry-run', 'Show what would happen, including generated comments, without posting')
    .option('--reset', 'Forget saved progress for this feed before starting')
    .option('--no-resume', 'Ignore saved progress for this run (do not read or write it)')
    .option('--json', 'Print the run report as JSON on stdout')
    .addHelpText('after', `
Examples:
  $ xactions engage nasa --like --repost --dry-run
  $ xactions engage nasa --like --comment --template "Solid work on this, {name}." --template "Curious what changed your mind here?"
  $ xactions engage nasa --like --repost --comment --prompt "supportive, specific, one honest question, no hype"
  $ xactions engage --search "open source AI" --like --comment --prompt "curious builder" --max-likes 50
  $ xactions engage --list 1234567890 --like --keyword solana,rust --limit 25
  $ GROQ_API_KEY=gsk_... xactions engage nasa --comment --prompt "dry wit, one sentence"   # a free-tier key adds capacity

Needs a logged-in session for anything but --dry-run: run \`xactions connect\` or \`xactions login\` first.
Progress is saved per feed under ${configDir}/engage/ so re-running skips posts already done.
`)
    .action(async (usernameArg, options) => {
      const actions = { like: !!options.like, repost: !!options.repost, comment: !!options.comment };
      const quiet = !!options.json;
      const out = (...args) => { if (!quiet) console.log(...args); };

      if (!actions.like && !actions.repost && !actions.comment) {
        console.error(chalk.red('✗ Pick at least one of --like, --repost, --comment'));
        process.exitCode = 1;
        return;
      }

      let source;
      try {
        source = resolveSource({
          username: usernameArg,
          search: options.search,
          list: options.list,
          includeReplies: !!options.replies,
          mode: options.mode,
        });
      } catch (err) {
        console.error(chalk.red(`✗ ${err.message}`));
        process.exitCode = 1;
        return;
      }

      const limit = Math.max(1, parseInt(options.limit, 10) || 100);
      const delay = Math.max(0, parseFloat(options.delay) || 0);
      const jitter = Math.max(0, parseFloat(options.jitter) || 0);
      const since = options.since ? new Date(options.since) : null;
      if (since && Number.isNaN(since.getTime())) {
        console.error(chalk.red(`✗ --since "${options.since}" is not a date`));
        process.exitCode = 1;
        return;
      }

      // Comment source: templates, an LLM, or an LLM with templates as the fallback.
      let templates = [];
      let generator = null;
      if (actions.comment) {
        let fileContents = '';
        if (options.templatesFile) {
          try {
            fileContents = await fs.readFile(options.templatesFile, 'utf-8');
          } catch (err) {
            console.error(chalk.red(`✗ Could not read --templates-file: ${err.message}`));
            process.exitCode = 1;
            return;
          }
        }
        templates = parseTemplates(options.template, fileContents);

        if (options.prompt) {
          const config = await loadConfig();
          try {
            generator = createCommentGenerator({
              prompt: options.prompt,
              persona: options.persona,
              provider: options.provider,
              model: options.model,
              apiKey: options.apiKey || config.openrouter_api_key,
              baseUrl: options.baseUrl,
            });
          } catch (err) {
            console.error(chalk.red(`✗ ${err.message}`));
            process.exitCode = 1;
            return;
          }
        } else if (templates.length === 0) {
          console.error(chalk.red('✗ --comment needs either --prompt (AI) or at least one --template / --templates-file'));
          process.exitCode = 1;
          return;
        }
      }

      const spinner = ora({ text: `Reading ${source.label}`, isSilent: quiet }).start();
      let report = null;

      try {
        const scraper = await createHttpScraper();

        let me = '';
        if (!options.dryRun) {
          const loggedIn = await scraper.isLoggedIn().catch(() => false);
          if (!loggedIn) {
            throw new Error('Not logged in. Run `xactions connect` (browser login) or `xactions login` (paste cookies) first, or add --dry-run to preview.');
          }
          me = await scraper.me().then((p) => p?.username || '').catch(() => '');
        }

        const state = await createEngageState({
          configDir,
          stateKey: source.stateKey,
          enabled: options.resume !== false,
          reset: !!options.reset,
        });

        const filters = {
          actions,
          includeReplies: !!options.replies,
          includeReposts: !!options.reposts,
          since,
          done: state.done,
          onlyFrom: options.from,
          skipUsers: options.skipUser,
          keywords: options.keyword,
          skipKeywords: options.skipKeyword,
          minLikes: parseInt(options.minLikes, 10) || 0,
          maxLikes: parseInt(options.maxLikes, 10) || 0,
          self: me,
        };

        const { fetched, selected, skipped } = await collectTweets(
          scraper,
          source,
          filters,
          limit,
          (count) => { spinner.text = `Reading ${source.label} (${count} posts)`; },
        );

        if (fetched.length === 0) {
          throw new Error(`No posts returned for ${source.label}. X served an empty feed: check the target, log in with \`xactions login\`, or retry in a minute if you are rate limited.`);
        }

        spinner.succeed(`${source.label}: ${fetched.length} posts read, ${selected.length} to engage, ${skipped.length} skipped${state.priorCount ? `, ${state.priorCount} done in earlier runs` : ''}`);

        if (selected.length === 0) {
          const reasons = skipped.reduce((acc, s) => { acc[s.why] = (acc[s.why] || 0) + 1; return acc; }, {});
          out(chalk.yellow('Nothing left to do. Why every post was skipped:'));
          for (const [why, count] of Object.entries(reasons).sort((a, b) => b[1] - a[1])) {
            out(chalk.gray(`  ${String(count).padStart(4)}  ${why}`));
          }
          out(chalk.gray('Loosen the filters, raise --limit, or use --reset to start over.'));
          if (quiet) console.log(JSON.stringify({ source: source.label, processed: 0, skipped }, null, 2));
          return;
        }

        const label = [actions.like && 'like', actions.repost && 'repost', actions.comment && 'reply'].filter(Boolean).join(' + ');
        const commentSource = generator ? `ai:${generator.target.provider}/${generator.target.model}` : (actions.comment ? 'templates' : 'none');
        out(chalk.gray(`${options.dryRun ? 'DRY RUN, ' : ''}${label}, ${delay}s ±${jitter}s between posts, comments from ${commentSource}\n`));

        let waitSpinner = null;
        const stopWait = () => { if (waitSpinner) { waitSpinner.stop(); waitSpinner = null; } };

        report = await runEngage({
          scraper,
          source,
          tweets: selected,
          actions,
          done: state.done,
          templates,
          generator,
          dryRun: !!options.dryRun,
          delay,
          jitter,
          onProgressSaved: state.save,
          onEvent: (event) => {
            if (quiet) return;
            stopWait();
            if (event.type === 'post') {
              const ellipsis = String(event.tweet.text || '').length > 120 ? '…' : '';
              out(chalk.bold(`[${event.index + 1}/${event.total}] ${event.tweet.id}`) + chalk.gray(` @${event.tweet.username || '?'}  ${event.preview}${ellipsis}`));
            } else if (event.type === 'action') {
              const icon = { like: '❤️', repost: '🔁', comment: '💬' }[event.action];
              const prefix = event.dryRun ? chalk.yellow('[dry] would ') : '';
              const text = event.detail?.text ? `: ${chalk.cyan(`"${event.detail.text}"`)}` : '';
              const via = event.detail?.source ? chalk.gray(` (${event.detail.source})`) : '';
              out(`   ${icon} ${prefix}${event.detail?.line || event.action}${via}${text}`);
            } else if (event.type === 'ratelimit') {
              out(chalk.yellow(`   ⏳ rate limited on ${event.action}, waiting ${event.waitSeconds}s`));
            } else if (event.type === 'fallback') {
              out(chalk.yellow(`   🤖 model failed (${event.message}), using a template`));
            } else if (event.type === 'error') {
              out(chalk.yellow(`   ⚠️  ${event.action} failed: ${event.message}`));
            } else if (event.type === 'wait' && event.ms > 1500) {
              waitSpinner = ora({ text: chalk.gray(`next in ${Math.round(event.ms / 1000)}s`) }).start();
            }
          },
        });
        stopWait();

        report.skipped = skipped;
        report.stateFile = state.file;

        out('');
        out(chalk.green(`✓ ${report.processed} posts: ❤️ ${report.liked} liked · 🔁 ${report.reposted} reposted · 💬 ${report.commented} replied · ⚠️  ${report.failed} with errors`));
        if (options.dryRun) out(chalk.yellow('  Dry run: nothing was posted. Drop --dry-run to do it for real.'));
        else if (options.resume !== false) out(chalk.gray(`  Progress saved to ${state.file}`));
        if (quiet) console.log(JSON.stringify(report, null, 2));
        // A run where actions failed is not a success, even if it finished.
        if (report.failed > 0) process.exitCode = 1;
      } catch (error) {
        spinner.fail('Engage run failed');
        console.error(chalk.red(error.message));
        if (quiet) console.log(JSON.stringify({ ...(report || {}), source: source?.label, error: error.message }, null, 2));
        process.exitCode = 1;
      }
    });
}

/** Provider defaults, exported so the docs check can list them. */
export const ENGAGE_DEFAULT_MODELS = DEFAULT_MODELS;
