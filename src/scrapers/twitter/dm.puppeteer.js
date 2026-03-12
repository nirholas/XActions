/**
 * Encrypted DM Scraper (Puppeteer-based)
 * Reads encrypted DMs that are invisible to the HTTP API.
 * Handles the encryption passcode gate automatically.
 *
 * @author nich (@nichxbt)
 * @see https://xactions.app
 * @license MIT
 */

import { randomDelay } from './index.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CONFIG_PATH = path.join(os.homedir(), '.xactions', 'config.json');

async function loadConfig(configPath) {
  try {
    return JSON.parse(await fs.readFile(configPath || CONFIG_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

// ============================================================================
// Passcode Gate
// ============================================================================

/**
 * Handle the encrypted DM passcode gate.
 * @param {import('puppeteer').Page} page - Puppeteer page on /messages
 * @param {Object} options
 * @param {string} [options.passcode] - 4-digit passcode (highest priority)
 * @returns {Promise<boolean>} true if unlocked (or no gate), false if blocked
 */
export async function handleDmPasscodeGate(page, options = {}) {
  // X may redirect to /i/chat/pin/recovery or show an inline gate on /messages
  const hasGate = page.url().includes('/pin/recovery') || await page.evaluate(() =>
    document.body?.textContent?.includes('Enter Passcode') ||
    document.body?.textContent?.includes('passcode is required to recover your encryption keys')
  );
  if (!hasGate) return true;

  const config = await loadConfig();
  const passcode = options.passcode || config.dmPasscode;

  if (!passcode) return false;
  if (!/^\d{4}$/.test(passcode)) return false;

  // Find the first passcode input — 4 individual inputs, one per digit.
  // Try clicking/focusing the first one; fall back to all inputs if pixel check fails.
  const focused = await page.evaluate(() => {
    const inputs = document.querySelectorAll('input');
    for (const el of inputs) {
      // Try pixel position first (inline gate)
      const rect = el.getBoundingClientRect();
      if (rect.top > 400 && rect.top < 600) { el.click(); el.focus(); return true; }
    }
    // Fallback: focus the first text input on the page (redirect gate at /pin/recovery)
    const first = document.querySelector('input[type="text"]') || document.querySelector('input');
    if (first) { first.click(); first.focus(); return true; }
    return false;
  });
  if (!focused) return false;
  await sleep(300);

  for (const digit of passcode) {
    await page.keyboard.press(`Digit${digit}`);
    await sleep(300);
  }

  // Wait for redirect back to /messages after successful passcode entry
  await sleep(5000);

  // Check if we're still on the passcode page
  if (page.url().includes('/pin/recovery')) return false;

  const stillGated = await page.evaluate(() =>
    document.body?.textContent?.includes('Enter Passcode') ||
    document.body?.textContent?.includes('passcode is required')
  );

  if (stillGated) return false;

  return true;
}

// ============================================================================
// Conversation List Scraper
// ============================================================================

/**
 * Scrape the DM conversation list (supports encrypted + regular DMs).
 * @param {import('puppeteer').Page} page
 * @param {Object} options
 * @param {number} [options.limit=20] - Max conversations to return
 * @param {string} [options.passcode] - DM encryption passcode
 * @returns {Promise<Array<{name: string, preview: string, time: string, testId: string}>>}
 */
export async function scrapeDmConversations(page, options = {}) {
  const { limit = 20, passcode } = options;

  await page.goto('https://x.com/messages', { waitUntil: 'networkidle2', timeout: 30000 });

  // Check auth
  if (page.url().includes('/login') || page.url().includes('/i/flow/login')) {
    throw new Error('Authentication failed — cookie may be expired.\n\nRun: xactions login');
  }

  await randomDelay(2000, 3000);

  if (!(await handleDmPasscodeGate(page, { passcode }))) {
    throw new Error('DM encryption passcode required. Set dmPasscode in ~/.xactions/config.json or pass --passcode.');
  }

  // After passcode gate, ensure we're on /messages or /i/chat (X may redirect elsewhere)
  if (!page.url().includes('/messages') && !page.url().includes('/i/chat')) {
    await page.goto('https://x.com/messages', { waitUntil: 'networkidle2', timeout: 30000 });
  }

  await randomDelay(2000, 4000);

  const conversations = [];
  const seen = new Set();

  async function scrapeVisible() {
    const items = await page.evaluate(() => {
      const results = [];
      // Try encrypted DM selectors first, then regular
      const convos = document.querySelectorAll(
        '[data-testid^="dm-conversation-item-"], [data-testid="conversation"]'
      );
      for (const el of convos) {
        const testId = el.getAttribute('data-testid') || '';
        // /i/chat UI uses Tailwind classes; /messages UI uses [dir] attributes
        const nameEl = el.querySelector('.font-bold') ||
                       el.querySelector('[dir="ltr"] > span') ||
                       el.querySelector('[dir="ltr"]');
        const previewEl = el.querySelector('[dir="auto"]');
        const timeEl = el.querySelector('time');
        // Extract username from avatar link if available (e.g. href="/username")
        const avatarLink = el.querySelector('a[href^="https://x.com/"]');
        const handle = avatarLink?.getAttribute('href')?.replace('https://x.com/', '') || '';
        results.push({
          name: nameEl?.textContent?.trim() || handle || '',
          preview: previewEl?.textContent?.trim() || '',
          time: timeEl?.getAttribute('datetime') || timeEl?.textContent?.trim() || '',
          testId,
          handle,
        });
      }
      return results;
    });

    for (const item of items) {
      if (!seen.has(item.testId) && item.testId) {
        seen.add(item.testId);
        conversations.push(item);
      }
    }
  }

  await scrapeVisible();

  // Scroll to load more conversations if needed
  let scrolls = 0;
  while (conversations.length < limit && scrolls < 5) {
    await page.evaluate(() => {
      const list = document.querySelector('[data-testid="dm-inbox-panel"]') ||
                   document.querySelector('section');
      if (list) list.scrollTop = list.scrollHeight;
    });
    await randomDelay(1500, 3000);
    const prevCount = conversations.length;
    await scrapeVisible();
    if (conversations.length === prevCount) break;
    scrolls++;
  }

  return conversations.slice(0, limit);
}

// ============================================================================
// Message Extraction
// ============================================================================

/**
 * Read DM messages with a specific user.
 * Navigates to /messages, handles passcode, finds conversation, extracts messages.
 * @param {import('puppeteer').Page} page
 * @param {string} username - Target username (without @)
 * @param {Object} options
 * @param {number} [options.limit=50] - Max messages to return
 * @param {string} [options.passcode] - DM encryption passcode
 * @param {number} [options.scrollAttempts=3] - How many times to scroll up for older messages
 * @returns {Promise<Array<{text: string, time: string, sender: string, hasMedia: boolean}>>}
 */
export async function scrapeDmMessages(page, username, options = {}) {
  const { limit = 50, passcode, scrollAttempts = 3, skipNavigation = false } = options;

  if (!skipNavigation) {
    await page.goto('https://x.com/messages', { waitUntil: 'networkidle2', timeout: 30000 });

    // Check auth
    if (page.url().includes('/login') || page.url().includes('/i/flow/login')) {
      throw new Error('Authentication failed — cookie may be expired.\n\nRun: xactions login');
    }

    await randomDelay(2000, 4000);

    if (!(await handleDmPasscodeGate(page, { passcode }))) {
      throw new Error('DM encryption passcode required. Set dmPasscode in ~/.xactions/config.json or pass --passcode.');
    }

    // After passcode gate, ensure we're on /messages or /i/chat (X may redirect elsewhere)
    if (!page.url().includes('/messages') && !page.url().includes('/i/chat')) {
      await page.goto('https://x.com/messages', { waitUntil: 'networkidle2', timeout: 30000 });
    }

    await randomDelay(2000, 4000);
  }

  // Find and open conversation
  if (!(await findConversation(page, username))) {
    return [];
  }

  // Wait for encrypted messages to decrypt and render
  await randomDelay(6000, 9000);

  // Scroll up for older messages
  for (let i = 0; i < scrollAttempts; i++) {
    await page.evaluate(() => {
      const scroller = document.querySelector('[data-testid="dm-message-list-container"]') ||
                       document.querySelector('[data-testid="DmScrollerContainer"]');
      if (scroller) scroller.scrollTop = 0;
    });
    await randomDelay(2000, 3500);
  }

  // Scroll back to bottom so newest messages are visible too
  await page.evaluate(() => {
    const scroller = document.querySelector('[data-testid="dm-message-list-container"]') ||
                     document.querySelector('[data-testid="DmScrollerContainer"]');
    if (scroller) scroller.scrollTop = scroller.scrollHeight;
  });
  await randomDelay(2000, 3500);

  const messages = await extractMessages(page);

  // If caller skipped navigation (export loop), ensure conversation list sidebar is still visible.
  // X desktop uses a split-pane layout so the sidebar persists, but on narrow viewports
  // or future UI changes the sidebar may collapse — navigate back defensively.
  if (skipNavigation) {
    const sidebarVisible = await page.$('[data-testid="dm-inbox-panel"]');
    if (!sidebarVisible) {
      const backBtn = await page.$('[data-testid="app-bar-back"]');
      if (backBtn) { await backBtn.click(); await randomDelay(1500, 2500); }
    }
  }

  return messages.slice(0, limit);
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Find and click a conversation by username (fuzzy match).
 */
async function findConversation(page, targetUser) {
  const terms = [
    targetUser.toLowerCase(),
    targetUser.toLowerCase().replace(/_/g, ' '),
    targetUser.toLowerCase().replace(/[_-]/g, ''),
  ];

  async function clickMatch() {
    const convos = await page.$$('[data-testid^="dm-conversation-item-"], [data-testid="conversation"]');
    for (const conv of convos) {
      // Match against display name and handle, not full conversation text
      const { name, handle } = await conv.evaluate(el => {
        const nameEl = el.querySelector('.font-bold') ||
                       el.querySelector('[dir="ltr"] > span') ||
                       el.querySelector('[dir="ltr"]');
        const avatarLink = el.querySelector('a[href^="https://x.com/"]');
        const handle = avatarLink?.getAttribute('href')?.replace('https://x.com/', '')?.toLowerCase() || '';
        return { name: nameEl?.textContent?.toLowerCase() || '', handle };
      });
      const nameStripped = name.replace(/\s+/g, '');
      if (terms.some(t => name.includes(t) || nameStripped.includes(t.replace(/\s+/g, '')) || handle === t)) {
        await conv.click();
        return true;
      }
    }
    return false;
  }

  if (await clickMatch()) return true;

  // Scroll to find older conversations
  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => {
      const list = document.querySelector('[data-testid="dm-inbox-panel"]') ||
                   document.querySelector('section');
      if (list) list.scrollTop = list.scrollHeight;
    });
    await randomDelay(1500, 3000);
    if (await clickMatch()) return true;
  }

  return false;
}

/**
 * Extract messages from the currently open conversation.
 */
async function extractMessages(page) {
  return page.evaluate(() => {
    const results = [];

    // Encrypted DM UI: message-{uuid} (exclude message-text-*, message-list-*)
    const sel = '[data-testid^="message-"]:not([data-testid^="message-text-"]):not([data-testid^="message-list"]):not([data-testid*="-container"])';
    const msgEls = document.querySelectorAll(sel);

    if (msgEls.length === 0) {
      // Fallback: try regular DM selector
      const fallback = document.querySelectorAll('[data-testid="messageEntry"]');
      if (fallback.length > 0) {
        for (const msg of fallback) {
          const text = msg.querySelector('[data-testid="tweetText"]')?.textContent || '';
          const time = msg.querySelector('time')?.getAttribute('datetime') || '';
          if (text) results.push({ text, time, sender: 'unknown', hasMedia: false });
        }
      }
      return results;
    }

    // Reference for alignment fallback
    const listContainer = document.querySelector('[data-testid="dm-message-list-container"]') ||
                          document.querySelector('[data-testid="dm-message-list"]') ||
                          document.querySelector('[data-testid="dm-conversation-panel"]');
    const listRect = listContainer?.getBoundingClientRect() || { left: 0, width: 800 };
    const listCenter = listRect.left + listRect.width / 2;

    for (const msg of msgEls) {
      const testId = msg.getAttribute('data-testid') || '';
      const uuid = testId.replace('message-', '');

      const textContainer = msg.querySelector(`[data-testid="message-text-${uuid}"]`) ||
                            msg.querySelector('[data-testid^="message-text-"]') ||
                            msg.querySelector('[data-testid="tweetText"]');

      let text = '';
      let time = '';

      if (textContainer) {
        const hiddenTime = textContainer.querySelector('[aria-hidden="true"]');
        if (hiddenTime) time = hiddenTime.textContent?.trim() || '';

        const textSpan = textContainer.querySelector('span[dir="auto"]');
        if (textSpan) {
          text = textSpan.textContent?.trim() || '';
        } else {
          text = textContainer.textContent || '';
          if (time) {
            while (text.includes(time)) text = text.replace(time, '');
            text = text.trim();
          }
        }
      }

      if (!time) {
        const timeEl = msg.querySelector('time');
        time = timeEl?.getAttribute('datetime') || timeEl?.textContent?.trim() || '';
      }

      // Sender detection: uses background color heuristics tuned for X's dark mode.
      // Blue bubbles (b>180, b>r*1.5) = current user; dark bubbles (r<80,g<80,b<80) = other party.
      // Known limitation: thresholds may not work in light/dim mode or with custom themes.
      // Falls back to horizontal alignment (right = me, left = them) when color detection is inconclusive.
      let sender = 'unknown';
      let el = textContainer || msg;
      for (let i = 0; i < 5 && el; i++) {
        const bg = window.getComputedStyle(el).backgroundColor;
        if (bg) {
          const match = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/);
          if (match) {
            const [, r, g, b] = match.map(Number);
            const a = match[4] !== undefined ? parseFloat(match[4]) : 1;
            if (a === 0) { el = el.parentElement; continue; } // transparent — skip
            if (b > 180 && b > r * 1.5) { sender = 'me'; break; }
            if (r < 80 && g < 80 && b < 80 && r === g && g === b) { sender = 'them'; break; }
            if (r < 60 && g < 60 && b < 60) { sender = 'them'; break; }
          }
        }
        el = el.parentElement;
      }

      // Alignment fallback
      if (sender === 'unknown') {
        const rect = msg.getBoundingClientRect();
        const msgCenter = rect.left + rect.width / 2;
        sender = msgCenter > listCenter ? 'me' : 'them';
      }

      const hasMedia = !!msg.querySelector('img:not([role="presentation"]):not([alt=""])') ||
                       !!msg.querySelector('video');

      if (text || hasMedia) {
        results.push({ text: text || '(media)', time, sender, hasMedia });
      }
    }

    return results;
  });
}
