---
name: direct-messages
description: Sends, manages, and automates direct messages on X/Twitter. Supports personalized bulk DMs with templates, conversation management, message request filtering, and DM export. The agent uses this skill when a user needs to send DMs, manage conversations, or automate direct messaging workflows.
license: MIT
metadata:
  author: nichxbt
  version: "3.0"
---

# Direct Messages

Browser console scripts for sending, managing, and exporting X/Twitter DMs.

## Available Scripts

| Script | File | Purpose |
|--------|------|---------|
| Send Direct Messages | `src/sendDirectMessage.js` | Send personalized DMs to a list of users |
| DM Manager | `src/dmManager.js` | Core DM management (read, filter, organize, export) |

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
2. Edit CONFIG with target users and message template
3. Set `dryRun: false` when ready
4. Open DevTools (F12) → Console
5. Paste the script → Enter

### Safety features

- Tracks sent messages in `localStorage` to avoid duplicates
- Configurable delay between messages (30s default)
- Session limit prevents over-messaging
- Dry-run mode previews actions without sending

**Warning:** Mass DMing can get your account restricted. Only message users who have open DMs or follow you.

## DM Manager

**File:** `src/dmManager.js`

Core module for reading, filtering, organizing, and exporting DM conversations. Supports message requests, conversation search, and DM privacy settings.

### How to use

1. Navigate to `x.com/messages`
2. Open DevTools (F12) → Console
3. Paste the script → Enter

## Key Selectors

| Element | Selector |
|---------|----------|
| New message button | `[data-testid="NewDM_Button"]` |
| Search people | `[data-testid="searchPeople"]` |
| Message input | `[data-testid="dmComposerTextInput"]` |
| Send button | `[data-testid="dmComposerSendButton"]` |
| Conversation list | `[data-testid="conversation"]` |
| Message bubble | `[data-testid="messageEntry"]` |
| Message requests | `[data-testid="messageRequests"]` |
| Back button | `[data-testid="app-bar-back"]` |

## Notes

- DM scripts require being on the Messages page (`x.com/messages`)
- Group chats support up to 50 participants
- Message requests from non-followers must be approved before replying
- Add delays (30s+) between bulk DMs to avoid rate limits
- `{username}` placeholder in templates is replaced with the recipient's handle
- Sent history is persisted in `localStorage` across sessions
