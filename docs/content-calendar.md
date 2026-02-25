# 📅 Content Calendar

> Visual drag-and-drop content calendar for planning, scheduling, and managing posts. Competes with **Hypefury**, **Buffer**, and **Hootsuite**.

---

## Overview

The Content Calendar provides a full visual interface for content planning:

- **Month view** — see all scheduled posts at a glance
- **Color-coded events** — tweet (blue), thread (purple), repost (green)
- **Click to create** — click any date to add a post
- **Event management** — edit, reschedule, or delete events
- **LocalStorage persistence** — data saved across browser sessions
- **Quick navigation** — month-by-month with today highlight

Accessible at: **`/calendar`** in the dashboard.

---

## Features

### Create Events

Click any day cell to open the event creator:

| Field | Options |
|---|---|
| Title | Free text — your post content or label |
| Type | `tweet`, `thread`, `repost` |
| Time | HH:MM time picker |

### Visual Indicators

| Color | Type |
|---|---|
| 🔵 Blue | Tweet |
| 🟣 Purple | Thread |
| 🟢 Green | Repost |

### Navigation

- **← →** arrows for previous/next month
- **Today** button jumps to current date
- Current day highlighted with accent ring
- Weekday headers (Mon–Sun)

### Integration with Scheduler

Events created in the calendar can be linked to the cron scheduler:

```javascript
import { getScheduler } from 'xactions/src/scheduler/scheduler.js';

const scheduler = getScheduler();
scheduler.addJob({
  name: 'calendar-post-1',
  cron: '0 14 25 2 *',  // Feb 25 at 2 PM
  command: 'post',
  args: ['My scheduled tweet! 🚀']
});
```

---

## Architecture

```
dashboard/calendar.html → Full-page calendar UI
src/scheduler/
├── scheduler.js        → Backend scheduling engine
└── webhookTrigger.js   → External trigger support
```

### Data Storage

Calendar events are stored in `localStorage` under the key `xactions-calendar-events`:

```json
[
  {
    "id": "evt_1708905600000",
    "title": "Launch announcement thread",
    "type": "thread",
    "date": "2026-02-25",
    "time": "14:00"
  }
]
```

---

## API Integration

The calendar UI connects to the scheduler API for server-side persistence:

```bash
# Create a scheduled post
POST /api/schedule
{
  "name": "calendar-feb-25-post",
  "cron": "0 14 25 2 *",
  "action": "post"
}

# List scheduled posts
GET /api/schedule
```

---

## Dashboard Access

Navigate to `/calendar` or click "Calendar" in the sidebar navigation.

The calendar uses responsive CSS grid and works on desktop and tablet viewports.
