# Blocking & Muting Script Details

## Contents

- [Block Bots](#block-bots)
- [Mass Block / Unblock](#mass-block--unblock)
- [Mass Unmute](#mass-unmute)
- [Mute by Keywords](#mute-by-keywords)
- [Report Spam](#report-spam)
- [Remove Followers](#remove-followers)

## Block Bots

**File:** `src/blockBots.js`

Scans your followers list and blocks accounts matching bot heuristics.

### Detection heuristics

- Default/missing avatar → bot signal
- Random-string usernames (high digit-to-letter ratio) → bot signal
- Abnormally high follow ratio (following thousands, few followers) → bot signal
- No bio or generic template bio → bot signal
- Recently created accounts with high activity → bot signal

### How to use

1. Navigate to `x.com/YOUR_USERNAME/followers`
2. Open DevTools (F12) → Console
3. Paste the script → Enter
4. Review flagged accounts before confirming blocks

## Mass Block / Unblock

**Files:** `src/massBlock.js`, `src/massUnblock.js`

Block or unblock accounts from a configurable list of usernames.

### Configuration

```javascript
const CONFIG = {
  usernames: ['spammer1', 'spammer2', 'bot_account'],
  delayMs: 1500,
};
```

### How to use

1. Navigate to any page on x.com
2. Edit the username list in CONFIG
3. Paste in DevTools console → Enter
4. Script navigates to each profile and clicks block/unblock

## Mass Unmute

**File:** `src/massUnmute.js`

Unmute multiple previously muted accounts. Uses the same CONFIG pattern as Mass Unblock.

## Mute by Keywords

**File:** `src/muteByKeywords.js`

Scans your timeline for tweets containing specified keywords and mutes the authors.

### Configuration

```javascript
const CONFIG = {
  keywords: ['crypto airdrop', 'follow for follow'],
  maxMutes: 50,
};
```

Scrolls timeline, matches tweet text against keywords, and mutes matching authors.

## Report Spam

**File:** `src/reportSpam.js`

Reports accounts for spam or abuse through X's reporting flow. Use responsibly — reports are submitted to X.

## Remove Followers

**File:** `src/removeFollowers.js`

Removes followers without permanently blocking them. Uses the block → immediate unblock pattern: blocking causes them to unfollow, then unblocking restores your ability to interact normally.

### Configuration

```javascript
const CONFIG = {
  usernames: ['unwanted_follower1', 'unwanted_follower2'],
  delayMs: 2000,
};
```
