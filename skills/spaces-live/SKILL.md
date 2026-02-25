---
name: spaces-live
description: Interacts with X/Twitter Spaces (live audio) including joining rooms, scraping metadata, discovering live or scheduled Spaces, and managing Space participation. Use when finding Spaces, scraping Space data, or interacting with live audio features on X.
license: MIT
metadata:
  author: nichxbt
  version: "4.0"
---

# Spaces & Live Audio

Browser console scripts for interacting with X/Twitter Spaces.

## Script Selection

| Script | File | Purpose |
|--------|------|---------|
| Spaces Manager | `src/spacesManager.js` | Join, manage, and interact with Spaces |
| Scrape Spaces | `src/scrapeSpaces.js` | Find and collect Space metadata from search |

## Spaces Manager

**File:** `src/spacesManager.js`

Manages interactions with X Spaces: join, leave, request to speak, and get live Space data.

### How to Use
1. Navigate to a Space or `x.com/i/spaces`
2. Open DevTools (F12) -> Console
3. Paste the script -> Enter

## Scrape Spaces

**File:** `src/scrapeSpaces.js`

Finds X Spaces from search results or timelines. Identifies live, scheduled, and ended Spaces with metadata.

### How to Use
1. Search for Spaces: `x.com/search?q=your-topic&f=live` or any timeline
2. Open DevTools (F12) -> Console
3. Paste the script -> Enter

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

## DOM Selectors

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

## Strategy Guide

### Using Spaces for growth
1. Use `src/scrapeSpaces.js` to find active Spaces in your niche
2. Join as a listener -- consistent presence builds recognition
3. Request to speak when topic aligns with your expertise
4. Follow hosts and frequent speakers afterward
5. Post about key takeaways after each Space (content repurposing)

### Discovering niche Spaces
1. Search `x.com/search?q=your-topic&f=live` for live Spaces
2. Follow accounts that regularly host Spaces in your niche
3. Set up `src/keywordMonitor.js` with Space-related keywords
4. Check `/i/spaces` for recommended Spaces in your interests

### Hosting workflow
1. Schedule a Space from the compose button
2. Promote it with a tweet thread 24h before
3. Use `src/scrapeSpaces.js` to record participant metadata
4. After the Space, engage with attendees using `src/engagementBooster.js`

## Notes
- Scraping captures metadata only (not audio content)
- Spaces can be live, scheduled, or ended -- all three states are detected
- Recording availability depends on host settings
- Space links: `x.com/i/spaces/{spaceId}`
- Live Spaces filter: append `&f=live` to search URL
- Hosting requires 600+ followers (X restriction)
