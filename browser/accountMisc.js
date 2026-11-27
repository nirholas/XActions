// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * @name        accountMisc.js
 * @title       Account Utilities
 * @description Account utilities: join date, login history, connected accounts, account age, and a JSON account summary.
 * @category    profile
 * @page        x.com/*
 * @writes      false
 */
// browser/accountMisc.js
// Miscellaneous account tools for X/Twitter
// by nichxbt
// https://github.com/nirholas/XActions
//
// HOW TO USE:
// 1. Go to https://x.com (must be logged in)
// 2. Open Developer Console (F12 or Ctrl+Shift+J / Cmd+Option+J)
// 3. Paste this script and press Enter
// 4. Call functions via window.XActions.accountMisc.*
//
// AVAILABLE TOOLS:
//   viewJoinDate('username')         — Scrape the "Joined" date from a profile
//   viewLoginHistory()               — Scrape active sessions (device, location, IP)
//   viewConnectedAccounts()          — View linked external accounts (Google, Apple)
//   appealSuspension()               — Navigate to the account appeal/support page
//   exportAccountSummary()           — Export account data summary as JSON download
//   accountAgeCalculator('username') — Calculate account age in days/months/years
//
// Last Updated: 30 March 2026
(() => {
  'use strict';

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const SEL = {
    userCell:       '[data-testid="UserCell"]',
    userName:       '[data-testid="UserName"]',
    userJoinDate:   '[data-testid="UserJoinDate"]',
    userBio:        '[data-testid="UserDescription"]',
    userLocation:   '[data-testid="UserLocation"]',
    userUrl:        '[data-testid="UserUrl"]',
    verified:       '[data-testid="icon-verified"]',
    toast:          '[data-testid="toast"]',
    backButton:     '[data-testid="app-bar-back"]',
  };

  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];

  // ─── Helpers ───────────────────────────────────────────────

  const download = (data, filename) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    console.log(`📥 Downloaded: ${filename}`);
  };

  const getCurrentUsername = () => {
    const link = $('a[data-testid="AppTabBar_Profile_Link"]');
    if (link) {
      const m = (link.getAttribute('href') || '').match(/^\/([A-Za-z0-9_]+)/);
      if (m) return m[1];
    }
    // Fallback: try extracting from the nav sidebar
    const navLinks = $$('nav a[href^="/"]');
    for (const nav of navLinks) {
      const href = nav.getAttribute('href') || '';
      const match = href.match(/^\/([A-Za-z0-9_]+)$/);
      if (match && !['home', 'explore', 'notifications', 'messages', 'i', 'settings', 'search', 'compose'].includes(match[1])) {
        return match[1];
      }
    }
    return null;
  };

  const navigateAndWait = async (url, delayMs = 2500) => {
    window.location.href = url;
    await sleep(delayMs);
    // Wait for main content to load
    let retries = 10;
    while (retries > 0) {
      if (document.querySelector('main') || document.querySelector('[data-testid="primaryColumn"]')) {
        break;
      }
      await sleep(500);
      retries--;
    }
    await sleep(1000);
  };

  const parseJoinDate = (text) => {
    if (!text) return null;
    // "Joined March 2020" or "Joined Mar 2020"
    const cleaned = text.replace(/^Joined\s*/i, '').trim();
    const date = new Date(cleaned + ' 1'); // add day for parsing
    if (isNaN(date.getTime())) {
      // Try direct parse
      const direct = new Date(cleaned);
      return isNaN(direct.getTime()) ? null : direct;
    }
    return date;
  };

  // ═══════════════════════════════════════════════════════════
  // 1. View Account Creation Date
  // ═══════════════════════════════════════════════════════════

  const viewJoinDate = async (username) => {
    if (!username) {
      username = getCurrentUsername();
      if (!username) {
        console.error('❌ Could not detect your username. Please provide one: viewJoinDate("username")');
        return null;
      }
      console.log(`🔄 Using detected username: @${username}`);
    }

    username = username.replace(/^@/, '');
    console.log(`🔄 Fetching join date for @${username}...`);

    const isOnProfile = window.location.pathname.toLowerCase() === `/${username.toLowerCase()}`;
    if (!isOnProfile) {
      await navigateAndWait(`https://x.com/${username}`);
    } else {
      await sleep(1000);
    }

    // Look for the join date element
    const joinDateEl = $(SEL.userJoinDate);
    if (joinDateEl) {
      const text = joinDateEl.textContent.trim();
      console.log(`✅ @${username} — ${text}`);
      return { username, joinDateText: text, scrapedAt: new Date().toISOString() };
    }

    // Fallback: look for calendar icon sibling with date text
    const calendarSpans = $$('span');
    for (const span of calendarSpans) {
      const text = span.textContent.trim();
      if (/^Joined\s+/i.test(text)) {
        console.log(`✅ @${username} — ${text}`);
        return { username, joinDateText: text, scrapedAt: new Date().toISOString() };
      }
    }

    console.error('❌ Could not find join date. Make sure the profile page is fully loaded.');
    return null;
  };

  // ═══════════════════════════════════════════════════════════
  // 2. View Login History (Active Sessions)
  // ═══════════════════════════════════════════════════════════

  const viewLoginHistory = async () => {
    console.log('🔄 Navigating to active sessions...');
    console.log('⚠️ You may need to re-enter your password on the sessions page.');

    const sessionsUrl = 'https://x.com/settings/sessions';
    const isOnSessions = window.location.href.includes('/settings/sessions');
    if (!isOnSessions) {
      await navigateAndWait(sessionsUrl, 3000);
    } else {
      await sleep(2000);
    }

    // Scrape session entries
    const sessions = [];

    // Sessions are typically displayed in list-like sections
    const sections = $$('section, [role="listitem"], [data-testid="UserCell"]');
    if (sections.length > 0) {
      for (const section of sections) {
        const text = section.textContent.trim();
        if (text.length > 5) {
          sessions.push({ text });
        }
      }
    }

    // Fallback: scrape main content area for session data
    if (sessions.length === 0) {
      const primaryCol = $('[data-testid="primaryColumn"]') || $('main');
      if (primaryCol) {
        // Look for device/session entries — they often use specific heading + detail patterns
        const headings = primaryCol.querySelectorAll('h2, h3, [role="heading"]');
        const entries = [];

        headings.forEach(h => {
          const headingText = h.textContent.trim();
          if (headingText && !['Settings', 'Sessions', 'Back'].includes(headingText)) {
            // Collect sibling info
            const parent = h.closest('div[style], div[class]') || h.parentElement;
            const details = parent ? parent.textContent.trim() : headingText;
            entries.push({ heading: headingText, details });
          }
        });

        if (entries.length > 0) {
          sessions.push(...entries);
        }

        // Also try scraping all clickable links on the sessions page
        const links = primaryCol.querySelectorAll('a[href*="/settings/sessions/"]');
        for (const link of links) {
          const text = link.textContent.trim();
          if (text.length > 3) {
            sessions.push({ device: text, link: link.getAttribute('href') });
          }
        }
      }
    }

    // Scrape any visible session detail text blocks
    if (sessions.length === 0) {
      const allDivs = $$('div[dir="ltr"], span[dir="ltr"]');
      const sessionTexts = [];
      for (const div of allDivs) {
        const text = div.textContent.trim();
        // Session entries usually mention device/browser or location info
        if (/(?:chrome|safari|firefox|edge|mobile|ios|android|windows|mac|linux|active|logged)/i.test(text) && text.length < 200) {
          sessionTexts.push(text);
        }
      }
      if (sessionTexts.length > 0) {
        for (const t of sessionTexts) {
          sessions.push({ info: t });
        }
      }
    }

    if (sessions.length > 0) {
      console.log(`✅ Found ${sessions.length} session entries:`);
      sessions.forEach((s, i) => {
        const display = s.device || s.heading || s.info || s.text || 'Unknown entry';
        console.log(`  ${i + 1}. ${display}`);
      });
    } else {
      console.log('⚠️ Could not automatically scrape sessions. The page may require password re-entry.');
      console.log('📍 You are now on the sessions page — review active sessions manually.');
    }

    const result = {
      sessions,
      count: sessions.length,
      url: sessionsUrl,
      scrapedAt: new Date().toISOString(),
    };

    sessionStorage.setItem('xactions_login_history', JSON.stringify(result));
    console.log('💾 Saved to sessionStorage: xactions_login_history');
    return result;
  };

  // ═══════════════════════════════════════════════════════════
  // 3. Connected Accounts
  // ═══════════════════════════════════════════════════════════

  const viewConnectedAccounts = async () => {
    console.log('🔄 Navigating to connected accounts...');

    const connectedUrl = 'https://x.com/settings/connected_accounts';
    const isOnConnected = window.location.href.includes('/settings/connected_accounts');
    if (!isOnConnected) {
      await navigateAndWait(connectedUrl, 3000);
    } else {
      await sleep(2000);
    }

    const accounts = [];
    const primaryCol = $('[data-testid="primaryColumn"]') || $('main');

    if (primaryCol) {
      // Look for Google, Apple, or other provider entries
      const items = primaryCol.querySelectorAll('[role="listitem"], [role="link"], a, div[tabindex="0"]');
      for (const item of items) {
        const text = item.textContent.trim();
        if (/google|apple|facebook|microsoft/i.test(text) && text.length < 200) {
          // Check if connected or disconnected
          const isConnected = /connected|linked|disconnect/i.test(text);
          accounts.push({
            provider: text.match(/google|apple|facebook|microsoft/i)?.[0] || 'Unknown',
            status: isConnected ? 'connected' : 'available',
            text,
          });
        }
      }

      // Deduplicate by provider
      const seen = new Set();
      const unique = [];
      for (const acc of accounts) {
        const key = acc.provider.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(acc);
        }
      }
      accounts.length = 0;
      accounts.push(...unique);
    }

    if (accounts.length > 0) {
      console.log(`✅ Found ${accounts.length} connected account entries:`);
      accounts.forEach((acc, i) => {
        const icon = acc.status === 'connected' ? '🔗' : '⚪';
        console.log(`  ${i + 1}. ${icon} ${acc.provider} — ${acc.status}`);
      });
    } else {
      console.log('⚠️ Could not automatically detect connected accounts.');
      console.log('📍 You are now on the connected accounts page — review manually.');
    }

    const result = {
      accounts,
      count: accounts.length,
      url: connectedUrl,
      scrapedAt: new Date().toISOString(),
    };

    sessionStorage.setItem('xactions_connected_accounts', JSON.stringify(result));
    console.log('💾 Saved to sessionStorage: xactions_connected_accounts');
    return result;
  };

  // ═══════════════════════════════════════════════════════════
  // 4. Appeal Suspension
  // ═══════════════════════════════════════════════════════════

  const appealSuspension = async () => {
    console.log('🔄 Navigating to account appeal / support page...');

    const appealUrl = 'https://help.x.com/en/forms/account-access/appeals';
    const supportUrl = 'https://help.x.com/en/forms/account-access';

    console.log('');
    console.log('📋 X/Twitter Account Appeal Options:');
    console.log('');
    console.log('  1. Suspended account appeal:');
    console.log(`     ${appealUrl}`);
    console.log('');
    console.log('  2. Locked account help:');
    console.log('     https://help.x.com/en/managing-your-account/locked-and-limited-accounts');
    console.log('');
    console.log('  3. General account access issues:');
    console.log(`     ${supportUrl}`);
    console.log('');
    console.log('  4. Age-locked account:');
    console.log('     https://help.x.com/en/forms/account-access/appeals/age');
    console.log('');
    console.log('  5. Report a hacked account:');
    console.log('     https://help.x.com/en/safety-and-security/twitter-account-hacked');
    console.log('');

    // Try to navigate to the appeal form
    window.open(appealUrl, '_blank');
    console.log('✅ Opened the suspension appeal form in a new tab.');
    console.log('');
    console.log('💡 Tips for successful appeals:');
    console.log('  - Be polite and concise');
    console.log('  - Explain which rule you believe was not violated');
    console.log('  - Provide context if the suspension was a mistake');
    console.log('  - Response times vary: typically 1-7 business days');

    return {
      opened: appealUrl,
      links: {
        appeal: appealUrl,
        accountAccess: supportUrl,
        lockedAccount: 'https://help.x.com/en/managing-your-account/locked-and-limited-accounts',
        ageLocked: 'https://help.x.com/en/forms/account-access/appeals/age',
        hackedAccount: 'https://help.x.com/en/safety-and-security/twitter-account-hacked',
      },
      timestamp: new Date().toISOString(),
    };
  };

  // ═══════════════════════════════════════════════════════════
  // 5. Export Account Data Summary
  // ═══════════════════════════════════════════════════════════

  const exportAccountSummary = async () => {
    const username = getCurrentUsername();
    if (!username) {
      console.error('❌ Could not detect your username. Navigate to x.com first while logged in.');
      return null;
    }

    console.log(`🔄 Scraping account summary for @${username}...`);

    const isOnProfile = window.location.pathname.toLowerCase() === `/${username.toLowerCase()}`;
    if (!isOnProfile) {
      await navigateAndWait(`https://x.com/${username}`);
    } else {
      await sleep(1500);
    }

    const summary = {
      username: null,
      displayName: null,
      bio: null,
      location: null,
      website: null,
      joinDate: null,
      followers: null,
      following: null,
      tweetCount: null,
      listsCount: null,
      isVerified: false,
      profileImageUrl: null,
    };

    // Username
    summary.username = username;

    // Display name
    const nameEl = $(SEL.userName);
    if (nameEl) {
      const spans = nameEl.querySelectorAll('span');
      if (spans.length > 0) {
        summary.displayName = spans[0].textContent.trim();
      }
    }

    // Bio
    const bioEl = $(SEL.userBio);
    if (bioEl) summary.bio = bioEl.textContent.trim();

    // Location
    const locEl = $(SEL.userLocation);
    if (locEl) summary.location = locEl.textContent.trim();

    // Website
    const urlEl = $(SEL.userUrl);
    if (urlEl) summary.website = urlEl.textContent.trim();

    // Join date
    const joinEl = $(SEL.userJoinDate);
    if (joinEl) summary.joinDate = joinEl.textContent.trim();

    // Followers count
    const followersLink = $('a[href$="/verified_followers"], a[href$="/followers"]');
    if (followersLink) {
      const countSpan = followersLink.querySelector('span span') || followersLink.querySelector('span');
      if (countSpan) summary.followers = countSpan.textContent.trim();
    }

    // Following count
    const followingLink = $('a[href$="/following"]');
    if (followingLink) {
      const countSpan = followingLink.querySelector('span span') || followingLink.querySelector('span');
      if (countSpan) summary.following = countSpan.textContent.trim();
    }

    // Tweet count — from the header area or nav
    const headerSpans = $$('h2[role="heading"] + div span, [data-testid="UserName"] ~ div span');
    for (const span of headerSpans) {
      const text = span.textContent.trim();
      if (/[\d,.]+[KkMm]?\s*(posts?|tweets?)/i.test(text)) {
        summary.tweetCount = text.replace(/\s*(posts?|tweets?)/i, '').trim();
        break;
      }
    }

    // Fallback: check the primary column sub-heading for post count
    if (!summary.tweetCount) {
      const subHeading = $('[data-testid="primaryColumn"] h2[role="heading"]');
      if (subHeading) {
        const next = subHeading.parentElement;
        if (next) {
          const txt = next.textContent;
          const m = txt.match(/([\d,.]+[KkMm]?)\s*(?:posts?|tweets?)/i);
          if (m) summary.tweetCount = m[1];
        }
      }
    }

    // Verification status
    summary.isVerified = !!($(SEL.verified));

    // Profile image
    const avatarImg = $('img[alt="Opens profile photo"]') || $('a[href$="/photo"] img');
    if (avatarImg) summary.profileImageUrl = avatarImg.getAttribute('src');

    // Lists count — navigate to lists page briefly
    console.log('🔄 Checking lists count...');
    try {
      const listsUrl = `https://x.com/${username}/lists`;
      const response = await fetch(listsUrl, { credentials: 'include' });
      if (response.ok) {
        // We cannot easily parse the list count from fetch alone,
        // so we leave it as null unless we are on the lists page
        summary.listsCount = 'N/A (navigate to lists page to count)';
      }
    } catch {
      summary.listsCount = 'N/A';
    }

    // Print summary
    console.log('');
    console.log('✅ Account Summary:');
    console.log(`  👤 Name:       ${summary.displayName || 'N/A'}`);
    console.log(`  🔖 Username:   @${summary.username}`);
    console.log(`  📝 Bio:        ${summary.bio ? summary.bio.substring(0, 80) + (summary.bio.length > 80 ? '...' : '') : 'N/A'}`);
    console.log(`  📍 Location:   ${summary.location || 'N/A'}`);
    console.log(`  🔗 Website:    ${summary.website || 'N/A'}`);
    console.log(`  📅 Joined:     ${summary.joinDate || 'N/A'}`);
    console.log(`  👥 Followers:  ${summary.followers || 'N/A'}`);
    console.log(`  👣 Following:  ${summary.following || 'N/A'}`);
    console.log(`  📊 Tweets:     ${summary.tweetCount || 'N/A'}`);
    console.log(`  ✔️  Verified:   ${summary.isVerified ? 'Yes' : 'No'}`);
    console.log('');

    const result = {
      ...summary,
      exportedAt: new Date().toISOString(),
    };

    // Download as JSON
    const filename = `xactions-account-summary-${username}-${new Date().toISOString().slice(0, 10)}.json`;
    download(result, filename);

    sessionStorage.setItem('xactions_account_summary', JSON.stringify(result));
    console.log('💾 Saved to sessionStorage: xactions_account_summary');
    return result;
  };

  // ═══════════════════════════════════════════════════════════
  // 6. Account Age Calculator
  // ═══════════════════════════════════════════════════════════

  const accountAgeCalculator = async (username) => {
    // First get the join date
    const joinData = await viewJoinDate(username);
    if (!joinData) {
      console.error('❌ Could not retrieve join date to calculate account age.');
      return null;
    }

    const joinDateParsed = parseJoinDate(joinData.joinDateText);
    if (!joinDateParsed) {
      console.error(`❌ Could not parse join date from: "${joinData.joinDateText}"`);
      console.log('⚠️ Expected format: "Joined March 2020"');
      return null;
    }

    const now = new Date();
    const diffMs = now.getTime() - joinDateParsed.getTime();
    const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const totalMonths = (now.getFullYear() - joinDateParsed.getFullYear()) * 12 + (now.getMonth() - joinDateParsed.getMonth());
    const years = Math.floor(totalMonths / 12);
    const remainingMonths = totalMonths % 12;

    const result = {
      username: joinData.username,
      joinDate: joinData.joinDateText,
      joinDateParsed: joinDateParsed.toISOString(),
      age: {
        totalDays,
        totalMonths,
        years,
        months: remainingMonths,
        formatted: years > 0
          ? `${years} year${years !== 1 ? 's' : ''}, ${remainingMonths} month${remainingMonths !== 1 ? 's' : ''} (${totalDays.toLocaleString()} days)`
          : `${totalMonths} month${totalMonths !== 1 ? 's' : ''} (${totalDays.toLocaleString()} days)`,
      },
      calculatedAt: new Date().toISOString(),
    };

    console.log('');
    console.log(`✅ Account Age for @${result.username}:`);
    console.log(`  📅 Joined:  ${result.joinDate}`);
    console.log(`  ⏳ Age:     ${result.age.formatted}`);
    console.log('');

    return result;
  };

  // ─── Expose on window.XActions ─────────────────────────────

  window.XActions = window.XActions || {};
  window.XActions.accountMisc = {
    viewJoinDate,
    viewLoginHistory,
    viewConnectedAccounts,
    appealSuspension,
    exportAccountSummary,
    accountAgeCalculator,
  };

  // ─── Print Menu ────────────────────────────────────────────

  console.log(`
╔══════════════════════════════════════════════════════════╗
║        🛠️  XActions Account Misc Tools — Loaded         ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  All functions available at:                             ║
║    window.XActions.accountMisc.<function>                 ║
║                                                          ║
║  1. viewJoinDate('username')                             ║
║     ↳ Scrape the "Joined" date from any profile          ║
║                                                          ║
║  2. viewLoginHistory()                                   ║
║     ↳ Navigate to sessions & scrape active logins        ║
║                                                          ║
║  3. viewConnectedAccounts()                              ║
║     ↳ View linked external accounts (Google, Apple)      ║
║                                                          ║
║  4. appealSuspension()                                   ║
║     ↳ Open the account appeal/support form               ║
║                                                          ║
║  5. exportAccountSummary()                               ║
║     ↳ Export account data summary as JSON download        ║
║                                                          ║
║  6. accountAgeCalculator('username')                     ║
║     ↳ Calculate account age in days/months/years         ║
║                                                          ║
╠══════════════════════════════════════════════════════════╣
║  💡 Example: XActions.accountMisc.viewJoinDate('nichxbt')║
║  📖 Data saved to sessionStorage after each operation    ║
╚══════════════════════════════════════════════════════════╝
  `);
})();
