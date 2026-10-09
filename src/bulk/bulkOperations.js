// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * XActions CSV Bulk Operations Import
 * Accept CSV/JSON/TXT of usernames and perform batch follow/unfollow/block operations.
 *
 * Kills: Phantombuster (spreadsheet input), Circleboom
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license Apache-2.0
 */

import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import os from 'os';

import { FOLLOW_STATUS, isRetryableStatus, classifyBrowserError } from '../mcp/followAction.js';

const PROGRESS_DIR = path.join(os.homedir(), '.xactions');

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
    resume,
    force = false,
    message, // for DM action
    listName, // for add-to-list action
    executor: injectedExecutor, // supplied by tests
    stateDir, // supplied by tests
  } = options;

  const stateRoot = stateDir || PROGRESS_DIR;
  const alreadyLabel = action === 'follow' ? 'Already following' : 'Already done';

  // Load blacklist
  const blacklist = await loadBlacklist(stateRoot);

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
    console.log(`\u26a0\ufe0f  About to ${action} ${filtered.length} users. Use --force to skip this warning.`);
    return { error: `Safety warning: ${filtered.length} actions. Use --force flag.` };
  }

  // Resume support: `--resume` is a flag, a path to a progress file is also
  // accepted for callers that keep their own checkpoint.
  const resumeTarget = resumeFrom || resume;
  let processedSet = new Set();
  if (resumeTarget) {
    try {
      const progressFile = resumeTarget === true
        ? await findLatestProgress(stateRoot, action)
        : resumeTarget;
      if (!progressFile) throw new Error('no previous run');
      const progress = JSON.parse(await fsp.readFile(progressFile, 'utf-8'));
      processedSet = new Set([
        ...(progress.succeeded || []),
        ...(progress.already || []),
        ...(progress.failed || []).map(f => (typeof f === 'string' ? f : f.username)),
      ]);
      console.log(`\ud83d\udd04 Resuming: skipping ${processedSet.size} already-processed users`);
    } catch {
      console.log('\u26a0\ufe0f  Could not load progress file, starting fresh');
    }
  }

  const toProcess = filtered.filter(u => !processedSet.has(u.toLowerCase()));

  // Progress tracking
  const progressFile = path.join(stateRoot, `bulk-progress-${Date.now()}.json`);
  const succeeded = [];
  const already = [];
  const failed = [];
  const startTime = Date.now();

  // Lazy-load action executor
  const executor = dryRun ? null : (injectedExecutor || await getActionExecutor(action));

  let consecutiveFailures = 0;
  let consecutiveAuthFailures = 0;
  let processed = 0;
  let stoppedEarly = '';

  for (let i = 0; i < toProcess.length; i++) {
    const username = toProcess[i];
    const num = i + 1;

    if (dryRun) {
      console.log(`[DRY RUN] [${num}/${toProcess.length}] Would ${action} @${username}`);
      succeeded.push(username);
      processed++;
      continue;
    }

    let success = false;
    let lastError = '';
    let lastStatus = '';

    for (let retry = 0; retry <= maxRetries; retry++) {
      try {
        const start = Date.now();
        const outcome = normalizeOutcome(await executor(username, { message, listName }), username, action);
        const elapsed = ((Date.now() - start) / 1000).toFixed(1);

        if (outcome.success) {
          if (outcome.status.startsWith('already_')) {
            console.log(`[${num}/${toProcess.length}] \u23ed\ufe0f  ${alreadyLabel} @${username} (${elapsed}s)`);
            already.push(username);
          } else {
            console.log(`[${num}/${toProcess.length}] \u2705 ${action} @${username} (${elapsed}s)`);
            succeeded.push(username);
          }
          success = true;
          consecutiveFailures = 0;
          consecutiveAuthFailures = 0;
          break;
        }

        lastError = outcome.message;
        lastStatus = outcome.status;
        if (!isRetryableStatus(lastStatus)) break;
        if (retry < maxRetries) {
          console.log(`[${num}/${toProcess.length}] \u26a0\ufe0f  Retry ${retry + 1}/${maxRetries} for @${username}: ${lastError}`);
          if (lastStatus === FOLLOW_STATUS.BROWSER) await resetBrowser();
          await sleep(delayMs * 2);
        }
      } catch (error) {
        lastError = error.message;
        lastStatus = classifyBrowserError(error);
        if (retry < maxRetries) {
          console.log(`[${num}/${toProcess.length}] \u26a0\ufe0f  Retry ${retry + 1}/${maxRetries} for @${username}: ${lastError}`);
          if (lastStatus === FOLLOW_STATUS.BROWSER) await resetBrowser();
          await sleep(delayMs * 2);
        }
      }
    }

    processed++;

    if (success) {
      await saveProgress(progressFile, { action, startTime, succeeded, already, failed });
    } else {
      console.log(`[${num}/${toProcess.length}] \u274c Failed @${username}: ${lastError}`);
      failed.push({ username, status: lastStatus || FOLLOW_STATUS.FAILED, error: lastError });
      consecutiveFailures++;

      // A session that X refuses is not going to start working mid-run.
      if (lastStatus === FOLLOW_STATUS.AUTH) {
        consecutiveAuthFailures++;
        if (consecutiveAuthFailures >= 3) {
          stoppedEarly = '3 in a row without a usable session — stopped early. Run `xactions login`, then `--resume`.';
          console.log(`\ud83d\uded1 ${stoppedEarly}`);
          break;
        }
      }

      // Rate limit detection
      if (consecutiveFailures >= 3) {
        console.log('\u23f8\ufe0f  3 consecutive failures \u2014 pausing for 5 minutes...');
        await sleep(300000);
        consecutiveFailures = 0;
      }

      await saveProgress(progressFile, { action, startTime, succeeded, already, failed });
      if (!skipErrors) break;
    }

    // Delay between actions
    if (i < toProcess.length - 1) {
      await sleep(delayMs);

      // Batch cooldown
      if ((i + 1) % batchSize === 0) {
        console.log(`\u23f8\ufe0f  Batch cooldown (30s) after ${i + 1} actions...`);
        await sleep(30000);
      }
    }
  }

  // The executor may have left the shared Puppeteer singleton open, and a
  // process that keeps it alive never exits after printing its own summary.
  // A dry run opened nothing, and resetBrowser is a no-op when the browser
  // is already closed.
  if (executor) await resetBrowser();

  const duration = Math.round((Date.now() - startTime) / 1000);
  const summary = {
    action,
    total: toProcess.length,
    processed,
    succeeded: succeeded.length,
    alreadyFollowing: already.length,
    failed: failed.length,
    skippedBlacklist,
    remaining: toProcess.length - processed,
    stoppedEarly: stoppedEarly || null,
    duration: `${duration}s`,
    progressFile: dryRun ? null : progressFile,
  };

  console.log(`\n\ud83d\udcca Bulk ${action} complete:`);
  console.log(`   \u2705 Succeeded: ${succeeded.length}`);
  if (action === 'follow' || already.length > 0) {
    console.log(`   \u23ed\ufe0f  ${alreadyLabel}: ${already.length}`);
  }
  console.log(`   \u274c Failed: ${failed.length}`);
  console.log(`   \u23ed\ufe0f  Blacklisted: ${skippedBlacklist}`);
  console.log(`   \u23f1\ufe0f  Duration: ${duration}s`);

  return {
    ...summary,
    results: { succeeded: [...succeeded], already: [...already], failed: [...failed] },
  };
}

/**
 * Turn whatever an action returned into an outcome.
 *
 * A tool that answers `{ success: false, status }` is a failure whatever it
 * threw or did not throw, a tool that carries no verdict at all is treated as
 * having run, and a tool that returned nothing ran nothing. Without this,
 * `bulk follow` counted a follow that never happened as a success.
 *
 * @param {*} result
 * @param {string} username
 * @param {string} action
 * @returns {{success: boolean, status: string, message: string}}
 */
function normalizeOutcome(result, username, action) {
  if (result === undefined || result === null) {
    return {
      success: false,
      status: 'not_implemented',
      message: `Action "${action}" has no implementation in this build`,
    };
  }

  if (typeof result === 'object') {
    if (typeof result.status === 'string' && result.status) {
      const ok = result.status === 'success' || result.status.startsWith('already_');
      return {
        success: ok,
        status: result.status,
        message: result.message || `@${username}: ${result.status}`,
      };
    }
    if (result.success === false) {
      return { success: false, status: 'failed', message: result.message || `@${username}: failed` };
    }
    return { success: true, status: 'success', message: result.message || `@${username}: ok` };
  }

  if (typeof result === 'boolean') {
    return {
      success: result,
      status: result ? 'success' : 'failed',
      message: `@${username}: ${result ? 'ok' : 'failed'}`,
    };
  }

  return { success: true, status: 'success', message: `@${username}: ok` };
}

/**
 * Relaunch the shared browser before the next retry.
 * @returns {Promise<void>}
 */
async function resetBrowser() {
  try {
    const { closeBrowser } = await import('../mcp/local-tools.js');
    await closeBrowser();
  } catch {
    // Nothing to close, or a build without the browser singleton.
  }
}

/**
 * The newest progress file for this action, so `--resume` can be a flag.
 *
 * @param {string} stateRoot
 * @param {string} action
 * @returns {Promise<string|null>}
 */
async function findLatestProgress(stateRoot, action) {
  let entries;
  try {
    entries = await fsp.readdir(stateRoot);
  } catch {
    return null;
  }

  let newest = null;
  let newestMtime = -1;
  for (const name of entries) {
    if (!name.startsWith('bulk-progress-') || !name.endsWith('.json')) continue;
    const full = path.join(stateRoot, name);
    try {
      const stat = await fsp.stat(full);
      const data = JSON.parse(await fsp.readFile(full, 'utf-8'));
      if (data.action && data.action !== action) continue;
      if (stat.mtimeMs > newestMtime) {
        newestMtime = stat.mtimeMs;
        newest = full;
      }
    } catch {
      // A half-written file from a run that died — skip it.
    }
  }
  return newest;
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

async function loadBlacklist(stateRoot = PROGRESS_DIR) {
  try {
    const content = await fsp.readFile(path.join(stateRoot, 'blacklist.txt'), 'utf-8');
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
