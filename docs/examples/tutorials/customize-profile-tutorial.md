---
title: "Customize Your X Profile — Tutorial"
description: "Update your bio, display name, location, website, avatar, and header image on X/Twitter programmatically. Free browser script, no API needed."
keywords: ["customize x profile", "update twitter bio script", "change twitter display name", "x profile manager", "twitter profile automation", "xactions profile update"]
canonical: "https://xactions.app/examples/customize-profile"
author: "nich (@nichxbt)"
date: "2026-03-30"
---

# Customize Profile — Tutorial

> Step-by-step guide to updating your bio, display name, location, website, avatar, and header image using XActions browser scripts.

**Works on:** Browser Console | Node.js (Puppeteer)
**Difficulty:** Beginner
**Time:** 2-5 minutes
**Requirements:** Logged into x.com in your browser

---

## Prerequisites

- Logged into x.com in your browser
- Browser DevTools console (F12 or Cmd+Option+J on Mac)
- Know what you want to update (name, bio, location, website)

---

## Quick Start

1. Navigate to your profile page on x.com (`x.com/YOUR_USERNAME`)
2. Open DevTools Console (F12, then click the **Console** tab)
3. Copy the script below and edit the `CONFIG` object with your new values
4. Paste the script into the console and press **Enter**
5. Verify your profile updated correctly

---

## Configuration

Edit the `CONFIG` object before running:

```javascript
const CONFIG = {
  // Set to null to skip updating a field
  displayName: null,    // 'Your Name' (max 50 chars)
  bio: null,            // 'Your bio text' (max 160 chars)
  location: null,       // 'San Francisco, CA'
  website: null,        // 'https://yoursite.com'
  autoSave: true,       // Automatically click Save after updating
};
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `displayName` | string or null | `null` | New display name (max 50 characters) |
| `bio` | string or null | `null` | New bio text (max 160 characters) |
| `location` | string or null | `null` | New location text |
| `website` | string or null | `null` | New website URL |
| `autoSave` | boolean | `true` | Automatically save changes after editing |

---

## Step-by-Step Guide

### Method 1: Browser Console (Quick Profile Text Updates)

**Script:** `browser/updateProfile.js`

This script updates text fields (name, bio, location, website) directly from the DevTools console.

#### Step 1: Navigate to your profile

Go to `x.com/YOUR_USERNAME` in your browser. Make sure you can see the "Edit profile" button.

#### Step 2: Edit the CONFIG

Set only the fields you want to change. Leave others as `null`:

```javascript
const CONFIG = {
  displayName: 'nichxbt',
  bio: 'Building XActions - X/Twitter automation toolkit. No API fees.',
  location: 'San Francisco, CA',
  website: 'https://xactions.app',
  autoSave: true,
};
```

#### Step 3: Paste and run the full script

```javascript
(() => {
  const CONFIG = {
    displayName: 'nichxbt',
    bio: 'Building XActions - free X/Twitter automation toolkit.',
    location: 'San Francisco, CA',
    website: 'https://xactions.app',
    autoSave: true,
  };

  const $editProfileBtn = '[data-testid="editProfileButton"]';
  const $nameInput = 'input[name="displayName"]';
  const $bioTextarea = 'textarea[name="description"]';
  const $locationInput = 'input[name="location"]';
  const $websiteInput = 'input[name="url"]';
  const $saveButton = '[data-testid="Profile_Save_Button"]';

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const setInputValue = async (selector, value) => {
    const el = document.querySelector(selector);
    if (!el) {
      console.warn(`⚠️ Field not found: ${selector}`);
      return false;
    }
    el.focus();
    el.select?.();
    await sleep(100);
    document.execCommand('selectAll');
    document.execCommand('delete');
    await sleep(100);
    document.execCommand('insertText', false, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    await sleep(200);
    return true;
  };

  const run = async () => {
    console.log('✏️ UPDATE PROFILE - XActions by nichxbt');

    if (CONFIG.bio && CONFIG.bio.length > 160) {
      console.error(`❌ Bio too long: ${CONFIG.bio.length}/160 chars`);
      return;
    }
    if (CONFIG.displayName && CONFIG.displayName.length > 50) {
      console.error(`❌ Name too long: ${CONFIG.displayName.length}/50 chars`);
      return;
    }

    const editBtn = document.querySelector($editProfileBtn);
    if (editBtn) {
      console.log('📍 Opening profile editor...');
      editBtn.click();
      await sleep(2000);
    } else {
      if (!window.location.href.includes('/settings/profile')) {
        console.error('❌ Cannot find Edit Profile button. Navigate to your profile page.');
        return;
      }
    }

    if (CONFIG.displayName !== null) {
      const ok = await setInputValue($nameInput, CONFIG.displayName);
      if (ok) console.log('✅ Display name updated');
    }
    if (CONFIG.bio !== null) {
      const ok = await setInputValue($bioTextarea, CONFIG.bio);
      if (ok) console.log(`✅ Bio updated (${CONFIG.bio.length}/160 chars)`);
    }
    if (CONFIG.location !== null) {
      const ok = await setInputValue($locationInput, CONFIG.location);
      if (ok) console.log('✅ Location updated');
    }
    if (CONFIG.website !== null) {
      const ok = await setInputValue($websiteInput, CONFIG.website);
      if (ok) console.log('✅ Website updated');
    }

    if (CONFIG.autoSave) {
      await sleep(500);
      const saveBtn = document.querySelector($saveButton);
      if (saveBtn) {
        saveBtn.click();
        console.log('\n💾 Profile saved!');
      } else {
        console.log('\n⚠️ Save button not found. Please save manually.');
      }
    }
  };

  run();
})();
```

### Expected Console Output

```
✏️ UPDATE PROFILE - XActions by nichxbt
📋 Updates to apply:
   • Name: "nichxbt"
   • Bio: "Building XActions - free X/Twitter automation to..."
   • Location: "San Francisco, CA"
   • Website: "https://xactions.app"

📍 Opening profile editor...
✅ Display name updated
✅ Bio updated (53/160 chars)
✅ Location updated
✅ Website updated

💾 Profile saved!
```

### Method 2: Node.js (Puppeteer) — Avatar & Header Upload

**Script:** `src/profileManager.js`

The Node.js module supports uploading avatar and header images, which the browser script cannot do.

```javascript
import { uploadAvatar, uploadHeader, updateProfile } from './src/profileManager.js';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const browser = await puppeteer.launch({ headless: false });
const page = await browser.newPage();

// Set your session cookie
await page.setCookie({
  name: 'auth_token',
  value: 'YOUR_AUTH_TOKEN',
  domain: '.x.com',
});

// Update text fields
await updateProfile(page, {
  name: 'nichxbt',
  bio: 'Building XActions',
  location: 'SF',
  website: 'https://xactions.app',
});

// Upload avatar
await uploadAvatar(page, '/path/to/avatar.jpg');

// Upload header/banner
await uploadHeader(page, '/path/to/header.jpg');

await browser.close();
```

---

## Tips & Tricks

1. **Bio character limit** -- X enforces a 160-character limit on bios. The script validates this before submitting and will abort if exceeded.

2. **Display name limit** -- Display names are limited to 50 characters. Emojis count as 1-2 characters depending on the emoji.

3. **Update one field at a time** -- If you only need to change your bio, set all other fields to `null` to avoid overwriting them.

4. **Profile picture dimensions** -- For best results, use a square image (400x400 pixels) for your avatar and a 1500x500 image for your header.

5. **Website URL format** -- Include the full URL with `https://`. X will display a shortened version on your profile.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Cannot find Edit Profile button" | Make sure you are on your own profile page (`x.com/YOUR_USERNAME`), not someone else's |
| "Save button not found" | The profile edit dialog may not have opened. Try refreshing and running again |
| Bio validation error | Check that your bio is 160 characters or fewer |
| Fields not updating | X may have changed its DOM selectors. Check `docs/agents/selectors.md` for updated selectors |
| `autoSave` not working | Set `autoSave: false` and click Save manually to verify changes look correct |

---

## Related Scripts

| Feature | Script | Description |
|---------|--------|-------------|
| Profile Scraping | `src/profileManager.js` → `getProfile()` | Read any user's public profile data |
| Filter Posts | `src/profileManager.js` → `filterPosts()` | Sort a user's posts by latest or most liked |
| QR Code Sharing | `browser/qrCodeSharing.js` | Generate a QR code for your profile |
| View Analytics | `browser/viewAnalytics.js` | View impressions and engagement metrics |

---

<footer>
Built with XActions by <a href="https://x.com/nichxbt">@nichxbt</a> · <a href="https://xactions.app">xactions.app</a> · <a href="https://github.com/nichxbt/xactions">GitHub</a>
</footer>
