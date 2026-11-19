// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 nirholas (https://github.com/nirholas/xspace-agent) [§76]

import chalk from 'chalk';
import ora from 'ora';
import { resolveConfig, configToEnv, AgentConfig } from '../config';
import { banner, error, info, spacer, debug } from '../logger';

const VOICE_PROVIDERS = ['openai', 'elevenlabs', 'browser'] as const;
type VoiceProvider = (typeof VOICE_PROVIDERS)[number];

interface JoinOptions {
  config: string;
  provider?: string;
  listenOnly?: boolean;
  headless?: boolean;
  verbose?: boolean;
  browser?: string;
  cdpEndpoint?: string;
  cdpPort?: string;
}

export async function joinCommand(spaceUrl: string, options: JoinOptions): Promise<void> {
  banner();

  // Validate URL
  if (!spaceUrl || !spaceUrl.includes('x.com/i/spaces/')) {
    error('Invalid Space URL. Expected format: https://x.com/i/spaces/...');
    error('Hint: Open the Space in your browser and copy the URL from the address bar.');
    process.exit(1);
  }

  // Load config and apply to env
  require('dotenv').config();
  const cliFlags: Partial<AgentConfig> = {};
  if (options.provider) {
    cliFlags.ai = { provider: options.provider };
  }
  const config = resolveConfig(options.config, cliFlags);
  configToEnv(config);

  const voiceProvider = config.voice?.provider || process.env.TTS_PROVIDER || 'openai';
  if (!(VOICE_PROVIDERS as readonly string[]).includes(voiceProvider)) {
    error(`Unknown voice provider "${voiceProvider}". Expected one of: ${VOICE_PROVIDERS.join(', ')}.`);
    process.exit(1);
  }

  if (options.listenOnly) {
    info(chalk.yellow('  Listen-only mode (transcription only)'));
  }

  spacer();

  const spinner = ora(
    options.browser === 'connect' ? 'Connecting to Chrome...' : 'Launching browser...'
  ).start();

  try {
    const { XSpaceAgent } = await import('xspace-agent');

    // Resolve provider and API key from config/env
    const provider = (options.provider || config.ai?.provider || process.env.AI_PROVIDER || 'openai') as any;

    const apiKeyMap: Record<string, string | undefined> = {
      openai: process.env.OPENAI_API_KEY,
      'openai-chat': process.env.OPENAI_API_KEY,
      claude: process.env.ANTHROPIC_API_KEY,
      groq: process.env.GROQ_API_KEY,
    };

    // Build browser config
    const browserConfig: Record<string, any> = {
      headless: options.headless !== false,
    };
    if (options.browser === 'connect') {
      browserConfig.mode = 'connect';
      if (options.cdpEndpoint) browserConfig.cdpEndpoint = options.cdpEndpoint;
      if (options.cdpPort) browserConfig.cdpPort = parseInt(options.cdpPort, 10);
    }

    const agent = new XSpaceAgent({
      auth: {
        token: process.env.X_AUTH_TOKEN,
        ct0: process.env.X_CT0,
        username: process.env.X_USERNAME,
        password: process.env.X_PASSWORD,
        email: process.env.X_EMAIL,
      },
      ai: {
        provider,
        apiKey: apiKeyMap[provider] || process.env.OPENAI_API_KEY || '',
        systemPrompt: config.ai?.systemPrompt || 'You are a helpful AI agent participating in an X Space.',
      },
      voice: {
        provider: voiceProvider as VoiceProvider,
        apiKey: process.env.ELEVENLABS_API_KEY || process.env.OPENAI_API_KEY,
      },
      browser: browserConfig,
      behavior: {
        autoRespond: !options.listenOnly,
        silenceThreshold: 1.5,
      },
    });

    // Wire up event listeners for CLI output
    agent.on('status', (status: string) => {
      debug('Status:', status);
      switch (status) {
        case 'launching':
          spinner.text = 'Launching browser...';
          break;
        case 'authenticating':
          spinner.text = 'Logging in...';
          break;
        case 'joining':
          spinner.text = 'Joining Space...';
          break;
        case 'listening':
          spinner.succeed('Active in Space');
          info(chalk.green('  Listening... (Ctrl+C to leave)'));
          spacer();
          break;
        case 'stopped':
          info(chalk.yellow('\n  Space has ended'));
          cleanup();
          break;
      }
    });

    agent.on('transcription', ({ speaker, text }: { speaker: string; text: string }) => {
      const time = new Date().toLocaleTimeString();
      console.log(`  ${chalk.gray(time)} ${chalk.blue(`[${speaker}]`)}: ${text}`);
    });

    agent.on('response', ({ text }: { text: string }) => {
      if (options.verbose) {
        const time = new Date().toLocaleTimeString();
        console.log(`  ${chalk.gray(time)} ${chalk.green('[Agent]')}: ${text}`);
      }
    });

    agent.on('error', (err: Error) => {
      error(err.message);
    });

    // Graceful shutdown
    const cleanup = async () => {
      spacer();
      const stopSpinner = ora('Leaving Space...').start();
      try {
        await agent.leave();
        stopSpinner.succeed('Left Space');
      } catch {
        stopSpinner.fail('Error during cleanup');
      }
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    // Join the Space
    await agent.join(spaceUrl);
  } catch (err: unknown) {
    spinner.fail('Failed');
    const message = err instanceof Error ? err.message : String(err);
    error(message);
    process.exit(1);
  }
}
