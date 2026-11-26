# Webhooks and activity

Two product families push account events to you. The Account Activity API is the older one and is being deprecated. The X Activity API is the newer one. Both can deliver over a webhook, and the newer one can also deliver over a persistent HTTP stream.

Official pages: https://docs.x.com/x-api/webhooks/introduction, https://docs.x.com/x-api/account-activity/introduction and https://docs.x.com/x-api/activity/introduction

## Webhook basics

A webhook is a public HTTPS URL on your server. X sends JSON events to it with POST requests. You answer 200 to acknowledge.

URL rules:

- HTTPS only, reachable from the public internet.
- No port in the URL. `https://example.com:5000/hook` does not work.
- The path is yours to choose.

Your endpoint handles two request types: GET for the challenge check and POST for events.

Webhook management endpoints, called with a bearer token:

- `POST /2/webhooks` registers a URL. It triggers a challenge immediately.
- `GET /2/webhooks` lists webhooks and shows whether each is valid.
- `PUT /2/webhooks/{webhook_id}` asks for a new challenge.
- `DELETE /2/webhooks/{webhook_id}` removes it.
- `POST /2/webhooks/replay` requests a replay of past events, with a webhook id and a `from_date` and `to_date` in `yyyymmddhhmm` UTC form.

Filtered stream posts can also be delivered to a webhook through `POST /2/tweets/search/webhooks/{webhook_id}`, `GET /2/tweets/search/webhooks` and `DELETE /2/tweets/search/webhooks/{webhook_id}`.

## The CRC challenge

X proves you control a URL with a challenge-response check. It sends:

```
GET https://your.host/webhook?crc_token=<random string>
```

You return JSON:

```json
{ "response_token": "sha256=<base64 digest>" }
```

The algorithm:

1. Take the `crc_token` query value as the message, as UTF-8 bytes.
2. Take your app's OAuth 2.0 client secret as the key. The OAuth 1.0 consumer secret (API secret) also works for older integrations.
3. Compute HMAC-SHA256 of the message with that key.
4. Base64-encode the raw 32-byte digest (not hex).
5. Prefix the string `sha256=`.

In pseudocode: `"sha256=" + base64(hmac_sha256(secret, crc_token))`.

Node:

```js
import crypto from 'node:crypto';

export function crcResponse(secret, crcToken) {
  const digest = crypto.createHmac('sha256', secret).update(crcToken).digest('base64');
  return { response_token: `sha256=${digest}` };
}
```

The bearer token you use to call `/2/webhooks` is not part of this computation. Only the client secret or consumer secret is.

### When a challenge is sent

- On registration.
- On an explicit `PUT`.
- On a schedule. The docs give two timings for this, hourly in one place and every 30 minutes when no check has succeeded in the last 24 hours in another. Plan for at least hourly.

### What makes a webhook invalid

An invalid webhook stops receiving events until it passes again. Causes:

- A 2xx reply with a wrong `response_token`.
- A 3xx reply, so do not redirect.
- A TLS error.
- Transient failures (4xx, 5xx, timeouts, closed channels) that persist so no check succeeds for more than 28 hours.

Check status with `GET /2/webhooks`.

## Verifying event signatures

Every POST carries a signature of the raw request body in the same `sha256=<base64>` form.

- `X-Twitter-Webhooks-Signature-OAuth2`: keyed with the OAuth 2.0 client secret. Prefer this.
- `X-Twitter-Webhooks-Signature`: keyed with the OAuth 1.0 consumer secret. Legacy.

Apps with both secrets may get both headers during migration. Verify the OAuth 2.0 one first and fall back to the other if you still need it.

Compute the HMAC over the exact bytes received, before any JSON parsing, and compare with a constant-time function such as `crypto.timingSafeEqual`. Reject on mismatch.

## Account Activity API

Status: deprecated in favor of the X Activity API. Existing integrations keep working.

Flow:

1. Register a webhook with `POST /2/webhooks`.
2. Subscribe user accounts to it. `POST /2/account_activity/webhooks/{webhook_id}/subscriptions/all` subscribes the user whose user-context token signs the request.
3. Receive events for that user.

Other endpoints: `GET .../subscriptions/all` checks whether a subscription exists, `GET .../subscriptions/all/list` lists all, `DELETE /2/account_activity/webhooks/{webhook_id}/subscriptions/{user_id}/all` removes one, and `GET /2/account_activity/subscriptions/count` shows usage.

Each subscribed user gets, for activity they perform or receive: posts and deletes, mentions, replies, reposts, quotes, likes, follows and unfollows, blocks and unblocks, mutes and unmutes, DMs sent and received, typing indicators, read receipts and subscription revokes. It does not deliver home timeline data. Delivered posts count toward the monthly post cap.

Pay-per-usage accounts get 3 unique subscriptions and 1 webhook. Enterprise gets 5,000 or more subscriptions and 5 or more webhooks.

## X Activity API

Instead of subscribing a user, you subscribe to an event type with a filter, usually a user id. Events flow to a webhook or to a persistent stream.

Endpoints:

- `POST /2/activity/subscriptions` creates a subscription. The body has `event_type` and `filter`, and may have `tag`, `expires_at` and `webhook_id`.
- `GET /2/activity/subscriptions` lists them.
- `PUT /2/activity/subscriptions/{subscription_id}` changes the tag or webhook.
- `DELETE /2/activity/subscriptions/{subscription_id}` removes one. `DELETE /2/activity/subscriptions` removes several.
- `GET /2/activity/stream` opens the streaming delivery. It allows 2 connections.

Event types, grouped:

- Posts: `post.create`, `post.delete`, `post.mention.create`, `post.reply.create`, `post.quote.create`, `post.repost.create`
- Likes: `like.create` with an optional `direction` filter of `outbound` or `inbound`
- Follows: `follow.follow`, `follow.unfollow`
- Paid subscriptions: `subscriptions.subscribe`, `subscriptions.unsubscribe`
- Profile changes: `profile.update.bio`, `.profile_picture`, `.banner_picture`, `.screenname`, `.handle`, `.geo`, `.url`, `.verified_badge`, `.affiliate_badge`
- Encrypted chat: `chat.received`, `chat.sent`, `chat.conversation_join` (the spec spells the canonical name `chat.conversation.join`)
- Direct messages: `dm.received`, `dm.sent`, `dm.read`, `dm.indicate_typing`
- Spaces: `spaces.start`, `spaces.end`
- Broadcasts: `broadcast.start`, `broadcast.end`, `broadcast.chat`, `broadcast.chat.remove`
- Moderation: `mute.mute`, `mute.unmute`, `block.block`, `block.unblock`
- News: `news.new`, filtered by keyword
- Authorization: `oauth.revoke`, which carries no filter

Privacy decides which token you need. Public events such as `post.create` and `broadcast.start` work with an app-only token. Private events need an OAuth 2.0 user token from the person concerned, with the matching read scope, for example `mute.read`, `block.read`, `follows.read` or `broadcast.read`. Likes are private too. Posts from protected accounts are never delivered.

Post events are billed as post reads. Other events have per-event prices, summarized in [pricing-and-access.md](pricing-and-access.md). For keyword or boolean filtering of posts, use the filtered stream instead.

## Operating a receiver

- Answer fast. Acknowledge with 200 and queue the work.
- Be idempotent. Retries and replays can repeat events.
- Log the raw body with the verified signature result while you build.
- Use replay (`POST /2/webhooks/replay`) to fill gaps after downtime.
- Rotate secrets deliberately. Changing the client secret changes the signature key.

The official docs at docs.x.com are authoritative, and XActions is not affiliated with X Corp.
