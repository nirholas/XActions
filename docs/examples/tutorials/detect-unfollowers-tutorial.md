---
title: "Who Unfollowed Me on X (Twitter) — Free Tracker 2026"
description: "Find out exactly who unfollowed you on X/Twitter. Free browser script — no app, no API. Tracks new followers too."
keywords: ["who unfollowed me on twitter", "detect unfollowers twitter", "twitter unfollower tracker free", "who unfollowed me X 2026", "see who unfollowed you twitter", "track unfollowers twitter free", "twitter follower changes", "find who unfollowed X", "check unfollowers twitter no app", "xactions detect unfollowers"]
canonical: "https://xactions.app/examples/detect-unfollowers"
author: "nich (@nichxbt)"
date: "2026-02-24"
---

# 🔍 Who Unfollowed Me on X (Twitter) — Free Unfollower Tracker

> **Find out exactly who unfollowed you on X (Twitter) — free, no app download, no API key.** Takes a snapshot of your followers, then compares on the next run to reveal who left and who's new.

**Works on:** 🌐 Browser Console · 💻 CLI · 🤖 MCP (AI Agents)
**Difficulty:** 🟢 Beginner
**Time:** ⏱️ 2–5 minutes per scan
**Requirements:** A web browser logged into x.com

> 📖 For the quick-reference version, see [detect-unfollowers.md](../detect-unfollowers.md)

---

## 🎯 Real-World Scenario

You posted a hot take last Friday. It got 200 likes — but your follower count dropped from **1,247 to 1,239**. Eight people unfollowed you. Who were they? Was it that brand you were pitching? Your ex-colleague? Random bots? X doesn't tell you. Third-party "unfollower tracker" apps want your login credentials (sketchy) or charge $5/month for something that should take 30 seconds.

XActions solves this with a two-run workflow: **Run 1** saves a snapshot of your followers to `localStorage`. **Run 2** (hours or days later) compares the new list against the old one and tells you exactly who left and who joined. No app install, no login sharing, no fees.

**Before XActions:**

```
┌─────────────────────────────────────────────────────┐
│  Your follower count: 1,247 → 1,239                │
│  "Who unfollowed me?" 🤔                            │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Option 1: Paid tracker apps ($5/mo)                │
│    → Give them your login → Privacy risk            │
│                                                     │
│  Option 2: Manually check each follower             │
│    → 1,239 profiles to click through 😩             │
│                                                     │
│  Option 3: Just wonder forever                      │
│    → Accept the mystery 🤷                           │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**After XActions:**

```
┌─────────────────────────────────────────────────────┐
│  🚨 8 PEOPLE UNFOLLOWED YOU:                        │
├─────────────────────────────────────────────────────┤
│  1. @crypto_bro_88     (followed you for 2 days)   │
│  2. @brand_pitch_fail  (the one you were pitching)  │
│  3. @bot_account_1     (automated follow/unfollow)  │
│  4. @spammer_xyz       (good riddance)              │
│  5. @random_user_42    (who even was this)          │
│  6. @old_colleague     (ouch)                       │
│  7. @bot_account_2     (another bot)                │
│  8. @giveaway_hunter   (followed for the giveaway)  │
│                                                     │
│  🎉 3 NEW FOLLOWERS:                                │
│  1. @genuine_fan       2. @dev_friend              │
│  3. @new_reader                                     │
│                                                     │
│  📉 Net change: -5 followers                        │
│  📥 Unfollowers list downloaded!                    │
│  ⏱️  Time: 45 seconds                               │
│  💰 Cost: $0                                        │
└─────────────────────────────────────────────────────┘
```

---

## 📋 What This Does (Step by Step)

1. 📜 **Scrolls your followers list** — loads all followers from `x.com/you/followers`
2. 📸 **Takes a snapshot** — saves every username + display name to `localStorage`
3. 🔄 **On second run: compares** — diffs the new list against the saved snapshot
4. 🚨 **Shows unfollowers** — lists every person who was in the previous snapshot but isn't now
5. 🎉 **Shows new followers** — lists every person who's new since the last snapshot
6. 📥 **Downloads unfollowers** — auto-downloads a `.txt` file of unfollower usernames
7. 💾 **Updates snapshot** — saves the current state for the next comparison

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  ── RUN 1 (first time) ──────────────────────────        │
│                                                          │
│  [Navigate to /followers]                                │
│          │                                               │
│          ▼                                               │
│  [Scroll & collect all follower usernames]               │
│          │                                               │
│          ▼                                               │
│  [Save snapshot to localStorage]                         │
│          │                                               │
│          ▼                                               │
│  [Done! "Run again later to detect changes."]            │
│                                                          │
│                                                          │
│  ── RUN 2+ (subsequent times) ───────────────────        │
│                                                          │
│  [Navigate to /followers]                                │
│          │                                               │
│          ▼                                               │
│  [Scroll & collect all follower usernames]               │
│          │                                               │
│          ▼                                               │
│  [Load previous snapshot from localStorage]              │
│          │                                               │
│    ┌─────┴─────┐                                         │
│    ▼           ▼                                         │
│  [In old,    [In new,                                    │
│   not new]    not old]                                   │
│    │           │                                         │
│    ▼           ▼                                         │
│  🚨 UNFOLLOWED  🎉 NEW FOLLOWER                          │
│          │                                               │
│          ▼                                               │
│  [Download unfollowers.txt + update snapshot]            │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 🌐 Method 1: Browser Console (Copy-Paste)

**Best for:** Everyone. Run it once to take a snapshot, then again whenever you want to check.

### Prerequisites

- [x] Logged into X/Twitter in your browser
- [x] On desktop/laptop

### Step 1: Navigate to your Followers page

> Go to **`x.com/YOUR_USERNAME/followers`** (not "following" — **followers**)

```
┌────────────────────────────────────────────────────┐
│ 🔍 x.com/nichxbt/followers                         │
├────────────────────────────────────────────────────┤
│                                                    │
│  👤 Real Friend @bestie_dev                        │
│     Full-stack dev | Building cool stuff           │
│                                                    │
│  👤 New Fan @genuine_reader                        │
│     I read your blog                               │
│                                                    │
│  👤 Bot Account @spammy_bot_42                     │
│     🚀💰 Follow for follow! 🎉                    │
│                                                    │
│  ... 1,236 more                                    │
│                                                    │
└────────────────────────────────────────────────────┘
```

### Step 2: Open Developer Console

| OS | Shortcut |
|----|----------|
| **Windows / Linux** | `F12` then **Console** tab, or `Ctrl + Shift + J` |
| **Mac** | `Cmd + Option + J` |

### Step 3: Paste and Run

**Run 1 (first time):** Takes a snapshot and saves it. **Run 2+ (later):** Compares and shows who unfollowed.

```javascript
// ============================================
// XActions - Detect Unfollowers on X/Twitter
// by nichxbt — https://xactions.app
// Go to: x.com/YOUR_USERNAME/followers
// Open console (F12 → Console), paste, Enter
// Run once to snapshot, again later to compare
// ============================================

(async () => {
  const STORAGE_KEY = 'xactions_followers_snapshot';
  const SCROLL_DELAY = 1500;
  const MAX_SCROLL_RETRIES = 10;

  console.log('');
  console.log('🔍 XActions - DETECT UNFOLLOWERS');
  console.log('════════════════════════════════════════');

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // Verify page
  const pathMatch = window.location.pathname.match(/^\/([^/]+)\/followers/);
  if (!pathMatch) {
    console.error('❌ Navigate to your FOLLOWERS page first!');
    console.log('👉 Go to: x.com/YOUR_USERNAME/followers');
    return;
  }

  const username = pathMatch[1];
  console.log(`📍 Monitoring: @${username}`);
  console.log('');

  // ── Step 1: Scan current followers ─────────────────────
  console.log('📜 Step 1: Scanning your followers list...');

  const followers = new Map();
  let scrollRetries = 0;

  while (scrollRetries < MAX_SCROLL_RETRIES) {
    const cells = document.querySelectorAll('[data-testid="UserCell"]');
    const prevSize = followers.size;

    cells.forEach(cell => {
      try {
        const link = cell.querySelector('a[href^="/"]');
        const href = link?.getAttribute('href') || '';
        const handle = href.split('/')[1]?.toLowerCase();
        if (!handle || handle.includes('?') || handle.includes('/')) return;

        const nameEl = cell.querySelector('[dir="ltr"] > span');
        const displayName = nameEl?.textContent?.trim() || handle;
        const bioEl = cell.querySelector('[data-testid="UserDescription"]');
        const bio = bioEl?.textContent?.trim() || '';

        if (!followers.has(handle)) {
          followers.set(handle, { username: handle, displayName, bio });
        }
      } catch (e) { /* skip */ }
    });

    console.log(`   📊 Found ${followers.size} followers so far...`);

    if (followers.size === prevSize) scrollRetries++;
    else scrollRetries = 0;

    window.scrollTo(0, document.body.scrollHeight);
    await sleep(SCROLL_DELAY);
  }

  const currentFollowers = Array.from(followers.values());
  console.log('');
  console.log(`✅ Scan complete! Found ${currentFollowers.length} followers`);

  // ── Step 2: Load previous snapshot ─────────────────────
  console.log('');
  console.log('📂 Step 2: Checking for previous snapshot...');

  let previousData = null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) previousData = JSON.parse(stored);
  } catch (e) { /* no previous data */ }

  // ── Step 3: Compare if previous data exists ────────────
  if (previousData && previousData.username === username) {
    const prevDate = new Date(previousData.timestamp).toLocaleString();
    console.log(`   📸 Found snapshot from ${prevDate}`);
    console.log(`   📊 Previous: ${previousData.count} | Current: ${currentFollowers.length}`);
    console.log('');
    console.log('🔎 Step 3: Comparing snapshots...');

    const prevSet = new Set(previousData.followers.map(f => f.username.toLowerCase()));
    const currSet = new Set(currentFollowers.map(f => f.username.toLowerCase()));

    const unfollowers = previousData.followers.filter(f => !currSet.has(f.username.toLowerCase()));
    const newFollowers = currentFollowers.filter(f => !prevSet.has(f.username.toLowerCase()));

    // Show unfollowers
    console.log('');
    if (unfollowers.length > 0) {
      console.log(`🚨 ${unfollowers.length} PEOPLE UNFOLLOWED YOU:`);
      console.log('─'.repeat(45));
      unfollowers.forEach((u, i) => {
        console.log(`   ${i + 1}. @${u.username} (${u.displayName})`);
        console.log(`      └─ https://x.com/${u.username}`);
      });

      // Auto-download unfollowers list
      const list = unfollowers.map(u => `@${u.username}`).join('\n');
      const blob = new Blob([list], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `unfollowers-${username}-${new Date().toISOString().split('T')[0]}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      console.log('');
      console.log('📥 Unfollowers list downloaded!');
    } else {
      console.log('✨ No one unfollowed you since last check!');
    }

    // Show new followers
    console.log('');
    if (newFollowers.length > 0) {
      console.log(`🎉 ${newFollowers.length} NEW FOLLOWERS:`);
      console.log('─'.repeat(45));
      newFollowers.slice(0, 25).forEach((u, i) => {
        console.log(`   ${i + 1}. @${u.username} (${u.displayName})`);
      });
      if (newFollowers.length > 25) console.log(`   ... and ${newFollowers.length - 25} more!`);
    } else {
      console.log('📭 No new followers since last check.');
    }

    // Summary
    console.log('');
    console.log('📈 SUMMARY:');
    console.log('─'.repeat(45));
    const net = newFollowers.length - unfollowers.length;
    const icon = net > 0 ? '📈' : net < 0 ? '📉' : '➡️';
    console.log(`   ${icon} Net change: ${net >= 0 ? '+' : ''}${net} followers`);
    console.log(`   ➕ Gained: ${newFollowers.length}`);
    console.log(`   ➖ Lost: ${unfollowers.length}`);

  } else {
    console.log('   📸 No previous snapshot — this is your first scan!');
    console.log('   💡 Run this script again later to detect changes.');
  }

  // ── Step 4: Save current snapshot ──────────────────────
  console.log('');
  console.log('💾 Step 4: Saving current snapshot...');

  const snapshot = {
    username,
    followers: currentFollowers,
    count: currentFollowers.length,
    timestamp: new Date().toISOString()
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  console.log(`   ✅ Saved ${currentFollowers.length} followers`);
  console.log(`   📅 ${new Date().toLocaleString()}`);

  console.log('');
  console.log('════════════════════════════════════════');
  console.log('🔄 Run again anytime to detect changes!');
  console.log('════════════════════════════════════════');
})();
```

### ✅ Expected Output — First Run (Snapshot)

```
🔍 XActions - DETECT UNFOLLOWERS
════════════════════════════════════════
📍 Monitoring: @nichxbt

📜 Step 1: Scanning your followers list...
   📊 Found 234 followers so far...
   📊 Found 567 followers so far...
   📊 Found 1,239 followers so far...
   📊 Found 1,239 followers so far...

✅ Scan complete! Found 1,239 followers

📂 Step 2: Checking for previous snapshot...
   📸 No previous snapshot — this is your first scan!
   💡 Run this script again later to detect changes.

💾 Step 4: Saving current snapshot...
   ✅ Saved 1,239 followers
   📅 2/24/2026, 2:30:00 PM

════════════════════════════════════════
🔄 Run again anytime to detect changes!
════════════════════════════════════════
```

### ✅ Expected Output — Second Run (Comparison)

```
🔍 XActions - DETECT UNFOLLOWERS
════════════════════════════════════════
📍 Monitoring: @nichxbt

📜 Step 1: Scanning your followers list...
   📊 Found 289 followers so far...
   📊 Found 612 followers so far...
   📊 Found 1,234 followers so far...

✅ Scan complete! Found 1,234 followers

📂 Step 2: Checking for previous snapshot...
   📸 Found snapshot from 2/24/2026, 2:30:00 PM
   📊 Previous: 1,239 | Current: 1,234

🔎 Step 3: Comparing snapshots...

🚨 8 PEOPLE UNFOLLOWED YOU:
─────────────────────────────────────────────
   1. @crypto_bro_88 (TO THE MOON 🚀)
      └─ https://x.com/crypto_bro_88
   2. @brand_pitch_fail (Some Brand™)
      └─ https://x.com/brand_pitch_fail
   3. @bot_account_1 (Follow Back!)
      └─ https://x.com/bot_account_1
   4. @spammer_xyz (Win Free iPhone!!)
      └─ https://x.com/spammer_xyz
   5. @random_user_42 (Random User)
      └─ https://x.com/random_user_42
   6. @ex_colleague (Jane Smith)
      └─ https://x.com/ex_colleague
   7. @bot_account_2 (Bot Farm 🤖)
      └─ https://x.com/bot_account_2
   8. @giveaway_hunter (Giveaway Pro)
      └─ https://x.com/giveaway_hunter

📥 Unfollowers list downloaded!

🎉 3 NEW FOLLOWERS:
─────────────────────────────────────────────
   1. @genuine_fan (Real Dev)
   2. @dev_friend (Alex K.)
   3. @new_reader (Blog Reader)

📈 SUMMARY:
─────────────────────────────────────────────
   📉 Net change: -5 followers
   ➕ Gained: 3
   ➖ Lost: 8

💾 Step 4: Saving current snapshot...
   ✅ Saved 1,234 followers
   📅 2/25/2026, 10:15:00 AM

════════════════════════════════════════
🔄 Run again anytime to detect changes!
════════════════════════════════════════
```

---

## 💻 Method 2: CLI (Command Line)

**Best for:** Scheduled daily checks, historical tracking, large accounts.

```bash
# Install XActions globally
npm install -g xactions

# Take a follower snapshot
npx xactions followers snapshot --username nichxbt

# Check for unfollowers (compares with last snapshot)
npx xactions followers check --username nichxbt

# Compare two specific snapshots
npx xactions followers compare \
  --old ./snapshots/2026-02-20.json \
  --new ./snapshots/2026-02-24.json
```

### ✅ CLI Output Preview

```
⚡ XActions v2.4.0

🔍 DETECT UNFOLLOWERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 Account: @nichxbt

📜 Scanning followers...
   ████████████████████████████ 1,234 followers

📸 Previous snapshot: 2/24/2026 (1,239 followers)

🚨 Unfollowed you (8):
   @crypto_bro_88, @brand_pitch_fail, @bot_account_1,
   @spammer_xyz, @random_user_42, @ex_colleague,
   @bot_account_2, @giveaway_hunter

🎉 New followers (3):
   @genuine_fan, @dev_friend, @new_reader

📉 Net: -5 | Gained: 3 | Lost: 8
💾 Snapshot saved → ./snapshots/2026-02-25.json
📥 Unfollowers → ./unfollowers-2026-02-25.txt
```

### Schedule daily checks (cron):

```bash
# Run every day at 9 AM
0 9 * * * cd /path/to/project && npx xactions followers check --username nichxbt >> /var/log/unfollower-check.log 2>&1
```

### CLI Configuration Table

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--username` | string | required | Your X username |
| `--snapshot-dir` | string | `./snapshots` | Directory for snapshot files |
| `--output` | string | auto | Output file for unfollower list |
| `--format` | string | `txt` | Output format: `txt`, `json`, `csv` |
| `--headless` | boolean | `true` | Run browser in background |
| `--notify` | boolean | `false` | Send desktop notification on changes |

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
  "tool": "x_detect_unfollowers",
  "arguments": {
    "username": "nichxbt",
    "compare_with_last": true
  }
}
```

### Claude Desktop example prompt:

> "Check who unfollowed me on X since my last scan and list them with links to their profiles."

### Expected MCP response:

```json
{
  "status": "complete",
  "account": "nichxbt",
  "previous_scan": "2026-02-24T14:30:00Z",
  "previous_count": 1239,
  "current_count": 1234,
  "unfollowers": [
    { "username": "crypto_bro_88", "display_name": "TO THE MOON 🚀" },
    { "username": "brand_pitch_fail", "display_name": "Some Brand™" }
  ],
  "new_followers": [
    { "username": "genuine_fan", "display_name": "Real Dev" }
  ],
  "net_change": -5
}
```

---

## 📊 Method Comparison

| Feature | 🌐 Browser Console | 💻 CLI | 🤖 MCP |
|---------|-------------------|--------|---------|
| Setup | None | `npm install` | Config JSON |
| Storage | localStorage | JSON files | JSON files |
| Historical tracking | Last snapshot only | All snapshots | All snapshots |
| Auto-download list | ✅ txt file | ✅ txt/json/csv | ✅ json |
| Scheduled runs | ❌ (manual) | ✅ (cron) | ✅ (via agent) |
| Desktop notifications | ❌ | ✅ | ❌ |
| Cross-device sync | ❌ (browser-local) | ✅ (files) | ✅ (files) |

---

## 📊 How It Works Under the Hood

The script uses a **snapshot-diff** pattern:

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  SNAPSHOT A (Feb 24)           SNAPSHOT B (Feb 25)       │
│  ─────────────────             ─────────────────         │
│  @alice ────────────────────── @alice            ✅ Same │
│  @bob ──────────────────────── @bob              ✅ Same │
│  @crypto_bro ──────────── ❌   (missing)        🚨 GONE │
│  @carol ────────────────────── @carol            ✅ Same │
│  @spammer ─────────────── ❌   (missing)        🚨 GONE │
│                                @new_fan          🎉 NEW  │
│  @dave ─────────────────────── @dave             ✅ Same │
│                                                          │
│  localStorage key: "xactions_followers_snapshot"         │
│  Format: { username, followers[], count, timestamp }     │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

Data is stored in `localStorage` under the key `xactions_followers_snapshot`. To reset and start fresh:

```javascript
localStorage.removeItem('xactions_followers_snapshot');
```

---

## 📊 Sample Output / Results

### Unfollowers download (auto-saved `.txt` file):

```
@crypto_bro_88
@brand_pitch_fail
@bot_account_1
@spammer_xyz
@random_user_42
@ex_colleague
@bot_account_2
@giveaway_hunter
```

### Snapshot data (in localStorage):

```json
{
  "username": "nichxbt",
  "followers": [
    { "username": "alice", "displayName": "Alice Chen", "bio": "Building AI tools" },
    { "username": "bob", "displayName": "Bob K", "bio": "Web3 dev" },
    { "username": "carol", "displayName": "Carol M", "bio": "" }
  ],
  "count": 1234,
  "timestamp": "2026-02-25T10:15:00.000Z"
}
```

---

## 💡 Pro Tips

1. **Run it weekly for the clearest signal** — Daily scans catch noise (bots that follow/unfollow within hours). Weekly scans give you a meaningful picture of real unfollower trends.

2. **Check after controversial tweets** — If you posted something spicy, run the script 24–48 hours later to see exactly who bounced. Great for understanding your audience's boundaries.

3. **Combine with "Unfollow Non-Followers" for cleanup** — Once you know who unfollowed you, use [Unfollow Non-Followers](../unfollow-non-followers.md) to remove everyone who doesn't follow back. Keep your ratio clean.

4. **The localStorage snapshot survives browser restarts** — Your snapshot persists until you clear browser data or manually remove the key. You can safely close the tab and come back days later.

5. **Monitor other accounts too** — The `monitorAccount.js` script works on ANY public account, not just yours. Track competitors or accounts you're interested in by navigating to their `/followers` page and running the monitor script.

---

## ⚠️ Important Notes

- **Two runs minimum** — The first run only takes a snapshot. You need to run it a second time (later) to see unfollowers. No previous data = no comparison.
- **localStorage is per-browser** — Your snapshot is stored locally in the browser you used. Running from a different browser or device starts fresh.
- **Scroll-loading limits** — For accounts with 10,000+ followers, the browser may not load all of them. X throttles infinite scroll. The script retries up to 10 times with no new data.
- **Suspended/deleted accounts** — If someone's account gets suspended between scans, they'll appear as an unfollower. They didn't choose to unfollow — their account simply no longer exists.
- **Rate limits** — The script only scrolls and reads DOM data (no API calls), so there's no rate limiting. It's purely passive scraping.
- **Clearing localStorage resets history** — If you clear browser data or run `localStorage.removeItem('xactions_followers_snapshot')`, your baseline is gone and you start fresh.

---

## 🔗 Related Features

| Feature | Use Case | Link |
|---------|----------|------|
| New Follower Alerts | Get notified of new followers in real-time | [→ Guide](../new-follower-alerts.md) |
| Monitor Account | Track any public account's follower changes | [→ Guide](../monitor-account.md) |
| Unfollow Non-Followers | Remove accounts that don't follow you back | [→ Guide](../unfollow-non-followers.md) |
| Followers Scraping | Export your full followers list to CSV/JSON | [→ Guide](../followers-scraping.md) |
| Engagement Analytics | Analyze your tweet performance over time | [→ Guide](../engagement-analytics.md) |

---

## ❓ FAQ

### Q: How do I see who unfollowed me on Twitter / X?
**A:** Go to `x.com/YOUR_USERNAME/followers`, open browser console (F12 → Console), and paste the XActions detect-unfollowers script. On the first run, it saves a snapshot of your followers. Run it again days later from the same browser — it compares the new list against the saved one and shows exactly who unfollowed you and who's new. No app, no API, completely free.

### Q: Does X / Twitter notify you when someone unfollows?
**A:** No — X does not send any notification when someone unfollows you. The only way to know is to compare your follower list over time, which is exactly what this script does. It takes before/after snapshots and shows the diff.

### Q: Can I track who unfollowed me without any app?
**A:** Yes — the XActions browser script runs entirely in your browser console. It doesn't require downloading any app, giving login credentials to third parties, or installing extensions. Just paste and run.

### Q: How far back can I track unfollowers?
**A:** The script compares your current followers against the most recent saved snapshot. It cannot retroactively tell you who unfollowed before the first snapshot. For historical tracking, use the CLI version which saves dated JSON files that you can compare over time.

### Q: Will the person I check know I'm tracking unfollowers?
**A:** No. The script only reads your publicly visible followers page. There's no notification, API call, or interaction that would alert anyone.

---

<footer>
Built with ⚡ by <a href="https://x.com/nichxbt">@nichxbt</a> · <a href="https://xactions.app">xactions.app</a> · <a href="https://github.com/nichxbt/xactions">GitHub</a>
</footer>
