---
name: spaces-live
description: Manage X/Twitter Spaces (live audio/video), live streams, events, and Circles. Includes hosting, joining, recording, Q&As, and private sharing features.
license: MIT
metadata:
  author: nichxbt
  version: "3.0"
---

# Spaces, Live & Events with XActions

Manage live audio/video features on X/Twitter.

## Features

### Spaces
- **Host**: Create live audio/video rooms
- **Join**: Participate in live Spaces
- **Schedule**: Plan Spaces in advance
- **Record**: Record Spaces for replay
- **Q&A**: Interactive question and answer sessions
- **Speakers**: Manage speakers and listeners
- **Captions**: Live captions for accessibility
- **Clips**: Create short clips from Spaces

### Live Streams
- **Video Broadcasts**: Stream live video
- **Periscope Integration**: Legacy live streaming
- **Multi-host**: Co-hosting live streams

### Events
- **Create**: Set up event pages
- **Promote**: Share events with followers
- **RSVP**: Track attendance and interest
- **Reminders**: Automated event reminders

### Circles
- **Private Sharing**: Share with up to 150 selected followers
- **Close Friends**: Curated audience for personal content

## Browser Console Script

**File:** `scripts/scrapeSpaces.js`

### How to use

1. Navigate to a Space or `x.com/i/spaces`
2. Open DevTools (F12) → Console
3. Paste the script → Enter

### Key selectors

| Element | Selector |
|---------|----------|
| Spaces nav | `a[href*="/spaces"]` |
| Start Space | `[data-testid="SpaceButton"]` |
| Join Space | `[data-testid="joinSpace"]` |
| Speaker list | `[data-testid="spaceSpeakers"]` |
| Listener count | `[data-testid="spaceListeners"]` |
| Recording | `[data-testid="spaceRecording"]` |
| Schedule | `[data-testid="scheduleSpace"]` |

## MCP Tools

- `x_create_space` – Start a new Space
- `x_get_spaces` – Get live/scheduled Spaces
- `x_join_space` – Join a Space
- `x_schedule_space` – Schedule a Space
- `x_scrape_space` – Scrape Space metadata
- `x_create_event` – Create an event

## API Endpoints

- `POST /api/spaces/create` – Create a Space
- `GET /api/spaces/live` – Get live Spaces
- `GET /api/spaces/scheduled` – Get scheduled Spaces
- `POST /api/spaces/schedule` – Schedule a Space
- `GET /api/spaces/:id` – Space details
- `POST /api/events/create` – Create event
- `GET /api/events` – List events

## Related Files

- `src/spacesManager.js` – Core Spaces module
- `scripts/scrapeSpaces.js` – Browser Spaces scraper

## Notes

- Spaces support up to thousands of listeners
- Recording depends on host settings
- Events integrate with Spaces for live sessions
- Circles limited to 150 followers
- Scheduled Spaces send reminders to followers
