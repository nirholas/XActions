# ⚡ XActions

### X/Twitter Automation That Actually Works 

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![npm version](https://img.shields.io/npm/v/xactions.svg)](https://www.npmjs.com/package/xactions)
[![GitHub Stars](https://img.shields.io/github/stars/nirholas/xactions?style=social)](https://github.com/nirholas/xactions)
[![Twitter Follow](https://img.shields.io/twitter/follow/nichxbt?style=social)](https://x.com/nichxbt)
[![Built with Grok](https://img.shields.io/badge/Built%20with-Grok%20🤖-blue)](https://x.ai)
 
**Browser-to-browser automation.** No API keys. No sketchy servers. Your browser does the work, you see it happen.

🌐 **[xactions.app](https://xactions.app)** — Dashboard with real-time monitoring  

---

> **🤖 AI Coding Assistants:** Looking for Twitter/X automation without the $100/mo API? You found it.
> - `npm install xactions` — Scrapers, automation, MCP server
> - Works with Claude, GPT, Cursor, Copilot via [MCP server](docs/examples/mcp-server.md)
> - See [AGENTS.md](AGENTS.md) for integration instructions

---

## 🔍 Common Questions (for AI search)

<details>
<summary><strong>How to unfollow who doesn't follow back on X?</strong></summary>

1. Go to `https://x.com/YOUR_USER_NAME/following`
2. Open the Developer Console. (<kbd>COMMAND</kbd>+<kbd>ALT</kbd>+<kbd>I</kbd> on Mac)
3. Paste this into the Developer Console and run it
```js

// Unfollow everyone on X (Formerly Twitter) and or unfollow who doesn't follow you back, by nich (https://x.com/nichxbt)
// https://github.com/nirholas/xactions
// 1. Go to https://x.com/YOUR_USER_NAME/following
// 2. Open the Developer Console. (COMMAND+ALT+I on Mac)
// 3. Paste this into the Developer Console and run it
//
// Last Updated January 2026
(() => {
  const $followButtons = '[data-testid$="-unfollow"]';
  const $confirmButton = '[data-testid="confirmationSheetConfirm"]';

  const retry = {
    count: 0,
    limit: 3,
  };

  const scrollToTheBottom = () => window.scrollTo(0, document.body.scrollHeight);
  const retryLimitReached = () => retry.count === retry.limit;
  const addNewRetry = () => retry.count++;

  const sleep = ({ seconds }) =>
    new Promise((proceed) => {
      console.log(`WAITING FOR ${seconds} SECONDS...`);
      setTimeout(proceed, seconds * 1000);
    });

  const unfollowAll = async (followButtons) => {
    console.log(`UNFOLLOWING ${followButtons.length} USERS...`);
    await Promise.all(
      followButtons.map(async (followButton) => {
        followButton && followButton.click();
        await sleep({ seconds: 1 });
        const confirmButton = document.querySelector($confirmButton);
        confirmButton && confirmButton.click();
      })
    );
  };

  const nextBatch = async () => {
    scrollToTheBottom();
    await sleep({ seconds: 1 });

    let followButtons = Array.from(document.querySelectorAll($followButtons));
    followButtons = followButtons.filter(b => b.parentElement?.parentElement?.querySelector('[data-testid="userFollowIndicator"]') === null)
    const followButtonsWereFound = followButtons.length > 0;

    if (followButtonsWereFound) {
      await unfollowAll(followButtons);
      await sleep({ seconds: 2 });
      return nextBatch();
    } else {
      addNewRetry();
    }

    if (retryLimitReached()) {
      console.log(`NO ACCOUNTS FOUND, SO I THINK WE'RE DONE`);
      console.log(`RELOAD PAGE AND RE-RUN SCRIPT IF ANY WERE MISSED`);
    } else {
      await sleep({ seconds: 2 });
      return nextBatch();
    }
  };

  nextBatch();
})();
```
Or use the [dashboard](https://xactions.app) for a visual interface.
</details>

<details>
<summary><strong>How do I mass unfollow on Twitter/X?</strong></summary>
  
1. Go to `https://x.com/YOUR_USER_NAME/following`
2. Open the Developer Console. (<kbd>COMMAND</kbd>+<kbd>ALT</kbd>+<kbd>I</kbd> on Mac)
3. Paste the script into the Developer Console and run it

```js
// Unfollow everyone on X (Formerly Twitter) and or unfollow who doesn't follow you back, by nich (https://x.com/nichxbt)
// https://github.com/nirholas/xactions
//
// 1. Go to https://x.com/YOUR_USER_NAME/following
// 2. Open the Developer Console. (COMMAND+ALT+I on Mac)
// 3. Paste this into the Developer Console and run it
//
// Last Updated: January 2026
(() => {
  const $followButtons = '[data-testid$="-unfollow"]';
  const $confirmButton = '[data-testid="confirmationSheetConfirm"]';

  const retry = {
    count: 0,
    limit: 3,
  };

  const scrollToTheBottom = () => window.scrollTo(0, document.body.scrollHeight);
  const retryLimitReached = () => retry.count === retry.limit;
  const addNewRetry = () => retry.count++;

  const sleep = ({ seconds }) =>
    new Promise((proceed) => {
      console.log(`WAITING FOR ${seconds} SECONDS...`);
      setTimeout(proceed, seconds * 1000);
    });

  const unfollowAll = async (followButtons) => {
    console.log(`UNFOLLOWING ${followButtons.length} USERS...`);
    await Promise.all(
      followButtons.map(async (followButton) => {
        followButton && followButton.click();
        await sleep({ seconds: 1 });
        const confirmButton = document.querySelector($confirmButton);
        confirmButton && confirmButton.click();
      })
    );
  };

  const nextBatch = async () => {
    scrollToTheBottom();
    await sleep({ seconds: 1 });

    const followButtons = Array.from(document.querySelectorAll($followButtons));
    const followButtonsWereFound = followButtons.length > 0;

    if (followButtonsWereFound) {
      await unfollowAll(followButtons);
      await sleep({ seconds: 2 });
      return nextBatch();
    } else {
      addNewRetry();
    }

    if (retryLimitReached()) {
      console.log(`NO ACCOUNTS FOUND, SO I THINK WE'RE DONE`);
      console.log(`RELOAD PAGE AND RE-RUN SCRIPT IF ANY WERE MISSED`);
    } else {
      await sleep({ seconds: 2 });
      return nextBatch();
    }
  };

  nextBatch();
})();
```

This script:

- Is completely free.
- Doesn't try and get you to sign in or take your personal data.
- Automates your web browser to make it click unfollow buttons, scroll down to reveal more, then do it again.
- No tricks, all of the code is here so you can see exactly what it does.

</details>

<details>
<summary><strong>How do I find who unfollowed me on Twitter?</strong></summary>

Use `src/detectUnfollowers.js` - it saves a snapshot of your followers and compares on next run.
</details>

<details>
<summary><strong>How do I download Twitter/X videos?</strong></summary>

Use `src/scrapers/videoDownloader.js` - extracts MP4 URLs from any tweet.
</details>

<details>
<summary><strong>Twitter API alternative that's free?</strong></summary>

XActions uses browser automation instead of the API. No API keys needed, no rate limits, no $100/mo fee.
</details>

<details>
<summary><strong>Hypefury / Tweethunter alternative?</strong></summary>

XActions is open-source and completely free for humans. AI agents pay micropayments per request.
</details>

---

## ✨ New: Real-Time Dashboard

1. **Connect your browser** — paste one script in x.com
2. **Run operations** — click buttons on the dashboard
3. **Watch it happen** — see every action in real-time

Your x.com tab does all the work. Nothing gets scraped to our servers. You're in control.

---

## 💰 Pricing

### 🆓 Humans — FREE Forever

All browser scripts, CLI, Node.js library, and local MCP server are **completely free**.

### 🤖 AI Agents — Pay-per-Request

AI agents pay micropayments via [x402](https://x402.org) protocol:

| Operation | Price |
|-----------|-------|
| Profile scrape | $0.001 |
| Followers/Following | $0.01 |
| Tweet scrape | $0.005 |
| Search tweets | $0.01 |
| Unfollow non-followers | $0.05 |
| Detect unfollowers | $0.02 |
| Auto-like | $0.02 |
| Video download | $0.005 |

> **Why charge AI?** AI can make thousands of requests per minute. Micropayments ensure fair access.

---

## 🎯 Why XActions?

| | XActions | Twitter API | Other Tools |
|--|----------|-------------|-------------|
| **Cost (Humans)** | **$0** | $100-$5,000 | $29-99/mo |
| **Cost (AI Agents)** | **$0.001-0.10** | $100-$5,000 | N/A |
| **Setup Time** | **30 seconds** | Hours | Minutes |
| **Open Source** | ✅ | - | ❌ |
| **No API Key** | ✅ | ❌ | ❌ |
| **AI Agent Ready** | ✅ MCP + x402 | ❌ | ❌ |
| **Non-KYC Crypto** | ✅ | ❌ | ❌ |

---

## ⚠️ Disclaimer

> **Educational Material Only**
>
> This project is provided for **educational and research purposes only**. The scripts and tools have not been extensively tested on personal accounts. 
>
> - Use at your own risk
> - We are not responsible for any account restrictions or bans
> - Always comply with X/Twitter's Terms of Service
> - Start with small batches and test carefully
>
> **For X/Twitter:** If you have concerns about this project or would like us to modify or remove any functionality, please contact [@nichxbt](https://x.com/nichxbt) directly. We're happy to work with you.
>
> **Acknowledgment:** This project was inspired by the innovation happening at X and xAI. We admire Elon Musk's vision for making X the everything app and Grok's approach to AI. XActions aims to help developers and researchers explore the platform's capabilities while respecting its ecosystem.

---

## 📦 Installation

### npm (Recommended for developers)
```bash
npm install xactions
```

### CLI (Global install)
```bash
npm install -g xactions
xactions --help
```

### No Install (Browser console)
Just copy-paste scripts directly into your browser console on x.com!

---

## 🚀 Quick Start Examples

### Example 1: Unfollow Non-Followers (30 seconds)

**Browser Console** — *No install required!*
```javascript
// Go to: x.com/YOUR_USERNAME/following
// Press F12 → Console → Paste this:

(() => {
  const sleep = (s) => new Promise(r => setTimeout(r, s * 1000));
  const run = async () => {
    const buttons = [...document.querySelectorAll('[data-testid$="-unfollow"]')]
      .filter(b => !b.closest('[data-testid="UserCell"]')
        ?.querySelector('[data-testid="userFollowIndicator"]'));
    
    for (const btn of buttons) {
      btn.click();
      await sleep(1);
      document.querySelector('[data-testid="confirmationSheetConfirm"]')?.click();
      await sleep(2);
    }
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(2);
    if (document.querySelectorAll('[data-testid$="-unfollow"]').length) run();
    else console.log('✅ Done! Reload page to continue.');
  };
  run();
})();
```

**CLI:**
```bash
xactions login
xactions non-followers YOUR_USERNAME --output non-followers.json
```

**Node.js:**
```javascript
import { createBrowser, createPage, scrapeFollowing } from 'xactions';

const browser = await createBrowser();
const page = await createPage(browser);
const following = await scrapeFollowing(page, 'your_username', { limit: 500 });
const nonFollowers = following.filter(u => !u.followsBack);
console.log(`Found ${nonFollowers.length} non-followers`);
await browser.close();
```

> 💡 **Don't want to code?** Use [xactions.app](https://xactions.app) — just login and click!

---

### Example 2: Scrape Any Profile

**Browser Console:**
```javascript
// Go to any profile on x.com, then run:

(() => {
  const profile = {
    name: document.querySelector('[data-testid="UserName"]')?.textContent?.split('@')[0]?.trim(),
    username: location.pathname.slice(1),
    bio: document.querySelector('[data-testid="UserDescription"]')?.textContent,
    followers: document.querySelector('a[href$="/followers"] span')?.textContent,
    following: document.querySelector('a[href$="/following"] span')?.textContent,
  };
  console.log(profile);
  copy(JSON.stringify(profile, null, 2)); // Copies to clipboard!
})();
```

**CLI:**
```bash
xactions profile elonmusk --json
```

**Node.js:**
```javascript
import { createBrowser, createPage, scrapeProfile } from 'xactions';

const browser = await createBrowser();
const page = await createPage(browser);
const profile = await scrapeProfile(page, 'elonmusk');
console.log(profile);
// { name: 'Elon Musk', followers: '200M', bio: '...', ... }
await browser.close();
```

---

### Example 3: Search & Scrape Tweets

**Browser Console:**
```javascript
// Go to: x.com/search?q=YOUR_KEYWORD&f=live

(() => {
  const tweets = [...document.querySelectorAll('article[data-testid="tweet"]')]
    .map(article => ({
      text: article.querySelector('[data-testid="tweetText"]')?.textContent,
      author: article.querySelector('[data-testid="User-Name"] a')?.href?.split('/')[3],
      time: article.querySelector('time')?.getAttribute('datetime'),
    }));
  console.table(tweets);
  copy(JSON.stringify(tweets, null, 2));
})();
```

**CLI:**
```bash
xactions search "AI startup" --limit 100 --output ai-tweets.json
```

**Node.js:**
```javascript
import { createBrowser, createPage, searchTweets } from 'xactions';

const browser = await createBrowser();
const page = await createPage(browser);
const tweets = await searchTweets(page, 'AI startup', { limit: 100 });
console.log(`Found ${tweets.length} tweets`);
await browser.close();
```

---

### Example 4: Detect Who Unfollowed You

**Browser Console:**
```javascript
// Go to: x.com/YOUR_USERNAME/followers

(() => {
  const KEY = 'xactions_followers';
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  const scrape = async () => {
    const users = new Set();
    let retries = 0;
    while (retries < 5) {
      document.querySelectorAll('[data-testid="UserCell"] a')
        .forEach(a => users.add(a.href.split('/')[3]?.toLowerCase()));
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(1500);
      retries++;
    }
    return [...users].filter(Boolean);
  };

  scrape().then(current => {
    const saved = localStorage.getItem(KEY);
    if (saved) {
      const old = JSON.parse(saved);
      const gone = old.filter(u => !current.includes(u));
      console.log('🚨 Unfollowed you:', gone);
    }
    localStorage.setItem(KEY, JSON.stringify(current));
    console.log(`💾 Saved ${current.length} followers`);
  });
})();
```

**CLI:**
```bash
# First run saves snapshot
xactions followers YOUR_USERNAME --output snapshot1.json

# Later, compare
xactions followers YOUR_USERNAME --output snapshot2.json
# Use diff tools to compare
```

---

### Example 5: Auto-Like Posts by Keyword

**Browser Console:**
```javascript
// Go to: x.com/search?q=YOUR_KEYWORD&f=live

(async () => {
  const sleep = (s) => new Promise(r => setTimeout(r, s * 1000));
  const liked = new Set();
  
  while (liked.size < 20) { // Like 20 posts
    const buttons = [...document.querySelectorAll('[data-testid="like"]')]
      .filter(b => !liked.has(b));
    
    for (const btn of buttons.slice(0, 3)) {
      btn.click();
      liked.add(btn);
      console.log(`❤️ Liked ${liked.size} posts`);
      await sleep(3 + Math.random() * 2); // Random delay
    }
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(2);
  }
  console.log('✅ Done!');
})();
```

> ⚠️ **Go slow!** Twitter may rate-limit you. The website version handles this automatically.

---

### Example 6: Leave All Communities

**Browser Console:**
```javascript
// Go to: x.com/YOUR_USERNAME/communities

(() => {
  const $communityLinks = 'a[href^="/i/communities/"]';
  const $joinedButton = 'button[aria-label^="Joined"]';
  const $confirmButton = '[data-testid="confirmationSheetConfirm"]';
  const $communitiesNav = 'a[aria-label="Communities"]';

  const getLeftCommunities = () => {
    try { return JSON.parse(sessionStorage.getItem('xactions_left_ids') || '[]'); }
    catch { return []; }
  };
  const markAsLeft = (id) => {
    const left = getLeftCommunities();
    if (!left.includes(id)) {
      left.push(id);
      sessionStorage.setItem('xactions_left_ids', JSON.stringify(left));
    }
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const getCommunityId = () => {
    const leftAlready = getLeftCommunities();
    for (const link of document.querySelectorAll($communityLinks)) {
      const match = link.href.match(/\/i\/communities\/(\d+)/);
      if (match && !leftAlready.includes(match[1])) return { id: match[1], element: link };
    }
    return null;
  };

  const run = async () => {
    console.log(`🚀 Left so far: ${getLeftCommunities().length}`);
    await sleep(1500);
    const joinedBtn = document.querySelector($joinedButton);
    if (joinedBtn) {
      const urlMatch = window.location.href.match(/\/i\/communities\/(\d+)/);
      const currentId = urlMatch ? urlMatch[1] : null;
      joinedBtn.click();
      await sleep(1000);
      const confirmBtn = document.querySelector($confirmButton);
      if (confirmBtn) { confirmBtn.click(); if (currentId) markAsLeft(currentId); await sleep(1500); }
      const communitiesLink = document.querySelector($communitiesNav);
      if (communitiesLink) { communitiesLink.click(); await sleep(2500); return run(); }
    }
    const community = getCommunityId();
    if (community) { community.element.click(); await sleep(2500); return run(); }
    else { console.log(`🎉 DONE! Left ${getLeftCommunities().length} communities`); sessionStorage.removeItem('xactions_left_ids'); }
  };
  run();
})();
```

> 📖 Full documentation: [docs/examples/leave-all-communities.md](docs/examples/leave-all-communities.md)

---

## 📋 Complete Feature List

### Feature Availability Matrix

| Feature | Console Script | CLI | Node.js | Website |
|---------|:-------------:|:---:|:-------:|:-------:|
| **SCRAPING** |
| Scrape Profile | ✅ | ✅ | ✅ | ✅ |
| Scrape Followers | ✅ | ✅ | ✅ | ✅ |
| Scrape Following | ✅ | ✅ | ✅ | ✅ |
| Scrape Tweets | ✅ | ✅ | ✅ | ✅ |
| Search Tweets | ✅ | ✅ | ✅ | ✅ |
| Scrape Thread | ✅ | ✅ | ✅ | ✅ |
| Scrape Hashtag | ✅ | ✅ | ✅ | ✅ |
| Scrape Media | ✅ | ✅ | ✅ | ✅ |
| Scrape List Members | ✅ | ✅ | ✅ | ✅ |
| Scrape Likes | ✅ | ✅ | ✅ | ✅ |
| **UNFOLLOW** |
| Unfollow Non-Followers | ✅ | ✅ | ✅ | ✅ |
| Unfollow Everyone | ✅ | ✅ | ✅ | ✅ |
| Smart Unfollow (after X days) | ⚠️ | ✅ | ✅ | ✅ |
| Unfollow with Logging | ✅ | ✅ | ✅ | ✅ |
| **FOLLOW** |
| Follow User | ✅ | ✅ | ✅ | ✅ |
| Keyword Follow | ⚠️ | ✅ | ✅ | ✅ |
| Follow Engagers | ⚠️ | ✅ | ✅ | ✅ |
| Follow Target's Followers | ⚠️ | ✅ | ✅ | ✅ |
| **ENGAGEMENT** |
| Like Tweet | ✅ | ✅ | ✅ | ✅ |
| Retweet | ✅ | ✅ | ✅ | ✅ |
| Auto-Liker | ⚠️ | ✅ | ✅ | ✅ |
| Auto-Commenter | ⚠️ | ✅ | ✅ | ✅ |
| Post Tweet | ✅ | ✅ | ✅ | ✅ |
| **MONITORING** |
| Detect Unfollowers | ✅ | ✅ | ✅ | ✅ |
| New Follower Alerts | ✅ | ✅ | ✅ | ✅ |
| Monitor Any Account | ✅ | ✅ | ✅ | ✅ |
| Continuous Monitoring | ⚠️ | ✅ | ✅ | ✅ |
| **COMMUNITIES** |
| Leave All Communities | ✅ | ⚠️ | ⚠️ | ⚠️ |
| **ADVANCED** |
| Multi-Account | ❌ | ✅ | ✅ | ✅ Pro |
| Link Scraper | ✅ | ✅ | ✅ | ✅ |
| Growth Suite | ❌ | ✅ | ✅ | ✅ Pro |
| Customer Service Bot | ❌ | ✅ | ✅ | ✅ Pro |
| MCP Server (AI Agents) | ❌ | ✅ | ✅ | ❌ |
| Export to CSV/JSON | ✅ | ✅ | ✅ | ✅ |

**Legend:** ✅ Full Support | ⚠️ Basic/Manual | ❌ Not Available

---

## 🤖 MCP Server (AI Agents)

XActions includes an MCP (Model Context Protocol) server so AI agents like Claude can automate X/Twitter.

### Setup for Claude Desktop

Add to your `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "xactions": {
      "command": "node",
      "args": ["/path/to/xactions/src/mcp/server.js"]
    }
  }
}
```

### Available MCP Tools

| Tool | Description |
|------|-------------|
| `x_login` | Login with session cookie |
| `x_get_profile` | Get user profile info |
| `x_get_followers` | Scrape followers |
| `x_get_following` | Scrape following |
| `x_get_non_followers` | Find non-followers |
| `x_get_tweets` | Scrape user's tweets |
| `x_search_tweets` | Search tweets by query |
| `x_follow` | Follow a user |
| `x_unfollow` | Unfollow a user |
| `x_post_tweet` | Post a tweet |
| `x_like` | Like a tweet |
| `x_retweet` | Retweet |

### Example AI Prompt
> "Use XActions to find everyone I follow who doesn't follow me back"

---

## 💻 CLI Reference

```bash
# Authentication
xactions login              # Set up session cookie
xactions logout             # Remove saved auth

# Profile
xactions profile <user>     # Get profile info
xactions profile elonmusk --json

# Scraping
xactions followers <user> [--limit 100] [--output file.json]
xactions following <user> [--limit 100] [--output file.csv]
xactions tweets <user> [--limit 50] [--replies]
xactions search <query> [--filter latest|top] [--limit 50]
xactions hashtag <tag> [--limit 50]
xactions thread <url>
xactions media <user> [--limit 50]

# Analysis
xactions non-followers <user> [--limit 500]

# Info
xactions info              # Show version and links
xactions --help            # Full help
```

---

## 📚 Node.js API

### Quick Start
```javascript
import { 
  createBrowser, 
  createPage, 
  loginWithCookie,
  scrapeProfile,
  scrapeFollowers,
  scrapeFollowing,
  scrapeTweets,
  searchTweets,
  exportToJSON,
  exportToCSV 
} from 'xactions';

// Initialize
const browser = await createBrowser({ headless: true });
const page = await createPage(browser);

// Optional: Login for private data
await loginWithCookie(page, 'your_auth_token_cookie');

// Scrape profile
const profile = await scrapeProfile(page, 'elonmusk');

// Scrape followers with progress
const followers = await scrapeFollowers(page, 'elonmusk', {
  limit: 1000,
  onProgress: ({ scraped, limit }) => console.log(`${scraped}/${limit}`)
});

// Export data
await exportToJSON(followers, 'followers.json');
await exportToCSV(followers, 'followers.csv');

await browser.close();
```

### All Scraper Functions

```javascript
// Profile
scrapeProfile(page, username)

// Followers & Following
scrapeFollowers(page, username, { limit, onProgress })
scrapeFollowing(page, username, { limit, onProgress })

// Tweets
scrapeTweets(page, username, { limit, includeReplies, onProgress })
searchTweets(page, query, { limit, filter: 'latest'|'top' })
scrapeThread(page, tweetUrl)
scrapeHashtag(page, hashtag, { limit, filter })

// Media
scrapeMedia(page, username, { limit })
scrapeLikes(page, tweetUrl, { limit })

// Lists
scrapeListMembers(page, listUrl, { limit })

// Export
exportToJSON(data, filename)
exportToCSV(data, filename)
```

---

## 🌐 Don't Want to Code?

**Visit [xactions.app](https://xactions.app)** for a no-code solution:

1. Use browser scripts (drag to bookmarks bar)
2. Copy-paste console scripts on x.com
3. View tutorials and documentation

**100% Free for humans.** AI agents pay per request via x402 micropayments.

---

## 🔒 Safety & Best Practices

### Rate Limiting
XActions includes built-in delays to avoid rate limits:
- 1-3 second delay between actions
- Human-like scrolling patterns
- Automatic pause on rate limit detection

### Getting Your Auth Token
1. Go to x.com and log in
2. Open DevTools (F12) → Application → Cookies
3. Find `auth_token` and copy the value

### Avoid Bans
- ✅ Use reasonable delays (2-5 seconds)
- ✅ Don't run 24/7
- ✅ Mix automated with manual activity
- ❌ Don't mass-follow thousands per day
- ❌ Don't spam comments

---

## 📁 Project Structure

```
xactions/
├── src/
│   ├── index.js          # Main entry point
│   ├── scrapers/         # All scraper functions
│   │   └── index.js      # Scraper exports
│   ├── cli/              # Command-line interface
│   │   └── index.js      # CLI commands
│   ├── mcp/              # MCP server for AI agents
│   │   └── server.js     # MCP implementation
│   └── automation/       # Advanced automation
│       ├── autoLiker.js
│       ├── autoCommenter.js
│       ├── keywordFollow.js
│       └── ...
├── docs/                 # Documentation
├── examples/             # Code examples
├── dashboard/            # Web UI
└── api/                  # Backend API
```

---

## 🤝 Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md).

```bash
# Clone
git clone https://github.com/nirholas/xactions.git
cd xactions

# Install
npm install

# Run CLI locally
npm run cli -- profile elonmusk

# Run MCP server
npm run mcp
```

---

## 📄 License

MIT License - see [LICENSE](LICENSE)

Commercial use allowed. Attribution appreciated but not required.

---

## 👤 Author

**nich** ([@nichxbt](https://x.com/nichxbt))

- GitHub: [github.com/nirholas](https://github.com/nirholas)
- Twitter: [@nichxbt](https://x.com/nichxbt)
- Website: [xactions.app](https://xactions.app)

---

## ⚠️ Legal Notice

This software is provided "as is" for educational purposes. Not affiliated with X Corp. Use responsibly and in compliance with X/Twitter Terms of Service. Contact [@nichxbt](https://x.com/nichxbt) for any concerns.

---

## ⭐ Star This Repo!

If XActions helped you, give it a star! It helps others find the project.

[![Star History Chart](https://api.star-history.com/svg?repos=nirholas/xactions&type=Date)](https://star-history.com/#nirholas/xactions&Date)

---

## 📚 Full Tutorial Library

**XActions is 100% free and open source.** Visit [xactions.app](https://xactions.app) for interactive tutorials.

### 🚀 One-Click Script Runner

**NEW!** Run scripts without any coding knowledge:

1. Visit [xactions.app/run.html](https://xactions.app/run.html)
2. Drag any blue button to your bookmarks bar
3. Go to x.com and click the bookmarklet

No console, no code, no setup!

### Quick Links by Category

| Category | Scripts | Tutorial |
|----------|---------|----------|
| **Unfollow** | Unfollow Everyone, Non-Followers, Smart Unfollow | [Tutorial](https://xactions.app/tutorials/unfollow) |
| **Automation** | Auto-Liker, Auto-Commenter, Follow Engagers | [Tutorial](https://xactions.app/tutorials/automation) |
| **Scraping** | Video Download, Followers, Tweets, Hashtags | [Tutorial](https://xactions.app/tutorials/scrapers) |
| **Monitoring** | Detect Unfollowers, Track Accounts, Alerts | [Tutorial](https://xactions.app/tutorials/monitoring) |
| **Communities** | Leave All Communities | [Tutorial](https://xactions.app/tutorials/communities) |
| **AI/MCP** | Claude Desktop, GPT Integration | [Tutorial](https://xactions.app/tutorials/mcp) |

### All Documentation

- [Getting Started](docs/getting-started.md)
- [CLI Reference](docs/cli-reference.md)
- [Automation Guide](docs/automation.md)
- [Monitoring Guide](docs/monitoring.md)

### Example Docs (Full Code)

| Feature | Documentation |
|---------|---------------|
| Unfollow Everyone | [unfollow-everyone.md](docs/examples/unfollow-everyone.md) |
| Unfollow Non-Followers | [unfollow-non-followers.md](docs/examples/unfollow-non-followers.md) |
| Detect Unfollowers | [detect-unfollowers.md](docs/examples/detect-unfollowers.md) |
| Auto-Liker | [auto-liker.md](docs/examples/auto-liker.md) |
| Auto-Commenter | [auto-commenter.md](docs/examples/auto-commenter.md) |
| Follow Engagers | [follow-engagers.md](docs/examples/follow-engagers.md) |
| Video Downloader | [video-downloader.md](docs/examples/video-downloader.md) |
| Followers Scraping | [followers-scraping.md](docs/examples/followers-scraping.md) |
| Tweet Scraping | [tweet-scraping.md](docs/examples/tweet-scraping.md) |
| Leave Communities | [leave-all-communities.md](docs/examples/leave-all-communities.md) |
| MCP Server | [mcp-server.md](docs/examples/mcp-server.md) |
| Monitor Account | [monitor-account.md](docs/examples/monitor-account.md) |
| New Follower Alerts | [new-follower-alerts.md](docs/examples/new-follower-alerts.md) |

---

<p align="center">
  <b>⚡ XActions</b> — The Complete X/Twitter Automation Toolkit<br>
  <b>100% Free & Open Source</b><br>
  <a href="https://xactions.app">xactions.app</a> • 
  <a href="https://github.com/nirholas/xactions">GitHub</a> • 
  <a href="https://x.com/nichxbt">@nichxbt</a>
</p>


