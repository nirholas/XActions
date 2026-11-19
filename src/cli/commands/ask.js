// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * `xactions ask` - ask the toolkit how to do something, in the terminal.
 *
 * The same engine that answers at xactions.app/ask: BM25 over the shipped
 * documentation index, a live GitHub issue search, and the free LLM lanes in
 * src/ask/lanes.js. It needs no API key, and the answer ends with the thing
 * you actually run, whether that is a browser script, another CLI command, or
 * an MCP tool.
 *
 * Offline or rate limited, it still answers: retrieval is local to the
 * installed package, so the documentation digest works with no network at all
 * once the lanes are unreachable.
 *
 *   xactions ask "how do I unfollow everyone?"
 *   xactions ask "scrape followers" --json
 *   echo "how do I download a video" | xactions ask
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license Apache-2.0
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import chalk from 'chalk';

import { ask, createSearcher } from '../../ask/engine.js';
import { createActionMatcher } from '../../ask/actions.js';
import { BYOK_PROVIDERS } from '../../ask/lanes.js';

const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../../dashboard/data');

/** Read the two artifacts that ship with the package. */
async function loadCatalogs() {
  const [index, actions] = await Promise.all([
    readFile(path.join(DATA_DIR, 'ask-index.json'), 'utf8').then(JSON.parse),
    readFile(path.join(DATA_DIR, 'ask-actions.json'), 'utf8').then(JSON.parse),
  ]);
  return { searcher: createSearcher(index), matcher: createActionMatcher(actions) };
}

/**
 * Read a piped question so `echo "..." | xactions ask` works.
 *
 * Only reached when no argument was given at all. `xactions ask ""` is an
 * explicit empty question and must fail immediately: waiting on a pipe that
 * a caller never writes to would hang the command instead of correcting them.
 */
async function readStdin() {
  if (process.stdin.isTTY) return '';
  let data = '';
  for await (const chunk of process.stdin) data += chunk;
  return data.trim();
}

/** Wrap prose to the terminal width without breaking words. */
function wrap(text, width) {
  const out = [];
  for (const paragraph of text.split('\n')) {
    if (paragraph.length <= width) { out.push(paragraph); continue; }
    let line = '';
    for (const word of paragraph.split(' ')) {
      if (line && line.length + word.length + 1 > width) { out.push(line); line = ''; }
      line = line ? `${line} ${word}` : word;
    }
    if (line) out.push(line);
  }
  return out.join('\n');
}

/** Light markdown for a terminal: headings, bold, inline code, list bullets. */
function colorize(text) {
  return text
    .replace(/^#{1,6}\s*(.+)$/gm, (_, h) => chalk.bold.cyan(h))
    .replace(/\*\*([^*]+)\*\*/g, (_, b) => chalk.bold(b))
    .replace(/`([^`]+)`/g, (_, c) => chalk.yellow(c))
    .replace(/^(\s*)[-*]\s+/gm, (_, indent) => `${indent}${chalk.dim('•')} `)
    .replace(/\[(\d+)\]/g, (_, n) => chalk.dim(`[${n}]`));
}

const KIND_LABEL = { script: 'browser script', cli: 'terminal', mcp: 'MCP tool' };

export async function askCommand(question, options = {}) {
  const q = (question === undefined ? await readStdin() : question).trim();
  if (!q) {
    console.error(chalk.red('Ask what? Try: xactions ask "how do I unfollow everyone?"'));
    process.exitCode = 1;
    return;
  }

  let catalogs;
  try {
    catalogs = await loadCatalogs();
  } catch (error) {
    console.error(chalk.red(`The documentation index is missing from this install (${error.message}).`));
    console.error(chalk.dim('Reinstall with: npm install -g xactions'));
    process.exitCode = 1;
    return;
  }

  const byok = options.provider
    ? { provider: options.provider, apiKey: options.key || process.env[`${options.provider.toUpperCase()}_API_KEY`] || '', model: options.model }
    : undefined;
  if (byok && !byok.apiKey) {
    console.error(chalk.red(`--provider ${options.provider} needs a key: pass --key or set ${options.provider.toUpperCase()}_API_KEY.`));
    console.error(chalk.dim(`Providers: ${Object.keys(BYOK_PROVIDERS).join(', ')}`));
    process.exitCode = 1;
    return;
  }

  const width = Math.min(process.stdout.columns || 80, 100);
  const json = Boolean(options.json);
  const quiet = json || options.quiet;
  const collected = { question: q, answer: '', lane: null, model: null, sources: [], actions: [] };

  // The progress line rewrites itself with \r, which only works on a terminal:
  // piped or redirected it would leave "Searching..." stuck before the answer.
  const progress = !quiet && process.stderr.isTTY;
  if (progress) process.stderr.write(chalk.dim('Searching the docs and the repo...\r'));

  // Streaming to stdout as it arrives is the point of a terminal answer, but
  // --json has to stay machine-readable, so nothing prints until the end.
  let printedHeader = false;
  let buffer = '';
  const flush = () => {
    if (!buffer) return;
    process.stdout.write(colorize(wrap(buffer, width)));
    buffer = '';
  };

  try {
    await ask({
      question: q,
      searcher: catalogs.searcher,
      matcher: catalogs.matcher,
      env: process.env,
      byok,
      onEvent: (event) => {
        if (event.type === 'sources') collected.sources = event.sources;
        else if (event.type === 'actions') collected.actions = event.actions;
        else if (event.type === 'lane') {
          collected.lane = event.lane;
          if (!quiet && !printedHeader) {
            printedHeader = true;
            if (progress) process.stderr.write(`${' '.repeat(40)}\r`);
            process.stderr.write(`${chalk.dim(`via ${event.lane}`)}\n\n`);
          }
        } else if (event.type === 'delta') {
          collected.answer += event.text;
          if (json) return;
          // Hold back a partial line so wrapping never splits a word.
          buffer += event.text;
          const cut = buffer.lastIndexOf('\n');
          if (cut !== -1) {
            const ready = buffer.slice(0, cut + 1);
            buffer = buffer.slice(cut + 1);
            process.stdout.write(colorize(wrap(ready, width)));
          }
        } else if (event.type === 'done') {
          collected.model = event.model;
          collected.digest = Boolean(event.digest);
        } else if (event.type === 'error') {
          collected.error = event.message;
        }
      },
    });
  } catch (error) {
    if (progress) process.stderr.write(`${' '.repeat(40)}\r`);
    console.error(chalk.red(`Could not answer: ${error.message}`));
    process.exitCode = 1;
    return;
  }

  if (json) {
    console.log(JSON.stringify(collected, null, 2));
    return;
  }

  flush();
  console.log('\n');

  if (collected.actions.length) {
    console.log(chalk.bold('Run it'));
    for (const action of collected.actions) {
      console.log(`  ${chalk.cyan(KIND_LABEL[action.kind] || action.kind)}  ${chalk.bold(action.title)}`);
      console.log(`    ${chalk.yellow(action.run)}`);
      if (action.kind === 'script' && action.page) console.log(`    ${chalk.dim(`https://xactions.app${action.page}`)}`);
      if (action.kind === 'cli' && action.install) console.log(`    ${chalk.dim(action.install)}`);
    }
    console.log('');
  }

  // Commander turns `--no-sources` into `sources: false`; there is no `noSources`.
  if (collected.sources.length && options.sources !== false) {
    console.log(chalk.bold('Sources'));
    for (const source of collected.sources) {
      console.log(`  ${chalk.dim(`[${source.n}]`)} ${source.title}`);
      console.log(`      ${chalk.dim(source.url)}`);
    }
  }
}

export function registerAskCommand(program) {
  program
    .command('ask [question]')
    .description('Ask how to do something with XActions and get a sourced answer plus what to run')
    .option('--json', 'Print the answer, sources and actions as JSON')
    .option('-q, --quiet', 'Answer only, no progress or lane line')
    .option('--no-sources', 'Skip the source list')
    .option('-p, --provider <name>', `Answer with your own key (${Object.keys(BYOK_PROVIDERS).join(', ')})`)
    .option('-k, --key <key>', 'API key for --provider (defaults to <PROVIDER>_API_KEY)')
    .option('-m, --model <model>', 'Model override for --provider')
    .action((question, options) => askCommand(question, options));
}
