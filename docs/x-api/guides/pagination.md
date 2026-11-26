# Pagination and time windows in the X API v2

Most list-style v2 endpoints return one page at a time. This guide covers the cursor model, page size ranges, and the time and id filters that narrow what you get. The official page is https://docs.x.com/x-api/fundamentals/pagination.

## The cursor model

1. Send your first request with `max_results` (and no token).
2. Look at the `meta` object in the response. It holds `result_count` and, when more data exists, `next_token`. It may also hold `previous_token`.
3. Send the same request again with the query parameter `pagination_token` set to that `next_token` value.
4. Stop when a response has no `next_token`.

```json
{
  "data": [ ... ],
  "meta": { "result_count": 100, "next_token": "7140w9gefhslx3", "previous_token": "77qp89slxjd" }
}
```

Rules worth knowing:

- Tokens are opaque strings. Do not parse, edit or build them. The spec describes them as base32hex values.
- Tokens can expire, so resume soon, or restart from the top if a stored token is rejected.
- A page can hold fewer than `max_results` and still not be the last. Keep going until `next_token` is absent.
- Keep every other parameter identical between pages (query, fields, filters).
- Results come newest first, within a page and across pages.
- Counts, recent search, full-archive search, community search and user search also accept a `next_token` request parameter. The spec says to send at most one of `next_token` and `pagination_token`. Use `pagination_token` everywhere for consistency.
- `previous_token` lets you step backwards with the same `pagination_token` parameter.

Each page is a separate request, so it counts against the endpoint's rate limit and, on pay-per-use plans, it is billed per resource returned. See [rate-limits.md](rate-limits.md) and [pricing-and-access.md](pricing-and-access.md).

## Page size (`max_results`)

The default and range depend on the endpoint. Always request the largest page you can use. Values below are from the OpenAPI spec (minimum, maximum, default where the spec states one).

Posts:

- `GET /2/tweets/search/recent`: 10 to 100, default 10.
- `GET /2/tweets/search/all`: 10 to 500, default 10.
- `GET /2/users/{id}/tweets`: 5 to 100.
- `GET /2/users/{id}/mentions`: 5 to 100.
- `GET /2/users/{id}/timelines/reverse_chronological`: 1 to 100.
- `GET /2/users/{id}/liked_tweets`: 5 to 100.
- `GET /2/tweets/{id}/quote_tweets`: 10 to 100, default 10.
- `GET /2/tweets/{id}/retweeted_by`: 1 to 100, default 100.
- `GET /2/tweets/{id}/liking_users`: 1 to 100, default 100.
- `GET /2/tweets/{id}/retweets`: 1 to 100, default 100.
- `GET /2/users/reposts_of_me`: 1 to 100, default 100.
- `GET /2/users/{id}/bookmarks`: 1 to 100.

Users and graph:

- `GET /2/users/{id}/followers` and `/following`: 1 to 1000.
- `GET /2/users/{id}/blocking`: 1 to 1000.
- `GET /2/users/{id}/muting`: 1 to 1000, default 100.
- `GET /2/users/search`: 1 to 1000, default 100.

Lists, spaces, DMs and others:

- `GET /2/lists/{id}/tweets`, `/members`, `/followers`: 1 to 100, default 100.
- `GET /2/users/{id}/owned_lists`, `/followed_lists`, `/list_memberships`: 1 to 100, default 100.
- `GET /2/spaces/search`: 1 to 100, default 100.
- `GET /2/dm_events` and the per-conversation DM lookups: 1 to 100, default 100.
- `GET /2/communities/search`: 10 to 100, default 10.
- `GET /2/news/search`: 1 to 100, default 10.
- `GET /2/tweets/search/stream/rules`: 1 to 1000, default 1000.
- `GET /2/activity/subscriptions`: 1 to 1000, default 1000.

Other limits may apply to your plan, so treat the OpenAPI spec and the endpoint reference as the source of truth.

## Walking forward in time: `since_id` and `until_id`

Post ids grow over time, so ids work as a cursor.

- `since_id`: return only posts with an id greater than this.
- `until_id`: return only posts with an id less than this.

They are supported on recent and full-archive search, the counts endpoints, `GET /2/users/{id}/tweets`, `/mentions`, and the reverse chronological timeline. Both must be numeric strings (up to 19 digits).

The standard polling pattern is: remember the highest id you have seen, then ask for `since_id=<that id>` next time. This is cheaper and more reliable than paging through everything again. For true real time, use a stream instead. See [streaming.md](streaming.md).

When both are given, `since_id` must be smaller than `until_id`.

## Time windows: `start_time` and `end_time`

- Format: ISO 8601 UTC, `YYYY-MM-DDTHH:mm:ssZ`.
- `start_time` is the oldest allowed time, `end_time` the newest. When both are present, start must be earlier than end.
- Recent search and recent counts: `start_time` must fall within the last 7 days.
- Full-archive search and counts reach back to 2006.
- `GET /2/users/{id}/tweets`: times must be on or after 2010-11-06.
- On search endpoints, the spec says you may send at most one of `start_time` and `since_id`, and at most one of `end_time` and `until_id`. Pick one style per side.

`start_time` and `end_time` also appear on the counts endpoints, analytics endpoints, some compliance and firehose streams (for replay), and the Activity stream.

## Other related parameters

- `sort_order` on search: `recency` (newest first, the default) or `relevancy`.
- `exclude` on user timelines and quote posts: any of `replies`, `retweets`.
- `granularity` on counts and analytics: `hourly`, `daily` or `total`. Counts use the same `next_token` or `pagination_token` paging across time buckets.

## A robust loop

```text
token = none
repeat:
  page = get(path, params + (pagination_token=token if token))
  handle(page.data, page.includes, page.errors)
  token = page.meta.next_token
until token is empty
```

Add rate-limit handling around `get` (see [rate-limits.md](rate-limits.md)) and persist `token` if the job may be interrupted.

---

The official docs at docs.x.com are authoritative. XActions is not affiliated with X Corp.
