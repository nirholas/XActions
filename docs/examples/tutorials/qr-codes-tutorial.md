---
title: "Use QR Codes — Tutorial"
description: "Generate and share QR codes for any X/Twitter profile. Free browser script with overlay display and auto-download."
keywords: ["twitter qr code", "x profile qr code", "share twitter profile qr", "xactions qr code", "generate qr code twitter"]
canonical: "https://xactions.app/examples/qr-codes"
author: "nich (@nichxbt)"
date: "2026-03-30"
---

# Use QR Codes — Tutorial

> Step-by-step guide to generating and sharing QR codes for X/Twitter profiles using XActions.

**Works on:** Browser Console
**Difficulty:** Beginner
**Time:** Under 1 minute
**Requirements:** Logged into x.com in your browser

---

## Prerequisites

- Logged into x.com in your browser
- Browser DevTools console (F12 or Cmd+Option+J on Mac)
- On a profile page (or set the username in CONFIG)

---

## Quick Start

1. Navigate to any profile page on x.com (e.g., `x.com/nichxbt`)
2. Open DevTools Console (F12, then click the **Console** tab)
3. Edit `CONFIG.username` if needed (leave empty to use the current profile page)
4. Paste the script and press **Enter**
5. A QR code overlay appears on screen and the image auto-downloads

---

## Configuration

```javascript
const CONFIG = {
  username: '',          // Leave empty to use current profile page
  size: 256,             // QR code size in pixels
  darkColor: '#000000',  // QR code dark color
  lightColor: '#FFFFFF', // QR code light color
  autoDownload: true,    // Auto-download the QR code as PNG
};
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `username` | string | `''` | Target username (empty = auto-detect from current page) |
| `size` | number | `256` | QR code image size in pixels |
| `darkColor` | string | `'#000000'` | Color of the QR code squares |
| `lightColor` | string | `'#FFFFFF'` | Background color |
| `autoDownload` | boolean | `true` | Automatically download the QR code PNG |

---

## Step-by-Step Guide

### Step 1: Navigate to a profile

Go to the X profile you want to generate a QR code for, e.g., `x.com/nichxbt`.

### Step 2: Paste the script

```javascript
(() => {
  const CONFIG = {
    username: '',        // Leave empty to detect from URL
    size: 256,
    darkColor: '#000000',
    lightColor: '#FFFFFF',
    autoDownload: true,
  };

  const generateQRCode = (text, size = 256) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;
  };

  const run = async () => {
    console.log('📱 QR CODE SHARING - XActions by nichxbt');

    let username = CONFIG.username;
    if (!username) {
      const match = window.location.pathname.match(/^\/([^\/]+)/);
      username = match ? match[1] : '';
    }

    if (!username || ['home', 'explore', 'notifications', 'messages', 'i', 'settings'].includes(username)) {
      console.error('❌ Set CONFIG.username or navigate to a profile page!');
      return;
    }

    const profileUrl = `https://x.com/${username}`;
    const qrUrl = generateQRCode(profileUrl, CONFIG.size);

    console.log(`👤 Profile: @${username}`);
    console.log(`🔗 URL: ${profileUrl}`);
    console.log(`📱 QR Code: ${qrUrl}`);

    // Display QR code as an overlay on the page
    const overlay = document.createElement('div');
    overlay.id = 'xactions-qr-overlay';
    overlay.innerHTML = `
      <div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:99999;display:flex;align-items:center;justify-content:center;cursor:pointer;">
        <div style="background:white;border-radius:16px;padding:32px;text-align:center;max-width:400px;">
          <h2 style="margin:0 0 8px 0;font-size:20px;color:#000;">@${username}</h2>
          <p style="margin:0 0 16px 0;color:#666;font-size:14px;">Scan to visit profile</p>
          <img src="${qrUrl}" alt="QR Code" style="width:${CONFIG.size}px;height:${CONFIG.size}px;border:2px solid #eee;border-radius:8px;">
          <p style="margin:16px 0 0 0;color:#999;font-size:12px;">Click anywhere to close</p>
        </div>
      </div>
    `;
    overlay.onclick = () => overlay.remove();
    document.body.appendChild(overlay);

    if (CONFIG.autoDownload) {
      try {
        const response = await fetch(qrUrl);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `qr-${username}.png`;
        a.click();
        console.log('📥 QR code downloaded');
      } catch (e) {
        console.log('💡 Right-click the QR code to save it manually');
      }
    }
  };

  run();
})();
```

### Expected Console Output

```
📱 QR CODE SHARING - XActions by nichxbt
👤 Profile: @nichxbt
🔗 URL: https://x.com/nichxbt
📱 QR Code: https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=https%3A%2F%2Fx.com%2Fnichxbt
📥 QR code downloaded
```

A visual overlay will appear on screen showing the QR code. Click anywhere to dismiss it.

### Generating QR Codes for Multiple Profiles

To generate QR codes in bulk for a list of usernames:

```javascript
(async () => {
  const usernames = ['nichxbt', 'elonmusk', 'openai'];
  const size = 256;

  console.log('📱 BULK QR CODE GENERATION - XActions by nichxbt');

  for (const username of usernames) {
    const profileUrl = `https://x.com/${username}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(profileUrl)}`;

    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qr-${username}.png`;
      a.click();
      console.log(`✅ Downloaded QR code for @${username}`);
    } catch (e) {
      console.log(`❌ Failed for @${username}: ${e.message}`);
    }

    await new Promise(r => setTimeout(r, 500));
  }

  console.log('✅ Bulk QR code generation complete');
})();
```

---

## Tips & Tricks

1. **Auto-detect username** -- Leave `CONFIG.username` empty and navigate to the profile you want. The script will detect the username from the URL.

2. **Custom sizes** -- For print use, increase `size` to 512 or 1024 for higher resolution. For social sharing, 256 is sufficient.

3. **Share via screenshot** -- The overlay displays the QR code large on screen. Take a screenshot to share it in chats or presentations.

4. **Works for any profile** -- You do not need to own the profile. Navigate to any public profile and generate a QR code for it.

5. **No dependencies** -- The QR code is generated using a free API (`api.qrserver.com`). No libraries or installations needed.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Set CONFIG.username or navigate to a profile page" | You are on a non-profile page (home, explore, etc.). Navigate to a user profile first, or set `CONFIG.username` explicitly. |
| QR code not downloading | Your browser may be blocking the download. Right-click the QR code in the overlay and select "Save Image As". |
| Overlay not appearing | Check that the script ran without errors. The overlay is appended to `document.body`. |
| QR code image not loading | The external API (`api.qrserver.com`) may be temporarily down. Try again in a few minutes. |

---

## Related Scripts

| Feature | Script | Description |
|---------|--------|-------------|
| Customize Profile | `browser/updateProfile.js` | Update bio, name, location, website |
| Profile Scraping | `src/profileManager.js` | Scrape profile data for any user |
| Share Profile | `browser/qrCodeSharing.js` | Full QR code sharing module |

---

<footer>
Built with XActions by <a href="https://x.com/nichxbt">@nichxbt</a> · <a href="https://xactions.app">xactions.app</a> · <a href="https://github.com/nichxbt/xactions">GitHub</a>
</footer>
