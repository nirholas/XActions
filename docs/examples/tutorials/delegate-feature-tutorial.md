---
title: "Delegate Feature — Tutorial"
description: "Add and remove delegates, configure permissions, and manage who can act on your behalf on X/Twitter using XActions."
keywords: ["x delegate access", "twitter delegate feature", "manage delegates x", "delegate permissions twitter", "xactions delegate"]
canonical: "https://xactions.app/examples/delegate-feature"
author: "nich (@nichxbt)"
date: "2026-03-30"
---

# Delegate Feature — Tutorial

> Step-by-step guide to adding delegates, configuring permissions, and managing who can act on your behalf on X/Twitter.

**Works on:** Browser Console
**Difficulty:** Intermediate
**Time:** 5-10 minutes
**Requirements:** Logged into x.com, X Premium subscription

---

## Prerequisites

- Logged into x.com in your browser
- Browser DevTools console (F12 or Cmd+Option+J on Mac)
- X Premium subscription (delegate feature requires Premium)

---

## Quick Start

1. Go to any page on x.com
2. Open DevTools Console (F12, then click the **Console** tab)
3. Paste the script to view permissions info and navigate to delegate settings
4. View current delegates or add new ones
5. Configure permissions for each delegate

---

## Configuration

```javascript
const CONFIG = {
  autoNavigate: true,          // Navigate to delegate settings automatically
  scanDelegates: true,         // List current delegates
  showPermissionsInfo: true,   // Display permissions reference
  delayBetweenActions: 2000,   // ms between UI actions
};
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `autoNavigate` | boolean | `true` | Auto-navigate to delegate settings |
| `scanDelegates` | boolean | `true` | Scan and list current delegates |
| `showPermissionsInfo` | boolean | `true` | Display permission types |

---

## Step-by-Step Guide

### Step 1: Understand Delegate Permissions

```javascript
(() => {
  console.log('🔑 DELEGATE ACCESS - XActions by nichxbt\n');

  console.log('══════════════════════════════════════════════════');
  console.log('🔑 DELEGATE PERMISSIONS REFERENCE');
  console.log('══════════════════════════════════════════════════\n');

  const permissions = {
    '✍️ Post': 'Create, edit, and delete posts on your behalf',
    '✉️ Direct Messages': 'Read and send DMs on your behalf',
    '❤️ Likes': 'Like and unlike posts on your behalf',
    '👥 Follows': 'Follow and unfollow accounts on your behalf',
    '📋 Lists': 'Create and manage lists on your behalf',
    '🎙️ Spaces': 'Create and manage Spaces on your behalf',
    '📊 Analytics': 'View account analytics',
    '👤 Profile': 'Edit profile information',
  };

  for (const [name, desc] of Object.entries(permissions)) {
    console.log(`   ${name}`);
    console.log(`      ${desc}`);
  }

  console.log('\n💡 Tips:');
  console.log('   • Delegates can act on your behalf without your password');
  console.log('   • You can revoke access at any time');
  console.log('   • Grant minimum necessary permissions');
  console.log('   • Delegates cannot change account settings or password');
  console.log('   • Delegate feature requires X Premium');
  console.log('══════════════════════════════════════════════════\n');
})();
```

### Step 2: Navigate to Delegate Settings and Scan Current Delegates

```javascript
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  console.log('🚀 Navigating to delegate settings...');

  const delegateLink = document.querySelector('a[href="/settings/delegate"]');

  if (delegateLink) {
    delegateLink.click();
    console.log('✅ Clicked delegate settings link.');
  } else {
    console.log('⚠️ Delegate settings link not found. Navigating directly...');
    window.location.href = 'https://x.com/settings/delegate';
  }

  await sleep(4000);

  // Scan for current delegates
  console.log('\n👥 Scanning current delegates...');

  const delegates = [];
  const userCells = document.querySelectorAll('[data-testid="UserCell"]');

  userCells.forEach(cell => {
    const usernameEl = cell.querySelector('a[href^="/"]');
    const displayNameEl = cell.querySelector('[dir="ltr"] span');

    if (usernameEl) {
      const href = usernameEl.getAttribute('href');
      const username = href.replace('/', '').split('/')[0];
      const displayName = displayNameEl?.textContent?.trim() || username;

      if (username && !username.includes('/') && !username.includes('settings')) {
        delegates.push({ username, displayName });
      }
    }
  });

  if (delegates.length > 0) {
    console.log(`\n📋 Current Delegates (${delegates.length}):`);
    console.log('─'.repeat(50));
    delegates.forEach((d, i) => {
      console.log(`   ${i + 1}. @${d.username} (${d.displayName})`);
    });
  } else {
    console.log('ℹ️ No delegates found. Your account has no delegates configured.');
    console.log('💡 Click "Add delegate" to invite someone to manage your account.');
  }

  // Show add delegate instructions
  console.log('\n══════════════════════════════════════════════════');
  console.log('➕ HOW TO ADD A DELEGATE');
  console.log('══════════════════════════════════════════════════\n');
  console.log('   1. Click "Add delegate" or "Invite" button');
  console.log('   2. Search for the user by username');
  console.log('   3. Select the permissions you want to grant');
  console.log('   4. Confirm the invitation');
  console.log('   5. The invited user must accept the delegation');
  console.log('');
  console.log('   ⚠️ Security reminders:');
  console.log('   • Only delegate to people you trust');
  console.log('   • Review delegate activity regularly');
  console.log('   • Revoke access immediately if compromised');
  console.log('══════════════════════════════════════════════════\n');

  // Check for add delegate button
  const addBtn = document.querySelector('[data-testid="addDelegate"]')
    || document.querySelector('button[aria-label*="Add"]')
    || document.querySelector('a[href*="delegate/add"]');

  if (addBtn) {
    console.log('✅ "Add delegate" button found on page.');
  } else {
    console.log('ℹ️ "Add delegate" button not found — page may still be loading.');
  }

  console.log('\n💡 Manage delegates: x.com/settings/delegate');
})();
```

### Expected Console Output

```
🔑 DELEGATE ACCESS - XActions by nichxbt

══════════════════════════════════════════════════
🔑 DELEGATE PERMISSIONS REFERENCE
══════════════════════════════════════════════════

   ✍️ Post
      Create, edit, and delete posts on your behalf
   ✉️ Direct Messages
      Read and send DMs on your behalf
   ❤️ Likes
      Like and unlike posts on your behalf
   👥 Follows
      Follow and unfollow accounts on your behalf
   📋 Lists
      Create and manage lists on your behalf
   🎙️ Spaces
      Create and manage Spaces on your behalf
   📊 Analytics
      View account analytics
   👤 Profile
      Edit profile information

🚀 Navigating to delegate settings...
✅ Clicked delegate settings link.

👥 Scanning current delegates...

📋 Current Delegates (2):
──────────────────────────────────────────────────
   1. @assistant (Team Assistant)
   2. @socialmgr (Social Media Manager)

══════════════════════════════════════════════════
➕ HOW TO ADD A DELEGATE
══════════════════════════════════════════════════

   1. Click "Add delegate" or "Invite" button
   2. Search for the user by username
   3. Select the permissions you want to grant
   4. Confirm the invitation
   5. The invited user must accept the delegation

✅ "Add delegate" button found on page.

💡 Manage delegates: x.com/settings/delegate
```

---

## Tips & Tricks

1. **Principle of least privilege** -- Grant only the permissions each delegate needs. A content manager may need Post and Likes, but not DMs or Follows.

2. **Revoke promptly** -- If a delegate leaves your team or their role changes, revoke their access immediately at `x.com/settings/delegate`.

3. **Delegate vs. shared login** -- Delegates are far more secure than sharing your password. Each delegate has their own credentials and limited permissions.

4. **Activity monitoring** -- Review your account activity regularly when using delegates. Check your post history and DMs for any unexpected activity.

5. **Premium requirement** -- The delegate feature is only available with X Premium. Both the account owner and the delegate must have active X accounts.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Delegate settings page not loading | Navigate directly to `x.com/settings/delegate`. Ensure you have X Premium. |
| "Add delegate" button not found | The page may still be loading. Wait a few seconds and try again. |
| Delegate not seeing the invitation | The invited user must accept the delegation from their own account. Check their notifications. |
| Cannot revoke delegate access | Navigate to `x.com/settings/delegate`, find the delegate, and click the remove/revoke option. |

---

## Related Scripts

| Feature | Script | Description |
|---------|--------|-------------|
| Protect Account | `src/settingsManager.js` | Toggle privacy settings |
| View Analytics | `browser/viewAnalytics.js` | Analytics that delegates can view |
| Customize Profile | `browser/updateProfile.js` | Profile edits that delegates can make |
| Subscribe to Premium | `browser/subscribePremium.js` | Get Premium for delegate access |

---

<footer>
Built with XActions by <a href="https://x.com/nichxbt">@nichxbt</a> · <a href="https://xactions.app">xactions.app</a> · <a href="https://github.com/nichxbt/xactions">GitHub</a>
</footer>
