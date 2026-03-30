---
title: "Access Media Studio — Tutorial"
description: "Navigate to Media Studio, browse your media library, upload media, and view media analytics on X/Twitter using XActions."
keywords: ["x media studio", "twitter media library", "media studio analytics", "upload media twitter", "xactions media studio"]
canonical: "https://xactions.app/examples/media-studio"
author: "nich (@nichxbt)"
date: "2026-03-30"
---

# Access Media Studio — Tutorial

> Step-by-step guide to accessing Media Studio, managing your media library, uploading content, and viewing analytics.

**Works on:** Browser Console
**Difficulty:** Beginner
**Time:** 5-10 minutes
**Requirements:** Logged into x.com, X Premium (Premium or Premium+ tier)

---

## Prerequisites

- Logged into x.com in your browser
- Browser DevTools console (F12 or Cmd+Option+J on Mac)
- X Premium subscription (Premium or Premium+ tier for full access)

---

## Quick Start

1. Go to any page on x.com
2. Open DevTools Console (F12, then click the **Console** tab)
3. Paste the script to navigate to Media Studio
4. The script opens `studio.x.com` in a new tab
5. Re-run the script on `studio.x.com` to scan your library

---

## Configuration

```javascript
const CONFIG = {
  autoNavigate: true,        // Navigate to Media Studio automatically
  scanLibrary: true,         // Scan and list media in library
  showAnalytics: true,       // Show media analytics summary
  maxMediaToScan: 50,        // Max media items to scan
  scrollDelay: 2000,         // ms between scroll actions
  delayBetweenActions: 1500, // ms between UI actions
};
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `autoNavigate` | boolean | `true` | Auto-open Media Studio |
| `scanLibrary` | boolean | `true` | Scan and list uploaded media |
| `showAnalytics` | boolean | `true` | Show analytics summary |
| `maxMediaToScan` | number | `50` | Maximum media items to collect |
| `scrollDelay` | number | `2000` | Delay between scroll actions |

---

## Step-by-Step Guide

### Step 1: Navigate to Media Studio

```javascript
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  console.log('🎬 MEDIA STUDIO - XActions by nichxbt\n');

  // Show upload instructions
  console.log('══════════════════════════════════════════════════');
  console.log('📤 MEDIA STUDIO INFO');
  console.log('══════════════════════════════════════════════════');
  console.log('');
  console.log('   📏 Supported formats:');
  console.log('      Images: JPG, PNG, GIF (up to 5MB)');
  console.log('      Videos: MP4, MOV (up to 2h with Premium)');
  console.log('      GIFs:   Up to 15MB');
  console.log('');
  console.log('   💡 Features:');
  console.log('      • Media library management');
  console.log('      • Upload and organize content');
  console.log('      • Title, description, and tag editing');
  console.log('      • Scheduling and visibility controls');
  console.log('      • Analytics per media item');
  console.log('══════════════════════════════════════════════════\n');

  // Check if already on studio
  const isStudio = window.location.hostname.includes('studio.x.com');

  if (isStudio) {
    console.log('✅ You are on Media Studio.');
    console.log('💡 Run the library scan script below to list your media.');
  } else {
    console.log('🚀 Opening Media Studio in a new tab...');
    console.log('💡 Media Studio requires Premium (Premium or Premium+ tier).');
    window.open('https://studio.x.com', '_blank');
    console.log('✅ Opened studio.x.com');
    console.log('💡 Run this script again on studio.x.com to scan your library.');
  }
})();
```

### Step 2: Scan Your Media Library (Run on studio.x.com)

After navigating to `studio.x.com`, paste this script:

```javascript
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const maxMedia = 50;

  console.log('📚 SCAN MEDIA LIBRARY - XActions by nichxbt\n');

  const mediaItems = [];
  let previousCount = 0;
  let retries = 0;

  while (retries < 5 && mediaItems.length < maxMedia) {
    const items = document.querySelectorAll(
      '[data-testid="mediaItem"], [data-testid="mediaCard"], [role="gridcell"], .media-item, tr[data-media-id]'
    );

    items.forEach(item => {
      const title = item.getAttribute('aria-label')
        || item.querySelector('span, p')?.textContent?.trim()
        || 'Untitled';
      const img = item.querySelector('img');
      const video = item.querySelector('video');
      const type = video ? 'video' : img ? 'image' : 'unknown';
      const src = img?.src || video?.src || '';
      const id = item.getAttribute('data-media-id') || src || title;

      if (!mediaItems.find(m => m.id === id)) {
        mediaItems.push({
          id,
          title: title.substring(0, 60),
          type,
          src: src.substring(0, 100),
        });
      }
    });

    if (mediaItems.length === previousCount) {
      retries++;
    } else {
      retries = 0;
      previousCount = mediaItems.length;
    }

    console.log(`   🔄 Found ${mediaItems.length} media items...`);
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(2000);
  }

  if (mediaItems.length > 0) {
    const images = mediaItems.filter(m => m.type === 'image');
    const videos = mediaItems.filter(m => m.type === 'video');

    console.log(`\n📋 Media Library (${mediaItems.length} items):`);
    console.log('─'.repeat(50));
    console.log(`   🖼️  Images: ${images.length}`);
    console.log(`   🎥 Videos: ${videos.length}`);

    console.log('\n📝 Recent items:');
    mediaItems.slice(0, 10).forEach((item, i) => {
      const icon = item.type === 'video' ? '🎥' : '🖼️';
      console.log(`   ${i + 1}. ${icon} ${item.title}`);
    });

    // Save to sessionStorage
    sessionStorage.setItem('xactions_media_studio', JSON.stringify({
      scannedAt: new Date().toISOString(),
      count: mediaItems.length,
      items: mediaItems,
    }));
    console.log('\n💾 Media list saved to sessionStorage.');
  } else {
    console.log('ℹ️ No media items found. Library may be empty or the page layout differs.');
  }
})();
```

### Step 3: View Media Analytics (Run on studio.x.com)

```javascript
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  console.log('📊 MEDIA ANALYTICS - XActions by nichxbt\n');

  // Try to find and click analytics tab
  const analyticsTab = document.querySelector('[data-testid="analyticsTab"]')
    || document.querySelector('a[href*="analytics"]')
    || document.querySelector('button[aria-label*="Analytics"]');

  if (analyticsTab) {
    analyticsTab.click();
    await sleep(1500);
    console.log('✅ Opened analytics tab.');

    const statsElements = document.querySelectorAll('[data-testid*="stat"], .analytics-metric, .stat-value');
    if (statsElements.length > 0) {
      console.log('\n📊 Media Analytics:');
      console.log('─'.repeat(40));
      statsElements.forEach(el => {
        const label = el.getAttribute('aria-label') || el.previousElementSibling?.textContent || '';
        const value = el.textContent.trim();
        if (value) console.log(`   ${label}: ${value}`);
      });
    } else {
      console.log('ℹ️ Analytics data not found in expected format.');
    }
  } else {
    console.log('ℹ️ Analytics tab not found.');
    console.log('💡 Check analytics directly at: studio.x.com/analytics');
  }
})();
```

### Expected Console Output (Library Scan)

```
📚 SCAN MEDIA LIBRARY - XActions by nichxbt

   🔄 Found 12 media items...
   🔄 Found 24 media items...
   🔄 Found 35 media items...
   🔄 Found 35 media items...

📋 Media Library (35 items):
──────────────────────────────────────────────────
   🖼️  Images: 22
   🎥 Videos: 13

📝 Recent items:
   1. 🖼️ Product screenshot 2026-03-28
   2. 🎥 Tutorial walkthrough v2
   3. 🖼️ Infographic - engagement tips
   4. 🖼️ Banner design final
   5. 🎥 Feature demo - auto unfollow
   6. 🖼️ Logo variations
   7. 🎥 Announcement video
   8. 🖼️ Meme template
   9. 🖼️ Chart - follower growth
   10. 🎥 Behind the scenes

💾 Media list saved to sessionStorage.
```

---

## Tips & Tricks

1. **Separate domain** -- Media Studio runs on `studio.x.com`, not `x.com`. Scripts need to be run on the correct domain.

2. **Premium required** -- Full Media Studio access requires Premium ($8/mo) or Premium+ ($16/mo). Basic tier has limited access.

3. **Video length by tier** -- Free accounts can upload 140s videos. Premium allows up to 60 minutes. Premium+ allows up to 3 hours.

4. **Organize with tags** -- Use the Media Studio interface to add tags and descriptions to your media for easier searching later.

5. **Scheduling** -- Media Studio supports scheduling media posts. Upload content and set a publish time directly from the studio interface.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Media Studio requires Premium" | Subscribe to Premium ($8/mo) or Premium+ ($16/mo) for full access. |
| No media items found | Your library may be empty. Upload media through Media Studio or by posting on X. |
| Script not working on studio.x.com | The page layout may differ. Run the script after the page fully loads. |
| Analytics tab not found | Navigate to `studio.x.com/analytics` directly. |

---

## Related Scripts

| Feature | Script | Description |
|---------|--------|-------------|
| View Analytics | `src/viewAnalytics.js` | View post and account analytics |
| Creator Revenue | `src/creatorSubscriptions.js` | Monetization and revenue settings |
| X Pro | `src/xPro.js` | Multi-column TweetDeck interface |
| Video Downloader | `scripts/videoDownloader.js` | Download videos from X |

---

<footer>
Built with XActions by <a href="https://x.com/nichxbt">@nichxbt</a> · <a href="https://xactions.app">xactions.app</a> · <a href="https://github.com/nichxbt/xactions">GitHub</a>
</footer>
