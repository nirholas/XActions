# 🤖 UnfollowX Automation Framework Guide

A complete browser automation toolkit for X (Twitter) growth and engagement.

---

## ⚠️ Important Disclaimer

These automation tools are for **educational purposes** and personal productivity. Please:

- **Respect X's Terms of Service** — automation may violate their ToS
- **Use responsibly** — don't spam, harass, or abuse these tools
- **Understand the risks** — your account could be limited or suspended
- **Start slow** — test with conservative settings first

---

## 📦 Architecture Overview

All automation scripts use a **modular architecture**:

```
src/automation/
├── core.js               ← Required! Load this first
├── actions.js            ← XActions library (100+ actions)
├── autoLiker.js          ← Timeline auto-liking
├── keywordFollow.js      ← Search & auto-follow
├── smartUnfollow.js      ← Time-based unfollowing
├── linkScraper.js        ← Extract links from profiles
├── autoCommenter.js      ← Auto-comment on new posts
├── multiAccount.js       ← Multi-account management (user:pass import)
├── growthSuite.js        ← All-in-one growth automation
├── followTargetUsers.js  ← Follow followers/following of accounts 
├── followEngagers.js     ← Follow likers/retweeters of posts
├── protectActiveUsers.js ← Don't unfollow users who engage with you
├── quotaSupervisor.js    ← Sophisticated rate limiting
├── sessionLogger.js      ← Action tracking & analytics
└── customerService.js    ← Customer service bot for businesses
```

**Core Module** provides shared utilities:
- Rate limiting
- DOM selectors
- Storage helpers
- Action queue
- Logging system

---

## 🎯 XActions Library (`actions.js`)

The complete X/Twitter actions library with **100+ functions** covering every available user action.

### Quick Start
```js
// 1. Load core.js first
// 2. Load actions.js
// 3. Use XActions!
```

### Available Sections

| Section | Description | Key Functions |
|---------|-------------|---------------|
| `XActions.tweet` | Posting & managing tweets | `post()`, `reply()`, `quote()`, `delete()`, `pin()`, `thread()` |
| `XActions.engage` | Engagement actions | `like()`, `retweet()`, `bookmark()`, `copyLink()`, `highlight()` |
| `XActions.user` | User interactions | `follow()`, `unfollow()`, `block()`, `mute()`, `restrict()` |
| `XActions.dm` | Direct messages | `send()`, `createGroup()`, `sendGif()`, `react()`, `delete()` |
| `XActions.search` | Search & discovery | `query()`, `advanced()`, `hashtag()`, `from()`, `latest()` |
| `XActions.nav` | Navigation | `home()`, `explore()`, `messages()`, `bookmarks()`, `profile()` |
| `XActions.lists` | List management | `create()`, `delete()`, `edit()`, `follow()`, `pin()` |
| `XActions.settings` | Account settings | `mutedAccounts()`, `addMutedWord()`, `downloadData()` |
| `XActions.profile` | Profile editing | `updateName()`, `updateBio()`, `updateLocation()`, `updateAvatar()` |
| `XActions.utils` | Utilities | `getTokens()`, `exportBookmarks()`, `devMode()`, `copyToClipboard()` |
| `XActions.spaces` | Twitter Spaces | `join()`, `leave()`, `requestToSpeak()`, `share()` |
| `XActions.communities` | Communities | `browse()`, `join()`, `leave()`, `post()` |

### Examples

**Post a tweet:**
```js
await XActions.tweet.post("Hello world! 👋")
```

**Reply to a tweet:**
```js
const tweets = XActions.tweet.getAll()
await XActions.tweet.reply(tweets[0], "Great post!")
```

**Like all visible tweets:**
```js
for (const tweet of XActions.tweet.getAll()) {
  await XActions.engage.like(tweet)
}
```

**Follow a user:**
```js
await XActions.user.follow("elonmusk")
```

**Block a user:**
```js
await XActions.user.block("spammer123")
```

**Send a DM:**
```js
await XActions.dm.send("username", "Hey! How are you?")
```

**Advanced search:**
```js
await XActions.search.advanced({
  words: "javascript",
  from: "github",
  minFaves: 100,
  since: "2024-01-01",
  hasMedia: true,
})
```

**Export all bookmarks:**
```js
const bookmarks = await XActions.utils.exportBookmarks(500)
console.log(bookmarks)
```

**Create a list:**
```js
await XActions.lists.create("Tech News", "Best tech accounts", true)
```

**Enable dev mode (see all selectors):**
```js
XActions.utils.devMode()
```

---

## 🚀 Quick Start

### Step 1: Load the Core Module
```js
// ALWAYS paste core.js first!
// Copy the contents of src/automation/core.js
```

### Step 2: Load Your Automation Script
```js
// Then paste the automation script you want to use
// e.g., autoLiker.js, keywordFollow.js, etc.
```

### Step 3: Configure & Run
Each script has a configuration section at the top. Modify it to match your needs.

---

## 📚 Script Documentation

### 1. Auto-Liker (`autoLiker.js`)

**Purpose:** Automatically like posts on your timeline based on keywords or users.

**How to use:**
1. Go to `twitter.com/home`
2. Paste `core.js` then `autoLiker.js`
3. Configure and run

**Configuration:**
```js
const CONFIG = {
  KEYWORDS: ['web3', 'crypto'],      // Like posts containing these words
  FROM_USERS: ['elonmusk'],          // Always like posts from these users
  MAX_LIKES: 50,                     // Stop after this many likes
  ALSO_RETWEET: false,               // Also retweet liked posts
  SCROLL_DELAY: 2000,                // Delay between scrolls (ms)
};
```

**Commands:**
```js
stopAutoLiker()           // Stop the script
window.UnfollowX.Liker.stats()   // View statistics
```

---

### 2. Keyword Follow (`keywordFollow.js`)

**Purpose:** Search for keywords and auto-follow users who match your criteria.

**How to use:**
1. Go to `twitter.com/home`
2. Paste `core.js` then `keywordFollow.js`
3. Configure and run

**Configuration:**
```js
const CONFIG = {
  KEYWORDS: ['solidity developer', 'web3 builder'],
  MAX_FOLLOWS_PER_KEYWORD: 10,
  TOTAL_MAX_FOLLOWS: 30,
  
  // Filters
  MIN_FOLLOWERS: 100,
  MAX_FOLLOWERS: 50000,
  MUST_HAVE_BIO: true,
  BIO_KEYWORDS: ['dev', 'builder', 'founder'],
};
```

**Tracking:**
- Followed users are saved to `localStorage`
- Timestamps are recorded for smart unfollow later
- Run `window.UnfollowX.KeywordFollow.tracked()` to see followed list

---

### 3. Smart Unfollow (`smartUnfollow.js`)

**Purpose:** Unfollow users who didn't follow back within a specified time period.

**How to use:**
1. Go to your Following page: `twitter.com/YOUR_USERNAME/following`
2. Paste `core.js` then `smartUnfollow.js`
3. Configure and run

**Configuration:**
```js
const CONFIG = {
  DAYS_TO_WAIT: 3,               // Days before unfollowing
  MAX_UNFOLLOWS: 50,             // Limit per session
  DRY_RUN: false,                // Set true to preview without unfollowing
  WHITELIST: ['friend1', 'friend2'],  // Never unfollow these users
};
```

**Integration:**
Works best with `keywordFollow.js` — it reads the tracking data to know when you followed each user.

---

### 4. Link Scraper (`linkScraper.js`)

**Purpose:** Extract all external links shared by a user.

**How to use:**
1. Go to the target user's profile
2. Paste `core.js` then `linkScraper.js`
3. Configure and run

**Configuration:**
```js
const CONFIG = {
  TARGET_USER: 'elonmusk',       // Or null to use current page
  MAX_SCROLLS: 100,              // How far to scroll
  AUTO_DOWNLOAD: true,           // Download results automatically
  INCLUDE_DOMAINS: [],           // Only include these domains (empty = all)
  EXCLUDE_DOMAINS: ['twitter.com', 'x.com'],  // Skip these domains
};
```

**Output:**
- JSON file with all links and metadata
- TXT file with clean link list
- Console summary grouped by domain

---

### 5. Auto-Commenter (`autoCommenter.js`)

**Purpose:** Monitor a user and automatically comment on their new posts.

**How to use:**
1. Open X in your browser (any page)
2. Paste `core.js` then `autoCommenter.js`
3. Configure and run

**Configuration:**
```js
const CONFIG = {
  TARGET_USER: 'elonmusk',
  CHECK_INTERVAL_SECONDS: 60,    // How often to check for new posts
  
  COMMENTS: [
    'Great insight! 🔥',
    'This is exactly what I was thinking!',
    'Thanks for sharing!',
  ],
  
  KEYWORD_COMMENTS: {
    'AI': ['The AI revolution is here!', 'Fascinating AI take!'],
    'crypto': ['Bullish! 🚀', 'Web3 is the future!'],
  },
};
```

**Commands:**
```js
stopAutoCommenter()        // Stop monitoring
window.UnfollowX.Commenter.stats()   // View statistics
```

⚠️ **Warning:** Be careful with auto-commenting — it can appear spammy if overused.

---

### 6. Multi-Account Manager (`multiAccount.js`)

**Purpose:** Store and manage multiple X accounts for automation.

**How to use:**
1. Paste `core.js` then `multiAccount.js`
2. Use the command interface

**Commands:**
```js
// Add an account
XAccounts.add('username', 'password', { note: 'Main account' })

// List all accounts
XAccounts.list()

// Get next account (rotation)
XAccounts.getNext()

// Remove an account
XAccounts.remove('username')

// Export accounts (encrypted)
XAccounts.export()

// Import accounts
XAccounts.import('encrypted-string')

// Login helper
XAccounts.login('username')
```

**Security:**
- Accounts are stored in localStorage (base64 encoded)
- Clear with `localStorage.removeItem('unfollowx_accounts')`
- Never share your export strings

---

### 7. Growth Suite (`growthSuite.js`)

**Purpose:** All-in-one growth automation combining follow, like, and unfollow.

**How to use:**
1. Go to `twitter.com/home`
2. Paste `core.js` then `growthSuite.js`
3. Configure and run

**Configuration:**
```js
const STRATEGY = {
  KEYWORDS: ['web3 developer', 'solidity engineer'],
  
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
    SESSION_DURATION_MINUTES: 30,
  },
};
```

**Phases:**
1. **Phase 1:** Keyword search and follow
2. **Phase 2:** Like posts in timeline
3. **Phase 3:** Unfollow non-followers past threshold

**Commands:**
```js
stopGrowth()                 // Stop all automation
window.UnfollowX.Growth.state()    // View current state
window.UnfollowX.Growth.tracked()  // View tracked users
```

---

## 🛡️ Rate Limiting

All scripts include built-in rate limiting to protect your account:

| Action | Default Delay | Recommended Range |
|--------|---------------|-------------------|
| Follow | 3-5 seconds | 2-10 seconds |
| Unfollow | 2-4 seconds | 2-8 seconds |
| Like | 1-3 seconds | 1-5 seconds |
| Comment | 30-60 seconds | 30-120 seconds |

**Tips:**
- Start with conservative delays
- Increase delays if you get errors
- Stop if you see "rate limit" warnings
- Take breaks between sessions

---

## 💾 Data Persistence

All tracking data is stored in `localStorage`:

| Key | Description |
|-----|-------------|
| `unfollowx_followed` | Users you've followed with timestamps |
| `unfollowx_liked` | Tweet IDs you've liked |
| `unfollowx_accounts` | Multi-account credentials |
| `unfollowx_links_*` | Scraped links cache |
| `unfollowx_rate_*` | Rate limit tracking |

**Clear all data:**
```js
Object.keys(localStorage)
  .filter(k => k.startsWith('unfollowx_'))
  .forEach(k => localStorage.removeItem(k));
```

---

## 🔧 Customization

### Adjusting Selectors

If X updates their UI, you may need to update selectors in `core.js`:

```js
const SELECTORS = {
  tweet: '[data-testid="tweet"]',
  userCell: '[data-testid="UserCell"]',
  followButton: '[data-testid$="-follow"]',
  unfollowButton: '[data-testid$="-unfollow"]',
  likeButton: '[data-testid="like"]',
  confirmButton: '[data-testid="confirmationSheetConfirm"]',
  // Add or modify as needed
};
```

### Creating Custom Scripts

Use the core module to build your own automations:

```js
(async () => {
  const { log, sleep, clickElement, waitForElement, SELECTORS } = window.UnfollowX.Core;
  
  log('Starting custom automation...', 'info');
  
  // Your custom logic here
  const element = await waitForElement(SELECTORS.tweet, 5000);
  if (element) {
    await clickElement(element);
    log('Clicked!', 'success');
  }
})();
```

---

### 8. Follow Target Users (`followTargetUsers.js`)

**Purpose:** Follow the followers or following of any target account.

**How to use:**
1. Open X in your browser
2. Paste `core.js` then `followTargetUsers.js`
3. Configure target accounts and run

**Configuration:**
```js
const CONFIG = {
  TARGET_ACCOUNTS: ['elonmusk', 'naval'],  // Accounts to scrape
  LIST_TYPE: 'followers',                   // 'followers' or 'following'
  MAX_FOLLOWS_PER_ACCOUNT: 20,
  TOTAL_MAX_FOLLOWS: 50,
  
  FILTERS: {
    MIN_FOLLOWERS: 100,
    MAX_FOLLOWERS: 50000,
    MUST_HAVE_BIO: true,
    SKIP_PROTECTED: true,
    SKIP_VERIFIED: false,
  },
};
```

---

### 9. Follow Engagers (`followEngagers.js`)

**Purpose:** Follow users who liked, retweeted, or quoted specific posts.

**How to use:**
1. Navigate to a post you want to analyze
2. Paste `core.js` then `followEngagers.js`
3. Configure and run

**Configuration:**
```js
const CONFIG = {
  MODE: 'likers',  // 'likers', 'retweeters', 'quoters', or 'all'
  TARGET_POSTS: [],  // Leave empty to use current page
  MAX_FOLLOWS_PER_POST: 15,
  TOTAL_MAX_FOLLOWS: 30,
};
```

---

### 10. Protect Active Users (`protectActiveUsers.js`)

**Purpose:** Scan your posts for engagers and protect them from being unfollowed.

**How to use:**
1. Paste `core.js` then `protectActiveUsers.js`
2. It will scan your recent posts for engagers
3. Works with `smartUnfollow.js` — protected users won't be unfollowed

**Configuration:**
```js
const CONFIG = {
  POSTS_TO_SCAN: 10,
  LOOKBACK_DAYS: 30,
  MIN_ENGAGEMENTS: 1,
  
  ENGAGEMENT_TYPES: {
    likers: true,
    repliers: true,
    retweeters: true,
    quoters: true,
  },
};
```

**Commands:**
```js
viewProtected()           // See all protected users
isProtected('username')   // Check if user is protected
```

---

### 11. Quota Supervisor (`quotaSupervisor.js`)

**Purpose:** Sophisticated rate limiting to protect your account from restrictions.

**How to use:**
1. Paste `core.js` then `quotaSupervisor.js`
2. All other automation scripts will respect the quotas

**Configuration:**
```js
const QUOTAS = {
  HOURLY: {
    likes: 60,
    follows: 30,
    unfollows: 40,
    comments: 10,
  },
  DAILY: {
    likes: 500,
    follows: 200,
    unfollows: 300,
    comments: 50,
  },
  
  STOCHASTIC: {
    enabled: true,     // Randomize limits slightly
    variance: 0.15,    // 15% variance
  },
};
```

**Commands:**
```js
quotaStatus()    // View current quota status
quotaReset()     // Reset all quotas
quotaWake()      // Wake up from quota sleep
```

---

### 12. Session Logger (`sessionLogger.js`)

**Purpose:** Track all automation actions and generate analytics reports.

**How to use:**
1. Paste `core.js` then `sessionLogger.js`
2. All actions will be automatically logged

**Commands:**
```js
stats()           // View all-time stats
todayStats()      // View today's stats
weekStats()       // View this week's stats
dailyStats()      // View daily breakdown
sessionStats()    // View current session
exportLogs()      // Export logs as JSON
```

---

## 🎧 Customer Service Tools

### 13. Customer Service Bot (`customerService.js`)

**Purpose:** Automate customer service responses for business accounts.

**How to use:**
1. Configure your accounts inline (user:pass format)
2. Paste `core.js` then `customerService.js`
3. It monitors mentions and suggests/sends responses

**Configuration:**
```js
// Add accounts inline (paste from txt file)
const ACCOUNTS = `
personal_account:password123
business_account:bizpass456
`.trim().split('\n')...

const CONFIG = {
  ACTIVE_ACCOUNT: 'business_account',
  
  MONITOR: {
    mentions: true,
    dms: true,
    replies: true,
  },
  
  RESPONSE: {
    autoReply: true,
    requireApproval: true,  // Review before sending
  },
  
  BUSINESS_HOURS: {
    enabled: true,
    start: 9,   // 9 AM
    end: 17,    // 5 PM
    days: [1,2,3,4,5],  // Mon-Fri
  },
};
```

**Response Templates:**
```js
const TEMPLATES = {
  greeting: ["Hi {customer}! How can I help?"],
  issue: ["Sorry about that! Please DM us details."],
  thanks: ["Thank you so much! 🙏"],
  pricing: ["Check our website for pricing info!"],
  support: ["Please DM us for faster support."],
};
```

**Commands:**
```js
stopCS()          // Stop the bot
csStats()         // View statistics
csTemplates()     // Show all templates
csRespond('issue') // Get a response template
```

---

### Multi-Account with user:pass Import

The Multi-Account Manager now supports importing from simple text format:

```js
// Import accounts from a txt/csv file format
XAccounts.importText(`
personal:mypassword123
business:bizpassword456
support:supportpass789
`)

// Export back to text format
XAccounts.exportText()

// Other commands
XAccounts.list()      // List all accounts
XAccounts.getNext()   // Get next account (rotation)
XAccounts.stats.show() // View per-account stats
```

**Supported formats:**
- `username:password`
- `username,password`
- `username;password`
- `username\tpassword` (tab-separated)

---

## 🐛 Troubleshooting

**Script stops working:**
- X may have updated their UI — check selectors
- You may be rate limited — wait 15-30 minutes
- Page may need refresh — reload and try again

**"Core module not loaded" error:**
- Always paste `core.js` first
- Make sure it finished executing

**Account getting limited:**
- Increase delays between actions
- Reduce max limits per session
- Take longer breaks between sessions

---

## 📋 Best Practices

1. **Start small** — Test with 5-10 actions first
2. **Monitor results** — Watch for errors or unusual behavior  
3. **Use natural timing** — Random delays look more human
4. **Take breaks** — Don't run automation 24/7
5. **Keep logs** — Track what the scripts are doing
6. **Have backups** — Export your tracking data regularly

---

<p align="center">
  <a href="https://github.com/nirholas/UnfollowX">⭐ Back to Main README</a>
</p>
