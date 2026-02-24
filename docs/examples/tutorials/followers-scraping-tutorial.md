---
title: "Scrape Twitter Followers to CSV — Free No-API Tool 2026"
description: "Export any X/Twitter account's followers list to CSV or JSON. Free browser script — no API key, no app. Includes username, bio, verified status."
keywords: ["scrape twitter followers", "export twitter followers to csv", "twitter followers list download", "scrape X followers 2026", "twitter follower export free no API", "download twitter followers list", "twitter followers to spreadsheet", "scrape followers no API twitter", "twitter followers json export", "xactions followers scraping"]
canonical: "https://xactions.app/examples/followers-scraping"
author: "nich (@nichxbt)"
date: "2026-02-24"
---

# 👥 Scrape X (Twitter) Followers to CSV/JSON — Free, No API

> **Export any public account's full followers list on X (Twitter) to a CSV or JSON file — free, no API key, no paid tools.** Get usernames, display names, bios, verified status, and more.

**Works on:** 🌐 Browser Console · 💻 CLI · 🤖 MCP (AI Agents)
**Difficulty:** 🟢 Beginner
**Time:** ⏱️ 2–20 minutes (depends on follower count)
**Requirements:** A web browser logged into x.com

> 📖 For the quick-reference version, see [followers-scraping.md](../followers-scraping.md)

---

## 🎯 Real-World Scenario

You run a SaaS startup and your competitor `@rival_app` has **12,000 followers**. Your marketing team wants a spreadsheet of those followers — usernames, bios, and verified status — so they can identify influencers to reach out to, find common audience segments, and build targeted ad lookalike audiences. Twitter's API costs $100/month and has strict rate limits. Third-party scraping services charge per 1,000 followers.

XActions scrapes the followers page directly from the browser DOM, collecting everything visible in each `UserCell` — then exports it all as a clean CSV you can open in Google Sheets, Excel, or import into your CRM. Zero cost, zero API credentials.

**Before XActions:**

```
┌─────────────────────────────────────────────────────┐
│  Your options for exporting followers               │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Option 1: Twitter API ($100/mo Basic)              │
│    → Apply for developer access                     │
│    → Wait 1-3 days for approval                     │
│    → Rate limit: 15 requests / 15 min               │
│    → Parse JSON responses yourself                  │
│                                                     │
│  Option 2: Paid scraping tools ($20-50/mo)          │
│    → Phantombuster, Apify, etc.                     │
│    → Limited credits per month                      │
│    → Share your auth tokens with third party        │
│                                                     │
│  Option 3: Manual copy-paste (😩)                    │
│    → Scroll, screenshot, type...                    │
│    → 12,000 followers = 3 weeks of your life        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**After XActions:**

```
┌─────────────────────────────────────────────────────┐
│  ✅ Paste script → Wait → Download CSV              │
├─────────────────────────────────────────────────────┤
│                                                     │
│  📁 rival_app_followers_2026-02-24.csv              │
│  ┌────────────────────────────────────────────┐     │
│  │ Handle    │ Name      │ Bio       │ Verified│    │
│  │ @alice    │ Alice C.  │ AI dev    │ true   │     │
│  │ @bob_k    │ Bob K     │ Web3     │ false  │     │
│  │ @carol_m  │ Carol M.  │ PM @Meta │ true   │     │
│  │ ... 4,997 more rows                        │    │
│  └────────────────────────────────────────────┘     │
│                                                     │
│  📊 Total: 5,000 followers exported                 │
│  ✓ Verified accounts: 347                           │
│  ✓ With bios: 3,812                                 │
│  ⏱️ Time: 8 minutes                                 │
│  💰 Cost: $0                                        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 📋 What This Does (Step by Step)

1. 📜 **Navigates to the followers page** — reads `x.com/username/followers`
2. 🔄 **Scrolls to load all user cells** — X lazy-loads followers in batches; the script scrolls repeatedly
3. 🔍 **Extracts data from each `UserCell`** — username, display name, bio, verified status, avatar URL, "Follows you" badge
4. 🗂️ **Deduplicates** — uses a `Map` keyed by username to avoid counting the same person twice
5. 📊 **Shows progress** — logs the running total as it scrolls
6. 💾 **Downloads JSON + CSV** — auto-triggers a browser download for both formats
7. 📋 **Copies to clipboard** — paste directly into Google Sheets if you prefer

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  [Navigate to x.com/target/followers]                    │
│          │                                               │
│          ▼                                               │
│  [Read all visible UserCell elements]                    │
│          │                                               │
│          ▼                                               │
│  [Extract: username, name, bio, verified, avatar]        │
│          │                                               │
│          ▼                                               │
│  [Add to Map (dedup by username)]                        │
│          │                                               │
│          ▼                                               │
│  [Scroll down to load more]                              │
│          │                                               │
│     ┌────┴────┐                                          │
│   New users?  No new users                               │
│     │          │                                         │
│     ▼          ▼                                         │
│  [Continue]  [Retry up to 5 times]                       │
│                │                                         │
│                ▼                                         │
│          [Done scrolling]                                │
│                │                                         │
│                ▼                                         │
│  [Download JSON + CSV + copy to clipboard]               │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 🌐 Method 1: Browser Console (Copy-Paste)

**Best for:** Quick exports of up to ~5,000 followers. No setup needed.

### Prerequisites

- [x] Logged into X/Twitter in your browser
- [x] On desktop/laptop
- [x] Know the username of the account you want to scrape

### Step 1: Navigate to the Followers page

> Go to **`x.com/TARGET_USERNAME/followers`** — this works on any public account, not just yours.

```
┌────────────────────────────────────────────────────┐
│ 🔍 x.com/rival_app/followers                       │
├────────────────────────────────────────────────────┤
│                                                    │
│  👤 Alice Chen @alice_dev        ✓ Verified        │
│     AI researcher | Building cool things           │
│                                                    │
│  👤 Bob K @bob_web3                                │
│     Web3 developer | Ethereum                      │
│                                                    │
│  👤 Carol M @carol_pm            ✓ Verified        │
│     Product Manager @Meta                          │
│                                                    │
│  ... 11,997 more                                   │
│                                                    │
└────────────────────────────────────────────────────┘
```

### Step 2: Open Developer Console

| OS | Shortcut |
|----|----------|
| **Windows / Linux** | `F12` then **Console** tab, or `Ctrl + Shift + J` |
| **Mac** | `Cmd + Option + J` |

### Step 3: Paste and Run

```javascript
// ============================================
// XActions - Followers Scraper for X/Twitter
// by nichxbt — https://xactions.app
// Go to: x.com/TARGET_USERNAME/followers
// Open console (F12 → Console), paste, Enter
// ============================================

(async () => {
  const CONFIG = {
    MAX_FOLLOWERS: 5000,     // Max followers to scrape
    SCROLL_DELAY: 1500,      // Delay between scrolls (ms)
    FORMAT: 'both',          // 'json', 'csv', or 'both'
  };

  console.log('');
  console.log('👥 XActions - FOLLOWERS SCRAPER');
  console.log('════════════════════════════════════════');

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // Verify page
  if (!window.location.pathname.includes('/followers')) {
    console.error('❌ Navigate to a followers page first!');
    console.log('👉 Go to: x.com/USERNAME/followers');
    return;
  }

  const username = window.location.pathname.split('/')[1];
  console.log(`📍 Target: @${username}/followers`);
  console.log(`⚙️  Max: ${CONFIG.MAX_FOLLOWERS} | Format: ${CONFIG.FORMAT}`);
  console.log('');

  const download = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const extractUser = (cell) => {
    try {
      const link = cell.querySelector('a[href^="/"]');
      const href = link?.getAttribute('href') || '';
      const handle = href.replace('/', '').split('/')[0];
      if (!handle || handle.includes('?')) return null;

      const nameEl = cell.querySelector('[dir="ltr"] > span');
      const bioEl = cell.querySelector('[data-testid="UserDescription"]');
      const followsYou = !!cell.querySelector('[data-testid="userFollowIndicator"]');
      const verified = !!cell.querySelector('svg[aria-label*="Verified"]');
      const avatarEl = cell.querySelector('img[src*="profile_images"]');

      return {
        handle,
        displayName: nameEl?.textContent?.trim() || '',
        bio: bioEl?.textContent?.trim() || '',
        followsYou,
        verified,
        avatar: avatarEl?.src || '',
        profileUrl: `https://x.com/${handle}`,
      };
    } catch (e) { return null; }
  };

  // ── Scraping loop ──────────────────────────────────────
  console.log('📜 Scanning followers list...');

  const followers = new Map();
  let noNewCount = 0;
  let scrolls = 0;

  while (followers.size < CONFIG.MAX_FOLLOWERS && noNewCount < 5) {
    const cells = document.querySelectorAll('[data-testid="UserCell"]');
    const before = followers.size;

    cells.forEach(cell => {
      const user = extractUser(cell);
      if (user && user.handle && !followers.has(user.handle)) {
        followers.set(user.handle, user);
      }
    });

    const added = followers.size - before;
    if (added > 0) {
      console.log(`   👥 Collected: ${followers.size} followers`);
      noNewCount = 0;
    } else {
      noNewCount++;
    }

    window.scrollBy(0, 800);
    await sleep(CONFIG.SCROLL_DELAY);
    scrolls++;
    if (scrolls > 300) break;
  }

  const result = Array.from(followers.values());
  const ts = Date.now();

  // ── Summary ────────────────────────────────────────────
  console.log('');
  console.log('════════════════════════════════════════');
  console.log(`👥 SCRAPED ${result.length} FOLLOWERS`);
  console.log('════════════════════════════════════════');
  console.log(`   ✓ Verified:       ${result.filter(u => u.verified).length}`);
  console.log(`   ✓ With bio:       ${result.filter(u => u.bio).length}`);
  console.log(`   ✓ Follows you:    ${result.filter(u => u.followsYou).length}`);
  console.log('');

  // Preview
  console.log('📋 Preview (first 5):');
  result.slice(0, 5).forEach((f, i) => {
    console.log(`   ${i + 1}. @${f.handle} ${f.verified ? '✓' : ''} — ${f.displayName}`);
  });
  if (result.length > 5) console.log(`   ... and ${result.length - 5} more`);

  // ── Download JSON ──────────────────────────────────────
  if (CONFIG.FORMAT === 'json' || CONFIG.FORMAT === 'both') {
    const json = JSON.stringify(result, null, 2);
    download(json, `${username}_followers_${ts}.json`, 'application/json');
    console.log('');
    console.log(`💾 Downloaded: ${username}_followers_${ts}.json`);
  }

  // ── Download CSV ───────────────────────────────────────
  if (CONFIG.FORMAT === 'csv' || CONFIG.FORMAT === 'both') {
    const csv = [
      'Handle,DisplayName,Bio,Verified,FollowsYou,ProfileURL',
      ...result.map(f =>
        `"@${f.handle}","${f.displayName.replace(/"/g, '""')}","${f.bio.replace(/"/g, '""').replace(/\n/g, ' ')}",${f.verified},${f.followsYou},"${f.profileUrl}"`
      )
    ].join('\n');
    download(csv, `${username}_followers_${ts}.csv`, 'text/csv');
    console.log(`💾 Downloaded: ${username}_followers_${ts}.csv`);
  }

  // ── Clipboard ──────────────────────────────────────────
  try {
    await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    console.log('📋 JSON copied to clipboard!');
  } catch {}

  // Store globally
  window.scrapedFollowers = result;
  console.log('');
  console.log('════════════════════════════════════════');
  console.log('💾 Access data: window.scrapedFollowers');
  console.log('════════════════════════════════════════');
})();
```

### ✅ Expected Console Output

```
👥 XActions - FOLLOWERS SCRAPER
════════════════════════════════════════
📍 Target: @rival_app/followers
⚙️  Max: 5000 | Format: both

📜 Scanning followers list...
   👥 Collected: 48 followers
   👥 Collected: 124 followers
   👥 Collected: 287 followers
   👥 Collected: 512 followers
   👥 Collected: 1,024 followers
   👥 Collected: 2,198 followers
   👥 Collected: 3,456 followers
   👥 Collected: 4,891 followers
   👥 Collected: 5,000 followers

════════════════════════════════════════
👥 SCRAPED 5,000 FOLLOWERS
════════════════════════════════════════
   ✓ Verified:       347
   ✓ With bio:       3,812
   ✓ Follows you:    89

📋 Preview (first 5):
   1. @alice_dev ✓ — Alice Chen
   2. @bob_web3 — Bob K
   3. @carol_pm ✓ — Carol Martinez
   4. @dave_startup — Dave Wilson
   5. @eve_design — Eve Thompson
   ... and 4,995 more

💾 Downloaded: rival_app_followers_1740412800000.json
💾 Downloaded: rival_app_followers_1740412800000.csv
📋 JSON copied to clipboard!

════════════════════════════════════════
💾 Access data: window.scrapedFollowers
════════════════════════════════════════
```

Two files land in your downloads folder, ready for Google Sheets or Excel.

---

## 💻 Method 2: CLI (Command Line)

**Best for:** Scraping large accounts (5,000+), batch jobs, automation pipelines.

```bash
# Install XActions globally
npm install -g xactions

# Scrape followers (basic)
npx xactions scrape followers rival_app

# Scrape with options
npx xactions scrape followers rival_app \
  --limit 10000 \
  --format csv \
  --output ./data/rival-followers.csv
```

### Example with all options:

```bash
npx xactions scrape followers rival_app \
  --limit 10000 \
  --format both \
  --output ./exports/ \
  --scroll-delay 2000 \
  --headless \
  --auth-token "YOUR_AUTH_TOKEN"
```

### ✅ CLI Output Preview

```
⚡ XActions v2.4.0

👥 FOLLOWERS SCRAPER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Target: @rival_app
📊 Limit: 10,000

📜 Scraping...
   ████████████████████████████ 100% | 10,000/10,000

📊 Summary:
   Total: 10,000
   Verified: 892
   With bio: 7,634

💾 Saved → ./exports/rival_app-followers-2026-02-24.json
💾 Saved → ./exports/rival_app-followers-2026-02-24.csv

📋 Sample:
   @alice_dev ✓ — Alice Chen
   @bob_web3 — Bob K
   @carol_pm ✓ — Carol Martinez
```

### CLI Configuration Table

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--limit` | number | `1000` | Max followers to scrape |
| `--format` | string | `both` | Output: `json`, `csv`, or `both` |
| `--output` | string | `./` | Output directory or file path |
| `--scroll-delay` | number | `1500` | Delay between scrolls (ms) |
| `--headless` | boolean | `true` | Run browser in background |
| `--auth-token` | string | — | X auth cookie (for private accounts you follow) |

---

## 🤖 Method 3: MCP Server (AI Agents)

> Use with Claude Desktop, GPT, Cursor, or any MCP-compatible AI agent.

### Setup

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
  "tool": "x_scrape_followers",
  "arguments": {
    "username": "rival_app",
    "limit": 5000,
    "format": "json"
  }
}
```

### Claude Desktop example prompt:

> "Scrape the first 5,000 followers of @rival_app on X and export them to a CSV with usernames, bios, and verified status."

### Expected MCP response:

```json
{
  "status": "complete",
  "target": "rival_app",
  "followers_scraped": 5000,
  "verified_count": 347,
  "with_bio_count": 3812,
  "export_file": "rival_app-followers-2026-02-24.json",
  "sample": [
    { "username": "alice_dev", "name": "Alice Chen", "verified": true },
    { "username": "bob_web3", "name": "Bob K", "verified": false }
  ]
}
```

---

## 📊 Method Comparison

| Feature | 🌐 Browser Console | 💻 CLI | 🤖 MCP |
|---------|-------------------|--------|---------|
| Setup | None | `npm install` | Config JSON |
| Best for | Quick grabs (<5K) | Large scrapes | AI workflows |
| Export: JSON | ✅ | ✅ | ✅ |
| Export: CSV | ✅ | ✅ | ✅ |
| Clipboard copy | ✅ | ❌ | ❌ |
| Batch scraping | ❌ | ✅ | ✅ |
| Progress bar | Console logs | ASCII progress bar | Status object |
| Auth token support | N/A (uses session) | ✅ | ✅ |
| Max practical limit | ~5,000 | ~50,000 | ~50,000 |

---

## ⚙️ Configuration Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `MAX_FOLLOWERS` | number | `5000` | Maximum followers to collect before stopping |
| `SCROLL_DELAY` | number | `1500` | Milliseconds between scroll actions |
| `FORMAT` | string | `'both'` | Export format: `'json'`, `'csv'`, or `'both'` |

---

## 📊 Sample Output / Results

### JSON Export:

```json
[
  {
    "handle": "alice_dev",
    "displayName": "Alice Chen",
    "bio": "AI researcher | Building cool things | @Stanford",
    "verified": true,
    "followsYou": false,
    "avatar": "https://pbs.twimg.com/profile_images/.../photo.jpg",
    "profileUrl": "https://x.com/alice_dev"
  },
  {
    "handle": "bob_web3",
    "displayName": "Bob K",
    "bio": "Web3 developer. Ethereum maxi. Building the future.",
    "verified": false,
    "followsYou": true,
    "avatar": "https://pbs.twimg.com/profile_images/.../photo.jpg",
    "profileUrl": "https://x.com/bob_web3"
  }
]
```

### CSV Export (opens directly in Excel/Google Sheets):

```csv
Handle,DisplayName,Bio,Verified,FollowsYou,ProfileURL
"@alice_dev","Alice Chen","AI researcher | Building cool things | @Stanford",true,false,"https://x.com/alice_dev"
"@bob_web3","Bob K","Web3 developer. Ethereum maxi. Building the future.",false,true,"https://x.com/bob_web3"
"@carol_pm","Carol Martinez","Product Manager @Meta | Ex-Google | Building for 1B users",true,false,"https://x.com/carol_pm"
```

### What you can do with this data:

```
┌───────────────────────────────────────────────────────┐
│  Import CSV into...                                   │
├───────────────────────────────────────────────────────┤
│                                                       │
│  📊 Google Sheets → Filter, sort, analyze             │
│  📧 CRM (HubSpot, etc.) → Import as leads            │
│  📣 Ad platforms → Build lookalike audiences           │
│  🤖 Python/Pandas → Data analysis                     │
│  📋 Notion database → Track outreach                  │
│  📈 Spreadsheet → Pivot table by verified/bio         │
│                                                       │
└───────────────────────────────────────────────────────┘
```

---

## 💡 Pro Tips

1. **Scrape your own followers too** — Compare your followers list with a competitor's to find overlap. Shared followers = your warmest prospects for engagement.

2. **Filter the CSV in Google Sheets for high-value accounts** — Sort by `Verified = true` to find influencers, or filter bios containing keywords like "founder," "CEO," "investor" for targeted outreach.

3. **Increase `MAX_FOLLOWERS` for bigger accounts** — The default 5,000 limit keeps things fast. For massive accounts, bump it to 10,000–50,000 and use the CLI version for better performance and progress tracking.

4. **Run weekly for growth tracking** — Export followers periodically, then use the "Compare Followers Over Time" pattern to track audience growth and churn trends.

5. **Combine with `followsYou` data** — The script captures whether each follower also follows you. Filter `followsYou: true` to find your mutual connections within someone else's audience.

---

## ⚠️ Important Notes

- **Public accounts only (browser method)** — The browser script reads what's visible on your screen. For private accounts, you need to follow them first. The CLI method supports auth tokens for authenticated scraping.
- **X limits scroll loading** — Twitter's infinite scroll eventually stops loading new users. For accounts with 100K+ followers, the practical limit is around 10,000–50,000 per session.
- **Respect privacy and terms** — Scraping public data is common practice, but don't use the data for spam, harassment, or unauthorized commercial purposes.
- **Rate of scraping** — The script only scrolls the page (no API calls), so there's minimal rate-limit risk. However, don't scrape the same account repeatedly in a short window.
- **Data freshness** — The export reflects the followers list at the moment you scrape. Follower counts change constantly.

### Performance estimates:

| Follower count | Browser time | CLI time |
|---------------|-------------|----------|
| 500 | ~2 min | ~1.5 min |
| 1,000 | ~4 min | ~3 min |
| 5,000 | ~15 min | ~10 min |
| 10,000 | ~30 min | ~20 min |

---

## 🔗 Related Features

| Feature | Use Case | Link |
|---------|----------|------|
| Following Scraping | Export who someone follows (not followers) | [→ Guide](../following-scraping.md) |
| Profile Scraping | Get detailed info on a single profile | [→ Guide](../profile-scraping.md) |
| Detect Unfollowers | Compare follower snapshots to find who left | [→ Guide](../detect-unfollowers.md) |
| Follow Target Followers | Auto-follow a competitor's followers | [→ Guide](../follow-target-followers.md) |
| Engagement Analytics | Analyze your tweet performance | [→ Guide](../engagement-analytics.md) |
| Audit Followers | Detect bot/fake accounts in your followers | Coming soon |

---

## ❓ FAQ

### Q: How do I scrape Twitter followers without the API?
**A:** Go to `x.com/USERNAME/followers` in your browser, open the console (F12 → Console), and paste the XActions followers scraper script. It scrolls through the followers list, extracts data from each user card, and downloads a CSV + JSON file — all without any API credentials, app registration, or paid tools.

### Q: Can I export someone else's followers, not just my own?
**A:** Yes — navigate to any **public** account's followers page (`x.com/THEIR_USERNAME/followers`) and run the script. It works on any public profile. For private/protected accounts, you need to be an approved follower.

### Q: What data fields are included in the export?
**A:** Each follower entry includes: **username** (handle), **display name**, **bio/description**, **verified status** (blue check), **"Follows you" status**, **avatar URL**, and **profile URL**. The CSV opens directly in Excel or Google Sheets with proper column headers.

### Q: How many followers can I scrape at once?
**A:** The browser script works well up to about **5,000 followers**. For larger accounts, use the CLI version which handles up to **50,000** with better memory management and progress tracking. X's infinite scroll eventually caps, so extremely large accounts (1M+) can only be partially scraped.

### Q: Is scraping Twitter followers legal?
**A:** Scraping publicly available data is generally legal in most jurisdictions (see the US Ninth Circuit ruling in *hiQ v. LinkedIn*). However, respect X's Terms of Service — avoid excessive scraping, don't use data for spam, and be mindful of privacy regulations like GDPR if handling EU user data.

---

<footer>
Built with ⚡ by <a href="https://x.com/nichxbt">@nichxbt</a> · <a href="https://xactions.app">xactions.app</a> · <a href="https://github.com/nichxbt/xactions">GitHub</a>
</footer>
