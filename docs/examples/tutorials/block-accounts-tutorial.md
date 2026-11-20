# Block Accounts -- Tutorial

> Step-by-step guide to blocking, unblocking, and auto-blocking bot accounts on X using XActions browser scripts.

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
| `browser/massBlock.js` | Any x.com page | Block by username list or visible users |
| `browser/massUnblock.js` | `x.com/settings/blocked/all` | Unblock all or selected users |
| `browser/blockBots.js` | Any followers/user list | Detect and block likely bot accounts |

## Configuration

### browser/massBlock.js

```js
const CONFIG = {
  mode: 'list',               // 'list' or 'visible'
  usersToBlock: [
    'spammer1',
    'spammer2',
  ],
  whitelist: [],              // Never block these
  dryRun: true,               // SET FALSE TO EXECUTE
  actionDelay: 3000,
  navigationDelay: 3500,
  maxVisibleBlocks: 100,      // Cap for 'visible' mode
  scrollInVisibleMode: true,
  exportOnComplete: true,
};
```

### browser/massUnblock.js

```js
const CONFIG = {
  maxUnblocks: Infinity,
  keepBlocked: [],            // Keep these users blocked
  dryRun: false,
  minDelay: 1000,
  maxDelay: 2800,
  exportOnComplete: true,
};
```

### browser/blockBots.js

```js
const CONFIG = {
  minFollowersToFollowingRatio: 0.01,
  maxDefaultProfileAge: 30,
  noTweetThreshold: 0,
  nameLooksGenerated: true,
  maxBlocks: 50,
  actionDelay: 2500,
  scrollDelay: 2000,
  maxScrollAttempts: 15,
  dryRun: true,
};
```

## Step-by-Step Guide

### Block a List of Users

**Step 1:** Start with a dry run in `browser/massBlock.js`:

```js
const CONFIG = {
  mode: 'list',
  usersToBlock: [
    'spammer1',
    'annoying_bot',
    'fake_account',
  ],
  whitelist: ['friendwithweirdname'],
  dryRun: true,
};
```

**Step 2:** Paste the script:

```
MASS BLOCK USERS
Mode: list | Dry run: true | Whitelist: 1
3 users to block

  Would block: @spammer1
  Would block: @annoying_bot
  Would block: @fake_account
```

**Step 3:** Set `dryRun: false` and re-paste. The script navigates to each profile and blocks them:

```
  Blocked @spammer1
  Blocked @annoying_bot
  Blocked @fake_account

RESULTS
  Blocked: 3
  Failed: 0
  Skipped: 0
```

### Block Visible Users (Spam Replies)

Use `visible` mode to block users visible on the current page -- great for cleaning up spam replies.

**Step 1:** Navigate to a tweet with spam replies.

**Step 2:** Configure for visible mode:

```js
const CONFIG = {
  mode: 'visible',
  whitelist: ['legitimate_user'],
  maxVisibleBlocks: 20,
  dryRun: true,
};
```

**Step 3:** The script finds all user cells on the page and blocks them:

```
Blocking visible users on page (max 20)

  Would block: @spam1
  Would block: @spam2
  ...
```

### Detect and Block Bots

**Step 1:** Navigate to your followers list (`x.com/YOUR_USERNAME/followers`) or any user list.

**Step 2:** Paste `browser/blockBots.js`:

```js
const CONFIG = {
  dryRun: true,
  maxBlocks: 50,
};
```

**Step 3:** The script scans visible user cells and applies heuristics:

```
BLOCK BOTS

Bot detected: @xkj38291 -- default avatar, username 60% digits, no bio
Bot detected: @user283747 -- long username with many digits, 0 followers

RESULTS:
  Bots detected: 8
  Users scanned: 145
  Bot rate: 5.5%
```

**Step 4:** A JSON file is downloaded with all detected bots.

#### Bot Detection Criteria

A user is flagged as a bot if 2 or more of these are true:
- Default/no avatar
- Username has more than 50% digits
- Long username (15+ chars) with many digits
- No bio text
- 0 followers
- 0 following

### Mass Unblock

**Step 1:** Navigate to `https://x.com/settings/blocked/all`.

**Step 2:** Configure `browser/massUnblock.js`:

```js
const CONFIG = {
  keepBlocked: ['definite_spammer'],  // Keep these blocked
  dryRun: false,
};
```

**Step 3:** Paste the script. It scrolls through your blocked list and unblocks each user:

```
MASS UNBLOCK USERS
Max: unlimited | Keep blocked: 1

  Keeping blocked: @definite_spammer
Unblocked 10 users | 15.2/min
Unblocked 20 users | 14.8/min

RESULTS
  Unblocked: 87
  Skipped: 1
  Errors: 0
```

**Step 4:** Controls while running:

```js
window.XActions.pause();
window.XActions.resume();
window.XActions.abort();
window.XActions.status();
```

## Tips & Tricks

- **Use `dryRun: true` for mass block** to preview who will be blocked. Blocking is easier to undo than deleting, but still review first.
- **Visible mode** is ideal for cleaning up spam under viral tweets. Navigate to the replies and run with `mode: 'visible'`.
- **The whitelist** prevents accidental blocking. Always add legitimate users with unusual usernames.
- **Bot detection** is heuristic-based and may have false positives. Review the results before blocking.
- **Block exports** are auto-downloaded as JSON, making it easy to share block lists with others.
- **Rate limit protection** is built in. The scripts auto-pause on throttling.
- **After mass blocking**, you can export the list and share it as a community block list.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "No users to block!" | Add usernames to `usersToBlock` array |
| "Navigate to settings/blocked/all first!" | Go to blocked accounts page for unblock |
| "Profile not found or menu missing" | The account may have been deleted or suspended |
| "Block option not found" | The user may already be blocked |
| Bot detection too aggressive | Increase the threshold (require 3+ signals instead of 2) |
| Bot detection misses bots | Lower the digit ratio or add custom heuristics |

## Related Scripts

- `browser/muteByKeywords.js` -- Mute users by tweet keywords
- `browser/manageMutedWords.js` -- Bulk-add muted words
- `browser/massUnmute.js` -- Mass unmute users
- `browser/reportSpam.js` -- Report spam accounts
