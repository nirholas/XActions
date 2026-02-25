---
name: notifications-management
description: Manages X/Twitter notifications including filtering by type, marking as read, and automating notification handling. The agent uses this skill when a user wants to manage, filter, or process X notifications in bulk.
license: MIT
metadata:
  author: nichxbt
  version: "3.0"
---

# Notifications Management

Browser console script for managing and filtering X/Twitter notifications.

## Available Scripts

| Script | File | Purpose |
|--------|------|---------|
| Notification Manager | `src/notificationManager.js` | Filter, manage, and automate notification handling |

## Notification Manager

**File:** `src/notificationManager.js`

Manages X notifications: filter by type (mentions, likes, reposts, follows, replies), mark as read, and track notification activity.

### How to use

1. Navigate to `x.com/notifications`
2. Open DevTools (F12) → Console
3. Paste the script → Enter

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

### Key Selectors

| Element | Selector |
|---------|----------|
| Notification cells | `[data-testid="notification"]` |
| Toggle switch | `[data-testid="settingsSwitch"]` |
| Notifications tab | `a[href="/notifications"]` |
| Mentions tab | `a[href="/notifications/mentions"]` |

## Notes

- Notifications page loads in batches — script scrolls to collect more
- Filter types: mentions, likes, reposts, follows, replies
- Rate limit: process with 1-2s delays between actions
- Notifications are read-only after processing — cannot "un-read"
- Navigate to the Notifications tab before running the script
