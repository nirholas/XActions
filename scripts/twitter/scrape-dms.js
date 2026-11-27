// GENERATED FILE: a copy of browser/scrapeDMs.js, written by scripts/build-script-manifest.mjs. Edit browser/scrapeDMs.js instead, then run: npm run browser:build
// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================
 * 💬 Scrape DMs - XActions
 * ============================================
 *
 * @name        scrapeDMs.js
 * @title       Scrape DMs
 * @description Export the open DM conversation (sender, text, timestamp, direction) as JSON, CSV or text, or list your inbox conversations.
 * @category    messages
 * @page        x.com/messages/<id> or x.com/messages
 * @writes      false
 * @aliases     scripts/dmExporter.js, scripts/scrapeDMs.js, scripts/twitter/scrape-dms.js
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.1.0
 * @date        2026-11-27
 * @website     https://xactions.app
 *
 * Usage:
 *   1. Go to https://x.com/messages and open ONE conversation
 *      (the URL becomes x.com/messages/<conversation-id>)
 *   2. Open the browser console (F12 or Cmd+Option+I -> Console)
 *   3. (Optional) edit the CONFIG options at the top of the script
 *   4. Paste browser/scrapeDMs.js and press Enter
 *
 * Example:
 *   Open a chat, paste, and the script scrolls the message pane upward to load
 *   history, dedupes each bubble, tags it out (you) or in (them) by its position,
 *   then downloads dm_<name>_<date>.json and .csv in chronological order.
 *   To stop early, run window.stopScrapeDMs() in the console.
 *
 *   Paste it on x.com/messages with no conversation open and it lists the
 *   inbox conversations (name, last message, time, unread) instead
 *   (listConversations). Set openFirstConversation = true to open the first
 *   conversation and export its messages.
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
    downloadCSV: true,
    downloadTXT: false,         // Also download a plain-text transcript ([You] / [Them] lines)

    // Copy the result JSON to the clipboard when finished
    copyToClipboard: false,

    // Inbox (x.com/messages with no conversation open)
    listConversations: true,      // List inbox conversations instead of stopping
    maxConversations: 20,         // Max conversations to list
    openFirstConversation: false, // Open the first conversation and export its messages
    includeConversationList: false // Add the visible inbox list to a conversation export (result.conversations)
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
    heading: 'h2[role="heading"], [data-testid="DMConversationHeader"]',
    // Inbox conversation row
    conversation: '[data-testid="conversation"]'
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

  const copyToClipboard = async (data) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      log.success('Copied to clipboard');
    } catch (e) {
      log.warning('Could not copy to clipboard (click the page first, then copy(window.scrapedDMs)).');
    }
  };

  // Visible inbox rows: name, last message preview, time, unread badge
  const getConversationList = () => {
    const conversations = [];
    document.querySelectorAll(SELECTORS.conversation).forEach((conv, i) => {
      if (i >= CONFIG.maxConversations) return;
      const name = conv.querySelector('[dir="ltr"]')?.textContent || '';
      const spans = conv.querySelectorAll('span');
      const lastMsg = conv.querySelector('[data-testid="lastMessage"]')?.textContent ||
                      spans[spans.length - 1]?.textContent || '';
      const time = conv.querySelector('time')?.getAttribute('datetime') || '';
      const unread = !!conv.querySelector('[data-testid="unread"]');
      conversations.push({
        index: i + 1,
        name: name.trim(),
        lastMessage: lastMsg.trim().substring(0, 100),
        time,
        unread
      });
    });
    return conversations;
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
    const onInbox = window.location.pathname.includes('/messages');

    if (onInbox && CONFIG.openFirstConversation) {
      const firstConv = document.querySelector(SELECTORS.conversation);
      if (firstConv) {
        log.info('Opening the first conversation...');
        firstConv.click();
        await sleep(2000);
      }
    }

    if (!/\/messages\/[^/]+/.test(window.location.pathname)) {
      if (!onInbox || !CONFIG.listConversations) {
        log.warning('You do not have a single DM conversation open.');
        log.info('Go to https://x.com/messages, click a conversation, then paste this script again.');
        return;
      }

      // Inbox mode: list the visible conversations
      const conversations = getConversationList();
      if (conversations.length === 0) {
        log.warning('No conversations found on this page. Wait for the inbox to load and try again.');
        return { conversations: [] };
      }
      console.log(`📬 Found ${conversations.length} conversations:`);
      conversations.forEach(c => {
        const badge = c.unread ? '🔴' : '⚪';
        console.log(`  ${badge} ${c.index}. ${c.name} - ${c.lastMessage.substring(0, 40)}...`);
      });
      const inbox = { conversations, scrapedAt: new Date().toISOString() };
      if (CONFIG.downloadJSON) {
        if (download(JSON.stringify(inbox, null, 2), `dm_conversations_${new Date().toISOString().split('T')[0]}.json`, 'application/json')) {
          log.success('JSON downloaded');
        }
      }
      if (CONFIG.copyToClipboard) await copyToClipboard(inbox);
      window.scrapedDMs = inbox;
      console.log('\n💡 Access your data: window.scrapedDMs');
      log.info('Open a conversation and paste again to export its messages.');
      return inbox;
    }
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
  if (CONFIG.includeConversationList) result.conversations = getConversationList();

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

  if (CONFIG.downloadTXT) {
    const txt = messages.map(m => {
      const prefix = m.direction === 'out' ? '[You]' : (m.direction === 'in' ? '[Them]' : '[?]');
      return `${prefix}${m.timestamp ? ` (${m.timestamp})` : ''} ${m.text}`;
    }).join('\n\n');
    if (download(txt, `dm_${conversationName}_${dateStr}.txt`, 'text/plain')) {
      log.success('TXT downloaded');
    }
  }

  if (CONFIG.copyToClipboard) await copyToClipboard(result);

  window.scrapedDMs = result;
  console.log('\n💡 Access your data: window.scrapedDMs');
  console.log('⚠️ Privacy note: be careful sharing DM exports.');
  console.log('✅ Script completed! by nichxbt');

  return result;
})();
