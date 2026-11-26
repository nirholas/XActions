# Streaming

Streaming endpoints keep one HTTP connection open and push posts to you as they happen. Polling asks "anything new?" over and over. A stream answers once, continuously.

Official pages: https://docs.x.com/x-api/posts/filtered-stream/introduction, https://docs.x.com/x-api/posts/volume-streams/introduction and https://docs.x.com/x-api/fundamentals/consuming-streaming-data

## Kinds of stream

- Filtered stream, `GET /2/tweets/search/stream`: delivers only posts that match rules you register.
- Sampled streams: `GET /2/tweets/sample/stream` (about 1 percent of all posts) and `GET /2/tweets/sample10/stream` (about 10 percent, often called the Decahose). Enterprise arrangements apply to the larger volume.
- Firehose: `GET /2/tweets/firehose/stream`, plus language-specific variants for English, Japanese, Korean and Portuguese. Enterprise only, and it takes a `partition` parameter.
- Likes streams: `/2/likes/firehose/stream` and `/2/likes/sample10/stream`.
- Compliance streams: `/2/tweets/compliance/stream`, `/2/users/compliance/stream`, `/2/likes/compliance/stream` and `/2/tweets/label/stream`. They report deleted or changed content that you must honor.
- Activity stream, `GET /2/activity/stream`, covered in the webhooks and activity guide.
- A separate low-latency product, Powerstream, exists for faster delivery and is documented on its own pages.

Streams use an app-only bearer token. Stream posts are shaped by the same `tweet.fields`, `expansions`, `user.fields`, `media.fields`, `poll.fields` and `place.fields` parameters as other post endpoints.

## Filtered stream rules

A rule is a query plus an optional tag. The stream returns any post that matches at least one rule. The rule language is the search language from the search guide, with extra stream-only operators.

Endpoints:

- `POST /2/tweets/search/stream/rules` adds and deletes rules.
- `GET /2/tweets/search/stream/rules` lists rules. Pass `ids` to fetch some of them.
- `GET /2/tweets/search/stream/rules/counts` shows how many rules you use against your cap.

Add rules by sending a body with an `add` list. Each item has a `value` and may have a `tag`:

```json
{ "add": [
  { "value": "cats has:images -is:retweet", "tag": "cat pictures" },
  { "value": "from:alice OR from:bob", "tag": "friends" }
] }
```

Delete by id, or by a list of ids:

```json
{ "delete": { "ids": ["1234567890"] } }
```

Useful query parameters on the rules POST: `dry_run=true` validates a change without applying it, and `delete_all=true` clears everything.

Rules persist on the server between connections. You can change them while a stream is connected, and the change takes effect without a reconnect.

### Matching information

Each delivered post carries `matching_rules`, a list of `{id, tag}` for the rules it matched. Use tags to route posts in your code. A post that matches three rules shows up once with three entries.

### Limits

- Pay-per-usage: 1 connection, 1,000 rules, 1,024 characters per rule, and delivery up to 250 posts per second.
- Enterprise: 25,000 or more rules, 2,048 characters per rule, and delivery set by contract.
- Connecting to the filtered stream endpoint is limited to 50 requests per 15 minutes per app. The sample10 stream allows 100.
- Rule changes are limited per window. Run `xactions xapi describe updateRules` for the published numbers, or see [rate-limits.md](rate-limits.md).

When no rules exist the stream answers 409. Add a rule first.

### Stream-only operators

Besides the search operators:

- `"a b"~N`: two words within N words of each other, N up to 6.
- `sample:N`: keep N percent of matches.
- `bio:`, `bio_name:`, `bio_location:`: match the author's profile text.
- `min_followers:`, `followers_count:`, `following_count:`, `tweets_count:`, `listed_count:`: author size filters.
- `source:`, `url_title:`, `url_description:`, `url_contains:`: client and link filters.
- `from_affiliate_of:`, `to_affiliate_of:`: affiliation filters.

Enterprise accounts have embedding-based operators on top. Several of these are conjunction-required, so pair them with a keyword.

## Keep-alives and framing

The server sends a bare line break about every 20 seconds when there is no data. Treat posts as newline-delimited JSON. A read loop splits on the newline and ignores empty lines.

Your client must tolerate:

- fields in any order and missing fields
- posts out of order
- duplicates
- new message types appearing over time

## Disconnections

Disconnects are normal. Causes include server restarts, a client that reads too slowly, network trouble, quota exhaustion, a duplicate login and too many connections. Error bodies use titles such as `operational-disconnect` and a `ConnectionException` with `connection_issue: TooManyConnections`.

Detect a dead connection by timing: if nothing at all, not even the keep-alive, arrives for 20 seconds, drop and reconnect. Set the HTTP read timeout near that value.

### Reconnect backoff

Try again immediately after a drop, then back off by error type:

- Network errors: add 250 ms per attempt, up to 16 seconds.
- Other HTTP errors: start at 5 seconds, double each time, up to 320 seconds.
- 429: start at 1 minute and double.

Reset the delay once a connection stays healthy.

### Recovering what you missed

- Short gap, 5 minutes or less: add `backfill_minutes` (1 to 5) when you reconnect. Older posts arrive first and nothing is de-duplicated, so de-duplicate by post id yourself. Backfill is an enterprise feature.
- Longer gap, up to 24 hours: reconnect with `start_time` and `end_time` to replay that period. The connection closes when the replay finishes.
- Redundancy: enterprise filtered streams allow a second connection to the same stream, and firehose splits across partitions, with up to 20 connections.

## Connection limits and cleanup

Each plan caps simultaneous connections, so a leaked connection from a crashed process blocks you until it times out. The connection management endpoints help: `GET /2/connections` shows history, `DELETE /2/connections/all` closes everything for the app, `DELETE /2/connections/{endpoint_id}` closes the connections to one endpoint, and `DELETE /2/connections` closes specific connections by id.

## Latency

The platform fills in full post data before delivery, which gives a typical 99th percentile delay of about 4 to 5 seconds. For the big sampled and firehose feeds, the target is that nearly all posts arrive within a minute.

## Client design

1. Open the connection on a thin reader that only moves bytes into a queue.
2. Process the queue elsewhere. A slow handler is the commonest reason the server drops you.
3. Track the last post id or time you saw so you can pick backfill or replay after a gap.
4. Keep rule definitions in code and reconcile them with `GET rules` at startup.
5. Expect bursts of 5 to 10 times normal volume during big events, and review broad rules before them.
6. Honor compliance events by deleting data you stored.

```python
def run(url, headers):
    delay = 0
    while True:
        try:
            with requests.get(url, headers=headers, stream=True, timeout=(10, 25)) as r:
                if r.status_code == 429:
                    delay = max(60, delay * 2); sleep(delay); continue
                r.raise_for_status()
                delay = 0
                for line in r.iter_lines():
                    if line:
                        queue.put(line)
        except requests.RequestException:
            delay = min(delay + 0.25, 16)
            sleep(delay)
```

The official docs at docs.x.com are authoritative, and XActions is not affiliated with X Corp.
