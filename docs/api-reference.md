# XActions — API Reference

> Complete function reference for the `xactions` npm package.
> 
> ```bash
> npm install xactions
> ```

## Table of Contents

- [Quick Start](#quick-start)
- [Core Functions](#core-functions)
- [Scraper Functions](#scraper-functions)
- [Manager Modules](#manager-modules)
- [MCP Server](#mcp-server)
- [CLI Commands](#cli-commands)
- [Browser Scripts](#browser-scripts)
- [Types](#types)

---

## Quick Start

```javascript
import { createBrowser, createPage, scrapeProfile, scrapeFollowers } from 'xactions';

const browser = await createBrowser();
const page = await createPage(browser);

const profile = await scrapeProfile(page, 'elonmusk');
console.log(profile);
// { name: 'Elon Musk', username: 'elonmusk', followers: 200000000, ... }

const followers = await scrapeFollowers(page, 'elonmusk', { limit: 100 });
console.log(`${followers.length} followers`);

await browser.close();
```

---

## Core Functions

### `createBrowser(options?)`

Launch a Puppeteer browser with stealth mode enabled (avoids bot detection).

**Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `options.headless` | `boolean` | `true` | Run in headless mode |
| `options.proxy` | `string` | — | HTTP(S) proxy URL |
| `options.userDataDir` | `string` | — | Persistent browser profile directory |
| `options.args` | `string[]` | — | Additional Chrome flags |

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
| `page` | `Page` | — | Puppeteer page |
| `username` | `string` | — | X username |
| `options.limit` | `number` | `100` | Max followers to return |

**Returns:** `Promise<User[]>`

```javascript
const followers = await scrapeFollowers(page, 'nichxbt', { limit: 500 });
followers.forEach(f => console.log(`@${f.username} — ${f.bio}`));
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
| `page` | `Page` | — | Puppeteer page |
| `username` | `string` | — | X username |
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
| `page` | `Page` | — | Puppeteer page |
| `query` | `string` | — | Search query (supports X search operators) |
| `options.limit` | `number` | `20` | Max results |

**Returns:** `Promise<Tweet[]>`

```javascript
// Basic search
const tweets = await searchTweets(page, 'xactions', { limit: 100 });

// Advanced search operators
const viral = await searchTweets(page, 'AI tools min_faves:1000 lang:en', { limit: 50 });
```

---

### `downloadVideo(page, tweetUrl)`

Extract video download URLs from a tweet.

**Returns:** `Promise<VideoResult>`

```javascript
const video = await downloadVideo(page, 'https://x.com/user/status/123456');
console.log(video.variants[0].url); // Direct MP4 URL
```

---

### `exportBookmarks(page, options?)`

Export your saved bookmarks.

**Returns:** `Promise<Bookmark[]>`

---

### `unrollThread(page, tweetUrl)`

Unroll a thread into a single readable document.

**Returns:** `Promise<Thread>`

```javascript
const thread = await unrollThread(page, 'https://x.com/user/status/123456');
console.log(`Thread by @${thread.author}: ${thread.totalTweets} tweets`);
console.log(thread.text); // Full thread as text
```

---

## Manager Modules

Manager modules are higher-level Puppeteer-based automation tools.

```javascript
import { dmManager, profileManager, engagementManager } from 'xactions';
```

| Module | Description |
|--------|-------------|
| `articlePublisher` | Publish long-form articles (Premium+) |
| `bookmarkManager` | Save, organize, export bookmarks |
| `businessTools` | Brand monitoring, competitor analysis |
| `creatorStudio` | Creator dashboard and analytics |
| `discoveryExplore` | Trending topics and explore page |
| `dmManager` | Send, read, export direct messages |
| `engagementManager` | Like, retweet, reply automation |
| `grokIntegration` | Query Grok AI |
| `notificationManager` | Read and manage notifications |
| `pollCreator` | Create polls |
| `postThread` | Post multi-tweet threads |
| `premiumManager` | Premium subscription features |
| `profileManager` | Update profile, settings, privacy |
| `schedulePosts` | Schedule future posts |
| `settingsManager` | Account settings and privacy |
| `spacesManager` | X Spaces integration |
| `tweetComposer` | Compose and post tweets |

---

## MCP Server

49+ tools for AI agent integration. See [MCP Server docs](examples/mcp-server.md).

```bash
# Start MCP server
node src/mcp/server.js

# Or via npx
npx xactions-mcp
```

**Claude Desktop config:**
```json
{
  "mcpServers": {
    "xactions": {
      "command": "npx",
      "args": ["-y", "xactions", "--mcp"],
      "env": {
        "XACTIONS_MODE": "local"
      }
    }
  }
}
```

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
- `--limit N` — Maximum items
- `--format json|csv` — Output format
- `--output file.json` — Save to file

---

## Browser Scripts

50+ scripts for pasting in the DevTools console. Listed via:

```javascript
import { browserScripts } from 'xactions';
console.log(Object.keys(browserScripts));
```

See the [full catalog in the README](../README.md#-complete-feature-list).

---

## Types

TypeScript declarations are included at `types/index.d.ts`.

```typescript
import type { Profile, User, Tweet, Thread, VideoResult } from 'xactions';
```

See [types/index.d.ts](../types/index.d.ts) for all interfaces.
