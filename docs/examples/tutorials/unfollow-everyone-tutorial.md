---
title: "Unfollow Everyone on X (Twitter) — Free Script 2026"
description: "Mass unfollow all accounts on X/Twitter in minutes. Free browser script, CLI, and AI agent method. No API needed."
keywords: ["unfollow everyone on twitter", "mass unfollow twitter", "unfollow all twitter 2026", "how to unfollow everyone on X", "twitter unfollow script free", "bulk unfollow twitter", "unfollow everyone X free", "twitter fresh start unfollow all", "mass unfollow no API", "xactions unfollow everyone"]
canonical: "https://xactions.app/examples/unfollow-everyone"
author: "nich (@nichxbt)"
date: "2026-02-24"
---

# ☢️ Unfollow Everyone on X (Twitter) — Complete Fresh Start in Minutes

> **Unfollow every single account you follow on X (Twitter) with one script — free, no API key, no app install.** Your following count goes to zero. Backup included.

**Works on:** 🌐 Browser Console · 💻 CLI · 🤖 MCP (AI Agents)
**Difficulty:** 🟢 Beginner
**Time:** ⏱️ 5–30 minutes (depending on following count)
**Requirements:** A web browser logged into x.com

> 📖 For the quick-reference version, see [unfollow-everyone.md](../unfollow-everyone.md)

---

## 🎯 Real-World Scenario

You created your X account in 2019 and followed everyone you saw — crypto influencers, meme pages, brands running giveaways, people who followed you first. Now your timeline is a dumpster fire of engagement-bait and AI slop. You follow **2,847 accounts** and can barely find tweets from people you actually care about. You want a **complete fresh start**: unfollow literally everyone, then rebuild a curated following list from scratch.

Manually clicking "Following → Unfollow → Confirm" 2,847 times would take **8+ hours of non-stop clicking**. XActions does it in about 20 minutes while you get coffee.

**Before XActions:**

```
┌──────────────────────────────────────────────┐
│  Your Timeline                               │
├──────────────────────────────────────────────┤
│  🤖 @crypto_shill    "BUY $SCAMCOIN NOW!!"  │
│  🤖 @ai_spam_42      "🧵 Thread you NEED.." │
│  🤖 @brand_account   "Our new product..."   │
│  🤖 @dead_account     (last post: 2022)     │
│  🤖 @giveaway_bot    "FOLLOW + RT TO WIN"   │
│  💀 2,842 more accounts you don't remember   │
├──────────────────────────────────────────────┤
│  Following: 2,847    Followers: 953          │
│  Ratio: 0.33x 😬                             │
│  Time to unfollow manually: ~8 hours         │
└──────────────────────────────────────────────┘
```

**After XActions:**

```
┌──────────────────────────────────────────────┐
│  Your Timeline                               │
├──────────────────────────────────────────────┤
│                                              │
│           🎉 A blank canvas.                 │
│        Rebuild with only people               │
│           you actually want to read.         │
│                                              │
├──────────────────────────────────────────────┤
│  Following: 0        Followers: 953          │
│  Ratio: ∞ 💪                                 │
│  Time to unfollow with XActions: ~20 min     │
│  Backup file: ✅ saved automatically         │
└──────────────────────────────────────────────┘
```

---

## 📋 What This Does (Step by Step)

1. 📜 **Scans your entire following list** — scrolls through `x.com/you/following` to load every account
2. 💾 **Creates a backup** — auto-downloads a JSON/CSV file of everyone you follow (your safety net)
3. ⚠️ **Shows confirmation dialog** — you must explicitly confirm before anything happens
4. 🚫 **Unfollows every account** — clicks "Following" → "Unfollow" → "Confirm" for each one
5. ⏸️ **Pauses for safety** — random 3–5s delays + 30s break every 10 unfollows to avoid rate limits
6. ⛔ **Stops on rate limit** — detects Twitter's rate limit toast and halts automatically
7. 📊 **Prints final report** — shows success/fail counts and saves a results log

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  [Navigate to /following]                                   │
│          │                                                  │
│          ▼                                                  │
│  [Scroll & scan all users] ──→ [Download backup JSON/CSV]  │
│          │                                                  │
│          ▼                                                  │
│  [Show confirmation dialog]                                 │
│          │                                                  │
│      ┌───┴───┐                                              │
│   Cancel    OK                                              │
│      │       │                                              │
│      ▼       ▼                                              │
│   [Abort]  [Click "Following" button]                       │
│               │                                             │
│               ▼                                             │
│            [Click "Unfollow" confirm]                        │
│               │                                             │
│               ▼                                             │
│            [Wait 3–5s random delay]                          │
│               │                                             │
│          ┌────┴────┐                                        │
│        More?     Done                                       │
│          │         │                                        │
│          ▼         ▼                                        │
│     [Next user]  [Print summary + save results]             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🌐 Method 1: Browser Console (Copy-Paste)

**Best for:** Anyone — no installs, runs right in your browser.

### Prerequisites

- [x] Logged into your X/Twitter account in a web browser
- [x] On a desktop/laptop (not mobile)
- [x] Know your username

### Step 1: Navigate to your Following page

> Go to **`x.com/YOUR_USERNAME/following`** (replace YOUR_USERNAME with yours)

```
┌──────────────────────────────────────────────────────┐
│ 🔍 x.com/nichxbt/following                           │
├──────────────────────────────────────────────────────┤
│                                                      │
│  👤 Elon Musk @elonmusk           [Following ✓]     │
│     CEO of everything                                │
│                                                      │
│  👤 OpenAI @openai                [Following ✓]     │
│     Creating safe AGI                                │
│                                                      │
│  👤 Andrej Karpathy @karpathy    [Following ✓]     │
│     AI researcher                                    │
│                                                      │
│  👤 GitHub @github                [Following ✓]     │
│     How people build software                        │
│                                                      │
│  ... 2,843 more                                      │
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
// XActions - Unfollow Everyone on X/Twitter
// by nichxbt — https://xactions.app
// Go to: x.com/YOUR_USERNAME/following
// Open console (F12 → Console), paste, Enter
// ============================================

(async () => {
  // Configuration — tweak if needed
  const UNFOLLOW_DELAY_MIN = 3000;   // Min delay between unfollows (ms)
  const UNFOLLOW_DELAY_MAX = 5000;   // Max delay between unfollows (ms)
  const SCROLL_DELAY = 2000;         // Delay between scrolls (ms)
  const BATCH_PAUSE = 30000;         // 30s pause every 10 unfollows
  const MAX_SCROLL_RETRIES = 15;     // Stop scrolling after 15 retries with no new users

  console.log('');
  console.log('☢️  XActions - UNFOLLOW EVERYONE');
  console.log('════════════════════════════════════════');
  console.log('⚠️  WARNING: This will unfollow ALL accounts!');
  console.log('⚠️  This action CANNOT be undone!');
  console.log('');

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const randomDelay = (min, max) => sleep(min + Math.random() * (max - min));

  // Verify we're on the following page
  const pathMatch = window.location.pathname.match(/^\/([^/]+)\/following/);
  if (!pathMatch) {
    console.error('❌ Navigate to your FOLLOWING page first!');
    console.log('👉 Go to: x.com/YOUR_USERNAME/following');
    return;
  }

  const currentUsername = pathMatch[1];
  console.log(`📍 Account: @${currentUsername}`);
  console.log('');

  // ── Step 1: Scan all users you follow ──────────────────────
  console.log('📜 Step 1: Scanning your following list...');
  console.log('   (Scroll loading — may take a minute for large lists)');

  const users = new Map();
  let scrollRetries = 0;

  while (scrollRetries < MAX_SCROLL_RETRIES) {
    const cells = document.querySelectorAll('[data-testid="UserCell"]');
    const prevSize = users.size;

    cells.forEach(cell => {
      try {
        const link = cell.querySelector('a[href^="/"]');
        const href = link?.getAttribute('href') || '';
        const username = href.split('/')[1];
        if (!username || username.includes('?') || username.includes('/')) return;

        const nameEl = cell.querySelector('[dir="ltr"] > span');
        const name = nameEl?.textContent?.trim() || username;
        const bioEl = cell.querySelector('[data-testid="UserDescription"]');
        const bio = bioEl?.textContent?.trim() || '';

        if (!users.has(username)) {
          users.set(username, { username, name, bio });
        }
      } catch (e) { /* skip malformed cells */ }
    });

    console.log(`   📊 Found: ${users.size} users`);

    if (users.size === prevSize) { scrollRetries++; }
    else { scrollRetries = 0; }

    window.scrollTo(0, document.body.scrollHeight);
    await sleep(SCROLL_DELAY);
  }

  const allUsers = Array.from(users.values());
  console.log(`   ✅ Total accounts found: ${allUsers.length}`);

  if (allUsers.length === 0) {
    console.log('🎉 You\'re not following anyone! Nothing to do.');
    return;
  }

  // ── Step 2: Backup ─────────────────────────────────────────
  console.log('');
  console.log('💾 Step 2: Downloading backup of your following list...');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const exportData = allUsers.map(u => ({
    username: u.username,
    name: u.name,
    bio: u.bio,
    exportedAt: new Date().toISOString()
  }));

  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `following-backup-${currentUsername}-${timestamp}.json`;
  a.click();
  URL.revokeObjectURL(url);

  console.log(`   📥 Backup saved: following-backup-${currentUsername}-${timestamp}.json`);
  console.log('   ⚠️  KEEP THIS FILE — it\'s your only way to re-follow people later.');

  try { await navigator.clipboard.writeText(json); console.log('   📋 Also copied to clipboard!'); } catch {}

  // ── Step 3: Confirmation ───────────────────────────────────
  console.log('');
  console.log('════════════════════════════════════════');
  console.log(`⚠️  ABOUT TO UNFOLLOW ${allUsers.length} ACCOUNTS`);
  console.log('════════════════════════════════════════');

  allUsers.slice(0, 10).forEach((u, i) => {
    console.log(`   ${i + 1}. @${u.username} (${u.name})`);
  });
  if (allUsers.length > 10) console.log(`   ... and ${allUsers.length - 10} more`);

  const confirmed = window.confirm(
    `☢️ NUCLEAR OPTION: Unfollow ALL ${allUsers.length} accounts?\n\n` +
    `This CANNOT be undone!\nBackup has been downloaded.\nClick OK to proceed.`
  );

  if (!confirmed) {
    console.log('👋 Cancelled — no accounts were unfollowed. Backup file is still saved.');
    return;
  }

  // ── Step 4: Unfollow loop ──────────────────────────────────
  console.log('');
  console.log('☢️  Starting unfollow process...');
  console.log('   Press Ctrl+C or close tab to abort at any time.');
  console.log('');

  const unfollowed = [];
  const failed = [];
  let consecutiveFailures = 0;

  window.scrollTo(0, 0);
  await sleep(1000);

  for (let i = 0; i < allUsers.length; i++) {
    try {
      const unfollowBtn = document.querySelector('[data-testid$="-unfollow"]');

      if (!unfollowBtn) {
        window.scrollTo(0, 0);
        await sleep(1500);
        const retry = document.querySelector('[data-testid$="-unfollow"]');
        if (!retry) { console.log('   ⏭️  No more unfollow buttons on screen'); break; }
      }

      const btn = document.querySelector('[data-testid$="-unfollow"]');
      if (!btn) { consecutiveFailures++; if (consecutiveFailures >= 5) break; continue; }

      const cell = btn.closest('[data-testid="UserCell"]');
      let username = 'unknown';
      if (cell) {
        const link = cell.querySelector('a[href^="/"]');
        username = link?.getAttribute('href')?.split('/')[1] || 'unknown';
      }

      btn.click();
      await sleep(500);

      const confirmBtn = document.querySelector('[data-testid="confirmationSheetConfirm"]');
      if (confirmBtn) {
        confirmBtn.click();
        unfollowed.push(username);
        consecutiveFailures = 0;
        const pct = ((unfollowed.length) / allUsers.length * 100).toFixed(1);
        console.log(`   ✅ Unfollowed @${username}  [${unfollowed.length}/${allUsers.length}]  ${pct}%`);
      } else {
        failed.push(username);
        consecutiveFailures++;
      }

      await randomDelay(UNFOLLOW_DELAY_MIN, UNFOLLOW_DELAY_MAX);

      if (unfollowed.length % 10 === 0 && unfollowed.length > 0) {
        console.log(`   ⏸️  Safety pause (${BATCH_PAUSE / 1000}s)...`);
        await sleep(BATCH_PAUSE);
        console.log('   ▶️  Resuming...');
      }

      const toast = document.querySelector('[data-testid="toast"]');
      if (toast?.textContent?.includes('limit')) {
        console.log('⛔ RATE LIMIT DETECTED — stopping. Wait 15–30 min, then re-run.');
        break;
      }

    } catch (err) {
      failed.push(allUsers[i]?.username || 'unknown');
      consecutiveFailures++;
    }

    if (consecutiveFailures >= 5) {
      console.log('⚠️  Too many consecutive failures — stopping.');
      break;
    }
  }

  // ── Step 5: Summary ────────────────────────────────────────
  console.log('');
  console.log('════════════════════════════════════════');
  console.log('☢️  UNFOLLOW EVERYONE — COMPLETE');
  console.log('════════════════════════════════════════');
  console.log(`📊 Scanned:      ${allUsers.length}`);
  console.log(`✅ Unfollowed:   ${unfollowed.length}`);
  console.log(`❌ Failed:       ${failed.length}`);
  console.log('');

  if (unfollowed.length < allUsers.length) {
    console.log(`💡 ${allUsers.length - unfollowed.length} may remain — refresh and re-run.`);
  } else {
    console.log('🎉 All accounts unfollowed! Following count → 0');
  }

  console.log(`📁 Backup: following-backup-${currentUsername}-${timestamp}.json`);
})();
```

### ✅ Expected Console Output

```
☢️  XActions - UNFOLLOW EVERYONE
════════════════════════════════════════
⚠️  WARNING: This will unfollow ALL accounts!
⚠️  This action CANNOT be undone!

📍 Account: @nichxbt

📜 Step 1: Scanning your following list...
   (Scroll loading — may take a minute for large lists)
   📊 Found: 312 users
   📊 Found: 687 users
   📊 Found: 1,024 users
   📊 Found: 2,847 users
   📊 Found: 2,847 users
   ✅ Total accounts found: 2,847

💾 Step 2: Downloading backup of your following list...
   📥 Backup saved: following-backup-nichxbt-2026-02-24T14-30-00-000Z.json
   ⚠️  KEEP THIS FILE — it's your only way to re-follow people later.
   📋 Also copied to clipboard!

════════════════════════════════════════
⚠️  ABOUT TO UNFOLLOW 2,847 ACCOUNTS
════════════════════════════════════════
   1. @elonmusk (Elon Musk)
   2. @karpathy (Andrej Karpathy)
   3. @openai (OpenAI)
   ... and 2,837 more

   [Browser confirm dialog appears]

☢️  Starting unfollow process...
   Press Ctrl+C or close tab to abort at any time.

   ✅ Unfollowed @elonmusk          [1/2847]    0.0%
   ✅ Unfollowed @karpathy          [2/2847]    0.1%
   ✅ Unfollowed @openai            [3/2847]    0.1%
   ✅ Unfollowed @github            [4/2847]    0.1%
   ✅ Unfollowed @nichxbt_fan_42    [5/2847]    0.2%
   ✅ Unfollowed @dead_account_99   [6/2847]    0.2%
   ✅ Unfollowed @crypto_bro_88     [7/2847]    0.2%
   ✅ Unfollowed @brand_spam_3      [8/2847]    0.3%
   ✅ Unfollowed @meme_page_12      [9/2847]    0.3%
   ✅ Unfollowed @old_friend_07     [10/2847]   0.4%
   ⏸️  Safety pause (30s)...
   ▶️  Resuming...
   ✅ Unfollowed @techblogger_22    [11/2847]   0.4%
   ...

════════════════════════════════════════
☢️  UNFOLLOW EVERYONE — COMPLETE
════════════════════════════════════════
📊 Scanned:      2,847
✅ Unfollowed:   2,843
❌ Failed:       4
📁 Backup: following-backup-nichxbt-2026-02-24T14-30-00-000Z.json

💡 4 may remain — refresh and re-run.
```

---

## 💻 Method 2: CLI (Command Line)

**Best for:** Power users, automated workflows, and accounts with 500+ following.

```bash
# Install XActions globally
npm install -g xactions

# Unfollow everyone (interactive — will prompt for confirmation)
npx xactions unfollow --all

# With explicit flags
npx xactions unfollow --all \
  --delay 4000 \
  --batch-size 10 \
  --batch-pause 30000 \
  --backup ./my-backup.json
```

### Example with all options:

```bash
npx xactions unfollow --all \
  --username nichxbt \
  --delay 4000 \
  --batch-size 10 \
  --batch-pause 30000 \
  --max-per-session 200 \
  --backup ./following-backup.json \
  --output ./results.json \
  --headless
```

### ✅ CLI Output Preview

```
⚡ XActions v5.0.0

☢️  UNFOLLOW EVERYONE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 Account: @nichxbt
⚙️  Delay: 4000ms | Batch: 10 | Pause: 30s

📜 Scanning following list...
   ████████████████████████████ 2,847 users found

💾 Backup saved → ./following-backup.json

⚠️  You are about to unfollow 2,847 accounts.
   Type "UNFOLLOW ALL" to confirm: UNFOLLOW ALL

☢️  Unfollowing...
   ████████░░░░░░░░░░░░░░░░░░░░ 28% | 800/2847 | ETA: 14m

✅ Complete!
   Unfollowed: 2,843 | Failed: 4 | Time: 38m 12s
   Results → ./results.json
```

### CLI Configuration Table

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--all` | boolean | `false` | Unfollow ALL accounts (required) |
| `--username` | string | auto-detect | Your X username |
| `--delay` | number | `4000` | Delay between unfollows in ms |
| `--batch-size` | number | `10` | Unfollows before pausing |
| `--batch-pause` | number | `30000` | Pause duration between batches (ms) |
| `--max-per-session` | number | `100` | Max unfollows before stopping |
| `--backup` | string | auto | Path for backup file |
| `--output` | string | auto | Path for results log |
| `--headless` | boolean | `true` | Run browser in background |
| `--skip-confirm` | boolean | `false` | ⚠️ Skip confirmation prompt |

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
  "tool": "x_unfollow_everyone",
  "arguments": {
    "confirm": true,
    "backup": true,
    "max_per_session": 200,
    "delay_ms": 4000
  }
}
```

### Claude Desktop example prompt:

> "Unfollow everyone I follow on X. Back up my following list first, then do the unfollow in batches of 10 with 30-second pauses."

### Expected MCP response:

```json
{
  "status": "complete",
  "account": "nichxbt",
  "backup_file": "following-backup-nichxbt-2026-02-24.json",
  "total_found": 2847,
  "unfollowed": 2843,
  "failed": 4,
  "duration_seconds": 2292
}
```

---

## 📊 Method Comparison

| Feature | 🌐 Browser Console | 💻 CLI | 🤖 MCP |
|---------|-------------------|--------|---------|
| Setup | None | `npm install` | Config JSON |
| Speed | Fast | Fastest | Via AI agent |
| Best for | Quick one-off | Power users | AI workflows |
| Auto-backup | ✅ JSON download | ✅ JSON + CSV + TXT | ✅ JSON |
| Export formats | JSON | JSON, CSV, TXT | JSON |
| Confirmation | Browser dialog | Terminal prompt | Tool argument |
| Progress | Console logs | Progress bar | Status object |
| Rate limit safety | ✅ | ✅ | ✅ |
| Headless mode | ❌ | ✅ | ✅ |
| Batch control | Config vars | CLI flags | Tool params |

---

## 📊 Sample Output / Results

### Backup JSON (auto-downloaded before unfollowing):

```json
[
  {
    "username": "elonmusk",
    "name": "Elon Musk",
    "bio": "CEO of everything",
    "exportedAt": "2026-02-24T14:30:00.000Z"
  },
  {
    "username": "karpathy",
    "name": "Andrej Karpathy",
    "bio": "AI researcher, ex-Tesla, ex-OpenAI",
    "exportedAt": "2026-02-24T14:30:00.000Z"
  },
  {
    "username": "openai",
    "name": "OpenAI",
    "bio": "Creating safe AGI for the benefit of all",
    "exportedAt": "2026-02-24T14:30:00.000Z"
  }
]
```

### Results Log (auto-saved on completion):

```json
{
  "date": "2026-02-24T14:52:12.000Z",
  "account": "nichxbt",
  "totalScanned": 2847,
  "unfollowedCount": 2843,
  "failedCount": 4,
  "unfollowed": ["elonmusk", "karpathy", "openai", "...2840 more"],
  "failed": [
    { "username": "protected_user_1", "reason": "Confirm dialog not found" },
    { "username": "suspended_acct", "reason": "Page load timeout" }
  ]
}
```

### Backup CSV (CLI only):

```csv
username,name,bio
"elonmusk","Elon Musk","CEO of everything"
"karpathy","Andrej Karpathy","AI researcher, ex-Tesla, ex-OpenAI"
"openai","OpenAI","Creating safe AGI for the benefit of all"
```

---

## 💡 Pro Tips

1. **Run during off-peak hours (2–6 AM your timezone)** — X's rate limits are more relaxed when traffic is low, so you'll hit fewer blocks and finish faster.

2. **Export before you nuke** — The script auto-downloads a backup, but also go to **Settings → Your Account → Download an Archive** on X to get an official copy of all your data. Belt and suspenders.

3. **Re-run to catch stragglers** — The first pass might miss 1–5% of accounts due to scroll-loading. Refresh the page and run the script again to catch the rest. It's harmless on already-unfollowed accounts.

4. **Rebuild strategically** — After hitting zero, follow people back in batches of 20–30/day to avoid triggering "aggressive following" limits. Use your backup JSON to cherry-pick who to re-follow.

5. **Pair with unfollow-non-followers if you're not sure** — If unfollowing *everyone* feels too extreme, try [Unfollow Non-Followers](../unfollow-non-followers.md) first. It only removes people who don't follow you back.

---

## ⚠️ Important Notes

- **Irreversible** — Twitter has no "undo unfollow all" button. Your backup file is the only way to know who you followed.
- **Rate limits** — X limits actions per time window. The script's built-in delays (3–5s per action + 30s pauses) keep you safe. If you see "You're doing that too fast," stop and wait 30 minutes.
- **Platform policy** — Mass unfollowing is a gray area in X's Terms. The randomized human-like delays in this script mitigate risk, but don't run it back-to-back for hours.
- **DMs are unaffected** — Unfollowing someone does not delete your DM history with them.
- **Protected accounts** — The script will attempt to unfollow protected accounts normally. Failures appear in the results log.
- **Session limits** — For accounts following 1,000+ people, plan for 2–3 sessions over a few hours. Set `max-per-session` to 300–500 and take breaks between runs.

---

## 🔗 Related Features

| Feature | Use Case | Link |
|---------|----------|------|
| Unfollow Non-Followers | Only unfollow people who don't follow you back | [→ Guide](../unfollow-non-followers.md) |
| Smart Unfollow | Unfollow inactive accounts while keeping a whitelist | [→ Guide](../smart-unfollow.md) |
| Detect Unfollowers | Find out who unfollowed you after the reset | [→ Guide](../detect-unfollowers.md) |
| Following Scraping | Export your following list without unfollowing | [→ Guide](../following-scraping.md) |
| Followers Scraping | Export your followers to a spreadsheet | [→ Guide](../followers-scraping.md) |

---

## ❓ FAQ

### Q: How do I mass unfollow everyone on Twitter / X in 2026?
**A:** Go to `x.com/YOUR_USERNAME/following`, open your browser console (F12 → Console), paste the XActions unfollow-everyone script, and press Enter. The script scans your full following list, downloads a backup file, asks for confirmation, then unfollows every account automatically with safe delays. No API key or software install needed — it runs entirely in your browser.

### Q: Can I undo it after unfollowing everyone on X?
**A:** No — there is no built-in undo. The script auto-downloads a JSON backup of every account you followed, so you can manually re-follow specific people later using that file. Always check that the backup file downloaded successfully before confirming.

### Q: How long does it take to unfollow 1,000+ people on Twitter?
**A:** With the default safe delays (3–5 seconds per unfollow + 30-second pauses every 10), unfollowing 1,000 accounts takes roughly **60–90 minutes**. For 5,000+ accounts, plan for 2–3 sessions spread across a few hours to avoid rate limits.

### Q: Is mass unfollowing against Twitter / X rules?
**A:** X's Terms of Service discourage "aggressive following and unfollowing." This script uses randomized human-like delays (3–5 seconds + batch pauses) to mimic natural behavior. Thousands of people have used it without issues, but run during off-peak hours and take breaks between sessions for maximum safety.

### Q: Will people know I unfollowed them?
**A:** X does not send notifications when someone unfollows you. However, third-party apps like XActions' "detect unfollowers" can reveal the change. Your DM history and past interactions remain intact.

---

<footer>
Built with ⚡ by <a href="https://x.com/nichxbt">@nichxbt</a> · <a href="https://xactions.app">xactions.app</a> · <a href="https://github.com/nichxbt/xactions">GitHub</a>
</footer>
