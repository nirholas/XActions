---
name: blocking-muting-management
description: Mass block, unblock, mute, and manage accounts on X/Twitter. Includes bot detection and blocking, keyword-based muting, spam reporting, and follower removal. Use when users want to block bots, mass block/unblock accounts, mute by keywords, or remove followers.
license: MIT
metadata:
  author: nichxbt
  version: "3.0"
---

# Blocking & Muting Management

Browser console scripts for blocking, unblocking, muting, and managing unwanted accounts.

## Available Scripts

| Script | File | Purpose |
|--------|------|---------|
| Mass Block | `src/massBlock.js` | Block multiple accounts from a list |
| Mass Unblock | `src/massUnblock.js` | Unblock multiple accounts |
| Mass Unmute | `src/massUnmute.js` | Unmute multiple accounts |
| Block Bots | `src/blockBots.js` | Detect and block bot/spam accounts |
| Mute by Keywords | `src/muteByKeywords.js` | Mute accounts tweeting specific keywords |
| Report Spam | `src/reportSpam.js` | Report accounts for spam/abuse |
| Remove Followers | `src/removeFollowers.js` | Remove specific followers without blocking |

## Quick start

1. Navigate to the required page on x.com
2. Open DevTools (F12) → Console
3. Paste the script → Enter

| Script | Navigate to |
|--------|-------------|
| Block Bots | `x.com/YOUR_USERNAME/followers` |
| Mass Block / Unblock / Unmute | Any page on x.com |
| Mute by Keywords | Timeline or search results |
| Remove Followers | `x.com/YOUR_USERNAME/followers` |
| Report Spam | Profile of target account |

## Script details

**Per-script configs, detection heuristics, and usage guides**: See [references/script-details.md](references/script-details.md)

## Key Selectors

| Element | Selector |
|---------|----------|
| Block option | `[data-testid="block"]` |
| Confirmation | `[data-testid="confirmationSheetConfirm"]` |
| User actions menu | `[data-testid="userActions"]` |
| User cell | `[data-testid="UserCell"]` |

## Notes

- Mass operations use 1-2s delays between actions to avoid rate limits
- Bot detection uses heuristics — review flagged accounts before blocking
- Remove followers pattern: block then immediately unblock (they stop following you)
- Report spam sends the report to X — use responsibly
