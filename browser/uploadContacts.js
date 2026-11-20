// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================================
 * 📇 Upload Contacts — Production Grade
 * ============================================================
 *
 * @name        uploadContacts.js
 * @description Navigate to the contact upload page on X/Twitter
 *              and trigger the contact sync / upload flow.
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-03-30
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE:
 *
 * 1. Go to: https://x.com/home (or any x.com page)
 * 2. Open DevTools Console (F12)
 * 3. Edit CONFIG below
 * 4. Paste and run
 *
 * ⚠️ This will share your device contacts with X/Twitter.
 *    Review X's privacy policy before proceeding.
 * ============================================================
 */
// by nichxbt
(() => {
  'use strict';

  const CONFIG = {
    // ── Action ───────────────────────────────────────────────
    action: 'navigate',
    //   'navigate'   — go to the contact upload page
    //   'upload'     — navigate and trigger the upload flow
    //   'disconnect' — navigate and disconnect synced contacts

    // ── Timing ───────────────────────────────────────────────
    navigationDelay: 3000,
    actionDelay: 2000,

    // ── Safety ───────────────────────────────────────────────
    dryRun: true,                    // Set to false to actually act
  };

  const SEL = {
    connectLink:     'a[href="/i/connect"]',
    uploadContacts:  '[data-testid="uploadContacts"]',
    connectPeople:   'a[href="/i/connect_people"]',
    syncContacts:    '[data-testid="syncContacts"]',
    disconnectBtn:   '[data-testid="disconnectContacts"]',
    confirmBtn:      '[data-testid="confirmationSheetConfirm"]',
    settingsLink:    'a[href="/settings"]',
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const $ = (s) => document.querySelector(s);

  const waitForSelector = async (selector, timeout = 10000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const el = $(selector);
      if (el) return el;
      await sleep(200);
    }
    return null;
  };

  const stats = {
    action: CONFIG.action,
    navigated: false,
    uploadTriggered: false,
    disconnected: false,
    startTime: Date.now(),
  };

  const navigateToUpload = async () => {
    console.log('🔄 Navigating to contact upload page...');

    // Try direct navigation
    if (!CONFIG.dryRun) {
      // First try the connect page
      const connectLink = $(SEL.connectLink) || $(SEL.connectPeople);
      if (connectLink) {
        connectLink.click();
        await sleep(CONFIG.navigationDelay);
      } else {
        // Navigate directly
        window.location.href = 'https://x.com/i/connect_people';
        stats.navigated = true;
        console.log('✅ Navigated to contact upload page');
        console.log('💡 Page will reload — re-run with action: "upload" to trigger upload');
        return false;
      }
    }

    stats.navigated = true;
    console.log('✅ Navigated to contact upload page');
    return true;
  };

  const triggerUpload = async () => {
    const ready = await navigateToUpload();
    if (ready === false) return;

    console.log('🔄 Looking for upload/sync contacts button...');

    // Look for the upload contacts button
    let uploadBtn = await waitForSelector(SEL.uploadContacts, 5000);

    if (!uploadBtn) {
      // Try alternative selectors
      uploadBtn = $(SEL.syncContacts) ||
                  document.querySelector('[aria-label*="Upload"], [aria-label*="Sync"]') ||
                  document.querySelector('button[aria-label*="ontact"]');
    }

    if (!uploadBtn) {
      // Try looking in settings path
      console.log('🔍 Trying settings path...');
      if (!CONFIG.dryRun) {
        window.location.href = 'https://x.com/settings/contacts_dashboard';
        stats.navigated = true;
        console.log('💡 Redirected to contacts settings — re-run to complete');
        return;
      }
    }

    if (uploadBtn) {
      console.log('📇 Found upload contacts button');
      if (!CONFIG.dryRun) {
        uploadBtn.click();
        await sleep(CONFIG.actionDelay);

        // Handle any confirmation dialog
        const confirmBtn = await waitForSelector(SEL.confirmBtn, 5000);
        if (confirmBtn) {
          console.log('🔄 Confirming upload...');
          confirmBtn.click();
          await sleep(CONFIG.actionDelay);
        }
      }

      stats.uploadTriggered = true;
      console.log('✅ Contact upload triggered');
      console.log('⚠️ Follow the on-screen prompts to complete the upload');
    } else {
      console.log('❌ Could not find upload contacts button');
      console.log('💡 Try navigating manually to: x.com/i/connect_people');
    }
  };

  const disconnectContacts = async () => {
    console.log('🔄 Navigating to contacts settings...');

    if (!CONFIG.dryRun) {
      window.location.href = 'https://x.com/settings/contacts_dashboard';
      await sleep(CONFIG.navigationDelay);
    }

    console.log('🔍 Looking for disconnect button...');

    let disconnectBtn = await waitForSelector(SEL.disconnectBtn, 5000);

    if (!disconnectBtn) {
      // Try alternative selectors
      disconnectBtn = document.querySelector('[aria-label*="isconnect"], [aria-label*="Remove"]') ||
                      document.querySelector('button');

      // Look through buttons for disconnect text
      const buttons = document.querySelectorAll('button, [role="button"]');
      for (const btn of buttons) {
        if (btn.textContent.toLowerCase().includes('disconnect') ||
            btn.textContent.toLowerCase().includes('remove contacts')) {
          disconnectBtn = btn;
          break;
        }
      }
    }

    if (disconnectBtn) {
      console.log('🔌 Found disconnect button');
      if (!CONFIG.dryRun) {
        disconnectBtn.click();
        await sleep(CONFIG.actionDelay);

        // Confirm
        const confirmBtn = await waitForSelector(SEL.confirmBtn, 5000);
        if (confirmBtn) {
          confirmBtn.click();
          await sleep(CONFIG.actionDelay);
        }
      }

      stats.disconnected = true;
      console.log('✅ Contacts disconnected');
    } else {
      console.log('❌ Could not find disconnect button');
      console.log('💡 You may not have contacts synced');
    }
  };

  const run = async () => {
    const W = 60;
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  📇 UPLOAD CONTACTS' + ' '.repeat(W - 22) + '║');
    console.log('║  by nichxbt — v1.0' + ' '.repeat(W - 21) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');

    if (CONFIG.dryRun) {
      console.log('⚠️ DRY RUN MODE — set CONFIG.dryRun = false to actually act');
    }

    console.log(`📋 Action: ${CONFIG.action}`);

    const sessionKey = 'xactions_uploadContacts';
    sessionStorage.setItem(sessionKey, JSON.stringify({ status: 'running', ...stats }));

    const actions = {
      navigate: navigateToUpload,
      upload: triggerUpload,
      disconnect: disconnectContacts,
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
    console.log('║  📊 UPLOAD CONTACTS SUMMARY' + ' '.repeat(W - 30) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');
    console.log(`🔧 Action: ${CONFIG.action}`);
    console.log(`📍 Navigated: ${stats.navigated}`);
    if (stats.uploadTriggered) console.log('📇 Upload triggered: ✅');
    if (stats.disconnected) console.log('🔌 Disconnected: ✅');
    console.log(`⏱️ Duration: ${((Date.now() - stats.startTime) / 1000).toFixed(1)}s`);

    sessionStorage.setItem(sessionKey, JSON.stringify({ status: 'complete', ...stats }));
  };

  run();
})();
