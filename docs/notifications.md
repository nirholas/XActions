# Notifications

Multi-channel notification hub for XActions alerts. Send notifications via Email, Slack, Discord, and Telegram when events occur — follower changes, workflow completions, scheduled job results, and more.

## Architecture

```
src/notifications/
└── notifier.js   # Multi-channel notification sender
```

**Configuration:** `~/.xactions/config.json` under the `notifications` key.

## Quick Start

### Node.js

```javascript
import { Notifier } from 'xactions/src/notifications/notifier.js';

const notifier = new Notifier();
await notifier.load();  // Load config from ~/.xactions/config.json

// Configure channels
notifier.configure({
  email: { enabled: true, to: 'you@example.com', smtp: { host: 'smtp.gmail.com', port: 587, user: '...', pass: '...' } },
  slack: { enabled: true, webhookUrl: 'https://hooks.slack.com/services/...' },
  discord: { enabled: true, webhookUrl: 'https://discord.com/api/webhooks/...' },
  telegram: { enabled: true, botToken: '...', chatId: '...' }
});

// Send a notification
await notifier.send({
  type: 'follower_alert',
  title: 'Unfollower Detected',
  message: '@user123 unfollowed you',
  data: { username: 'user123', action: 'unfollow' },
  severity: 'warning'  // info | warning | critical
});
```

### CLI

```bash
xactions notify send "Test notification" --title "Hello" --severity info
xactions notify test slack
xactions notify configure
```

## REST API

Routes prefixed with `/api/notifications`. Requires authentication.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/notifications/send` | Send a notification |
| POST | `/api/notifications/test/:channel` | Send a test to a specific channel |
| POST | `/api/notifications/configure` | Update notification settings |

### Send a notification

```bash
curl -X POST http://localhost:3001/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{"message": "5 new unfollowers detected", "title": "Unfollower Alert", "severity": "warning"}'
```

### Test a channel

```bash
curl -X POST http://localhost:3001/api/notifications/test/slack
```

## Channels

### Email

```javascript
{
  email: {
    enabled: true,
    to: 'you@example.com',
    from: 'xactions@example.com',     // optional
    smtp: {
      host: 'smtp.gmail.com',
      port: 587,
      user: 'your-email@gmail.com',
      pass: 'app-password'
    }
  }
}
```

### Slack

```javascript
{
  slack: {
    enabled: true,
    webhookUrl: 'https://hooks.slack.com/services/T.../B.../xxx'
  }
}
```

Create a webhook at [api.slack.com/apps](https://api.slack.com/apps) → Incoming Webhooks.

### Discord

```javascript
{
  discord: {
    enabled: true,
    webhookUrl: 'https://discord.com/api/webhooks/123/abc'
  }
}
```

Create a webhook in Discord → Server Settings → Integrations → Webhooks.

### Telegram

```javascript
{
  telegram: {
    enabled: true,
    botToken: '123456:ABC-DEF',
    chatId: '-1001234567890'
  }
}
```

Create a bot via [@BotFather](https://t.me/BotFather). Get your chat ID by messaging the bot and checking `/getUpdates`.

## Severity Levels

| Level | Use Case |
|-------|----------|
| `info` | Routine updates — job completed, export ready |
| `warning` | Notable events — unfollowers detected, rate limit approaching |
| `critical` | Urgent — account restricted, stream errors, auth expired |

## Integration with Other Modules

Notifications integrate with:

- **Streams** — Alert on follower changes, new mentions
- **Workflows** — Notify on step completion/failure
- **Scheduler** — Report job execution results
- **Bulk operations** — Summary after batch completes

### Workflow Step Example

```javascript
{
  action: 'send_notification',
  params: {
    title: 'Workflow Complete',
    message: 'Found {{steps.0.result.count}} new leads',
    severity: 'info'
  }
}
```
