---
name: blocking-muting-management
description: Mass block, unblock, mute, unmute, and manage accounts on X/Twitter. Includes bot detection and blocking, keyword-based muting, muted word management, spam reporting, and follower removal via soft-block. Use when users want to block bots, mass block/unblock accounts, mute by keywords, manage muted words, or remove followers.
license: MIT
metadata:
  author: nichxbt
  version: "4.0"
---

# Blocking & Muting Management

Browser console scripts for blocking, unblocking, muting, and managing unwanted accounts on X/Twitter.

## Script Selection

| Goal | File | Navigate to |
|------|------|-------------|
| Block multiple accounts | `src/massBlock.js` | Any page on x.com |
| Unblock all blocked accounts | `src/massUnblock.js` | `x.com/settings/blocked/all` |
| Unmute all muted accounts | `src/massUnmute.js` | `x.com/settings/muted/all` |
| Detect and block bots | `src/blockBots.js` | `x.com/USERNAME/followers` |
| Mute users by keywords | `src/muteByKeywords.js` | Timeline or search results |
| Manage muted words | `src/manageMutedWords.js` | Any page |
| Report spam | `src/reportSpam.js` | Target account profile |
| Remove followers (soft-block) | `src/removeFollowers.js` | `x.com/USERNAME/followers` |

## Script Details

### massBlock.js
Blocks a list of usernames by navigating to each profile and clicking Block. Configurable delay between blocks. Tracks progress and exports block list.

**Controls:** `window.XActions.pause()`, `.resume()`, `.abort()`

### massUnblock.js
Navigates to blocked accounts page and clicks Unblock on each. Scrolls for more. Progress tracking with auto JSON export.

### massUnmute.js
Same pattern as massUnblock but for muted accounts. Navigate to `x.com/settings/muted/all` first.

### blockBots.js
Scans your followers using heuristics to detect bot accounts:
- Default avatar / no profile picture
- Very low follower count with high following count
- Account age < 30 days with high activity
- Bio contains spam keywords
- No tweets or only retweets

Flags accounts as suspicious before blocking. Review mode available.

### muteByKeywords.js
Scans timeline or search results for tweets containing specific keywords. Mutes the authors. Configurable keyword list.

### manageMutedWords.js
Bulk-adds words/phrases to X's muted words list. Navigates to settings and adds each word programmatically.

### removeFollowers.js
Removes followers using the block-then-immediately-unblock method. They stop following you without being permanently blocked. Processes one-by-one with safety delays.

**Controls:** `window.XActions.pause()`, `.resume()`, `.abort()`

## DOM Selectors

| Element | Selector |
|---------|----------|
| Block option | `[data-testid="block"]` |
| Unblock button | `[data-testid="unblock"]` or `[data-testid$="-unblock"]` |
| Confirmation | `[data-testid="confirmationSheetConfirm"]` |
| User actions menu | `[data-testid="userActions"]` |
| User cell | `[data-testid="UserCell"]` |
| Mute option | `[data-testid="mute"]` |

## Rate Limiting & Safety

- 1-2s delays between block/unblock/mute actions
- Bot detection uses heuristics — review flagged accounts before blocking
- X may restrict after ~100 blocks in quick succession
- Soft-block (block+unblock) is the safest way to remove followers

## Strategy Guide

### Cleaning up after a bot attack
1. Run `src/blockBots.js` on your followers page
2. Review flagged accounts in the console output
3. Let the script block confirmed bots
4. Run `src/auditFollowers.js` to verify remaining follower quality

### Mass cleanup of muted/blocked accounts
1. Run `src/massUnblock.js` on `x.com/settings/blocked/all` to clear block list
2. Run `src/massUnmute.js` on `x.com/settings/muted/all` to clear mute list
3. Set up fresh keyword mutes with `src/manageMutedWords.js`

## Notes
- Block/unblock operations are final — X doesn't have a bulk undo
- Soft-block (removeFollowers) is invisible to the removed user
- Bot detection heuristics may flag legitimate new accounts — always review
