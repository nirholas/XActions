---
name: notifications-management
description: Manage X/Twitter notifications including alerts, filters, push/email settings, priority notifications tab, muting, and the 2026 Priority tab feature for iOS/web.
license: MIT
metadata:
  author: nichxbt
  version: "3.0"
---

# Notifications Management with XActions

Automate and manage X/Twitter notification settings and monitoring.

## Features

- **Alerts**: Likes, mentions, replies, follows, reposts
- **Filters**: Mute specific users, words, phrases
- **Push Notifications**: Device push notification controls
- **Email Notifications**: Email alert preferences
- **Web/Browser**: Browser popup notifications
- **X Alerts**: Custom recommendation alerts
- **Priority Tab**: Highlighted key notifications for iOS/web (2026)
- **Timeline View**: Review all notifications in chronological order
- **Notification Scraping**: Export notification data

## Browser Console Script

**File:** `scripts/manageNotifications.js`

### How to use

1. Navigate to `x.com/notifications`
2. Open DevTools (F12) → Console
3. Paste the script → Enter

### Key selectors

| Element | Selector |
|---------|----------|
| Notification tab | `a[href="/notifications"]` |
| Mentions tab | `a[href="/notifications/mentions"]` |
| All tab | `[role="tab"]` |
| Notification cells | `[data-testid="notification"]` |
| Settings gear | `a[href="/settings/notifications"]` |
| Filter options | `[data-testid="settingsSwitch"]` |

## MCP Tools

- `x_get_notifications` – Scrape recent notifications
- `x_mute_user` – Mute a user
- `x_unmute_user` – Unmute a user
- `x_mute_word` – Mute a word/phrase
- `x_notification_settings` – Get/update notification preferences

## API Endpoints

- `GET /api/notifications` – Get recent notifications
- `GET /api/notifications/mentions` – Get mentions only
- `PUT /api/notifications/settings` – Update notification preferences
- `POST /api/notifications/mute-word` – Add muted word
- `DELETE /api/notifications/mute-word/:word` – Remove muted word

## Related Files

- `src/notificationManager.js` – Core notification module
- `scripts/manageNotifications.js` – Browser notification script
- `scripts/scrapeNotifications.js` – Notification scraping

## Notes

- Priority tab is a 2026 feature for iOS and web
- Muted words/phrases can be temporary or permanent
- Email notifications have separate per-category settings
- Push notifications require browser/device permissions
