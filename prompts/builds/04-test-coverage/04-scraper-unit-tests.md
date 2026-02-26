# Build 04-04 — Scraper Unit Tests

> **Creates:** `tests/scrapers/twitter.test.js`
> **Tests:** `src/scrapers/twitter/index.js`

---

## Task

Write unit tests for all 18 exported functions in the Puppeteer-based Twitter scraper. Mock the Puppeteer page/browser — no real browser launches.

---

## Test Plan

### Tests for each function:

**createBrowser()**
1. Returns a browser object
2. Passes headless option through
3. Wraps launch errors in ScraperError (after Track 03)

**createPage(browser)**
1. Calls browser.newPage()
2. Sets user agent if provided
3. Sets viewport if provided

**loginWithCookie(page, cookie)**
1. Sets cookies on page
2. Navigates to x.com/home
3. Throws AuthError for empty cookie
4. Throws AuthError if login check fails

**scrapeProfile(page, username)**
1. Navigates to profile URL
2. Returns profile data with all fields
3. Handles not-found page
4. Handles suspended page

**scrapeFollowers(page, username, options)**
1. Navigates to followers page
2. Returns array of follower objects
3. Respects count option
4. Handles empty results

**scrapeFollowing(page, username, options)**
1. Returns array of following objects
2. Respects count option

**scrapeTweets(page, username, options)**
1. Returns array of tweet objects with text, date, metrics
2. Respects count option
3. Handles protected account

**searchTweets(page, query, options)**
1. Navigates to search URL with query
2. Returns matching tweets
3. Handles empty results

**scrapeThread(page, tweetUrl)**
1. Returns thread array
2. Handles deleted tweet

**scrapeLikes(page, username)**
1. Returns liked tweets array

**scrapeHashtag(page, hashtag)**
1. Returns tweets for hashtag
2. Strips # prefix if provided

**scrapeMedia(page, username)**
1. Returns media URLs

**scrapeListMembers(page, listId)**
1. Returns members array

**scrapeBookmarks(page)**
1. Requires authentication
2. Returns bookmarked tweets

**scrapeNotifications(page)**
1. Requires authentication
2. Returns notification objects

**scrapeTrending(page)**
1. Returns trending topics

**scrapeCommunityMembers(page, communityId)**
1. Returns community member list

**scrapeSpaces(page, query)**
1. Returns spaces results

**exportToJSON(data, filename)**
1. Writes JSON to file
2. Returns file path

**exportToCSV(data, filename)**
1. Converts data to CSV format
2. Writes CSV to file

---

## Implementation Pattern

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockPage, createMockBrowser, createMockProfilePage, createMockNotFoundPage } from '../helpers/index.js';

// Mock puppeteer module
vi.mock('puppeteer-extra', () => ({
  default: {
    use: vi.fn().mockReturnThis(),
    launch: vi.fn().mockResolvedValue(createMockBrowser()),
  },
}));

describe('Twitter Scraper', () => {
  let page;

  beforeEach(() => {
    page = createMockProfilePage({
      username: 'testuser',
      displayName: 'Test User',
      followersCount: 1000,
    });
  });

  describe('scrapeProfile', () => {
    it('navigates to the correct URL', async () => {
      const { scrapeProfile } = await import('../../src/scrapers/twitter/index.js');
      await scrapeProfile(page, 'testuser');
      expect(page.goto).toHaveBeenCalledWith(
        expect.stringContaining('testuser'),
        expect.any(Object)
      );
    });

    it('returns structured profile data', async () => {
      const { scrapeProfile } = await import('../../src/scrapers/twitter/index.js');
      const profile = await scrapeProfile(page, 'testuser');
      expect(profile).toHaveProperty('username');
      expect(profile).toHaveProperty('followersCount');
    });
  });
  
  // ... 40+ total tests
});
```

---

## Acceptance Criteria
- [ ] All 18 exported functions have at least 2 tests each
- [ ] Minimum 40 test cases total
- [ ] Puppeteer fully mocked — no real browser launches
- [ ] Tests use mock factories from Build 04-02
- [ ] Edge cases tested (empty results, errors, missing fields)
- [ ] All tests pass with `npx vitest tests/scrapers/twitter.test.js`
