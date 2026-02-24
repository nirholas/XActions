#!/usr/bin/env node
/**
 * XActions CLI
 * Command-line interface for X/Twitter automation
 * 
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @see https://xactions.app
 * @license MIT
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

import scrapers from '../scrapers/index.js';

const program = new Command();

// Config file path
const CONFIG_DIR = path.join(os.homedir(), '.xactions');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

// ============================================================================
// Helpers
// ============================================================================

async function loadConfig() {
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function saveConfig(config) {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
}

function formatNumber(num) {
  if (typeof num === 'string') {
    num = parseFloat(num.replace(/[,K]/g, (m) => (m === 'K' ? '000' : '')));
  }
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return String(num);
}

// ============================================================================
// CLI Setup
// ============================================================================

program
  .name('xactions')
  .description(chalk.bold('⚡ XActions - The Complete X/Twitter Automation Toolkit'))
  .version('3.0.0');

// ============================================================================
// Auth Commands
// ============================================================================

program
  .command('login')
  .description('Set up authentication with session cookie')
  .action(async () => {
    console.log(chalk.cyan('\n⚡ XActions Login Setup\n'));
    console.log(chalk.gray('To get your auth_token cookie:'));
    console.log(chalk.gray('1. Go to x.com and log in'));
    console.log(chalk.gray('2. Open DevTools (F12) → Application → Cookies'));
    console.log(chalk.gray('3. Find "auth_token" and copy its value\n'));

    const { cookie } = await inquirer.prompt([
      {
        type: 'password',
        name: 'cookie',
        message: 'Enter your auth_token cookie:',
        mask: '*',
      },
    ]);

    const config = await loadConfig();
    config.authToken = cookie;
    await saveConfig(config);

    console.log(chalk.green('\n✓ Authentication saved!\n'));
  });

program
  .command('logout')
  .description('Remove saved authentication')
  .action(async () => {
    const config = await loadConfig();
    delete config.authToken;
    await saveConfig(config);
    console.log(chalk.green('\n✓ Logged out successfully\n'));
  });

// ============================================================================
// Profile Commands
// ============================================================================

program
  .command('profile <username>')
  .description('Get profile information for a user')
  .option('-j, --json', 'Output as JSON')
  .action(async (username, options) => {
    const spinner = ora(`Fetching profile for @${username}`).start();

    try {
      const browser = await scrapers.createBrowser();
      const page = await scrapers.createPage(browser);

      const config = await loadConfig();
      if (config.authToken) {
        await scrapers.loginWithCookie(page, config.authToken);
      }

      const profile = await scrapers.scrapeProfile(page, username);
      await browser.close();

      spinner.stop();

      if (options.json) {
        console.log(JSON.stringify(profile, null, 2));
      } else {
        console.log(chalk.bold(`\n⚡ @${profile.username || username}\n`));
        console.log(`  ${chalk.cyan('Name:')}      ${profile.name || 'N/A'}`);
        console.log(`  ${chalk.cyan('Bio:')}       ${profile.bio || 'N/A'}`);
        console.log(`  ${chalk.cyan('Location:')}  ${profile.location || 'N/A'}`);
        console.log(`  ${chalk.cyan('Website:')}   ${profile.website || 'N/A'}`);
        console.log(`  ${chalk.cyan('Joined:')}    ${profile.joined || 'N/A'}`);
        console.log(
          `  ${chalk.cyan('Following:')} ${formatNumber(profile.following || 0)}  ${chalk.cyan('Followers:')} ${formatNumber(profile.followers || 0)}`
        );
        if (profile.verified) console.log(`  ${chalk.blue('✓ Verified')}`);
        console.log();
      }
    } catch (error) {
      spinner.fail('Failed to fetch profile');
      console.error(chalk.red(error.message));
    }
  });

// ============================================================================
// Scraper Commands
// ============================================================================

program
  .command('followers <username>')
  .description('Scrape followers for a user')
  .option('-l, --limit <number>', 'Maximum followers to scrape', '100')
  .option('-o, --output <file>', 'Output file (json or csv)')
  .action(async (username, options) => {
    const limit = parseInt(options.limit);
    const spinner = ora(`Scraping followers for @${username}`).start();

    try {
      const browser = await scrapers.createBrowser();
      const page = await scrapers.createPage(browser);

      const config = await loadConfig();
      if (config.authToken) {
        await scrapers.loginWithCookie(page, config.authToken);
      }

      const followers = await scrapers.scrapeFollowers(page, username, {
        limit,
        onProgress: ({ scraped }) => {
          spinner.text = `Scraping followers for @${username} (${scraped}/${limit})`;
        },
      });
      await browser.close();

      spinner.succeed(`Scraped ${followers.length} followers`);

      if (options.output) {
        const ext = path.extname(options.output).toLowerCase();
        if (ext === '.csv') {
          await scrapers.exportToCSV(followers, options.output);
        } else {
          await scrapers.exportToJSON(followers, options.output);
        }
        console.log(chalk.green(`✓ Saved to ${options.output}`));
      } else {
        console.log(JSON.stringify(followers, null, 2));
      }
    } catch (error) {
      spinner.fail('Failed to scrape followers');
      console.error(chalk.red(error.message));
    }
  });

program
  .command('following <username>')
  .description('Scrape accounts a user is following')
  .option('-l, --limit <number>', 'Maximum to scrape', '100')
  .option('-o, --output <file>', 'Output file (json or csv)')
  .action(async (username, options) => {
    const limit = parseInt(options.limit);
    const spinner = ora(`Scraping following for @${username}`).start();

    try {
      const browser = await scrapers.createBrowser();
      const page = await scrapers.createPage(browser);

      const config = await loadConfig();
      if (config.authToken) {
        await scrapers.loginWithCookie(page, config.authToken);
      }

      const following = await scrapers.scrapeFollowing(page, username, {
        limit,
        onProgress: ({ scraped }) => {
          spinner.text = `Scraping following for @${username} (${scraped}/${limit})`;
        },
      });
      await browser.close();

      spinner.succeed(`Scraped ${following.length} following`);

      if (options.output) {
        const ext = path.extname(options.output).toLowerCase();
        if (ext === '.csv') {
          await scrapers.exportToCSV(following, options.output);
        } else {
          await scrapers.exportToJSON(following, options.output);
        }
        console.log(chalk.green(`✓ Saved to ${options.output}`));
      } else {
        console.log(JSON.stringify(following, null, 2));
      }
    } catch (error) {
      spinner.fail('Failed to scrape following');
      console.error(chalk.red(error.message));
    }
  });

program
  .command('non-followers <username>')
  .description('Find accounts that don\'t follow back')
  .option('-l, --limit <number>', 'Maximum to check', '500')
  .option('-o, --output <file>', 'Output file')
  .action(async (username, options) => {
    const limit = parseInt(options.limit);
    const spinner = ora('Analyzing follow relationships...').start();

    try {
      const browser = await scrapers.createBrowser();
      const page = await scrapers.createPage(browser);

      const config = await loadConfig();
      if (config.authToken) {
        await scrapers.loginWithCookie(page, config.authToken);
      }

      spinner.text = 'Scraping following list...';
      const following = await scrapers.scrapeFollowing(page, username, { limit });

      await browser.close();

      const nonFollowers = following.filter((u) => !u.followsBack);
      const mutuals = following.filter((u) => u.followsBack);

      spinner.succeed('Analysis complete!');

      console.log(chalk.bold('\n📊 Follow Analysis\n'));
      console.log(`  ${chalk.cyan('Total Following:')} ${following.length}`);
      console.log(`  ${chalk.green('Mutuals:')}         ${mutuals.length}`);
      console.log(`  ${chalk.red('Non-Followers:')}   ${nonFollowers.length}`);
      console.log();

      if (nonFollowers.length > 0) {
        console.log(chalk.yellow('Non-followers:'));
        nonFollowers.slice(0, 20).forEach((u) => {
          console.log(`  @${u.username} - ${u.name || 'Unknown'}`);
        });
        if (nonFollowers.length > 20) {
          console.log(chalk.gray(`  ... and ${nonFollowers.length - 20} more`));
        }
      }

      if (options.output) {
        await scrapers.exportToJSON(nonFollowers, options.output);
        console.log(chalk.green(`\n✓ Full list saved to ${options.output}`));
      }
    } catch (error) {
      spinner.fail('Failed to analyze');
      console.error(chalk.red(error.message));
    }
  });

program
  .command('tweets <username>')
  .description('Scrape tweets from a user')
  .option('-l, --limit <number>', 'Maximum tweets', '50')
  .option('-r, --replies', 'Include replies')
  .option('-o, --output <file>', 'Output file')
  .action(async (username, options) => {
    const limit = parseInt(options.limit);
    const spinner = ora(`Scraping tweets from @${username}`).start();

    try {
      const browser = await scrapers.createBrowser();
      const page = await scrapers.createPage(browser);

      const config = await loadConfig();
      if (config.authToken) {
        await scrapers.loginWithCookie(page, config.authToken);
      }

      const tweets = await scrapers.scrapeTweets(page, username, {
        limit,
        includeReplies: options.replies,
      });
      await browser.close();

      spinner.succeed(`Scraped ${tweets.length} tweets`);

      if (options.output) {
        const ext = path.extname(options.output).toLowerCase();
        if (ext === '.csv') {
          await scrapers.exportToCSV(tweets, options.output);
        } else {
          await scrapers.exportToJSON(tweets, options.output);
        }
        console.log(chalk.green(`✓ Saved to ${options.output}`));
      } else {
        console.log(JSON.stringify(tweets, null, 2));
      }
    } catch (error) {
      spinner.fail('Failed to scrape tweets');
      console.error(chalk.red(error.message));
    }
  });

program
  .command('search <query>')
  .description('Search for tweets')
  .option('-l, --limit <number>', 'Maximum results', '50')
  .option('-f, --filter <type>', 'Filter: latest, top, people, photos, videos', 'latest')
  .option('-o, --output <file>', 'Output file')
  .action(async (query, options) => {
    const limit = parseInt(options.limit);
    const spinner = ora(`Searching for "${query}"`).start();

    try {
      const browser = await scrapers.createBrowser();
      const page = await scrapers.createPage(browser);

      const config = await loadConfig();
      if (config.authToken) {
        await scrapers.loginWithCookie(page, config.authToken);
      }

      const tweets = await scrapers.searchTweets(page, query, {
        limit,
        filter: options.filter,
      });
      await browser.close();

      spinner.succeed(`Found ${tweets.length} tweets`);

      if (options.output) {
        await scrapers.exportToJSON(tweets, options.output);
        console.log(chalk.green(`✓ Saved to ${options.output}`));
      } else {
        console.log(JSON.stringify(tweets, null, 2));
      }
    } catch (error) {
      spinner.fail('Search failed');
      console.error(chalk.red(error.message));
    }
  });

program
  .command('hashtag <tag>')
  .description('Scrape tweets for a hashtag')
  .option('-l, --limit <number>', 'Maximum results', '50')
  .option('-o, --output <file>', 'Output file')
  .action(async (tag, options) => {
    const limit = parseInt(options.limit);
    const hashtag = tag.startsWith('#') ? tag : `#${tag}`;
    const spinner = ora(`Scraping ${hashtag}`).start();

    try {
      const browser = await scrapers.createBrowser();
      const page = await scrapers.createPage(browser);

      const config = await loadConfig();
      if (config.authToken) {
        await scrapers.loginWithCookie(page, config.authToken);
      }

      const tweets = await scrapers.scrapeHashtag(page, tag, { limit });
      await browser.close();

      spinner.succeed(`Found ${tweets.length} tweets`);

      if (options.output) {
        await scrapers.exportToJSON(tweets, options.output);
        console.log(chalk.green(`✓ Saved to ${options.output}`));
      } else {
        console.log(JSON.stringify(tweets, null, 2));
      }
    } catch (error) {
      spinner.fail('Scraping failed');
      console.error(chalk.red(error.message));
    }
  });

program
  .command('thread <url>')
  .description('Scrape a full tweet thread')
  .option('-o, --output <file>', 'Output file')
  .action(async (url, options) => {
    const spinner = ora('Scraping thread...').start();

    try {
      const browser = await scrapers.createBrowser();
      const page = await scrapers.createPage(browser);

      const config = await loadConfig();
      if (config.authToken) {
        await scrapers.loginWithCookie(page, config.authToken);
      }

      const thread = await scrapers.scrapeThread(page, url);
      await browser.close();

      spinner.succeed(`Scraped ${thread.length} tweets in thread`);

      if (options.output) {
        await scrapers.exportToJSON(thread, options.output);
        console.log(chalk.green(`✓ Saved to ${options.output}`));
      } else {
        console.log('\n' + chalk.bold('🧵 Thread:\n'));
        thread.forEach((tweet, i) => {
          console.log(chalk.cyan(`${i + 1}.`) + ` ${tweet.text?.slice(0, 100)}...`);
          console.log(chalk.gray(`   ${tweet.timestamp || ''}\n`));
        });
      }
    } catch (error) {
      spinner.fail('Failed to scrape thread');
      console.error(chalk.red(error.message));
    }
  });

program
  .command('media <username>')
  .description('Scrape media from a user')
  .option('-l, --limit <number>', 'Maximum items', '50')
  .option('-o, --output <file>', 'Output file')
  .action(async (username, options) => {
    const limit = parseInt(options.limit);
    const spinner = ora(`Scraping media from @${username}`).start();

    try {
      const browser = await scrapers.createBrowser();
      const page = await scrapers.createPage(browser);

      const config = await loadConfig();
      if (config.authToken) {
        await scrapers.loginWithCookie(page, config.authToken);
      }

      const media = await scrapers.scrapeMedia(page, username, { limit });
      await browser.close();

      spinner.succeed(`Found ${media.length} media items`);

      if (options.output) {
        await scrapers.exportToJSON(media, options.output);
        console.log(chalk.green(`✓ Saved to ${options.output}`));
      } else {
        console.log(JSON.stringify(media, null, 2));
      }
    } catch (error) {
      spinner.fail('Failed to scrape media');
      console.error(chalk.red(error.message));
    }
  });

// ============================================================================
// Plugin Commands
// ============================================================================

const pluginCmd = program
  .command('plugin')
  .description('Manage XActions plugins');

pluginCmd
  .command('install <name>')
  .description('Install a plugin (npm package name or local path)')
  .action(async (name) => {
    const spinner = ora(`Installing plugin "${name}"`).start();
    try {
      const { installPlugin } = await import('../plugins/manager.js');
      const info = await installPlugin(name);
      spinner.succeed(`Installed plugin "${info.name}" v${info.version}`);
      console.log(chalk.gray(`  ${info.description || ''}`));
      if (info.tools) console.log(chalk.cyan(`  MCP tools: ${info.tools}`));
      if (info.scrapers) console.log(chalk.cyan(`  Scrapers: ${info.scrapers}`));
      if (info.routes) console.log(chalk.cyan(`  API routes: ${info.routes}`));
      if (info.actions) console.log(chalk.cyan(`  Browser actions: ${info.actions}`));
    } catch (error) {
      spinner.fail(`Failed to install plugin "${name}"`);
      console.error(chalk.red(error.message));
    }
  });

pluginCmd
  .command('remove <name>')
  .description('Remove an installed plugin')
  .action(async (name) => {
    const spinner = ora(`Removing plugin "${name}"`).start();
    try {
      const { removePlugin } = await import('../plugins/manager.js');
      await removePlugin(name);
      spinner.succeed(`Removed plugin "${name}"`);
    } catch (error) {
      spinner.fail(`Failed to remove plugin "${name}"`);
      console.error(chalk.red(error.message));
    }
  });

pluginCmd
  .command('list')
  .description('List installed plugins')
  .action(async () => {
    try {
      const { listPlugins } = await import('../plugins/manager.js');
      const plugins = await listPlugins();

      if (plugins.length === 0) {
        console.log(chalk.gray('\n  No plugins installed.'));
        console.log(chalk.gray('  Install one with: xactions plugin install <name>\n'));
        return;
      }

      console.log(chalk.bold.cyan('\n⚡ Installed Plugins\n'));
      for (const p of plugins) {
        const status = p.enabled
          ? chalk.green('● enabled')
          : chalk.gray('○ disabled');
        console.log(`  ${status}  ${chalk.bold(p.name)} ${chalk.gray('v' + p.version)}`);
        if (p.description) console.log(`         ${chalk.gray(p.description)}`);
      }
      console.log('');
    } catch (error) {
      console.error(chalk.red('Failed to list plugins: ' + error.message));
    }
  });

pluginCmd
  .command('enable <name>')
  .description('Enable a disabled plugin')
  .action(async (name) => {
    try {
      const { enablePlugin } = await import('../plugins/manager.js');
      await enablePlugin(name);
      console.log(chalk.green(`✓ Plugin "${name}" enabled`));
    } catch (error) {
      console.error(chalk.red(error.message));
    }
  });

pluginCmd
  .command('disable <name>')
  .description('Disable a plugin without removing it')
  .action(async (name) => {
    try {
      const { disablePlugin } = await import('../plugins/manager.js');
      await disablePlugin(name);
      console.log(chalk.green(`✓ Plugin "${name}" disabled`));
    } catch (error) {
      console.error(chalk.red(error.message));
    }
  });

pluginCmd
  .command('discover')
  .description('Discover XActions plugins in node_modules')
  .action(async () => {
    const spinner = ora('Scanning node_modules...').start();
    try {
      const { discoverPlugins } = await import('../plugins/loader.js');
      const found = await discoverPlugins();

      if (found.length === 0) {
        spinner.info('No XActions plugins found in node_modules.');
        console.log(chalk.gray('  Install plugins with: npm install xactions-plugin-<name>'));
      } else {
        spinner.succeed(`Found ${found.length} plugin(s):`);
        for (const name of found) {
          console.log(chalk.cyan(`  • ${name}`));
        }
        console.log(chalk.gray('\n  Install with: xactions plugin install <name>'));
      }
    } catch (error) {
      spinner.fail('Failed to discover plugins');
      console.error(chalk.red(error.message));
    }
  });

// ============================================================================
// Stream Commands
// ============================================================================

const streamCmd = program
  .command('stream')
  .description('Real-time event streaming for X/Twitter accounts');

streamCmd
  .command('start <type> <username>')
  .description('Start a stream (type: tweet, follower, mention)')
  .option('-i, --interval <seconds>', 'Poll interval in seconds', '60')
  .action(async (type, username, options) => {
    const spinner = ora(`Starting ${type} stream for @${username}`).start();
    try {
      const { createStream } = await import('../streaming/index.js');
      const config = await loadConfig();
      const stream = await createStream({
        type,
        username,
        interval: parseInt(options.interval, 10) * 1000,
        authToken: config.authToken || undefined,
      });
      spinner.succeed(`Stream started: ${stream.id}`);
      console.log(chalk.gray(`  Type: ${stream.type}`));
      console.log(chalk.gray(`  Username: @${stream.username}`));
      console.log(chalk.gray(`  Interval: ${stream.interval / 1000}s`));
      console.log(chalk.cyan('\n  Events will be emitted via Socket.IO.'));
      console.log(chalk.cyan(`  Room: stream:${stream.id}`));
    } catch (error) {
      spinner.fail('Failed to start stream');
      console.error(chalk.red(error.message));
    }
  });

streamCmd
  .command('stop <streamId>')
  .description('Stop an active stream')
  .action(async (streamId) => {
    const spinner = ora(`Stopping stream ${streamId}`).start();
    try {
      const { stopStream } = await import('../streaming/index.js');
      await stopStream(streamId);
      spinner.succeed(`Stream stopped: ${streamId}`);
    } catch (error) {
      spinner.fail('Failed to stop stream');
      console.error(chalk.red(error.message));
    }
  });

streamCmd
  .command('list')
  .description('List active streams')
  .action(async () => {
    try {
      const { listStreams, getPoolStatus } = await import('../streaming/index.js');
      const streams = await listStreams();
      const pool = getPoolStatus();

      if (streams.length === 0) {
        console.log(chalk.gray('\n  No active streams.'));
        console.log(chalk.gray('  Start one with: xactions stream start <type> <username>\n'));
        return;
      }

      console.log(chalk.bold.cyan('\n📡 Active Streams\n'));
      for (const s of streams) {
        const statusColor = s.status === 'running' ? chalk.green : chalk.yellow;
        console.log(`  ${statusColor('●')} ${chalk.bold(s.id)}`);
        console.log(`    Type: ${s.type}  User: @${s.username}  Interval: ${s.interval / 1000}s`);
        console.log(`    Status: ${statusColor(s.status)}  Polls: ${s.pollCount}  Errors: ${s.errorCount}`);
        if (s.lastPollAt) console.log(chalk.gray(`    Last poll: ${s.lastPollAt}`));
        console.log('');
      }

      console.log(chalk.gray(`  Browser pool: ${pool.browsers}/${pool.maxBrowsers} browsers`));
      console.log('');
    } catch (error) {
      console.error(chalk.red('Failed to list streams: ' + error.message));
    }
  });

streamCmd
  .command('history <streamId>')
  .description('Show recent events for a stream')
  .option('-l, --limit <number>', 'Max events', '20')
  .option('-t, --type <eventType>', 'Filter by event type (e.g. stream:tweet)')
  .action(async (streamId, options) => {
    try {
      const { getStreamHistory } = await import('../streaming/index.js');
      const events = await getStreamHistory(streamId, {
        limit: parseInt(options.limit, 10),
        eventType: options.type,
      });

      if (events.length === 0) {
        console.log(chalk.gray('\n  No events yet for this stream.\n'));
        return;
      }

      console.log(chalk.bold.cyan(`\n📡 Events for ${streamId}\n`));
      for (const e of events) {
        const time = chalk.gray(new Date(e.timestamp).toLocaleTimeString());
        const type = chalk.cyan(e.type);
        console.log(`  ${time} ${type}`);
        if (e.data?.text) console.log(`    ${e.data.text.slice(0, 120)}`);
        if (e.data?.action) console.log(`    ${e.data.action}: ${e.data.follower || e.data.delta || ''}`);
      }
      console.log('');
    } catch (error) {
      console.error(chalk.red('Failed to get history: ' + error.message));
    }
  });

streamCmd
  .command('pause <streamId>')
  .description('Pause an active stream (retains state)')
  .action(async (streamId) => {
    const spinner = ora(`Pausing stream ${streamId}`).start();
    try {
      const { pauseStream } = await import('../streaming/index.js');
      await pauseStream(streamId);
      spinner.succeed(`Stream paused: ${streamId}`);
      console.log(chalk.gray('  Resume with: xactions stream resume ' + streamId));
    } catch (error) {
      spinner.fail('Failed to pause stream');
      console.error(chalk.red(error.message));
    }
  });

streamCmd
  .command('resume <streamId>')
  .description('Resume a paused stream')
  .action(async (streamId) => {
    const spinner = ora(`Resuming stream ${streamId}`).start();
    try {
      const { resumeStream } = await import('../streaming/index.js');
      await resumeStream(streamId);
      spinner.succeed(`Stream resumed: ${streamId}`);
    } catch (error) {
      spinner.fail('Failed to resume stream');
      console.error(chalk.red(error.message));
    }
  });

streamCmd
  .command('status <streamId>')
  .description('Get detailed status of a stream')
  .action(async (streamId) => {
    try {
      const { getStreamStatus } = await import('../streaming/index.js');
      const s = await getStreamStatus(streamId);
      if (!s) {
        console.log(chalk.red(`\n  Stream not found: ${streamId}\n`));
        return;
      }
      const statusColor = s.status === 'running' ? chalk.green : s.status === 'paused' ? chalk.yellow : chalk.red;
      console.log(chalk.bold.cyan(`\n📡 Stream ${s.id}\n`));
      console.log(`  Type:      ${s.type}`);
      console.log(`  Username:  @${s.username}`);
      console.log(`  Status:    ${statusColor(s.status)}`);
      console.log(`  Interval:  ${s.interval / 1000}s`);
      console.log(`  Polls:     ${s.pollCount}`);
      console.log(`  Events:    ${s.eventCount || 0}`);
      console.log(`  Errors:    ${s.errorCount}`);
      if (s.lastPollAt) console.log(`  Last poll: ${chalk.gray(s.lastPollAt)}`);
      if (s.createdAt) console.log(`  Created:   ${chalk.gray(s.createdAt)}`);
      console.log('');
    } catch (error) {
      console.error(chalk.red('Failed to get status: ' + error.message));
    }
  });

streamCmd
  .command('stop-all')
  .description('Stop all active streams')
  .action(async () => {
    const spinner = ora('Stopping all streams').start();
    try {
      const { stopAllStreams } = await import('../streaming/index.js');
      const result = await stopAllStreams();
      spinner.succeed(`All streams stopped (${result.stopped || 0} streams)`);
    } catch (error) {
      spinner.fail('Failed to stop all streams');
      console.error(chalk.red(error.message));
    }
  });

// ============================================================================
// Workflow Commands
// ============================================================================

const workflowCmd = program
  .command('workflow')
  .description('Manage and run automation workflows');

workflowCmd
  .command('create')
  .description('Create a workflow from a JSON file or interactively')
  .option('-f, --file <path>', 'Path to workflow JSON file')
  .action(async (options) => {
    try {
      const workflows = (await import('../workflows/index.js')).default;

      if (options.file) {
        const content = await fs.readFile(options.file, 'utf-8');
        const definition = JSON.parse(content);
        const workflow = await workflows.create(definition);
        console.log(chalk.green(`✓ Workflow created: ${workflow.name} (${workflow.id})`));
        return;
      }

      // Interactive creation
      const answers = await inquirer.prompt([
        { type: 'input', name: 'name', message: 'Workflow name:' },
        { type: 'input', name: 'description', message: 'Description (optional):' },
        {
          type: 'list',
          name: 'triggerType',
          message: 'Trigger type:',
          choices: ['manual', 'schedule', 'webhook'],
        },
        {
          type: 'input',
          name: 'cron',
          message: 'Cron expression (e.g., */30 * * * *):',
          when: (a) => a.triggerType === 'schedule',
        },
      ]);

      const trigger = { type: answers.triggerType };
      if (answers.cron) trigger.cron = answers.cron;

      const workflow = await workflows.create({
        name: answers.name,
        description: answers.description,
        trigger,
        steps: [],
      });

      console.log(chalk.green(`✓ Workflow created: ${workflow.name} (${workflow.id})`));
      console.log(chalk.gray('  Add steps by editing the workflow JSON or using the API.'));
    } catch (error) {
      console.error(chalk.red('Failed to create workflow: ' + error.message));
    }
  });

workflowCmd
  .command('run <name>')
  .description('Run a workflow by name or ID')
  .option('--auth <token>', 'X/Twitter session cookie for authentication')
  .action(async (name, options) => {
    const spinner = ora(`Running workflow "${name}"`).start();
    try {
      const workflows = (await import('../workflows/index.js')).default;
      const config = await loadConfig();

      const result = await workflows.run(name, {
        trigger: 'cli',
        authToken: options.auth || config.authToken,
        onProgress: (event) => {
          if (event.type === 'step_start') {
            spinner.text = `Step ${event.step + 1}/${event.total}: ${event.name}`;
          } else if (event.type === 'step_error') {
            spinner.warn(`Step error: ${event.error}`);
          } else if (event.type === 'condition_failed') {
            spinner.info(`Condition not met at step ${event.step}: ${event.details}`);
          }
        },
      });

      if (result.status === 'completed') {
        spinner.succeed(`Workflow "${result.workflowName}" completed (${result.stepsCompleted}/${result.totalSteps} steps)`);
      } else if (result.status === 'failed') {
        spinner.fail(`Workflow failed: ${result.error}`);
      } else {
        spinner.info(`Workflow finished with status: ${result.status}`);
      }

      if (result.steps) {
        console.log(chalk.bold('\nStep Results:'));
        for (const step of result.steps) {
          const icon = step.status === 'completed' ? chalk.green('✓') : step.status === 'skipped' ? chalk.yellow('○') : chalk.red('✗');
          console.log(`  ${icon} ${step.name} — ${step.status}`);
          if (step.error) console.log(chalk.red(`    Error: ${step.error}`));
        }
      }
    } catch (error) {
      spinner.fail('Failed to run workflow');
      console.error(chalk.red(error.message));
    }
  });

workflowCmd
  .command('list')
  .description('List all workflows')
  .action(async () => {
    try {
      const workflows = (await import('../workflows/index.js')).default;
      const list = await workflows.list();

      if (list.length === 0) {
        console.log(chalk.gray('\n  No workflows found.'));
        console.log(chalk.gray('  Create one with: xactions workflow create -f workflow.json\n'));
        return;
      }

      console.log(chalk.bold.cyan('\n⚡ Workflows\n'));
      for (const wf of list) {
        const status = wf.enabled ? chalk.green('● enabled') : chalk.gray('○ disabled');
        const trigger = wf.trigger?.type || 'manual';
        console.log(`  ${status}  ${chalk.bold(wf.name)} ${chalk.gray(`(${wf.id?.slice(0, 8)}...)`)}`);
        console.log(`         Trigger: ${trigger}  Steps: ${wf.stepsCount}`);
        if (wf.description) console.log(`         ${chalk.gray(wf.description)}`);
        console.log('');
      }
    } catch (error) {
      console.error(chalk.red('Failed to list workflows: ' + error.message));
    }
  });

workflowCmd
  .command('delete <id>')
  .description('Delete a workflow')
  .action(async (id) => {
    try {
      const workflows = (await import('../workflows/index.js')).default;
      const deleted = await workflows.remove(id);
      if (deleted) {
        console.log(chalk.green(`✓ Workflow deleted: ${id}`));
      } else {
        console.log(chalk.red(`Workflow not found: ${id}`));
      }
    } catch (error) {
      console.error(chalk.red('Failed to delete workflow: ' + error.message));
    }
  });

workflowCmd
  .command('actions')
  .description('List available workflow actions')
  .action(async () => {
    try {
      const workflows = (await import('../workflows/index.js')).default;
      const actions = workflows.listActions();

      console.log(chalk.bold.cyan('\n⚡ Available Workflow Actions\n'));

      const categories = {};
      for (const action of actions) {
        const cat = action.category || 'general';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(action);
      }

      for (const [cat, acts] of Object.entries(categories)) {
        console.log(chalk.bold(`  ${cat.toUpperCase()}`));
        for (const a of acts) {
          console.log(`    ${chalk.cyan(a.name)} — ${a.description}`);
        }
        console.log('');
      }
    } catch (error) {
      console.error(chalk.red('Failed to list actions: ' + error.message));
    }
  });

workflowCmd
  .command('runs <workflowId>')
  .description('Show execution history for a workflow')
  .option('-l, --limit <number>', 'Max runs to show', '10')
  .action(async (workflowId, options) => {
    try {
      const workflows = (await import('../workflows/index.js')).default;
      const runsList = await workflows.runs(workflowId, parseInt(options.limit, 10));

      if (runsList.length === 0) {
        console.log(chalk.gray('\n  No runs found for this workflow.\n'));
        return;
      }

      console.log(chalk.bold.cyan('\n📊 Execution History\n'));
      for (const r of runsList) {
        const statusIcon = r.status === 'completed' ? chalk.green('✓') : r.status === 'failed' ? chalk.red('✗') : chalk.yellow('●');
        const time = r.startedAt ? new Date(r.startedAt).toLocaleString() : 'N/A';
        console.log(`  ${statusIcon} ${chalk.gray(r.id?.slice(0, 8))}  ${r.status}  ${r.stepsCompleted}/${r.totalSteps} steps  ${chalk.gray(time)}`);
        if (r.error) console.log(chalk.red(`    Error: ${r.error}`));
      }
      console.log('');
    } catch (error) {
      console.error(chalk.red('Failed to get runs: ' + error.message));
    }
  });

// ============================================================================
// Portability Commands (export, migrate, diff)
// ============================================================================

program
  .command('export <username>')
  .description('Export a Twitter account (profile, tweets, followers, following, bookmarks)')
  .option('-f, --format <formats>', 'Output formats: json,csv,md,html (comma-separated)', 'json,csv,md,html')
  .option('--only <phases>', 'Export only specific phases: profile,tweets,followers,following,bookmarks,likes (comma-separated)')
  .option('-l, --limit <number>', 'Maximum items per phase', '500')
  .option('-o, --output <dir>', 'Custom output directory')
  .action(async (username, options) => {
    const user = username.replace(/^@/, '');
    const formats = options.format.split(',').map((s) => s.trim());
    const only = options.only ? options.only.split(',').map((s) => s.trim()) : undefined;
    const limit = parseInt(options.limit) || 500;

    const spinner = ora(`Exporting @${user}...`).start();

    try {
      const browser = await scrapers.createBrowser();
      const page = await scrapers.createPage(browser);

      const config = await loadConfig();
      if (config.authToken) {
        await scrapers.loginWithCookie(page, config.authToken);
      }

      const { exportAccount } = await import('../portability/exporter.js');
      const summary = await exportAccount({
        page,
        username: user,
        formats,
        only,
        limit,
        outputDir: options.output,
        scrapers,
        onProgress: ({ phase, completed, total, currentItem }) => {
          spinner.text = `[${phase}] ${currentItem || ''} (${completed}/${total})`;
        },
      });

      await browser.close();

      spinner.succeed(`Export complete → ${summary.dir}`);

      // Show summary
      console.log('');
      for (const [phase, info] of Object.entries(summary.phases || {})) {
        const status = info.skipped ? chalk.gray('(cached)') : chalk.green('✓');
        console.log(`  ${status} ${chalk.bold(phase)}: ${info.count} items`);
      }
      if (summary.archiveViewer) {
        console.log(`\n  ${chalk.cyan('Archive viewer:')} ${summary.archiveViewer}`);
      }
      if (summary.errors?.length > 0) {
        console.log(`\n  ${chalk.yellow('Errors:')}`);
        for (const e of summary.errors) {
          console.log(`    ${chalk.red(e.phase)}: ${e.error}`);
        }
      }
      console.log('');
    } catch (error) {
      spinner.fail('Export failed');
      console.error(chalk.red(error.message));
    }
  });

program
  .command('migrate <username>')
  .description('Migrate Twitter data to Bluesky or Mastodon')
  .requiredOption('--to <platform>', 'Target platform: bluesky or mastodon')
  .option('--dry-run', 'Preview migration without executing (default)', true)
  .option('--execute', 'Actually execute the migration')
  .option('--export-dir <dir>', 'Path to export directory (auto-detected if omitted)')
  .option('-l, --limit <number>', 'Max tweets to migrate', '50')
  .action(async (username, options) => {
    const user = username.replace(/^@/, '');
    const dryRun = !options.execute;
    const platform = options.to.toLowerCase();

    if (!['bluesky', 'mastodon'].includes(platform)) {
      console.error(chalk.red('Platform must be "bluesky" or "mastodon"'));
      return;
    }

    // Find export directory
    let exportDir = options.exportDir;
    if (!exportDir) {
      const { promises: fs } = await import('fs');
      const exportsRoot = path.join(process.cwd(), 'exports');
      try {
        const dirs = await fs.readdir(exportsRoot);
        const match = dirs
          .filter((d) => d.startsWith(user + '_'))
          .sort()
          .pop();
        if (match) exportDir = path.join(exportsRoot, match);
      } catch { /* no exports dir */ }
    }

    if (!exportDir) {
      console.error(chalk.red(`No export found for @${user}. Run "xactions export @${user}" first.`));
      return;
    }

    const spinner = ora(`${dryRun ? 'Previewing' : 'Executing'} migration to ${platform}...`).start();

    try {
      const { migrate } = await import('../portability/importer.js');
      const summary = await migrate({
        platform,
        exportDir,
        dryRun,
        onProgress: ({ phase, completed, total }) => {
          spinner.text = `[${phase}] ${completed}/${total}`;
        },
      });

      spinner.succeed(`Migration ${dryRun ? 'preview' : ''} complete`);

      console.log(`\n  Platform: ${chalk.cyan(platform)}`);
      console.log(`  Mode: ${dryRun ? chalk.yellow('DRY RUN') : chalk.green('EXECUTE')}`);
      console.log(`  Tweets: ${summary.tweets.migrated}/${summary.tweets.total} ready`);
      console.log(`  Follows: ${summary.follows.matched}/${summary.follows.total} matchable`);

      if (dryRun) {
        console.log(`\n  ${chalk.yellow('This was a dry run. Add --execute to perform the migration.')}`);
      }

      if (summary.actions.length > 0) {
        console.log(`\n  ${chalk.gray('Sample actions:')}`);
        for (const a of summary.actions.slice(0, 5)) {
          console.log(`    ${a.type}: ${a.content?.slice(0, 60) || a.twitterUser || ''} [${a.status}]`);
        }
        if (summary.actions.length > 5) {
          console.log(`    ... and ${summary.actions.length - 5} more`);
        }
      }
      console.log('');
    } catch (error) {
      spinner.fail('Migration failed');
      console.error(chalk.red(error.message));
    }
  });

program
  .command('diff <dirA> <dirB>')
  .description('Compare two account exports and show changes')
  .option('-o, --output <dir>', 'Output directory for report (default: dirB)')
  .action(async (dirA, dirB, options) => {
    const spinner = ora('Comparing exports...').start();

    try {
      const { diffAndReport } = await import('../portability/differ.js');
      const { diff, files } = await diffAndReport(dirA, dirB, options.output);
      const s = diff.summary;

      spinner.succeed('Diff complete');

      console.log('');
      console.log(`  ${chalk.bold('Followers:')} ${chalk.green('+' + s.followersGained)} ${chalk.red('-' + s.followersLost)} (net: ${s.netFollowerChange >= 0 ? '+' : ''}${s.netFollowerChange})`);
      console.log(`  ${chalk.bold('Following:')} ${chalk.green('+' + s.followingAdded)} ${chalk.red('-' + s.followingRemoved)}`);
      console.log(`  ${chalk.bold('Tweets:')} ${chalk.green('+' + s.newTweets + ' new')} ${chalk.red(s.deletedTweets + ' deleted')}`);
      console.log(`  ${chalk.bold('Engagement changes:')} ${s.engagementChanges} tweets`);

      if (s.profileChanges > 0) {
        console.log(`  ${chalk.bold('Profile changes:')} ${s.profileChanges}`);
        for (const c of diff.profile.changes) {
          console.log(`    ${c.field}: ${chalk.gray(String(c.before))} → ${chalk.white(String(c.after))}`);
        }
      }

      console.log(`\n  ${chalk.cyan('Report:')} ${files.join(', ')}`);
      console.log('');
    } catch (error) {
      spinner.fail('Diff failed');
      console.error(chalk.red(error.message));
    }
  });

// ============================================================================
// Info Commands
// ============================================================================

program
  .command('info')
  .description('Show XActions information')
  .action(() => {
    console.log(`
${chalk.bold.cyan('⚡ XActions')} ${chalk.gray('v3.0.0')}

${chalk.bold('The Complete X/Twitter Automation Toolkit')}

${chalk.cyan('Features:')}
  • Scrape profiles, followers, following, tweets
  • Search tweets and hashtags
  • Extract threads, media, and more
  • Export to JSON or CSV
  • No Twitter API required (saves $100-$5000+/mo)

${chalk.cyan('Author:')}
  nich (@nichxbt) - https://github.com/nirholas

${chalk.cyan('Links:')}
  Website:  https://xactions.app
  GitHub:   https://github.com/nirholas/xactions
  Docs:     https://xactions.app/docs

${chalk.yellow('Run "xactions --help" for all commands')}
`);
  });

// ============================================================================
// Analytics Commands
// ============================================================================

program
  .command('sentiment <text>')
  .description('Analyze sentiment of text or tweet content')
  .option('-m, --mode <mode>', 'Analysis mode: rules (default) or llm', 'rules')
  .option('-o, --output <file>', 'Output file (JSON)')
  .action(async (text, options) => {
    const spinner = ora('Analyzing sentiment...').start();
    try {
      const { analyzeSentiment } = await import('../analytics/sentiment.js');
      const result = await analyzeSentiment(text, { mode: options.mode });
      spinner.succeed('Sentiment analysis complete');

      const icon = result.label === 'positive' ? '🟢' : result.label === 'negative' ? '🔴' : '⚪';
      console.log(`\n${icon} ${chalk.bold(result.label.toUpperCase())} (score: ${result.score}, confidence: ${result.confidence})`);
      if (result.keywords.length > 0) {
        console.log(chalk.gray(`   Keywords: ${result.keywords.join(', ')}`));
      }

      if (options.output) {
        const fs = await import('fs/promises');
        await fs.writeFile(options.output, JSON.stringify(result, null, 2));
        console.log(chalk.green(`\n✓ Saved to ${options.output}`));
      }
    } catch (error) {
      spinner.fail('Sentiment analysis failed');
      console.error(chalk.red(error.message));
    }
  });

program
  .command('monitor <target>')
  .description('Start monitoring sentiment for a username or keyword')
  .option('-t, --type <type>', 'Monitor type: mentions, keyword, replies', 'mentions')
  .option('-i, --interval <seconds>', 'Polling interval in seconds', '900')
  .option('-m, --mode <mode>', 'Analysis mode: rules or llm', 'rules')
  .option('--threshold <number>', 'Alert threshold for negative sentiment', '-0.3')
  .option('--webhook <url>', 'Webhook URL for alerts')
  .action(async (target, options) => {
    const spinner = ora(`Starting monitor for ${target}...`).start();
    try {
      const { createMonitor } = await import('../analytics/reputation.js');
      const monitor = createMonitor({
        target,
        type: options.type,
        intervalMs: Math.max(60, parseInt(options.interval)) * 1000,
        sentimentMode: options.mode,
        alertConfig: {
          sentimentThreshold: parseFloat(options.threshold),
          webhookUrl: options.webhook || null,
        },
      });

      spinner.succeed(`Monitor started: ${monitor.id}`);
      console.log(chalk.cyan(`\n📊 Monitoring ${target}`));
      console.log(chalk.gray(`   Type: ${monitor.type}`));
      console.log(chalk.gray(`   Interval: ${monitor.intervalMs / 1000}s`));
      console.log(chalk.gray(`   Mode: ${monitor.sentimentMode}`));
      console.log(chalk.yellow(`\n⚡ Monitor is running. Press Ctrl+C to stop.`));
      console.log(chalk.gray(`   ID: ${monitor.id}`));

      // Keep process alive
      process.on('SIGINT', () => {
        const { stopMonitor: stop } = require('../analytics/reputation.js');
        stop(monitor.id);
        console.log(chalk.yellow('\n🛑 Monitor stopped.'));
        process.exit(0);
      });

      // Prevent exit
      await new Promise(() => {});
    } catch (error) {
      spinner.fail('Failed to start monitor');
      console.error(chalk.red(error.message));
    }
  });

program
  .command('report <username>')
  .description('Generate a reputation report for a monitored username')
  .option('-p, --period <period>', 'Report period: 24h, 7d, 30d, all', '7d')
  .option('-f, --format <format>', 'Output format: json or markdown', 'markdown')
  .option('-o, --output <file>', 'Output file')
  .action(async (username, options) => {
    const spinner = ora(`Generating report for @${username}...`).start();
    try {
      const { listMonitors, getMonitor, getMonitorHistory } = await import('../analytics/reputation.js');
      const { generateReport } = await import('../analytics/reports.js');

      const monitors = listMonitors();
      const monitor = monitors.find(m =>
        m.target.replace(/^@/, '').toLowerCase() === username.replace(/^@/, '').toLowerCase()
      );

      if (!monitor) {
        spinner.fail(`No active monitor found for @${username}`);
        console.log(chalk.yellow('Start one first with: xactions monitor @' + username));
        return;
      }

      const history = getMonitorHistory(monitor.id, { limit: 10000 });
      const { report, markdown } = generateReport(monitor, history, {
        period: options.period,
        format: options.format,
      });

      spinner.succeed('Report generated');

      if (options.format === 'markdown' && markdown) {
        if (options.output) {
          const fs = await import('fs/promises');
          await fs.writeFile(options.output, markdown);
          console.log(chalk.green(`\n✓ Report saved to ${options.output}`));
        } else {
          console.log('\n' + markdown);
        }
      } else {
        if (options.output) {
          const fs = await import('fs/promises');
          await fs.writeFile(options.output, JSON.stringify(report, null, 2));
          console.log(chalk.green(`\n✓ Report saved to ${options.output}`));
        } else {
          console.log(JSON.stringify(report, null, 2));
        }
      }
    } catch (error) {
      spinner.fail('Failed to generate report');
      console.error(chalk.red(error.message));
    }
  });

// ============================================================================
// Cross-Platform Scrape Command
// ============================================================================

const scrapeCmd = program
  .command('scrape <action> [target]')
  .description('Multi-platform scrape: profile, followers, following, tweets, search, hashtag, trending')
  .option('-p, --platform <platform>', 'Platform: twitter, bluesky, mastodon, threads', 'twitter')
  .option('-u, --username <username>', 'Target username (alternative to positional arg)')
  .option('-q, --query <query>', 'Search query (for search action)')
  .option('-l, --limit <number>', 'Maximum results', '100')
  .option('-i, --instance <url>', 'Mastodon instance URL (e.g. https://mastodon.social)')
  .option('-o, --output <file>', 'Output file (json or csv)')
  .option('-j, --json', 'Output as JSON to stdout')
  .action(async (action, target, options) => {
    const platform = options.platform.toLowerCase();
    const limit = parseInt(options.limit);
    const username = target || options.username;
    const query = options.query || target;

    const actionLabel = `${platform}/${action}` + (username ? ` @${username}` : query ? ` "${query}"` : '');
    const spinner = ora(`Scraping ${actionLabel}`).start();

    try {
      const { scrape } = await import('../scrapers/index.js');

      const scrapeOptions = {
        limit,
        instance: options.instance,
      };

      // Set the right target field based on action
      if (['profile', 'followers', 'following', 'tweets', 'posts'].includes(action)) {
        if (!username) throw new Error(`Action "${action}" requires a username. Usage: xactions scrape ${action} <username> --platform ${platform}`);
        scrapeOptions.username = username;
      } else if (['search'].includes(action)) {
        if (!query) throw new Error('Search action requires a query. Usage: xactions scrape search "query" --platform bluesky');
        scrapeOptions.query = query;
      } else if (['hashtag'].includes(action)) {
        if (!target) throw new Error('Hashtag action requires a tag. Usage: xactions scrape hashtag javascript --platform mastodon');
        scrapeOptions.hashtag = target;
      }

      // For Puppeteer-based platforms, use auth if available
      if (['twitter', 'x', 'threads'].includes(platform)) {
        const config = await loadConfig();
        if (config.authToken) {
          scrapeOptions.authToken = config.authToken;
        }
      }

      const result = await scrape(platform, action, scrapeOptions);
      spinner.succeed(`Scraped ${actionLabel}`);

      if (options.output) {
        const ext = path.extname(options.output).toLowerCase();
        const { exportToJSON, exportToCSV } = await import('../scrapers/index.js');
        const data = Array.isArray(result) ? result : [result];
        if (ext === '.csv') {
          await exportToCSV(data, options.output);
        } else {
          await exportToJSON(data, options.output);
        }
        console.log(chalk.green(`✓ Saved to ${options.output}`));
      } else if (options.json || Array.isArray(result)) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        // Pretty-print profile-like objects
        console.log(chalk.bold(`\n⚡ ${platform} / ${action}\n`));
        for (const [key, value] of Object.entries(result)) {
          if (value !== null && value !== undefined) {
            console.log(`  ${chalk.cyan(key + ':')} ${typeof value === 'object' ? JSON.stringify(value) : value}`);
          }
        }
        console.log();
      }
    } catch (error) {
      spinner.fail(`Failed to scrape ${actionLabel}`);
      console.error(chalk.red(error.message));
    }
  });

program
  .command('platforms')
  .description('List supported social media platforms')
  .action(() => {
    console.log(chalk.bold('\n⚡ Supported Platforms\n'));
    console.log(`  ${chalk.cyan('twitter')}   X/Twitter — Puppeteer-based scraping (requires auth_token)`);
    console.log(`  ${chalk.cyan('bluesky')}   Bluesky — AT Protocol API (no browser needed)`);
    console.log(`  ${chalk.cyan('mastodon')}  Mastodon — REST API (any instance, no browser needed)`);
    console.log(`  ${chalk.cyan('threads')}   Threads — Puppeteer-based scraping`);
    console.log();
    console.log(chalk.gray('Usage: xactions scrape <action> <target> --platform <platform>'));
    console.log(chalk.gray('Example: xactions scrape profile user.bsky.social --platform bluesky'));
    console.log(chalk.gray('Example: xactions scrape tweets Gargron --platform mastodon --instance https://mastodon.social'));
    console.log();
  });

// ============================================================================
// Parse and Run
// ============================================================================

program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
