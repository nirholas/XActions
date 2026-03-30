---
title: "Verified-Only Replies & Prioritized Replies — Tutorial"
description: "Set reply restrictions to verified users only and leverage prioritized replies on X/Twitter using XActions."
keywords: ["verified only replies twitter", "reply restrictions x", "prioritized replies twitter", "xactions verified only"]
canonical: "https://xactions.app/examples/verified-only"
author: "nich (@nichxbt)"
date: "2026-03-30"
---

# Reply to Verified-Only & Prioritized Replies — Tutorial

> Step-by-step guide to restricting replies to verified users only and understanding prioritized reply benefits on X/Twitter.

**Works on:** Browser Console
**Difficulty:** Beginner
**Time:** 1-2 minutes
**Requirements:** Logged into x.com, X Premium subscription (for setting restrictions)

---

## Prerequisites

- Logged into x.com in your browser
- Browser DevTools console (F12 or Cmd+Option+J on Mac)
- X Premium subscription (required to set reply restrictions)

---

## Quick Start

1. Open the compose dialog on x.com (click the post button or press `N`)
2. Open DevTools Console (F12, then click the **Console** tab)
3. Paste the script to set reply restrictions
4. The script will click the reply restriction menu and select your preference
5. Compose and send your post -- the restriction applies to that post

---

## Configuration

```javascript
const CONFIG = {
  mode: 'set',                    // 'set' = set restriction, 'check' = check status only
  restriction: 'verified',        // 'everyone', 'verified', 'following', 'mentioned'
  autoCompose: false,             // Open compose dialog if not already open
  delayBetweenActions: 1500,      // ms between UI interactions
};
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mode` | string | `'set'` | `'set'` to change restrictions, `'check'` to check status only |
| `restriction` | string | `'verified'` | Who can reply: `everyone`, `verified`, `following`, `mentioned` |
| `autoCompose` | boolean | `false` | Auto-open compose dialog if not open |
| `delayBetweenActions` | number | `1500` | Delay between UI actions in ms |

### Reply Restriction Options

| Option | Who Can Reply | Use Case |
|--------|---------------|----------|
| `everyone` | All users | Default, maximum reach |
| `verified` | Only verified accounts | Reduce spam, quality replies |
| `following` | Only accounts you follow | Inner circle only |
| `mentioned` | Only people mentioned in the post | Private conversation |

---

## Step-by-Step Guide

### Step 1: Check Your Verification Status

Before setting reply restrictions, verify that you have Premium:

```javascript
(() => {
  console.log('🔒 VERIFIED-ONLY REPLIES - XActions by nichxbt\n');

  const verifiedIcons = document.querySelectorAll('[data-testid="icon-verified"]');
  const profileLink = document.querySelector('a[data-testid="AppTabBar_Profile_Link"]');

  if (verifiedIcons.length > 0) {
    console.log('✅ Verified badge detected — you can use reply restrictions.');
  } else {
    console.log('⚠️ No verified badge detected.');
    console.log('💡 Reply restrictions require X Premium. Subscribe at: x.com/i/premium_sign_up');
  }

  if (profileLink) {
    console.log(`👤 Your profile: https://x.com${profileLink.getAttribute('href')}`);
  }
})();
```

### Step 2: Set Reply Restriction on a New Post

Open the compose dialog first (click the post button), then run:

```javascript
(async () => {
  const CONFIG = {
    restriction: 'verified',  // Change to: 'everyone', 'following', or 'mentioned'
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  console.log('🔒 SETTING REPLY RESTRICTION - XActions by nichxbt');

  const RESTRICTION_LABELS = {
    everyone: 'Everyone',
    verified: 'Verified accounts',
    following: 'Accounts you follow',
    mentioned: 'Only people you mention',
  };

  console.log(`🔒 Target restriction: "${RESTRICTION_LABELS[CONFIG.restriction]}"`);

  // Check that compose dialog is open
  const textarea = document.querySelector('[data-testid="tweetTextarea_0"]');
  if (!textarea) {
    console.log('⚠️ Compose dialog not open. Opening...');
    const composeBtn = document.querySelector('a[href="/compose/post"]')
      || document.querySelector('a[aria-label="Post"]');

    if (composeBtn) {
      composeBtn.click();
      await sleep(1500);
    } else {
      console.error('❌ Could not open compose dialog. Click the post button manually first.');
      return;
    }
  }

  await sleep(1000);

  // Find and click the reply restriction button
  const replyRestrictionBtn = document.querySelector('[data-testid="replyRestriction"]')
    || document.querySelector('[aria-label="Reply restrictions"]')
    || document.querySelector('button[aria-haspopup="menu"]');

  if (!replyRestrictionBtn) {
    console.error('❌ Reply restriction button not found.');
    console.log('💡 Make sure the compose dialog is open and you have Premium.');
    return;
  }

  replyRestrictionBtn.click();
  console.log('✅ Opened reply restriction menu.');
  await sleep(1500);

  // Select the desired option
  const menuItems = document.querySelectorAll('[role="menuitem"], [role="option"]');
  let found = false;

  for (const item of menuItems) {
    const text = item.textContent.toLowerCase();
    if (text.includes(CONFIG.restriction.toLowerCase()) ||
        text.includes(RESTRICTION_LABELS[CONFIG.restriction].toLowerCase())) {
      item.click();
      found = true;
      console.log(`✅ Selected: "${RESTRICTION_LABELS[CONFIG.restriction]}"`);
      break;
    }
  }

  if (!found) {
    console.log('⚠️ Could not find the desired restriction option.');
    console.log('📋 Available options:');
    menuItems.forEach((item, i) => {
      console.log(`   ${i + 1}. ${item.textContent.trim()}`);
    });
  }

  console.log('\n✅ Reply restriction set! Compose your post and send it.');
  console.log('💡 This setting applies per-post. Set it before posting each time.');
})();
```

### Expected Console Output

```
🔒 SETTING REPLY RESTRICTION - XActions by nichxbt
🔒 Target restriction: "Verified accounts"
✅ Opened reply restriction menu.
✅ Selected: "Verified accounts"

✅ Reply restriction set! Compose your post and send it.
💡 This setting applies per-post. Set it before posting each time.
```

### Step 3: Check Current Restriction on a Post

```javascript
(() => {
  const restrictionEl = document.querySelector('[data-testid="replyRestriction"]');
  if (restrictionEl) {
    const text = restrictionEl.textContent.trim() || restrictionEl.getAttribute('aria-label') || 'Unknown';
    console.log(`📋 Current reply restriction: ${text}`);
  } else {
    console.log('ℹ️ No active reply restriction element found.');
    console.log('💡 Open the compose dialog to see restriction options.');
  }
})();
```

### Understanding Prioritized Replies

Prioritized replies are a benefit of X Premium. When you reply to popular tweets, your reply is more likely to appear near the top of the conversation.

| Tier | Reply Boost Level |
|------|-------------------|
| Free | None |
| Basic ($3/mo) | Small |
| Premium ($8/mo) | Medium |
| Premium+ ($16/mo) | Largest |

The boost is automatic -- there is no setting to toggle. Simply having Premium gives your replies higher visibility.

---

## Tips & Tricks

1. **Per-post setting** -- Reply restrictions are set per post, not globally. You need to configure them before each post.

2. **Combine with verified-only for announcements** -- When making important announcements, set replies to verified-only to filter out spam and get quality responses.

3. **"Mentioned" for private threads** -- Use the `mentioned` restriction to create semi-private conversations visible to everyone but only replyable by tagged users.

4. **Restriction persists in compose** -- Once you set a restriction in the compose dialog, it may carry over to your next post in the same session. Double-check before posting.

5. **Existing replies unaffected** -- Changing reply restrictions on a draft does not affect already-posted content. The restriction only applies to the post when it is published.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Reply restriction button not found | Ensure the compose dialog is open. The button appears in the toolbar at the bottom of the compose area. |
| "Premium required" message | Reply restrictions require X Premium subscription. Subscribe at `x.com/i/premium_sign_up`. |
| Menu options not matching | X may use different label text. Check the available options printed in the console. |
| Restriction not applying | Make sure you set the restriction before clicking "Post." The restriction is applied at post time. |

---

## Related Scripts

| Feature | Script | Description |
|---------|--------|-------------|
| Subscribe to Premium | `src/subscribePremium.js` | Get Premium for reply restrictions |
| Blue Checkmark | `src/premiumManager.js` | Check verification status |
| Auto Commenter | `src/autoCommenter.js` | Automate replies to tweets |
| View Analytics | `src/viewAnalytics.js` | See engagement on your posts |

---

<footer>
Built with XActions by <a href="https://x.com/nichxbt">@nichxbt</a> · <a href="https://xactions.app">xactions.app</a> · <a href="https://github.com/nichxbt/xactions">GitHub</a>
</footer>
