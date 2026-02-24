---
name: settings-privacy
description: Manages X/Twitter account settings and privacy controls including protected tweets, muted words, content filtering, and account configuration. Use when users want to change privacy settings, manage muted words, or configure account preferences.
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
| Muted Words | `src/manageMutedWords.js` | Add, remove, and manage muted words/phrases |

## Settings Manager

**File:** `src/settingsManager.js`

Manages account settings: privacy, content filtering, notification preferences, and account configuration.

### How to use

1. Navigate to `x.com/settings`
2. Open DevTools (F12) → Console
3. Paste the script → Enter

## Muted Words Manager

**File:** `src/manageMutedWords.js`

Bulk add or remove muted words and phrases to filter unwanted content.

### How to use

1. Navigate to `x.com/settings/muted_keywords`
2. Open DevTools (F12) → Console
3. Paste the script → Enter

### Key Selectors

| Element | Selector |
|---------|----------|
| Toggle switch | `[data-testid="settingsSwitch"]` |
| Protected toggle | `[data-testid="protectedTweets"]` |

## Notes

- Protected tweets: only approved followers can see your posts
- Muted words filter content from timeline, notifications, and search
- Settings changes take effect immediately
- Some settings require password confirmation
