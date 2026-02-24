---
name: blocking-muting-management
description: Manage blocking and muting on X/Twitter with browser scripts. Mass block users, mass unblock, block bots, mute by keywords, mass unmute, manage muted words, and report spam. Use when users want to clean up their timeline, block spammers, or manage muted content.
license: MIT
metadata:
  author: nichxbt
  version: "3.0"
---

# Blocking & Muting Management with XActions

Browser console scripts for managing blocks, mutes, and content filtering on X/Twitter.

## Available Scripts

| Script | File | Purpose |
|--------|------|---------|
| Mass Block | `src/massBlock.js` | Block multiple users from a list |
| Mass Unblock | `src/massUnblock.js` | Unblock all blocked users |
| Block Bots | `src/blockBots.js` | Detect and block bot accounts |
| Mute by Keywords | `src/muteByKeywords.js` | Mute users posting specific keywords |
| Mass Unmute | `src/massUnmute.js` | Unmute all muted users |
| Manage Muted Words | `src/manageMutedWords.js` | Bulk-add muted words/phrases |
| Report Spam | `src/reportSpam.js` | Report multiple spam accounts |

## Mass Block

**File:** `src/massBlock.js`

Block multiple users by providing a list of usernames. Includes dry-run mode for safety.

### How to use

1. Go to x.com (any page)
2. Edit `CONFIG.usersToBlock` with usernames to block
3. Set `CONFIG.dryRun = false` to enable actual blocking
4. Open DevTools (F12) → Console
5. Paste the script → Enter

### Key selectors

| Element | Selector |
|---------|----------|
| User actions menu | `[data-testid="userActions"]` |
| Block option | `[data-testid="block"]` |
| Confirmation | `[data-testid="confirmationSheetConfirm"]` |

## Mass Unblock

**File:** `src/massUnblock.js`

Unblock all users from your blocked list.

### How to use

1. Navigate to `x.com/settings/blocked/all`
2. Open DevTools (F12) → Console
3. Paste the script → Enter

## Block Bots

**File:** `src/blockBots.js`

Scans visible users and detects likely bots using heuristics:
- Default/no avatar
- Username with high digit ratio
- No bio
- Zero followers/following
- Generated-looking usernames

Exports detected bots as JSON. Includes dry-run mode.

### How to use

1. Navigate to any followers/following list
2. Open DevTools (F12) → Console
3. Paste the script → Enter
4. Review the bot detection report

## Mute by Keywords

**File:** `src/muteByKeywords.js`

Scrolls your timeline and mutes users whose posts contain specified keywords.

### Configuration

```javascript
const CONFIG = {
  keywords: ['spam', 'giveaway', 'follow for follow'],
  maxMutes: 50,
  caseSensitive: false,
};
```

## Mass Unmute

**File:** `src/massUnmute.js`

Unmute all muted users from the muted accounts settings page.

### How to use

1. Navigate to `x.com/settings/muted/all`
2. Open DevTools (F12) → Console
3. Paste the script → Enter

## Manage Muted Words

**File:** `src/manageMutedWords.js`

Bulk-add words and phrases to your muted words list.

### Configuration

```javascript
const CONFIG = {
  wordsToMute: ['crypto scam', 'follow for follow', 'giveaway'],
  duration: 'forever',     // 'forever', '24h', '7d', '30d'
  muteFrom: 'everyone',   // 'everyone' or 'people_you_dont_follow'
};
```

## Report Spam

**File:** `src/reportSpam.js`

Report multiple accounts for spam, abuse, or impersonation.

### Configuration

```javascript
const CONFIG = {
  usersToReport: ['spammer1', 'spammer2'],
  reason: 'spam',  // 'spam', 'abuse', 'fake'
  dryRun: true,
};
```

## Notes

- All scripts include dry-run mode by default for safety
- Add delays between actions to avoid rate limiting (built-in)
- Mass blocking is irreversible without using Mass Unblock
- Review bot detection results before blocking — false positives are possible
