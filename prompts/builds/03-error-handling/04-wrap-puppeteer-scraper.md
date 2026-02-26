# Build 03-04 — Wrap Puppeteer Scraper with Error Handling

> **Modifies:** `src/scrapers/twitter/index.js`

---

## Task

Wrap every exported function in `src/scrapers/twitter/index.js` with proper try/catch/finally blocks, retry logic, and structured error reporting. This is the single highest-impact change in the entire error handling track — the 952-line scraper currently has **zero** try/catch blocks.

---

## Implementation Plan

### 1. Import error utilities at top of file

```javascript
import { XActionsError, RateLimitError, AuthError, NetworkError, ScraperError } from '../utils/errors.js';
import { twitterRetry } from '../utils/retry.js';
import { RateLimitManager, WaitingRateLimitStrategy } from '../utils/rateLimiter.js';
```

### 2. Wrap `createBrowser()` (~line 20)

```javascript
export async function createBrowser(options = {}) {
  try {
    const browser = await puppeteer.launch({
      headless: options.headless ?? 'new',
      args: options.args ?? ['--no-sandbox', '--disable-setuid-sandbox'],
      ...options,
    });
    return browser;
  } catch (err) {
    throw new ScraperError(
      `Failed to launch browser: ${err.message}`,
      { cause: err, context: { headless: options.headless } }
    );
  }
}
```

### 3. Wrap `createPage()` (~line 35)

```javascript
export async function createPage(browser, options = {}) {
  let page;
  try {
    page = await browser.newPage();
    if (options.userAgent) await page.setUserAgent(options.userAgent);
    if (options.viewport) await page.setViewport(options.viewport);
    // existing setup...
    return page;
  } catch (err) {
    if (page) await page.close().catch(() => {});
    throw new ScraperError(
      `Failed to create page: ${err.message}`,
      { cause: err }
    );
  }
}
```

### 4. Wrap `loginWithCookie()` (~line 55)

```javascript
export async function loginWithCookie(page, cookie) {
  if (!cookie || typeof cookie !== 'string') {
    throw new AuthError('Cookie is required and must be a non-empty string');
  }
  try {
    // existing cookie-setting logic...
    await page.goto('https://x.com/home', { waitUntil: 'networkidle2', timeout: 30000 });
    // Verify login worked
    const isLoggedIn = await page.evaluate(() => {
      return !!document.querySelector('[data-testid="primaryColumn"]');
    });
    if (!isLoggedIn) {
      throw new AuthError('Cookie login failed — session may be expired', {
        context: { cookieLength: cookie.length }
      });
    }
  } catch (err) {
    if (err instanceof AuthError) throw err;
    throw new AuthError(`Login failed: ${err.message}`, { cause: err });
  }
}
```

### 5. Each scraping function pattern (scrapeProfile, scrapeFollowers, etc.)

Apply this pattern to ALL 18 scraper functions:

```javascript
export async function scrapeProfile(page, username, options = {}) {
  if (!username || typeof username !== 'string') {
    throw new ValidationError('username is required and must be a string');
  }
  
  return twitterRetry(async () => {
    try {
      await page.goto(`https://x.com/${username}`, {
        waitUntil: 'networkidle2',
        timeout: options.timeout ?? 30000,
      });

      // Check for known error states
      const pageContent = await page.content();
      if (pageContent.includes('This account doesn't exist')) {
        throw new NotFoundError(`User @${username} not found`);
      }
      if (pageContent.includes('Account suspended')) {
        throw new SuspendedError(`User @${username} is suspended`);
      }
      if (pageContent.includes('Rate limit exceeded')) {
        throw new RateLimitError('Rate limited by Twitter', {
          retryAfterMs: 15 * 60 * 1000,
        });
      }

      // ... existing scraping logic ...

      return profileData;
    } catch (err) {
      if (err instanceof XActionsError) throw err;
      throw new ScraperError(
        `Failed to scrape profile for @${username}: ${err.message}`,
        { cause: err, context: { username, options } }
      );
    }
  }, {
    maxRetries: options.retries ?? 3,
    shouldRetry: (err) => !(err instanceof NotFoundError || err instanceof SuspendedError || err instanceof AuthError),
  });
}
```

### 6. Functions to wrap (all 18 exports)

| Function | Line | Key error states |
|----------|------|-----------------|
| `createBrowser` | ~20 | Launch failure, missing Chrome |
| `createPage` | ~35 | Page creation failure |
| `loginWithCookie` | ~55 | Invalid cookie, expired session |
| `scrapeProfile` | ~126 | Not found, suspended, rate limit |
| `scrapeFollowers` | ~170 | Rate limit, private account |
| `scrapeFollowing` | ~220 | Rate limit, private account |
| `scrapeTweets` | ~270 | Rate limit, protected tweets |
| `searchTweets` | ~340 | Rate limit, empty results |
| `scrapeThread` | ~400 | Not found, deleted tweet |
| `scrapeLikes` | ~460 | Rate limit, private |
| `scrapeHashtag` | ~510 | Rate limit |
| `scrapeMedia` | ~560 | Rate limit |
| `scrapeListMembers` | ~620 | Not found, private list |
| `scrapeBookmarks` | ~670 | Auth required |
| `scrapeNotifications` | ~720 | Auth required |
| `scrapeTrending` | ~770 | Rate limit |
| `scrapeCommunityMembers` | ~820 | Not found |
| `scrapeSpaces` | ~860 | Not found |

### 7. Add page error listeners

```javascript
function attachPageErrorHandlers(page, context = {}) {
  page.on('error', (err) => {
    console.error(`🔴 Page crashed: ${err.message}`, context);
  });
  page.on('pageerror', (err) => {
    // Ignore expected Twitter JS errors
    if (err.message.includes('ResizeObserver')) return;
    console.warn(`⚠️ Page JS error: ${err.message}`, context);
  });
  page.on('requestfailed', (request) => {
    const url = request.url();
    if (url.includes('/api/') || url.includes('/graphql/')) {
      console.warn(`⚠️ API request failed: ${url}`, request.failure()?.errorText);
    }
  });
}
```

---

## Tests: `tests/errors/scraper-error-handling.test.js`

1. Test scrapeProfile throws NotFoundError for non-existent user
2. Test scrapeProfile throws SuspendedError for suspended account
3. Test loginWithCookie throws AuthError for empty cookie
4. Test retry behavior on transient network errors
5. Test createBrowser wraps launch errors in ScraperError
6. Test validation errors for missing required params

---

## Acceptance Criteria
- [ ] All 18 exported functions wrapped with try/catch
- [ ] Input validation on all functions (throw ValidationError for bad args)
- [ ] Page error state detection (not found, suspended, rate limit)
- [ ] Retry integration via `twitterRetry` wrapper
- [ ] Structured error context includes function name, params, timing
- [ ] No swallowed errors — every catch either re-throws or wraps
- [ ] Existing tests still pass after changes
