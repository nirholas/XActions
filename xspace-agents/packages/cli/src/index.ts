#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 nirholas (https://github.com/nirholas/xspace-agent) [§32]

import { Command } from 'commander';
import { setVerbose, setQuiet } from './logger';
import { initCommand } from './commands/init';
import { authCommand } from './commands/auth';
import { joinCommand } from './commands/join';
import { startCommand } from './commands/start';
import { dashboardCommand } from './commands/dashboard';

const program = new Command();

program
  .name('xspace-agent')
  .description('CLI tool for X Space AI Agent — join, manage, and interact with X Spaces using AI')
  .version('0.1.0')
  .option('-c, --config <path>', 'path to config file', 'xspace.config.json')
  .option('-p, --port <number>', 'server port', '3000')
  .option('-v, --verbose', 'enable debug logging')
  .option('-q, --quiet', 'suppress all output except errors')
  .option('--headless', 'run browser headless (default: true)')
  .option('--no-headless', 'show browser window (for debugging)')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();
    if (opts.verbose) setVerbose(true);
    if (opts.quiet) setQuiet(true);
  });

program
  .command('init')
  .description('Interactive setup wizard — creates xspace.config.json')
  .action(async () => {
    const opts = program.opts();
    await initCommand({ config: opts.config });
  });

program
  .command('auth')
  .description('Interactive X authentication — saves credentials to .env')
  .action(async () => {
    const opts = program.opts();
    await authCommand({ config: opts.config });
  });

program
  .command('join <url>')
  .description('Join an X Space directly by URL')
  .option('--provider <name>', 'AI provider override (openai, claude, groq)')
  .option('--listen-only', 'transcription mode only, no AI responses')
  .option('--browser <mode>', 'browser mode: managed (default) or connect via CDP')
  .option('--cdp-endpoint <url>', 'full CDP WebSocket endpoint (connect mode)')
  .option('--cdp-port <number>', 'CDP port for auto-discovery (default: 9222)')
  .action(async (url: string, cmdOpts: Record<string, unknown>) => {
    const opts = program.opts();
    await joinCommand(url, {
      config: opts.config,
      provider: cmdOpts.provider as string | undefined,
      listenOnly: cmdOpts.listenOnly as boolean | undefined,
      headless: opts.headless,
      verbose: opts.verbose,
      browser: cmdOpts.browser as string | undefined,
      cdpEndpoint: cmdOpts.cdpEndpoint as string | undefined,
      cdpPort: cmdOpts.cdpPort as string | undefined,
    });
  });

program
  .command('start')
  .description('Start agent with admin panel and web dashboard')
  .action(async () => {
    const opts = program.opts();
    await startCommand({
      config: opts.config,
      port: opts.port,
      headless: opts.headless,
      verbose: opts.verbose,
    });
  });

program
  .command('dashboard')
  .description('Launch web dashboard only (no Space connection)')
  .action(async () => {
    const opts = program.opts();
    await dashboardCommand({ port: opts.port });
  });

program.parse();
