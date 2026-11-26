# X API v2 rate limits

This guide explains how X API v2 rate limiting works and how to recover from it. Machine-readable per-endpoint numbers ship in `src/xapi/rate-limits.generated.js` (`rateLimitsFor(method, path)` in code, `xactions xapi describe <op>` on the command line). The official page, which is authoritative and can change, is https://docs.x.com/x-api/fundamentals/rate-limits. You can also see your own limits in the developer console at https://console.x.com.

## The model

Every endpoint has its own limit. A limit is a number of requests allowed in a fixed window.

- Most windows are 15 minutes. Some endpoints use a 24 hour window, and a few add a per-second cap.
- Limits are counted per app when you call with a bearer token (app-only).
- Limits are counted per user when you call with OAuth 1.0a or an OAuth 2.0 user access token.
- Some endpoints have both a short and a daily limit. You must stay under both. Posting a DM, for example, is limited per 15 minutes and per 24 hours.
- An endpoint can be unavailable to one scope entirely. The published tables show a dash for those (for example, `/2/users/me` has only a per-user limit, because "me" needs a user).

Rate limits and billing are separate things. You can be inside your rate limit and still spend credits, or hit a limit and spend nothing. See [pricing-and-access.md](pricing-and-access.md).

## Examples of published numbers

These are samples from the docs as of 2026-11-26. Do not hard-code them. Read the headers at run time.

- `GET /2/tweets/{id}`: 450 per 15 minutes per app, 900 per 15 minutes per user.
- `GET /2/tweets` (batch lookup): 3,500 per app, 5,000 per user, per 15 minutes.
- `GET /2/tweets/search/recent`: 450 per app, 300 per user, per 15 minutes.
- `GET /2/tweets/search/all`: 1 per second plus 300 per 15 minutes per app, 1 per second per user.
- `POST /2/tweets`: 10,000 per 24 hours per app, 100 per 15 minutes per user.
- `GET /2/users/by/username/{username}`: 300 per app, 900 per user, per 15 minutes.
- `GET /2/users/me`: 75 per 15 minutes per user.
- `POST /2/users/{id}/likes`: 50 per 15 minutes and 1,000 per 24 hours per user.
- `GET /2/dm_events`: 15 per 15 minutes per user.

The docs also publish stream limits: one connection to the filtered stream, 1,000 rules, 1,024 characters per rule, and up to 250 posts per second delivered. See [streaming.md](streaming.md).

## Response headers

Every response from a rate-limited endpoint carries three headers:

- `x-rate-limit-limit`: the ceiling for the current window.
- `x-rate-limit-remaining`: how many calls you have left in it.
- `x-rate-limit-reset`: the Unix time (seconds) at which the window resets.

These describe the bucket that applied to this call, so they differ between app-only and user-context calls. A good client reads them on every response, not just on errors.

## What a 429 looks like

When you exceed a limit the API returns HTTP 429. Older style bodies carry an `errors` array with code 88 and the message "Rate limit exceeded". Newer responses can use the problem format with type `https://api.x.com/2/problems/rate-limit-exceeded`. The type `usage-capped` also arrives on 429 and means a spending or volume cap, not a window, so waiting for the reset header will not help. See [errors.md](errors.md).

## Recovery strategy

1. On 429, read `x-rate-limit-reset`. Sleep until that time, then add a little jitter (a second or two) so a fleet of workers does not wake at once.
2. If the header is missing, fall back to exponential backoff with a floor (60 seconds is a reasonable start for 15 minute windows) and a cap.
3. Never retry in a tight loop. Repeated 429s waste time and can look abusive.
4. Retry 5xx responses with exponential backoff and jitter, with a maximum attempt count.
5. Keep per-endpoint and per-credential state. A 429 on search says nothing about your lookup bucket, and a second user token has its own bucket.

Pseudocode:

```text
loop:
  response = send(request)
  remember(response.headers, endpoint, credential)
  if response.status == 429:
      wait = max(reset - now, 1) + jitter
      sleep(wait)
      continue
  return response
```

## Avoiding limits in the first place

- Proactive pacing: when `remaining` reaches zero, pause until `reset` before the next call to that endpoint.
- Batch where the API allows it. Use `GET /2/tweets?ids=...` (up to 100 ids) and `GET /2/users?ids=...` rather than many single lookups.
- Request the maximum `max_results` for list endpoints, so one page does more work. See [pagination.md](pagination.md).
- Cache. The same resource is rarely worth fetching twice a day, and on pay-per-use plans repeat reads within a UTC day are deduplicated for billing anyway.
- Prefer streaming (filtered stream or the Activity API) over polling search. See [streaming.md](streaming.md) and [webhooks-and-activity.md](webhooks-and-activity.md).
- Spread work across the window instead of bursting at the start.

## Enterprise

Enterprise customers get custom limits through their account agreement. See https://docs.x.com/enterprise-api/introduction.

---

The official docs at docs.x.com are authoritative. XActions is not affiliated with X Corp.
