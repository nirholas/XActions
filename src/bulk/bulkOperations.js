/**
 * XActions CSV Bulk Operations Import
 * Accept CSV/JSON/TXT of usernames and perform batch follow/unfollow/block operations.
 *
 * Kills: Phantombuster (spreadsheet input), Circleboom
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import os from 'os';

const PROGRESS_DIR = path.join(os.homedir(), '.xactions');
const BLACKLIST_FILE = path.join(PROGRESS_DIR, 'blacklist.txt');

// Daily action caps (configurable)
const DEFAULT_CAPS = {
  follow: 400,
  unfollow: 1000,
  block: 200,
  unblock: 500,
  mute: 500,
  unmute: 500,
  'like-latest': 500,
  dm: 100,
  'scrape-profile': 5000,
  'add-to-list': 500,
};

// ============================================================================
// Input Parsing
// ============================================================================

/**
 * Parse a CSV, JSON, or TXT file into an array of clean usernames
 */
export async function parseBulkInput(filePath) {
  const content = await fsp.readFile(filePath, 'utf-8');
  const ext = path.extname(filePath).toLowerCase();

  let usernames = [];

  if (ext === '.json') {
    const data = JSON.parse(content);
    if (Array.isArray(data)) {
      usernames = data.map(item => {
        if (typeof item === 'string') return item;
        return item.username || item.handle || item.screen_name || item.user || '';
      });
    }
  } else if (ext === '.csv') {
    const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return [];

    // Detect header row
    const header = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
    const usernameIdx = header.findIndex(h =>
      ['username', 'handle', 'screen_name', 'user', 'twitter', 'twitterurl'].includes(h)
    );

    if (usernameIdx >= 0) {
      // CSV with headers
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]);
        if (cols[usernameIdx]) usernames.push(cols[usernameIdx]);
      }
    } else {
      // Single column CSV or no header match — treat first column as usernames
      for (const line of lines) {
        const cols = parseCSVLine(line);
        if (cols[0]) usernames.push(cols[0]);
      }
    }
  } else {
    // TXT — one username per line
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      usernames.push(trimmed);
    }
  }

  // Clean usernames
  return usernames
    .map(u => u.toString().trim().replace(/^@/, '').replace(/^https?:\/\/(x|twitter)\.com\//, '').replace(/\/$/, ''))
    .filter(u => u && u.length > 0 && !u.includes(' '));
}

/**
 * Execute bulk operations on a list of usernames
 */
export async function bulkExecute(usernames, action, options = {}) {
  const {
    dryRun = false,
    delayMs = 2000,
    batchSize = 10,
    maxRetries = 2,
    skipErrors = true,
    logFile,
    resumeFrom,
    force = false,
    message, // for DM action
    listName, // for add-to-list action
  } = options;

  // Load blacklist
  const blacklist = await loadBlacklist();

  // Filter blacklisted
  const filtered = usernames.filter(u => !blacklist.has(u.toLowerCase()));
  const skippedBlacklist = usernames.length - filtered.length;

  // Check daily cap
  const cap = DEFAULT_CAPS[action] || 1000;
  if (filtered.length > cap && !force) {
    return { error: `Action "${action}" capped at ${cap}/day. Use --force to override. Requested: ${filtered.length}` };
  }

  // Safety warning check
  if (filtered.length > 100 && !force && !dryRun) {
    console.log(`⚠️  About to ${action} ${filtered.length} users. Use --force to skip this warning.`);
    return { error: `Safety warning: ${filtered.length} actions. Use --force flag.` };
  }

  // Resume support
  let processedSet = new Set();
  if (resumeFrom) {
    try {
      const progress = JSON.parse(await fsp.readFile(resumeFrom, 'utf-8'));
      processedSet = new Set([...(progress.succeeded || []), ...(progress.failed || [])]);
      console.log(`🔄 Resuming: skipping ${processedSet.size} already-processed users`);
    } catch {
      console.log('⚠️  Could not load progress file, starting fresh');
    }
  }

  const toProcess = filtered.filter(u => !processedSet.has(u.toLowerCase()));

  // Progress tracking
  const progressFile = path.join(PROGRESS_DIR, `bulk-progress-${Date.now()}.json`);
  const succeeded = [];
  const failed = [];
  const skipped = [];
  const startTime = Date.now();

  // Lazy-load action executor
  const executor = dryRun ? null : await getActionExecutor(action);

  let consecutiveFailures = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const username = toProcess[i];
    const num = i + 1;

    if (dryRun) {
      console.log(`[DRY RUN] [${num}/${toProcess.length}] Would ${action} @${username}`);
      succeeded.push(username);
      continue;
    }

    let success = false;
    let lastError = '';

    for (let retry = 0; retry <= maxRetries; retry++) {
      try {
        const start = Date.now();
        await executor(username, { message, listName });
        const elapsed = ((Date.now() - start) / 1000).toFixed(1);
        console.log(`[${num}/${toProcess.length}] ✅ ${action} @${username} (${elapsed}s)`);
        succeeded.push(username);
        success = true;
        consecutiveFailures = 0;
        break;
      } catch (error) {
        lastError = error.message;
        if (retry < maxRetries) {
          console.log(`[${num}/${toProcess.length}] ⚠️  Retry ${retry + 1}/${maxRetries} for @${username}: ${lastError}`);
          await sleep(delayMs * 2);
        }
      }
    }

    if (!success) {
      console.log(`[${num}/${toProcess.length}] ❌ Failed @${username}: ${lastError}`);
      failed.push({ username, error: lastError });
      consecutiveFailures++;

      // Rate limit detection
      if (consecutiveFailures >= 3) {
        console.log('⏸️  3 consecutive failures — pausing for 5 minutes...');
        await sleep(300000);
        consecutiveFailures = 0;
      }

      if (!skipErrors) break;
    }

    // Save progress after each action
    await saveProgress(progressFile, { succeeded, failed, skipped, action, startTime });

    // Delay between actions
    if (i < toProcess.length - 1) {
      await sleep(delayMs);

      // Batch cooldown
      if ((i + 1) % batchSize === 0) {
        console.log(`⏸️  Batch cooldown (30s) after ${i + 1} actions...`);
        await sleep(30000);
      }
    }
  }

  const duration = Math.round((Date.now() - startTime) / 1000);
  const summary = {
    action,
    total: toProcess.length,
    succeeded: succeeded.length,
    failed: failed.length,
    skippedBlacklist,
    duration: `${duration}s`,
    progressFile: dryRun ? null : progressFile,
  };

  console.log(`\n📊 Bulk ${action} complete:`);
  console.log(`   ✅ Succeeded: ${succeeded.length}`);
  console.log(`   ❌ Failed: ${failed.length}`);
  console.log(`   ⏭️  Blacklisted: ${skippedBlacklist}`);
  console.log(`   ⏱️  Duration: ${duration}s`);

  return { ...summary, succeeded, failed: failed.map(f => f.username || f) };
}

/**
 * Bulk scrape profiles
 */
export async function bulkScrape(usernames, options = {}) {
  const { output, delayMs = 1500 } = options;
  const results = [];

  let scrapers;
  let browser;
  let page;

  try {
    scrapers = await import('../scrapers/index.js');
    browser = await scrapers.createBrowser({ headless: true });
    page = await scrapers.createPage(browser);
  } catch (error) {
    return { error: `Failed to initialize scraper: ${error.message}` };
  }

  try {
    for (let i = 0; i < usernames.length; i++) {
      try {
        console.log(`[${i + 1}/${usernames.length}] 🔍 Scraping @${usernames[i]}...`);
        const profile = await scrapers.scrapeProfile(page, usernames[i]);
        results.push(profile);
      } catch (error) {
        console.log(`[${i + 1}/${usernames.length}] ❌ @${usernames[i]}: ${error.message}`);
        results.push({ username: usernames[i], error: error.message });
      }
      if (i < usernames.length - 1) await sleep(delayMs);
    }
  } finally {
    await browser.close();
  }

  if (output) {
    const ext = path.extname(output).toLowerCase();
    if (ext === '.csv') {
      await fsp.writeFile(output, arrayToCsv(results));
    } else {
      await fsp.writeFile(output, JSON.stringify(results, null, 2));
    }
    console.log(`💾 Results saved to ${output}`);
  }

  return { results, count: results.length };
}

// ============================================================================
// Helpers
// ============================================================================

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') { inQuotes = !inQuotes; continue; }
    if (char === ',' && !inQuotes) { result.push(current.trim()); current = ''; continue; }
    current += char;
  }
  result.push(current.trim());
  return result;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function loadBlacklist() {
  try {
    const content = await fsp.readFile(BLACKLIST_FILE, 'utf-8');
    return new Set(content.split('\n').map(l => l.trim().toLowerCase()).filter(Boolean));
  } catch {
    return new Set();
  }
}

async function saveProgress(filePath, data) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(filePath, JSON.stringify(data, null, 2));
}

async function getActionExecutor(action) {
  // Lazy-load local tools for action execution
  const localTools = await import('../mcp/local-tools.js');
  const actionMap = {
    follow: (u) => localTools.x_follow?.({ username: u }) || Promise.resolve(),
    unfollow: (u) => localTools.x_unfollow?.({ username: u }) || Promise.resolve(),
    block: (u) => localTools.x_block?.({ username: u }) || Promise.resolve(),
    unblock: (u) => localTools.x_unblock?.({ username: u }) || Promise.resolve(),
    mute: (u) => localTools.x_mute?.({ username: u }) || Promise.resolve(),
    unmute: (u) => localTools.x_unmute?.({ username: u }) || Promise.resolve(),
    'like-latest': (u) => localTools.x_like?.({ username: u }) || Promise.resolve(),
    'scrape-profile': (u) => localTools.x_get_profile?.({ username: u }) || Promise.resolve(),
    dm: (u, opts) => localTools.x_send_dm?.({ username: u, message: opts?.message }) || Promise.resolve(),
    'add-to-list': (u, opts) => localTools.x_add_to_list?.({ username: u, listName: opts?.listName }) || Promise.resolve(),
  };
  return actionMap[action] || (() => Promise.reject(new Error(`Unknown action: ${action}`)));
}

function arrayToCsv(arr) {
  if (!arr.length) return '';
  const allKeys = new Set();
  for (const obj of arr) {
    if (obj && typeof obj === 'object') Object.keys(obj).forEach(k => allKeys.add(k));
  }
  const headers = [...allKeys];
  const lines = [headers.join(',')];
  for (const obj of arr) {
    lines.push(headers.map(h => {
      const val = obj?.[h];
      if (val === undefined || val === null) return '';
      const str = String(val);
      return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(','));
  }
  return lines.join('\n');
}

// by nichxbt
