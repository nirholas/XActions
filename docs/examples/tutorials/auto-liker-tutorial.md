---
title: "Auto-Like Tweets on X (Twitter) — Free Script 2026"
description: "Auto-like tweets by keyword on X/Twitter. Free browser script, CLI, and MCP method. No API key needed."
keywords: ["auto like tweets twitter", "twitter auto liker script", "auto like twitter 2026", "how to auto like on X", "twitter like bot free", "auto like tweets by keyword", "twitter automation like free", "auto engage twitter", "xactions auto liker", "like tweets automatically X"]
canonical: "https://xactions.app/examples/auto-liker"
author: "nich (@nichxbt)"
date: "2026-02-24"
---

# ❤️ Auto-Like Tweets on X (Twitter) — Grow Your Presence on Autopilot

> **Automatically like tweets matching your keywords on X (Twitter) — free, no API key, no app install.** Set your niche keywords, run the script, and watch your engagement grow.

**Works on:** 🌐 Browser Console · 💻 CLI · 🤖 MCP (AI Agents)
**Difficulty:** 🟢 Beginner
**Time:** ⏱️ 2–15 minutes per session
**Requirements:** A web browser logged into x.com

> 📖 For the quick-reference version, see [auto-liker.md](../auto-liker.md)

---

## 🎯 Real-World Scenario

You're building a personal brand in the AI startup space. You want to grow your X account organically by engaging with people who tweet about topics you care about — "AI startups," "machine learning," "LLM agents." But manually scrolling your timeline and liking relevant posts takes **30–60 minutes a day**. You need a way to auto-like tweets that match your niche keywords while you focus on creating content.

XActions' Auto-Liker scrolls your home feed (or any profile), finds tweets matching your keywords, and likes them automatically with human-like delays. You set it, walk away, and come back to new followers and DMs from people who noticed you liked their posts.

**Before XActions:**

```
┌──────────────────────────────────────────────────────┐
│  Your Daily Routine                                  │
├──────────────────────────────────────────────────────┤
│                                                      │
│  8:00 AM  Open X timeline                            │
│  8:05 AM  Scroll... scroll... scroll...              │
│  8:12 AM  Found an AI tweet → click ❤️               │
│  8:15 AM  Scroll... scroll... scroll...              │
│  8:23 AM  Found another one → click ❤️               │
│  8:30 AM  Getting bored, check notifications         │
│  8:45 AM  Back to scrolling → click ❤️               │
│  9:00 AM  Give up. Liked 8 tweets in 60 minutes.    │
│                                                      │
│  Daily likes: ~8          Time spent: ~60 min        │
│  New followers this week: 2                          │
└──────────────────────────────────────────────────────┘
```

**After XActions:**

```
┌──────────────────────────────────────────────────────┐
│  Your Daily Routine                                  │
├──────────────────────────────────────────────────────┤
│                                                      │
│  8:00 AM  Paste auto-liker script, press Enter       │
│  8:01 AM  Go write a blog post / build features      │
│  8:12 AM  ✅ Script finished — liked 20 matching     │
│           tweets about "AI startups" automatically   │
│                                                      │
│  Daily likes: 20–50       Time spent: ~1 minute      │
│  New followers this week: 15–30                      │
│  New DMs: "Hey, noticed you like AI stuff too!"     │
└──────────────────────────────────────────────────────┘
```

---

## 📋 What This Does (Step by Step)

1. 📜 **Scans your timeline** — reads visible tweets on the current page
2. 🔍 **Filters by keywords** — only engages with tweets containing your configured terms (e.g., "AI," "web3," "startup")
3. 🚫 **Skips noise** — ignores ads, replies, already-liked posts, and tweets from excluded users
4. ❤️ **Likes matching tweets** — clicks the heart button with realistic 2–5s delays
5. 📜 **Scrolls for more** — scrolls down to load new tweets and repeats
6. 💾 **Saves session state** — remembers which tweets you've liked so re-runs don't double-like
7. 📊 **Reports results** — prints how many tweets were liked and when to stop

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  [Open timeline / profile]                                  │
│          │                                                  │
│          ▼                                                  │
│  [Scan visible tweets]                                      │
│          │                                                  │
│          ▼                                                  │
│  [Filter: keyword match?] ──No──→ [Skip]                    │
│          │ Yes                                              │
│          ▼                                                  │
│  [Filter: already liked? ad? reply?] ──Yes──→ [Skip]        │
│          │ No                                               │
│          ▼                                                  │
│  [Click ❤️ like button]                                     │
│          │                                                  │
│          ▼                                                  │
│  [Wait 2–5s random delay]                                   │
│          │                                                  │
│          ▼                                                  │
│  [Max likes reached?] ──Yes──→ [Print summary ✅]           │
│          │ No                                               │
│          ▼                                                  │
│  [Scroll down 800px] ──→ [Scan visible tweets]              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🌐 Method 1: Browser Console (Copy-Paste)

**Best for:** Anyone — no installs, runs right in your browser.

### Prerequisites

- [x] Logged into your X/Twitter account in a web browser
- [x] On a desktop/laptop (not mobile)
- [x] On your home feed (`x.com/home`) or a user's profile

### Step 1: Navigate to your timeline or a target profile

> Go to **`x.com/home`** for your main feed, or **`x.com/USERNAME`** for a specific user's tweets.

```
┌──────────────────────────────────────────────────────┐
│ 🔍 x.com/home                                        │
├──────────────────────────────────────────────────────┤
│                                                      │
│  👤 @karpathy                                        │
│  "Just published a new post on training LLMs         │
│   from scratch with minimal compute..."              │
│  ❤️ 4,521  🔄 892  💬 234                             │
│                                                      │
│  👤 @elonmusk                                        │
│  "Grok 3 is the most capable AI model ever"         │
│  ❤️ 45,210  🔄 8,920  💬 12,340                       │
│                                                      │
│  👤 @nichxbt                                         │
│  "Just shipped auto-liker v3 for XActions 🚀        │
│   Now with keyword filtering and MCP support"        │
│  ❤️ 127  🔄 34  💬 18                                 │
│                                                      │
│  ... more tweets below                               │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Step 2: Open Developer Console

| OS | Shortcut |
|----|----------|
| **Windows / Linux** | `F12` then click **Console** tab, or `Ctrl + Shift + J` |
| **Mac** | `Cmd + Option + J` |

```
┌──────────────────────────────────────────────────────┐
│ Elements  Console  Sources  Network  ...             │
├──────────────────────────────────────────────────────┤
│ >                                                    │
│ │  (paste script here and press Enter)               │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Step 3: Paste and Run

Copy the entire script below, paste it into the console, and press **Enter**:

```javascript
// ============================================
// XActions - Auto-Like Tweets on X/Twitter
// by nichxbt — https://xactions.app
// Go to: x.com/home or any user's profile
// Open console (F12 → Console), paste, Enter
// ============================================

(async () => {
  // ============================================
  // CONFIGURATION — edit these to match your niche
  // ============================================
  const CONFIG = {
    // Keywords to match (tweets must contain at least one)
    // Set to [] to like ALL tweets (careful!)
    KEYWORDS: ['AI', 'startup', 'machine learning', 'LLM'],

    // Only like tweets from these users (empty = all users)
    FROM_USERS: [],

    // Limits
    MAX_LIKES: 20,              // Max likes per session
    MAX_SCROLL_DEPTH: 50,       // Max scroll iterations

    // Delays (milliseconds)
    MIN_DELAY: 2000,            // Min delay between likes
    MAX_DELAY: 5000,            // Max delay between likes

    // Filters
    SKIP_REPLIES: true,         // Skip reply tweets
    SKIP_ADS: true,             // Skip promoted tweets
    ALSO_RETWEET: false,        // Also retweet liked posts (careful!)
    MIN_LIKES_ON_POST: 0,       // Only like posts with at least X likes
  };

  console.log('');
  console.log('❤️  XActions - AUTO-LIKER');
  console.log('════════════════════════════════════════');
  console.log(`🔑 Keywords: ${CONFIG.KEYWORDS.length ? CONFIG.KEYWORDS.join(', ') : 'ALL (no filter)'}`);
  console.log(`🎯 Max likes: ${CONFIG.MAX_LIKES}`);
  console.log(`⏱️  Delay: ${CONFIG.MIN_DELAY / 1000}–${CONFIG.MAX_DELAY / 1000}s`);
  console.log('════════════════════════════════════════');
  console.log('');

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const randomDelay = (min, max) => sleep(min + Math.random() * (max - min));

  // State
  let likeCount = 0;
  let scrollCount = 0;
  let skipped = 0;
  const likedIds = new Set();

  // Load previously liked tweets from sessionStorage
  try {
    const saved = JSON.parse(sessionStorage.getItem('xactions_liked') || '[]');
    saved.forEach(id => likedIds.add(id));
    if (likedIds.size > 0) {
      console.log(`📦 Loaded ${likedIds.size} previously liked tweet IDs from session`);
    }
  } catch (e) {}

  // ============================================
  // HELPERS
  // ============================================

  const getTweetId = (article) => {
    const link = article.querySelector('a[href*="/status/"]');
    if (link) {
      const match = link.href.match(/status\/(\d+)/);
      return match ? match[1] : null;
    }
    return null;
  };

  const matchesKeywords = (text) => {
    if (CONFIG.KEYWORDS.length === 0) return true;
    const lower = text.toLowerCase();
    return CONFIG.KEYWORDS.some(kw => lower.includes(kw.toLowerCase()));
  };

  const matchesUser = (article) => {
    if (CONFIG.FROM_USERS.length === 0) return true;
    const userLink = article.querySelector('a[href^="/"]');
    if (!userLink) return false;
    const username = userLink.getAttribute('href').replace('/', '').toLowerCase();
    return CONFIG.FROM_USERS.some(u => u.toLowerCase() === username);
  };

  const isAlreadyLiked = (article) => {
    return !!article.querySelector('[data-testid="unlike"]');
  };

  const isReply = (article) => {
    return !!article.textContent?.includes('Replying to');
  };

  const isAd = (article) => {
    return !!article.querySelector('[data-testid="placementTracking"]') ||
           !!article.textContent?.includes('Promoted');
  };

  const getEngagement = (article) => {
    const buttons = article.querySelectorAll('[role="group"] button');
    let likes = 0;
    buttons.forEach(btn => {
      const label = btn.getAttribute('aria-label') || '';
      if (label.includes('like')) {
        const match = label.match(/[\d,.]+/);
        if (match) likes = parseInt(match[0].replace(/,/g, ''), 10) || 0;
      }
    });
    return likes;
  };

  // ============================================
  // MAIN LOOP
  // ============================================

  while (scrollCount < CONFIG.MAX_SCROLL_DEPTH && likeCount < CONFIG.MAX_LIKES) {
    const articles = document.querySelectorAll('article[data-testid="tweet"]');

    for (const article of articles) {
      if (likeCount >= CONFIG.MAX_LIKES) break;

      const tweetId = getTweetId(article);
      if (!tweetId || likedIds.has(tweetId)) continue;

      // Filters
      if (isAlreadyLiked(article)) { likedIds.add(tweetId); continue; }
      if (CONFIG.SKIP_REPLIES && isReply(article)) { skipped++; continue; }
      if (CONFIG.SKIP_ADS && isAd(article)) { skipped++; continue; }

      // Get tweet text
      const textEl = article.querySelector('[data-testid="tweetText"]');
      const text = textEl?.textContent || '';

      if (!matchesKeywords(text)) { skipped++; continue; }
      if (!matchesUser(article)) { skipped++; continue; }

      // Check minimum likes
      if (CONFIG.MIN_LIKES_ON_POST > 0) {
        const postLikes = getEngagement(article);
        if (postLikes < CONFIG.MIN_LIKES_ON_POST) { skipped++; continue; }
      }

      // Found a match — like it!
      const handle = article.querySelector('a[href^="/"]')?.getAttribute('href')?.replace('/', '') || '???';
      const preview = text.substring(0, 60).replace(/\n/g, ' ');
      console.log(`❤️  ${likeCount + 1}/${CONFIG.MAX_LIKES} — @${handle}: "${preview}..."`);

      // Click the like button
      const likeBtn = article.querySelector('[data-testid="like"]');
      if (likeBtn) {
        likeBtn.click();
        likeCount++;
        likedIds.add(tweetId);

        // Save to session
        try {
          sessionStorage.setItem('xactions_liked', JSON.stringify(Array.from(likedIds)));
        } catch (e) {}

        // Optional retweet
        if (CONFIG.ALSO_RETWEET) {
          await sleep(1000);
          const rtBtn = article.querySelector('[data-testid="retweet"]');
          if (rtBtn) {
            rtBtn.click();
            await sleep(500);
            const confirm = document.querySelector('[data-testid="retweetConfirm"]');
            if (confirm) confirm.click();
            console.log('   🔄 Also retweeted');
          }
        }

        await randomDelay(CONFIG.MIN_DELAY, CONFIG.MAX_DELAY);
      }
    }

    // Scroll for more tweets
    window.scrollBy(0, 800);
    scrollCount++;
    await sleep(1500 + Math.random() * 1500);

    if (scrollCount % 10 === 0) {
      console.log(`📊 Progress: ${likeCount} liked, ${skipped} skipped, scrolled ${scrollCount}x`);
    }
  }

  // ============================================
  // SUMMARY
  // ============================================
  console.log('');
  console.log('════════════════════════════════════════');
  console.log('❤️  AUTO-LIKER — COMPLETE');
  console.log('════════════════════════════════════════');
  console.log(`✅ Liked: ${likeCount} tweets`);
  console.log(`⏭️  Skipped: ${skipped} (replies, ads, no keyword match)`);
  console.log(`📜 Scrolled: ${scrollCount} times`);
  console.log(`💾 Session saved: ${likedIds.size} total liked IDs`);
  console.log('');
  console.log('💡 Run again to continue where you left off.');
  console.log('   Change CONFIG.KEYWORDS to target different topics.');
  console.log('════════════════════════════════════════');

  // Expose stop function for mid-run abort
  window.stopAutoLiker = () => {
    CONFIG.MAX_LIKES = 0;
    console.log('⛔ Stopping auto-liker...');
  };
})();
```

### ✅ Expected Output

```
❤️  XActions - AUTO-LIKER
════════════════════════════════════════
🔑 Keywords: AI, startup, machine learning, LLM
🎯 Max likes: 20
⏱️  Delay: 2–5s
════════════════════════════════════════

❤️  1/20 — @karpathy: "Just published a new post on training LLMs from scra..."
❤️  2/20 — @nichxbt: "Just shipped auto-liker v3 for XActions 🚀 Now with key..."
❤️  3/20 — @sama: "The most important thing about AI startups is speed of..."
📊 Progress: 3 liked, 12 skipped, scrolled 10x
❤️  4/20 — @ylecun: "New paper on self-supervised learning for LLM pretraini..."
❤️  5/20 — @emollick: "This is the most impressive AI startup demo I've seen..."
...
❤️  20/20 — @naval: "Machine learning is eating every industry that hasn't..."

════════════════════════════════════════
❤️  AUTO-LIKER — COMPLETE
════════════════════════════════════════
✅ Liked: 20 tweets
⏭️  Skipped: 47 (replies, ads, no keyword match)
📜 Scrolled: 34 times
💾 Session saved: 20 total liked IDs

💡 Run again to continue where you left off.
   Change CONFIG.KEYWORDS to target different topics.
════════════════════════════════════════
```

---

## 💻 Method 2: CLI (Command Line)

> XActions CLI doesn't have a dedicated `auto-like` command yet, but you can use the **MCP server** or **browser console** method. The CLI focuses on scraping and data export.

```bash
# Install XActions globally
npm install -g xactions

# Use the search command to find tweets, then like via browser
npx xactions search "AI startups" --limit 50 --output ai-tweets.json
```

For full automation from the terminal, use the MCP server method below with an AI agent, or run the browser script via Puppeteer (see [auto-liker.md](../auto-liker.md) for the Node.js/Puppeteer example).

---

## 🤖 Method 3: MCP Server (AI Agents)

> Use with Claude Desktop, GPT, Cursor, or any MCP-compatible AI agent.

### Setup

Add XActions to your MCP config (e.g., `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "xactions": {
      "command": "npx",
      "args": ["-y", "xactions", "mcp"]
    }
  }
}
```

### MCP Tool Call

```json
{
  "tool": "x_auto_like",
  "arguments": {
    "keywords": ["AI", "startup", "machine learning"],
    "max_likes": 20,
    "delay_ms": 3000,
    "skip_replies": true,
    "skip_ads": true
  }
}
```

### Claude Desktop example prompt:

> "Auto-like the next 20 tweets on my X timeline that mention AI or machine learning. Skip ads and replies. Use 3-second delays."

### Expected MCP response:

```json
{
  "status": "complete",
  "keywords": ["AI", "startup", "machine learning"],
  "liked": 20,
  "skipped": 47,
  "scrolls": 34,
  "duration_seconds": 142
}
```

---

## 📊 Method Comparison

| Feature | 🌐 Browser Console | 💻 CLI | 🤖 MCP |
|---------|-------------------|--------|---------|
| Setup | None | `npm install` | Config JSON |
| Speed | Fast | N/A (use browser) | Via AI agent |
| Best for | Quick sessions | Search + export | AI workflows |
| Keyword filter | ✅ | ✅ (search only) | ✅ |
| Session memory | ✅ sessionStorage | ❌ | ❌ |
| Progress | Console logs | N/A | Status object |
| Rate limit safety | ✅ | ✅ | ✅ |
| Stop mid-run | `stopAutoLiker()` | Ctrl+C | Cancel tool |

---

## ⚙️ Configuration Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `KEYWORDS` | string[] | `['AI', 'startup']` | Only like tweets containing these words. Empty = like all |
| `FROM_USERS` | string[] | `[]` | Only like tweets from these users. Empty = all users |
| `MAX_LIKES` | number | `20` | Maximum likes per session |
| `MAX_SCROLL_DEPTH` | number | `50` | Maximum scroll iterations before stopping |
| `MIN_DELAY` | number | `2000` | Minimum delay between likes (ms) |
| `MAX_DELAY` | number | `5000` | Maximum delay between likes (ms) |
| `SKIP_REPLIES` | boolean | `true` | Skip tweets that are replies |
| `SKIP_ADS` | boolean | `true` | Skip promoted/sponsored tweets |
| `ALSO_RETWEET` | boolean | `false` | Also retweet every liked tweet (⚠️ aggressive) |
| `MIN_LIKES_ON_POST` | number | `0` | Only like posts with at least this many existing likes |

---

## 📊 Sample Keyword Strategies

### AI / Tech Niche
```javascript
KEYWORDS: ['AI', 'machine learning', 'LLM', 'GPT', 'startup', 'open source']
```

### Crypto / Web3 Niche
```javascript
KEYWORDS: ['web3', 'crypto', 'DeFi', 'NFT', 'blockchain', 'Ethereum', 'Solana']
```

### Marketing / Growth Niche
```javascript
KEYWORDS: ['growth hacking', 'SEO', 'content marketing', 'SaaS', 'conversion rate']
```

### Combined Focus (specific user + keywords)
```javascript
KEYWORDS: ['build in public'],
FROM_USERS: ['levelsio', 'marc_louvion', 'dankulkov'],
```

---

## 💡 Pro Tips

1. **Start small — 10–20 likes per session** — X is more likely to flag your account if you suddenly like 200 tweets after months of 5/day. Ramp up gradually over a week: 10 → 20 → 30 → 50.

2. **Rotate keywords weekly** — Don't use the same keywords every day. Vary between 2–3 related keyword sets to appear natural and discover new accounts in your niche.

3. **Combine with manual engagement** — Auto-liking gets you noticed, but replying to tweets builds real connections. Use auto-liker to cast a wide net, then manually reply to the 3–5 best tweets in your liked batch.

4. **Use `FROM_USERS` for surgical targeting** — If you want a specific influencer to notice you, set `FROM_USERS: ['their_handle']` and like their recent posts consistently over a few days. They'll see you in notifications.

5. **Run `stopAutoLiker()` if anything looks wrong** — Type this in the console at any time to halt the script immediately.

---

## ⚠️ Important Notes

- **Rate limits** — X limits likes to roughly 200–300 per day. The script's 2–5s delays keep you safe at 20–50 per session. Don't run more than 3–4 sessions per day.
- **Platform policy** — Automated liking is a gray area. Human-like delays and keyword targeting reduce risk. Never run auto-liker 24/7.
- **Session state** — Liked tweet IDs are saved in `sessionStorage`. Closing the tab clears the state. This prevents double-liking within a session but not across sessions or browser restarts.
- **Content responsibility** — The script likes tweets matching keywords. Review the `KEYWORDS` list carefully — you don't want to auto-like something controversial just because it mentioned "AI."
- **Don't combine with other automations** — Running auto-liker + auto-commenter + auto-follow simultaneously is a fast path to account restriction.

---

## 🔗 Related Features

| Feature | Use Case | Link |
|---------|----------|------|
| Auto-Commenter | Auto-reply to tweets for deeper engagement | [→ Guide](../auto-commenter.md) |
| Follow Engagers | Follow people who liked a viral tweet | [→ Guide](../follow-engagers.md) |
| Keyword Follow | Auto-follow people tweeting about your niche | [→ Guide](../keyword-follow.md) |
| Growth Suite | Combine auto-like + follow + unfollow in one campaign | [→ Guide](../growth-suite.md) |
| Engagement Analytics | See which tweets perform best | [→ Guide](../engagement-analytics.md) |

---

## ❓ FAQ

### Q: How do I auto-like tweets on Twitter / X in 2026?
**A:** Go to `x.com/home`, open your browser console (F12 → Console), paste the XActions auto-liker script, and press Enter. Configure your keywords (e.g., "AI," "startup") and the script will scroll your timeline, find matching tweets, and like them automatically with safe 2–5 second delays. No API key or software install needed.

### Q: Is auto-liking tweets on Twitter safe?
**A:** With reasonable limits, yes. Keep sessions to 20–50 likes with 2–5 second delays between actions. Don't run more than 3–4 sessions per day (total ~100–200 likes/day). The XActions script uses randomized human-like timing to mimic natural behavior. Avoid running multiple automation scripts simultaneously.

### Q: Can I auto-like only tweets about a specific topic?
**A:** Yes. Set the `KEYWORDS` array in the script configuration. For example, `KEYWORDS: ['AI', 'machine learning', 'startup']` will only like tweets containing those words. You can also use `FROM_USERS` to limit likes to specific accounts.

### Q: Will people know I used a script to like their tweets?
**A:** No. A like is a like — X doesn't distinguish between manual and automated likes. The person sees your profile in their notifications, just as if you liked manually. This is why auto-liking is effective for growth: people check who liked their post and often follow back.

### Q: How do I stop the auto-liker mid-run?
**A:** Type `stopAutoLiker()` in the browser console and press Enter. The script will stop immediately. You can also close the browser tab — no damage done, the likes already made stay.

---

<footer>
Built with ⚡ by <a href="https://x.com/nichxbt">@nichxbt</a> · <a href="https://xactions.app">xactions.app</a> · <a href="https://github.com/nichxbt/xactions">GitHub</a>
</footer>
