---
title: "Premium Gifting — Tutorial"
description: "Gift an X Premium subscription to another user from their profile using XActions automation."
keywords: ["gift x premium", "twitter premium gift", "gift subscription x", "xactions premium gifting"]
canonical: "https://xactions.app/examples/premium-gifting"
author: "nich (@nichxbt)"
date: "2026-03-30"
---

# Premium Gifting — Tutorial

> Step-by-step guide to gifting an X Premium subscription to another user using XActions.

**Works on:** Browser Console
**Difficulty:** Beginner
**Time:** 2-5 minutes
**Requirements:** Logged into x.com, valid payment method

---

## Prerequisites

- Logged into x.com in your browser
- Browser DevTools console (F12 or Cmd+Option+J on Mac)
- A valid payment method on your account
- Navigate to the recipient's profile page

---

## Quick Start

1. Navigate to the profile of the person you want to gift Premium to (e.g., `x.com/friend`)
2. Open DevTools Console (F12, then click the **Console** tab)
3. Paste the script to open the gift flow
4. Select a tier and duration
5. Complete payment through the on-screen prompts

---

## Configuration

```javascript
const CONFIG = {
  targetUsername: '',          // Leave empty to gift to current profile page
  autoOpenGiftFlow: true,     // Automatically open the gift Premium flow
  delayBetweenActions: 2000,  // ms between UI actions
};
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `targetUsername` | string | `''` | Username to gift to (empty = current page) |
| `autoOpenGiftFlow` | boolean | `true` | Auto-open the gift dialog |
| `delayBetweenActions` | number | `2000` | Delay between UI actions |

---

## Step-by-Step Guide

### Step 1: View Gift Tier Options

```javascript
(() => {
  console.log('🎁 PREMIUM GIFTING - XActions by nichxbt\n');

  console.log('══════════════════════════════════════════════════');
  console.log('🎁 PREMIUM GIFTING INFO');
  console.log('══════════════════════════════════════════════════\n');
  console.log('   Gift tiers available:');
  console.log('   🥉 Basic     — $3/mo (small checkmark, edit posts, longer posts)');
  console.log('   🥈 Premium   — $8/mo (blue checkmark, half ads, Grok, creator tools)');
  console.log('   🥇 Premium+  — $16/mo (no ads, largest boost, X Pro, articles)');
  console.log('');
  console.log('   Duration options:');
  console.log('   📅 1 month');
  console.log('   📅 12 months (annual — saves ~12%)');
  console.log('');
  console.log('   💡 The recipient will be notified of the gift.');
  console.log('   💡 You can gift anonymously if the option is available.');
  console.log('══════════════════════════════════════════════════\n');
})();
```

### Step 2: Open the Gift Flow

Navigate to the recipient's profile first, then paste:

```javascript
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  console.log('🎁 GIFT PREMIUM - XActions by nichxbt\n');

  // Detect username from URL
  const match = window.location.pathname.match(/^\/([^/]+)\/?$/);
  const username = match ? match[1] : null;

  if (!username) {
    console.error('❌ Not on a user profile page.');
    console.log('💡 Navigate to a user profile: x.com/username');
    return;
  }

  console.log(`👤 Target user: @${username}`);

  // Check if they already have Premium
  const verifiedIcon = document.querySelector('[data-testid="icon-verified"]');
  if (verifiedIcon) {
    console.log('ℹ️ This user already has a verified badge.');
    console.log('💡 You can still gift them a subscription extension.');
  } else {
    console.log('✅ No verified badge — great gift candidate!');
  }

  await sleep(1000);

  // Try direct gift button
  const giftBtn = document.querySelector('[data-testid="giftPremium"]');
  if (giftBtn) {
    giftBtn.click();
    console.log('✅ Clicked Gift Premium button.');
    console.log('💡 Follow the on-screen prompts to select tier and pay.');
    return;
  }

  // Try the three-dot menu
  console.log('🔄 Checking profile menu...');
  const moreBtn = document.querySelector('[data-testid="userActions"]');

  if (moreBtn) {
    moreBtn.click();
    await sleep(2000);

    const menuItems = document.querySelectorAll('[role="menuitem"]');
    let giftOption = null;

    for (const item of menuItems) {
      const text = item.textContent.toLowerCase();
      if (text.includes('gift') && text.includes('premium')) {
        giftOption = item;
        break;
      }
    }

    if (giftOption) {
      giftOption.click();
      console.log('✅ Clicked "Gift Premium" from menu.');
      console.log('💡 Follow the on-screen prompts to complete the gift.');
    } else {
      console.log('⚠️ "Gift Premium" option not found in menu.');
      console.log('📋 Available menu options:');
      menuItems.forEach((item, i) => {
        console.log(`   ${i + 1}. ${item.textContent.trim()}`);
      });

      // Close menu
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await sleep(500);

      // Fallback: direct navigation
      console.log(`\n🔄 Trying direct navigation...`);
      window.location.href = `https://x.com/i/premium_sign_up?gift=${username}`;
    }
  } else {
    // No menu button — navigate directly
    console.log('🔄 Navigating to gift flow...');
    window.location.href = `https://x.com/i/premium_sign_up?gift=${username}`;
  }

  // Log gift attempt
  try {
    const gifts = JSON.parse(sessionStorage.getItem('xactions_premium_gifts') || '[]');
    gifts.push({ username, initiatedAt: new Date().toISOString() });
    sessionStorage.setItem('xactions_premium_gifts', JSON.stringify(gifts));
  } catch (e) {}
})();
```

### Expected Console Output

```
🎁 GIFT PREMIUM - XActions by nichxbt

👤 Target user: @friend
✅ No verified badge — great gift candidate!
🔄 Checking profile menu...
✅ Clicked "Gift Premium" from menu.
💡 Follow the on-screen prompts to complete the gift.
```

### Gift to a Specific Username (Without Navigating First)

```javascript
(async () => {
  const targetUsername = 'friend';  // Set the username here

  console.log(`🎁 Gifting Premium to @${targetUsername}...`);

  // Navigate to their profile
  if (!window.location.pathname.includes(`/${targetUsername}`)) {
    window.location.href = `https://x.com/${targetUsername}`;
    console.log(`🚀 Navigating to @${targetUsername}'s profile...`);
    console.log('💡 Re-run the gift script after the page loads.');
    return;
  }

  // Or go directly to the gift flow
  window.location.href = `https://x.com/i/premium_sign_up?gift=${targetUsername}`;
  console.log('✅ Opening gift flow...');
})();
```

---

## Tips & Tricks

1. **Direct URL shortcut** -- You can skip the profile page entirely by navigating to `x.com/i/premium_sign_up?gift=USERNAME`.

2. **Anonymous gifting** -- If the option is available in the gift flow, you can send the gift anonymously.

3. **Existing subscribers** -- You can gift Premium to someone who already has it. This extends their subscription period.

4. **Gift tracking** -- The script saves gift attempts to `sessionStorage` for your records during the session.

5. **Best gift tier** -- Premium ($8/mo) is the most popular gift tier as it includes the blue checkmark, Grok AI, and creator tools without the higher Premium+ price.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Not on a user profile page" | Navigate to the recipient's profile (e.g., `x.com/friend`) before running the script. |
| "Gift Premium" not in menu | The option may not be available in all regions or for all accounts. Try the direct URL: `x.com/i/premium_sign_up?gift=USERNAME`. |
| Payment fails | Ensure your payment method is valid and has sufficient funds. |
| Gift not received | The recipient will be notified. If they do not see it, ask them to check their notifications or refresh. |

---

## Related Scripts

| Feature | Script | Description |
|---------|--------|-------------|
| Subscribe to Premium | `browser/subscribePremium.js` | Subscribe yourself to Premium |
| Premium Manager | `src/premiumManager.js` | Check tier features |
| Blue Checkmark | `src/premiumManager.js` | Verification status and features |
| Profile Scraping | `src/profileManager.js` | Check a user's profile before gifting |

---

<footer>
Built with XActions by <a href="https://x.com/nichxbt">@nichxbt</a> · <a href="https://xactions.app">xactions.app</a> · <a href="https://github.com/nichxbt/xactions">GitHub</a>
</footer>
