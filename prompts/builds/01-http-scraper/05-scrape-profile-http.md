# Build 01-05 — Scrape Profile via HTTP

> **Agent Role:** Implementer  
> **Depends on:** 01-endpoints, 02-client, 03-auth  
> **Creates:** `src/scrapers/twitter/http/profile.js`  
> **No mock data. No stubs. Complete working code.**

---

## Task

Implement profile scraping via Twitter's GraphQL `UserByScreenName` endpoint, replacing the Puppeteer-based `scrapeProfile()` that currently DOM-scrapes the page.

---

## Current Implementation to Replace

From `src/scrapers/twitter/index.js` line 126:
```javascript
export async function scrapeProfile(page, username) {
  await page.goto(`https://x.com/${username}`, { waitUntil: 'networkidle2' });
  // ... DOM scraping with page.evaluate()
}
```

This requires a full browser. The HTTP version does not.

---

## File: `src/scrapers/twitter/http/profile.js`

### Functions

1. **`async scrapeProfile(client, username)`**
   - GraphQL query: `UserByScreenName`
   - Variables: `{ screen_name: username, withSafetyModeUserFields: true }`
   - Parse response to extract:
     ```javascript
     {
       id: string,              // rest_id
       name: string,            // legacy.name
       username: string,        // legacy.screen_name
       bio: string,             // legacy.description
       location: string,        // legacy.location
       website: string,         // legacy.url (expanded)
       joined: string,          // legacy.created_at
       birthday: string|null,   // legacy.birthdate (if public)
       following: number,       // legacy.friends_count
       followers: number,       // legacy.followers_count
       tweets: number,          // legacy.statuses_count
       likes: number,           // legacy.favourites_count
       media: number,           // legacy.media_count
       avatar: string,          // legacy.profile_image_url_https (replace _normal with _400x400)
       header: string,          // legacy.profile_banner_url
       verified: boolean,       // is_blue_verified or legacy.verified
       protected: boolean,      // legacy.protected
       pinnedTweetId: string,   // pinned_tweet_ids_str[0]
       platform: 'twitter',
     }
     ```
   - Works with both guest tokens (public profiles) and auth tokens (any profile)
   - Throws `NotFoundError` for non-existent usernames
   - Throws `AuthError` for suspended/protected accounts without auth

2. **`async scrapeProfileById(client, userId)`**
   - GraphQL query: `UserByRestId`
   - Same response parsing as above
   - Useful for following up on user IDs from other endpoints

3. **`parseUserData(rawUser)`** — Pure function that transforms Twitter's raw GraphQL response into the clean XActions profile format
   - Handles `__typename: 'User'` vs `'UserUnavailable'`
   - Expands t.co URLs to real URLs
   - Converts `created_at` string to ISO date
   - Lists all entity types (urls, hashtags, mentions in bio)

### Response Handling

Twitter's GraphQL response for `UserByScreenName`:
```json
{
  "data": {
    "user": {
      "result": {
        "__typename": "User",
        "id": "VXNlcjo...",
        "rest_id": "44196397",
        "legacy": {
          "name": "Elon Musk",
          "screen_name": "elonmusk",
          "description": "...",
          "followers_count": 200000000,
          "friends_count": 800,
          ...
        },
        "is_blue_verified": true,
        ...
      }
    }
  }
}
```

Handle edge cases:
- `__typename: 'UserUnavailable'` — account suspended, deactivated
- `legacy.protected: true` — protected account
- Missing fields (new accounts may not have all fields)
- Rate-limited response with `errors` array

---

## Test File: `tests/http-scraper/profile.test.js`

1. Test `parseUserData` with complete raw Twitter response
2. Test `parseUserData` with minimal fields response
3. Test `parseUserData` with `UserUnavailable` response
4. Test avatar URL upgrade from `_normal` to `_400x400`
5. Test t.co URL expansion in bio entities
6. Test `scrapeProfile` calls client.graphql with correct params
7. Test error handling for 404 (user not found)
8. Test output matches XActions profile format (has `platform: 'twitter'`)

Provide **realistic test fixtures** based on actual Twitter API response shapes (with fake user data, but real structure).

---

## Acceptance Criteria

- [ ] Returns identical field names to current Puppeteer `scrapeProfile()`
- [ ] Handles all edge cases (suspended, protected, new accounts)
- [ ] Parses real Twitter GraphQL response format
- [ ] Works with both guest and authenticated clients
- [ ] All tests pass with realistic fixtures
