---
name: notifications-management
description: Manages X/Twitter notifications including filtering, marking as read, and automating notification handling. Use when users want to manage, filter, or automate X notification processing.
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

Manages X notifications: filter by type, mark as read, and track notification activity.

### How to use

1. Navigate to `x.com/notifications`
2. Open DevTools (F12) → Console
3. Paste the script → Enter

### Key Selectors

| Element | Selector |
|---------|----------|
| Notification cells | `[data-testid="notification"]` |
| Toggle switch | `[data-testid="settingsSwitch"]` |

## Notes

- Notifications page loads in batches — script scrolls to collect more
- Filter types: mentions, likes, reposts, follows, replies
- Rate limit: process with 1s delays between actions
