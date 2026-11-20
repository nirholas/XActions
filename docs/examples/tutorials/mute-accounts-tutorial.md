# Mute Accounts -- Tutorial

> Step-by-step guide to muting users and keywords on X using XActions browser scripts.

## Prerequisites
- Logged into x.com in your browser
- Browser DevTools console (F12 -> Console tab)

## Quick Start
1. Navigate to the appropriate page (see table below)
2. Open DevTools (F12) and go to the Console tab
3. Copy the contents of the script you need
4. Edit the `CONFIG` section
5. Paste into the console and press Enter

## Scripts Overview

| Script | Starting Page | Purpose |
|--------|--------------|---------|
| `browser/muteByKeywords.js` | Any timeline/search | Mute users whose posts contain keywords |
| `browser/manageMutedWords.js` | `x.com/settings/muted_keywords` | Bulk-add muted words |
| `browser/massUnmute.js` | `x.com/settings/muted/all` | Unmute all or selected users |

## Configuration

### browser/muteByKeywords.js

```js
const CONFIG = {
  keywords: [
    'spam',
    'giveaway',
    'follow for follow',
  ],
  maxMutes: 50,
  minDelay: 1500,
  maxDelay: 3000,
  scrollDelay: 2000,
  maxScrollAttempts: 20,
  caseSensitive: false,
};
```

### browser/manageMutedWords.js

```js
const CONFIG = {
  wordsToMute: [
    'crypto scam',
    'follow for follow',
    'giveaway',
    'dm me',
  ],
  duration: 'forever',      // 'forever', '24h', '7d', '30d'
  muteFrom: 'everyone',     // 'everyone' or 'people_you_dont_follow'
  actionDelay: 2000,
  dryRun: true,
};
```

### browser/massUnmute.js

```js
const CONFIG = {
  maxUnmutes: Infinity,
  keepMuted: [],              // Keep these users muted
  dryRun: false,
  minDelay: 800,
  maxDelay: 2200,
  exportOnComplete: true,
};
```

## Step-by-Step Guide

### Mute Users by Keywords

This script scrolls your timeline, finds tweets matching your keywords, and mutes the authors.

**Step 1:** Navigate to your home timeline, a search page, or any page with tweets.

**Step 2:** Configure keywords in `browser/muteByKeywords.js`:

```js
const CONFIG = {
  keywords: ['spam', 'giveaway', 'follow back', 'dm for collab'],
  maxMutes: 30,
};
```

**Step 3:** Paste the script:

```
MUTE BY KEYWORDS
Keywords: spam, giveaway, follow back, dm for collab
Max mutes: 30

Muted @spammer1 (matched: "FREE GIVEAWAY follow and retweet...")
Muted @spammer2 (matched: "DM for collab opportunities...")

Done! Muted 12 users.
Muted users: spammer1, spammer2, ...
```

### Bulk Add Muted Words

Muted words filter your timeline so you never see posts containing those words.

**Step 1:** Navigate to `https://x.com/settings/muted_keywords`.

**Step 2:** Start with a dry run:

```js
const CONFIG = {
  wordsToMute: [
    'crypto scam',
    'follow for follow',
    'free giveaway',
    'dm me for',
    'make money fast',
  ],
  duration: 'forever',
  muteFrom: 'everyone',
  dryRun: true,
};
```

**Step 3:** Paste `browser/manageMutedWords.js`. In dry run mode, it lists what would be muted:

```
Words to mute: 5
  1. "crypto scam"
  2. "follow for follow"
  3. "free giveaway"
  4. "dm me for"
  5. "make money fast"
  Duration: forever
  From: everyone

DRY RUN MODE - Set CONFIG.dryRun = false to actually mute
```

**Step 4:** Set `dryRun: false` and re-paste to execute.

### Duration Options

| Value | Effect |
|-------|--------|
| `'forever'` | Permanently muted |
| `'24h'` | Muted for 24 hours |
| `'7d'` | Muted for 7 days |
| `'30d'` | Muted for 30 days |

### Mass Unmute Users

**Step 1:** Navigate to `https://x.com/settings/muted/all`.

**Step 2:** To keep certain users muted:

```js
const CONFIG = {
  keepMuted: ['specificspammer', 'reallyannoying'],
  dryRun: false,
};
```

**Step 3:** Paste `browser/massUnmute.js`. It scrolls through your muted list and unmutes everyone (except those in `keepMuted`):

```
MASS UNMUTE USERS
Max: unlimited | Dry run: false | Keep muted: 2

Unmuted 10 users | 12.5/min
Unmuted 20 users | 11.8/min

RESULTS
  Unmuted: 47
  Skipped: 2
  Errors: 0
  Duration: 240s
```

**Step 4:** Use controls while running:

```js
window.XActions.pause();
window.XActions.resume();
window.XActions.abort();
window.XActions.status();
```

## Tips & Tricks

- **Muting users vs. muting words** are different features. Muting a user hides all their posts. Muting a word hides any post containing that word from anyone.
- **Use `muteFrom: 'people_you_dont_follow'`** if you only want to filter strangers but still see posts from people you follow.
- **`caseSensitive: false`** (default) catches keywords regardless of capitalization.
- **Muted words** work on your home timeline, notifications, and search results.
- **Mass unmute export** downloads a JSON file with all unmuted accounts for your records.
- **The mute-by-keywords script** uses the tweet's three-dot menu to find the "Mute @user" option. If the option is not available on a particular tweet, it skips it.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "No keywords configured!" | Add keywords to the `keywords` array |
| "Navigate to settings/muted_keywords first!" | Go to the muted keywords settings page |
| "Navigate to settings/muted/all first!" | Go to the muted accounts settings page |
| "Muted word input not found" | X may have changed the settings page UI |
| Mute option not in tweet menu | The user may already be muted, or it is your own tweet |

## Related Scripts

- `browser/massBlock.js` -- Block accounts by list or from visible users
- `browser/blockBots.js` -- Detect and block bot accounts
- `browser/massUnblock.js` -- Unblock accounts in bulk
