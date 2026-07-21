// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================
 * ⚙️ Account Settings - XActions
 * ============================================
 *
 * @name         account-settings
 * @description  Toggle common X privacy and safety settings (protect posts, DMs, tagging, discoverability) from one script.
 * @author       nichxbt
 * @version      1.0.0
 * @date         2026-07-20
 * @website      https://xactions.app
 *
 * Usage:
 *   1. Go to x.com/settings (any /settings/* page works; the script navigates within it)
 *   2. Open the browser console (F12 or Cmd+Option+I -> Console)
 *   3. In CONFIG.settings, set ONLY the options you want to change. Omit the rest.
 *   4. Paste this entire script and press Enter
 *
 * Example:
 *   settings: { protectPosts: true, allowDMsFrom: 'verified' }. Running it goes to
 *   Audience & tagging, turns Protect your posts ON, then goes to Direct Messages
 *   and sets message requests to Verified users. Anything you did not list
 *   (photoTagging, discoverableByEmail) is left exactly as it was. Every control
 *   it cannot find is logged, not silently skipped.
 *
 * ============================================
 */

(async function accountSettings() {
  'use strict';

  // ============================================
  // 📝 CONFIGURATION - Customize these options
  // ============================================
  // Only include the keys you want to change. Any key you omit is left untouched.
  const CONFIG = {
    settings: {
      // true = protect your posts (private account), false = public.
      // protectPosts: true,

      // true = allow others to tag you in photos, false = turn photo tagging off.
      // photoTagging: false,

      // true = people with your email can find you, false = they cannot.
      // discoverableByEmail: false,

      // Who can send you message requests: 'everyone' | 'verified' | 'no-one'.
      // allowDMsFrom: 'verified',
    },

    // Delay for UI interactions (ms).
    actionDelay: 900
  };

  // ============================================
  // 🔧 SELECTORS + SETTINGS MAP
  // ============================================
  const SELECTORS = {
    confirm: '[data-testid="confirmationSheetConfirm"]'
  };

  // Each supported setting: which /settings page it lives on, its type, and how
  // to find its control. testids are tried first, then a label-text fallback,
  // because X rotates and renames testids across builds.
  const SETTINGS = {
    protectPosts: {
      page: '/settings/audience_and_tagging',
      type: 'switch',
      testids: ['[data-testid="protectedTweets"]'],
      labelNeedles: ['protect your posts', 'protect your tweets'],
      label: 'Protect your posts'
    },
    photoTagging: {
      page: '/settings/audience_and_tagging',
      type: 'switch',
      testids: ['[data-testid="allowTagging"]', '[data-testid="photoTagging"]'],
      labelNeedles: ['photo tagging', 'tag you in photos', 'allow people to tag'],
      label: 'Photo tagging'
    },
    discoverableByEmail: {
      page: '/settings/discoverability_and_contacts',
      type: 'switch',
      testids: ['[data-testid="allowEmailReverseLookup"]', '[data-testid="discoverableByEmail"]'],
      labelNeedles: ['email address find', 'your email address'],
      label: 'Discoverable by email'
    },
    allowDMsFrom: {
      page: '/settings/messages',
      type: 'radio',
      label: 'Allow message requests from',
      // desired value -> label text needles for the matching radio option.
      options: {
        everyone: ['everyone', 'no filtering', 'anyone'],
        verified: ['verified'],
        'no-one': ['no one', 'no-one', 'nobody', 'off']
      }
    }
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

  const findByTestids = (testids) => {
    for (const t of testids || []) {
      const el = document.querySelector(t);
      if (el) return el;
    }
    return null;
  };

  // Find a role=switch by nearby label text when no testid matches.
  const findSwitchByLabel = (needles) => {
    const wants = needles.map(n => n.toLowerCase());
    const switches = document.querySelectorAll('[role="switch"]');
    for (const sw of switches) {
      const scope = sw.closest('label') || sw.closest('[role="group"]') || sw.parentElement?.parentElement || sw.parentElement;
      const txt = (scope?.textContent || '').toLowerCase();
      if (wants.some(w => txt.includes(w))) return sw;
    }
    return null;
  };

  const findRadioByText = (needles) => {
    const wants = needles.map(n => n.toLowerCase());
    const radios = document.querySelectorAll('[role="radio"], label');
    for (const r of radios) {
      const txt = (r.textContent || '').trim().toLowerCase();
      if (txt && wants.some(w => txt.includes(w))) return r;
    }
    return null;
  };

  // SPA navigation: if we are not on `path`, click a same-page settings link to
  // it (no full reload, so this script keeps running). Returns true when there.
  const ensureOnPage = async (path) => {
    if (window.location.pathname === path) return true;
    const link = document.querySelector(`a[href="${path}"]`);
    if (link) {
      link.click();
      for (let i = 0; i < 12; i++) {
        await sleep(400);
        if (window.location.pathname === path) return true;
      }
    }
    return window.location.pathname === path;
  };

  // ============================================
  // 🎯 MAIN LOGIC
  // ============================================
  const stats = { changed: 0, alreadyCorrect: 0, notFound: 0, errors: 0 };

  console.log(`
╔══════════════════════════════════════════════════════════╗
║  ⚙️ ACCOUNT SETTINGS - XActions                          ║
║  👤 Author: nichxbt                                      ║
║  🌐 https://xactions.app                                 ║
╚══════════════════════════════════════════════════════════╝
  `);

  // Page guard: warn, do not hard-redirect.
  if (!/^\/settings/.test(window.location.pathname)) {
    log.warning('Go to x.com/settings (any /settings/* page), then run this again.');
    return stats;
  }

  const requested = Object.keys(CONFIG.settings || {}).filter(k => CONFIG.settings[k] !== undefined);
  if (requested.length === 0) {
    log.warning('No settings requested. Uncomment and set at least one key inside CONFIG.settings.');
    return stats;
  }
  log.info(`Settings to apply: ${requested.join(', ')}`);

  const applySwitch = async (def, desired) => {
    let sw = findByTestids(def.testids);
    if (!sw) sw = findSwitchByLabel(def.labelNeedles || []);
    if (!sw) {
      log.warning(`${def.label}: toggle not found on ${def.page}. Skipped (X may have renamed it, or the section did not render).`);
      stats.notFound++;
      return;
    }
    const current = sw.getAttribute('aria-checked') === 'true';
    if (current === !!desired) {
      log.info(`${def.label}: already ${desired ? 'ON' : 'OFF'}. No change.`);
      stats.alreadyCorrect++;
      return;
    }
    sw.click();
    await sleep(CONFIG.actionDelay);
    // Protect-posts style changes can raise a confirmation sheet.
    const confirm = document.querySelector(SELECTORS.confirm);
    if (confirm) {
      confirm.click();
      await sleep(CONFIG.actionDelay);
    }
    log.success(`${def.label}: set to ${desired ? 'ON' : 'OFF'}.`);
    stats.changed++;
  };

  const applyRadio = async (def, desired) => {
    const key = String(desired).toLowerCase();
    const needles = def.options[key];
    if (!needles) {
      log.error(`${def.label}: "${desired}" is not a valid value. Use one of: ${Object.keys(def.options).join(', ')}.`);
      stats.errors++;
      return;
    }
    const opt = findRadioByText(needles);
    if (!opt) {
      log.warning(`${def.label}: option "${desired}" not found on ${def.page}. Skipped.`);
      stats.notFound++;
      return;
    }
    const radio = opt.getAttribute('role') === 'radio' ? opt : opt.querySelector('[role="radio"]');
    if (radio && radio.getAttribute('aria-checked') === 'true') {
      log.info(`${def.label}: already "${desired}". No change.`);
      stats.alreadyCorrect++;
      return;
    }
    opt.click();
    await sleep(CONFIG.actionDelay);
    log.success(`${def.label}: set to "${desired}".`);
    stats.changed++;
  };

  for (const key of requested) {
    const def = SETTINGS[key];
    if (!def) {
      log.warning(`Unknown setting "${key}". Supported: ${Object.keys(SETTINGS).join(', ')}. Skipped.`);
      stats.notFound++;
      continue;
    }
    const desired = CONFIG.settings[key];
    try {
      const onPage = await ensureOnPage(def.page);
      if (!onPage) {
        log.warning(`${def.label}: could not navigate to ${def.page} from here. Open x.com${def.page} and run this again to apply it.`);
        stats.notFound++;
        continue;
      }
      await sleep(CONFIG.actionDelay);
      if (def.type === 'switch') await applySwitch(def, desired);
      else if (def.type === 'radio') await applyRadio(def, desired);
    } catch (error) {
      log.error(`${def.label}: ${error.message}`);
      stats.errors++;
    }
  }

  // ============================================
  // 📊 SUMMARY
  // ============================================
  console.log(`
╔══════════════════════════════════════════════════════════╗
║  📊 ACCOUNT SETTINGS - COMPLETE                          ║
╠══════════════════════════════════════════════════════════╣
║  ✅ Changed:           ${String(stats.changed).padEnd(32)}║
║  ➖ Already correct:   ${String(stats.alreadyCorrect).padEnd(32)}║
║  ⚠️  Not found:         ${String(stats.notFound).padEnd(32)}║
║  ❌ Errors:            ${String(stats.errors).padEnd(32)}║
╚══════════════════════════════════════════════════════════╝
  `);

  log.success('Script completed! by nichxbt');
  return stats;
})();
