---
name: webhooks
description: Create, manage, and test webhooks in XActions. Get notified via HTTP when automation jobs complete, followers change, or operations finish. Use when users want to integrate XActions events into external systems.
license: Apache-2.0
metadata:
  author: nichxbt
  version: "1.0"
---

# Webhooks

API-powered webhook system for receiving real-time event notifications from XActions.

## Entry Points

| Goal | Route | Method |
|------|-------|--------|
| Create a webhook | `POST /api/webhooks` | REST API |
| List webhooks | `GET /api/webhooks` | REST API |
| Update a webhook | `PATCH /api/webhooks/:id` | REST API |
| Delete a webhook | `DELETE /api/webhooks/:id` | REST API |
| Test a webhook | `POST /api/webhooks/:id/test` | REST API |

## API Usage

### Create a webhook

```bash
POST /api/webhooks
Authorization: Bearer <token>
Content-Type: application/json

{
  "url": "https://your-server.com/webhook",
  "events": ["operation.complete", "follower.lost", "follower.gained"],
  "secret": "your-signing-secret"
}
```

### Test a webhook

```bash
POST /api/webhooks/:id/test
Authorization: Bearer <token>
```

Sends a test payload to the registered URL.

## Supported Events

| Event | Triggered when |
|-------|---------------|
| `operation.complete` | An automation job finishes successfully |
| `operation.failed` | An automation job fails |
| `follower.gained` | You gain a new follower |
| `follower.lost` | You lose a follower |
| `job.started` | A Bull queue job begins |
| `job.completed` | A Bull queue job completes |

## Payload Verification

Webhooks are signed with HMAC-SHA256 using your secret:

```js
const signature = req.headers['x-xactions-signature'];
const expected = crypto.createHmac('sha256', secret)
  .update(JSON.stringify(req.body))
  .digest('hex');
const isValid = crypto.timingSafeEqual(
  Buffer.from(signature),
  Buffer.from(expected)
);
```

## Notes

- Webhook deliveries are retried up to 3 times on failure (exponential backoff)
- Delivery logs are available via `GET /api/webhooks/:id/deliveries`
- Events are dispatched asynchronously from the Bull job queue

## Related Skills

- **xactions-mcp-server** — AI agent integration alternative to webhooks
- **follower-monitoring** — Source of `follower.gained` / `follower.lost` events
- **analytics-insights** — Pull analytics instead of waiting for events
