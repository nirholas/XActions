# 📋 Unfollow Non-Followers with Logging

Unfollow non-followers with comprehensive logging. Exports a detailed report of who was unfollowed and why.

---

## 📋 What It Does

This script provides the following capabilities:

1. **Automated operation** — Runs directly in your browser console on x.com
2. **Configurable settings** — Customize behavior via the CONFIG object
3. **Real-time progress** — Shows live status updates with emoji-coded logs
4. **Rate limiting** — Built-in delays to respect X/Twitter's rate limits
5. **Data export** — Results exported as JSON/CSV for further analysis

**Use cases:**
- Unfollow non-followers with comprehensive logging. Exports a detailed report of who was unfollowed and why.
- Automate repetitive unfollow tasks on X/Twitter
- Save time with one-click automation — no API keys needed
- Works in any modern browser (Chrome, Firefox, Edge, Safari)

---

## ⚠️ Important Notes

> **Use responsibly!** All automation should respect X/Twitter's Terms of Service. Use conservative settings and include breaks between sessions.

- This script runs in the **browser DevTools console** — not Node.js
- You must be **logged in** to x.com for the script to work
- Start with **low limits** and increase gradually
- Include **random delays** between actions to appear human
- **Don't run** multiple automation scripts simultaneously

---

## 🌐 Browser Console Usage

**Steps:**
1. Go to `x.com/YOUR_USERNAME/following`
2. Open browser console (`F12` → Console tab)
3. Copy and paste the script from [`browser/unfollowWDFBLog.js`](https://github.com/nirholas/XActions/blob/main/browser/unfollowWDFBLog.js)
4. Press Enter to run

```javascript
/**
 * ============================================================
 * 📝 Unfollow Non-Followers with Full Log — Production Grade
 * ============================================================
 *
 * @name        unfollowWDFBLog.js
 * @description Unfollow accounts that don't follow back, with
 *              comprehensive logging: username, display name,
 *              follower count, bio, timestamp. Downloads both
 *              JSON and CSV. Designed for auditing who you
 *              unfollowed and why.
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     2.0.0
 * @date        2026-02-24
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE:
 *
 * 1. Go to: https://x.com/YOUR_USERNAME/following
 * 2. Open DevTools Console (F12)
 * 3. Paste and run. Results auto-download as JSON+CSV.
 *
 * 🎮 CONTROLS:
 *   window.XActions.pause()   — Pause
 *   window.XActions.resume()  — Resume
 *   window.XActions.abort()   — Stop
 *   window.XActions.status()  — Progress
 *   window.XActions.export()  — Force export now
 * ============================================================
 */
(() => {
  'use strict';

  const CONFIG = {
    maxUnfollows: Infinity,
    whitelist: [],
    dryRun: true,
    minDelay: 1500,
    maxDelay: 4000,
    scrollDelay: 2000,
    maxConsecutiveErrors: 8,
    maxEmptyScrolls: 6,
    rateLimitCooldown: 60000,
    logLevel: 'verbose',          // 'verbose' | 'normal' | 'quiet'
    exportFormat: 'both',         // 'json' | 'csv' | 'both'
  };

  const SEL = {
    unfollowBtn: ['[data-testid$="-unfollow"]', 'button[aria-label*="Following @"]'],
    confirmBtn:  ['[data-testid="confirmationSheetConfirm"]'],
    userCell:    ['[data-testid="UserCell"]', '[data-testid="cellInnerDiv"]'],
    followsYou:  ['[data-testid="userFollowIndicator"]'],
    toast:       ['[data-testid="toast"]', '[role="alert"]'],
  };

  const $ = (sel, ctx = document) => {
    for (const s of (Array.isArray(sel) ? sel : [sel])) { const e = ctx.querySelector(s); if (e) return e; }
    return null;
  };
  const $$ = (sel, ctx = document) => {
    for (const s of (Array.isArray(sel) ? sel : [sel])) { const e = ctx.querySelectorAll(s); if (e.length) return [...e]; }
    return [];
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const gaussian = (min, max) => Math.floor(min + ((Math.random() + Math.random()) / 2) * (max - min));

  const isRateLimited = () => {
    const t = $(SEL.toast);
    return t && /rate limit|try again|too many|slow down/i.test(t.textContent);
  };

  const parseCount = (str) => {
    if (!str) return 0;
    str = str.replace(/,/g, '').trim();
    const m = str.match(/([\d.]+)\s*([KMBkmb])?/);
    if (!m) return 0;
    let n = parseFloat(m[1]);
    if (m[2]) n *= { k: 1e3, m: 1e6, b: 1e9 }[m[2].toLowerCase()] || 1;
    return Math.round(n);
  };

  // ── State ──────────────────────────────────────────────────
  let paused = false, aborted = false;
  let unfollowed = 0, scanned = 0, errors = 0, consecutiveErrors = 0;
  const startTime = Date.now();
  const log = [];       // Full log of unfollowed accounts
  const processedUsers = new Set();
  const whitelistSet = new Set(CONFIG.whitelist.map(u => u.toLowerCase().replace(/^@/, '')));

  // Restore from localStorage
  const STORAGE_KEY = 'xactions_unfollowWDFBLog';
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (saved.processed) saved.processed.forEach(u => processedUsers.add(u));
    if (saved.log) saved.log.forEach(entry => log.push(entry));
  } catch {}

  const persist = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        processed: [...processedUsers],
        log,
        lastRun: new Date().toISOString(),
      }));
    } catch {}
  };

  // ── Controls ──────────────────────────────────────────────
  const showStatus = () => {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    const rate = unfollowed > 0 ? (unfollowed / (elapsed / 60)).toFixed(1) : '0';
    console.log(`📊 Unfollowed: ${unfollowed} | Scanned: ${scanned} | Errors: ${errors} | ${rate}/min | ${elapsed}s`);
  };

  const exportNow = () => {
    if (log.length === 0) { console.log('Nothing to export.'); return; }
    const ts = new Date().toISOString().slice(0, 10);
    const tag = CONFIG.dryRun ? 'preview' : 'results';

    if (CONFIG.exportFormat === 'json' || CONFIG.exportFormat === 'both') {
      const data = { summary: { scanned, unfollowed, errors, dryRun: CONFIG.dryRun, exportedAt: new Date().toISOString() }, accounts: log };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `xactions-unfollowlog-${tag}-${ts}.json`;
      document.body.appendChild(a); a.click(); a.remove();
    }

    if (CONFIG.exportFormat === 'csv' || CONFIG.exportFormat === 'both') {
      const header = 'username,displayName,bio,followers,following,unfollowedAt\n';
      const rows = log.map(r =>
        `"${r.username}","${(r.displayName || '').replace(/"/g, '""')}","${(r.bio || '').replace(/"/g, '""').replace(/\n/g, ' ')}",${r.followers || 0},${r.following || 0},"${r.timestamp}"`
      ).join('\n');
      const blob = new Blob([header + rows], { type: 'text/csv' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `xactions-unfollowlog-${tag}-${ts}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
    }

    console.log('📥 Exported.');
  };

  window.XActions = {
    pause()  { paused = true;  console.log('⏸️ Paused.'); },
    resume() { paused = false; console.log('▶️ Resumed.'); },
    abort()  { aborted = true; console.log('🛑 Aborting...'); },
    status:  showStatus,
    export:  exportNow,
  };

  const shouldContinue = async () => {
    while (paused && !aborted) await sleep(500);
    return !aborted;
  };

  // ── Extract Rich User Data from Cell ────────────────────
  const extractUserData = (cell) => {
    const data = { username: null, displayName: null, bio: null, followers: 0, following: 0 };

    // Username
    const link = cell.querySelector('a[href^="/"][role="link"]') || cell.querySelector('a[href^="/"]');
    if (link) {
      const match = (link.getAttribute('href') || '').match(/^\/([A-Za-z0-9_]+)/);
      if (match && !['home', 'explore', 'notifications', 'messages', 'i'].includes(match[1])) {
        data.username = match[1];
      }
    }
    if (!data.username) {
      const spans = cell.querySelectorAll('span');
      for (const s of spans) { const m = s.textContent.match(/^@([A-Za-z0-9_]+)$/); if (m) { data.username = m[1]; break; } }
    }

    // Display name (usually first bolded text in cell)
    const nameSpans = cell.querySelectorAll('a[href^="/"] span');
    if (nameSpans.length > 0) data.displayName = nameSpans[0].textContent.trim();

    // Bio (usually in a div after the name links)
    const bioEl = cell.querySelector('[dir="auto"]:not(a [dir="auto"])');
    if (bioEl && bioEl.textContent.length > 5) data.bio = bioEl.textContent.trim().slice(0, 300);

    return data;
  };

  // ── Main ──────────────────────────────────────────────────
  const run = async () => {
    const W = 60;
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  📝 UNFOLLOW NON-FOLLOWERS WITH LOG' + ' '.repeat(W - 37) + '║');
    console.log('║  by nichxbt — v2.0' + ' '.repeat(W - 21) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');

    if (!window.location.href.includes('/following')) {
      console.error('❌ Navigate to x.com/YOUR_USERNAME/following first!');
      return;
    }

    console.log(`\n⚙️ Dry run: ${CONFIG.dryRun ? 'YES' : 'NO'}  |  Whitelist: ${whitelistSet.size}  |  Export: ${CONFIG.exportFormat}`);
    if (CONFIG.dryRun) console.log('   ⚠️ Preview only. Set dryRun=false to execute.\n');

    let emptyScrolls = 0;

    while (unfollowed < CONFIG.maxUnfollows && emptyScrolls < CONFIG.maxEmptyScrolls) {
      if (!(await shouldContinue())) break;

      if (isRateLimited()) {
        console.warn(`🚨 Rate limit! Cooling down ${CONFIG.rateLimitCooldown / 1000}s...`);
        await sleep(CONFIG.rateLimitCooldown);
        continue;
      }

      const cells = $$(SEL.userCell);
      let foundNew = false;

      for (const cell of cells) {
        if (!(await shouldContinue())) break;
        if (unfollowed >= CONFIG.maxUnfollows) break;

        const userData = extractUserData(cell);
        if (!userData.username) continue;
        const uLower = userData.username.toLowerCase();
        if (processedUsers.has(uLower)) continue;

        processedUsers.add(uLower);
        foundNew = true;
        scanned++;

        // Skip if follows back
        if ($(SEL.followsYou, cell)) continue;

        // Skip if whitelisted
        if (whitelistSet.has(uLower)) {
          if (CONFIG.logLevel === 'verbose') console.log(`   🛡️ Whitelisted: @${userData.username}`);
          continue;
        }

        const entry = {
          ...userData,
          timestamp: new Date().toISOString(),
          dryRun: CONFIG.dryRun,
        };

        if (CONFIG.dryRun) {
          if (CONFIG.logLevel !== 'quiet') {
            console.log(`   🔍 Would unfollow: @${userData.username}${userData.displayName ? ` (${userData.displayName})` : ''}${userData.bio ? ` — "${userData.bio.slice(0, 60)}..."` : ''}`);
          }
          log.push(entry);
          unfollowed++;
          continue;
        }

        // Execute unfollow
        const btn = $(SEL.unfollowBtn, cell);
        if (!btn) { errors++; consecutiveErrors++; continue; }

        try {
          btn.click();
          await sleep(gaussian(400, 800));
          const confirm = $(SEL.confirmBtn);
          if (confirm) { confirm.click(); await sleep(gaussian(300, 600)); }

          unfollowed++;
          consecutiveErrors = 0;
          log.push(entry);

          if (CONFIG.logLevel === 'verbose' || unfollowed % 5 === 0) {
            console.log(`   🔙 #${unfollowed} @${userData.username}${userData.displayName ? ` (${userData.displayName})` : ''}`);
          }

          persist();
          await sleep(gaussian(CONFIG.minDelay, CONFIG.maxDelay));
        } catch (e) {
          errors++;
          consecutiveErrors++;
          if (consecutiveErrors >= CONFIG.maxConsecutiveErrors) {
            console.error(`❌ ${CONFIG.maxConsecutiveErrors} consecutive errors — aborting.`);
            break;
          }
        }
      }

      if (consecutiveErrors >= CONFIG.maxConsecutiveErrors) break;
      if (!foundNew) emptyScrolls++; else emptyScrolls = 0;

      window.scrollTo(0, document.body.scrollHeight);
      await sleep(gaussian(CONFIG.scrollDelay, CONFIG.scrollDelay + 1000));
    }

    // ── Summary ─────────────────────────────────────────────
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    console.log('\n╔' + '═'.repeat(52) + '╗');
    console.log('║  📊 FINAL RESULTS' + ' '.repeat(34) + '║');
    console.log('╠' + '═'.repeat(52) + '╣');
    console.log(`║  Scanned:       ${String(scanned).padEnd(33)}║`);
    console.log(`║  Unfollowed:    ${String(unfollowed).padEnd(33)}║`);
    console.log(`║  Errors:        ${String(errors).padEnd(33)}║`);
    console.log(`║  Duration:      ${(elapsed + 's').padEnd(33)}║`);
    console.log(`║  Mode:          ${(CONFIG.dryRun ? 'DRY RUN' : 'LIVE').padEnd(33)}║`);
    console.log('╚' + '═'.repeat(52) + '╝');

    persist();
    if (log.length > 0) exportNow();
  };

  run();
})();

```

## ⚙️ Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `maxUnfollows` | `Infinity` | Max unfollows |
| `whitelist` | `[]` | Whitelist |
| `dryRun` | `true` | Dry run |
| `minDelay` | `1500` | Min delay |
| `maxDelay` | `4000` | Max delay |
| `scrollDelay` | `2000` | Scroll delay |
| `maxConsecutiveErrors` | `8` | Max consecutive errors |
| `maxEmptyScrolls` | `6` | Max empty scrolls |
| `rateLimitCooldown` | `60000` | Rate limit cooldown |
| `logLevel` | `'verbose',` | 'verbose' | 'normal' | 'quiet' |
| `exportFormat` | `'both',` | 'json' | 'csv' | 'both' |

---

## 📖 Step-by-Step Tutorial

### Step 1: Navigate to the right page

Open your browser and go to `x.com/YOUR_USERNAME/following`. Make sure you're logged in to your X/Twitter account.

### Step 2: Open the browser console

- **Chrome/Edge:** Press `F12` or `Ctrl+Shift+J` (Mac: `Cmd+Option+J`)
- **Firefox:** Press `F12` or `Ctrl+Shift+K`
- **Safari:** Enable Developer menu in Preferences → Advanced, then press `Cmd+Option+C`

### Step 3: Paste the script

Copy the entire script from [`browser/unfollowWDFBLog.js`](https://github.com/nirholas/XActions/blob/main/browser/unfollowWDFBLog.js) and paste it into the console.

### Step 4: Customize the CONFIG (optional)

Before running, you can modify the `CONFIG` object at the top of the script to adjust behavior:

```javascript
const CONFIG = {
  // Edit these values before running
  // See Configuration table above for all options
};
```

### Step 5: Run and monitor

Press **Enter** to run the script. Watch the console for real-time progress logs:

- ✅ Green messages = success
- 🔄 Blue messages = in progress
- ⚠️ Yellow messages = warnings
- ❌ Red messages = errors

### Step 6: Export results

Most scripts automatically download results as JSON/CSV when complete. Check your Downloads folder.

---

## 🖥️ CLI Usage

You can also run this via the XActions CLI:

```bash
# Install XActions globally
npm install -g xactions

# Run via CLI
xactions --help
```

---

## 🤖 MCP Server Usage

Use with AI agents (Claude, Cursor, etc.) via the MCP server:

```bash
# Start MCP server
npm run mcp
```

See the [MCP Setup Guide](../mcp-setup.md) for integration with Claude Desktop, Cursor, and other AI tools.

---

## 📁 Source Files

| File | Description |
|------|-------------|
| [`browser/unfollowWDFBLog.js`](https://github.com/nirholas/XActions/blob/main/browser/unfollowWDFBLog.js) | Main script |

---

## 🔗 Related Scripts

| Script | Description |
|--------|-------------|
| See [all scripts](README.md) | Browse the complete script catalog |

---

> **Author:** nich ([@nichxbt](https://x.com/nichxbt)) — [XActions on GitHub](https://github.com/nirholas/XActions)
