---
name: spaces-live
description: Interacts with X/Twitter Spaces (live audio) including joining, scraping metadata, and managing live audio rooms. Use when users want to find Spaces, scrape Space data, or interact with live audio features.
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

Manages interactions with X Spaces: join, leave, request to speak.

### How to use

1. Navigate to a Space or `x.com/i/spaces`
2. Open DevTools (F12) → Console
3. Paste the script → Enter

## Scrape Spaces

**File:** `src/scrapeSpaces.js`

Finds X Spaces from search results or timelines. Identifies live, scheduled, and ended Spaces.

### How to use

1. Search for Spaces or navigate to a timeline with Spaces
2. Paste in DevTools console → Enter

### Output

- Live/scheduled/ended counts per Space
- Host and title for each Space
- Direct links to join
- JSON export

### Key Selectors

| Element | Selector |
|---------|----------|
| Start Space | `[data-testid="SpaceButton"]` |
| Join Space | `[data-testid="joinSpace"]` |
| Speaker list | `[data-testid="spaceSpeakers"]` |
| Listener count | `[data-testid="spaceListeners"]` |
| Recording | `[data-testid="spaceRecording"]` |
| Schedule | `[data-testid="scheduleSpace"]` |

## Notes

- Scraping captures metadata only (not audio content)
- Spaces can be live, scheduled, or ended
- Recording availability depends on host settings
