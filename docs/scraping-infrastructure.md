# Scraping Infrastructure

> Everything that keeps a no-API X client working: query-ID discovery, request
> signing, browser identity, a multi-account pool with resumable scrapes, plus
> the standalone proxy, stealth-browser and pagination building blocks.

## Overview

Two groups of things live here, and it is worth knowing which is which.

**On the live request path.** These run on every call the CLI, the MCP server
and the library make, with no configuration from you:

- **GraphQL query-ID discovery** reads x.com's own bundles so a rotated ID does not break a scrape.
- **Request signing** attaches the `x-client-transaction-id` header the web client sends.
- **Browser identity** gives the HTTP client one consistent User-Agent and client-hint profile per process.
- **The account pool and checkpoints** spread work over several sessions and resume an interrupted scrape.

**Building blocks for scrapers you write.** These are exported and documented,
but nothing in the tree imports them, so changing their settings does not change
what `xactions followers` does:

- **ProxyManager**: proxy rotation with health tracking and auto-blacklisting.
- **launchStealthBrowser**: anti-detection Puppeteer wrapper with fingerprint randomization.
- **PaginationEngine**: scroll-based pagination with deduplication and checkpointing.

The one exception in that second group is `DatasetStore` (defined in
`paginationEngine.js`), which backs `xactions dataset`, the `x_dataset_*` MCP
tools, and `/api/datasets`.

### Import paths

`package.json` exports `./src/*`, so every module under `src/` can be imported
from an installed package by its file path:

```javascript
import { ProxyManager } from 'xactions/src/scraping/proxyManager.js';
```

Paths below that start with `./src/` are relative to the root of a clone; in your
own project, write `xactions/src/` instead. Where a shorter published subpath
exists (`xactions/scrapers/twitter/http`), the example uses it.

---

## Architecture

```
src/scraping/
├── proxyManager.js       → Proxy rotation, health tracking, auto-blacklist
├── stealthBrowser.js     → Anti-detection Puppeteer with fingerprint randomization
└── paginationEngine.js   → Pagination, deduplication, checkpoints, retry, datasets
```

Data directories:
- `~/.xactions/datasets/`: stored scraping datasets
- `~/.xactions/scrape-checkpoints/`: `PaginationEngine` checkpoints, written by `saveCheckpoint()`
- `~/.xactions/checkpoints/`: HTTP-scraper cursor checkpoints, written automatically by `createCheckpoint()`
- `~/.xactions/query-ids.json`: the discovered GraphQL query-ID cache
- `~/.xactions/transaction-keys.json`: the request-signing keys
- `~/.xactions/accounts.db`: the account pool

---

## Quick Start

```javascript
import { ProxyManager } from './src/scraping/proxyManager.js';
import { launchStealthBrowser, createStealthPage } from './src/scraping/stealthBrowser.js';
import { PaginationEngine, RetryPolicy } from './src/scraping/paginationEngine.js';

// 1. Set up proxies (optional)
const proxies = new ProxyManager(['http://proxy1:8080', 'http://proxy2:8080']);

// 2. Launch stealth browser
const proxy = proxies.getNext();
const browser = await launchStealthBrowser({ proxy, headless: true });
const page = await createStealthPage(browser, { proxy });

// 3. Scrape with pagination
const engine = new PaginationEngine({
  maxPages: 50,
  maxItems: 1000,
  scrollDelay: 1500,
  retries: 3,
  deduplicateBy: 'id',
  onProgress: (stats) => console.log(`${stats.total} items...`),
});

const result = await engine.scrapeWithPagination(page, async (page) => {
  return page.evaluate(() => {
    return [...document.querySelectorAll('[data-testid="tweet"]')].map(el => ({
      id: el.querySelector('a[href*="/status/"]')?.href,
      text: el.querySelector('[data-testid="tweetText"]')?.textContent,
    }));
  });
});

console.log(`Scraped ${result.items.length} items in ${result.stats.duration}ms`);
await browser.close();
```

---

## Proxy Manager

### Creating

```javascript
import { ProxyManager } from './src/scraping/proxyManager.js';

// From array
const pm = new ProxyManager([
  'http://user:pass@proxy1.example.com:8080',
  'socks5://proxy2.example.com:1080',
  '192.168.1.100:3128',
]);

// From file (one proxy per line)
const pm2 = new ProxyManager();
await pm2.loadFromFile('/path/to/proxies.txt');

// From environment variables
const pm3 = new ProxyManager();
pm3.loadFromEnv();
// Reads: XACTIONS_PROXIES (comma-separated) and XACTIONS_PROXY_FILE
```

### Rotation Strategies

```javascript
// Round-robin (deterministic)
const proxy = pm.getNext();

// Random selection
const proxy = pm.getRandom();
```

### Health Tracking

The proxy manager automatically tracks success/failure rates:

```javascript
// Mark results after each request
pm.markSuccess(proxy.url, responseTimeMs);
pm.markFailed(proxy.url);

// 3 consecutive failures → 10 minute blacklist (automatic)
// Blacklisted proxies are excluded from getNext()/getRandom()

// Get health stats
const stats = pm.getStats();
// [{ url, successes, failures, avgResponseTime, blacklisted }]

// Get only healthy proxies
const healthy = pm.getHealthy();
```

### Testing

```javascript
const results = await pm.testAll();
// Returns: [{ proxy, status: 'ok'|'failed', time }]
```

**Read this before you trust the result.** `testAll()` requests
`https://httpbin.org/ip` with the global `fetch`, which has no proxy support, so
the request does not go through the proxy under test. What it measures is
whether this machine can reach the internet, and it marks every proxy healthy or
failed on that one answer. Treat it as a connectivity smoke test, not as proxy
validation. To actually validate a proxy, drive a request through an agent that
honours it, for example undici's `ProxyAgent`, the same mechanism the account
pool uses for per-account proxies.

### Supported Formats

| Format | Example |
|--------|---------|
| HTTP | `http://proxy:8080` |
| HTTP with auth | `http://user:pass@proxy:8080` |
| SOCKS5 | `socks5://proxy:1080` |
| SOCKS4 | `socks4://proxy:1080` |
| host:port | `192.168.1.1:3128` |
| user:pass@host:port | `admin:secret@proxy:8080` |

---

## Stealth Browser

Anti-detection Puppeteer wrapper that evades bot detection.

### Features

- **puppeteer-extra-plugin-stealth** integration (with graceful fallback)
- 20 rotating user-agent strings (Chrome, Firefox, Safari, Windows, Mac, Linux)
- Random viewport dimensions (1280-1920 × 720-1080)
- WebDriver flag override (`navigator.webdriver = false`)
- Language, plugins, platform spoofing
- Proxy authentication support
- No-sandbox mode for Docker/CI

### Launch Browser

```javascript
import { launchStealthBrowser, createStealthPage } from './src/scraping/stealthBrowser.js';

const browser = await launchStealthBrowser({
  proxy: 'http://proxy:8080',   // Optional
  headless: true,               // Default: true
  userDataDir: '/tmp/chrome1',  // Optional: persistent profile
  viewport: { width: 1920, height: 1080 }, // Optional: custom size
  userAgent: 'Mozilla/5.0...',  // Optional: override UA
});

const page = await createStealthPage(browser, {
  proxy: { url: 'http://proxy:8080', username: 'user', password: 'pass' },
  userAgent: 'Custom UA', // Optional override
});
```

### Anti-Detection Patches

Applied automatically on every page:

| Patch | What it does |
|-------|-------------|
| `navigator.webdriver` | Returns `false` instead of `true` |
| `navigator.languages` | Returns `['en-US', 'en']` |
| `navigator.plugins` | Returns fake plugin list |
| `navigator.platform` | Matches user-agent OS |
| User-Agent | Random selection from 20 real browser UAs |
| Viewport | Random dimensions within realistic range |

---

## Pagination Engine

Handles infinite-scroll pages with deduplication, error recovery, and checkpointing.

### Basic Usage

```javascript
import { PaginationEngine } from './src/scraping/paginationEngine.js';

const engine = new PaginationEngine({
  maxPages: 100,        // Max scroll iterations
  maxItems: 5000,       // Stop after this many items
  pageTimeout: 30000,   // 30s timeout per scroll
  scrollDelay: 1500,    // Delay between scrolls (ms)
  retries: 3,           // Retries on error
  deduplicateBy: 'id',  // Deduplicate items by this field
  onProgress: (stats) => console.log(stats),
});

const { items, stats } = await engine.scrapeWithPagination(page, extractFn);
```

### Deduplication

```javascript
// By field name
new PaginationEngine({ deduplicateBy: 'url' });

// By custom function
new PaginationEngine({
  deduplicateBy: (item) => `${item.username}:${item.tweetId}`,
});
```

### Checkpointing

Save progress and resume later:

```javascript
// Save checkpoint mid-scrape
const checkpointPath = await engine.saveCheckpoint('my-scrape-001');
// Saved to ~/.xactions/scrape-checkpoints/my-scrape-001.json

// Resume from checkpoint
const engine2 = new PaginationEngine({ maxItems: 5000 });
await engine2.resume(checkpointPath);
const { items } = await engine2.scrapeWithPagination(page, extractFn);
```

### Error Recovery

The engine automatically handles:
- **Stuck detection.** Stops after 3 consecutive empty scrolls.
- **Error page detection.** Pauses 60s on "Rate limit" or "Something went wrong".
- **Scroll errors.** Retries with a 5s delay.

### Stats

```javascript
const { items, stats } = await engine.scrapeWithPagination(page, extractFn);

console.log(stats);
// {
//   total: 2500,
//   duplicatesRemoved: 340,
//   pagesScrolled: 85,
//   errorsRecovered: 2,
//   duration: 128000
// }
```

---

## Retry Policy

Standalone retry utility with exponential backoff.

```javascript
import { RetryPolicy } from './src/scraping/paginationEngine.js';

const retry = new RetryPolicy({
  maxRetries: 3,
  baseDelay: 2000,       // Initial delay: 2s
  maxDelay: 60000,       // Cap at 60s
  backoffMultiplier: 2,  // Double each time: 2s → 4s → 8s
  retryOn: ['timeout', 'network-error', 'rate-limit', 'empty-result'],
});

const result = await retry.execute(async () => {
  const response = await fetch('https://api.example.com/data');
  if (!response.ok) throw new Error('Request failed');
  return response.json();
});
```

### Error Classification

| Error Type | Triggered By | Retried? |
|-----------|-------------|----------|
| `timeout` | AbortError, TimeoutError | ✅ |
| `network-error` | ECONNREFUSED, ENOTFOUND, fetch failures | ✅ |
| `rate-limit` | 429 status, "Rate limit" in message | ✅ |
| `empty-result` | Custom "empty" errors | ✅ |
| Other | Unrecognized errors | ❌ (thrown immediately) |

---

## Dataset Storage

The PaginationEngine stores results in `~/.xactions/datasets/` as JSON files, compatible with the Apify dataset format.

### CLI

```bash
# List datasets
xactions dataset list

# Export a dataset
xactions dataset export my-scrape --format json --output data.json
xactions dataset export my-scrape --format csv --output data.csv

# Delete
xactions dataset delete my-scrape
```

### API

```http
GET    /api/datasets/                    # List
GET    /api/datasets/:name               # Get items
GET    /api/datasets/:name/export?format=json
DELETE /api/datasets/:name
```

---

## Scraper Adapters

XActions includes adapter wrappers for multiple scraping backends (`src/scrapers/adapters/`):

| Adapter | Uses | Best For |
|---------|------|----------|
| `puppeteer` | Puppeteer + stealth | Default. Full JavaScript rendering |
| `playwright` | Playwright | Alternative to Puppeteer |
| `cheerio` | cheerio | Static HTML (fastest) |
| `got-jsdom` | got + jsdom | Lightweight JS rendering |
| `crawlee` | Crawlee framework | Large-scale crawling |
| `selenium` | selenium-webdriver | Legacy compatibility |

All adapters implement the same `BaseScraper` interface:

```javascript
import { getAdapter, getAvailableAdapter, listAdapters } from 'xactions/scrapers';

const adapter = await getAdapter('puppeteer');  // or 'playwright', 'cheerio', ...
const browser = await adapter.launch({ headless: true });
const page = await adapter.newPage(browser);
await adapter.goto(page, 'https://x.com/nasa');
const html = await adapter.getContent(page);
await adapter.closePage(page);
await adapter.closeBrowser(browser);
```

`getAdapter` is async because it lazy-imports the backend, so an uninstalled
optional dependency costs nothing until you ask for it. `getAvailableAdapter()`
walks a fallback chain and returns the first backend whose package is actually
present. `XACTIONS_SCRAPER_ADAPTER` sets the process default.

---

## Cross-Platform Scrapers

XActions scrapers support multiple social platforms:

| Platform | Module | Features |
|----------|--------|----------|
| Twitter/X | `src/scrapers/twitter/` | Profiles, followers, tweets, search, media |
| Bluesky | `src/scrapers/bluesky/` | Profiles, followers, posts |
| Mastodon | `src/scrapers/mastodon/` | Profiles, followers, toots (any instance) |
| Threads | `src/scrapers/threads/` | Profiles, followers, posts |

```javascript
import scrapers from 'xactions/scrapers';
import bluesky from 'xactions/scrapers/bluesky';
import mastodon from 'xactions/scrapers/mastodon';

// Twitter: Puppeteer page first, and the page must be logged in.
const profile = await scrapers.scrapeProfile(page, 'nichxbt');

// Bluesky: an AT Protocol agent first. Public reads need no credentials.
const agent = await bluesky.createAgent();
const bskyProfile = await bluesky.scrapeProfile(agent, 'bsky.app');

// Mastodon: a client bound to an instance.
const client = mastodon.createClient({ instance: 'https://mastodon.social' });
const mastoProfile = await mastodon.scrapeProfile(client, 'Gargron');
```

Every platform module names its read functions `scrapeProfile`,
`scrapeFollowers`, `scrapeFollowing`, `scrapeTweets` and `searchTweets`, so one
`scrape(platform, action, options)` call dispatches across all of them. See
[scrapers.md](scrapers.md#one-call-for-any-of-them).

---

## GraphQL Query ID Discovery

Every GraphQL call to x.com is addressed by a persisted query ID
(`/i/api/graphql/<queryId>/<operationName>`). X rotates those IDs whenever it
ships a new web bundle, and a stale ID answers `404 Query not found`. That is
the single most common way a no-API client breaks, and the reason a scraper
that worked last month stops working with no code change.

The HTTP scraper refreshes its IDs the way the web client does, from x.com's
own JavaScript bundles (`src/scrapers/twitter/http/queryIds.js`):

1. Load an x.com page that still ships the classic client (`/home`, then
   `/i/flow/login`). `https://x.com/` itself is a server-rendered shell with
   no bundles, so it is only a last resort.
2. Read the inline webpack runtime's chunk manifest (chunk name to hash) and the
   `main.*.js` URL.
3. Download `main` plus the feature chunks that carry the operations XActions
   uses (`bundle.LoggedInMain`, `ondemand.HoverCard`, the Bookmarks, HomeTimeline
   and TweetActivity `shared~` chunks, ...). About 2 MB in total. A full sweep of
   every chunk (`scope: 'full'`) is ~130 MB and only worth it when you need an
   operation outside the table.
4. Extract every `{queryId, operationName, operationType}` descriptor and write
   them to `~/.xactions/query-ids.json` (or `$XACTIONS_HOME/query-ids.json`)
   with a `fetchedAt` timestamp.

### Resolution order

For any operation: the cached/discovered ID, then the hardcoded table in
`src/scrapers/twitter/http/endpoints.js`. Offline behaviour is unchanged: with
no cache and no network the hardcoded IDs are used exactly as before. The cache
wins over the table because it was read from x.com's live bundle, and the
table value may have rotated since it was pinned.

### When it refreshes

`TwitterHttpClient` handles this on its own:

- A GraphQL call that fails with `404`, or `400` with an error naming the
  persisted query, triggers one refresh and one retry with the new ID. If the
  refreshed ID is unchanged, or discovery fails (offline), the original error is
  rethrown. Mutations are only retried when the first attempt was rejected for a
  stale ID, so nothing is ever sent twice.
- When the cache is older than 24 hours, a refresh starts in the background (at
  most once per hour per process) without blocking the call.

Pass `autoRefreshQueryIds: false` to the client to turn both off. Under vitest
the default is off, so unit tests never reach the network unless they opt in.

### API

```javascript
import {
  discoverQueryIds,
  refreshQueryIds,
  getQueryId,
  resolveOperation,
  queryIdStatus,
} from './src/scrapers/twitter/http/queryIds.js';

// Probe x.com now and persist the result
const { count, source, cachePath } = await discoverQueryIds();
console.log(`${count} operations from ${source.mainBundle} -> ${cachePath}`);

// Cache > discovered > hardcoded, never touches the network
getQueryId('TweetDetail');                 // 'XMOz5h24KAZ86qKffKTLdQ'
resolveOperation('Likes');                 // { queryId, operationName: 'Favoriters', source: 'cache' }

// Force a refresh (concurrent callers share one in-flight discovery)
await refreshQueryIds({ fetch: myProxiedFetch, scope: 'full' });

// For diagnostics (`xactions doctor` reads this)
queryIdStatus();                           // { cached, fetchedAt, count, cachePath, stale }
```

`resolveOperation` accepts either an operationName (`Favoriters`) or a key of
the hardcoded table (`Likes`). `src/client/api/graphqlQueries.js` reads the same
cache on every access, so the high-level `Scraper` client benefits without
changes.

### Verifying against live x.com

```bash
node --input-type=module -e '
import { discoverQueryIds } from "./src/scrapers/twitter/http/queryIds.js";
import { GRAPHQL } from "./src/scrapers/twitter/http/endpoints.js";
const r = await discoverQueryIds({ persist: false });
for (const e of Object.values(GRAPHQL)) {
  const live = r.operations[e.operationName]?.queryId;
  console.log(e.operationName.padEnd(26), live === e.queryId ? "match" : `differs (${live})`);
}'
```

On 2026-08-27 this found 148 operations and 22 of the 26 hardcoded IDs had
rotated, including `UserByScreenName`, `TweetDetail` and `SearchTimeline`.

---

## Keeping the Endpoint Table Fresh

Runtime discovery (above) is what saves a running scrape. It does not help a
fresh install with no cache and no network, which falls back to the table in
`src/scrapers/twitter/http/endpoints.js`. That table used to be typed in by
hand, so it was only ever as current as the last person who remembered to
refresh it.

It is generated now. [fa0311/TwitterInternalAPIDocument](https://github.com/fa0311/TwitterInternalAPIDocument)
(MIT) runs a bot that statically analyses x.com's JavaScript bundles once a day
and commits the result as JSON. `npm run sync:endpoints` reads it and rewrites
`src/scrapers/twitter/http/x-endpoints.generated.js`:

```bash
npm run sync:endpoints          # fetch and rewrite
npm run sync:endpoints:check    # exit 1 if the committed table has fallen behind
node scripts/sync-x-endpoints.mjs --json
```

The report names exactly what moved: query IDs that rotated, operations x.com
added or retired, and feature switches whose value flipped. It also cross-checks
the curated table and exits non-zero if an operation XActions tracks has
disappeared from x.com's bundles, which is the failure that otherwise shows up
weeks later as a `404 Query not found` in someone's issue.

### Why the generated data lives in its own module

`endpoints.js` is mostly hand-written behaviour: the request-variable shapes per
operation, the rate-limit budgets, `validateEndpoints`. A generator that rewrote
a marked region inside it would be one bad parse away from eating that code, and
every regeneration would produce a diff mixing data with logic. So the generator
only ever writes `x-endpoints.generated.js`, which contains nothing but data,
and `endpoints.js` imports it and keeps the parts a human decides:

| In `endpoints.js` (hand-written) | In `x-endpoints.generated.js` (overwritten every sync) |
|---|---|
| `TRACKED_OPERATIONS`: which operations XActions uses, under which key | `OPERATIONS`: every operation x.com ships, with its query ID and type |
| `QUERY_ID_PINS`: hold an operation at a known-good ID | `FEATURE_VALUES`: every feature switch, with the value x.com's client sends |
| `FEATURE_PINS`, `FIELD_TOGGLE_VALUES` | `FEATURE_NAMES`, `FIELD_TOGGLE_NAMES`, and per-operation index lists |
| `buildGraphQLVariables`, `RATE_LIMITS`, `REST` | `REST_V11`: x.com's v1.1 dispatch table, path plus method |

Hand-pinning an operation is therefore still one edit, and it survives the next
sync:

```javascript
// src/scrapers/twitter/http/endpoints.js
export const QUERY_ID_PINS = Object.freeze({
  SearchTimeline: 'hyPfJYJ_XAtDYoslQc-Rgg', // held while #123 is investigated
});
```

### Resolution order, unchanged

Paths below are relative to the repository root. The package's `exports` map
publishes `xactions/scrapers/twitter/http` (the index) but not the individual
modules inside it, so a consumer reaches `resolveGraphQL` and the rest through
that index or through a direct path.

The discovery cache still wins over the table, and the table is still the
offline fallback:

```javascript
import { resolveGraphQL } from './src/scrapers/twitter/http/endpoints.js';

resolveGraphQL('SearchTimeline');
// { queryId, operationName: 'SearchTimeline', source: 'cache' | 'hardcoded' }
```

What is new is that a key the curated table does not name still resolves, from
the generated table, so reaching one of the operations XActions has no wrapper
for does not mean editing a file first:

```javascript
resolveGraphQL('BirdwatchFetchNotes');   // Community Notes on a post
resolveGraphQL('AudioSpaceSearch');
```

### Per-operation feature switches

X rejects a request that omits a switch the operation requires
(`The following features cannot be null: ...`). `DEFAULT_FEATURES` is the union
across every tracked operation, which is the safe default and what the HTTP
client sends. Upstream also records which switches each operation declares
individually, which is narrower and closer to what the web client actually
sends:

```javascript
import { operationFeatures, operationFieldToggles, buildGraphQLUrl, resolveGraphQL } from './src/scrapers/twitter/http/endpoints.js';

const { queryId, operationName } = resolveGraphQL('BirdwatchFetchNotes');
const url = buildGraphQLUrl(
  queryId,
  operationName,
  { tweet_id: '1234567890' },
  operationFeatures(operationName),
  operationFieldToggles(operationName),
);
```

A few operations carry a feature family nobody else sends (the six
`responsive_web_birdwatch_*` switches, for instance). Those are listed in
`SPECIALISED_OPERATIONS` and deliberately kept out of `DEFAULT_FEATURES`, so a
plain `UserTweets` call does not advertise flags the web client would never send
with it. Call them through `operationFeatures()` instead.

### Where "last verified" comes from

Both generated modules record the upstream commit they were built from, when
that commit was published, and when we fetched it, so a freshness claim has a
source rather than a date somebody typed into a comment:

```javascript
import { ENDPOINT_TABLE_SOURCE } from './src/scrapers/twitter/http/endpoints.js';

ENDPOINT_TABLE_SOURCE;
// { repo: 'fa0311/TwitterInternalAPIDocument', ref: 'develop', commit, committedAt,
//   fetchedAt, files: ['docs/json/GraphQL.json', 'docs/json/v1.1.json'],
//   operations, queries, mutations, featureSwitches, fieldToggles, restPaths }
```

### What upstream does not cover

- **`docs/json/FreezeObject.json`.** Described upstream as frozen constants, and
  it is: Redux action-type triples, keyboard-shortcut maps, entity-name maps. A
  sweep of all 1921 objects in it found no feature-flag defaults, so the sync
  does not read it. The flag values come from the per-operation `featureSwitch`
  metadata inside `GraphQL.json`.
- **Field-toggle values.** Upstream records which toggles an operation accepts,
  but not what value the client passes, because a toggle is a request parameter
  rather than something baked into the bundle. `FIELD_TOGGLE_VALUES` in
  `endpoints.js` holds the values; a toggle named by an operation and absent
  there is sent as `false`.
- **X Jobs.** No operation in x.com's bundles carries `Job` in its name, so
  there is nothing to pin. If the hiring surface is served by GraphQL at all, it
  is under a name that does not say so.
- **Two thirds of our v1.1 REST paths.** Upstream's `v1.1.json` covers the
  dispatch table the web client builds at boot, which confirms
  `friendships/create`, `friendships/destroy`, `blocks/*`, `mutes/users/*`,
  `dm/inbox_initial_state`, `dm/conversation` and `trends/available`. The rest
  of `REST` (`guest/activate`, `account/pin_tweet`, `dm/new2`,
  `/2/notifications/*`, `/2/guide.json`, `trends/place`) is dispatched
  elsewhere and stays hand-maintained.

---

## Browser Identity

Every request the HTTP-only client makes carries a browser User-Agent, because a
bare `fetch()` from Node gets `POST /1.1/guest/activate.json` answered with a
misleading `404 Sorry, that page does not exist`. `src/client/auth/userAgent.js`
provides it, and two things about how it does that are deliberate.

**The strings are generated.** They come from
[fa0311/latest-user-agent](https://github.com/fa0311/latest-user-agent) (MIT),
which runs the real browsers in CI and commits both the User-Agent and the full
header set each one sends. `npm run sync:user-agents` rewrites
`src/client/auth/userAgents.generated.js` from it. A hand-maintained pool goes
stale the week it is written, and a User-Agent two major versions behind is
itself a signal: no real Chrome install stays that far back.

```bash
npm run sync:user-agents          # fetch and rewrite
npm run sync:user-agents:check    # exit 1 if a browser has shipped a new version since
```

Upstream's CI runs on Linux, so every string it publishes carries the
`X11; Linux x86_64` platform token. The generator keeps upstream's version and
browser identity exactly as published and substitutes the platform token to
cover Windows and macOS. That token carries no version and has been frozen for
years in both engines, which is why substituting it is safe and inventing a
version number would not be.

**One profile per session, not one per request.** The pool used to pick a random
string on every call, so a single session would claim to be Chrome on Windows,
then Firefox on macOS, then Chrome on Linux, from one IP address, inside one
cookie jar. That is a stronger tell than any single stale string: real browsers
do not change identity mid-session. The default is now one profile, chosen once
and held for the life of the process, carrying its own matching client hints.

```javascript
import {
  sessionUserAgent,
  sessionProfile,
  profileHeaders,
  clientHintHeaders,
} from './src/client/auth/userAgent.js';

sessionUserAgent();      // the same string every call, for this process
sessionProfile().id;     // 'chrome-windows'
profileHeaders();        // user-agent + accept-language + Sec-CH-UA, all agreeing
clientHintHeaders();     // just the Sec-CH-UA trio; empty for a Firefox profile
```

Rotation is still there, because it is the right answer when each request really
is a different identity: a pool of accounts, each behind its own proxy, each
with its own cookie jar. It is an explicit choice rather than the default.

```javascript
import { configureUserAgent, rotateUserAgent, randomUserAgent, resetUserAgentSession } from './src/client/auth/userAgent.js';

randomUserAgent({ rotate: true });        // rotate this one call
configureUserAgent({ rotate: true });     // rotate for the whole process
configureUserAgent({ profileId: 'firefox-macos' });  // or pin one deliberately
resetUserAgentSession();                  // new identity: new proxy, new account
```

`XACTIONS_ROTATE_USER_AGENT=1` turns rotation on without a code change. Every
previous export still works: `USER_AGENTS` is still the list of strings,
`DEFAULT_USER_AGENT` is still a member of it, and `randomUserAgent()` still
returns something from the pool. It just no longer returns a different one every
time unless you ask it to.

The profiles cover Chrome and Firefox on Windows, macOS and Linux, plus Edge on
Windows. A Firefox profile carries no `Sec-CH-UA` headers at all, because Gecko
sends none; a User-Agent from one row with client hints from another is exactly
the inconsistency a fingerprinter looks for, which is why they travel together
in one profile rather than being picked separately.

---

## Account Pool and Resumable Scrapes (HTTP scraper)

One X session gets roughly 50 GraphQL calls per operation per 15-minute window, which caps a single-account follower scrape at about 1,000 users before it stalls. The HTTP scraper solves this the way [twscrape](https://github.com/vladkens/twscrape) does: a pool of accounts in SQLite, per-account per-operation rate-limit tracking from the `x-rate-limit-*` headers, and automatic rotation. Interrupted scrapes resume from a saved cursor, the idea behind [Scweet](https://github.com/Altimis/Scweet)'s resume mode.

Both live in `src/scrapers/twitter/http/` and are published on the package subpath `xactions/scrapers/twitter/http`.

### Account pool

```javascript
import { createAccountPool, createPooledClient, createCheckpoint, scrapeFollowers } from 'xactions/scrapers/twitter/http';
import fs from 'node:fs';

// Accounts persist in $XACTIONS_HOME/accounts.db (default ~/.xactions/accounts.db).
// Cookies accept a header string, Netscape cookies.txt text, a Cookie-Editor JSON
// export, Playwright storageState, an array of { name, value }, or authToken + ct0.
const pool = createAccountPool({
  accounts: [
    { name: 'main', authToken: process.env.X_AUTH_TOKEN_1, ct0: process.env.X_CT0_1 },
    { name: 'alt', cookies: fs.readFileSync('./alt-cookies.txt', 'utf8'), proxy: 'socks5://127.0.0.1:1080' },
  ],
});

// Manage it like a CLI would
pool.add({ name: 'third', cookies: 'auth_token=...; ct0=...' });
pool.importCookies('fourth', fs.readFileSync('./cookies.json', 'utf8'));
pool.remove('third');
console.log(pool.list());   // [{ name, proxy, locked, lockReason, lastUsed, limits: { Followers: { remaining, resetAt, coolingDown } } }]
console.log(pool.stats());  // { total, locked, leased, available, coolingDown, nextResetAt, accounts }
```

Each account gets its own `TwitterHttpClient` with its cookies and proxy (proxies route through undici's `ProxyAgent`). `acquire(operation)` leases the least-recently-used account that is unlocked and outside its rate-limit window for that operation; when every account is cooling down it waits for the earliest reset (bounded by `maxWaitMs`, default 15 minutes) and throws an `AccountPoolError` naming the next reset when the wait would exceed the budget.

```javascript
const lease = await pool.acquire('Followers', { maxWaitMs: 60_000 });
try {
  const page = await lease.client.graphql(queryId, 'Followers', variables);
} finally {
  lease.release();
}
pool.markLocked('alt', 'challenge required'); // skipped by acquire until pool.unlock('alt')
```

### Pooled client

`createPooledClient(pool)` exposes the same `graphql()`, `request()`, `rest()`, and `graphqlPaginate()` as a single client and passes as the `client` argument of every scraper. A 429 (or a response whose `x-rate-limit-remaining` reaches 0) records the window and retries the same call on the next account; a 401/403 locks the account and moves on. After every account has been tried the last error is rethrown.

```javascript
const client = createPooledClient(pool, {
  maxAccounts: 3,                    // most accounts one call may try (default: pool size)
  onRotate: ({ from, operation, reason }) => console.log(`${operation}: ${from} ${reason}`),
});

const followers = await scrapeFollowers(client, 'elonmusk', { limit: 5000 });
```

### Resumable scrapes

A checkpoint is a small JSON file (`{ cursor, count, updatedAt, meta }`) written atomically after every page under `$XACTIONS_HOME/checkpoints/`. Pass it as the `checkpoint` option of `scrapeFollowers`, `scrapeFollowing`, `scrapeLikers`, `scrapeRetweeters`, `scrapeListMembers`, `scrapeTweets`, `scrapeTweetsAndReplies`, or `searchTweets`. A run that starts with a saved checkpoint continues from its cursor, and the `count` already collected is subtracted from `limit`, so re-running the same command finishes the job. The file is deleted when the scrape completes.

```javascript
const checkpoint = createCheckpoint({ key: 'followers:elonmusk' });

// Run 1 dies at page 400 (rate-limit wall, network drop, Ctrl-C).
// Run 2, same call, starts at the page-400 cursor with the remaining budget.
const rest = await scrapeFollowers(client, 'elonmusk', { limit: 50000, checkpoint });

console.log(checkpoint.resume()); // null once finished; otherwise { cursor, count, updatedAt, meta }
checkpoint.clear();               // start over
```

Because a resumed run returns only the users fetched after the cursor, write results out as they arrive (for example from `onProgress`, or by appending each run's output) rather than relying on a single final array.

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `XACTIONS_PROXIES` | Comma-separated proxy list |
| `XACTIONS_PROXY_FILE` | Path to proxy list file |
| `XACTIONS_SESSION_COOKIE` | Default X/Twitter auth token |
| `XACTIONS_ROTATE_USER_AGENT` | `1` to pick a fresh browser profile per request instead of holding one per session |
| `PUPPETEER_EXECUTABLE_PATH` | Custom Chrome path |

---

## Tips

- **Start without proxies.** Most use cases don't need them for moderate volumes.
- **Use checkpointing** for large scrapes (>1000 items), so an interruption resumes.
- **Set `deduplicateBy`** to avoid counting the same item twice during scrolling
- **Monitor `stats.errorsRecovered`.** High values indicate rate limiting.
- **Rotate user data dirs** for multi-account scraping to maintain separate cookies
- **Use the stealth browser** even without proxies. The anti-detection patches alone reduce block rates.

---

## Request Signing (`x-client-transaction-id`)

x.com's web client attaches an `x-client-transaction-id` header to every GraphQL
and internal REST call it makes. A client that omits it is trivially separable
from a browser, and projects that added it report that sessions carrying a valid
one survive longer before being soft-blocked. XActions now generates it
(`src/scrapers/twitter/http/transactionId.js`) and the HTTP scraper signs every
request with it.

### What the value is

The header is derived per request from four things: the HTTP method, the request
pathname, the current second, and a `{verification key, animation key}` pair the
page itself carries.

- The **verification key** is the base64 blob in the
  `<meta name="twitter-site-verification">` tag on `x.com/home`.
- The **animation key** is computed by walking one of the four
  `loading-x-anim-*` SVG paths on that same page along a cubic-bezier curve.
  Which of the four paths, which row of it, and where along the curve are all
  decided by byte indices that live inside the `ondemand.s` webpack chunk.

Those two are hashed with the method, path and timestamp (SHA-256), packed with
the key bytes behind a random XOR mask, and base64-encoded. The value is
different on every request, which is why signing happens per request rather than
per session.

### Where the keys come from

Extraction runs once and the result is cached under
`$XACTIONS_HOME/transaction-keys.json` (default `~/.xactions/`) with a
`fetchedAt` timestamp. Cached keys are reused for 24 hours; signing after that
first call is one SHA-256 over a short string.

With a cold cache, two lanes are tried in order:

1. **Pair dictionary (fast path).** A published list of known-good
   `{animationKey, verification}` pairs
   ([fa0311/x-client-transaction-id-pair-dict](https://github.com/fa0311/x-client-transaction-id-pair-dict),
   MIT). One 5 KB fetch, no bundle parsing. The header only has to be internally
   consistent, so a harvested pair signs exactly as well as the page's own: on a
   live check, x.com served two different verification keys on two page loads
   half an hour apart, so the page's key is not a fixed per-deploy value that
   anything could be matched against.
2. **Live parse (fallback).** Load `x.com/home`, read the verification key and
   the animation paths out of the HTML, resolve the `ondemand.s` chunk through
   the same webpack manifest parser that GraphQL query-ID discovery uses, and
   extract the key-byte indices from it. About 300 KB of traffic.

Measured on a cold cache: the dictionary lane takes ~200 ms, the live lane
~350 ms. Set `XACTIONS_TXID_SOURCE=live` to try the bundles first.

### Failure is never fatal

Every failure path returns `null` and the request goes out unsigned, exactly as
it did before this module existed. A discovery failure is remembered for ten
minutes so a machine with no route to x.com does not pay for a failed fetch on
every call, and keys that are past their 24-hour freshness window keep signing
while a refresh is failing. Nothing in this module throws into a request.

### Turning it off

Signing is on by default outside vitest.

```bash
XACTIONS_TRANSACTION_ID=0 node src/cli/index.js profile nasa   # off (also: off, false, no)
XACTIONS_TXID_SOURCE=live node your-script.js                  # prefer the live parse
```

```javascript
import { TwitterHttpClient } from './src/scrapers/twitter/http/client.js';

const client = new TwitterHttpClient({ transactionId: false });  // off for this client
```

A caller that sets its own `x-client-transaction-id` header keeps it.

### API

```javascript
import {
  getTransactionId,
  initializeTransactionId,
  transactionIdStatus,
  configureTransactionId,
} from './src/scrapers/twitter/http/transactionId.js';

// Sign one request. Returns null when signing is off or unavailable.
const id = await getTransactionId('GET', 'https://x.com/i/api/graphql/abc/UserByScreenName?variables=%7B%7D');
if (id) headers['x-client-transaction-id'] = id;

// Warm the cache up front (concurrent callers share one initialisation)
await initializeTransactionId();

// For diagnostics
transactionIdStatus();
// { enabled, cached, source: 'pairs'|'live', fetchedAt, stale, cachePath, preferredSource }

// Process-wide defaults: proxied fetch, custom cache directory, forced lane
configureTransactionId({ fetch: myProxiedFetch, source: 'live' });
```

Only the pathname is signed, so a full URL and a bare path produce the same
value; the query string is ignored.

### Both request lanes carry it

`TwitterHttpClient` signs inside its retry loop, so every attempt gets a fresh
value rather than replaying one. `GuestTokenManager.getHeaders()` signs when it
is told which request the headers are for:

```javascript
import { GuestTokenManager } from './src/scrapers/twitter/http/guest.js';

const guest = new GuestTokenManager();
const url = 'https://x.com/i/api/graphql/abc/UserByScreenName?variables=%7B%7D';
const headers = await guest.getHeaders({ method: 'GET', path: url });
const res = await fetch(url, { headers });
```

Calling `getHeaders()` with no argument returns the same headers it always did.

### What the header does, measured

On the guest tier the effect is not observable. Against
`UserByScreenName` on one guest token, alternating signed and unsigned requests:
every call answered `200`, the rate-limit budget was the same `150` per window
and decremented by one either way, and a deliberately bogus header value was
accepted too. X does not appear to validate the header for guest-token reads.

The reported benefit is a session-lifetime effect, so confirming it needs an
authenticated run: sign in with a real `auth_token`, drive a normal workload for
days with `XACTIONS_TRANSACTION_ID=1` and again with `=0`, and compare how long
the cookie survives before it is invalidated or starts returning empty
timelines. Nothing shorter than that will show a difference.

### Verifying the generator against live x.com

```bash
node --input-type=module -e '
import { discoverFromLiveBundles, generateTransactionId } from "./src/scrapers/twitter/http/transactionId.js";
const keys = await discoverFromLiveBundles({});
console.log("key        ", keys.key);
console.log("animation  ", keys.animationKey);
console.log("chunk      ", keys.chunkUrl);
console.log("signed GET ", await generateTransactionId({ ...keys, method: "GET", path: "/i/api/graphql/abc/UserByScreenName" }));'
```
