---
name: blocking-muting-management
description: Mass block, unblock, mute, and manage unwanted accounts on X/Twitter. Includes bot detection, keyword-based muting, spam reporting, and follower removal via soft-block. The agent uses this skill when a user wants to block bots, mass block or unblock accounts, mute by keywords, report spam, or remove followers.
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
| Mass Block | `src/massBlock.js` | Block multiple accounts from a list or visible on page |
| Mass Unblock | `src/massUnblock.js` | Unblock multiple accounts with keep-blocked filter |
| Mass Unmute | `src/massUnmute.js` | Unmute multiple accounts with keep-muted filter |
| Block Bots | `src/blockBots.js` | Detect and block bot/spam accounts by heuristics |
| Mute by Keywords | `src/muteByKeywords.js` | Mute accounts tweeting specific keywords |
| Report Spam | `src/reportSpam.js` | Report accounts for spam/abuse |
| Remove Followers | `src/removeFollowers.js` | Remove followers without blocking (soft-block) |

## Quick Start

| Script | Navigate to |
|--------|-------------|
| Block Bots | `x.com/YOUR_USERNAME/followers` |
| Mass Block | Any x.com page (list mode) or spam reply thread (visible mode) |
| Mass Unblock | `x.com/settings/blocked/all` |
| Mass Unmute | `x.com/settings/muted/all` |
| Mute by Keywords | Timeline or search results |
| Remove Followers | `x.com/YOUR_USERNAME/followers` |
| Report Spam | Any x.com page |

1. Navigate to the required page
2. Open DevTools (F12) → Console
3. Set `dryRun: false` when ready → Paste and run

## Block Bots — `src/blockBots.js`

Scans followers and blocks accounts matching bot heuristics: no avatar, random-string usernames, high follow ratio, no bio, zero tweets.

## Mass Block / Unblock — `src/massBlock.js`, `src/massUnblock.js`

Block or unblock accounts from a configurable username list. Mass Block also supports `'visible'` mode that blocks all users on the current page (useful for spam reply threads).

## Mass Unmute — `src/massUnmute.js`

Unmute all or selected accounts. Supports keep-muted filter to preserve specific mutes.

## Mute by Keywords — `src/muteByKeywords.js`

Scans timeline for tweets matching keywords and mutes the authors. Useful for filtering recurring spam topics.

## Report Spam — `src/reportSpam.js`

Report multiple accounts for spam or abuse. Configurable reason (`spam`, `abuse`, `fake`) with optional block-after-report.

## Remove Followers — `src/removeFollowers.js`

Removes followers using soft-block (block → immediate unblock). Three modes: `list` (specific users), `all` (all visible), `smart` (heuristic-based filtering).

## Shared Features

Production-grade scripts (`massBlock`, `massUnblock`, `massUnmute`, `removeFollowers`) include:

- **Pause/resume/abort** — `window.XActions.pause()` / `.resume()` / `.abort()` / `.status()`
- **Dry-run mode** — preview actions before executing
- **Rate-limit detection** — auto-cooldown on 429 responses
- **Progress tracking** — real-time console output with counts
- **JSON export** — download results on completion

## Key Selectors

| Element | Selector |
|---------|----------|
| Block option | `[data-testid="block"]` |
| Confirmation dialog | `[data-testid="confirmationSheetConfirm"]` |
| User actions menu | `[data-testid="userActions"]` |
| User cell | `[data-testid="UserCell"]` |
| Mute option | `[data-testid="muteLink"]` |
| Report option | `[data-testid="report"]` |
| Tweet caret menu | `[data-testid="caret"]` |

## Notes

- Mass operations use 1-3s random delays between actions to avoid rate limits
- Bot detection uses heuristics — review flagged accounts before blocking
- Remove followers: block then immediately unblock (they stop following you)
- Report spam sends the report to X — use responsibly, only for genuine spam
- All scripts default to `dryRun: true` for safety
