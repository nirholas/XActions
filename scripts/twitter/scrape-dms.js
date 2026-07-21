// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================
 * 💬 Scrape DMs - XActions
 * ============================================
 *
 * @name         scrape-dms
 * @description  Export the currently-open DM conversation: each message with sender, text, timestamp, and direction (in/out).
 * @author       nichxbt
 * @version      1.0.0
 * @date         2026-07-20
 * @website      https://xactions.app
 *
 * Usage:
 *   1. Go to https://x.com/messages and open ONE conversation
 *      (the URL becomes x.com/messages/<conversation-id>)
 *   2. Open the browser console (F12 or Cmd+Option+I -> Console)
 *   3. (Optional) edit the CONFIG options at the top of the script
 *   4. Paste this entire script and press Enter
 *
 * Example:
 *   Open a chat, paste, and the script scrolls the message pane upward to load
 *   history, dedupes each bubble, tags it out (you) or in (them) by its position,
 *   then downloads dm_<name>_<date>.json and .csv in chronological order.
 *   To stop early, run window.stopScrapeDMs() in the console.
 *
 * Privacy note: DM content is private. Be mindful of where you store or share exports.
 *
 * ============================================
 */

(async function scrapeDMs() {
  'use strict';

  // ============================================
  // 📝 CONFIGURATION - Customize these options
  // ============================================
  const CONFIG = {
    // Maximum number of messages to collect
    maxMessages: 2000,

    // Maximum scroll attempts before giving up
    maxScrollAttempts: 120,

    // Stop after this many scrolls with no new messages (top of history)
    noNewThreshold: 6,

    // Delay between upward scrolls (ms). Raise if history loads slowly.
    scrollDelay: 1200,

    // Auto-download the results as files when finished
    downloadJSON: true,
    downloadCSV: true
  };

  // ============================================
  // 🔧 SELECTORS
  // ============================================
  const SELECTORS = {
    // Each message bubble
    message: '[data-testid="messageEntry"]',
    // Scroller that holds the conversation history
    scroller: '[data-testid="DmScrollerContainer"]',
    // Conversation heading (used to name the export file)
    heading: 'h2[role="heading"], [data-testid="DMConversationHeader"]'
  };

  // ============================================
  // 🛠️ HELPERS
  // ============================================
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const log = {
    info: (msg) => console.log(`ℹ️ ${msg}`),
    success: (msg) => console.log(`✅ ${msg}`),
    warning: (msg) => console.log(`⚠️ ${msg}`),
    error: (msg) => console.log(`❌ ${msg}`)
  };

  const download = (content, filename, type) => {
    try {
      const blob = new Blob([content], { type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    } catch (e) {
      log.error(`Failed to download ${filename}: ${e.message}`);
      return false;
    }
  };

  const getConversationName = () => {
    const el = document.querySelector(SELECTORS.heading);
    const raw = el ? el.textContent.trim() : '';
    return (raw || 'conversation').replace(/[^A-Za-z0-9_]+/g, '_').slice(0, 40) || 'conversation';
  };

  const getScroller = () => {
    return document.querySelector(SELECTORS.scroller) ||
           document.querySelector('[data-testid="DMDrawer"] [role="region"]') ||
           document.querySelector('[role="main"] [style*="overflow"]') ||
           document.querySelector('[role="main"]');
  };

  // Direction is derived from horizontal position, which is locale-independent:
  // outgoing (yours) bubbles sit on the right half, incoming on the left.
  const getDirection = (msg, containerRect) => {
    try {
      const rect = msg.getBoundingClientRect();
      if (!rect.width || !containerRect || !containerRect.width) return 'unknown';
      const msgCenter = rect.left + rect.width / 2;
      const containerCenter = containerRect.left + containerRect.width / 2;
      return msgCenter > containerCenter ? 'out' : 'in';
    } catch (e) {
      return 'unknown';
    }
  };

  const getTimestamp = (msg) => {
    // X stores the exact time in a title attribute or a nearby time element
    const timeEl = msg.querySelector('time') ||
                   (msg.closest('[role="listitem"]') || msg.parentElement || msg).querySelector('time');
    if (timeEl) return timeEl.getAttribute('datetime') || timeEl.textContent.trim() || '';
    const titled = msg.querySelector('[title]');
    return titled ? (titled.getAttribute('title') || '') : '';
  };

  const extractText = (msg) => {
    const textEl = msg.querySelector('[data-testid="tweetText"]');
    if (textEl && textEl.textContent.trim()) return textEl.textContent.trim();
    return (msg.textContent || '').trim();
  };

  // ============================================
  // 🎯 MAIN
  // ============================================
  let stopped = false;
  window.stopScrapeDMs = () => {
    stopped = true;
    log.warning('Stop requested. Finishing the current pass, then exporting.');
  };

  console.log(`
╔══════════════════════════════════════════════════════════╗
║  💬 SCRAPE DMS - XActions                                ║
║  👤 Author: nichxbt                                      ║
║  🌐 https://xactions.app                                 ║
╚══════════════════════════════════════════════════════════╝
  `);

  // Page guard: must be inside an open conversation (messages/<id>)
  if (!/\/messages\/[^/]+/.test(window.location.pathname)) {
    log.warning('You do not have a single DM conversation open.');
    log.info('Go to https://x.com/messages, click a conversation, then paste this script again.');
    return;
  }

  const conversationName = getConversationName();
  log.info(`Conversation: ${conversationName}`);
  log.info(`Max messages: ${CONFIG.maxMessages}`);
  log.info('Scrolling upward to load history...');
  log.info('To stop early: window.stopScrapeDMs()');
  console.log('');

  const scroller = getScroller();
  if (!scroller) {
    log.warning('Could not locate the message pane. Try clicking inside the conversation first.');
    return;
  }

  const seen = new Set();
  const messages = [];
  let scrollAttempts = 0;
  let noNewCount = 0;

  while (!stopped && messages.length < CONFIG.maxMessages && scrollAttempts < CONFIG.maxScrollAttempts) {
    const containerRect = scroller.getBoundingClientRect();
    const bubbles = document.querySelectorAll(SELECTORS.message);
    const fresh = [];

    bubbles.forEach(msg => {
      try {
        const text = extractText(msg);
        if (!text) return;
        const timestamp = getTimestamp(msg);
        const direction = getDirection(msg, containerRect);
        const key = `${direction}|${text.slice(0, 80)}|${timestamp}`;
        if (seen.has(key)) return;
        seen.add(key);
        fresh.push({
          sender: direction === 'out' ? 'you' : (direction === 'in' ? 'them' : 'unknown'),
          direction,
          text,
          timestamp
        });
      } catch (e) {
        // Skip malformed bubbles
      }
    });

    if (fresh.length > 0) {
      // Scrolling upward reveals OLDER messages at the top, so prepend them
      // (in DOM order) to keep the final array chronological (oldest first).
      messages.unshift(...fresh);
      log.info(`Collected ${messages.length} messages (+${fresh.length})`);
      noNewCount = 0;
    } else {
      noNewCount++;
      if (noNewCount >= CONFIG.noNewThreshold) {
        log.warning('No new messages after several scrolls. Reached the top of the history.');
        break;
      }
    }

    scroller.scrollTop = Math.max(0, scroller.scrollTop - Math.round(scroller.clientHeight * 0.8) - 200);
    await sleep(CONFIG.scrollDelay);
    scrollAttempts++;
  }

  // ============================================
  // 📊 SUMMARY
  // ============================================
  const outCount = messages.filter(m => m.direction === 'out').length;
  const inCount = messages.filter(m => m.direction === 'in').length;

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  📊 SCRAPE DMS - COMPLETE                                ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`💬 Total messages: ${messages.length}`);
  console.log(`   → Sent (you):   ${outCount}`);
  console.log(`   ← Received:     ${inCount}`);
  console.log(`📜 Scroll attempts: ${scrollAttempts}`);

  if (messages.length === 0) {
    log.warning('No messages found. Scroll into the conversation body and try again.');
    return { conversation: conversationName, messages: [] };
  }

  console.log('\n📝 Preview:');
  messages.slice(0, 5).forEach(m => {
    const arrow = m.direction === 'out' ? '→' : (m.direction === 'in' ? '←' : '·');
    console.log(`   ${arrow} ${m.text.slice(0, 60)}${m.text.length > 60 ? '...' : ''}`);
  });

  // ============================================
  // 💾 EXPORT
  // ============================================
  const dateStr = new Date().toISOString().split('T')[0];
  const result = {
    conversation: conversationName,
    exportedAt: new Date().toISOString(),
    messageCount: messages.length,
    messages
  };

  console.log('');
  if (CONFIG.downloadJSON) {
    if (download(JSON.stringify(result, null, 2), `dm_${conversationName}_${dateStr}.json`, 'application/json')) {
      log.success('JSON downloaded');
    }
  }

  if (CONFIG.downloadCSV) {
    const esc = (v) => `"${String(v).replace(/"/g, '""').replace(/\n/g, ' ')}"`;
    const csv = [
      ['Direction', 'Sender', 'Text', 'Timestamp'].join(','),
      ...messages.map(m => [esc(m.direction), esc(m.sender), esc(m.text), esc(m.timestamp)].join(','))
    ].join('\n');
    if (download(csv, `dm_${conversationName}_${dateStr}.csv`, 'text/csv')) {
      log.success('CSV downloaded');
    }
  }

  window.scrapedDMs = result;
  console.log('\n💡 Access your data: window.scrapedDMs');
  console.log('⚠️ Privacy note: be careful sharing DM exports.');
  console.log('✅ Script completed! by nichxbt');

  return result;
})();
