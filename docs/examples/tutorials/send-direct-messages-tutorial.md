---
title: "Send Direct Messages on X (Twitter) — Tutorial"
description: "Send personalized DMs to one or multiple users on X/Twitter using XActions browser scripts and Node.js library."
keywords: ["twitter dm automation", "send direct messages twitter", "bulk dm twitter", "xactions dm", "twitter dm script", "mass dm x"]
author: "nich (@nichxbt)"
date: "2026-03-30"
---

# Send Direct Messages — Tutorial

> Step-by-step guide to sending single and bulk direct messages on X/Twitter using XActions browser scripts and the Node.js library.

**Works on:** Browser Console | Node.js (Puppeteer)
**Difficulty:** Beginner
**Time:** 2-15 minutes
**Requirements:** Logged into x.com in your browser

---

## Prerequisites

- Logged into x.com in your browser
- Browser DevTools console (F12 -> Console tab)
- Navigate to `https://x.com/messages` before running

---

## Quick Start

1. Open x.com and navigate to **Messages** (`https://x.com/messages`)
2. Press **F12** to open DevTools, then click the **Console** tab
3. Copy the script from `browser/sendDirectMessage.js`
4. Edit the `CONFIG` section with your target users and message
5. Paste into the console and press Enter

---

## Configuration

### Browser Script (`browser/sendDirectMessage.js`)

```js
const CONFIG = {
  targetUsers: [
    'username1',
    'username2',
    'username3',
  ],
  // Use {username} as placeholder for recipient's name
  messageTemplate: `Hey {username}! Just wanted to connect.`,
  limits: {
    messagesPerSession: 10,       // Max DMs per run
    delayBetweenMessages: 30000,  // 30 seconds between messages
  },
  skipIfAlreadyMessaged: true,    // Skip users you already messaged
  dryRun: true,                   // Set to false to actually send
};
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `targetUsers` | `string[]` | `[]` | Usernames (without @) to message |
| `messageTemplate` | `string` | `'Hey {username}! ...'` | Message text. `{username}` is replaced with the recipient's username |
| `limits.messagesPerSession` | `number` | `10` | Maximum DMs sent in one run |
| `limits.delayBetweenMessages` | `number` | `30000` | Milliseconds between each DM |
| `skipIfAlreadyMessaged` | `boolean` | `true` | Skip users already in your DM history |
| `dryRun` | `boolean` | `true` | Preview mode -- no messages are actually sent |

---

## Step-by-Step Guide

### Method 1: Browser Script (Single or Bulk DMs)

**Step 1 -- Navigate to Messages**

Go to `https://x.com/messages` in your browser.

**Step 2 -- Open DevTools**

Press F12 (or Cmd+Option+J on Mac) to open the browser console.

**Step 3 -- Configure your recipients**

Edit the CONFIG in `browser/sendDirectMessage.js`:

```js
const CONFIG = {
  targetUsers: [
    'elonmusk',
    'nichxbt',
  ],
  messageTemplate: `Hey {username}! I saw your recent post and wanted to reach out.`,
  limits: {
    messagesPerSession: 5,
    delayBetweenMessages: 45000,  // 45 seconds for safety
  },
  skipIfAlreadyMessaged: true,
  dryRun: true,  // Start with true to preview
};
```

**Step 4 -- Dry run first**

Paste the script and run. You will see output like:

```
[DRY RUN] Would send to @elonmusk: "Hey elonmusk! I saw your recent post..."
[DRY RUN] Would send to @nichxbt: "Hey nichxbt! I saw your recent post..."
```

**Step 5 -- Send for real**

Change `dryRun: false` and paste again. The script will:

1. Click the "New Message" button
2. Search for each user
3. Select them from results
4. Type and send your personalized message
5. Navigate back and repeat for the next user

### Method 2: Node.js Library (`src/dmManager.js`)

The `dmManager.js` module provides Puppeteer-based functions for more advanced DM workflows.

**Send a single DM:**

```js
import { sendDM } from './src/dmManager.js';

// Assumes you have a Puppeteer page already authenticated
const result = await sendDM(page, 'nichxbt', 'Hello from XActions!');
console.log(result);
// { success: true, recipient: 'nichxbt', message: 'Hello from XActions!', timestamp: '...' }
```

**List conversations:**

```js
import { getConversations } from './src/dmManager.js';

const { conversations } = await getConversations(page, { limit: 20 });
conversations.forEach(c => {
  console.log(`${c.name}: ${c.lastMessage} (${c.unread ? 'UNREAD' : 'read'})`);
});
```

**Export a conversation:**

```js
import { exportConversation } from './src/dmManager.js';

const data = await exportConversation(page, 'https://x.com/messages/12345', { limit: 100 });
console.log(`Exported ${data.count} messages`);
```

**View message requests:**

```js
import { getMessageRequests } from './src/dmManager.js';

const { requests } = await getMessageRequests(page);
requests.forEach(r => {
  console.log(`Request from ${r.name}: "${r.preview}"`);
});
```

**Update DM privacy settings:**

```js
import { updateDMSettings } from './src/dmManager.js';

await updateDMSettings(page, { allowDMsFrom: 'everyone' });
```

---

## Tips & Tricks

- **Always dry run first.** Set `dryRun: true` and check the console output before sending real messages.
- **Use personalization.** The `{username}` placeholder makes messages feel less spammy.
- **Increase delays for safety.** X rate-limits DMs aggressively. Use at least 30 seconds between messages. For larger batches, 45-60 seconds is safer.
- **DM history is tracked.** The browser script uses `localStorage` key `xactions_dm_sent` to track who you have already messaged, so re-running the script will skip previously messaged users.
- **Clear DM history tracking.** Run `localStorage.removeItem('xactions_dm_sent')` in the console to reset the sent history.
- **Keep batches small.** Limit to 10-20 DMs per session to avoid account restrictions.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Search input not found" | Make sure you are on `x.com/messages` before running the script |
| User not found in search | Double-check the username spelling. The user may have DMs disabled or may have blocked you |
| Script stops mid-run | X may have rate-limited you. Wait 15-30 minutes and try again with fewer users |
| "Navigate to x.com/messages first!" | The script checks your URL. Navigate to the messages page and try again |
| Messages not actually sending | Make sure `dryRun` is set to `false` |
| Previously messaged users still showing | The script checks `localStorage`. If you cleared browser data, the history is lost |

---

## Related Scripts

- `browser/groupDM.js` -- Create group DM conversations
- `browser/dmCalls.js` -- Start audio/video calls in DMs
- `browser/encryptedDM.js` -- Send encrypted DMs
- `src/dmManager.js` -- Node.js DM management library (Puppeteer)
