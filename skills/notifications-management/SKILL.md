---
name: notifications-management
description: Manages X/Twitter notifications including filtering by type, bulk management, notification scraping, and automated notification handling. Use when users want to manage, filter, scrape, or process X notifications in bulk.
license: MIT
metadata:
  author: nichxbt
  version: "4.0"
---

# Notifications Management

Browser console script for managing and filtering X/Twitter notifications.

## Script Selection

| Goal | File | Navigate to |
|------|------|-------------|
| Filter and manage notifications | `src/notificationManager.js` | `x.com/notifications` |
| Scrape notification data | `scripts/scrapeNotifications.js` | `x.com/notifications` |
| Welcome new followers | `src/welcomeNewFollowers.js` | `x.com/USERNAME/followers` |

## Notification Manager

**File:** `src/notificationManager.js`

Manages X notifications: filter by type (mentions, likes, reposts, follows, replies), mark as read, and track notification activity.

### How to Use

1. Navigate to `x.com/notifications`
2. Open DevTools (F12) -> Console
3. Paste the script -> Enter

### Configuration

```javascript
const CONFIG = {
  filterTypes: ['mentions', 'likes', 'reposts', 'follows'],
  markAsRead: true,
  scrollToLoadMore: true,
  maxNotifications: 200,
  actionDelay: 1000,
};
```

### Features
- Filter notifications by type
- Count notifications by category
- Scrape notification content with author and timestamp
- Export notification data as JSON
- Identify most-engaged users from notifications

## Notification Scraper

**File:** `scripts/scrapeNotifications.js`

Standalone scraper that exports all visible notifications as structured JSON with author, type, content, and timestamp.

## DOM Selectors

| Element | Selector |
|---------|----------|
| Notification cells | `[data-testid="notification"]` |
| Toggle switch | `[data-testid="settingsSwitch"]` |
| Notifications tab | `a[href="/notifications"]` |
| Mentions tab | `a[href="/notifications/mentions"]` |
| Notification text | `[data-testid="notification"] [dir="auto"]` |

## Strategy Guide

### Identifying engagement opportunities
1. Run `src/notificationManager.js` to filter for mentions
2. Identify high-value mentions (verified users, large accounts)
3. Prioritize replies to mentions from users with 1000+ followers
4. Use `src/engagementLeaderboard.js` to cross-reference top engagers

### Automated new follower pipeline
1. Run `src/welcomeNewFollowers.js` to detect new followers
2. Review generated welcome message templates
3. Customize messages per follower based on their bio/niche

## Notes
- Notifications page loads in batches — script scrolls to collect more
- Rate limit: process with 1-2s delays between actions
- Navigate to the Notifications tab before running
- Mentions tab shows only @mentions for easier filtering
