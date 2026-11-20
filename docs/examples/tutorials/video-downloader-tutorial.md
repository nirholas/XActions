---
title: "Download X (Twitter) Videos Free — No App Needed 2026"
description: "Download any video from X/Twitter to your device in seconds. Free browser script — no app, no API, no watermark. All qualities available."
keywords: ["download twitter video", "twitter video downloader free", "download X video 2026", "save twitter video to phone", "twitter video download no app", "how to download videos from X", "twitter video saver free no watermark", "download video from tweet", "X twitter video download script", "xactions video downloader"]
canonical: "https://xactions.app/examples/video-downloader"
author: "nich (@nichxbt)"
date: "2026-02-24"
---

# 🎬 Download Videos from X (Twitter) — Free, No App, No Watermark

> **Download any video from X/Twitter straight to your device with one script — free, no sign-up, no third-party app, no watermark.** Picks the highest quality automatically.

**Works on:** 🌐 Browser Console · 💻 CLI · 🤖 MCP (AI Agents)
**Difficulty:** 🟢 Beginner
**Time:** ⏱️ Under 1 minute
**Requirements:** A web browser (Chrome, Firefox, Edge, Safari)

> 📖 For the quick-reference version, see [video-downloader.md](../video-downloader.md)

---

## 🎯 Real-World Scenario

You're scrolling X and hit a viral 2-minute clip — a perfect demo of a coding technique, a hilarious skit, a breaking news moment. You want to save it locally so you can share it on Slack, embed it in a presentation, or just watch it offline. But X doesn't have a "Download" button. Third-party sites want you to paste URLs, watch ads, and download mystery files with watermarks.

XActions finds every quality variant of the video embedded in the tweet's page data, picks the highest resolution, and downloads it as a clean MP4 — directly from Twitter's own CDN. No middleman, no watermark, no ads.

**Before XActions:**

```
┌─────────────────────────────────────────────────────┐
│  You: "How do I download this video?"               │
├─────────────────────────────────────────────────────┤
│  Option 1: Third-party sites                        │
│    → Paste URL → Wait → Ads → Captcha → Low quality│
│    → Watermark: "Downloaded with SketchySite.io"    │
│                                                     │
│  Option 2: Screen recording                         │
│    → Lose quality → Capture UI → Bad audio sync     │
│                                                     │
│  Option 3: Twitter API ($100/month)                 │
│    → Apply for developer access → Wait 3 days       │
│    → Parse JSON responses → Still no direct link    │
└─────────────────────────────────────────────────────┘
```

**After XActions:**

```
┌─────────────────────────────────────────────────────┐
│  You: F12 → Paste → Enter                           │
├─────────────────────────────────────────────────────┤
│  📹 FOUND 3 VIDEO(S)                                │
│                                                     │
│  1. [1280x720] MP4  ← highest                      │
│  2. [640x360]  MP4                                  │
│  3. [480x270]  MP4                                  │
│                                                     │
│  ✅ Download started! → nichxbt_1893847265.mp4      │
│  📋 URL copied to clipboard                         │
│  ⏱️  Total time: 3 seconds                          │
│  💰 Cost: $0                                        │
└─────────────────────────────────────────────────────┘
```

---

## 📋 What This Does (Step by Step)

1. 🔍 **Reads the tweet page's DOM and source data** — scans `<video>` elements, page HTML, and framework data
2. 🎣 **Extracts all `video.twimg.com` URLs** — finds every quality variant Twitter has for this video
3. 📡 **Sets up a network interceptor** — catches any video URLs loaded via `fetch` or `XMLHttpRequest` (for second-run reliability)
4. 📊 **Sorts by resolution** — parses `1280x720`, `640x360`, etc. from the URL paths
5. 🏆 **Picks the best quality** — auto-selects the highest resolution MP4
6. ⬇️ **Downloads the file** — fetches the blob and triggers a browser download (or opens in new tab if CORS-blocked)
7. 📋 **Copies URL to clipboard** — so you can paste it elsewhere

```
┌───────────────────────────────────────────────────────────────┐
│                                                               │
│  [Open tweet with video]                                      │
│          │                                                    │
│          ▼                                                    │
│  [Click PLAY on the video]                                    │
│          │                                                    │
│          ▼                                                    │
│  [Paste script in console]                                    │
│          │                                                    │
│          ▼                                                    │
│  [Scan page for video.twimg.com URLs]                         │
│          │                                                    │
│    ┌─────┼─────────┬──────────────┐                           │
│    ▼     ▼         ▼              ▼                           │
│  <video> Page     Network       Framework                     │
│  elements source  intercepts    data                          │
│    │     │         │              │                           │
│    └─────┴─────────┴──────────────┘                           │
│          │                                                    │
│          ▼                                                    │
│  [Deduplicate & sort by resolution]                           │
│          │                                                    │
│          ▼                                                    │
│  [Display all qualities + auto-download best]                 │
│          │                                                    │
│          ▼                                                    │
│  [Copy URL to clipboard + save as filename.mp4]               │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

## 🌐 Method 1: Browser Console (Copy-Paste)

**Best for:** Everyone — no installs, no sign-ups, works in 3 seconds.

### Prerequisites

- [x] Any modern web browser (Chrome, Firefox, Edge, Safari)
- [x] The tweet must contain a native X/Twitter video (not a YouTube embed)

### Step 1: Open the tweet with the video

> Go to the tweet containing the video you want to download. The URL should look like
> **`x.com/username/status/1234567890`**

```
┌──────────────────────────────────────────────────────────┐
│ 🔍 x.com/nichxbt/status/1893847265192837465              │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  👤 nich @nichxbt · 2h                                   │
│  Just shipped the new XActions dashboard 🚀              │
│                                                          │
│  ┌──────────────────────────────────────────────┐        │
│  │                                              │        │
│  │          ▶ [VIDEO — 1:42]                    │        │
│  │           Click play first!                  │        │
│  │                                              │        │
│  └──────────────────────────────────────────────┘        │
│                                                          │
│  ♡ 247   🔁 89   💬 34                                   │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Step 2: Click PLAY on the video

> **Important:** The video must start playing at least once — this loads the video URL into the page data so the script can find it.

### Step 3: Open Developer Console

| OS | Shortcut |
|----|----------|
| **Windows / Linux** | `F12` then **Console** tab, or `Ctrl + Shift + J` |
| **Mac** | `Cmd + Option + J` |

### Step 4: Paste and Run

```javascript
// ============================================
// XActions - X/Twitter Video Downloader
// by nichxbt — https://xactions.app
// Go to a tweet with a video, click play, then paste this
// ============================================

(() => {
  const CONFIG = {
    QUALITY: 'highest',      // 'highest', 'lowest', 'all'
    AUTO_DOWNLOAD: true,     // Auto-download best quality
    SHOW_ALL_QUALITIES: true // Show all available qualities
  };

  const getTweetId = () => {
    const match = window.location.href.match(/status\/(\d+)/);
    return match ? match[1] : null;
  };

  const getAuthor = () => {
    const match = window.location.href.match(/x\.com\/(\w+)/);
    return match ? match[1] : 'unknown';
  };

  // Method 1: Direct <video> elements
  const findVideoInReactState = () => {
    const videos = [];
    document.querySelectorAll('video').forEach(video => {
      if (video.src && !video.src.startsWith('blob:')) {
        videos.push({ url: video.src, quality: 'direct', type: 'mp4' });
      }
      video.querySelectorAll('source').forEach(source => {
        if (source.src && !source.src.startsWith('blob:')) {
          videos.push({ url: source.src, quality: 'source', type: 'mp4' });
        }
      });
    });
    return videos;
  };

  // Method 2: Scan page HTML for video.twimg.com URLs
  const findVideoInPageData = () => {
    const videos = [];
    const pageContent = document.documentElement.innerHTML;
    const patterns = [
      /https:\/\/video\.twimg\.com\/[^"'\s]+\.mp4[^"'\s]*/g,
      /https:\/\/video\.twimg\.com\/[^"'\s]+\.m3u8[^"'\s]*/g,
      /https:\/\/pbs\.twimg\.com\/[^"'\s]+\.mp4[^"'\s]*/g,
      /https:\/\/[^"'\s]*\/amplify_video[^"'\s]*\.mp4[^"'\s]*/g,
      /https:\/\/[^"'\s]*\/ext_tw_video[^"'\s]*\.mp4[^"'\s]*/g,
    ];
    patterns.forEach(pattern => {
      const matches = pageContent.match(pattern) || [];
      matches.forEach(url => {
        let cleanUrl = url.replace(/\\u002F/g, '/').replace(/\\/g, '');
        cleanUrl = cleanUrl.split('"')[0].split("'")[0].split(' ')[0];
        if (cleanUrl.includes('.mp4')) {
          const qualityMatch = cleanUrl.match(/\/(\d+x\d+)\//);
          const quality = qualityMatch ? qualityMatch[1] : 'unknown';
          videos.push({ url: cleanUrl, quality, type: 'mp4' });
        }
      });
    });
    // Deduplicate
    const unique = [];
    const seen = new Set();
    videos.forEach(v => {
      const key = v.url.split('?')[0];
      if (!seen.has(key)) { seen.add(key); unique.push(v); }
    });
    return unique;
  };

  // Method 3: Network intercepts
  const findVideoInNetwork = () => window.__XACTIONS_VIDEO_URLS || [];

  // Method 4: Framework data
  const findVideoInNextData = () => {
    const videos = [];
    if (window.__NEXT_DATA__) {
      const dataStr = JSON.stringify(window.__NEXT_DATA__);
      const mp4Matches = dataStr.match(/https:[^"]*\.mp4[^"]*/g) || [];
      mp4Matches.forEach(url => {
        videos.push({ url: url.replace(/\\/g, ''), quality: 'next_data', type: 'mp4' });
      });
    }
    return videos;
  };

  // Set up network interceptor for future runs
  const setupInterceptor = () => {
    if (window.__XACTIONS_INTERCEPTOR_ACTIVE) return;
    window.__XACTIONS_VIDEO_URLS = window.__XACTIONS_VIDEO_URLS || [];
    const origFetch = window.fetch;
    window.fetch = async (...args) => {
      const url = args[0]?.toString?.() || args[0]?.url || args[0];
      if (url && (url.includes('.mp4') || url.includes('.m3u8') || url.includes('video.twimg'))) {
        window.__XACTIONS_VIDEO_URLS.push({ url, quality: 'intercepted', type: url.includes('.m3u8') ? 'm3u8' : 'mp4', time: Date.now() });
      }
      return origFetch(...args);
    };
    const origXHR = window.XMLHttpRequest.prototype.open;
    window.XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      if (url && (url.includes('.mp4') || url.includes('.m3u8') || url.includes('video.twimg'))) {
        window.__XACTIONS_VIDEO_URLS.push({ url, quality: 'xhr', type: url.includes('.m3u8') ? 'm3u8' : 'mp4', time: Date.now() });
      }
      return origXHR.call(this, method, url, ...rest);
    };
    window.__XACTIONS_INTERCEPTOR_ACTIVE = true;
  };

  const sortByQuality = (videos) =>
    videos.sort((a, b) => {
      const getRes = (v) => { const m = v.quality?.match(/(\d+)x(\d+)/); return m ? parseInt(m[1]) * parseInt(m[2]) : 0; };
      return getRes(b) - getRes(a);
    });

  const downloadVideo = async (url, filename) => {
    try {
      const response = await fetch(url, { mode: 'cors' });
      if (response.ok) {
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        console.log('✅ Download started!');
        return true;
      }
    } catch (e) {
      console.log('⚠️ CORS blocked — opening in new tab...');
    }
    window.open(url, '_blank');
    console.log('📺 Opened in new tab — right-click → Save Video As');
    return true;
  };

  // Main
  const run = async () => {
    console.clear();
    console.log('🎬 XActions — X/Twitter Video Downloader');
    console.log('════════════════════════════════════════════════');

    const tweetId = getTweetId();
    const author = getAuthor();

    if (!tweetId) {
      console.error('❌ Navigate to a tweet page first!');
      console.log('   Example: x.com/user/status/123456789');
      return;
    }

    console.log(`📍 Tweet: @${author}/status/${tweetId}`);
    console.log('');

    setupInterceptor();

    console.log('🔍 Searching for video URLs...');
    let allVideos = [];

    const reactVids = findVideoInReactState();
    if (reactVids.length) { console.log(`   ✓ ${reactVids.length} in video elements`); allVideos.push(...reactVids); }

    const pageVids = findVideoInPageData();
    if (pageVids.length) { console.log(`   ✓ ${pageVids.length} in page data`); allVideos.push(...pageVids); }

    const netVids = findVideoInNetwork();
    if (netVids.length) { console.log(`   ✓ ${netVids.length} from network`); allVideos.push(...netVids); }

    const nextVids = findVideoInNextData();
    if (nextVids.length) { console.log(`   ✓ ${nextVids.length} in framework data`); allVideos.push(...nextVids); }

    // Deduplicate
    const seen = new Set();
    allVideos = allVideos.filter(v => { const k = v.url.split('?')[0]; if (seen.has(k)) return false; seen.add(k); return true; });
    allVideos = sortByQuality(allVideos);

    if (allVideos.length === 0) {
      console.log('');
      console.log('❌ No video URLs found.');
      console.log('');
      console.log('💡 Fix:');
      console.log('   1. Make sure the tweet has a native video (not YouTube)');
      console.log('   2. Click PLAY on the video');
      console.log('   3. Run this script again — the interceptor is now active');
      return;
    }

    console.log('');
    console.log('════════════════════════════════════════════════');
    console.log(`📹 FOUND ${allVideos.length} VIDEO(S)`);
    console.log('════════════════════════════════════════════════');

    if (CONFIG.SHOW_ALL_QUALITIES) {
      console.log('');
      allVideos.forEach((v, i) => {
        console.log(`${i + 1}. [${v.quality}] ${v.type.toUpperCase()}  ${v.url.slice(0, 60)}...`);
      });
    }

    const best = allVideos[0];
    console.log('');
    console.log('🏆 BEST QUALITY:');
    console.log(`   Resolution: ${best.quality}`);
    console.log(`   Type: ${best.type.toUpperCase()}`);

    try { await navigator.clipboard.writeText(best.url); console.log('   📋 URL copied to clipboard!'); } catch {}

    window.xVideo = { best: best.url, all: allVideos, author, tweetId, tweetUrl: window.location.href };

    console.log('');
    console.log('🔗 Direct URL:');
    console.log(best.url);

    if (CONFIG.AUTO_DOWNLOAD) {
      console.log('');
      await downloadVideo(best.url, `${author}_${tweetId}.mp4`);
    }

    console.log('');
    console.log('════════════════════════════════════════════════');
    console.log('💾 All data: window.xVideo');
    console.log('   window.xVideo.best  → Best quality URL');
    console.log('   window.xVideo.all   → All qualities array');
    console.log('════════════════════════════════════════════════');
  };

  run();
})();
```

### ✅ Expected Console Output

```
🎬 XActions — X/Twitter Video Downloader
════════════════════════════════════════════════
📍 Tweet: @nichxbt/status/1893847265192837465

🔍 Searching for video URLs...
   ✓ 1 in video elements
   ✓ 3 in page data

════════════════════════════════════════════════
📹 FOUND 3 VIDEO(S)
════════════════════════════════════════════════

1. [1280x720] MP4  https://video.twimg.com/ext_tw_video/189384...
2. [640x360]  MP4  https://video.twimg.com/ext_tw_video/189384...
3. [480x270]  MP4  https://video.twimg.com/ext_tw_video/189384...

🏆 BEST QUALITY:
   Resolution: 1280x720
   Type: MP4
   📋 URL copied to clipboard!

🔗 Direct URL:
https://video.twimg.com/ext_tw_video/1893847265/pu/vid/1280x720/abcDEF123.mp4?tag=14

✅ Download started!

════════════════════════════════════════════════
💾 All data: window.xVideo
   window.xVideo.best  → Best quality URL
   window.xVideo.all   → All qualities array
════════════════════════════════════════════════
```

The file `nichxbt_1893847265192837465.mp4` drops into your downloads folder.

---

## 💻 Method 2: CLI (Command Line)

```bash
# Install XActions globally
npm install -g xactions

# Download a video by tweet URL
npx xactions download-video https://x.com/nichxbt/status/1893847265192837465

# Specify output path and quality
npx xactions download-video https://x.com/nichxbt/status/1893847265192837465 \
  --quality highest \
  --output ./videos/my-video.mp4
```

### Example with all options:

```bash
npx xactions download-video "https://x.com/nichxbt/status/1893847265192837465" \
  --quality highest \
  --output ./downloads/ \
  --filename "demo-video.mp4" \
  --show-all-qualities \
  --copy-url
```

### ✅ CLI Output Preview

```
⚡ XActions v5.0.0

🎬 VIDEO DOWNLOADER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Tweet: @nichxbt/status/1893847265192837465

🔍 Finding video URLs...

📹 Available qualities:
   1. 1280x720  MP4   2.4 MB
   2. 640x360   MP4   1.1 MB
   3. 480x270   MP4   0.6 MB

⬇️  Downloading best quality (1280x720)...
   ████████████████████████████ 100% | 2.4 MB

✅ Saved → ./downloads/demo-video.mp4
📋 URL copied to clipboard
```

### CLI Configuration Table

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--quality` | string | `highest` | `highest`, `lowest`, or `all` |
| `--output` | string | `./` | Output directory or file path |
| `--filename` | string | auto | Custom filename (`author_tweetId.mp4` by default) |
| `--show-all-qualities` | boolean | `false` | Display all available resolutions |
| `--copy-url` | boolean | `false` | Copy direct video URL to clipboard |
| `--json` | boolean | `false` | Output video info as JSON |

---

## 🤖 Method 3: MCP Server (AI Agents)

> Use with Claude Desktop, GPT, Cursor, or any MCP-compatible AI agent.

### Setup

```json
{
  "mcpServers": {
    "xactions": {
      "command": "npx",
      "args": ["-y", "xactions", "mcp"]
    }
  }
}
```

### MCP Tool Call

```json
{
  "tool": "x_download_video",
  "arguments": {
    "tweet_url": "https://x.com/nichxbt/status/1893847265192837465",
    "quality": "highest"
  }
}
```

### Claude Desktop example prompt:

> "Download the video from this tweet: x.com/nichxbt/status/1893847265192837465 and save it in the highest quality."

### Expected MCP response:

```json
{
  "status": "complete",
  "tweet": "@nichxbt/status/1893847265192837465",
  "qualities_found": 3,
  "best_quality": "1280x720",
  "file_size": "2.4 MB",
  "download_url": "https://video.twimg.com/ext_tw_video/...",
  "saved_to": "nichxbt_1893847265192837465.mp4"
}
```

---

## 📊 Method Comparison

| Feature | 🌐 Browser Console | 💻 CLI | 🤖 MCP |
|---------|-------------------|--------|---------|
| Setup | None | `npm install` | Config JSON |
| Speed | Instant | Instant | Via AI agent |
| Best for | Grab one video fast | Batch downloads | AI workflows |
| Show all qualities | ✅ | ✅ | ✅ |
| Auto-download | ✅ | ✅ | ✅ |
| Clipboard copy | ✅ | ✅ | ❌ |
| Custom filename | ❌ | ✅ | ✅ |
| Batch mode | ❌ | ✅ | ✅ |
| Works on GIFs | ✅ (they're videos) | ✅ | ✅ |

---

## ⚙️ Configuration Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `QUALITY` | string | `'highest'` | Which quality to auto-download: `'highest'`, `'lowest'`, `'all'` |
| `AUTO_DOWNLOAD` | boolean | `true` | Automatically trigger download of the best quality |
| `SHOW_ALL_QUALITIES` | boolean | `true` | List all available resolutions in console |

---

## 📊 Sample Output / Results

### `window.xVideo` object (available after running the script):

```javascript
// Access in console after running the script
window.xVideo
// =>
{
  best: "https://video.twimg.com/ext_tw_video/189384.../pu/vid/1280x720/abcDEF.mp4?tag=14",
  all: [
    { url: "https://video.twimg.com/.../1280x720/...", quality: "1280x720", type: "mp4" },
    { url: "https://video.twimg.com/.../640x360/...",  quality: "640x360",  type: "mp4" },
    { url: "https://video.twimg.com/.../480x270/...",  quality: "480x270",  type: "mp4" }
  ],
  author: "nichxbt",
  tweetId: "1893847265192837465",
  tweetUrl: "https://x.com/nichxbt/status/1893847265192837465"
}
```

### Downloaded file:

```
nichxbt_1893847265192837465.mp4
├── Format: MP4 (H.264 + AAC)
├── Resolution: 1280×720
├── Duration: 1:42
└── Size: 2.4 MB
```

---

## 💡 Pro Tips

1. **Click PLAY first, then paste** — X lazy-loads video URLs. If the video hasn't played yet, the URL might not be in the page data. Just tap play (even for one second), then paste the script. On second run, the network interceptor catches URLs automatically.

2. **GIFs are actually videos** — X stores animated GIFs as MP4 files internally. This script downloads them as MP4, which is smaller and higher quality than the original GIF format.

3. **Use `window.xVideo.all` to grab a specific quality** — After running the script, open the console and type `window.xVideo.all` to see every available variant. You can manually open any URL in a new tab and right-click → Save.

4. **Bookmark the script** — Create a browser bookmark with `javascript:` followed by the minified script for one-click video downloading on any tweet page (search "bookmarklet" for how-to on your browser).

5. **For CORS-blocked videos, use the new tab workaround** — Some videos open in a new tab instead of auto-downloading. Just right-click the video → "Save Video As…" from the new tab. The URL is also copied to your clipboard.

---

## ⚠️ Important Notes

- **Native X videos only** — Works on videos uploaded directly to X/Twitter. Does *not* work on embedded YouTube, Vimeo, or other external players.
- **No watermark** — Downloads the original file directly from Twitter's CDN (`video.twimg.com`). No third-party branding.
- **Respect copyright** — You're downloading content created by others. Don't re-upload or monetize without permission.
- **CORS may block direct download** — Some browsers block cross-origin downloads. In that case, the script opens the video in a new tab where you can right-click → Save As.
- **Large videos** — Very long videos (10+ minutes) may take a moment to fetch. The download happens entirely in-browser.

---

## 🔧 Troubleshooting

| Problem | Fix |
|---------|-----|
| "No video URLs found" | Click PLAY on the video, then run the script again. The interceptor is now active. |
| Opens in new tab instead of downloading | CORS restriction — right-click the video → "Save Video As…" |
| Only finds low-quality versions | The video may have been uploaded in low quality. Check `window.xVideo.all` for all options. |
| Script doesn't work on a GIF | It should — X GIFs are MP4s. Make sure you're on the tweet page, not the media viewer overlay. |
| "Not a tweet page" error | Navigate to `x.com/user/status/123456`. The script needs `/status/` in the URL. |

---

## 🔗 Related Features

| Feature | Use Case | Link |
|---------|----------|------|
| Media Scraping | Download ALL images/videos from a profile's media tab | [→ Guide](../media-scraping.md) |
| Tweet Scraping | Archive tweets and their media together | [→ Guide](../tweet-scraping.md) |
| Bookmark Exporter | Export bookmarked tweets (including video links) | [→ Guide](../bookmark-exporter.md) |
| Thread Scraping | Save a full thread including embedded videos | [→ Guide](../thread-scraping.md) |

---

## ❓ FAQ

### Q: How do I download a video from Twitter / X for free?
**A:** Go to the tweet with the video, click play on it, open your browser console (F12 → Console), paste the XActions video downloader script, and press Enter. The video downloads as an MP4 in the highest quality available — no app, no API key, no watermark, completely free.

### Q: Can I download Twitter GIFs?
**A:** Yes — X/Twitter stores all "GIFs" as MP4 video files internally. The XActions downloader works on them identically and downloads the MP4 version, which is actually higher quality and smaller in file size than the original GIF.

### Q: What video quality can I get?
**A:** X typically stores videos in 3 qualities: 480p (480×270), 360p (640×360), and 720p (1280×720). The script finds all variants and auto-downloads the highest. Some videos uploaded in 1080p will have a 1920×1080 variant available.

### Q: Does this work on protected/private accounts?
**A:** Only if you can see the video in your browser (i.e., you follow the private account). The script reads what's already loaded on the page — it doesn't bypass any access restrictions.

### Q: Why does the video open in a new tab instead of downloading?
**A:** This is a browser CORS (Cross-Origin Resource Sharing) restriction — some browsers block downloading files from `video.twimg.com` directly. When this happens, the video opens in a new tab. Right-click it → "Save Video As…" to save it to your device.

---

<footer>
Built with ⚡ by <a href="https://x.com/nichxbt">@nichxbt</a> · <a href="https://xactions.app">xactions.app</a> · <a href="https://github.com/nichxbt/xactions">GitHub</a>
</footer>
