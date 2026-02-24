# 🎙️ Spaces & Live Audio

Scrape, monitor, and interact with X/Twitter Spaces and live audio events.

## 📋 What It Does

1. Scrapes live and scheduled Spaces
2. Extracts speaker lists and metadata
3. Monitors Space events and topics
4. Exports Space data to JSON

## 🌐 Browser Console Script

```javascript
// Go to: x.com/i/spaces or any Space page
// Paste scripts/scrapeSpaces.js
```

### Quick Spaces Listing

```javascript
(() => {
  const spaces = [];
  document.querySelectorAll('[data-testid="SpaceCard"], a[href*="/spaces/"]').forEach(card => {
    spaces.push({
      title: card.textContent?.trim()?.substring(0, 80) || '',
      link: card.href || card.querySelector('a')?.href || '',
    });
  });
  console.table(spaces);
})();
```

## 📦 Node.js Module

```javascript
import { getLiveSpaces, getScheduledSpaces, scrapeSpace } from 'xactions';

// Get live Spaces
const live = await getLiveSpaces(page, { topic: 'crypto' });

// Get scheduled Spaces
const upcoming = await getScheduledSpaces(page);

// Scrape a specific Space
const data = await scrapeSpace(page, 'https://x.com/i/spaces/1abc...');
```

## 🔧 MCP Server

```
Tool: x_get_spaces
Input: { "filter": "live", "topic": "technology" }

Tool: x_scrape_space
Input: { "url": "https://x.com/i/spaces/1abc..." }
```

## 🎵 Spaces Features

| Feature | Description | Status |
|---------|-------------|--------|
| Listen to Spaces | Passive listening | ✅ Free |
| Host Spaces | Create live audio rooms | ✅ Free |
| Schedule Spaces | Plan upcoming sessions | ✅ Free |
| Speaker requests | Raise hand to speak | ✅ |
| Recording | Playback after Space ends | ✅ Premium |
| Captions | Auto-generated subtitles | ✅ |
| Clips | Short highlights from Spaces | 2025+ |
| Live streaming | Video broadcasting | 2025+ |
| Events | Ticketed virtual events | 2026 |
| Circles | Private broadcast groups | 2026 |

## ⚠️ Notes

- Spaces require the mobile app or desktop browser
- Recordings are available for 30 days after the Space ends
- Hosts can have up to 13 speakers at once
- Live streaming was expanded to more users in 2025
- Circles (2026) allow broadcasting to private groups
