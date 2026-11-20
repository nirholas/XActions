# 🔓 Mass Unblock

Unblock all or selected users from your block list. Clean up old blocks in bulk.

---

## 📋 What It Does

This script provides the following capabilities:

1. **Automated operation** — Runs directly in your browser console on x.com
2. **Configurable settings** — Customize behavior via the CONFIG object
3. **Real-time progress** — Shows live status updates with emoji-coded logs
4. **Rate limiting** — Built-in delays to respect X/Twitter's rate limits
5. **Data export** — Results exported as JSON/CSV for further analysis

**Use cases:**
- Unblock all or selected users from your block list. Clean up old blocks in bulk.
- Automate repetitive safety tasks on X/Twitter
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
1. Go to `x.com/settings/blocked`
2. Open browser console (`F12` → Console tab)
3. Copy and paste the script from [`browser/massUnblock.js`](https://github.com/nirholas/XActions/blob/main/browser/massUnblock.js)
4. Press Enter to run

```javascript
/**
 * ============================================================
 * 🔓 Mass Unblock Users — Production Grade
 * ============================================================
 *
 * @name        massUnblock.js
 * @description Unblock all or selected users from your blocked
 *              list. Supports whitelist (keep-blocked), rate-limit
 *              detection, pause/resume, progress tracking, export.
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     2.0.0
 * @date        2026-02-24
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE:
 *
 * 1. Go to: https://x.com/settings/blocked/all
 * 2. Open DevTools Console (F12)
 * 3. Paste and run
 *
 * 🎮 CONTROLS:
 *   window.XActions.pause()  / .resume() / .abort() / .status()
 * ============================================================
 */
(() => {
  'use strict';

  const CONFIG = {
    maxUnblocks: Infinity,
    keepBlocked: [],                  // Keep these users blocked (without @)
    dryRun: false,
    minDelay: 1000,
    maxDelay: 2800,
    scrollDelay: 2000,
    maxEmptyScrolls: 6,
    maxConsecutiveErrors: 10,
    rateLimitCooldown: 60000,
    exportOnComplete: true,
  };

  const SEL = {
    unblockBtn:  ['[data-testid$="-unblock"]', 'button[aria-label*="Unblock"]', 'button[aria-label*="Blocked"]'],
    confirmBtn:  ['[data-testid="confirmationSheetConfirm"]'],
    userCell:    ['[data-testid="UserCell"]'],
    toast:       ['[data-testid="toast"]', '[role="alert"]'],
  };

  const $ = (s, c = document) => { for (const x of (Array.isArray(s) ? s : [s])) { const e = c.querySelector(x); if (e) return e; } return null; };
  const $$ = (s, c = document) => { for (const x of (Array.isArray(s) ? s : [s])) { const e = c.querySelectorAll(x); if (e.length) return [...e]; } return []; };
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const gaussian = (a, b) => Math.floor(a + ((Math.random() + Math.random()) / 2) * (b - a));
  const isRateLimited = () => { const t = $(SEL.toast); return t && /rate limit|try again|too many|slow down/i.test(t.textContent); };

  let paused = false, aborted = false;
  let unblocked = 0, skipped = 0, errors = 0, consecutiveErrors = 0;
  const startTime = Date.now();
  const unblockedLog = [];
  const processedUsers = new Set();
  const keepSet = new Set(CONFIG.keepBlocked.map(u => u.toLowerCase().replace(/^@/, '')));

  window.XActions = {
    pause()  { paused = true;  console.log('⏸️ Paused.'); },
    resume() { paused = false; console.log('▶️ Resumed.'); },
    abort()  { aborted = true; console.log('🛑 Aborting...'); },
    status() {
      const el = ((Date.now() - startTime) / 1000).toFixed(0);
      console.log(`📊 Unblocked: ${unblocked} | Skipped: ${skipped} | Errors: ${errors} | ${el}s`);
    },
  };

  const shouldContinue = async () => { while (paused && !aborted) await sleep(500); return !aborted; };

  const getUsername = (cell) => {
    const link = cell.querySelector('a[href^="/"]');
    if (link) {
      const match = (link.getAttribute('href') || '').match(/^\/([A-Za-z0-9_]+)/);
      if (match) return match[1];
    }
    const spans = cell.querySelectorAll('span');
    for (const s of spans) { const m = s.textContent.match(/^@([A-Za-z0-9_]+)$/); if (m) return m[1]; }
    return null;
  };

  const run = async () => {
    const W = 60;
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  🔓 MASS UNBLOCK USERS' + ' '.repeat(W - 24) + '║');
    console.log('║  by nichxbt — v2.0' + ' '.repeat(W - 21) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');

    if (!window.location.href.includes('/blocked')) {
      console.error('❌ Navigate to x.com/settings/blocked/all first!');
      return;
    }

    console.log(`⚙️ Max: ${CONFIG.maxUnblocks === Infinity ? '∞' : CONFIG.maxUnblocks} | Dry run: ${CONFIG.dryRun} | Keep blocked: ${keepSet.size}`);

    let emptyScrolls = 0;

    while (unblocked < CONFIG.maxUnblocks && emptyScrolls < CONFIG.maxEmptyScrolls) {
      if (!(await shouldContinue())) break;
      if (isRateLimited()) { console.warn('🚨 Rate limit!'); await sleep(CONFIG.rateLimitCooldown); continue; }

      const cells = $$(SEL.userCell);
      let foundNew = false;

      for (const cell of cells) {
        if (!(await shouldContinue())) break;
        if (unblocked >= CONFIG.maxUnblocks) break;

        const username = getUsername(cell);
        if (!username || processedUsers.has(username.toLowerCase())) continue;
        processedUsers.add(username.toLowerCase());
        foundNew = true;

        if (keepSet.has(username.toLowerCase())) {
          skipped++;
          console.log(`   🛡️ Keeping blocked: @${username}`);
          continue;
        }

        const btn = cell.querySelector('[data-testid$="-unblock"]') || cell.querySelector('button[aria-label*="Blocked"]');
        if (!btn) { errors++; consecutiveErrors++; continue; }

        if (CONFIG.dryRun) {
          console.log(`   🔍 Would unblock: @${username}`);
          unblockedLog.push({ username, timestamp: new Date().toISOString(), dryRun: true });
          unblocked++;
          continue;
        }

        try {
          btn.click();
          await sleep(gaussian(400, 700));
          const confirm = $(SEL.confirmBtn);
          if (confirm) { confirm.click(); await sleep(gaussian(300, 500)); }

          unblocked++;
          consecutiveErrors = 0;
          unblockedLog.push({ username, timestamp: new Date().toISOString() });

          if (unblocked % 10 === 0) {
            const rate = (unblocked / ((Date.now() - startTime) / 60000)).toFixed(1);
            console.log(`🔓 Unblocked ${unblocked} users | ${rate}/min`);
          }
          await sleep(gaussian(CONFIG.minDelay, CONFIG.maxDelay));
        } catch (e) {
          errors++;
          consecutiveErrors++;
          if (consecutiveErrors >= CONFIG.maxConsecutiveErrors) { console.error('❌ Too many errors.'); break; }
        }
      }

      if (consecutiveErrors >= CONFIG.maxConsecutiveErrors) break;
      if (!foundNew) emptyScrolls++; else emptyScrolls = 0;
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(gaussian(CONFIG.scrollDelay, CONFIG.scrollDelay + 800));
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    console.log('\n╔' + '═'.repeat(48) + '╗');
    console.log('║  📊 MASS UNBLOCK — RESULTS' + ' '.repeat(21) + '║');
    console.log('╠' + '═'.repeat(48) + '╣');
    console.log(`║  Unblocked:   ${String(unblocked).padEnd(31)}║`);
    console.log(`║  Skipped:     ${String(skipped).padEnd(31)}║`);
    console.log(`║  Errors:      ${String(errors).padEnd(31)}║`);
    console.log(`║  Duration:    ${(elapsed + 's').padEnd(31)}║`);
    console.log('╚' + '═'.repeat(48) + '╝');

    if (CONFIG.exportOnComplete && unblockedLog.length > 0) {
      const blob = new Blob([JSON.stringify({ summary: { unblocked, skipped, errors }, accounts: unblockedLog }, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `xactions-unblocked-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      console.log('📥 Results exported.');
    }
  };

  run();
})();

```

## ⚙️ Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `maxUnblocks` | `Infinity` | Max unblocks |
| `keepBlocked` | `[],` | Keep these users blocked (without @) |
| `dryRun` | `false` | Dry run |
| `minDelay` | `1000` | Min delay |
| `maxDelay` | `2800` | Max delay |
| `scrollDelay` | `2000` | Scroll delay |
| `maxEmptyScrolls` | `6` | Max empty scrolls |
| `maxConsecutiveErrors` | `10` | Max consecutive errors |
| `rateLimitCooldown` | `60000` | Rate limit cooldown |
| `exportOnComplete` | `true` | Export on complete |

---

## 📖 Step-by-Step Tutorial

### Step 1: Navigate to the right page

Open your browser and go to `x.com/settings/blocked`. Make sure you're logged in to your X/Twitter account.

### Step 2: Open the browser console

- **Chrome/Edge:** Press `F12` or `Ctrl+Shift+J` (Mac: `Cmd+Option+J`)
- **Firefox:** Press `F12` or `Ctrl+Shift+K`
- **Safari:** Enable Developer menu in Preferences → Advanced, then press `Cmd+Option+C`

### Step 3: Paste the script

Copy the entire script from [`browser/massUnblock.js`](https://github.com/nirholas/XActions/blob/main/browser/massUnblock.js) and paste it into the console.

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
| [`browser/massUnblock.js`](https://github.com/nirholas/XActions/blob/main/browser/massUnblock.js) | Main script |

---

## 🔗 Related Scripts

| Script | Description |
|--------|-------------|
| [Manage Muted Words](manage-muted-words.md) | Bulk add, remove, and manage muted words and phrases |
| [Mass Block](mass-block.md) | Block multiple accounts at once from a list or timeline |
| [Mute by Keywords](mute-by-keywords.md) | Mute users whose posts contain specific keywords |

---

> **Author:** nich ([@nichxbt](https://x.com/nichxbt)) — [XActions on GitHub](https://github.com/nirholas/XActions)
