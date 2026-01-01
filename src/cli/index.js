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
// Parse and Run
// ============================================================================

program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
