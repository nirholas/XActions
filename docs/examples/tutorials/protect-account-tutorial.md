---
title: "Protect Account (Private Posts) — Tutorial"
description: "Toggle protected tweets and manage privacy settings on X/Twitter using XActions browser automation. No API needed."
keywords: ["protect twitter account", "private tweets x", "twitter privacy settings script", "toggle protected account", "xactions settings manager"]
canonical: "https://xactions.app/examples/protect-account"
author: "nich (@nichxbt)"
date: "2026-03-30"
---

# Protect Account (Private Posts) — Tutorial

> Step-by-step guide to toggling protected tweets and managing privacy settings using XActions.

**Works on:** Browser Console | Node.js (Puppeteer)
**Difficulty:** Beginner
**Time:** 1-2 minutes
**Requirements:** Logged into x.com in your browser

---

## Prerequisites

- Logged into x.com in your browser
- Browser DevTools console (F12 or Cmd+Option+J on Mac)

---

## Quick Start

1. Go to any page on x.com
2. Open DevTools Console (F12, then click the **Console** tab)
3. Paste the script below to navigate to privacy settings and toggle protection
4. Confirm the change if prompted by X
5. Verify the lock icon appears on your profile

---

## Configuration

The Node.js `settingsManager.js` module provides programmatic control:

```javascript
import { toggleProtectedAccount } from './src/settingsManager.js';

// protect = true  → make account private
// protect = false → make account public
await toggleProtectedAccount(page, true);
```

| Function | Parameter | Description |
|----------|-----------|-------------|
| `toggleProtectedAccount` | `protect: boolean` | `true` to protect, `false` to unprotect |
| `getSettings` | none | Get overview of all account settings |
| `getBlockedAccounts` | `{ limit }` | List blocked accounts |
| `getMutedAccounts` | `{ limit }` | List muted accounts |
| `setContentPreferences` | `{ key: value }` | Toggle content preference switches |

---

## Step-by-Step Guide

### Method 1: Browser Console (Quick Toggle)

#### Step 1: Navigate to audience settings

Paste this into the console to go directly to the privacy settings page:

```javascript
window.location.href = 'https://x.com/settings/audience_and_tagging';
```

Wait for the page to load fully.

#### Step 2: Toggle the protected tweets switch

```javascript
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  console.log('🔒 PROTECT ACCOUNT - XActions by nichxbt');
  console.log('');

  // Find the switch toggle
  const toggle = document.querySelector('[data-testid="protectedTweets"]')
    || document.querySelector('[role="switch"]');

  if (!toggle) {
    console.error('❌ Protected tweets toggle not found.');
    console.log('💡 Make sure you are on: x.com/settings/audience_and_tagging');
    return;
  }

  const currentState = toggle.getAttribute('aria-checked') === 'true';
  console.log(`📋 Current state: ${currentState ? '🔒 Protected (Private)' : '🌐 Public'}`);

  // Toggle the switch
  toggle.click();
  await sleep(1000);

  // Handle confirmation dialog
  const confirmBtn = document.querySelector('[data-testid="confirmationSheetConfirm"]');
  if (confirmBtn) {
    console.log('🔄 Confirming change...');
    confirmBtn.click();
    await sleep(1500);
  }

  const newState = toggle.getAttribute('aria-checked') === 'true';
  console.log(`✅ Account is now: ${newState ? '🔒 Protected (Private)' : '🌐 Public'}`);
})();
```

### Expected Console Output

```
🔒 PROTECT ACCOUNT - XActions by nichxbt

📋 Current state: 🌐 Public
🔄 Confirming change...
✅ Account is now: 🔒 Protected (Private)
```

### Method 2: Node.js (Puppeteer)

**Script:** `src/settingsManager.js`

```javascript
import settingsManager from './src/settingsManager.js';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const browser = await puppeteer.launch({ headless: false });
const page = await browser.newPage();

// Set session cookie
await page.setCookie({
  name: 'auth_token',
  value: 'YOUR_AUTH_TOKEN',
  domain: '.x.com',
});

// Make account private
const result = await settingsManager.toggleProtectedAccount(page, true);
console.log(result);
// { success: true, action: 'protected', protected: true, timestamp: '...' }

// Make account public again
const result2 = await settingsManager.toggleProtectedAccount(page, false);
console.log(result2);
// { success: true, action: 'unprotected', protected: false, timestamp: '...' }

// Get overview of all settings
const settings = await settingsManager.getSettings(page);
console.log(settings);

await browser.close();
```

### Method 3: Check and manage other privacy settings

```javascript
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  console.log('🔐 PRIVACY SETTINGS OVERVIEW - XActions by nichxbt');

  // Navigate to privacy settings
  window.location.href = 'https://x.com/settings/privacy_and_safety';
  await sleep(3000);

  // List all available privacy sections
  const links = document.querySelectorAll('a[href^="/settings/"]');
  console.log('\n📋 Available privacy settings:');

  links.forEach(link => {
    const text = link.textContent.trim();
    const href = link.getAttribute('href');
    if (text && href.includes('privacy') || href.includes('safety') || href.includes('audience')) {
      console.log(`   🔗 ${text} → x.com${href}`);
    }
  });

  // List all toggle switches on the page
  const switches = document.querySelectorAll('[role="switch"]');
  console.log(`\n🔘 Toggle switches found: ${switches.length}`);

  switches.forEach((sw, i) => {
    const label = sw.closest('[data-testid]')?.textContent?.trim()?.substring(0, 80) || `Switch ${i + 1}`;
    const enabled = sw.getAttribute('aria-checked') === 'true';
    console.log(`   ${enabled ? '🟢' : '🔴'} ${label}`);
  });
})();
```

---

## Tips & Tricks

1. **What protected mode does** -- When your account is protected, only approved followers can see your posts. New follow requests require your approval. Your posts will not appear in public search results.

2. **Existing followers stay** -- Protecting your account does not remove existing followers. They will continue to see your posts. Use the Block feature to remove specific followers.

3. **Replies become limited** -- Protected posts can only be replied to by your approved followers. Your replies to public accounts will not be visible to non-followers.

4. **Reposts are disabled** -- Other users cannot repost your protected tweets. This limits content spread significantly.

5. **Quick URL shortcuts** -- Navigate directly to specific settings pages:
   - Audience: `x.com/settings/audience_and_tagging`
   - Privacy: `x.com/settings/privacy_and_safety`
   - Blocked accounts: `x.com/settings/blocked`
   - Muted accounts: `x.com/settings/muted`

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Toggle not found | Ensure you are on `x.com/settings/audience_and_tagging`. The page must be fully loaded. |
| Confirmation dialog not appearing | X may not always require confirmation. The toggle may have already applied. |
| Setting not persisting | Refresh the page after toggling. If it reverts, there may be a network issue. |
| Cannot find privacy settings | Navigate manually: click your profile picture in the sidebar, then Settings and Support, then Settings and privacy. |

---

## Related Scripts

| Feature | Script | Description |
|---------|--------|-------------|
| Block/Mute Management | `src/settingsManager.js` → `getBlockedAccounts()` | List blocked accounts |
| Content Preferences | `src/settingsManager.js` → `setContentPreferences()` | Toggle content filters |
| Data Download | `src/settingsManager.js` → `requestDataDownload()` | Request archive of your data |
| Delegate Access | `browser/delegateAccess.js` | Manage who can act on your behalf |

---

<footer>
Built with XActions by <a href="https://x.com/nichxbt">@nichxbt</a> · <a href="https://xactions.app">xactions.app</a> · <a href="https://github.com/nichxbt/xactions">GitHub</a>
</footer>
