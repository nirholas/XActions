---
title: "ID Verification — Tutorial"
description: "Check your ID verification status, understand requirements, and navigate the verification flow on X/Twitter using XActions."
keywords: ["twitter id verification", "x identity verification", "verify identity twitter", "xactions id verification"]
canonical: "https://xactions.app/examples/id-verification"
author: "nich (@nichxbt)"
date: "2026-03-30"
---

# ID Verification — Tutorial

> Step-by-step guide to checking verification status, understanding requirements, and navigating the ID verification flow on X/Twitter.

**Works on:** Browser Console
**Difficulty:** Beginner
**Time:** 5-10 minutes (plus 24-72 hours processing)
**Requirements:** Logged into x.com, X Premium subscription, government-issued photo ID

---

## Prerequisites

- Logged into x.com in your browser
- Browser DevTools console (F12 or Cmd+Option+J on Mac)
- X Premium subscription (Basic, Premium, or Premium+)
- Government-issued photo ID (passport, driver's license, or national ID)

---

## Quick Start

1. Go to any page on x.com
2. Open DevTools Console (F12, then click the **Console** tab)
3. Paste the script to check your verification status and see requirements
4. The script auto-navigates to the verification settings page
5. Follow the on-screen prompts to upload your ID and selfie

---

## Configuration

```javascript
const CONFIG = {
  autoNavigate: true,          // Navigate to verification settings automatically
  checkStatus: true,           // Check current verification status
  showRequirements: true,      // Display verification requirements
  delayBetweenActions: 2000,   // ms between navigation steps
};
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `autoNavigate` | boolean | `true` | Auto-navigate to verification settings |
| `checkStatus` | boolean | `true` | Check current verification status |
| `showRequirements` | boolean | `true` | Print requirements to console |
| `delayBetweenActions` | number | `2000` | Delay between UI actions in ms |

---

## Step-by-Step Guide

### Step 1: Check Requirements and Status

```javascript
(() => {
  console.log('🪪 ID VERIFICATION - XActions by nichxbt\n');

  // Show requirements
  console.log('══════════════════════════════════════════════════');
  console.log('📋 ID VERIFICATION REQUIREMENTS');
  console.log('══════════════════════════════════════════════════\n');

  console.log('🏷️  Individual ID Verification');
  console.log('─'.repeat(40));
  const reqs = [
    "Government-issued photo ID (passport, driver's license, national ID)",
    'A selfie matching the ID photo',
    'Your account must be at least 30 days old',
    'You must have a profile photo, display name, and confirmed email/phone',
    'No recent violations of X Rules',
    'X Premium subscription (Basic, Premium, or Premium+)',
  ];
  reqs.forEach(r => console.log(`   ✓ ${r}`));

  console.log('\n🏷️  Organization Verification');
  console.log('─'.repeat(40));
  const orgReqs = [
    'Official organization account',
    'Verified organization identity',
    'Affiliated accounts management',
    'Gold checkmark badge',
    'Requires Verified Organizations subscription',
  ];
  orgReqs.forEach(r => console.log(`   ✓ ${r}`));

  console.log('\n💡 Tips:');
  console.log('   • Ensure your ID is not expired');
  console.log('   • Take the selfie in good lighting');
  console.log('   • Make sure all text on the ID is legible');
  console.log('   • Processing usually takes 24-72 hours');

  // Check status
  console.log('\n🔍 Checking verification status...');

  const verifiedIcon = document.querySelector('[data-testid="icon-verified"]');
  if (verifiedIcon) {
    console.log('✅ Verified badge detected — you are verified.');
    console.log('💡 Manage verification: x.com/settings/verification');
  } else {
    console.log('⚠️ No verified badge detected on this page.');
  }

  const pageText = document.body.innerText;
  if (pageText.includes('ID verification complete') || pageText.includes('Verification confirmed')) {
    console.log('✅ ID verification appears complete.');
  } else if (pageText.includes('Pending review') || pageText.includes('Under review')) {
    console.log('🔄 Your ID verification is pending review.');
  }
})();
```

### Step 2: Navigate to Verification Settings

```javascript
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  console.log('🚀 Navigating to ID verification settings...');

  const verificationLink = document.querySelector('a[href="/settings/verification"]');

  if (verificationLink) {
    verificationLink.click();
    console.log('✅ Clicked verification settings link.');
    await sleep(2000);
  } else {
    console.log('⚠️ Verification link not found. Navigating directly...');
    window.location.href = 'https://x.com/settings/verification';
    await sleep(4000);
  }

  await sleep(2000);

  // Check what's available on the page
  const primaryColumn = document.querySelector('[data-testid="primaryColumn"]');
  if (primaryColumn) {
    const text = primaryColumn.textContent;
    if (text.includes('Verification') || text.includes('Identity')) {
      console.log('✅ Verification page loaded.');
    }

    const buttons = primaryColumn.querySelectorAll('button, a[role="button"]');
    if (buttons.length > 0) {
      console.log('\n📋 Available actions:');
      buttons.forEach((btn, i) => {
        const label = btn.textContent.trim() || btn.getAttribute('aria-label') || 'Unnamed';
        console.log(`   ${i + 1}. ${label}`);
      });
    }
  }

  console.log('\n✅ Follow the on-screen prompts to complete verification.');
  console.log('📱 You will need your government-issued ID and a selfie.');
})();
```

### Full Script (All-in-One)

Run the complete script for status check, requirements display, and auto-navigation:

```javascript
// Copy the full contents of src/idVerification.js and paste into console
// The script will:
// 1. Display all verification requirements
// 2. Check your current verification status
// 3. Navigate to the verification settings page
```

### Expected Console Output

```
═══════════════════════════════════════════
🪪 XActions — ID Verification
═══════════════════════════════════════════

══════════════════════════════════════════════════
📋 ID VERIFICATION REQUIREMENTS
══════════════════════════════════════════════════

🏷️  ID Verification
────────────────────────────────────────
   ✓ Government-issued photo ID (passport, driver's license, national ID)
   ✓ A selfie matching the ID photo
   ✓ Your account must be at least 30 days old
   ✓ You must have a profile photo, display name, and confirmed email/phone
   ✓ No recent violations of X Rules
   ✓ X Premium subscription (Basic, Premium, or Premium+)

🏷️  Organization Verification
────────────────────────────────────────
   ✓ Official organization account
   ✓ Verified organization identity
   ✓ Affiliated accounts management
   ✓ Gold checkmark badge
   ✓ Requires Verified Organizations subscription

💡 Tips:
   • Ensure your ID is not expired
   • Take the selfie in good lighting
   • Make sure all text on the ID is legible
   • Processing usually takes 24-72 hours

🔍 Checking verification status...
⚠️ No verified badge detected on this page.

🚀 Navigating to ID verification settings...
✅ Verification page loaded.

📋 Available actions:
   1. Start verification
   2. Learn more

✅ Follow the on-screen prompts to complete verification.
📱 You will need your government-issued ID and a selfie.
```

---

## Tips & Tricks

1. **Prepare your documents** -- Have your government ID and good lighting for the selfie ready before starting. The flow is time-sensitive.

2. **Match your profile info** -- Your X profile name should match the name on your ID for faster processing.

3. **Processing time** -- ID verification typically takes 24-72 hours. You will receive a notification when complete.

4. **Already verified?** -- If you already have a blue checkmark from Premium, ID verification adds an extra layer of trust to your account.

5. **Denied verification** -- If denied, check that your ID is not expired, the photo is clear, and your account meets all requirements. You can re-submit after addressing the issue.

6. **Privacy** -- X states that ID documents are processed by a third-party verification service and are not stored permanently.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Verification page not loading | Navigate directly to `x.com/settings/verification`. Ensure you have an active X Premium subscription. |
| "Start verification" button missing | You may not meet the prerequisites (account age, profile completeness, Premium subscription). |
| Selfie rejected | Ensure good lighting, face the camera directly, and remove glasses/hats if possible. |
| ID photo rejected | Make sure all text is legible, the ID is not expired, and the entire document is visible. |
| Status stuck on "pending" | Processing can take up to 72 hours. If longer, contact X Support. |

---

## Related Scripts

| Feature | Script | Description |
|---------|--------|-------------|
| Subscribe to Premium | `src/subscribePremium.js` | Get Premium (required for verification) |
| Blue Checkmark | `src/premiumManager.js` | Check verification badge status |
| Customize Profile | `src/updateProfile.js` | Update profile to match ID |
| Protect Account | `src/settingsManager.js` | Manage privacy settings |

---

<footer>
Built with XActions by <a href="https://x.com/nichxbt">@nichxbt</a> · <a href="https://xactions.app">xactions.app</a> · <a href="https://github.com/nichxbt/xactions">GitHub</a>
</footer>
