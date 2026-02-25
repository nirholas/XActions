# XActions Automation Scripts — Complete Reference

> Every automation script in `src/automation/`, explained with config options, usage, and examples.

---

## Table of Contents

- [How Scripts Work](#how-scripts-work)
- [Growth Scripts](#growth-scripts)
  - [autoLiker.js](#autolikerjs--timeline-auto-liker)
  - [autoCommenter.js](#autocommenterjs--auto-comment-on-new-posts)
  - [keywordFollow.js](#keywordfollowjs--search--follow-by-keyword)
  - [followTargetUsers.js](#followtargetusersjs--follow-followers-of-accounts)
  - [followEngagers.js](#followengagersjs--follow-post-engagers)
  - [growthSuite.js](#growthsuitejs--all-in-one-growth-automation)
- [Cleanup Scripts](#cleanup-scripts)
  - [smartUnfollow.js](#smartunfollowjs--time-based-smart-unfollow)
  - [protectActiveUsers.js](#protectactiveusersjs--protect-engaged-users)
- [Algorithm Scripts](#algorithm-scripts)
  - [algorithmTrainer.js](#algorithmtrainerjs--algorithm-trainer)
  - [algorithmBuilder.js](#algorithmbuilderjs--algorithm-builder-with-llm)
- [Monitoring & Safety](#monitoring--safety)
  - [quotaSupervisor.js](#quotasupervisorjs--rate-limit-manager)
  - [sessionLogger.js](#sessionloggerjs--action-tracker)
- [Utility Scripts](#utility-scripts)
  - [linkScraper.js](#linkscraperjs--extract-shared-links)
  - [customerService.js](#customerservicejs--customer-service-bot)
  - [multiAccount.js](#multiaccountjs--multi-account-manager)
- [UI Scripts](#ui-scripts)
  - [controlPanel.js](#controlpaneljs--floating-control-panel)
- [Node.js Scripts](#nodejs-scripts)
  - [evergreenRecycler.js](#evergreenrecyclerjs--evergreen-content-recycler)
  - [rssMonitor.js](#rssmonitorjs--rss--webhook-monitor)

---

## How Scripts Work

Every browser automation script follows the same pattern:

```javascript
(() => {
  // 1. Check for Core
  if (!window.XActions?.Core) {
    console.error('❌ Core module not loaded! Paste core.js first.');
    return;
  }

  // 2. Destructure needed utilities
  const { log, sleep, randomDelay, ... } = window.XActions.Core;

  // 3. Define OPTIONS (user configures these)
  const OPTIONS = { ... };

  // 4. Define state
  let count = 0;

  // 5. Main logic
  const run = async () => { ... };

  // 6. Expose stop function
  window.stopScriptName = () => { ... };

  // 7. Auto-start
  run();
})();
```

**Loading sequence:** Paste `core.js` → Paste script → It runs automatically.

**Stopping:** Either call `window.stopScriptName()` or refresh the page.

---

## Growth Scripts

### autoLiker.js — Timeline Auto-Liker

**Source:** [`src/automation/autoLiker.js`](../../src/automation/autoLiker.js) (197 lines)

Scrolls through your feed (or a profile) and likes posts matching your criteria.

**Run on:** Home feed, user profile, or search results.

#### Configuration

```javascript
const OPTIONS = {
  LIKE_ALL: false,                      // Like everything (careful!)
  KEYWORDS: ['web3', 'crypto', 'AI'],   // Only like posts containing these
  FROM_USERS: [],                       // Only from these users (empty = all)
  MAX_LIKES: 20,                        // Max likes per session
  MAX_SCROLL_DEPTH: 50,                 // Max scroll iterations
  ALSO_RETWEET: false,                  // Also retweet liked posts
  MIN_DELAY: 2000,                      // Min delay between likes (ms)
  MAX_DELAY: 5000,                      // Max delay between likes (ms)
  SKIP_REPLIES: true,                   // Skip reply tweets
  SKIP_ADS: true,                       // Skip promoted tweets
  MIN_LIKES_ON_POST: 0,                 // Only like posts with N+ existing likes
};
```

#### Behavior

1. Scans visible tweets for keyword/user matches
2. Skips already-liked tweets, replies, and ads
3. Clicks the like button, optionally retweets
4. Tracks liked tweet IDs in localStorage (`xactions_liked_tweets`)
5. Scrolls down and repeats until limits are reached
6. Respects daily rate limit (200 likes/day)

#### Stop Function

```javascript
window.stopAutoLiker();
```

---

### autoCommenter.js — Auto-Comment on New Posts

**Source:** [`src/automation/autoCommenter.js`](../../src/automation/autoCommenter.js) (288 lines)

Monitors a user's profile and auto-comments on their new posts.

**Run on:** A user's profile page (e.g., `x.com/USERNAME`).

#### Configuration

```javascript
const OPTIONS = {
  COMMENTS: [
    '🔥', 'Great point!', 'This is so true 👏',
    'Interesting take!', 'Love this perspective', '💯', 'Facts!',
  ],
  CHECK_INTERVAL_SECONDS: 60,     // Poll frequency
  MAX_COMMENTS_PER_SESSION: 5,    // Stop after this many
  ONLY_ORIGINAL_TWEETS: true,     // Skip replies and retweets
  REQUIRE_KEYWORD: false,         // Only comment if keyword matches
  KEYWORDS: [],                   // Keywords to match
  MIN_POST_AGE_SECONDS: 30,       // Don't comment on very new posts
  MAX_POST_AGE_MINUTES: 30,       // Don't comment on old posts
};
```

#### Behavior

1. Auto-detects the username from the URL
2. Scrolls to top and checks for new tweets
3. Filters by age, keyword, and comment history
4. Picks a random comment from the pool
5. Clicks Reply → types comment → clicks Post
6. Saves commented tweet IDs to localStorage (`xactions_commented_tweets`)
7. Schedules next check after the interval
8. Keeps the tab open and running

#### Stop Function

```javascript
window.stopAutoComment();
```

---

### keywordFollow.js — Search & Follow by Keyword

**Source:** [`src/automation/keywordFollow.js`](../../src/automation/keywordFollow.js) (221 lines)

Searches X for users matching keywords and follows them.

**Run on:** Search page (`x.com/search`) or any page (auto-navigates).

#### Configuration

```javascript
const OPTIONS = {
  KEYWORDS: ['web3 developer', 'solidity engineer', 'crypto founder'],
  MAX_FOLLOWS_PER_KEYWORD: 10,
  MAX_FOLLOWS_TOTAL: 30,
  MIN_FOLLOWERS: 100,              // Skip tiny accounts
  MAX_FOLLOWERS: 100000,           // Skip mega accounts
  MUST_HAVE_BIO: true,             // Skip blank bios
  BIO_KEYWORDS: [],                // Bio filter (empty = any)
  SKIP_IF_FOLLOWING: true,         // Skip already-followed
  DELAY_BETWEEN_FOLLOWS: 3000,
  DELAY_BETWEEN_SEARCHES: 10000,
};
```

#### Behavior

1. Navigates to `x.com/search?q=KEYWORD&f=user` for each keyword
2. Uses `extractUserFromCell()` to get user data (with multi-strategy extraction)
3. Applies all filters (followers, bio, following status)
4. Clicks Follow button and records with timestamp
5. Stores to localStorage (`xactions_followed_users`) with format:
   ```json
   { "username": { "followedAt": 1708000000000, "followedBack": false, "checkedAt": null } }
   ```
6. This data is consumed by `smartUnfollow.js` later

#### Stop Function

```javascript
window.stopKeywordFollow();
```

---

### followTargetUsers.js — Follow Followers of Accounts

**Source:** [`src/automation/followTargetUsers.js`](../../src/automation/followTargetUsers.js)

Follow the followers or following of specified target accounts.

**Run on:** Home page (auto-navigates to targets).

#### Configuration

```javascript
const CONFIG = {
  TARGET_ACCOUNTS: [
    // 'elonmusk',
    // 'naval',
  ],
  // List type: 'followers' or 'following'
  // Filters similar to keywordFollow
};
```

#### Behavior

1. Iterates through target accounts
2. Navigates to their followers/following page
3. Scrolls through and follows matching users
4. Applies filters (followers count, bio, etc.)
5. Records all follows with timestamps for later cleanup

---

### followEngagers.js — Follow Post Engagers

**Source:** [`src/automation/followEngagers.js`](../../src/automation/followEngagers.js) (360 lines)

Find and follow people who engaged with specific posts.

**Run on:** A specific tweet, a profile, or provide URLs.

#### Configuration

```javascript
const CONFIG = {
  MODE: 'likers',                // 'likers', 'retweeters', 'quoters', 'all'
  TARGET_POSTS: [],              // URLs (empty = use current page)
  MAX_POSTS_TO_ANALYZE: 5,
  MAX_FOLLOWS_PER_POST: 15,
  TOTAL_MAX_FOLLOWS: 30,
  FILTERS: {
    MIN_FOLLOWERS: 50,
    MAX_FOLLOWERS: 50000,
    MUST_HAVE_BIO: false,
    SKIP_PROTECTED: true,
    SKIP_VERIFIED: false,
  },
  DELAY_BETWEEN_FOLLOWS: 3000,
  DELAY_BETWEEN_SCROLLS: 2000,
  INTERACT_AFTER_FOLLOW: false,  // Like their posts after following
  LIKES_PER_USER: 2,
};
```

#### Behavior

1. Determines target posts (current page, URLs, or profile posts)
2. For each post, navigates to likers/retweeters/quoters list
3. Scrolls through the list, filtering users
4. Follows matching users and tracks in localStorage (`xactions_engager_followed`)
5. Prints a detailed session summary with skip reasons

#### Stop Function

```javascript
window.stopEngager();
```

#### Exposed API

```javascript
window.XActions.Engager.state();    // Current session stats
window.XActions.Engager.tracked();  // All tracked users
window.XActions.Engager.config;     // Current config
```

---

### growthSuite.js — All-in-One Growth Automation

**Source:** [`src/automation/growthSuite.js`](../../src/automation/growthSuite.js) (368 lines)

Combines keyword follow + timeline liking + smart unfollow in a single session.

**Run on:** Home page.

#### Configuration

```javascript
const STRATEGY = {
  KEYWORDS: ['web3 developer', 'solidity engineer', 'defi builder'],
  TARGET_ACCOUNTS: [],
  ACTIONS: {
    FOLLOW: true,
    LIKE: true,
    UNFOLLOW: true,
  },
  LIMITS: {
    FOLLOWS: 20,
    LIKES: 30,
    UNFOLLOWS: 15,
  },
  TIMING: {
    UNFOLLOW_AFTER_DAYS: 3,
    DELAY_BETWEEN_ACTIONS: 3000,
    SESSION_DURATION_MINUTES: 30,
  },
  FILTERS: {
    MIN_FOLLOWERS: 50,
    MAX_FOLLOWERS: 50000,
    MUST_HAVE_BIO: true,
    SKIP_PRIVATE: true,
    LANGUAGE: null,
  },
};
```

#### Three Phases

1. **Phase 1 — Follow:** Searches each keyword on the People tab, follows matching users
2. **Phase 2 — Like:** Goes to home feed, likes tweets while scrolling
3. **Phase 3 — Unfollow:** Finds follows older than `UNFOLLOW_AFTER_DAYS` that didn't follow back, unfollows them

#### Session Limits

The session auto-stops when:
- Any per-action limit is reached
- `SESSION_DURATION_MINUTES` expires
- You call `window.stopGrowth()`

#### Exposed API

```javascript
window.XActions.Growth.state();     // { follows, likes, unfollows, ... }
window.XActions.Growth.tracked();   // All tracked users
window.XActions.Growth.strategy;    // Current strategy config
```

---

## Cleanup Scripts

### smartUnfollow.js — Time-Based Smart Unfollow

**Source:** [`src/automation/smartUnfollow.js`](../../src/automation/smartUnfollow.js) (269 lines)

Unfollows users who didn't follow back within a grace period.

**Run on:** Your `/following` page (e.g., `x.com/YOUR_USERNAME/following`).

#### Configuration

```javascript
const OPTIONS = {
  DAYS_TO_WAIT: 3,                // Grace period in days
  MAX_UNFOLLOWS: 50,              // Max per session
  WHITELIST: [                    // Never unfollow these
    // 'username1',
  ],
  DRY_RUN: false,                 // Preview mode — logs but doesn't act
  ONLY_TRACKED: true,             // Only unfollow previously tracked users
  DELAY_BETWEEN_UNFOLLOWS: 2000,
};
```

#### Two-Step Process

**Step 1 — Scrape followers** (on your `/followers` page):
1. Scrolls through your follower list
2. Collects all follower usernames
3. Saves to localStorage (`xactions_my_followers`)

**Step 2 — Unfollow** (on your `/following` page):
1. Loads the follower list from Step 1
2. Compares against `xactions_followed_users` (from keywordFollow/growthSuite)
3. Finds users past the grace period who didn't follow back
4. Scrolls through the Following page and clicks Unfollow → Confirm
5. Removes unfollowed users from tracked data

#### Dry Run Mode

Set `DRY_RUN: true` to see what would happen without actually unfollowing:

```
🔧 [12:34:56] Unfollowing @user1 (didn't follow back in 3 days)
⚠️ (Dry run - no actual unfollows performed)
```

#### Stop Function

```javascript
window.stopSmartUnfollow();
```

---

### protectActiveUsers.js — Protect Engaged Users

**Source:** [`src/automation/protectActiveUsers.js`](../../src/automation/protectActiveUsers.js)

Scans your recent posts for engaged users and builds a whitelist.

**Run on:** Your profile page.

#### Configuration

```javascript
const CONFIG = {
  USERNAME: null,       // Auto-detects if null
  POSTS_TO_SCAN: 10,   // How many of your posts to check
};
```

#### Behavior

1. Scrolls through your recent posts
2. For each post, checks likers and commenters
3. Builds a protected list in localStorage (`xactions_protected_users`)
4. `smartUnfollow.js` reads this list and skips protected users

---

## Algorithm Scripts

### algorithmTrainer.js — Algorithm Trainer

**Source:** [`src/automation/algorithmTrainer.js`](../../src/automation/algorithmTrainer.js) (874 lines)

Trains your X algorithm by simulating natural browsing in your niches.

**Run on:** x.com (logged in). Leave the tab open.

#### Configuration

```javascript
const NICHES = {
  topics: [
    {
      name: 'AI & Machine Learning',
      searchTerms: ['AI agents', 'machine learning', 'LLM', 'GPT'],
      comments: ['🔥 this is the future', 'Great breakdown 👏', '💯'],
      influencers: [],  // Optional priority accounts
    },
    {
      name: 'Web3 & Crypto',
      searchTerms: ['web3 builder', 'DeFi', 'solana ecosystem'],
      comments: ['Bullish on this', 'Great alpha 🫡'],
      influencers: [],
    },
  ],
};
```

#### Behavior

Cycles through training phases continuously:

1. **Search phase:** Searches niche keywords, scrolls results
2. **Browse phase:** Visits influencer profiles, reads their content
3. **Engage phase:** Likes relevant posts, comments with niche-appropriate text
4. **Follow phase:** Follows viral accounts in the niche
5. **Profile visit:** Visits your own profile (signals identity to algorithm)
6. **Rest phase:** Pauses with human-like timing before next cycle

All with randomized delays and natural scrolling patterns.

#### Stop Function

```javascript
stopTrainer();
```

---

### algorithmBuilder.js — Algorithm Builder with LLM

**Source:** [`src/automation/algorithmBuilder.js`](../../src/automation/algorithmBuilder.js) (969 lines)

24/7 niche automation with optional AI-generated comments via OpenRouter.

**Run on:** x.com (logged in). Leave the tab open.

#### Configuration

```javascript
const NICHE_CONFIG = {
  PERSONA: 'a crypto & web3 builder who shares alpha and builds in public',
  KEYWORDS: ['web3 builder', 'crypto alpha', 'DeFi yield'],
  TARGET_ACCOUNTS: [],         // Engage with their content
  BIO_KEYWORDS: ['crypto', 'web3', 'defi', 'builder', 'dev'],
  EXPLORE_TOPICS: ['Technology', 'Crypto', 'Business'],
};

const LLM_CONFIG = {
  ENABLED: false,              // Set true + add API key for AI comments
  API_URL: 'https://openrouter.ai/api/v1/chat/completions',
  API_KEY: '',                 // Your OpenRouter or OpenAI key
  MODEL: 'google/gemini-flash-1.5',
  SYSTEM_PROMPT: `You are a witty person in the {niche} space on Twitter/X.
Generate a short, authentic reply...`,
  MAX_TOKENS: 80,
  TEMPERATURE: 0.9,
  LLM_PROBABILITY: 0.7,       // 70% AI comments, 30% fallback templates
};
```

#### Behavior

Like `algorithmTrainer.js` but with:
- **LLM-powered comments:** Instead of canned templates, generates contextual replies using any OpenAI-compatible API
- **Fallback system:** If LLM fails or `LLM_PROBABILITY` dice roll misses, uses template comments
- **Persona-driven:** The system prompt shapes comment tone based on your niche persona
- **Bio-based filtering:** Only follows users whose bio contains niche keywords

#### Stop Function

```javascript
window.stopAlgoBuilder();
```

---

## Monitoring & Safety

### quotaSupervisor.js — Rate Limit Manager

**Source:** [`src/automation/quotaSupervisor.js`](../../src/automation/quotaSupervisor.js)

Global rate limiter that protects your account across all running scripts.

**Run on:** Any page (background — paste before other scripts).

#### Configuration

```javascript
const QUOTAS = {
  HOURLY: {
    likes: 60,
    follows: 30,
    unfollows: 40,
    comments: 10,
    // ...
  },
  DAILY: {
    // ...
  },
};
```

#### Behavior

- Intercepts action calls and checks against quotas
- Adds stochastic delays (random variance) to appear more human
- Tracks all actions in a central counter
- Warns when approaching limits
- Blocks actions when limits are exceeded

---

### sessionLogger.js — Action Tracker

**Source:** [`src/automation/sessionLogger.js`](../../src/automation/sessionLogger.js)

Records all automation actions for review and export.

**Run on:** Any page (background — paste before other scripts).

#### Configuration

```javascript
const CONFIG = {
  LOG_RETENTION_DAYS: 30,
  SAVE_INTERVAL_SECONDS: 30,
};
```

#### What It Logs

- Every follow, unfollow, like, comment, etc.
- Timestamps and action types
- Usernames and tweet IDs involved
- Error events

#### Reviewing Logs

```javascript
// View session log
window.XActions.Core.storage.get('session_log');
```

---

## Utility Scripts

### linkScraper.js — Extract Shared Links

**Source:** [`src/automation/linkScraper.js`](../../src/automation/linkScraper.js)

Extracts all links shared by a user.

**Run on:** A user's profile page.

#### Configuration

```javascript
const OPTIONS = {
  MAX_SCROLLS: 100,
  MAX_TWEETS: 500,
  // Filter options...
};
```

#### Behavior

1. Scrolls through the user's timeline
2. Extracts all external links from tweets
3. Deduplicates and categorizes
4. Returns structured results

---

### customerService.js — Customer Service Bot

**Source:** [`src/automation/customerService.js`](../../src/automation/customerService.js)

Automates customer service responses for business accounts.

**Run on:** Home page.

#### Configuration

```javascript
const ACCOUNTS = `
personal_account
business_account
`;
// Response templates, business hours, monitoring options...
```

#### Behavior

- Monitors mentions and DMs for customer inquiries
- Matches against keyword patterns
- Responds with templated messages
- Respects business hours configuration

---

### multiAccount.js — Multi-Account Manager

**Source:** [`src/automation/multiAccount.js`](../../src/automation/multiAccount.js)

Manages multiple X accounts locally.

**Run on:** Any page.

#### Features

- Store account list in localStorage
- Track per-account statistics
- Rotate between accounts

> **Security:** Credentials are stored in your browser's localStorage. Only use on personal machines.

---

## UI Scripts

### controlPanel.js — Floating Control Panel

**Source:** [`src/automation/controlPanel.js`](../../src/automation/controlPanel.js) (1,287 lines)

Creates a **draggable floating UI panel** directly on x.com for visual automation control.

**Run on:** Any X page (paste after core.js).

#### Features

- **Visual automation launcher** — dropdown to select automation type
- **Configurable inputs** — keywords, usernames, limits, delays
- **Task queue** — queue multiple tasks (e.g., "like 500 on @user1, then 500 on @user2")
- **Start / Pause / Resume / Restart** controls
- **Live progress bar** and action counter
- **Activity log** — real-time feed of actions
- **Export results** — JSON or CSV download
- **Share config** — copy configuration as JSON for sharing

#### Available Automations in Panel

| Automation | Description |
|-----------|-------------|
| ❤️ Like Timeline | Like posts on a user's timeline |
| 👥 Follow Engagers | Follow people who engage with posts |
| 🚫 Smart Unfollow | Unfollow non-followers |
| 📋 Scrape Followers | Collect follower data |
| 🧠 Algorithm Builder | Train your feed algorithm |

#### Usage

```javascript
// 1. Paste core.js
// 2. Paste controlPanel.js
// A floating panel appears in the corner of x.com
// Drag it anywhere, configure, and run
```

#### Preventing Double-Load

If you paste it twice, it detects the existing panel and skips:
```
⚡ Panel already open
```

---

## Node.js Scripts

These two scripts are **not** browser console scripts. They use `import` statements and run in Node.js.

### evergreenRecycler.js — Evergreen Content Recycler

**Source:** [`src/automation/evergreenRecycler.js`](../../src/automation/evergreenRecycler.js)

Identifies top-performing tweets and schedules re-posts.

#### Features

- Analyzes tweet performance metrics
- Filters out time-sensitive content (detects words like "breaking", "today", "live now")
- Ranks evergreen candidates by engagement
- Maintains a repost queue in `~/.xactions/evergreen-queue.json`

#### Usage

```javascript
import { analyzeEvergreenCandidates } from './src/automation/evergreenRecycler.js';

const candidates = await analyzeEvergreenCandidates('myusername', {
  // options
});
```

---

### rssMonitor.js — RSS & Webhook Monitor

**Source:** [`src/automation/rssMonitor.js`](../../src/automation/rssMonitor.js)

Monitor RSS feeds and auto-create tweet drafts.

#### Features

- Add/remove RSS feeds to monitor
- Configurable templates: `📰 {title}\n\n{link}`
- Auto-post or save as drafts
- Tracks seen items in `~/.xactions/rss-seen.json`
- Configurable check intervals and filters

#### Usage

```javascript
import { addFeed } from './src/automation/rssMonitor.js';

await addFeed({
  name: 'My Blog',
  url: 'https://myblog.com/rss',
  template: '📰 {title}\n\n{link}',
  autoPost: false,
  checkInterval: 30,
});
```
