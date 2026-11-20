# ✉️ DM Automation

Export, manage, and automate X/Twitter Direct Messages.

## 📋 What It Does

1. Exports DM conversation list
2. Scrapes messages from conversations
3. Sends automated DMs
4. Exports conversations to JSON/CSV

## 🌐 Browser Console Script

```javascript
// Go to: x.com/messages
// Paste scripts/dmExporter.js
```

### Quick Conversation List

```javascript
(() => {
  const convos = [];
  document.querySelectorAll('[data-testid="conversation"]').forEach((c, i) => {
    convos.push({
      index: i + 1,
      name: c.querySelector('[dir="ltr"]')?.textContent?.trim() || '',
      lastMessage: c.querySelectorAll('span').length > 0 ?
        c.querySelectorAll('span')[c.querySelectorAll('span').length - 1]?.textContent?.trim()?.substring(0, 50) : '',
    });
  });
  console.table(convos);
})();
```

## 📦 Node.js Module

```javascript
import { sendDM, getConversations } from 'xactions/src/dmManager.js';
import { exportDMs } from 'xactions';

// Send a DM
await sendDM(page, 'username', 'Hello from XActions!');

// List conversations
const convos = await getConversations(page, { limit: 20 });

// Export all messages
const messages = await exportDMs(page, { format: 'json' });
```

## 🔧 MCP Server

```
Tool: x_send_dm
Input: { "username": "target_user", "message": "Hello!" }

Tool: x_export_dms
Input: { "limit": 50, "format": "json" }
```

## 💬 DM Features

| Feature | Description | Status |
|---------|-------------|--------|
| Text messages | Standard DMs | ✅ |
| Media sharing | Photos, GIFs, videos | ✅ |
| Group DMs | Up to 50 participants | ✅ |
| Voice messages | Audio DMs | ✅ |
| Encrypted DMs | End-to-end encryption | ✅ (opt-in) |
| Vanish mode | Auto-delete on read | 2026 |
| DM reactions | React with emoji | ✅ |
| Audio/video calls | In-app calling | 2025+ |

## ⚠️ Notes

- DM spam can result in account suspension — use delays
- Encrypted DMs require both parties to opt in
- Message requests from non-followers go to a separate inbox
- X limits DM sending rate — add 3-5 second delays between messages
- Vanish mode (2026) auto-deletes messages after they're read
