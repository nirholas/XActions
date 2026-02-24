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

/**
 * Smart output handler — routes data to the right exporter based on file extension.
 * Supports: .json, .csv, .xlsx, plus --google-sheets flag.
 *
 * @param {Object[]} data - Array of objects to export
 * @param {Object} options - CLI options (output, googleSheets, sheetName)
 * @param {string} defaultName - Default filename stem (e.g., 'followers')
 */
async function smartOutput(data, options, defaultName = 'data') {
  // Google Sheets export
  if (options.googleSheets) {
    try {
      const { exportToGoogleSheets } = await import('../plugins/google-sheets/index.js');
      const result = await exportToGoogleSheets(data, {
        spreadsheetId: options.googleSheets,
        sheetName: options.sheetName || defaultName,
        mode: options.sheetMode || 'append',
      });
      console.log(chalk.green(`✓ Exported ${result.rowsWritten} rows to Google Sheets`));
      console.log(chalk.gray(`  → ${result.url}`));
      return;
    } catch (error) {
      console.error(chalk.red(`Google Sheets export failed: ${error.message}`));
      console.log(chalk.yellow('Falling back to JSON output...'));
    }
  }

  // File output
  if (options.output) {
    const ext = path.extname(options.output).toLowerCase();

    if (ext === '.xlsx') {
      try {
        const { exportToExcel } = await import('../plugins/excel/index.js');
        const result = await exportToExcel(data, {
          filepath: options.output,
          sheetName: options.sheetName || defaultName,
        });
        console.log(chalk.green(`✓ Saved ${result.rowsWritten} rows to ${options.output}`));
        return;
      } catch (error) {
        console.error(chalk.red(`Excel export failed: ${error.message}`));
        console.log(chalk.yellow('Falling back to JSON...'));
      }
    }

    if (ext === '.csv') {
      await scrapers.exportToCSV(data, options.output);
    } else {
      await scrapers.exportToJSON(data, options.output);
    }
    console.log(chalk.green(`✓ Saved to ${options.output}`));
    return;
  }

  // Default: print JSON to stdout
  console.log(JSON.stringify(data, null, 2));
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
  .option('-o, --output <file>', 'Output file (json, csv, or xlsx)')
  .option('--google-sheets <id>', 'Export directly to a Google Sheet (spreadsheet ID)')
  .option('--sheet-name <name>', 'Sheet/tab name for xlsx or Google Sheets export')
  .option('--sheet-mode <mode>', 'Google Sheets write mode: append, replace, new-sheet', 'append')
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

      await smartOutput(followers, options, 'followers');
    } catch (error) {
      spinner.fail('Failed to scrape followers');
      console.error(chalk.red(error.message));
    }
  });

program
  .command('following <username>')
  .description('Scrape accounts a user is following')
  .option('-l, --limit <number>', 'Maximum to scrape', '100')
  .option('-o, --output <file>', 'Output file (json, csv, or xlsx)')
  .option('--google-sheets <id>', 'Export directly to a Google Sheet (spreadsheet ID)')
  .option('--sheet-name <name>', 'Sheet/tab name for xlsx or Google Sheets export')
  .option('--sheet-mode <mode>', 'Google Sheets write mode: append, replace, new-sheet', 'append')
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

      await smartOutput(following, options, 'following');
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
  .option('-o, --output <file>', 'Output file (json, csv, or xlsx)')
  .option('--google-sheets <id>', 'Export directly to a Google Sheet (spreadsheet ID)')
  .option('--sheet-name <name>', 'Sheet/tab name for xlsx or Google Sheets export')
  .option('--sheet-mode <mode>', 'Google Sheets write mode: append, replace, new-sheet', 'append')
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

      await smartOutput(tweets, options, 'tweets');
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
// Social Graph Commands
// ============================================================================

const graphCmd = program
  .command('graph')
  .description('Build and analyze social network graphs');

graphCmd
  .command('build <username>')
  .description('Build a social graph by crawling an account\'s network')
  .option('-d, --depth <number>', 'Crawl depth (1 = direct only, 2 = friends-of-friends)', '2')
  .option('-n, --max-nodes <number>', 'Maximum nodes to crawl', '500')
  .option('--auth <token>', 'X/Twitter session cookie')
  .action(async (username, options) => {
    const spinner = ora(`Building social graph for @${username.replace(/^@/, '')}...`).start();
    try {
      const graph = (await import('../graph/index.js')).default;
      const config = await loadConfig();

      const result = await graph.build(username, {
        depth: parseInt(options.depth, 10),
        maxNodes: parseInt(options.maxNodes, 10),
        authToken: options.auth || config.authToken,
        onProgress: (event) => {
          if (event.phase === 'crawling') {
            spinner.text = `Crawling @${event.username} (depth ${event.depth}) — ${event.nodesCount} nodes, ${event.edgesCount} edges`;
          }
        },
      });

      spinner.succeed(`Graph built: ${result.nodes?.length || 0} nodes, ${result.edges?.length || 0} edges (ID: ${result.id?.slice(0, 8)}...)`);
      console.log(chalk.gray(`  Saved to ~/.xactions/graphs/${result.id}.json`));
    } catch (error) {
      spinner.fail('Failed to build graph');
      console.error(chalk.red(error.message));
    }
  });

graphCmd
  .command('analyze <graphId>')
  .description('Run analysis on an existing graph (clusters, influence, bridges)')
  .action(async (graphId) => {
    const spinner = ora('Analyzing graph...').start();
    try {
      const graph = (await import('../graph/index.js')).default;
      const data = await graph.get(graphId);
      if (!data) {
        spinner.fail(`Graph not found: ${graphId}`);
        return;
      }

      const analysis = graph.analyze(data);
      spinner.succeed('Analysis complete');

      console.log(chalk.bold.cyan('\n📊 Graph Analysis\n'));
      console.log(`  Nodes: ${chalk.bold(analysis.nodesCount)}  Edges: ${chalk.bold(analysis.edgesCount)}`);

      if (analysis.clusters.length > 0) {
        console.log(chalk.bold('\n  Clusters:'));
        for (const c of analysis.clusters.slice(0, 5)) {
          console.log(`    ${chalk.cyan(c.label)} — ${c.size} members: ${c.members.slice(0, 5).join(', ')}${c.size > 5 ? '...' : ''}`);
        }
      }

      if (analysis.influenceRanking.length > 0) {
        console.log(chalk.bold('\n  Top Influencers:'));
        for (const u of analysis.influenceRanking.slice(0, 10)) {
          console.log(`    ${chalk.yellow(u.influenceScore.toFixed(1).padStart(5))}  @${u.username}`);
        }
      }

      if (analysis.bridgeAccounts.length > 0) {
        console.log(chalk.bold('\n  Bridge Accounts:'));
        for (const b of analysis.bridgeAccounts.slice(0, 5)) {
          console.log(`    @${chalk.cyan(b.username)} — betweenness: ${b.betweenness}`);
        }
      }

      if (analysis.orbits) {
        const o = analysis.orbits.summary;
        console.log(chalk.bold('\n  Orbit Analysis:'));
        console.log(`    Inner circle: ${o.innerCircle}  Active: ${o.active}  Outer ring: ${o.outerRing}  Periphery: ${o.periphery}`);
      }

      console.log('');
    } catch (error) {
      spinner.fail('Analysis failed');
      console.error(chalk.red(error.message));
    }
  });

graphCmd
  .command('recommend <graphId>')
  .description('Get follow/engage/unfollow recommendations from a graph')
  .action(async (graphId) => {
    try {
      const graph = (await import('../graph/index.js')).default;
      const data = await graph.get(graphId);
      if (!data) {
        console.error(chalk.red(`Graph not found: ${graphId}`));
        return;
      }

      const recs = graph.recommend(data, data.seed);

      console.log(chalk.bold.cyan(`\n💡 Recommendations for @${recs.seed}\n`));

      if (recs.followSuggestions.length > 0) {
        console.log(chalk.bold('  Follow these:'));
        for (const s of recs.followSuggestions.slice(0, 8)) {
          console.log(`    ${chalk.green('+')} @${s.username} — ${s.reason}`);
        }
      }

      if (recs.engageSuggestions.length > 0) {
        console.log(chalk.bold('\n  Engage with:'));
        for (const s of recs.engageSuggestions.slice(0, 8)) {
          console.log(`    ${chalk.yellow('★')} @${s.username} — ${s.reason}`);
        }
      }

      if (recs.competitorWatch.length > 0) {
        console.log(chalk.bold('\n  Watch these:'));
        for (const s of recs.competitorWatch.slice(0, 5)) {
          console.log(`    ${chalk.cyan('◉')} @${s.username} — ${s.reason}`);
        }
      }

      if (recs.safeToUnfollow.length > 0) {
        console.log(chalk.bold('\n  Safe to unfollow:'));
        for (const s of recs.safeToUnfollow.slice(0, 8)) {
          console.log(`    ${chalk.gray('−')} @${s.username} — ${s.reason}`);
        }
      }

      console.log('');
    } catch (error) {
      console.error(chalk.red('Failed to get recommendations: ' + error.message));
    }
  });

graphCmd
  .command('export <graphId>')
  .description('Export a graph for visualization')
  .option('-f, --format <format>', 'Output format: html, gexf, d3', 'html')
  .option('-o, --output <path>', 'Output file path')
  .action(async (graphId, options) => {
    try {
      const graphMod = (await import('../graph/index.js')).default;
      const data = await graphMod.get(graphId);
      if (!data) {
        console.error(chalk.red(`Graph not found: ${graphId}`));
        return;
      }

      const format = options.format || 'html';
      const result = graphMod.visualize(data, format);

      const ext = format === 'gexf' || format === 'gephi' ? 'gexf' : format === 'html' ? 'html' : 'json';
      const defaultPath = `graph-${data.seed}-${Date.now()}.${ext}`;
      const outPath = options.output || defaultPath;

      const { default: fsPromises } = await import('fs/promises');
      const content = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
      await fsPromises.writeFile(outPath, content);

      console.log(chalk.green(`✓ Graph exported to ${outPath} (${format})`));
    } catch (error) {
      console.error(chalk.red('Failed to export graph: ' + error.message));
    }
  });

graphCmd
  .command('list')
  .description('List all saved graphs')
  .action(async () => {
    try {
      const graph = (await import('../graph/index.js')).default;
      const graphs = await graph.list();

      if (graphs.length === 0) {
        console.log(chalk.gray('\n  No graphs found. Build one with: xactions graph build @username\n'));
        return;
      }

      console.log(chalk.bold.cyan('\n📊 Saved Graphs\n'));
      for (const g of graphs) {
        const status = g.status === 'complete' ? chalk.green('● complete') : g.status === 'crawling' ? chalk.yellow('● crawling') : chalk.gray(`● ${g.status}`);
        console.log(`  ${status}  ${chalk.bold('@' + g.seed)} ${chalk.gray(`(${g.id?.slice(0, 8)}...)`)}`);
        console.log(`         ${g.nodesCount} nodes, ${g.edgesCount} edges  ${chalk.gray(g.createdAt || '')}`);
        console.log('');
      }
    } catch (error) {
      console.error(chalk.red('Failed to list graphs: ' + error.message));
    }
  });

graphCmd
  .command('delete <graphId>')
  .description('Delete a saved graph')
  .action(async (graphId) => {
    try {
      const graph = (await import('../graph/index.js')).default;
      const deleted = await graph.delete(graphId);
      if (deleted) {
        console.log(chalk.green(`✓ Graph deleted: ${graphId}`));
      } else {
        console.log(chalk.red(`Graph not found: ${graphId}`));
      }
    } catch (error) {
      console.error(chalk.red('Failed to delete graph: ' + error.message));
    }
  });

// ============================================================================
// Portability Commands (export, migrate, diff)
// ============================================================================

program
  .command('export <username>')
  .description('Export a Twitter account (profile, tweets, followers, following, bookmarks)')
  .option('-f, --format <formats>', 'Output formats: json,csv,xlsx,md,html (comma-separated)', 'json,csv,md,html')
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
// MCP Config Generator
// ============================================================================

program
  .command('mcp-config')
  .description('Generate MCP server config for Claude Desktop, Cursor, Windsurf, etc.')
  .option('-w, --write', 'Write config to Claude Desktop config file')
  .option('-c, --client <client>', 'Target client: claude, cursor, windsurf, vscode (default: claude)')
  .action(async (options) => {
    const client = options.client || 'claude';

    // Detect OS
    const platform = process.platform;
    const home = os.homedir();

    // Config file paths per client and OS
    const configPaths = {
      claude: {
        darwin: path.join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'),
        win32: path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'Claude', 'claude_desktop_config.json'),
        linux: path.join(home, '.config', 'Claude', 'claude_desktop_config.json'),
      },
      cursor: {
        darwin: path.join(home, '.cursor', 'mcp.json'),
        win32: path.join(home, '.cursor', 'mcp.json'),
        linux: path.join(home, '.cursor', 'mcp.json'),
      },
      windsurf: {
        darwin: path.join(home, '.codeium', 'windsurf', 'mcp_config.json'),
        win32: path.join(home, '.codeium', 'windsurf', 'mcp_config.json'),
        linux: path.join(home, '.codeium', 'windsurf', 'mcp_config.json'),
      },
      vscode: {
        darwin: path.join('.vscode', 'mcp.json'),
        win32: path.join('.vscode', 'mcp.json'),
        linux: path.join('.vscode', 'mcp.json'),
      },
    };

    const configPath = configPaths[client]?.[platform] || configPaths[client]?.linux;

    // Build the MCP config snippet
    const mcpEntry = {
      command: 'npx',
      args: ['-y', 'xactions-mcp'],
      env: {
        XACTIONS_SESSION_COOKIE: 'your_auth_token_here',
      },
    };

    const fullConfig = client === 'vscode'
      ? { mcp: { servers: { xactions: mcpEntry } } }
      : { mcpServers: { xactions: mcpEntry } };

    console.log(chalk.bold.cyan('\n⚡ XActions MCP Configuration\n'));
    console.log(chalk.gray(`Client: ${client}`));
    console.log(chalk.gray(`OS:     ${platform}`));
    if (configPath) {
      console.log(chalk.gray(`Config: ${configPath}`));
    }
    console.log();
    console.log(chalk.bold('Add this to your config file:\n'));
    console.log(chalk.white(JSON.stringify(fullConfig, null, 2)));
    console.log();

    if (options.write && configPath) {
      try {
        let existing = {};
        try {
          const data = await fs.readFile(configPath, 'utf-8');
          existing = JSON.parse(data);
        } catch {
          // File doesn't exist yet, start fresh
        }

        // Merge
        const key = client === 'vscode' ? 'mcp' : 'mcpServers';
        if (client === 'vscode') {
          existing.mcp = existing.mcp || {};
          existing.mcp.servers = existing.mcp.servers || {};
          existing.mcp.servers.xactions = mcpEntry;
        } else {
          existing[key] = existing[key] || {};
          existing[key].xactions = mcpEntry;
        }

        await fs.mkdir(path.dirname(configPath), { recursive: true });
        await fs.writeFile(configPath, JSON.stringify(existing, null, 2));

        console.log(chalk.green(`✅ Config written to ${configPath}`));
        console.log(chalk.yellow('\n⚠️  Remember to:'));
        console.log(chalk.yellow('   1. Replace "your_auth_token_here" with your actual auth_token'));
        console.log(chalk.yellow(`   2. Restart ${client === 'claude' ? 'Claude Desktop' : client} to apply changes`));
      } catch (error) {
        console.error(chalk.red(`Failed to write config: ${error.message}`));
        console.log(chalk.gray('\nCopy the JSON above and paste it manually.'));
      }
    } else if (options.write) {
      console.log(chalk.yellow('Config path not found for this client/OS. Copy the JSON above manually.'));
    } else {
      console.log(chalk.gray('Tip: Use --write to write directly to the config file.'));
      console.log(chalk.gray(`     xactions mcp-config --write --client ${client}`));
    }

    console.log(chalk.gray('\n📖 Full setup guide: https://github.com/nirholas/XActions/blob/main/docs/mcp-setup.md'));
    console.log();
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
// AI Tweet Writer Commands
// ============================================================================

const ai = program
  .command('ai')
  .description('AI Tweet Writer — analyze voice, generate & rewrite tweets');

ai
  .command('analyze <username>')
  .description('Analyze a user\'s writing voice from their tweets')
  .option('-l, --limit <n>', 'Number of tweets to analyze', '100')
  .option('-o, --output <file>', 'Save voice profile to file')
  .option('--json', 'Output as JSON')
  .action(async (username, options) => {
    const config = await loadConfig();
    const token = config.auth_token || process.env.TWITTER_AUTH_TOKEN;
    if (!token) {
      console.error(chalk.red('✗ Auth token required. Run: xactions config --token <auth_token>'));
      process.exit(1);
    }
    const spinner = ora(`Analyzing @${username}'s writing voice...`).start();
    try {
      const { scrapeTweets, createBrowser, createPage, loginWithCookie } = scrapers;
      const { analyzeVoice, summarizeVoiceProfile } = await import('../ai/index.js');
      const browser = await createBrowser();
      const page = await createPage(browser);
      await loginWithCookie(page, token);
      const tweets = await scrapeTweets(page, username, { limit: parseInt(options.limit) });
      await browser.close();
      if (!tweets || tweets.length === 0) {
        spinner.fail(`No tweets found for @${username}`);
        return;
      }
      spinner.text = `Analyzing ${tweets.length} tweets...`;
      const profile = analyzeVoice(username, tweets);
      spinner.succeed(`Voice analysis complete for @${username}`);

      if (options.json) {
        console.log(JSON.stringify(profile, null, 2));
      } else {
        const summary = summarizeVoiceProfile(profile);
        console.log(chalk.bold(`\n🎤 Voice Profile: @${username}\n`));
        console.log(summary);
      }

      if (options.output) {
        await fs.writeFile(options.output, JSON.stringify(profile, null, 2));
        console.log(chalk.green(`\n✓ Voice profile saved to ${options.output}`));
      }
    } catch (error) {
      spinner.fail('Voice analysis failed');
      console.error(chalk.red(error.message));
    }
  });

ai
  .command('generate <topic>')
  .description('Generate tweets in a user\'s voice')
  .option('-v, --voice <username>', 'Username whose voice to mimic (required)')
  .option('-c, --count <n>', 'Number of tweets to generate', '3')
  .option('-s, --style <style>', 'Style: casual, professional, provocative')
  .option('-t, --type <type>', 'Type: tweet or thread', 'tweet')
  .option('-m, --model <model>', 'OpenRouter model to use')
  .option('-k, --api-key <key>', 'OpenRouter API key (or set OPENROUTER_API_KEY)')
  .action(async (topic, options) => {
    if (!options.voice) {
      console.error(chalk.red('✗ --voice <username> is required'));
      process.exit(1);
    }
    const config = await loadConfig();
    const token = config.auth_token || process.env.TWITTER_AUTH_TOKEN;
    const apiKey = options.apiKey || config.openrouter_api_key || process.env.OPENROUTER_API_KEY;
    if (!token) {
      console.error(chalk.red('✗ Auth token required. Run: xactions config --token <auth_token>'));
      process.exit(1);
    }
    if (!apiKey) {
      console.error(chalk.red('✗ OpenRouter API key required. Set OPENROUTER_API_KEY or use --api-key'));
      process.exit(1);
    }
    process.env.OPENROUTER_API_KEY = apiKey;
    if (options.model) process.env.OPENROUTER_MODEL = options.model;

    const spinner = ora(`Scraping @${options.voice}'s tweets...`).start();
    try {
      const { scrapeTweets, createBrowser, createPage, loginWithCookie } = scrapers;
      const { analyzeVoice, generateTweet, generateThread } = await import('../ai/index.js');
      const browser = await createBrowser();
      const page = await createPage(browser);
      await loginWithCookie(page, token);
      const tweets = await scrapeTweets(page, options.voice, { limit: 100 });
      await browser.close();
      if (!tweets || tweets.length === 0) {
        spinner.fail(`No tweets found for @${options.voice}`);
        return;
      }
      const voiceProfile = analyzeVoice(options.voice, tweets);
      spinner.text = `Generating ${options.type === 'thread' ? 'thread' : 'tweets'} about "${topic}"...`;

      if (options.type === 'thread') {
        const result = await generateThread(voiceProfile, { topic, length: parseInt(options.count) });
        spinner.succeed('Thread generated!');
        console.log(chalk.bold(`\n🧵 Thread: ${topic}\n`));
        result.thread.forEach((t, i) => {
          console.log(chalk.cyan(`  ${i + 1}/${result.thread.length}`) + ` ${t}`);
          console.log();
        });
      } else {
        const result = await generateTweet(voiceProfile, {
          topic,
          count: parseInt(options.count),
          style: options.style,
        });
        spinner.succeed('Tweets generated!');
        console.log(chalk.bold(`\n✍️  Generated Tweets: ${topic}\n`));
        result.tweets.forEach((t, i) => {
          console.log(chalk.cyan(`  ${i + 1}.`) + ` ${t}`);
          console.log();
        });
      }
    } catch (error) {
      spinner.fail('Generation failed');
      console.error(chalk.red(error.message));
    }
  });

ai
  .command('rewrite <text>')
  .description('Rewrite a tweet in a user\'s voice')
  .option('-v, --voice <username>', 'Username whose voice to mimic (required)')
  .option('-g, --goal <goal>', 'Goal: more_engaging, shorter, more_professional, funnier', 'more_engaging')
  .option('-c, --count <n>', 'Number of variations', '3')
  .option('-m, --model <model>', 'OpenRouter model to use')
  .option('-k, --api-key <key>', 'OpenRouter API key (or set OPENROUTER_API_KEY)')
  .action(async (text, options) => {
    if (!options.voice) {
      console.error(chalk.red('✗ --voice <username> is required'));
      process.exit(1);
    }
    const config = await loadConfig();
    const token = config.auth_token || process.env.TWITTER_AUTH_TOKEN;
    const apiKey = options.apiKey || config.openrouter_api_key || process.env.OPENROUTER_API_KEY;
    if (!token) {
      console.error(chalk.red('✗ Auth token required. Run: xactions config --token <auth_token>'));
      process.exit(1);
    }
    if (!apiKey) {
      console.error(chalk.red('✗ OpenRouter API key required. Set OPENROUTER_API_KEY or use --api-key'));
      process.exit(1);
    }
    process.env.OPENROUTER_API_KEY = apiKey;
    if (options.model) process.env.OPENROUTER_MODEL = options.model;

    const spinner = ora(`Scraping @${options.voice}'s tweets...`).start();
    try {
      const { scrapeTweets, createBrowser, createPage, loginWithCookie } = scrapers;
      const { analyzeVoice, rewriteTweet } = await import('../ai/index.js');
      const browser = await createBrowser();
      const page = await createPage(browser);
      await loginWithCookie(page, token);
      const tweets = await scrapeTweets(page, options.voice, { limit: 100 });
      await browser.close();
      if (!tweets || tweets.length === 0) {
        spinner.fail(`No tweets found for @${options.voice}`);
        return;
      }
      const voiceProfile = analyzeVoice(options.voice, tweets);
      spinner.text = 'Rewriting tweet...';
      const result = await rewriteTweet(voiceProfile, text, {
        goal: options.goal,
        count: parseInt(options.count),
      });
      spinner.succeed('Tweet rewritten!');
      console.log(chalk.bold('\n✏️  Rewritten Variations:\n'));
      console.log(chalk.gray(`  Original: ${text}\n`));
      result.rewrites.forEach((t, i) => {
        console.log(chalk.cyan(`  ${i + 1}.`) + ` ${t}`);
        console.log();
      });
    } catch (error) {
      spinner.fail('Rewrite failed');
      console.error(chalk.red(error.message));
    }
  });

ai
  .command('calendar <username>')
  .description('Generate a content calendar for the week')
  .option('-d, --days <n>', 'Number of days', '7')
  .option('-p, --posts-per-day <n>', 'Posts per day', '3')
  .option('-t, --topics <topics>', 'Comma-separated topics')
  .option('-o, --output <file>', 'Save calendar to file')
  .option('-m, --model <model>', 'OpenRouter model to use')
  .option('-k, --api-key <key>', 'OpenRouter API key (or set OPENROUTER_API_KEY)')
  .action(async (username, options) => {
    const config = await loadConfig();
    const token = config.auth_token || process.env.TWITTER_AUTH_TOKEN;
    const apiKey = options.apiKey || config.openrouter_api_key || process.env.OPENROUTER_API_KEY;
    if (!token) {
      console.error(chalk.red('✗ Auth token required. Run: xactions config --token <auth_token>'));
      process.exit(1);
    }
    if (!apiKey) {
      console.error(chalk.red('✗ OpenRouter API key required. Set OPENROUTER_API_KEY or use --api-key'));
      process.exit(1);
    }
    process.env.OPENROUTER_API_KEY = apiKey;
    if (options.model) process.env.OPENROUTER_MODEL = options.model;

    const spinner = ora(`Scraping @${username}'s tweets...`).start();
    try {
      const { scrapeTweets, createBrowser, createPage, loginWithCookie } = scrapers;
      const { analyzeVoice, generateWeek } = await import('../ai/index.js');
      const browser = await createBrowser();
      const page = await createPage(browser);
      await loginWithCookie(page, token);
      const tweets = await scrapeTweets(page, username, { limit: 100 });
      await browser.close();
      if (!tweets || tweets.length === 0) {
        spinner.fail(`No tweets found for @${username}`);
        return;
      }
      const voiceProfile = analyzeVoice(username, tweets);
      const topics = options.topics ? options.topics.split(',').map(t => t.trim()) : undefined;
      spinner.text = `Generating ${options.days}-day content calendar...`;
      const result = await generateWeek(voiceProfile, {
        topics,
        postsPerDay: parseInt(options.postsPerDay),
        days: parseInt(options.days),
      });
      spinner.succeed('Content calendar generated!');
      console.log(chalk.bold(`\n📅 Content Calendar for @${username}\n`));
      for (const day of result.calendar) {
        console.log(chalk.cyan.bold(`  ${day.day}`));
        day.posts.forEach((post, i) => {
          const typeIcon = post.type === 'thread' ? '🧵' : '📝';
          console.log(`    ${typeIcon} ${chalk.gray(post.time || '')} ${post.topic}`);
          console.log(`       ${post.content}`);
          console.log();
        });
      }

      if (options.output) {
        await fs.writeFile(options.output, JSON.stringify(result.calendar, null, 2));
        console.log(chalk.green(`✓ Calendar saved to ${options.output}`));
      }
    } catch (error) {
      spinner.fail('Calendar generation failed');
      console.error(chalk.red(error.message));
    }
  });

// ============================================================================
// Persona & Algorithm Builder Commands
// ============================================================================

const personaCmd = program
  .command('persona')
  .description('Manage personas for algorithm building & automated growth');

personaCmd
  .command('create')
  .description('Create a new persona with interactive setup')
  .option('--preset <preset>', 'Use a niche preset (crypto-degen, tech-builder, ai-researcher, growth-marketer, finance-investor, creative-writer)')
  .option('--name <name>', 'Persona name')
  .option('--strategy <strategy>', 'Growth strategy (aggressive, moderate, conservative, thoughtleader)')
  .option('--activity <pattern>', 'Activity pattern (night-owl, early-bird, nine-to-five, always-on, weekend-warrior)')
  .action(async (options) => {
    const { createPersona, savePersona, NICHE_PRESETS, ACTIVITY_PATTERNS, ENGAGEMENT_STRATEGIES } = await import('../personaEngine.js');

    let preset = options.preset;
    let strategy = options.strategy;
    let activityPattern = options.activity;
    let name = options.name;

    // Interactive mode if options not provided
    if (!preset) {
      const presetAnswer = await inquirer.prompt([{
        type: 'list',
        name: 'preset',
        message: '🎯 Choose your niche:',
        choices: Object.entries(NICHE_PRESETS).map(([key, val]) => ({
          name: `${val.name}${val.topics.length ? ' — ' + val.topics.slice(0, 4).join(', ') : ''}`,
          value: key,
        })),
      }]);
      preset = presetAnswer.preset;
    }

    if (!name) {
      const nameAnswer = await inquirer.prompt([{
        type: 'input',
        name: 'name',
        message: '📛 Persona name:',
        default: NICHE_PRESETS[preset]?.name || 'My Persona',
      }]);
      name = nameAnswer.name;
    }

    if (!strategy) {
      const stratAnswer = await inquirer.prompt([{
        type: 'list',
        name: 'strategy',
        message: '📈 Growth strategy:',
        choices: Object.entries(ENGAGEMENT_STRATEGIES).map(([key, val]) => ({
          name: `${val.name} — ${val.description}`,
          value: key,
        })),
      }]);
      strategy = stratAnswer.strategy;
    }

    if (!activityPattern) {
      const actAnswer = await inquirer.prompt([{
        type: 'list',
        name: 'activity',
        message: '🕐 Activity pattern:',
        choices: Object.entries(ACTIVITY_PATTERNS).map(([key, val]) => ({
          name: `${val.name} — ${val.description}`,
          value: key,
        })),
      }]);
      activityPattern = actAnswer.activity;
    }

    // Custom topics if preset is custom
    let customTopics, customSearchTerms, customTargetAccounts;
    if (preset === 'custom') {
      const customAnswers = await inquirer.prompt([
        { type: 'input', name: 'topics', message: '📌 Topics (comma-separated):', },
        { type: 'input', name: 'searchTerms', message: '🔍 Search terms (comma-separated):', },
        { type: 'input', name: 'targetAccounts', message: '🎯 Target accounts to study (comma-separated, no @):', },
        { type: 'input', name: 'tone', message: '🎭 Describe your tone/voice:', default: 'casual, knowledgeable, authentic' },
      ]);
      customTopics = customAnswers.topics.split(',').map(t => t.trim()).filter(Boolean);
      customSearchTerms = customAnswers.searchTerms.split(',').map(t => t.trim()).filter(Boolean);
      customTargetAccounts = customAnswers.targetAccounts.split(',').map(t => t.trim().replace('@', '')).filter(Boolean);
    }

    const persona = createPersona({
      name,
      preset,
      strategy,
      activityPattern,
      topics: customTopics,
      searchTerms: customSearchTerms,
      targetAccounts: customTargetAccounts,
    });

    const filePath = savePersona(persona);
    console.log(chalk.green(`\n✅ Persona "${persona.name}" created!`));
    console.log(chalk.gray(`   ID: ${persona.id}`));
    console.log(chalk.gray(`   Preset: ${preset}`));
    console.log(chalk.gray(`   Strategy: ${strategy}`));
    console.log(chalk.gray(`   Activity: ${activityPattern}`));
    console.log(chalk.gray(`   Topics: ${persona.niche.topics.join(', ')}`));
    console.log(chalk.gray(`   Saved to: ${filePath}`));
    console.log(chalk.cyan(`\n🚀 Start with: xactions persona run ${persona.id}\n`));
  });

personaCmd
  .command('list')
  .description('List all saved personas')
  .action(async () => {
    const { listPersonas } = await import('../personaEngine.js');
    const personas = listPersonas();

    if (personas.length === 0) {
      console.log(chalk.yellow('No personas found. Create one with: xactions persona create'));
      return;
    }

    console.log(chalk.bold('\n🤖 Saved Personas\n'));
    for (const p of personas) {
      const status = p.lastSessionAt ? chalk.green('●') : chalk.gray('○');
      console.log(`  ${status} ${chalk.bold(p.name)} ${chalk.gray(`(${p.id})`)}`);
      console.log(`    Preset: ${p.preset} | Strategy: ${p.strategy}`);
      console.log(`    Sessions: ${p.totalSessions} | Follows: ${p.totalFollows || 0} | Likes: ${p.totalLikes || 0} | Comments: ${p.totalComments || 0}`);
      if (p.lastSessionAt) {
        console.log(`    Last active: ${new Date(p.lastSessionAt).toLocaleString()}`);
      }
      console.log();
    }
  });

personaCmd
  .command('run <personaId>')
  .description('Start the algorithm builder for a persona (runs 24/7)')
  .option('--headless', 'Run in headless mode (default)', true)
  .option('--no-headless', 'Run with visible browser')
  .option('--dry-run', 'Preview actions without executing')
  .option('--sessions <n>', 'Stop after N sessions (0 = infinite)', '0')
  .option('--token <token>', 'X auth token (overrides saved config)')
  .action(async (personaId, options) => {
    const config = await loadConfig();
    const token = options.token || config.authToken || process.env.XACTIONS_SESSION_COOKIE;

    if (!token) {
      console.error(chalk.red('❌ No auth token. Run "xactions login" first, pass --token, or set XACTIONS_SESSION_COOKIE'));
      return;
    }

    console.log(chalk.bold.cyan('\n🤖 XActions Algorithm Builder\n'));
    console.log(chalk.gray('Press Ctrl+C to stop gracefully\n'));

    try {
      const { startAlgorithmBuilder } = await import('../algorithmBuilder.js');

      await startAlgorithmBuilder({
        personaId,
        authToken: token,
        headless: options.headless,
        dryRun: options.dryRun,
        maxSessions: parseInt(options.sessions),
        onSessionComplete: ({ persona, stats, sessionCount }) => {
          console.log(chalk.green(`\n✅ Session #${sessionCount} complete`));
          console.log(chalk.gray(`   Total: ${persona.state.totalLikes} likes, ${persona.state.totalFollows} follows, ${persona.state.totalComments} comments, ${persona.state.totalPosts} posts`));
        },
      });
    } catch (error) {
      console.error(chalk.red(`\n❌ ${error.message}`));
    }
  });

personaCmd
  .command('status <personaId>')
  .description('Show detailed status and stats for a persona')
  .action(async (personaId) => {
    try {
      const { loadPersona } = await import('../personaEngine.js');
      const persona = loadPersona(personaId);

      console.log(chalk.bold(`\n🤖 ${persona.name} — Status Report\n`));
      console.log(chalk.cyan('Identity'));
      console.log(`  ID: ${persona.id}`);
      console.log(`  Preset: ${persona.preset}`);
      console.log(`  Created: ${new Date(persona.createdAt).toLocaleString()}`);
      console.log();

      console.log(chalk.cyan('Niche'));
      console.log(`  Topics: ${persona.niche.topics.join(', ')}`);
      console.log(`  Search terms: ${persona.niche.searchTerms.length}`);
      console.log(`  Target accounts: ${persona.niche.targetAccounts.join(', ') || 'none'}`);
      console.log();

      console.log(chalk.cyan('Strategy'));
      console.log(`  Growth: ${persona.strategy.preset}`);
      console.log(`  Activity: ${persona.activityPattern.preset}`);
      console.log(`  Daily limits: ${persona.strategy.dailyLimits.follows} follows, ${persona.strategy.dailyLimits.likes} likes, ${persona.strategy.dailyLimits.comments} comments`);
      console.log();

      console.log(chalk.cyan('Lifetime Stats'));
      console.log(`  Sessions: ${persona.state.totalSessions}`);
      console.log(`  Follows: ${persona.state.totalFollows}`);
      console.log(`  Likes: ${persona.state.totalLikes}`);
      console.log(`  Comments: ${persona.state.totalComments}`);
      console.log(`  Posts: ${persona.state.totalPosts}`);
      console.log(`  Searches: ${persona.state.totalSearches}`);
      console.log(`  Last active: ${persona.state.lastSessionAt ? new Date(persona.state.lastSessionAt).toLocaleString() : 'never'}`);
      console.log();

      const followedCount = Object.keys(persona.state.followedUsers || {}).length;
      console.log(chalk.cyan('Follow Graph'));
      console.log(`  Users followed: ${followedCount}`);
      console.log(`  Current followers: ${persona.state.currentFollowers}`);
      console.log(`  Target: ${persona.goals.targetFollowers.toLocaleString()}`);
      console.log();
    } catch (error) {
      console.error(chalk.red(`❌ ${error.message}`));
    }
  });

personaCmd
  .command('delete <personaId>')
  .description('Delete a saved persona')
  .action(async (personaId) => {
    try {
      const { deletePersona } = await import('../personaEngine.js');
      const { confirm } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirm',
        message: `Delete persona ${personaId}? This cannot be undone.`,
        default: false,
      }]);

      if (confirm) {
        deletePersona(personaId);
        console.log(chalk.green(`✅ Persona ${personaId} deleted`));
      }
    } catch (error) {
      console.error(chalk.red(`❌ ${error.message}`));
    }
  });

personaCmd
  .command('edit <personaId>')
  .description('Edit persona configuration')
  .option('--topics <topics>', 'Set topics (comma-separated)')
  .option('--search-terms <terms>', 'Set search terms (comma-separated)')
  .option('--target-accounts <accounts>', 'Set target accounts (comma-separated)')
  .option('--strategy <strategy>', 'Set growth strategy')
  .option('--activity <pattern>', 'Set activity pattern')
  .action(async (personaId, options) => {
    try {
      const { loadPersona, savePersona, ENGAGEMENT_STRATEGIES, ACTIVITY_PATTERNS } = await import('../personaEngine.js');
      const persona = loadPersona(personaId);

      if (options.topics) {
        persona.niche.topics = options.topics.split(',').map(t => t.trim());
      }
      if (options.searchTerms) {
        persona.niche.searchTerms = options.searchTerms.split(',').map(t => t.trim());
      }
      if (options.targetAccounts) {
        persona.niche.targetAccounts = options.targetAccounts.split(',').map(t => t.trim().replace('@', ''));
      }
      if (options.strategy && ENGAGEMENT_STRATEGIES[options.strategy]) {
        persona.strategy = { preset: options.strategy, ...ENGAGEMENT_STRATEGIES[options.strategy] };
      }
      if (options.activity && ACTIVITY_PATTERNS[options.activity]) {
        persona.activityPattern = { preset: options.activity, ...ACTIVITY_PATTERNS[options.activity] };
      }

      persona.updatedAt = new Date().toISOString();
      savePersona(persona);
      console.log(chalk.green(`✅ Persona "${persona.name}" updated`));
    } catch (error) {
      console.error(chalk.red(`❌ ${error.message}`));
    }
  });

// ============================================================================
// Parse and Run
// ============================================================================

program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
