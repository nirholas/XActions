# 💬 Send Direct Messages

Send personalized DMs to a list of X/Twitter users.

---

## ⚠️ WARNING

> **Mass DMing can get your account restricted!**
> - Only message users who have open DMs or follow you
> - Don't spam — personalize your messages
> - Use long delays between messages
> - Start with small batches

---

## 📋 What It Does

1. Opens the Messages page
2. For each user: clicks New Message → searches → selects user → types message → sends
3. Tracks sent history in localStorage to avoid duplicates
4. Respects configurable delays and session limits

---

## 🌐 Browser Console Script

**Steps:**
1. Go to `x.com/messages`
2. Edit CONFIG with users and message template
3. Set `dryRun = false`
4. Open console (F12) and paste `browser/sendDirectMessage.js`

**Configuration:**
```javascript
const CONFIG = {
  targetUsers: ['user1', 'user2'],
  messageTemplate: 'Hey {username}! 👋 Just wanted to connect.',
  limits: {
    messagesPerSession: 10,
    delayBetweenMessages: 30000,  // 30 seconds between messages
  },
  skipIfAlreadyMessaged: true,
  dryRun: true,
};
```

---

## 🔑 Template Variables

| Variable | Replaced With |
|----------|--------------|
| `{username}` | Recipient's username |

---

## 📁 Files

- `browser/sendDirectMessage.js` — Main DM script
- `scripts/twitter/send-direct-message.js` — Extended DevTools version

## ⚠️ Notes

- Must be on the Messages page (`x.com/messages`) before running
- Sent messages are tracked in `localStorage` under `xactions_dm_sent`
- Failed messages are logged — check users have open DMs
- 30-second delay between messages is the recommended minimum
