# XActions Core Module Reference (`core.js`)

> The foundation of every XActions browser automation. Always paste this first.

**Source:** [`src/automation/core.js`](../../src/automation/core.js) (521 lines)

---

## Table of Contents

- [Overview](#overview)
- [Loading](#loading)
- [CONFIG — Timing & Limits](#config--timing--limits)
- [SELECTORS — DOM Element Map](#selectors--dom-element-map)
- [Utility Functions](#utility-functions)
- [Storage System](#storage-system)
- [DOM Helpers](#dom-helpers)
- [User Extraction](#user-extraction)
- [Extraction Diagnostics](#extraction-diagnostics)
- [Rate Limiting](#rate-limiting)
- [Action Queue](#action-queue)
- [Full Public API](#full-public-api)

---

## Overview

`core.js` creates `window.XActions.Core` — a namespace containing every shared utility that automation scripts need. It's an IIFE (immediately-invoked function expression) that returns a public API object.

Every other automation script checks for `window.XActions?.Core` at the top. If it's not loaded, the script aborts with:

```
❌ Core module not loaded! Paste core.js first.
```

When successfully loaded, you'll see:

```
✅ XActions Core loaded! Ready for automation scripts.
```

---

## Loading

```javascript
// In browser DevTools console on x.com:
// 1. Copy the contents of src/automation/core.js
// 2. Paste into the console
// 3. Press Enter

// Verify it loaded:
window.XActions.Core.log('Hello!', 'success');
// Output: ✅ [12:34:56] Hello!
```

---

## CONFIG — Timing & Limits

Default configuration values used across all scripts.

```javascript
const CONFIG = {
  // Timing (milliseconds)
  DELAY_SHORT: 500,
  DELAY_MEDIUM: 1500,
  DELAY_LONG: 3000,
  DELAY_BETWEEN_ACTIONS: 2000,

  // Rate limits
  MAX_ACTIONS_PER_HOUR: 50,
  MAX_FOLLOWS_PER_DAY: 100,
  MAX_LIKES_PER_DAY: 200,

  // Storage
  STORAGE_PREFIX: 'xactions_',

  // Debug
  DEBUG: true,
};
```

### Customizing at Runtime

```javascript
// Slow down all actions
window.XActions.Core.CONFIG.DELAY_BETWEEN_ACTIONS = 5000;

// Disable debug logging
window.XActions.Core.CONFIG.DEBUG = false;

// Increase daily follow limit
window.XActions.Core.CONFIG.MAX_FOLLOWS_PER_DAY = 150;
```

> **Note:** Individual scripts override these with their own `OPTIONS` or `STRATEGY` objects. Changing CONFIG affects only scripts that read from it directly.

---

## SELECTORS — DOM Element Map

CSS selectors for X/Twitter DOM elements. These use `data-testid` attributes (React testing IDs) for stability.

| Key | Selector | Element |
|-----|----------|---------|
| `followButton` | `[data-testid$="-follow"]` | Follow button (suffix match) |
| `unfollowButton` | `[data-testid$="-unfollow"]` | Unfollow/Following button |
| `likeButton` | `[data-testid="like"]` | Like (heart) button |
| `unlikeButton` | `[data-testid="unlike"]` | Unlike (filled heart) |
| `retweetButton` | `[data-testid="retweet"]` | Retweet button |
| `replyButton` | `[data-testid="reply"]` | Reply button |
| `confirmButton` | `[data-testid="confirmationSheetConfirm"]` | Confirm dialog |
| `tweet` | `[data-testid="tweet"]` | Individual tweet/post |
| `tweetText` | `[data-testid="tweetText"]` | Tweet text content |
| `tweetLink` | `a[href*="/status/"]` | Tweet permalink |
| `userCell` | `[data-testid="UserCell"]` | User in a list |
| `userAvatar` | `[data-testid="UserAvatar-Container"]` | User avatar |
| `userName` | `[data-testid="User-Name"]` | User display name |
| `userFollowIndicator` | `[data-testid="userFollowIndicator"]` | "Follows you" badge |
| `userDescription` | `[data-testid="UserDescription"]` | User bio text |
| `userLink` | `a[href^="/"]` | Profile link |
| `verifiedBadge` | `[data-testid="icon-verified"]` | Verified badge |
| `protectedIcon` | `[data-testid="icon-lock"]` | Protected/private icon |
| `tweetInput` | `[data-testid="tweetTextarea_0"]` | Tweet compose box |
| `searchInput` | `[data-testid="SearchBox_Search_Input"]` | Search input |
| `primaryColumn` | `[data-testid="primaryColumn"]` | Main content column |
| `timeline` | `section[role="region"]` | Timeline section |

### Usage

```javascript
const { SELECTORS } = window.XActions.Core;

// Find all tweets on current page
document.querySelectorAll(SELECTORS.tweet);

// Find the follow button in a user cell
userCell.querySelector(SELECTORS.followButton);

// Check if a tweet is already liked
!!tweetElement.querySelector(SELECTORS.unlikeButton);
```

> **Why suffix match for follow/unfollow?** X prefixes the `data-testid` with context (e.g., `UserCell-follow`). Using `$="-follow"` matches regardless of prefix.

---

## Utility Functions

### `sleep(ms)`

Promise-based delay.

```javascript
await Core.sleep(2000); // Wait 2 seconds
```

### `randomDelay(min, max)`

Random delay between `min` and `max` milliseconds. Essential for human-like behavior.

```javascript
await Core.randomDelay(1000, 3000); // Wait 1-3 seconds randomly
```

### `log(message, type)`

Emoji-prefixed console output with timestamp.

| Type | Emoji | When to Use |
|------|-------|-------------|
| `'info'` | 📘 | General information |
| `'success'` | ✅ | Successful actions |
| `'warning'` | ⚠️ | Non-critical issues |
| `'error'` | ❌ | Errors (always prints, even with DEBUG off) |
| `'action'` | 🔧 | Action being performed |

```javascript
Core.log('Found 15 users', 'info');
// Output: 📘 [12:34:56] Found 15 users

Core.log('Followed @user!', 'success');
// Output: ✅ [12:34:57] Followed @user!
```

> When `CONFIG.DEBUG` is `false`, only `'error'` type logs are printed.

### `scrollToBottom()` / `scrollToTop()` / `scrollBy(pixels)`

Smooth scrolling helpers.

```javascript
Core.scrollToBottom();    // Scroll to page bottom
Core.scrollToTop();       // Scroll to page top
Core.scrollBy(800);       // Scroll down 800px
Core.scrollBy(-400);      // Scroll up 400px
```

---

## Storage System

localStorage wrapper with automatic JSON serialization. All keys are prefixed with `xactions_`.

### `storage.get(key)`

Read a value. Returns `null` if not found.

```javascript
const users = Core.storage.get('followed_users');
// Reads localStorage key "xactions_followed_users"
// Returns: parsed JSON object, or null
```

### `storage.set(key, value)`

Write a value. Returns `true` on success.

```javascript
Core.storage.set('followed_users', { alice: { followedAt: Date.now() } });
// Writes JSON to "xactions_followed_users"
```

### `storage.remove(key)`

Delete a key.

```javascript
Core.storage.remove('followed_users');
```

### `storage.list()`

List all XActions storage keys (without prefix).

```javascript
Core.storage.list();
// Returns: ['followed_users', 'liked_tweets', 'session_log', ...]
```

### `storage.clear()`

Delete all XActions data from localStorage.

```javascript
Core.storage.clear();
// Removes everything with 'xactions_' prefix
```

### Common Storage Keys

| Key | Written By | Contains |
|-----|-----------|----------|
| `followed_users` | keywordFollow, followTargetUsers, growthSuite | `{ username: { followedAt, followedBack, checkedAt } }` |
| `liked_tweets` | autoLiker | `[tweetId, ...]` |
| `commented_tweets` | autoCommenter | `[tweetId, ...]` |
| `protected_users` | protectActiveUsers | `[username, ...]` |
| `my_followers` | smartUnfollow | `[username, ...]` |
| `ratelimit_*` | rateLimit system | `{ count, timestamp }` |
| `session_log` | sessionLogger | Array of action entries |
| `engager_followed` | followEngagers | `{ username: { at, source, postUrl } }` |
| `growth_followed` | growthSuite | `{ username: { at, source } }` |
| `growth_liked` | growthSuite | `[tweetId, ...]` |

### Inspecting All Stored Data

```javascript
// View everything XActions has stored
Object.keys(localStorage)
  .filter(k => k.startsWith('xactions_'))
  .forEach(k => console.log(k, JSON.parse(localStorage.getItem(k))));
```

---

## DOM Helpers

### `waitForElement(selector, timeout)`

Poll the DOM until an element matching `selector` appears. Returns the element or `null` after timeout (default: 10 seconds).

```javascript
const textarea = await Core.waitForElement('[data-testid="tweetTextarea_0"]');
if (textarea) {
  // Element found — interact with it
}
```

### `waitForElements(selector, minCount, timeout)`

Wait until at least `minCount` elements match the selector. Returns an array.

```javascript
const tweets = await Core.waitForElements('[data-testid="tweet"]', 5, 15000);
// Wait up to 15s for at least 5 tweets to load
```

### `clickElement(element)`

Scrolls the element into view, waits 300ms, then clicks. Returns `true`/`false`.

```javascript
const btn = document.querySelector('[data-testid="like"]');
await Core.clickElement(btn);
```

### `typeText(element, text, delay)`

Types text character-by-character into a contenteditable element, dispatching `InputEvent`s for each character. Default character delay: 50ms.

```javascript
const textarea = await Core.waitForElement('[data-testid="tweetTextarea_0"]');
await Core.typeText(textarea, 'Hello from XActions!');
```

> **Why character-by-character?** X uses React controlled inputs that don't respond to `.value =` or `.textContent =` directly. The synthetic InputEvents trigger React's state updates.

---

## User Extraction

### `extractUsername(element)`

Extract a username from any element containing a profile link.

```javascript
const username = Core.extractUsername(tweetElement);
// Returns: 'elonmusk' (lowercase, no @)
```

### `extractTweetInfo(tweetElement)`

Extract structured data from a tweet element.

```javascript
const info = Core.extractTweetInfo(tweetElement);
// Returns: {
//   text: 'Tweet text content...',
//   links: ['https://external-link.com'],
//   tweetLink: 'https://x.com/user/status/123',
//   userName: 'Display Name'
// }
```

### `extractUserFromCell(cell)`

The workhorse extractor — pulls full user data from a `[data-testid="UserCell"]` element using **multiple fallback strategies** per field.

```javascript
const user = Core.extractUserFromCell(userCellElement);
// Returns:
// {
//   username: 'alice',            // @handle (lowercase)
//   displayName: 'Alice',         // Display name
//   bio: 'Web3 builder...',       // Bio text
//   followers: 10500,             // Parsed follower count
//   isFollowing: false,           // Are you following them?
//   followsYou: true,             // Do they follow you?
//   isVerified: false,            // Blue check?
//   isProtected: false,           // Private account?
//   _meta: {                      // Debugging metadata
//     bioStrategy: 'testid',      // Which extraction method worked
//     nameStrategy: 'testid'
//   }
// }
```

#### Extraction Strategies (in order of priority)

**Display Name:**
1. `data-testid="User-Name"` — most stable
2. `[dir="ltr"] > span` — common fallback
3. First non-@ span with 2-50 characters — last resort

**Bio:**
1. `data-testid="UserDescription"` — most reliable
2. `[dir="auto"]:not([data-testid])` — catches variant DOMs
3. `[dir="auto"]:not([role])` — another variant
4. Span iteration — last resort, skips links and count patterns

**Follower Count:**
- Regex match on cell text: `(\d[\d,]*\.?\d*[KMB]?)\s*Follower`
- Parsed by `parseCount()`: `"10.5K"` → `10500`

### `parseCount(str)`

Parse human-readable numbers.

```javascript
Core.parseCount('10.5K');   // 10500
Core.parseCount('1,234');   // 1234
Core.parseCount('2.3M');    // 2300000
Core.parseCount('1B');      // 1000000000
```

---

## Extraction Diagnostics

Tracks which extraction strategies succeed, alerting when X changes their DOM.

### `extractionStats.report()`

Print a strategy usage report.

```javascript
Core.extractionStats.report();
// Output:
// 📊 Extraction Strategy Report:
//   bio: 45 extractions
//     testid: 40 (88.9%) ████████████████
//     dir-auto: 5 (11.1%) ██
//   name: 45 extractions
//     testid: 43 (95.6%) ███████████████████
//     dir-ltr: 2 (4.4%) █
```

If the primary `testid` strategy drops below 50%, it warns:

```
⚠️ WARNING: Primary bio selector (data-testid) working less than 50% of the time.
Twitter may have changed their DOM!
```

### `extractionStats.reset()`

Clear accumulated statistics.

---

## Rate Limiting

Per-action rate tracking with automatic period resets.

### `rateLimit.check(action, limit, period)`

Check if an action is under the limit. Returns `true` if allowed.

```javascript
if (Core.rateLimit.check('follow', 100, 'day')) {
  // Under the daily follow limit — proceed
}

if (Core.rateLimit.check('like', 50, 'hour')) {
  // Under the hourly like limit
}
```

### `rateLimit.increment(action, period)`

Increment the counter after performing an action.

```javascript
Core.rateLimit.increment('follow', 'day');
Core.rateLimit.increment('like', 'hour');
```

### `rateLimit.getRemaining(action, limit, period)`

Get how many actions remain in the current period.

```javascript
const remaining = Core.rateLimit.getRemaining('follow', 100, 'day');
console.log(`${remaining} follows left today`);
```

### How It Works

- Counters are stored in localStorage as `xactions_ratelimit_{action}_{period}`
- Each entry stores `{ count, timestamp }`
- When the period expires (1 hour or 24 hours), the counter auto-resets to 0
- Periods: `'hour'` (3,600,000ms) or `'day'` (86,400,000ms)

---

## Action Queue

Sequential task processor with built-in delays.

### `actionQueue.add(asyncFunction, ...args)`

Add an async function to the queue. If the queue isn't already processing, it starts automatically.

```javascript
Core.actionQueue.add(followUser, 'alice');
Core.actionQueue.add(followUser, 'bob');
Core.actionQueue.add(followUser, 'charlie');
// Executes sequentially with randomDelay between each
```

### `actionQueue.clear()`

Flush all pending actions.

### `actionQueue.length()`

Get the number of pending actions.

### Processing Behavior

- Actions execute one at a time (sequential, not parallel)
- After each action, waits `randomDelay(CONFIG.DELAY_BETWEEN_ACTIONS, CONFIG.DELAY_BETWEEN_ACTIONS * 1.5)`
- Errors are caught and logged — the queue continues processing
- The queue is self-starting and self-stopping (no separate start/stop calls needed)

---

## Full Public API

Everything exposed by `window.XActions.Core`:

```javascript
{
  CONFIG,              // Configuration object (mutable)
  SELECTORS,           // DOM selector map
  sleep,               // sleep(ms)
  randomDelay,         // randomDelay(min, max)
  log,                 // log(message, type)
  scrollToBottom,      // scrollToBottom()
  scrollToTop,         // scrollToTop()
  scrollBy,            // scrollBy(pixels)
  storage,             // { get, set, remove, list, clear }
  waitForElement,      // waitForElement(selector, timeout)
  waitForElements,     // waitForElements(selector, minCount, timeout)
  clickElement,        // clickElement(element)
  typeText,            // typeText(element, text, delay)
  extractUsername,      // extractUsername(element)
  extractTweetInfo,    // extractTweetInfo(tweetElement)
  extractUserFromCell, // extractUserFromCell(cellElement)
  parseCount,          // parseCount(str)
  rateLimit,           // { check, increment, getRemaining }
  actionQueue,         // { add, clear, length }
  extractionStats,     // { record, report, reset }
}
```
