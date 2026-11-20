---
title: "Audio and Video Calls in DMs on X (Twitter) — Tutorial"
description: "Start audio or video calls in X/Twitter DM conversations using XActions browser scripts."
keywords: ["twitter dm call", "x audio call", "twitter video call dm", "xactions dm calls", "start call twitter dm"]
author: "nich (@nichxbt)"
date: "2026-03-30"
---

# Audio and Video Calls in DMs — Tutorial

> Step-by-step guide to initiating audio and video calls within X/Twitter DM conversations using XActions browser scripts.

**Works on:** Browser Console
**Difficulty:** Beginner
**Time:** 1-2 minutes
**Requirements:** Logged into x.com, existing DM conversation with the target user

---

## Prerequisites

- Logged into x.com in your browser
- Browser DevTools console (F12 -> Console tab)
- An existing DM conversation with the user you want to call
- Both you and the other user must have DM calls enabled in settings

---

## Quick Start

1. Open x.com and navigate to **Messages** (`https://x.com/messages`)
2. Press **F12** to open DevTools, then click the **Console** tab
3. Copy the script from `browser/dmCalls.js`
4. Edit `CONFIG.username` and `CONFIG.callType`
5. Paste into the console and press Enter

---

## Configuration

```js
const CONFIG = {
  username: 'target_user',     // Username to call (without @)
  callType: 'audio',           // 'audio' or 'video'

  // Timing
  navigationDelay: 3000,       // Wait for page loads
  actionDelay: 2000,           // Wait between actions
  scrollDelay: 1500,           // Wait between scrolls when searching
  maxScrollAttempts: 20,       // Max scrolls to find conversation

  // Safety
  dryRun: true,                // Set to false to actually initiate call
};
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `username` | `string` | `'target_user'` | Username of the person to call (without @) |
| `callType` | `string` | `'audio'` | Type of call: `'audio'` or `'video'` |
| `navigationDelay` | `number` | `3000` | Milliseconds to wait for page loads |
| `actionDelay` | `number` | `2000` | Milliseconds between actions |
| `scrollDelay` | `number` | `1500` | Milliseconds between scrolls when searching for a conversation |
| `maxScrollAttempts` | `number` | `20` | Maximum scroll attempts to find the conversation |
| `dryRun` | `boolean` | `true` | Preview mode -- no call is actually initiated |

---

## Step-by-Step Guide

### Starting an Audio Call

**Step 1 -- Configure for audio**

```js
const CONFIG = {
  username: 'nichxbt',
  callType: 'audio',
  dryRun: true,
};
```

**Step 2 -- Run the script**

The script will:

1. Navigate to `x.com/messages` if not already there
2. Search through your conversations for the target user
3. Open the conversation
4. Click the audio call button

**Step 3 -- Check the dry run output**

```
Target: @nichxbt
Call type: audio
Looking for conversation with @nichxbt...
Found conversation with @nichxbt
Opened conversation
Initiating audio call with @nichxbt...

DM CALL SUMMARY
Conversation found: true
Audio call initiated: true
Duration: 8.2s
```

**Step 4 -- Go live**

Set `dryRun: false` and paste again to actually start the call.

### Starting a Video Call

Change `callType` to `'video'`:

```js
const CONFIG = {
  username: 'nichxbt',
  callType: 'video',
  dryRun: false,
};
```

The process is identical -- the script simply clicks the video call button instead of the audio call button.

---

## Tips & Tricks

- **Both users must enable DM calls.** Go to Settings -> Privacy and Safety -> Direct Messages and enable "Allow audio and video calls."
- **You need an existing conversation.** The script looks for an existing DM thread. If you have never messaged the user, send a DM first using `browser/sendDirectMessage.js`.
- **The conversation must be visible.** If the target conversation is far down your list, increase `maxScrollAttempts` to give the script more time to find it.
- **Audio calls use less bandwidth.** If you have a slow connection, prefer `'audio'` over `'video'`.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Could not find conversation with @user" | Make sure you have an existing DM conversation with this user. Send a DM first if needed |
| "Could not find audio/video call button" | DM calls may not be available for this conversation. Both users must have calls enabled |
| "Invalid callType" | Use `'audio'` or `'video'` (case-sensitive) |
| Call button exists but nothing happens | The other user may have calls disabled, or there may be a platform restriction |
| Script navigates away from messages | If you are not on `/messages`, the script will redirect. Run it again after the page loads |

---

## Related Scripts

- `browser/sendDirectMessage.js` -- Send DMs to users
- `browser/groupDM.js` -- Create group DM conversations
- `browser/encryptedDM.js` -- Send encrypted DMs
- `src/dmManager.js` -- Node.js DM management library
