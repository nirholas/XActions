---
name: media-studio
description: Navigate and automate X Media Studio — upload media, manage your media library, view media analytics, configure monetization, and add video captions. Use when users want to manage their uploaded media or access creator video tools on X.
license: Apache-2.0
metadata:
  author: nichxbt
  version: "1.0"
---

# Media Studio

Browser console scripts for X's Media Studio (`studio.x.com`).

## Script Selection

| Goal | File | Navigate to |
|------|------|-------------|
| Navigate to Media Studio, upload, manage library | `src/mediaStudio.js` | `x.com` or `studio.x.com` |
| Add or manage video captions | `src/videoCaptions.js` | `studio.x.com` or tweet with video |

## Quick Start

1. Go to `x.com` or `studio.x.com`
2. Open DevTools (F12) → Console
3. Paste `src/mediaStudio.js` → Enter

## mediaStudio.js — Available Functions

```js
XActions.mediaStudio.navigate()          // Navigate to studio.x.com
XActions.mediaStudio.listMedia()         // List all uploaded media (up to maxMediaToScan)
XActions.mediaStudio.uploadMedia(file)   // Upload a media file
XActions.mediaStudio.viewAnalytics()     // View media analytics (views, engagement)
XActions.mediaStudio.monetizationSettings() // Open monetization config
XActions.mediaStudio.liveStream()        // Open live streaming management
```

## videoCaptions.js — Available Functions

```js
XActions.captions.addToCurrentVideo()    // Add captions to video on current page
XActions.captions.upload('file.srt')     // Upload an SRT caption file
XActions.captions.generate()             // Trigger auto-caption generation (Premium)
XActions.captions.download()             // Download existing captions
XActions.captions.remove()               // Remove captions from a video
```

## Configuration (`mediaStudio.js`)

```js
const CONFIG = {
  delayBetweenActions: 2000,  // ms between UI actions
  scrollDelay: 2000,           // ms between scroll actions
  maxMediaToScan: 100,         // Max items to load in library
  maxRetries: 5,               // Retries on selector miss
};
```

## Notes

- Media Studio requires X Premium / Creator subscription for some features
- Auto-caption generation is a Premium feature
- Manual SRT upload is available to all users on tweet pages
- Analytics in Media Studio are more detailed than tweet-level analytics

## Related Skills

- **video-downloading** — Download videos from tweets
- **content-posting** — Post tweets with media attachments
- **creator-monetization** — Monetize your content and videos
- **analytics-insights** — Analyze tweet and content performance
