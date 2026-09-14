# XActions API Reference

> Function reference for the `xactions` npm package.
>
> ```bash
> npm install xactions
> ```

## Table of Contents

- [Two ways in](#two-ways-in)
- [HTTP client (no browser)](#http-client-no-browser)
- [Core Functions](#core-functions)
- [Scraper Functions](#scraper-functions)
- [Manager Modules](#manager-modules)
- [Signed webhooks](#signed-webhooks)
- [Package entry points](#package-entry-points)
- [MCP Server](#mcp-server)
- [CLI Commands](#cli-commands)
- [Browser Scripts](#browser-scripts)
- [Types](#types)

---

## Two ways in

The package ships two independent scraping paths, and picking the wrong one is
the most common reason a first script returns nothing.

| Path | Import | Browser | Login |
|---|---|---|---|
| **HTTP client** (recommended, what the CLI uses) | `xactions/client` | none | not needed for profiles and public timelines |
| **Puppeteer scrapers** | `xactions` or `xactions/scrapers` | Chromium | required, X serves a logged-out browser an empty page |

Every Puppeteer function below takes a `page` as its first argument and expects
that page to be logged in via `loginWithCookie`. If you just want data, start
with the HTTP client.

---

## HTTP client (no browser)

```javascript
import { Scraper, SearchMode } from 'xactions/client';

const x = new Scraper();

// Guest tier: no cookies required.
const profile = await x.getProfile('NASA');
console.log(profile.name, profile.followersCount);

for await (const tweet of x.getTweets('NASA', 20)) {
  console.log(tweet.likes, tweet.text);
}
```

Reads that return lists are async generators, so they page lazily and you stop
whenever you like. Session-tier reads (search, followers, following, likes,
bookmarks, DMs) need the two cookies a logged-in browser holds:

```javascript
const x = new Scraper();
await x.setCookies(`auth_token=${process.env.X_AUTH_TOKEN}; ct0=${process.env.X_CSRF_TOKEN}`);

for await (const tweet of x.searchTweets('ai agents', 50, SearchMode.Latest)) {
  console.log(tweet.text);
}

// Or reuse the session `xactions login` already saved.
await x.loadCookies(`${process.env.HOME}/.xactions/cookies.json`);
```

`Scraper` methods: `getProfile`, `me`, `getFollowers`, `getFollowing`,
`getTweet`, `getTweets`, `getTweetsAndReplies`, `getLikedTweets`,
`getLatestTweet`, `searchTweets`, `searchProfiles`, `getTrends`,
`getExploreTabs`, `getListTweets`, `getListMembers`, `getListById`,
`getDmConversations`, `getDmMessages`, plus the writes `sendTweet`,
`sendQuoteTweet`, `deleteTweet`, `likeTweet`, `unlikeTweet`, `retweet`,
`unretweet`, `followUser`, `unfollowUser`, `sendDm`, `sendDmToUser`, and the
session helpers `login`, `logout`, `isLoggedIn`, `getCookies`, `setCookies`,
`saveCookies`, `loadCookies`.

---

## Core Functions

### `createBrowser(options?)`

Launch a Puppeteer browser with stealth mode enabled (avoids bot detection).

**Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `options.headless` | `boolean` | `true` | Run in headless mode |
| `options.proxy` | `string` | none | HTTP(S) proxy URL |
| `options.userDataDir` | `string` | none | Persistent browser profile directory |
| `options.args` | `string[]` | none | Additional Chrome flags |

**Returns:** `Promise<Browser>`

```javascript
// Headless (default)
const browser = await createBrowser();

// With visible browser
const browser = await createBrowser({ headless: false });

// With proxy
const browser = await createBrowser({ proxy: 'http://user:pass@proxy:8080' });
```

---

### `createPage(browser)`

Create a new page with stealth anti-detection configured.

**Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `browser` | `Browser` | Puppeteer browser instance |

**Returns:** `Promise<Page>`

---

## Scraper Functions

### `scrapeProfile(page, username)`

Get a user's full profile data.

**Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `page` | `Page` | Puppeteer page |
| `username` | `string` | X username (without @) |

**Returns:** `Promise<Profile>`

```javascript
const profile = await scrapeProfile(page, 'nichxbt');
// {
//   name: 'nich',
//   username: 'nichxbt',
//   bio: '...',
//   followers: 1234,
//   following: 567,
//   tweets: 890,
//   verified: false,
//   location: '...',
//   website: '...',
//   joinDate: '...',
//   avatar: 'https://...',
//   header: 'https://...'
// }
```

---

### `scrapeFollowers(page, username, options?)`

Get a list of accounts that follow a user.

**Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | `Page` | required | Puppeteer page |
| `username` | `string` | required | X username |
| `options.limit` | `number` | `1000` | Max followers to return |

**Returns:** `Promise<User[]>`

```javascript
const followers = await scrapeFollowers(page, 'nichxbt', { limit: 500 });
followers.forEach((f) => console.log(`@${f.username}: ${f.bio}`));
```

---

### `scrapeFollowing(page, username, options?)`

Get a list of accounts a user follows.

**Parameters:** Same as `scrapeFollowers`

**Returns:** `Promise<User[]>`

---

### `scrapeTweets(page, username, options?)`

Get a user's recent tweets.

**Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | `Page` | required | Puppeteer page |
| `username` | `string` | required | X username |
| `options.limit` | `number` | `20` | Max tweets to return |

**Returns:** `Promise<Tweet[]>`

```javascript
const tweets = await scrapeTweets(page, 'nichxbt', { limit: 50 });
tweets.forEach(t => console.log(`${t.likes}❤️ ${t.text.slice(0, 80)}`));
```

---

### `searchTweets(page, query, options?)`

Search for tweets matching a query.

**Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | `Page` | required | Puppeteer page |
| `query` | `string` | required | Search query (supports X search operators) |
| `options.limit` | `number` | `20` | Max results |

**Returns:** `Promise<Tweet[]>`

```javascript
// Basic search
const tweets = await searchTweets(page, 'xactions', { limit: 100 });

// Advanced search operators
const viral = await searchTweets(page, 'AI tools min_faves:1000 lang:en', { limit: 50 });
```

---

### `scrapeThread(page, tweetUrl)`

Read a whole thread: the root post and every reply the author chained onto it.

**Returns:** `Promise<ThreadTweet[]>`

```javascript
const thread = await scrapeThread(page, 'https://x.com/user/status/123456');
console.log(`${thread.length} tweets`);
console.log(thread.map((t) => t.text).join('\n\n'));
```

The HTTP client covers the same ground without a browser, and on the guest
tier: `new Scraper().getTweet(id)`, or `scrapeFullThread` from
`xactions/scrapers/twitter/http`.

---

### `scrapeBookmarks(page, options?)`

Export your saved bookmarks. Needs a logged-in page: bookmarks are private.

**Returns:** `Promise<Bookmark[]>`

---

### `scrapeMedia(page, username, options?)`

Every image and video an account has posted, with the direct file URLs.

**Returns:** `Promise<MediaItem[]>`

```javascript
const media = await scrapeMedia(page, 'nasa', { limit: 50 });
console.log(media[0].url);
```

Video specifically has a CLI route that needs no code: `xactions media <user>`,
and the MCP tool `x_download_video`.

---

### Other scrapers

`scrapeLikes(page, username, opts)`, `scrapeHashtag(page, hashtag, opts)`,
`scrapeListMembers(page, listId, opts)`, `scrapeNotifications(page, opts)`,
`scrapeTrending(page)`, `scrapeCommunityMembers(page, communityId, opts)` and
`scrapeSpaces(page, opts)` follow the same shape. See
[scrapers.md](scrapers.md) for the full table.

---

## Manager Modules

Manager modules are higher-level Puppeteer-based automation tools.

Each one is an object of Puppeteer-driven functions plus a `SELECTORS` map.

```javascript
import { dmManager, profileManager, postComposer } from 'xactions';

await postComposer.postThread(page, ['first tweet', 'second tweet']);
await dmManager.sendDM(page, 'nichxbt', 'hello');
```

| Module | What it does |
|--------|-------------|
| `articlePublisher` | Publish long-form Articles (Premium+) |
| `bookmarkManager` | Save, organize, export bookmarks |
| `businessTools` | Brand monitoring, competitor analysis |
| `creatorStudio` | Creator dashboard and analytics |
| `discoveryExplore` | Trending topics and the Explore page |
| `dmManager` | `sendDM`, `getConversations`, `exportConversation`, `getMessageRequests`, `updateDMSettings` |
| `engagementManager` | Like, retweet, reply automation |
| `grokIntegration` | Query Grok |
| `notificationManager` | Read and manage notifications |
| `pollCreator` | Create polls |
| `postComposer` | `postTweet`, `postThread`, `createPoll`, `schedulePost`, `quotePost`, `repost`, `deletePost` |
| `premiumManager` | Premium subscription features |
| `profileManager` | Update bio, avatar, header, name, location, website |
| `settingsManager` | Account settings and privacy |
| `spacesManager` | X Spaces |

---

## Signed webhooks

Any notification channel of type `webhook` POSTs JSON to a URL you control, and
signs it so the receiver can prove it came from your install.

| Header | Value |
|---|---|
| `X-XActions-Signature` | `sha256=<hex HMAC-SHA256 of the raw body>` |
| `X-XActions-Timestamp` | Unix seconds when the request was signed |
| `X-XActions-Event` | Event type, for example `follower_alert` |
| `X-XActions-Delivery` | UUID, stable across retries of one delivery |

Set `XACTIONS_WEBHOOK_SECRET` (or `secret` on the channel config) to turn on
signing. Verify on the receiving side, against the **raw** body, not a reparsed
object:

```javascript
import { verifyWebhookSignature } from 'xactions';

const result = verifyWebhookSignature(rawBody, headers, process.env.XACTIONS_WEBHOOK_SECRET);
if (!result.valid) throw new Error(result.reason);
```

The comparison is constant-time, and a signature older than five minutes is
rejected by default. `signWebhookBody`, `deliverWebhook`,
`listWebhookDeliveries` and `replayWebhookDelivery` are exported from the
package root too: a delivery is retried three times with backoff and every
attempt is recorded in `~/.xactions/webhook-deliveries.json`, so a failed one
can be inspected and replayed. Full guide: [notifications.md](notifications.md).

---

## Package entry points

`package.json` publishes these subpaths and no others. A deep path into `src/`
throws `ERR_PACKAGE_PATH_NOT_EXPORTED`; from a clone, import the file by
relative path instead.

| Import | Contents |
|---|---|
| `xactions` | Everything below re-exported, plus the manager modules and `browserScripts` |
| `xactions/client` | `Scraper`, `SearchMode`, `Tweet`, `Profile`, error classes |
| `xactions/scrapers` | Puppeteer scrapers, the adapter registry, `scrape()` |
| `xactions/scrapers/twitter` | The Puppeteer X scrapers on their own |
| `xactions/scrapers/twitter/http` | The GraphQL HTTP layer: `TwitterHttpClient`, `createAccountPool`, `createCheckpoint`, every `scrape*` function |
| `xactions/scrapers/bluesky`, `/mastodon`, `/threads` | The other platforms |
| `xactions/streaming` | `createStream`, `createLivePipeline`, `Topic` |
| `xactions/analytics` | Sentiment, monitors, reports, history |
| `xactions/plugins` | Install, load and query plugins |
| `xactions/portability` | Export, migrate, diff, X archive import |
| `xactions/spaces` | `joinSpace`, `getSpaceTranscript` |
| `xactions/mcp` | The MCP server, `TOOLS`, `executeTool` |
| `xactions/cli` | The CLI entry point |

---

## MCP Server

154 tools for AI agent integration. See [MCP Server docs](examples/mcp-server.md)
and [mcp-setup.md](mcp-setup.md).

```bash
npx xactions-mcp                        # stdio, what an MCP client spawns
npx xactions-mcp --http --port 8787     # Streamable HTTP on /mcp
npx xactions-mcp --list-groups          # every group and its tools
```

**Claude Desktop config:**
```json
{
  "mcpServers": {
    "xactions": {
      "command": "npx",
      "args": ["-y", "xactions-mcp"],
      "env": {
        "XACTIONS_SESSION_COOKIE": "your_auth_token",
        "XACTIONS_CSRF_TOKEN": "your_ct0"
      }
    }
  }
}
```

### Narrowing what an agent can reach

Tools are organised into groups: `read`, `analytics`, `write`, `automation`,
`monitoring`, `workflows`, `ai`, `data`, `graph`, `persona`, `dm`, `lists`,
`spaces`, `grok`, `auth`, `drafts`. `--tools` and `--exclude` accept tool names,
group names, or `prefix*` patterns, and read `XACTIONS_MCP_TOOLS` /
`XACTIONS_MCP_EXCLUDE` when the flags are absent.

```bash
npx xactions-mcp --tools read,analytics       # a research agent that cannot write
npx xactions-mcp --exclude write,automation   # everything except the account actions
npx xactions-mcp --tools 'x_get_*'            # only the getters
```

### The draft-approval gate

`--require-approval` (or `XACTIONS_MCP_REQUIRE_APPROVAL=1`) makes every write
tool return a draft id instead of acting. Nothing reaches X until a human runs
`xactions drafts approve <id>` in a terminal. The `drafts` group
(`x_list_drafts`, `x_approve_draft`, `x_discard_draft`, `x_draft_status`) stays
available whatever `--tools` says, so an agent can always tell you what it is
waiting on.

### Daily action caps

Independently of approval mode, every write call is charged against a
persistent per-account 24-hour budget in `~/.xactions/action-ledger.json`, and a
call that would go over is refused before it reaches X. Defaults follow X's
published limits: 2,400 posts and replies, 500 likes, 500 reposts, 500 DMs, 400
follows and 400 unfollows per day. Override with `XACTIONS_ACTION_CAPS` (a JSON
object) or `~/.xactions/action-caps.json`. `x_action_budget` reports what is
left.

### HTTP transport

`--http` serves Streamable HTTP on `/mcp` instead of stdio, for agents that
connect over a URL. Bind address defaults to `127.0.0.1`
(`--host` / `XACTIONS_MCP_HOST`) and the port to `8787` (`--port` / `PORT`). Set
`XACTIONS_MCP_TOKEN` and the server requires `Authorization: Bearer <token>` on
every request. Never expose it without a token.

---

## CLI Commands

```bash
npm install -g xactions
```

| Command | Description |
|---------|-------------|
| `xactions login` | Authenticate with X |
| `xactions logout` | Clear saved credentials |
| `xactions profile <user>` | Get profile data |
| `xactions followers <user>` | List followers |
| `xactions following <user>` | List following |
| `xactions non-followers <user>` | Find non-followers |
| `xactions tweets <user>` | Get tweets |
| `xactions search <query>` | Search tweets |
| `xactions hashtag <tag>` | Scrape hashtag |
| `xactions thread <url>` | Unroll a thread |
| `xactions media <user>` | Scrape media |
| `xactions info` | Show version and config |

**Common flags:**
- `-l, --limit <n>`: maximum items
- `-o, --output <file>`: save to a file; the extension (`.json`, `.csv`, `.xlsx`) picks the format
- `--json`: force JSON on stdout, ignoring `--output`

**Global flags**, before the command name:
- `--compact`: one record per line, no colours or spinners, for pipes and agents
- `--fields <list>`: with `--compact`, which fields to print

```bash
xactions --compact --fields id,likes,text tweets NASA --limit 5
```

Full list, flag by flag: [cli-reference.md](cli-reference.md).

---

## Browser Scripts

95 console scripts ship in [`scripts/`](../scripts/), catalogued with their
target page in [browser-scripts.md](browser-scripts.md) (generated from each
file's header by `npm run docs:scripts`).

A smaller registry of the copy-paste scripts under `src/` is exported from the
package, so a tool can list them without reading the repo:

```javascript
import { browserScripts } from 'xactions';

console.log(Object.keys(browserScripts).length);   // 61
console.log(browserScripts.unfollowback);
// { file: 'src/unfollowback.js', description: "Unfollow users who don't follow you back" }
```

---

## Types

TypeScript declarations ship with the package at `types/index.d.ts`, and
`package.json` points `types` at them, so an editor picks them up with no
`@types` install.

```typescript
import type {
  ScrapedProfile,
  ScrapedTweet,
  ThreadTweet,
  User,
  MediaItem,
  Thread,
  VideoResult,
  Bookmark,
  Workflow,
  Stream,
  Plugin,
} from 'xactions';
```

The scraped shapes are `ScrapedProfile` and `ScrapedTweet`, not `Profile` and
`Tweet`: `Profile` and `Tweet` are the runtime classes the HTTP client returns,
exported from `xactions/client`. See
[types/index.d.ts](../types/index.d.ts) for every interface.
