---
title: "Group Direct Messages on X (Twitter) — Tutorial"
description: "Create group DM conversations and send messages to multiple users at once on X/Twitter using XActions."
keywords: ["twitter group dm", "group direct message twitter", "xactions group dm", "create group dm x", "bulk group message twitter"]
author: "nich (@nichxbt)"
date: "2026-03-30"
---

# Group Direct Messages — Tutorial

> Step-by-step guide to creating group DM conversations on X/Twitter using XActions browser scripts.

**Works on:** Browser Console
**Difficulty:** Beginner
**Time:** 2-5 minutes
**Requirements:** Logged into x.com in your browser

---

## Prerequisites

- Logged into x.com in your browser
- Browser DevTools console (F12 -> Console tab)
- Navigate to `https://x.com/messages` before running
- At least 2 recipients who allow DMs

---

## Quick Start

1. Open x.com and navigate to **Messages** (`https://x.com/messages`)
2. Press **F12** to open DevTools, then click the **Console** tab
3. Copy the script from `browser/groupDM.js`
4. Edit the `CONFIG.recipients` array with at least 2 usernames
5. Paste into the console and press Enter

---

## Configuration

```js
const CONFIG = {
  // Recipients (minimum 2 for a group DM)
  recipients: ['user1', 'user2', 'user3'],
  message: 'Hey everyone!',

  // Timing
  searchDelay: 2000,       // Delay after typing each username
  selectDelay: 1500,       // Delay after selecting each user
  actionDelay: 2000,       // Delay between major actions
  typeCharDelay: 50,       // Delay between keystrokes

  // Safety
  dryRun: true,            // Set to false to actually send
};
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `recipients` | `string[]` | `['user1', 'user2', 'user3']` | Usernames (without @) to add to the group. Minimum 2 required |
| `message` | `string` | `'Hey everyone!'` | Initial message to send after creating the group |
| `searchDelay` | `number` | `2000` | Milliseconds to wait after typing a username in search |
| `selectDelay` | `number` | `1500` | Milliseconds to wait after selecting a user from results |
| `actionDelay` | `number` | `2000` | Milliseconds between major UI actions |
| `typeCharDelay` | `number` | `50` | Milliseconds between individual keystrokes |
| `dryRun` | `boolean` | `true` | Preview mode -- no group is actually created |

---

## Step-by-Step Guide

### Step 1 -- Navigate to Messages

Go to `https://x.com/messages` in your browser.

### Step 2 -- Configure Recipients

Edit the `CONFIG` section in `browser/groupDM.js`:

```js
const CONFIG = {
  recipients: ['alice_dev', 'bob_crypto', 'charlie_ai'],
  message: 'Hey team! Let us coordinate our next project here.',
  dryRun: true,
};
```

### Step 3 -- Dry Run

Paste the script into the console. You will see:

```
╔════════════════════════════════════════════════════════════╗
║  Group Direct Messages                                     ║
║  by nichxbt -- v1.0                                        ║
╚════════════════════════════════════════════════════════════╝
DRY RUN MODE -- set CONFIG.dryRun = false to actually send
Recipients: alice_dev, bob_crypto, charlie_ai
Message: "Hey team! Let us coordinate our next project here."
Searching for @alice_dev...
Added @alice_dev (1/3)
Searching for @bob_crypto...
Added @bob_crypto (2/3)
Searching for @charlie_ai...
Added @charlie_ai (3/3)
Creating group conversation...
Typing message...
Message sent!
```

### Step 4 -- Send for Real

Once you are satisfied with the preview, change `dryRun: false` and paste again.

The script will:

1. Click the "New Message" button
2. Search for and select each recipient one by one
3. Click "Next" to create the group conversation
4. Type and send your initial message

### Step 5 -- Monitor Progress

While the script runs, you can use these controls in the console:

```js
// Check current status
window.XActions.status();
// Output: Added: 2/3 | Message sent: false | 12s

// Stop the script immediately
window.XActions.abort();
```

---

## Tips & Tricks

- **Minimum 2 recipients.** X requires at least 2 other people to create a group DM. The script will error if you provide fewer.
- **Verify usernames first.** Misspelled usernames will fail silently. Double-check each username exists.
- **Increase delays for reliability.** If users are not being found, increase `searchDelay` to 3000-4000ms to give X more time to return search results.
- **Leave message empty to skip.** Set `message: ''` if you just want to create the group without sending an initial message.
- **State is saved.** The script stores progress in `sessionStorage` under `xactions_groupDM` so you can check the final status.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Need at least 2 recipients" | Add more usernames to `CONFIG.recipients` |
| "Could not find New DM button" | Make sure you are on `x.com/messages` |
| "Could not find @username in search results" | The username may be misspelled, or the user has DMs disabled |
| "Need at least 2 recipients added to create a group" | Some users could not be found. Check the failed list in the summary |
| Script seems stuck | Use `window.XActions.status()` to check progress, or `window.XActions.abort()` to stop |
| "Could not find search input" | The DM dialog may not have opened properly. Refresh and try again |

---

## Related Scripts

- `browser/sendDirectMessage.js` -- Send individual DMs to a list of users
- `src/dmManager.js` -- Node.js DM management library
- `browser/dmCalls.js` -- Start audio/video calls in DMs
- `browser/encryptedDM.js` -- Send encrypted DMs
