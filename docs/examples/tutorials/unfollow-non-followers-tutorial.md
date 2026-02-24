---
title: "Unfollow Non-Followers on X (Twitter) — Free Tool 2026"
description: "Find and unfollow people who don't follow you back on X/Twitter. Free browser script, CLI, and MCP method. No API needed."
keywords: ["unfollow non followers twitter", "who doesn't follow me back twitter", "remove non followers twitter 2026", "how to see who doesn't follow you back on X", "twitter unfollow non followers free", "bulk unfollow non followers twitter", "twitter follower ratio cleanup", "mass unfollow non mutuals X", "check who doesn't follow back twitter", "xactions unfollow non followers"]
canonical: "https://xactions.app/examples/unfollow-non-followers"
author: "nich (@nichxbt)"
date: "2026-02-24"
---

# 🚫 Unfollow Non-Followers on X (Twitter) — Clean Up Your Ratio in Minutes

> **Find every account that doesn't follow you back on X (Twitter) and unfollow them automatically — free, no API, no app install.** Keep your mutuals. Remove the dead weight.

**Works on:** 🌐 Browser Console · 💻 CLI · 🤖 MCP (AI Agents)
**Difficulty:** 🟢 Beginner
**Time:** ⏱️ 5–20 minutes
**Requirements:** A web browser logged into x.com

> 📖 For the quick-reference version, see [unfollow-non-followers.md](../unfollow-non-followers.md)

---

## 🎯 Real-World Scenario

You've been on X for three years. You followed back anyone who followed you, hit "Follow" on people in your niche hoping they'd follow back, and binged through "suggested accounts." Now you follow **2,100 people** but only **890 follow you back**. Your follower-to-following ratio is 0.42 — and every growth guide says it should be above 1.0. You don't want to unfollow *everyone* (you like your mutuals) — you just want to remove the **1,210 accounts** that never followed you back.

Doing this manually means clicking each profile, checking "Follows you," clicking unfollow, confirming — that's **4 clicks × 1,210 people = 4,840 clicks**. XActions does it with one paste.

**Before XActions:**

```
┌─────────────────────────────────────────────────────┐
│  @yourhandle                                        │
├─────────────────────────────────────────────────────┤
│  Following: 2,100         Followers: 890            │
│  Ratio: 0.42x 😬                                    │
│                                                     │
│  👤 @big_influencer     Follows you? ❌ (NOPE)      │
│  👤 @real_friend_01     Follows you? ✅ (mutual)    │
│  👤 @brand_account      Follows you? ❌ (NOPE)      │
│  👤 @dead_profile_77    Follows you? ❌ (NOPE)      │
│  👤 @mutual_buddy       Follows you? ✅ (mutual)    │
│  👤 @crypto_shill_88    Follows you? ❌ (NOPE)      │
│  ... 2,094 more to check manually 😩                │
│                                                     │
│  Time to clean up by hand: ~6 hours                 │
└─────────────────────────────────────────────────────┘
```

**After XActions:**

```
┌─────────────────────────────────────────────────────┐
│  @yourhandle                                        │
├─────────────────────────────────────────────────────┤
│  Following: 890           Followers: 890            │
│  Ratio: 1.0x 💪                                     │
│                                                     │
│  👤 @real_friend_01     ✅ mutual                   │
│  👤 @mutual_buddy       ✅ mutual                   │
│  👤 @work_colleague     ✅ mutual                   │
│  ... only people who follow you back                │
│                                                     │
│  Non-followers removed: 1,210                       │
│  Time: ~15 minutes (with safety pauses)             │
│  Backup file: ✅ saved automatically                │
└─────────────────────────────────────────────────────┘
```

---

## 📋 What This Does (Step by Step)

1. 📜 **Scrolls your following list** — loads all accounts from `x.com/you/following`
2. 🔎 **Checks the "Follows you" badge** — uses `[data-testid="userFollowIndicator"]` on each user cell
3. 📊 **Separates mutuals from non-followers** — builds two lists
4. 💾 **Downloads the non-followers list** — JSON backup before making any changes
5. ⚠️ **Shows confirmation dialog** — previews who will be unfollowed
6. 🚫 **Unfollows only non-followers** — clicks unfollow + confirm for each, skipping mutuals
7. ⏸️ **Pauses for safety** — 3s delay per action + 15s break every 10 unfollows

```
┌───────────────────────────────────────────────────────────┐
│                                                           │
│  [Navigate to /following]                                 │
│          │                                                │
│          ▼                                                │
│  [Scroll & load all user cells]                           │
│          │                                                │
│          ▼                                                │
│  [For each user: check "Follows you" badge]               │
│          │                                                │
│    ┌─────┴─────┐                                          │
│    │           │                                          │
│  Badge ✅    No badge ❌                                   │
│    │           │                                          │
│    ▼           ▼                                          │
│  [SKIP]    [Add to non-followers list]                    │
│               │                                           │
│               ▼                                           │
│  [Download non-followers JSON]                            │
│               │                                           │
│               ▼                                           │
│  [Confirm?] ──→ Cancel → [Abort, keep backup]            │
│       │                                                   │
│      OK                                                   │
│       │                                                   │
│       ▼                                                   │
│  [Click unfollow → confirm → wait 3-5s → next]           │
│               │                                           │
│               ▼                                           │
│  [Print summary: unfollowed / failed / remaining]         │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

---

## 🌐 Method 1: Browser Console (Copy-Paste)

**Best for:** Cleaning up accounts with up to ~1,000 following. Zero setup.

### Prerequisites

- [x] Logged into X/Twitter in your web browser
- [x] On desktop/laptop
- [x] Know your username

### Step 1: Navigate to your Following page

> Go to **`x.com/YOUR_USERNAME/following`**

```
┌────────────────────────────────────────────────────┐
│ 🔍 x.com/nichxbt/following                         │
├────────────────────────────────────────────────────┤
│                                                    │
│  👤 Elon Musk @elonmusk          [Following ✓]    │
│                                                    │
│  👤 Sam Altman @sama             [Following ✓]    │
│     Follows you                                    │
│                                                    │
│  👤 Dead Account @gone_2023      [Following ✓]    │
│                                                    │
│  👤 Real Friend @bestie_dev      [Following ✓]    │
│     Follows you                                    │
│                                                    │
│  ... 2,096 more                                    │
│                                                    │
└────────────────────────────────────────────────────┘
```

Notice the small "Follows you" label — that's the `[data-testid="userFollowIndicator"]` badge the script looks for.

### Step 2: Open Developer Console

| OS | Shortcut |
|----|----------|
| **Windows / Linux** | `F12` then **Console** tab, or `Ctrl + Shift + J` |
| **Mac** | `Cmd + Option + J` |

### Step 3: Paste and Run

```javascript
// ============================================
// XActions - Unfollow Non-Followers on X/Twitter
// by nichxbt — https://xactions.app
// Go to: x.com/YOUR_USERNAME/following
// Open console (F12 → Console), paste, Enter
// ============================================

(async () => {
  // ── Configuration ──────────────────────────────────────
  const MAX_UNFOLLOWS = 100;          // Max unfollows per run
  const SCROLL_DELAY = 2000;          // Delay between scrolls (ms)
  const UNFOLLOW_DELAY = 3000;        // Delay between unfollows (ms)
  const BATCH_PAUSE = 15000;          // 15s pause every 10 unfollows
  const MAX_SCROLL_RETRIES = 15;      // Stop scrolling after this many retries

  console.log('');
  console.log('🔍 XActions - UNFOLLOW NON-FOLLOWERS');
  console.log('════════════════════════════════════════');
  console.log(`⚙️  Max unfollows per run: ${MAX_UNFOLLOWS}`);
  console.log('');

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // Verify page
  const pathMatch = window.location.pathname.match(/^\/([^/]+)\/following/);
  if (!pathMatch) {
    console.error('❌ Navigate to your FOLLOWING page first!');
    console.log('👉 Go to: x.com/YOUR_USERNAME/following');
    return;
  }

  const currentUsername = pathMatch[1];
  console.log(`📍 Account: @${currentUsername}`);
  console.log('');

  // ── Step 1: Scan following list ────────────────────────
  console.log('📜 Step 1: Scanning your following list...');

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

        // KEY CHECK: does this person follow you back?
        const followsYou = cell.querySelector('[data-testid="userFollowIndicator"]') !== null;

        const unfollowBtn = cell.querySelector('[data-testid$="-unfollow"]');

        if (!users.has(username)) {
          users.set(username, { username, name, followsYou, cell, unfollowBtn });
        }
      } catch (e) { /* skip */ }
    });

    const nonCount = Array.from(users.values()).filter(u => !u.followsYou).length;
    console.log(`   📊 Scanned: ${users.size} users (${nonCount} don't follow back)`);

    if (users.size === prevSize) scrollRetries++;
    else scrollRetries = 0;

    window.scrollTo(0, document.body.scrollHeight);
    await sleep(SCROLL_DELAY);
  }

  // ── Step 2: Separate mutuals from non-followers ────────
  console.log('');
  console.log('🔎 Step 2: Identifying non-followers...');

  const allUsers = Array.from(users.values());
  const nonFollowers = allUsers.filter(u => !u.followsYou);
  const mutuals = allUsers.filter(u => u.followsYou);

  console.log(`   👥 Total following:      ${allUsers.length}`);
  console.log(`   ✅ Mutuals (safe):       ${mutuals.length}`);
  console.log(`   ❌ Non-followers:        ${nonFollowers.length}`);

  if (nonFollowers.length === 0) {
    console.log('');
    console.log('🎉 Everyone you follow also follows you back! Nothing to clean up.');
    return;
  }

  // ── Step 3: Export non-followers list ──────────────────
  console.log('');
  console.log('💾 Step 3: Downloading non-followers list...');

  const exportData = nonFollowers.map(u => ({
    username: u.username,
    name: u.name,
    followsYou: false
  }));

  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `non-followers-${currentUsername}-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);

  console.log(`   📥 Downloaded: non-followers-${currentUsername}.json`);
  try { await navigator.clipboard.writeText(json); console.log('   📋 Copied to clipboard!'); } catch {}

  // Preview
  console.log('');
  console.log('📋 Non-followers preview:');
  nonFollowers.slice(0, 15).forEach((u, i) => {
    console.log(`   ${(i + 1).toString().padStart(2)}. @${u.username} (${u.name})`);
  });
  if (nonFollowers.length > 15) console.log(`   ... and ${nonFollowers.length - 15} more`);

  // ── Step 4: Confirmation ───────────────────────────────
  const toUnfollow = nonFollowers.slice(0, MAX_UNFOLLOWS);

  const confirmed = window.confirm(
    `🚫 Unfollow ${toUnfollow.length} non-followers?\n\n` +
    `${mutuals.length} mutuals will NOT be touched.\n` +
    `Non-followers list has been downloaded.\n\n` +
    `Click OK to proceed.`
  );

  if (!confirmed) {
    console.log('👋 Cancelled — no one was unfollowed. Backup file is saved.');
    return;
  }

  // ── Step 5: Unfollow loop ──────────────────────────────
  console.log('');
  console.log(`🚫 Step 4: Unfollowing ${toUnfollow.length} non-followers...`);
  console.log('   (Mutuals are safe — only removing non-followers)');
  console.log('');

  const unfollowed = [];
  const failed = [];

  for (let i = 0; i < toUnfollow.length; i++) {
    const user = toUnfollow[i];

    try {
      user.cell.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await sleep(500);

      const btn = user.cell.querySelector('[data-testid$="-unfollow"]');
      if (!btn) { failed.push(user.username); continue; }

      btn.click();
      await sleep(500);

      const confirmBtn = document.querySelector('[data-testid="confirmationSheetConfirm"]');
      if (confirmBtn) {
        confirmBtn.click();
        unfollowed.push(user.username);
        const pct = ((i + 1) / toUnfollow.length * 100).toFixed(1);
        console.log(`   ✅ Unfollowed @${user.username}  [${unfollowed.length}/${toUnfollow.length}]  ${pct}%`);
      } else {
        failed.push(user.username);
        console.log(`   ⚠️  @${user.username} — confirm dialog not found`);
      }

      await sleep(UNFOLLOW_DELAY + Math.random() * 2000);

      if (unfollowed.length % 10 === 0 && unfollowed.length > 0 && i < toUnfollow.length - 1) {
        console.log(`   ⏸️  Safety pause (${BATCH_PAUSE / 1000}s)...`);
        await sleep(BATCH_PAUSE);
        console.log('   ▶️  Resuming...');
      }

      const toast = document.querySelector('[data-testid="toast"]');
      if (toast?.textContent?.includes('limit')) {
        console.log('⛔ RATE LIMIT — stopping. Wait 15–30 min, then re-run.');
        break;
      }
    } catch (err) {
      failed.push(user.username);
    }
  }

  // ── Summary ────────────────────────────────────────────
  console.log('');
  console.log('════════════════════════════════════════');
  console.log('🚫 UNFOLLOW NON-FOLLOWERS — COMPLETE');
  console.log('════════════════════════════════════════');
  console.log(`📊 Non-followers found:   ${nonFollowers.length}`);
  console.log(`✅ Unfollowed:            ${unfollowed.length}`);
  console.log(`❌ Failed:                ${failed.length}`);
  console.log(`👥 Mutuals kept:          ${mutuals.length}`);
  console.log('');

  if (nonFollowers.length > MAX_UNFOLLOWS) {
    console.log(`💡 ${nonFollowers.length - unfollowed.length} non-followers remain — refresh and re-run.`);
  } else if (unfollowed.length === nonFollowers.length) {
    console.log('🎉 All non-followers removed! Only mutuals remain.');
  }
})();
```

### ✅ Expected Console Output

```
🔍 XActions - UNFOLLOW NON-FOLLOWERS
════════════════════════════════════════
⚙️  Max unfollows per run: 100

📍 Account: @nichxbt

📜 Step 1: Scanning your following list...
   📊 Scanned: 245 users (89 don't follow back)
   📊 Scanned: 578 users (231 don't follow back)
   📊 Scanned: 1,024 users (519 don't follow back)
   📊 Scanned: 2,100 users (1,210 don't follow back)
   📊 Scanned: 2,100 users (1,210 don't follow back)

🔎 Step 2: Identifying non-followers...
   👥 Total following:      2,100
   ✅ Mutuals (safe):       890
   ❌ Non-followers:        1,210

💾 Step 3: Downloading non-followers list...
   📥 Downloaded: non-followers-nichxbt.json
   📋 Copied to clipboard!

📋 Non-followers preview:
    1. @influencer_xyz (Big Influencer)
    2. @brand_official (Some Brand)
    3. @dead_account_2022 (Inactive User)
    4. @crypto_shill_88 (TO THE MOON)
    5. @giveaway_page (FREE STUFF)
   ... and 1,195 more

   [Browser confirm dialog: "Unfollow 100 non-followers?"]

🚫 Step 4: Unfollowing 100 non-followers...
   (Mutuals are safe — only removing non-followers)

   ✅ Unfollowed @influencer_xyz     [1/100]    1.0%
   ✅ Unfollowed @brand_official     [2/100]    2.0%
   ✅ Unfollowed @dead_account_2022  [3/100]    3.0%
   ✅ Unfollowed @crypto_shill_88    [4/100]    4.0%
   ✅ Unfollowed @giveaway_page      [5/100]    5.0%
   ...
   ✅ Unfollowed @random_bot_55      [10/100]   10.0%
   ⏸️  Safety pause (15s)...
   ▶️  Resuming...
   ✅ Unfollowed @old_follow_001     [11/100]   11.0%
   ...

════════════════════════════════════════
🚫 UNFOLLOW NON-FOLLOWERS — COMPLETE
════════════════════════════════════════
📊 Non-followers found:   1,210
✅ Unfollowed:            98
❌ Failed:                2
👥 Mutuals kept:          890

💡 1,112 non-followers remain — refresh and re-run.
```

---

## 💻 Method 2: CLI (Command Line)

**Best for:** Power users, scheduled cleanups, larger accounts.

```bash
# Install XActions globally
npm install -g xactions

# Unfollow non-followers (interactive)
npx xactions unfollow --non-followers

# With explicit options
npx xactions unfollow --non-followers \
  --username nichxbt \
  --max 100 \
  --delay 4000 \
  --batch-size 10 \
  --batch-pause 20000 \
  --output ./cleanup-results.json
```

### ✅ CLI Output Preview

```
⚡ XActions v2.4.0

🔍 UNFOLLOW NON-FOLLOWERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 Account: @nichxbt

📜 Scanning following list...
   ████████████████████████████ 2,100 users

📜 Scanning followers list...
   ████████████████████████████ 890 users

🔎 Analysis:
   Following:      2,100
   Followers:      890
   Mutuals:        890
   Non-followers:  1,210

💾 Exported → non-followers-nichxbt-2026-02-24.json
💾 Exported → non-followers-nichxbt-2026-02-24.csv

❓ Unfollow 100 non-followers? (yes/no): yes

🚫 Unfollowing...
   ████████░░░░░░░░░░░░░░░░░░░░ 28% | 28/100 | ETA: 6m

✅ Complete!
   Unfollowed: 98 | Failed: 2 | Mutuals kept: 890
   Remaining non-followers: 1,112
   Results → ./cleanup-results.json
```

### CLI Configuration Table

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--non-followers` | boolean | `false` | Only unfollow non-followers (required) |
| `--username` | string | auto-detect | Your X username |
| `--max` | number | `50` | Max unfollows per session |
| `--delay` | number | `4000` | Delay between unfollows in ms |
| `--batch-size` | number | `10` | Unfollows before pausing |
| `--batch-pause` | number | `20000` | Pause duration between batches (ms) |
| `--output` | string | auto | Path for results log |
| `--export-only` | boolean | `false` | Just export list, don't unfollow |
| `--headless` | boolean | `true` | Run browser in background |

---

## 🤖 Method 3: MCP Server (AI Agents)

> Use with Claude Desktop, GPT, Cursor, or any MCP-compatible AI agent.

### Setup

Add XActions to your MCP config:

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
  "tool": "x_unfollow_non_followers",
  "arguments": {
    "confirm": true,
    "max_unfollows": 100,
    "export_list": true,
    "delay_ms": 4000
  }
}
```

### Claude Desktop example prompt:

> "Find everyone I follow on X who doesn't follow me back, export the list to a file, then unfollow the first 50."

### Expected MCP response:

```json
{
  "status": "complete",
  "account": "nichxbt",
  "total_following": 2100,
  "total_followers": 890,
  "mutuals": 890,
  "non_followers_found": 1210,
  "unfollowed": 50,
  "failed": 1,
  "export_file": "non-followers-nichxbt-2026-02-24.json"
}
```

---

## 📊 Method Comparison

| Feature | 🌐 Browser Console | 💻 CLI | 🤖 MCP |
|---------|-------------------|--------|---------|
| Setup | None | `npm install` | Config JSON |
| Speed | Fast | Fastest | Via AI agent |
| Best for | Quick cleanup | Power users | AI workflows |
| Detects non-followers | ✅ via badge | ✅ cross-references lists | ✅ |
| Export before unfollow | ✅ JSON | ✅ JSON + CSV | ✅ JSON |
| Whitelist / protect | ❌ (manual) | Coming soon | Coming soon |
| Progress | Console logs | Progress bar | Status object |
| Rate limit safety | ✅ | ✅ | ✅ |

---

## 📊 How Detection Works

The script identifies non-followers using the **"Follows you" badge** on x.com:

```
┌────────────────────────────────────────────────────┐
│  User cell in your following list                  │
├────────────────────────────────────────────────────┤
│                                                    │
│  👤 @real_friend                   [Following ✓]  │
│     "Follows you"  ← THIS BADGE                   │
│     ───────────                                    │
│     data-testid="userFollowIndicator"              │
│     ✅ MUTUAL — will be KEPT                       │
│                                                    │
│  👤 @non_follower                  [Following ✓]  │
│     (no badge)                                     │
│     ❌ NON-FOLLOWER — will be UNFOLLOWED           │
│                                                    │
└────────────────────────────────────────────────────┘
```

The browser script filters with this one-liner:
```javascript
followButtons.filter(b =>
  b.parentElement?.parentElement
   ?.querySelector('[data-testid="userFollowIndicator"]') === null
)
```

Only buttons **without** the "Follows you" indicator get clicked. Mutuals are never touched.

---

## 📊 Sample Output / Results

### Non-Followers Export (auto-downloaded):

```json
[
  {
    "username": "influencer_xyz",
    "name": "Big Influencer",
    "followsYou": false
  },
  {
    "username": "brand_official",
    "name": "Some Brand™",
    "followsYou": false
  },
  {
    "username": "dead_account_2022",
    "name": "Gone User",
    "followsYou": false
  }
]
```

### Results Summary (CLI — JSON):

```json
{
  "date": "2026-02-24T14:30:00.000Z",
  "account": "nichxbt",
  "following": 2100,
  "followers": 890,
  "nonFollowersFound": 1210,
  "unfollowed": ["influencer_xyz", "brand_official", "dead_account_2022"],
  "failed": [{ "username": "suspended_user", "error": "Page load timeout" }],
  "remaining": 1112
}
```

### Non-Followers CSV (CLI):

```csv
username,name,bio
"influencer_xyz","Big Influencer","10M followers | DM for collabs"
"brand_official","Some Brand™","The official account of Some Brand"
"dead_account_2022","Gone User",""
```

---

## 💡 Pro Tips

1. **Run `--export-only` first** — Before unfollowing anyone, export the non-followers list and review it. You might discover accounts you want to keep following even though they don't follow back (news outlets, public figures, etc.).

2. **Do 50–100 per session, not all at once** — X is more lenient with gradual cleanup. Running 3 sessions of 50 unfollows with 30-minute gaps between is safer than blasting through 150 in one go.

3. **Pair this with "Detect Unfollowers" for ongoing hygiene** — Run [detect-unfollowers](../detect-unfollowers.md) weekly to catch new non-followers as they appear, rather than letting them pile up again.

4. **Check your ratio after cleanup** — If you started at 2,100/890 (0.42x) and removed 1,210 non-followers, you'll be at 890/890 (1.0x). That's a massive algorithm signal — X shows your tweets to more people when your ratio is healthy.

5. **The "Follows you" badge may lag** — If someone followed you in the last few minutes, the badge might not render yet. The script reads what's currently visible on the DOM. Wait a few seconds after page load for accuracy.

---

## ⚠️ Important Notes

- **Mutuals are never touched** — The script only unfollows accounts where the "Follows you" badge is **absent**. Your mutual follows are safe.
- **Rate limits** — X limits how many unfollows you can do per window. The built-in 3s delay + 15s batch pauses keep you safe. If you see "You're doing that too fast," stop and wait 15–30 minutes.
- **Platform policy** — Cleaning up non-followers is one of the most common uses of automation on X. The human-like delays in this script mitigate risk.
- **Re-run for completion** — If you follow 2,000+ accounts, you'll need 2–4 sessions. The script is safe to re-run immediately after refreshing the page — it recalculates non-followers from scratch each time.
- **Protected accounts** — If someone has a protected account and doesn't follow you, they'll appear as a non-follower and be unfollowed normally.
- **Recently unfollowed you** — Someone who *just* unfollowed you will show as a non-follower. This is accurate — they don't currently follow you.

---

## 🔗 Related Features

| Feature | Use Case | Link |
|---------|----------|------|
| Unfollow Everyone | Go fully nuclear — unfollow ALL accounts | [→ Guide](../unfollow-everyone.md) |
| Smart Unfollow | Unfollow inactive accounts with a whitelist | [→ Guide](../smart-unfollow.md) |
| Detect Unfollowers | Find out who unfollowed you recently | [→ Guide](../detect-unfollowers.md) |
| Following Scraping | Export your full following list to CSV | [→ Guide](../following-scraping.md) |
| Followers Scraping | Export your followers to a spreadsheet | [→ Guide](../followers-scraping.md) |
| Growth Suite | Auto-follow + auto-like + auto-comment in one | [→ Guide](../growth-suite.md) |

---

## ❓ FAQ

### Q: How do I see who doesn't follow me back on Twitter / X?
**A:** Go to `x.com/YOUR_USERNAME/following`, open your browser console (F12 → Console), and paste the XActions non-followers script. It scans every account you follow, checks for the "Follows you" badge, and downloads a JSON list of every non-follower. No API key, no app, no sign-up required.

### Q: Will unfollowing non-followers help my Twitter / X algorithm?
**A:** Yes — X's algorithm favors accounts with a healthy follower-to-following ratio. If you follow 2,000 people but only 500 follow you back, your ratio is 0.25x. Removing 1,500 non-followers brings it to 1.0x, which signals authority and typically increases your impressions and reach.

### Q: Can I protect certain accounts from being unfollowed?
**A:** The current browser script unfollows all non-followers automatically. To protect specific accounts, lower the `MAX_UNFOLLOWS` count and review the preview list before confirming — or use the `--export-only` CLI flag to review the list first, then manually remove accounts you want to keep from the unfollow batch.

### Q: How often should I clean up non-followers?
**A:** Once a month is a good cadence. Pair this script with [Detect Unfollowers](../detect-unfollowers.md) to get alerts when someone unfollows you, so you can address it in real time rather than letting non-followers accumulate.

### Q: Is this the same as "unfollow everyone"?
**A:** No — "Unfollow Everyone" removes **all** accounts you follow, including mutuals. "Unfollow Non-Followers" only removes people who **don't follow you back**, keeping your mutual connections intact.

---

<footer>
Built with ⚡ by <a href="https://x.com/nichxbt">@nichxbt</a> · <a href="https://xactions.app">xactions.app</a> · <a href="https://github.com/nichxbt/xactions">GitHub</a>
</footer>
