// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================================
 * 🛠️ Manage Communities — Production Grade
 * ============================================================
 *
 * @name        manageCommunity.js
 * @description Manage X Community members, roles, settings,
 *              pin posts, and update rules.
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-03-30
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE:
 *
 * 1. Go to: https://x.com/i/communities/YOUR_COMMUNITY_ID
 * 2. Open DevTools Console (F12)
 * 3. Edit CONFIG below (pick an action)
 * 4. Paste and run
 *
 * 🎮 CONTROLS:
 *   window.XActions.abort()   — stop the script
 *   window.XActions.status()  — check progress
 * ============================================================
 */
// by nichxbt
(() => {
  'use strict';

  const CONFIG = {
    // ── Action ───────────────────────────────────────────────
    action: 'listMembers',
    //   'listMembers'   — export list of community members
    //   'updateRules'   — update community rules
    //   'postMessage'   — post a message to the community
    //   'pinPost'       — pin a specific post (provide postUrl)
    //   'removeMember'  — remove a member (provide targetUser)

    // ── Parameters (depending on action) ─────────────────────
    targetUser: '',                  // Username for removeMember (without @)
    postUrl: '',                     // URL of post to pin
    message: '',                     // Message to post to community
    newRules: [],                    // Array of rule strings for updateRules

    // ── List Members Settings ────────────────────────────────
    maxMembers: 100,                 // Max members to export
    exportFormat: 'json',            // 'json' or 'csv'

    // ── Timing ───────────────────────────────────────────────
    scrollDelay: 2000,
    actionDelay: 2000,
    typeCharDelay: 50,
    maxScrollAttempts: 30,

    // ── Safety ───────────────────────────────────────────────
    dryRun: true,
  };

  const SEL = {
    communityName:     '[data-testid="communityName"]',
    communityMembers:  '[data-testid="communityMembers"]',
    communitySettings: '[data-testid="communitySettings"]',
    communityAdmin:    '[data-testid="communityAdmin"]',
    userCell:          '[data-testid="UserCell"]',
    userName:          '[data-testid="User-Name"]',
    tweetComposer:     '[data-testid="tweetTextarea_0"]',
    tweetButton:       '[data-testid="tweetButtonInline"]',
    tweet:             'article[data-testid="tweet"]',
    caret:             '[data-testid="caret"]',
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  let aborted = false;

  const waitForSelector = async (selector, timeout = 10000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const el = $(selector);
      if (el) return el;
      await sleep(200);
    }
    return null;
  };

  const typeText = async (element, text) => {
    element.focus();
    for (const char of text) {
      document.execCommand('insertText', false, char);
      element.dispatchEvent(new InputEvent('input', { bubbles: true, data: char, inputType: 'insertText' }));
      await sleep(CONFIG.typeCharDelay);
    }
  };

  const stats = {
    action: CONFIG.action,
    membersExported: 0,
    rulesUpdated: 0,
    messagePosted: false,
    postPinned: false,
    memberRemoved: false,
    startTime: Date.now(),
  };

  window.XActions = {
    abort()  { aborted = true; console.log('🛑 Aborting...'); },
    status() {
      const el = ((Date.now() - stats.startTime) / 1000).toFixed(0);
      console.log(`📊 Action: ${stats.action} | Members: ${stats.membersExported} | ${el}s`);
    },
  };

  const listMembers = async () => {
    console.log('🔄 Listing community members...');

    // Navigate to members tab
    const membersTab = $(SEL.communityMembers) ||
                       $('a[href*="/members"]') ||
                       document.querySelector('[role="tab"][aria-label*="ember"]');

    if (membersTab && !CONFIG.dryRun) {
      membersTab.click();
      await sleep(CONFIG.actionDelay);
    }

    const members = [];
    const processedUsers = new Set();
    let scrollAttempts = 0;

    while (members.length < CONFIG.maxMembers && scrollAttempts < CONFIG.maxScrollAttempts && !aborted) {
      const userCells = $$(SEL.userCell);
      let foundNew = false;

      for (const cell of userCells) {
        const nameEl = cell.querySelector(SEL.userName);
        if (!nameEl) continue;

        const fullText = nameEl.textContent || '';
        const usernameMatch = fullText.match(/@(\w+)/);
        const username = usernameMatch ? usernameMatch[1] : '';

        if (!username || processedUsers.has(username)) continue;
        processedUsers.add(username);
        foundNew = true;

        const displayName = fullText.replace(/@\w+/, '').trim();
        const bioEl = cell.querySelector('[data-testid="UserDescription"]');
        const bio = bioEl?.textContent?.trim() || '';

        members.push({ username, displayName, bio });
        stats.membersExported++;

        if (members.length >= CONFIG.maxMembers) break;
      }

      if (!foundNew) {
        scrollAttempts++;
      } else {
        scrollAttempts = 0;
      }

      window.scrollBy(0, 800);
      await sleep(CONFIG.scrollDelay);
    }

    // Export
    if (CONFIG.exportFormat === 'csv') {
      const csv = 'username,displayName,bio\n' +
        members.map(m => `"${m.username}","${m.displayName}","${m.bio.replace(/"/g, '""')}"`).join('\n');
      console.log('📋 CSV Export:');
      console.log(csv);
    } else {
      console.log('📋 JSON Export:');
      console.log(JSON.stringify(members, null, 2));
    }

    console.log(`✅ Exported ${members.length} members`);
    return members;
  };

  const updateRules = async () => {
    if (CONFIG.newRules.length === 0) {
      console.log('❌ No rules provided in CONFIG.newRules');
      return;
    }

    console.log('🔄 Navigating to community settings...');
    const settingsBtn = $(SEL.communitySettings) ||
                        $('a[href*="/settings"]') ||
                        document.querySelector('[aria-label*="etting"]');

    if (settingsBtn && !CONFIG.dryRun) {
      settingsBtn.click();
      await sleep(CONFIG.actionDelay);
    }

    // Look for rules section
    const rulesSection = document.querySelector('[aria-label*="ule"], a[href*="/rules"]');
    if (rulesSection && !CONFIG.dryRun) {
      rulesSection.click();
      await sleep(CONFIG.actionDelay);
    }

    for (let i = 0; i < CONFIG.newRules.length; i++) {
      const ruleInput = document.querySelector(`[data-testid="communityRule_${i}"]`) ||
                        document.querySelectorAll('input[type="text"], textarea')[i];

      if (ruleInput && !CONFIG.dryRun) {
        ruleInput.focus();
        ruleInput.value = '';
        ruleInput.dispatchEvent(new Event('input', { bubbles: true }));
        await typeText(ruleInput, CONFIG.newRules[i]);
        await sleep(500);

        // Add new rule input if needed
        const addBtn = document.querySelector('[data-testid="addRule"], [aria-label*="Add rule"]');
        if (addBtn && i < CONFIG.newRules.length - 1) {
          addBtn.click();
          await sleep(CONFIG.actionDelay);
        }
      }

      stats.rulesUpdated++;
      console.log(`  ✅ Rule ${i + 1}: "${CONFIG.newRules[i]}"`);
    }

    // Save
    const saveBtn = document.querySelector('[data-testid="save"], button[type="submit"]');
    if (saveBtn && !CONFIG.dryRun) {
      saveBtn.click();
      await sleep(CONFIG.actionDelay);
    }

    console.log(`✅ Updated ${stats.rulesUpdated} rules`);
  };

  const postMessage = async () => {
    if (!CONFIG.message) {
      console.log('❌ No message provided in CONFIG.message');
      return;
    }

    console.log('✍️ Posting to community...');
    const composer = await waitForSelector(SEL.tweetComposer, 5000);
    if (!composer) {
      console.log('❌ Could not find tweet composer');
      console.log('💡 Make sure you are on the community page');
      return;
    }

    if (!CONFIG.dryRun) {
      await typeText(composer, CONFIG.message);
      await sleep(1000);

      const postBtn = $(SEL.tweetButton) ||
                      document.querySelector('[data-testid="tweetButton"]');
      if (postBtn) {
        postBtn.click();
        await sleep(CONFIG.actionDelay);
      }
    }

    stats.messagePosted = true;
    console.log(`✅ Posted: "${CONFIG.message.slice(0, 60)}..."`);
  };

  const pinPost = async () => {
    if (!CONFIG.postUrl) {
      console.log('❌ No postUrl provided in CONFIG.postUrl');
      return;
    }

    console.log(`🔄 Navigating to post: ${CONFIG.postUrl}`);
    if (!CONFIG.dryRun) {
      window.location.href = CONFIG.postUrl;
      await sleep(CONFIG.actionDelay * 2);
    }

    // Click the caret/more menu on the tweet
    const tweet = await waitForSelector(SEL.tweet, 5000);
    if (!tweet) {
      console.log('❌ Could not find the tweet');
      return;
    }

    const caretBtn = tweet.querySelector(SEL.caret);
    if (caretBtn && !CONFIG.dryRun) {
      caretBtn.click();
      await sleep(CONFIG.actionDelay);

      // Look for pin option in dropdown
      const menuItems = $$('[role="menuitem"]');
      const pinItem = menuItems.find(item =>
        item.textContent.toLowerCase().includes('pin')
      );

      if (pinItem) {
        pinItem.click();
        await sleep(CONFIG.actionDelay);

        // Confirm if needed
        const confirmBtn = document.querySelector('[data-testid="confirmationSheetConfirm"]');
        if (confirmBtn) {
          confirmBtn.click();
          await sleep(CONFIG.actionDelay);
        }

        stats.postPinned = true;
        console.log('✅ Post pinned to community');
      } else {
        console.log('⚠️ Pin option not found in menu');
      }
    }
  };

  const removeMember = async () => {
    if (!CONFIG.targetUser) {
      console.log('❌ No targetUser provided in CONFIG.targetUser');
      return;
    }

    console.log(`🔄 Removing @${CONFIG.targetUser} from community...`);

    // Navigate to members
    const membersTab = $(SEL.communityMembers) || $('a[href*="/members"]');
    if (membersTab && !CONFIG.dryRun) {
      membersTab.click();
      await sleep(CONFIG.actionDelay);
    }

    // Find the user
    const userCells = $$(SEL.userCell);
    for (const cell of userCells) {
      const text = cell.textContent.toLowerCase();
      if (text.includes(CONFIG.targetUser.toLowerCase())) {
        console.log(`🔍 Found @${CONFIG.targetUser}`);

        // Click the more/admin actions
        const moreBtn = cell.querySelector(SEL.caret) ||
                        cell.querySelector('[aria-label*="ore"]');
        if (moreBtn && !CONFIG.dryRun) {
          moreBtn.click();
          await sleep(CONFIG.actionDelay);

          const menuItems = $$('[role="menuitem"]');
          const removeItem = menuItems.find(item =>
            item.textContent.toLowerCase().includes('remove')
          );

          if (removeItem) {
            removeItem.click();
            await sleep(CONFIG.actionDelay);

            const confirmBtn = document.querySelector('[data-testid="confirmationSheetConfirm"]');
            if (confirmBtn) {
              confirmBtn.click();
              await sleep(CONFIG.actionDelay);
            }

            stats.memberRemoved = true;
            console.log(`✅ Removed @${CONFIG.targetUser} from community`);
          } else {
            console.log('⚠️ Remove option not found in menu');
          }
        }
        break;
      }
    }

    if (!stats.memberRemoved) {
      console.log(`⚠️ Could not find or remove @${CONFIG.targetUser}`);
    }
  };

  const run = async () => {
    const W = 60;
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  🛠️ MANAGE COMMUNITY' + ' '.repeat(W - 23) + '║');
    console.log('║  by nichxbt — v1.0' + ' '.repeat(W - 21) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');

    if (CONFIG.dryRun) {
      console.log('⚠️ DRY RUN MODE — set CONFIG.dryRun = false to actually act');
    }

    console.log(`📋 Action: ${CONFIG.action}`);

    const sessionKey = 'xactions_manageCommunity';
    sessionStorage.setItem(sessionKey, JSON.stringify({ status: 'running', ...stats }));

    const actions = {
      listMembers,
      updateRules,
      postMessage,
      pinPost,
      removeMember,
    };

    if (!actions[CONFIG.action]) {
      console.log(`❌ Unknown action: "${CONFIG.action}"`);
      console.log(`💡 Valid actions: ${Object.keys(actions).join(', ')}`);
      return;
    }

    await actions[CONFIG.action]();

    // Final summary
    console.log('');
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  📊 MANAGE COMMUNITY SUMMARY' + ' '.repeat(W - 31) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');
    console.log(`🔧 Action: ${CONFIG.action}`);
    if (stats.membersExported > 0) console.log(`👥 Members exported: ${stats.membersExported}`);
    if (stats.rulesUpdated > 0) console.log(`📜 Rules updated: ${stats.rulesUpdated}`);
    if (stats.messagePosted) console.log('💬 Message posted: ✅');
    if (stats.postPinned) console.log('📌 Post pinned: ✅');
    if (stats.memberRemoved) console.log('🚫 Member removed: ✅');
    console.log(`⏱️ Duration: ${((Date.now() - stats.startTime) / 1000).toFixed(1)}s`);

    sessionStorage.setItem(sessionKey, JSON.stringify({ status: 'complete', ...stats }));
  };

  run();
})();
