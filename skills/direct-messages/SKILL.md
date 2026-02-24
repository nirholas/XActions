---
name: direct-messages
description: Manage X/Twitter Direct Messages including text DMs, group chats, message requests, vanish mode, end-to-end encryption, audio/video calls, reactions, and DM export. Automate DM workflows and bulk operations.
license: MIT
metadata:
  author: nichxbt
  version: "3.0"
---

# Direct Messages with XActions

Automate and manage X/Twitter Direct Messages.

## Features

- **DMs**: Send and receive text messages (individuals and groups)
- **Message Requests**: Approve/decline messages from non-followers
- **Vanish Mode**: Auto-delete messages after viewing
- **Encryption**: End-to-end encrypted conversations
- **Audio/Video Calls**: In-DM voice and video calls
- **Reactions**: Emoji reactions on messages
- **Blocking**: Prevent DMs from blocked users
- **Group Chats**: Multi-user conversations
- **DM Export**: Scrape and export DM history

## Browser Console Script

**File:** `scripts/dmExporter.js`

### How to use

1. Navigate to `x.com/messages`
2. Open DevTools (F12) → Console
3. Paste the script → Enter

### Key selectors

| Element | Selector |
|---------|----------|
| Messages tab | `a[href="/messages"]` |
| Conversation list | `[data-testid="conversation"]` |
| Message input | `[data-testid="dmComposerTextInput"]` |
| Send button | `[data-testid="dmComposerSendButton"]` |
| New message | `[data-testid="NewDM_Button"]` |
| Search people | `[data-testid="searchPeople"]` |
| Message bubble | `[data-testid="messageEntry"]` |
| Reaction button | `[data-testid="messageReaction"]` |

## MCP Tools

- `x_send_dm` – Send a direct message
- `x_get_dms` – Get DM conversations
- `x_export_dms` – Export DM history
- `x_dm_settings` – Manage DM preferences

## API Endpoints

- `GET /api/messages` – List conversations
- `GET /api/messages/:conversationId` – Get messages in conversation
- `POST /api/messages/send` – Send a DM
- `GET /api/messages/export` – Export DM history
- `PUT /api/messages/settings` – Update DM preferences

## Related Files

- `src/dmManager.js` – Core DM management module
- `scripts/dmExporter.js` – Browser DM export script
- `scripts/scrapeDMs.js` – DM scraping script

## Notes

- DM export is for your own conversations only
- End-to-end encryption available for verified accounts
- Vanish mode auto-deletes after both parties leave chat
- Audio/video calls available in DMs
- Group chats support up to 50 participants
- Message requests must be approved for non-followers
