// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================================
 * 🏘️ Create Communities — Production Grade
 * ============================================================
 *
 * @name        createCommunity.js
 * @description Create a new X Community with name, description,
 *              rules, and initial settings.
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-03-30
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE:
 *
 * 1. Go to: https://x.com/communities
 * 2. Open DevTools Console (F12)
 * 3. Edit CONFIG below
 * 4. Paste and run
 * ============================================================
 */
// by nichxbt
(() => {
  'use strict';

  const CONFIG = {
    // ── Community Details ────────────────────────────────────
    name: 'My XActions Community',
    description: 'A community for X automation enthusiasts. Built with XActions.',
    rules: [
      'Be respectful to all members',
      'No spam or self-promotion without value',
      'Stay on topic',
    ],
    isPrivate: false,              // true = approval required to join

    // ── Timing ───────────────────────────────────────────────
    navigationDelay: 3000,
    actionDelay: 2000,
    typeCharDelay: 50,

    // ── Safety ───────────────────────────────────────────────
    dryRun: true,                  // Set to false to actually create
  };

  const SEL = {
    communitiesNav:      'a[aria-label="Communities"]',
    createCommunity:     '[data-testid="createCommunity"]',
    communityName:       '[data-testid="communityName"]',
    communityDesc:       '[data-testid="communityDescription"]',
    communityRules:      '[data-testid="communityRules"]',
    submitButton:        '[data-testid="createCommunitySubmit"]',
    nextButton:          '[data-testid="nextButton"]',
    confirmButton:       '[data-testid="confirmationSheetConfirm"]',
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

  const typeText = async (element, text) => {
    element.focus();
    for (const char of text) {
      document.execCommand('insertText', false, char);
      element.dispatchEvent(new InputEvent('input', { bubbles: true, data: char, inputType: 'insertText' }));
      await sleep(CONFIG.typeCharDelay);
    }
  };

  const stats = {
    nameSet: false,
    descriptionSet: false,
    rulesAdded: 0,
    communityCreated: false,
    startTime: Date.now(),
  };

  const run = async () => {
    const W = 60;
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  🏘️ CREATE COMMUNITY' + ' '.repeat(W - 23) + '║');
    console.log('║  by nichxbt — v1.0' + ' '.repeat(W - 21) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');

    if (CONFIG.dryRun) {
      console.log('⚠️ DRY RUN MODE — set CONFIG.dryRun = false to actually create');
    }

    console.log(`📋 Name: "${CONFIG.name}"`);
    console.log(`📋 Description: "${CONFIG.description.slice(0, 50)}..."`);
    console.log(`📋 Rules: ${CONFIG.rules.length}`);
    console.log(`📋 Private: ${CONFIG.isPrivate}`);

    const sessionKey = 'xactions_createCommunity';
    sessionStorage.setItem(sessionKey, JSON.stringify({ status: 'running', ...stats }));

    // Step 1: Navigate to communities if needed
    if (!window.location.pathname.includes('/communities')) {
      console.log('🔄 Navigating to Communities...');
      const navLink = $(SEL.communitiesNav) || $('a[href*="/communities"]');
      if (navLink && !CONFIG.dryRun) {
        navLink.click();
        await sleep(CONFIG.navigationDelay);
      } else if (!CONFIG.dryRun) {
        window.location.href = 'https://x.com/communities';
        return;
      }
    }

    // Step 2: Click Create Community
    console.log('🔄 Opening community creation...');
    let createBtn = await waitForSelector(SEL.createCommunity, 5000);

    if (!createBtn) {
      // Try alternative selectors
      createBtn = $('a[href*="/communities/create"]') ||
                  document.querySelector('[aria-label*="Create"]');
    }

    if (!createBtn) {
      console.log('❌ Could not find Create Community button');
      console.log('💡 Navigate to x.com/communities and look for the create option');
      return;
    }

    if (!CONFIG.dryRun) {
      createBtn.click();
      await sleep(CONFIG.navigationDelay);
    }

    // Step 3: Set community name
    console.log('✍️ Setting community name...');
    const nameInput = await waitForSelector(SEL.communityName, 5000);
    if (nameInput) {
      if (!CONFIG.dryRun) {
        nameInput.focus();
        nameInput.value = '';
        await typeText(nameInput, CONFIG.name);
        await sleep(1000);
      }
      stats.nameSet = true;
      console.log(`✅ Name set: "${CONFIG.name}"`);
    } else {
      // Fallback: try first text input
      const firstInput = document.querySelector('input[type="text"]');
      if (firstInput && !CONFIG.dryRun) {
        await typeText(firstInput, CONFIG.name);
        stats.nameSet = true;
      } else {
        console.log('⚠️ Could not find name input');
      }
    }

    // Step 4: Set description
    console.log('✍️ Setting description...');
    const descInput = await waitForSelector(SEL.communityDesc, 5000);
    if (descInput) {
      if (!CONFIG.dryRun) {
        descInput.focus();
        descInput.value = '';
        await typeText(descInput, CONFIG.description);
        await sleep(1000);
      }
      stats.descriptionSet = true;
      console.log('✅ Description set');
    } else {
      // Fallback: try textarea
      const textarea = document.querySelector('textarea');
      if (textarea && !CONFIG.dryRun) {
        await typeText(textarea, CONFIG.description);
        stats.descriptionSet = true;
      } else {
        console.log('⚠️ Could not find description input');
      }
    }

    // Step 5: Advance to next step if there is a Next button
    const nextBtn = await waitForSelector(SEL.nextButton, 3000);
    if (nextBtn && !CONFIG.dryRun) {
      nextBtn.click();
      await sleep(CONFIG.actionDelay);
    }

    // Step 6: Add rules
    if (CONFIG.rules.length > 0) {
      console.log('📜 Adding community rules...');
      for (let i = 0; i < CONFIG.rules.length; i++) {
        const rule = CONFIG.rules[i];
        const ruleInput = $(SEL.communityRules) ||
                          document.querySelector(`[data-testid="communityRule_${i}"]`) ||
                          document.querySelector('input[placeholder*="rule" i], textarea[placeholder*="rule" i]');

        if (ruleInput && !CONFIG.dryRun) {
          ruleInput.focus();
          await typeText(ruleInput, rule);
          await sleep(500);

          // Look for an "Add rule" button to add another
          const addRuleBtn = document.querySelector('[aria-label*="Add rule"], [data-testid="addRule"]');
          if (addRuleBtn && i < CONFIG.rules.length - 1) {
            addRuleBtn.click();
            await sleep(CONFIG.actionDelay);
          }
        }

        stats.rulesAdded++;
        console.log(`  ✅ Rule ${i + 1}: "${rule}"`);
      }
    }

    // Step 7: Set privacy if applicable
    if (CONFIG.isPrivate) {
      console.log('🔒 Setting community to private...');
      const privacyToggle = document.querySelector('[data-testid="communityPrivacy"], [aria-label*="rivate"]');
      if (privacyToggle && !CONFIG.dryRun) {
        privacyToggle.click();
        await sleep(CONFIG.actionDelay);
        console.log('✅ Privacy set to private');
      } else {
        console.log('⚠️ Could not find privacy toggle');
      }
    }

    // Step 8: Submit / Create
    console.log('🚀 Creating community...');
    const submitBtn = await waitForSelector(SEL.submitButton, 5000) ||
                      await waitForSelector(SEL.confirmButton, 3000);

    if (submitBtn) {
      if (!CONFIG.dryRun) {
        submitBtn.click();
        await sleep(CONFIG.navigationDelay);
      }
      stats.communityCreated = true;
      console.log('✅ Community created!');
    } else {
      console.log('⚠️ Could not find submit button — community may need manual confirmation');
    }

    // Final summary
    console.log('');
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  📊 CREATE COMMUNITY SUMMARY' + ' '.repeat(W - 31) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');
    console.log(`📛 Name: "${CONFIG.name}" — ${stats.nameSet ? '✅' : '❌'}`);
    console.log(`📝 Description: ${stats.descriptionSet ? '✅' : '❌'}`);
    console.log(`📜 Rules added: ${stats.rulesAdded}/${CONFIG.rules.length}`);
    console.log(`🏘️ Created: ${stats.communityCreated}`);
    console.log(`⏱️ Duration: ${((Date.now() - stats.startTime) / 1000).toFixed(1)}s`);

    sessionStorage.setItem(sessionKey, JSON.stringify({ status: 'complete', ...stats }));
  };

  run();
})();
