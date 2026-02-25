---
name: settings-privacy
description: Manages X/Twitter account settings and privacy controls including protected tweets, muted words, content filtering, and account configuration. The agent uses this skill when a user wants to change privacy settings, manage muted words, or configure account preferences.
license: MIT
metadata:
  author: nichxbt
  version: "3.0"
---

# Settings & Privacy

Browser console scripts for managing X/Twitter account settings and privacy controls.

## Available Scripts

| Script | File | Purpose |
|--------|------|---------|
| Settings Manager | `src/settingsManager.js` | Account settings, privacy, content preferences |
| Muted Words | `src/manageMutedWords.js` | Bulk add, remove, and manage muted words/phrases |

## Settings Manager

**File:** `src/settingsManager.js`

Manages account settings: privacy controls, content filtering, notification preferences, and account configuration.

### How to use

1. Navigate to `x.com/settings`
2. Open DevTools (F12) → Console
3. Paste the script → Enter

## Muted Words Manager

**File:** `src/manageMutedWords.js`

Bulk add or remove muted words and phrases to filter unwanted content from timeline, notifications, and search.

### How to use

1. Navigate to `x.com/settings/muted_keywords`
2. Open DevTools (F12) → Console
3. Paste the script → Enter

### Configuration

```javascript
const CONFIG = {
  wordsToMute: ['spam', 'giveaway', 'follow for follow'],
  duration: 'forever',    // 'forever', '24h', '7d', '30d'
  muteFrom: 'everyone',   // 'everyone' or 'people_you_dont_follow'
};
```

### Key Selectors

| Element | Selector |
|---------|----------|
| Toggle switch | `[data-testid="settingsSwitch"]` |
| Protected toggle | `[data-testid="protectedTweets"]` |
| Settings nav | `a[href="/settings"]` |
| Muted keywords | `a[href="/settings/muted_keywords"]` |

## Common Settings

| Setting | URL | Description |
|---------|-----|-------------|
| Protected tweets | `/settings/audience_and_tagging` | Only approved followers see posts |
| Muted words | `/settings/muted_keywords` | Filter content by keyword |
| Blocked accounts | `/settings/blocked/all` | View/manage blocked accounts |
| Muted accounts | `/settings/muted/all` | View/manage muted accounts |
| Content preferences | `/settings/content_preferences` | Sensitive content filters |

## Notes

- Protected tweets: only approved followers can see posts
- Muted words filter content from timeline, notifications, and search
- Settings changes take effect immediately
- Some settings require password confirmation
- Muted words support phrases, hashtags, and individual words
