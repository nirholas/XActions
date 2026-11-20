// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * `xactions reputation`: AI risk-score an account's posts and print a
 * reputation report, with a JSON mode for scripting.
 *
 * This is the no-browser twin of scripts/reputationAudit.js (which also
 * renders a shareable score card, something a terminal cannot do) and shares
 * its scoring engine, src/ai/reputationScorer.js, with the API route
 * POST /api/ai/reputation/score. Reading posts reuses the same profile/list
 * source resolution as `xactions engage`.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license Apache-2.0
 */
import chalk from 'chalk';
import ora from 'ora';

import { resolveSource, readSource } from '../../engage/runner.js';
import { scorePosts, summarizeReport, DIMENSIONS } from '../../ai/reputationScorer.js';

const DIMENSION_KEYS = Object.keys(DIMENSIONS);

/**
 * Normalize a client Tweet model into the {text, author, ...} shape the
 * scorer expects.
 * @param {object} tweet
 */
function toScorable(tweet) {
  return {
    id: tweet.id,
    text: tweet.fullText || tweet.text || '',
    author: tweet.username,
    quotedText: tweet.quotedStatus?.fullText || tweet.quotedStatus?.text || '',
    hasMedia: (tweet.photos?.length || 0) + (tweet.videos?.length || 0) > 0,
    isReply: !!tweet.isReply,
  };
}

const gradeColor = (grade) => ({
  'A+': chalk.green, A: chalk.green, B: chalk.greenBright, C: chalk.yellow, D: chalk.magenta, F: chalk.red,
}[grade] || chalk.gray);

const verdictColor = (verdict) => ({ flagged: chalk.red, review: chalk.yellow, clean: chalk.green }[verdict] || chalk.gray);

/**
 * Register the command.
 *
 * @param {import('commander').Command} program
 * @param {object} deps
 * @param {() => Promise<import('../../client/index.js').Scraper>} deps.createHttpScraper
 * @param {() => Promise<object>} deps.loadConfig
 */
export function registerReputationCommand(program, { createHttpScraper, loadConfig }) {
  program
    .command('reputation [username]')
    .description('AI risk-score an account\'s posts (professional, hostile, legal, spam) and print a reputation report')
    .option('--replies', 'Include the replies tab, often the biggest source of risk on an account')
    .option('--reposts', 'Also score posts the account reposted from others')
    .option('-l, --limit <number>', 'Maximum posts to scan', '60')
    .option('--dimensions <list>', `Comma-separated subset: ${DIMENSION_KEYS.join(', ')}`, DIMENSION_KEYS.join(','))
    .option('--custom-question <text>', 'An extra risk question specific to this account, scored alongside the built-ins')
    .option('--provider <name>', 'LLM provider: free (default, no key needed), or your own key with openrouter, openai, xai, anthropic, ollama, custom', 'free')
    .option('--model <name>', 'LLM model for a non-free provider (provider default if omitted)')
    .option('--api-key <key>', 'Your own key for a non-free provider (or set OPENROUTER_API_KEY / OPENAI_API_KEY / XAI_API_KEY / ANTHROPIC_API_KEY)')
    .option('--base-url <url>', 'Custom OpenAI-compatible chat-completions URL (provider custom)')
    .option('--concurrency <number>', 'Posts scored in parallel', '4')
    .option('--top <number>', 'How many flagged/review posts to print', '10')
    .option('--json', 'Print the report as JSON on stdout')
    .addHelpText('after', `
Examples:
  $ xactions reputation nichxbt
  $ xactions reputation nichxbt --replies --limit 200
  $ xactions reputation nichxbt --dimensions hostile,legal --custom-question "Does this reveal my employer?"
  $ GROQ_API_KEY=gsk_... xactions reputation nichxbt --json   # a free-tier key adds capacity

For a downloadable, shareable score card image, use the browser version instead:
scripts/reputationAudit.js, pasted into DevTools on your own profile.
`)
    .action(async (usernameArg, options) => {
      const quiet = !!options.json;
      const out = (...args) => { if (!quiet) console.log(...args); };

      let source;
      try {
        source = resolveSource({ username: usernameArg, includeReplies: !!options.replies });
      } catch (err) {
        console.error(chalk.red(`✗ ${err.message}`));
        process.exitCode = 1;
        return;
      }

      const dims = String(options.dimensions || '').split(',').map((s) => s.trim()).filter(Boolean);
      const unknown = dims.filter((d) => !DIMENSION_KEYS.includes(d));
      if (unknown.length) {
        console.error(chalk.red(`✗ Unknown dimension${unknown.length > 1 ? 's' : ''}: ${unknown.join(', ')}. Use one of: ${DIMENSION_KEYS.join(', ')}`));
        process.exitCode = 1;
        return;
      }
      if (dims.length === 0 && !options.customQuestion) {
        console.error(chalk.red('✗ Nothing to score. Pick at least one --dimensions value or pass --custom-question.'));
        process.exitCode = 1;
        return;
      }

      const limit = Math.max(1, parseInt(options.limit, 10) || 60);
      let report = null;
      let scores = [];
      let posts = [];

      const readSpinner = ora({ text: `Reading @${source.username}`, isSilent: quiet }).start();
      try {
        const scraper = await createHttpScraper();

        for await (const tweet of readSource(scraper, source, Math.max(limit * 2, limit + 20))) {
          if (tweet.isRetweet && !options.reposts) continue;
          posts.push(tweet);
          readSpinner.text = `Reading @${source.username} (${posts.length} posts)`;
          if (posts.length >= limit) break;
        }

        if (posts.length === 0) {
          throw new Error(`No posts found for @${source.username}. Check the handle, or add --reposts if the account mostly reposts others.`);
        }
        readSpinner.succeed(`@${source.username}: ${posts.length} posts read`);

        const config = await loadConfig();
        const scoreSpinner = ora({ text: `Scoring 0/${posts.length}`, isSilent: quiet }).start();
        scores = await scorePosts(posts.map(toScorable), {
          dimensions: dims,
          customQuestion: options.customQuestion,
          provider: options.provider,
          model: options.model,
          apiKey: options.apiKey || config.openrouter_api_key,
          baseUrl: options.baseUrl,
          concurrency: Math.max(1, Math.min(8, parseInt(options.concurrency, 10) || 4)),
          onProgress: (done, total) => { scoreSpinner.text = `Scoring ${done}/${total}`; },
        });
        const scoredOk = scores.filter((s) => !s.error).length;
        if (scoredOk === 0) {
          // Every model call failed. Summarising zero scores yields 100/100 A+
          // "reads clean", which is the opposite of what happened.
          scoreSpinner.fail(`Scored 0/${posts.length} posts`);
          const firstError = scores.find((s) => s?.error)?.error || 'the model returned nothing';
          throw new Error(`No post could be scored, so there is no reputation score. First error: ${firstError}`);
        }
        scoreSpinner.succeed(`Scored ${scoredOk}/${posts.length} posts`);

        const top = Math.max(0, parseInt(options.top, 10) || 10);
        report = summarizeReport(posts, scores, top);

        out('');
        const grade = gradeColor(report.grade);
        out(grade.bold(`  ${report.reputationScore}/100  ·  ${report.grade}`) + chalk.gray(`   (${report.scoredOk}/${report.scanned} scored${report.errors ? `, ${report.errors} failed` : ''})`));
        out(chalk.gray(`  ${report.verdictCounts.clean} clean · ${report.verdictCounts.review} worth a look · ${report.verdictCounts.flagged} flagged`));
        out('');
        // Coloured and filled by the peak as well as the average: one post at 92
        // among four clean ones averages to 18, and a green bar under an F grade
        // reads as a bug rather than as "most posts are fine, one is not".
        for (const [key, avg] of Object.entries(report.dimensionAverages)) {
          const meta = DIMENSIONS[key] || { label: key, emoji: '🔎' };
          const peak = report.dimensionPeaks?.[key] ?? avg;
          const barLen = 24;
          const avgCells = Math.round((avg / 100) * barLen);
          const peakCells = Math.round((peak / 100) * barLen);
          const color = peak >= 70 ? chalk.red : peak >= 40 ? chalk.yellow : chalk.green;
          const bar = color('█'.repeat(avgCells))
            + color.dim('▒'.repeat(Math.max(0, peakCells - avgCells)))
            + chalk.gray('░'.repeat(Math.max(0, barLen - Math.max(avgCells, peakCells))));
          const label = peak === avg ? `${avg}` : `${avg} avg, ${peak} worst`;
          out(`  ${meta.emoji} ${meta.label.padEnd(14)} ${bar} ${label}`);
        }

        if (report.worstPosts.length > 0) {
          out('');
          out(chalk.bold(`  Worth a look (top ${Math.min(top, report.worstPosts.length)}):`));
          for (const { post, score } of report.worstPosts) {
            const worst = score.dimensions[score.worstDimension];
            const meta = DIMENSIONS[score.worstDimension] || { label: score.worstDimension, emoji: '🔎' };
            const text = (post.fullText || post.text || '').slice(0, 90).replace(/\n/g, ' ');
            out(`  ${verdictColor(score.verdict)(String(score.overall).padStart(3))}  ${text}${text.length >= 90 ? '…' : ''}`);
            out(chalk.gray(`       ${meta.emoji} ${meta.label}: ${worst.reason}`));
          }
        } else {
          out('');
          out(chalk.green('  Nothing flagged. This account reads clean against the rubric scored.'));
        }
        out('');
        out(chalk.gray(`  For a downloadable score card, run scripts/reputationAudit.js in the browser on x.com/${source.username}.`));

        if (quiet) console.log(JSON.stringify({ username: source.username, report, scores }, null, 2));
      } catch (error) {
        readSpinner.fail('Reputation scan failed');
        console.error(chalk.red(error.message));
        if (quiet) console.log(JSON.stringify({ username: source?.username, report, error: error.message }, null, 2));
        process.exitCode = 1;
      }
    });
}
