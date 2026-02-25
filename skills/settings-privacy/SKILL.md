---
name: settings-privacy
description: Manages X/Twitter account settings and privacy controls including protected tweets, muted words, content filtering, notification preferences, and account configuration. Use when changing privacy settings, managing muted words, or configuring account preferences.
license: MIT
metadata:
  author: nichxbt
  version: "4.0"
---

# Settings & Privacy

Browser console scripts for managing X/Twitter account settings and privacy controls.

## Script Selection

| Script | File | Purpose |
|--------|------|---------|
| Settings Manager | `src/settingsManager.js` | Account settings, privacy, content preferences |
| Muted Words | `src/manageMutedWords.js` | Bulk add, remove, and manage muted words/phrases |
| Mass Unblock | `src/massUnblock.js` | Clear blocked accounts |
| Mass Unmute | `src/massUnmute.js` | Clear muted accounts |

## Settings Manager

**File:** `src/settingsManager.js`

Manages account settings: privacy controls, content filtering, notification preferences, and account configuration.

### How to Use
1. Navigate to `x.com/settings`
2. Open DevTools (F12) -> Console
3. Paste the script -> Enter

## Muted Words Manager

**File:** `src/manageMutedWords.js`

Bulk add or remove muted words and phrases to filter unwanted content from timeline, notifications, and search.

### How to Use
1. Navigate to `x.com/settings/muted_keywords`
2. Open DevTools (F12) -> Console
3. Paste the script -> Enter

### Configuration

```javascript
const CONFIG = {
  wordsToMute: ['spam', 'giveaway', 'follow for follow'],
  duration: 'forever',    // 'forever', '24h', '7d', '30d'
  muteFrom: 'everyone',   // 'everyone' or 'people_you_dont_follow'
};
```

## DOM Selectors

| Element | Selector |
|---------|----------|
| Toggle switch | `[data-testid="settingsSwitch"]` |
| Protected toggle | `[data-testid="protectedTweets"]` |
| Settings nav | `a[href="/settings"]` |
| Muted keywords | `a[href="/settings/muted_keywords"]` |
| Confirmation dialog | `[data-testid="confirmationSheetConfirm"]` |

## Settings Pages

| Setting | URL | Description |
|---------|-----|-------------|
| Protected tweets | `/settings/audience_and_tagging` | Only approved followers see posts |
| Muted words | `/settings/muted_keywords` | Filter content by keyword |
| Blocked accounts | `/settings/blocked/all` | View/manage blocked accounts |
| Muted accounts | `/settings/muted/all` | View/manage muted accounts |
| Content preferences | `/settings/content_preferences` | Sensitive content filters |
| Notifications | `/settings/notifications` | Notification filtering |
| Privacy and safety | `/settings/privacy_and_safety` | DM controls, discoverability |
| Account info | `/settings/your_twitter_data/account` | Email, phone, username |
| Download data | `/settings/download_your_data` | Request full data archive |

## Strategy Guide

### Locking down a new account
1. Navigate to `/settings/audience_and_tagging` -> enable Protected Tweets
2. Navigate to `/settings/privacy_and_safety` -> adjust DM settings
3. Run `src/manageMutedWords.js` to add spam filters
4. Navigate to `/settings/notifications` -> filter notifications from non-followers

### Cleaning up after spam attack
1. Run `src/massUnblock.js` to clear old blocks (make room for new ones)
2. Run `src/blockBots.js` on your followers page
3. Run `src/manageMutedWords.js` with spam keywords
4. Check `/settings/muted/all` and `/settings/blocked/all` for status

### Content creator setup
1. Keep Protected Tweets OFF (public account needed for growth)
2. Mute common spam keywords: giveaway, airdrop, DM me, follow back
3. Filter notifications to verified accounts or followers only
4. Enable sensitive content warnings if posting edgy content

## Notes
- Protected tweets: only approved followers can see posts
- Muted words filter content from timeline, notifications, and search
- Settings changes take effect immediately
- Some settings require password confirmation
- Download data request takes 24-48 hours to process
- Muted words support phrases, hashtags, and individual words
