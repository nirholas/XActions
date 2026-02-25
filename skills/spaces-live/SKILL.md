---
name: spaces-live
description: Interacts with X/Twitter Spaces (live audio) including joining rooms, scraping metadata, and discovering live or scheduled Spaces. The agent uses this skill when a user wants to find Spaces, scrape Space data, or interact with live audio features on X.
license: MIT
metadata:
  author: nichxbt
  version: "3.0"
---

# Spaces & Live Audio

Browser console scripts for interacting with X/Twitter Spaces.

## Available Scripts

| Script | File | Purpose |
|--------|------|---------|
| Spaces Manager | `src/spacesManager.js` | Join, manage, and interact with Spaces |
| Scrape Spaces | `src/scrapeSpaces.js` | Find and collect Space metadata from search |

## Spaces Manager

**File:** `src/spacesManager.js`

Manages interactions with X Spaces: join, leave, request to speak, and get live Space data.

### How to use

1. Navigate to a Space or `x.com/i/spaces`
2. Open DevTools (F12) → Console
3. Paste the script → Enter

## Scrape Spaces

**File:** `src/scrapeSpaces.js`

Finds X Spaces from search results or timelines. Identifies live, scheduled, and ended Spaces with metadata.

### How to use

1. Search for Spaces: `x.com/search?q=your-topic&f=live` or any timeline
2. Open DevTools (F12) → Console
3. Paste the script → Enter

### Configuration

```javascript
const CONFIG = {
  maxSpaces: 50,
  scrollDelay: 2000,
  maxScrollAttempts: 20,
  exportResults: true,
};
```

### Output

- Live, scheduled, and ended Space counts
- Host and title for each Space
- Direct links to join
- JSON export of all collected metadata

### Key Selectors

| Element | Selector |
|---------|----------|
| Start Space | `[data-testid="SpaceButton"]` |
| Join Space | `[data-testid="joinSpace"]` |
| Speaker list | `[data-testid="spaceSpeakers"]` |
| Listener count | `[data-testid="spaceListeners"]` |
| Recording | `[data-testid="spaceRecording"]` |
| Schedule | `[data-testid="scheduleSpace"]` |
| Space title | `[data-testid="spaceTitle"]` |
| Space topic | `[data-testid="spaceTopic"]` |

## Notes

- Scraping captures metadata only (not audio content)
- Spaces can be live, scheduled, or ended — all three states are detected
- Recording availability depends on host settings
- Space links follow the pattern `x.com/i/spaces/{spaceId}`
- Use delays between scrolls to avoid rate limits
