---
title: "Encrypted Direct Messages on X (Twitter) — Tutorial"
description: "Send encrypted DMs, check encryption status, and enable encrypted mode on X/Twitter using XActions."
keywords: ["twitter encrypted dm", "x encrypted messages", "xactions encrypted dm", "end to end encryption twitter", "secure dm twitter"]
author: "nich (@nichxbt)"
date: "2026-03-30"
---

# Encrypted Direct Messages — Tutorial

> Step-by-step guide to enabling encryption, checking encryption status, and sending encrypted DMs on X/Twitter using XActions browser scripts.

**Works on:** Browser Console
**Difficulty:** Intermediate
**Time:** 2-5 minutes
**Requirements:** Both users must have X Premium (verified) for encrypted DMs

---

## Prerequisites

- Logged into x.com in your browser
- Browser DevTools console (F12 -> Console tab)
- Both you and the recipient must have X Premium (verified accounts)
- Navigate to `https://x.com/messages` before running

---

## Quick Start

1. Open x.com and navigate to **Messages** (`https://x.com/messages`)
2. Press **F12** to open DevTools, then click the **Console** tab
3. Copy the script from `browser/encryptedDM.js`
4. Set `CONFIG.action` to `'send'`, `'check'`, or `'enable'`
5. Paste into the console and press Enter

---

## Configuration

```js
const CONFIG = {
  action: 'send',              // 'send', 'check', or 'enable'

  // Message settings (for 'send' action)
  username: 'target_user',     // Username to message (without @)
  message: 'This is a secret encrypted message',

  // Timing
  navigationDelay: 3000,
  actionDelay: 2000,
  typeCharDelay: 50,

  // Safety
  dryRun: true,                // Set to false to actually send
};
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `action` | `string` | `'send'` | Action to perform: `'send'`, `'check'`, or `'enable'` |
| `username` | `string` | `'target_user'` | Recipient username for the `'send'` action |
| `message` | `string` | `'This is a secret...'` | Message text for the `'send'` action |
| `navigationDelay` | `number` | `3000` | Milliseconds to wait for page loads |
| `actionDelay` | `number` | `2000` | Milliseconds between UI actions |
| `typeCharDelay` | `number` | `50` | Milliseconds between keystrokes |
| `dryRun` | `boolean` | `true` | Preview mode -- no actions are actually performed |

### Available Actions

| Action | Description |
|--------|-------------|
| `'send'` | Send an encrypted message to a user. Opens a new encrypted conversation, searches for the user, and sends the message |
| `'check'` | Check if the current open conversation is encrypted. Navigate to a DM conversation first |
| `'enable'` | Enable encrypted mode on the currently open conversation |

---

## Step-by-Step Guide

### Checking Encryption Status

Use this to verify whether an existing conversation uses end-to-end encryption.

**Step 1 -- Open a DM conversation**

Navigate to any DM conversation in `x.com/messages`.

**Step 2 -- Configure the script**

```js
const CONFIG = {
  action: 'check',
  dryRun: false,  // Safe for 'check' -- it only reads, never writes
};
```

**Step 3 -- Run and check output**

```
Checking encryption status of current conversation...
This conversation IS encrypted
End-to-end encryption is active
```

Or if not encrypted:

```
This conversation is NOT encrypted
Both users must be verified (Premium) to use encrypted DMs
```

### Enabling Encryption on an Existing Conversation

**Step 1 -- Open the conversation**

Navigate to the DM conversation you want to encrypt.

**Step 2 -- Configure**

```js
const CONFIG = {
  action: 'enable',
  dryRun: true,   // Preview first
};
```

**Step 3 -- Run for real**

Set `dryRun: false` and paste again. The script will find and click the encrypted DM toggle.

### Sending an Encrypted Message

**Step 1 -- Configure**

```js
const CONFIG = {
  action: 'send',
  username: 'nichxbt',
  message: 'This conversation is end-to-end encrypted. Only we can read this.',
  dryRun: true,
};
```

**Step 2 -- Preview**

Paste and check the dry run output:

```
Action: send
Sending encrypted message to @nichxbt...
Opening new encrypted conversation...
Enabling encryption for this conversation...
Searching for @nichxbt...
Typing encrypted message...
Encrypted message sent!
```

**Step 3 -- Send for real**

Set `dryRun: false` and paste again. The script will:

1. Click "New Message"
2. Toggle the encryption mode on
3. Search for the recipient
4. Select them and start the conversation
5. Type and send the encrypted message

---

## Tips & Tricks

- **Premium required.** Encrypted DMs are only available between X Premium (verified) users. If either party does not have Premium, the encryption toggle will not appear.
- **Use `'check'` freely.** The check action is read-only and safe to run with `dryRun: false` since it does not modify anything.
- **Encryption is per-conversation.** Enabling encryption on one conversation does not affect others.
- **Look for the lock icon.** Encrypted conversations display a lock icon in the conversation header.
- **State tracking.** Progress is saved to `sessionStorage` under `xactions_encryptedDM`.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Could not find encrypted DM toggle" | Both users must have X Premium. Check that you and the recipient are verified |
| "Could not find New DM button" | Navigate to `x.com/messages` first |
| "Could not find @username in results" | The username may be misspelled, or the user may not be eligible for encrypted DMs |
| Check says "NOT encrypted" but you enabled it | Encryption may require both users to have set up encryption keys. Check X's encrypted DM settings |
| Toggle found but encryption not activating | There may be additional confirmation steps. Try manually first to understand the flow |

---

## Related Scripts

- `browser/sendDirectMessage.js` -- Send regular (non-encrypted) DMs
- `browser/groupDM.js` -- Create group DM conversations
- `browser/dmCalls.js` -- Start audio/video calls in DMs
- `src/dmManager.js` -- Node.js DM management library
