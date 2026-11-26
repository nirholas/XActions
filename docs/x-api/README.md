# The official X API in XActions

XActions has two ways to reach X:

- **The no-key lane** (everything else in this repo): browser automation and the logged-in web session. It needs no developer account and costs no API credits.
- **The keyed lane** (this folder, `src/xapi/`): the official X API v2 with your own developer credentials. It is billed per use by X, and it is the supported, stable interface.

They share nothing but the command name, so you can use either one, or both side by side.

The keyed lane covers every operation in X's published OpenAPI document: 274 operations in 23 areas, as of spec version 2.175. Each one is reachable by its operation id from JavaScript, from the `xactions xapi` command and from the MCP server. Nothing is hand-written per endpoint. The catalog is generated from the spec, so a new endpoint arrives with the next `npm run sync:xapi`.

> XActions is an independent open-source project. It is not affiliated with, endorsed by or sponsored by X Corp. "X" is used here only to name the API this code talks to. The official documentation at https://docs.x.com is authoritative.

## What is here

- [endpoints.md](endpoints.md): every operation, grouped by area. Each entry gives its route, accepted credentials and scopes, required parameters, the published rate limit and a link to the official reference page. Generated, do not edit.
- [guides/authentication.md](guides/authentication.md): bearer tokens, OAuth 2.0 with PKCE, OAuth 1.0a and the scope list.
- [guides/pricing-and-access.md](guides/pricing-and-access.md): getting keys, pay-per-use billing and credits (a dated snapshot).
- [guides/rate-limits.md](guides/rate-limits.md): windows, headers and recovering from 429.
- [guides/fields-and-expansions.md](guides/fields-and-expansions.md): asking for more than the default fields.
- [guides/pagination.md](guides/pagination.md): `next_token`, `pagination_token` and time windows.
- [guides/search-query-syntax.md](guides/search-query-syntax.md): building search queries and stream rules.
- [guides/streaming.md](guides/streaming.md): filtered and sampled streams, reconnects, backfill.
- [guides/webhooks-and-activity.md](guides/webhooks-and-activity.md): Account Activity, the X Activity API, CRC and signatures.
- [guides/errors.md](guides/errors.md): status codes and problem types.
- [guides/official-tools.md](guides/official-tools.md): X's own SDKs, CLI, MCP servers and machine-readable docs.

## Credentials

Get keys at https://console.x.com (see [guides/pricing-and-access.md](guides/pricing-and-access.md)). The client picks the best credential that the operation accepts, in this order: OAuth 2.0 user token, then OAuth 1.0a user token, then the app bearer token. `--auth` (CLI) or `auth` (SDK, MCP) forces one.

Environment variables. The `TWITTER_*` spellings of each also work.

- `X_BEARER_TOKEN`: app-only bearer token, for public reads.
- `X_API_KEY` and `X_API_SECRET`: the app's key pair. With nothing else set, the client mints a bearer token from them.
- `X_ACCESS_TOKEN` and `X_ACCESS_TOKEN_SECRET`: OAuth 1.0a user token, together with the key pair.
- `X_CLIENT_ID` (and `X_CLIENT_SECRET` for confidential apps): OAuth 2.0 client, used by `xactions xapi auth login` and to refresh tokens.
- `X_OAUTH2_ACCESS_TOKEN` and `X_OAUTH2_REFRESH_TOKEN`: an OAuth 2.0 user token you already hold. These win over the stored login.
- `X_API_BASE_URL`: override `https://api.x.com`, for a proxy or a test server.

`xactions xapi auth login` runs the OAuth 2.0 PKCE flow in your browser, using a loopback callback (`http://127.0.0.1:3219/callback` by default; register it on the app first). It stores the token in `$XACTIONS_HOME/xapi-oauth2.json`, which is owner-only (mode 0600). The client secret is never written there. Refreshed tokens are written back automatically, because X rotates the refresh token on every refresh. `xactions xapi auth status` shows what is configured without printing any secret.

## Command line

```bash
xactions xapi tags                               # areas and operation counts
xactions xapi list followers                     # find operations by words
xactions xapi list --tag Posts --writes          # filter by area and kind
xactions xapi describe searchPostsRecent         # params, auth, scopes, rate limit, docs link

# Reads. Params are key=value; repeat a key, or use commas, for a list.
xactions xapi call getUsersByUsername username=XDevelopers user.fields=created_at,public_metrics
xactions xapi call searchPostsRecent query='"open source" -is:retweet' max_results=100 --all --limit 500 --json

# Writes need --yes. --dry-run prints the request and sends nothing.
xactions xapi call createPosts --body '{"text":"hello from the API"}' --dry-run
xactions xapi call createPosts --body @post.json --yes

# Streams print one JSON message per line until --limit or Ctrl-C.
xactions xapi stream streamPostsSample --limit 50 > sample.ndjson

# Chunked media upload; prints the media id to attach to a post.
xactions xapi upload ./clip.mp4 --category tweet_video
```

An operation can be named by its id or by its route: `"GET /2/users/{id}/followers"` and `"GET /2/users/:id/followers"` both work. A typo gets the nearest matches suggested. Exit codes: 0 on success, 1 when the request fails or a write lacks `--yes`, 2 for an unknown operation or invalid parameters.

## JavaScript

```js
import { XApiClient, clientFromStore } from 'xactions/xapi';

const x = await clientFromStore();               // env vars plus the stored login
const me = await x.call('getUsersMe', { 'user.fields': 'public_metrics' });

// Every page, merged, with includes deduplicated.
const followers = await x.collect('getUsersFollowers', { id: me.data.id, max_results: 1000 }, { limit: 5000 });

// Or page by page.
for await (const page of x.paginate('searchPostsRecent', { query: 'from:XDevelopers' }, { maxPages: 3 })) {
  console.log(page.data?.length, page.rateLimit.remaining);
}

// Streams reconnect with the backoff X's docs ask for.
for await (const message of x.stream('streamPostsSample', {})) {
  console.log(message.data.text);
}

await x.call('createPosts', {}, { body: { text: 'hello' } });
const { mediaId } = await x.uploadMedia(buffer, { mediaType: 'image/png', mediaCategory: 'tweet_image' });

// Or construct one explicitly.
const app = new XApiClient({ bearerToken: process.env.X_BEARER_TOKEN });
```

What the client does for you:

- Parameters are checked against the spec before any request: required, unknown (with a suggestion), type, range, pattern and closed enums. `tweet.fields` and `post.fields` are accepted interchangeably, because the spec and the docs name them differently. Field and expansion names outside the published list are sent anyway, with a warning in `result.warnings`, since the published lists lag behind the live API.
- A 429 is waited out when the reset is within `maxRateLimitWaitMs` (default 15 minutes), otherwise it throws `rate_limited`. A 429 for a usage cap throws `usage_capped` at once, because waiting does not lift it. 5xx and network errors are retried with exponential backoff.
- An expiring OAuth 2.0 token is refreshed before the call, and once more on a 401. `onTokenRefresh` receives the new token.
- Every result carries `data`, `includes`, `meta`, `errors` (partial errors on a 200), `rateLimit` (from the response headers) and the credential used.
- Every failure is an `XApiError` with a stable `code`: `unknown_operation`, `invalid_params`, `auth_required`, `rate_limited`, `usage_capped`, `http_error`, `network_error` or `stream_error`. It also carries X's `type`, `title` and `detail` when X sent them.

Also exported:

- `oauth1Header`, plus the OAuth 2.0 helpers `createPkcePair`, `buildAuthorizeUrl`, `exchangeCode`, `refreshAccessToken` and `revokeToken`.
- Webhook helpers: `crcResponse`, `verifySignature` and `createWebhookHandler`.
- `rateLimitsFor(method, path)`, giving the published limits for a route.
- The raw catalog: `OPERATIONS`, `OAUTH2` and `SOURCE`.

## MCP

The MCP server exposes the keyed lane as five tools in the `xapi` group. Turn it on or off with `XACTIONS_MCP_TOOLS` and `XACTIONS_MCP_EXCLUDE`.

- `x_api_list_operations`: search the catalog. Needs no keys.
- `x_api_describe`: everything about one operation. Needs no keys.
- `x_api_get`: call a read operation, optionally following every page. Refuses writes and streams.
- `x_api_stream_sample`: hold a stream open for a bounded number of messages or seconds.
- `x_api_write`: call an operation that changes state. `dryRun: true` returns the request without sending it.

`x_api_write` is a write tool. `XACTIONS_MCP_REQUIRE_APPROVAL=1` holds it as a draft for a human to approve. It is also charged against the daily action caps by what the operation does: posting, replying, liking, reposting, following, unfollowing, DMs, blocking, muting and deleting all count against the same budget as the browser tools.

## Keeping the catalog current

```bash
npm run sync:xapi          # fetch the spec and docs index, regenerate everything
npm run sync:xapi:check    # exit 1 if the published spec or rate limits have drifted
```

`scripts/sync-x-api.mjs` reads three public sources:

- the OpenAPI document at https://api.x.com/2/openapi.json
- the docs index at https://docs.x.com/llms-full.txt, which maps each operation to its reference page
- the rate limits page

It writes `src/xapi/catalog.generated.js`, `src/xapi/rate-limits.generated.js` and [endpoints.md](endpoints.md). Only interface facts are kept: ids, methods, paths, parameter names, types, enums, scopes, limits and links. Descriptions and other prose from X's documents are deliberately left out, and each entry links to the official page instead. `--spec`, `--docs` and `--docs-index` read local copies instead of fetching.

---

The official docs at docs.x.com are authoritative. XActions is not affiliated with X Corp.
