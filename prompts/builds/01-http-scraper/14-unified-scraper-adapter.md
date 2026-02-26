# Build 01-14 — Unified Scraper Adapter (HTTP)

> **Agent Role:** Implementer  
> **Depends on:** All previous HTTP scraper modules (05-13)  
> **Creates:** `src/scrapers/twitter/http/index.js`, updates `src/scrapers/adapters/http.js`  
> **No mock data. No stubs. Complete working code.**

---

## Task

Wire all HTTP scraper modules into a unified adapter that plugs into XActions' existing adapter system. After this, users can switch between Puppeteer and HTTP with a single config change.

---

## File: `src/scrapers/twitter/http/index.js`

### Barrel Export

```javascript
/**
 * XActions Twitter HTTP Scraper
 * Direct HTTP-based scraping via Twitter's internal GraphQL API
 * No browser required. 10x faster. Works in serverless/edge.
 * 
 * @author nich (@nichxbt)
 * @license MIT
 */

export { TwitterHttpClient, WaitingRateLimitStrategy, ErrorRateLimitStrategy } from './client.js';
export { TwitterAuth } from './auth.js';
export { GuestTokenManager } from './guest.js';

// Scraping functions
export { scrapeProfile, scrapeProfileById, parseUserData } from './profile.js';
export { scrapeTweets, scrapeTweetsAndReplies, scrapeTweetById, scrapeThread, parseTweetData } from './tweets.js';
export { scrapeFollowers, scrapeFollowing, scrapeNonFollowers, scrapeLikers, scrapeRetweeters, scrapeListMembers } from './relationships.js';
export { searchTweets, searchUsers, buildAdvancedQuery, scrapeTrending, scrapeHashtag } from './search.js';
export { scrapeFullThread, scrapeConversation } from './thread.js';

// Action functions (mutations)
export { postTweet, postThread, deleteTweet, replyToTweet, quoteTweet } from './actions.js';
export { likeTweet, unlikeTweet, retweet, unretweet, followUser, unfollowUser, blockUser, unblockUser, muteUser, unmuteUser, bookmarkTweet, unbookmarkTweet, bulkUnfollow, bulkLike } from './engagement.js';
export { uploadMedia, uploadImage, uploadVideo, uploadGif, scrapeMedia, downloadMedia, getVideoUrl } from './media.js';
export { sendDM, sendDMByUsername, getInbox, getConversation } from './dm.js';

// Endpoint constants
export { BEARER_TOKEN, GRAPHQL_QUERIES, DEFAULT_FEATURES, buildGraphQLUrl } from './endpoints.js';
// Error classes
export * from './errors.js';
```

### Convenience Factory

```javascript
/**
 * Create an HTTP scraper instance ready to use.
 * 
 * @param {Object} options
 * @param {string} [options.cookies] - Browser cookie string for authentication
 * @param {string} [options.proxy] - HTTP/SOCKS5 proxy URL
 * @param {'wait'|'error'} [options.rateLimitStrategy] - How to handle rate limits
 * @returns {Object} Scraper with all methods bound to the client
 * 
 * @example
 * import { createHttpScraper } from 'xactions/scrapers/twitter/http';
 * const scraper = await createHttpScraper({ cookies: 'auth_token=xxx; ct0=yyy' });
 * const profile = await scraper.scrapeProfile('elonmusk');
 * const tweets = await scraper.scrapeTweets('elonmusk', { limit: 50 });
 */
export async function createHttpScraper(options = {}) {
  const client = new TwitterHttpClient(options);
  if (options.cookies) {
    const auth = new TwitterAuth(client);
    await auth.loginWithCookies(options.cookies);
  }
  
  return {
    client,
    // Bind all functions to client
    scrapeProfile: (username) => scrapeProfile(client, username),
    scrapeTweets: (username, opts) => scrapeTweets(client, username, opts),
    scrapeFollowers: (username, opts) => scrapeFollowers(client, username, opts),
    scrapeFollowing: (username, opts) => scrapeFollowing(client, username, opts),
    searchTweets: (query, opts) => searchTweets(client, query, opts),
    // ... all other functions
  };
}
```

---

## File: `src/scrapers/adapters/http.js`

Implement adapter interface matching `src/scrapers/adapters/base.js`:

```javascript
import { BaseAdapter } from './base.js';
import { createHttpScraper } from '../twitter/http/index.js';

export class HttpAdapter extends BaseAdapter {
  name = 'http';
  
  async launch(options = {}) {
    // "Launch" for HTTP means create a client (no browser to launch)
    const scraper = await createHttpScraper(options);
    return { _adapter: 'http', _scraper: scraper, ...scraper };
  }

  async newPage(browser, options = {}) {
    // HTTP doesn't have pages, return the scraper as the "page"
    return browser._scraper;
  }

  async setCookie(page, cookie) {
    page.client.setCookies(`${cookie.name}=${cookie.value}`);
  }

  async close(browser) {
    // No browser to close
  }
}
```

---

## File Updates

### `src/scrapers/adapters/index.js`
Register the HTTP adapter:
```javascript
import { HttpAdapter } from './http.js';
registerAdapter('http', new HttpAdapter());
```

### `src/scrapers/index.js`
Add HTTP to the unified scrape interface:
```javascript
// Usage: createBrowser({ adapter: 'http', cookies: '...' })
```

### `package.json`
Add export:
```json
"./scrapers/twitter/http": "./src/scrapers/twitter/http/index.js"
```

---

## Test File: `tests/http-scraper/adapter.test.js`

1. Test HTTP adapter implements BaseAdapter interface
2. Test `createHttpScraper` returns object with all expected methods
3. Test adapter registration in adapter index
4. Test that `createBrowser({ adapter: 'http' })` works
5. Test backward compatibility — existing Puppeteer imports still work

---

## Acceptance Criteria

- [ ] All HTTP scraper functions exported from barrel index
- [ ] `createHttpScraper()` factory works as one-liner setup
- [ ] HTTP adapter plugs into existing adapter system
- [ ] `createBrowser({ adapter: 'http' })` works
- [ ] Existing Puppeteer code paths are untouched
- [ ] Package.json export added
- [ ] All tests pass
