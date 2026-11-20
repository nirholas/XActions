---
title: "Upload Contacts — Tutorial"
description: "Navigate to the contact upload page on X/Twitter and trigger the contact sync flow using XActions. No API needed."
keywords: ["upload contacts twitter", "sync contacts x", "twitter find friends contacts", "xactions upload contacts", "twitter contact sync script"]
canonical: "https://xactions.app/examples/upload-contacts"
author: "nich (@nichxbt)"
date: "2026-03-30"
---

# Upload Contacts — Tutorial

> Step-by-step guide to navigating the contact upload flow, syncing contacts, and disconnecting synced contacts on X/Twitter using XActions.

**Works on:** Browser Console
**Difficulty:** Beginner
**Time:** 2-5 minutes
**Requirements:** Logged into x.com in your browser

---

## Prerequisites

- Logged into x.com in your browser
- Browser DevTools console (F12 or Cmd+Option+J on Mac)
- Understanding that uploading contacts shares your device contacts with X/Twitter

---

## Quick Start

1. Go to any page on x.com
2. Open DevTools Console (F12, then click the **Console** tab)
3. Edit the `CONFIG` object to select your action (`navigate`, `upload`, or `disconnect`)
4. Set `dryRun: false` when ready to actually perform the action
5. Paste the script and press **Enter**

---

## Configuration

```javascript
const CONFIG = {
  action: 'navigate',
  //   'navigate'   — go to the contact upload page
  //   'upload'     — navigate and trigger the upload flow
  //   'disconnect' — navigate and disconnect synced contacts

  navigationDelay: 3000,    // ms to wait for page loads
  actionDelay: 2000,        // ms to wait between actions
  dryRun: true,             // Set to false to actually act
};
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `action` | string | `'navigate'` | What to do: `navigate`, `upload`, or `disconnect` |
| `navigationDelay` | number | `3000` | Milliseconds to wait for page navigation |
| `actionDelay` | number | `2000` | Milliseconds to wait between UI actions |
| `dryRun` | boolean | `true` | When `true`, shows what would happen without acting |

---

## Step-by-Step Guide

### Action 1: Navigate to the Contact Upload Page

This is the safest first step. It simply takes you to the page where you can upload contacts.

```javascript
(() => {
  'use strict';

  const CONFIG = {
    action: 'navigate',
    navigationDelay: 3000,
    actionDelay: 2000,
    dryRun: false,  // Set to false to actually navigate
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const run = async () => {
    console.log('📇 UPLOAD CONTACTS - XActions by nichxbt');
    console.log(`📋 Action: ${CONFIG.action}`);

    if (CONFIG.dryRun) {
      console.log('⚠️ DRY RUN — set dryRun: false to actually navigate');
      console.log('💡 Would navigate to: x.com/i/connect_people');
      return;
    }

    // Try sidebar link first
    const connectLink = document.querySelector('a[href="/i/connect"]')
      || document.querySelector('a[href="/i/connect_people"]');

    if (connectLink) {
      connectLink.click();
      await sleep(CONFIG.navigationDelay);
      console.log('✅ Navigated to contact upload page');
    } else {
      window.location.href = 'https://x.com/i/connect_people';
      console.log('✅ Navigated to x.com/i/connect_people');
      console.log('💡 Page will reload — re-run with action: "upload" to trigger upload');
    }
  };

  run();
})();
```

### Action 2: Trigger the Upload Flow

After navigating to the contacts page, run this to trigger the actual upload:

```javascript
(() => {
  'use strict';

  const CONFIG = {
    action: 'upload',
    navigationDelay: 3000,
    actionDelay: 2000,
    dryRun: false,
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const waitForSelector = async (selector, timeout = 10000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const el = document.querySelector(selector);
      if (el) return el;
      await sleep(200);
    }
    return null;
  };

  const run = async () => {
    console.log('📇 UPLOAD CONTACTS - XActions by nichxbt');
    console.log('📋 Action: upload');

    // Look for the upload/sync contacts button
    let uploadBtn = await waitForSelector('[data-testid="uploadContacts"]', 5000);

    if (!uploadBtn) {
      uploadBtn = document.querySelector('[data-testid="syncContacts"]')
        || document.querySelector('[aria-label*="Upload"], [aria-label*="Sync"]')
        || document.querySelector('button[aria-label*="ontact"]');
    }

    if (!uploadBtn) {
      console.log('🔍 Trying settings path...');
      window.location.href = 'https://x.com/settings/contacts_dashboard';
      console.log('💡 Redirected to contacts settings — re-run to complete');
      return;
    }

    console.log('📇 Found upload contacts button');
    uploadBtn.click();
    await sleep(CONFIG.actionDelay);

    // Handle confirmation dialog
    const confirmBtn = await waitForSelector('[data-testid="confirmationSheetConfirm"]', 5000);
    if (confirmBtn) {
      console.log('🔄 Confirming upload...');
      confirmBtn.click();
      await sleep(CONFIG.actionDelay);
    }

    console.log('✅ Contact upload triggered');
    console.log('⚠️ Follow the on-screen prompts to complete the upload');
  };

  run();
})();
```

### Action 3: Disconnect Synced Contacts

To remove previously synced contacts from X:

```javascript
(() => {
  'use strict';

  const CONFIG = {
    navigationDelay: 3000,
    actionDelay: 2000,
    dryRun: false,
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const waitForSelector = async (selector, timeout = 10000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const el = document.querySelector(selector);
      if (el) return el;
      await sleep(200);
    }
    return null;
  };

  const run = async () => {
    console.log('📇 DISCONNECT CONTACTS - XActions by nichxbt');

    // Navigate to contacts dashboard
    window.location.href = 'https://x.com/settings/contacts_dashboard';
    await sleep(CONFIG.navigationDelay);

    // Look for disconnect button
    let disconnectBtn = await waitForSelector('[data-testid="disconnectContacts"]', 5000);

    if (!disconnectBtn) {
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
      disconnectBtn.click();
      await sleep(CONFIG.actionDelay);

      const confirmBtn = await waitForSelector('[data-testid="confirmationSheetConfirm"]', 5000);
      if (confirmBtn) {
        confirmBtn.click();
        await sleep(CONFIG.actionDelay);
      }

      console.log('✅ Contacts disconnected');
    } else {
      console.log('❌ Could not find disconnect button');
      console.log('💡 You may not have contacts synced');
    }
  };

  run();
})();
```

### Expected Console Output (Navigate)

```
╔════════════════════════════════════════════════════════════════╗
║  📇 UPLOAD CONTACTS                                          ║
║  by nichxbt — v1.0                                           ║
╚════════════════════════════════════════════════════════════════╝
📋 Action: navigate
🔄 Navigating to contact upload page...
✅ Navigated to contact upload page

╔════════════════════════════════════════════════════════════════╗
║  📊 UPLOAD CONTACTS SUMMARY                                  ║
╚════════════════════════════════════════════════════════════════╝
🔧 Action: navigate
📍 Navigated: true
⏱️ Duration: 3.2s
```

---

## Tips & Tricks

1. **Start with dry run** -- Always run with `dryRun: true` first to see what the script would do without actually performing any actions.

2. **Privacy implications** -- Uploading contacts shares your address book with X/Twitter. Review X's privacy policy at `x.com/en/privacy` before proceeding.

3. **Two-step process** -- The upload action often requires a page reload. Run with `action: 'navigate'` first, then run again with `action: 'upload'` on the loaded page.

4. **Direct URLs** -- You can navigate directly to these pages:
   - Connect people: `x.com/i/connect_people`
   - Contacts dashboard: `x.com/settings/contacts_dashboard`

5. **Disconnect anytime** -- You can disconnect synced contacts at any time from `x.com/settings/contacts_dashboard`. This removes the contact data from X's servers.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Upload contacts button not found" | Navigate to `x.com/i/connect_people` first, let the page fully load, then re-run with `action: 'upload'` |
| "Page will reload" warning | This is expected. After the page reloads, re-run the script with the `upload` action |
| Disconnect button not found | You may not have contacts synced. Check `x.com/settings/contacts_dashboard` |
| Dry run shows no changes | Set `dryRun: false` to actually perform the action |

---

## Related Scripts

| Feature | Script | Description |
|---------|--------|-------------|
| Follow Target Followers | `src/followTargetFollowers.js` | Follow people from another account's follower list |
| Keyword Follow | `src/keywordFollow.js` | Auto-follow users posting about specific topics |
| Detect Unfollowers | `browser/detectUnfollowers.js` | Find who unfollowed you |

---

<footer>
Built with XActions by <a href="https://x.com/nichxbt">@nichxbt</a> · <a href="https://xactions.app">xactions.app</a> · <a href="https://github.com/nichxbt/xactions">GitHub</a>
</footer>
