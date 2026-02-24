---
name: direct-messages
description: Send, manage, and automate direct messages on X/Twitter. View DM history, send personalized bulk DMs with templates, export conversations, and filter message requests. Use when users need to manage DMs or automate direct messaging.
license: MIT
metadata:
  author: nichxbt
  version: "3.0"
---

# Direct Messages with XActions

Browser console scripts for sending, managing, and exporting X/Twitter DMs.

## Available Scripts

| Script | File | Purpose |
|--------|------|---------|
| Send Direct Messages | `src/sendDirectMessage.js` | Send personalized DMs to a list of users |
| DM Manager | `src/dmManager.js` | Core DM management (read, filter, organize) |
| DM Exporter | `scripts/scrapeDMs.js` | Export DM conversation history |

## Send Direct Messages

**File:** `src/sendDirectMessage.js`

Send personalized DMs to multiple users with message templates and rate limiting.

### Configuration

```javascript
const CONFIG = {
  targetUsers: ['user1', 'user2'],
  messageTemplate: 'Hey {username}! 👋 Just wanted to connect.',
  limits: {
    messagesPerSession: 10,
    delayBetweenMessages: 30000,
  },
  skipIfAlreadyMessaged: true,
  dryRun: true,
};
```

### How to use

1. Navigate to `x.com/messages`
2. Edit CONFIG with users and message
3. Set `dryRun = false`
4. Open DevTools (F12) → Console
5. Paste the script → Enter

### Safety features

- Tracks sent messages in localStorage to avoid duplicates
- Configurable delay between messages (30s default)
- Session limit prevents over-messaging
- Dry-run mode for previewing

**Warning:** Mass DMing can get your account restricted. Only message users who have open DMs or follow you.

## DM Manager

**File:** `src/dmManager.js`

Core module for reading, filtering, and organizing DM conversations.

## DM Exporter

**File:** `scripts/scrapeDMs.js`

Export DM history as JSON. Navigate to `x.com/messages`, open a conversation, paste the script.

## Key Selectors

| Element | Selector |
|---------|----------|
| New message button | `[data-testid="NewDM_Button"]` |
| Search people | `[data-testid="searchPeople"]` |
| Message input | `[data-testid="dmComposerTextInput"]` |
| Send button | `[data-testid="dmComposerSendButton"]` |
| Conversation list | `[data-testid="conversation"]` |
| Message bubble | `[data-testid="messageEntry"]` |
| Back button | `[data-testid="app-bar-back"]` |

## MCP Tools

- `x_send_dm` – Send a direct message
- `x_get_dms` – Get DM conversations
- `x_export_dms` – Export DM history

## Notes

- DM scripts require being on the Messages page (`x.com/messages`)
- Export is for your own conversations only
- Group chats support up to 50 participants
- Message requests from non-followers must be approved before replying
- Add delays (30s+) between bulk DMs to avoid rate limits
