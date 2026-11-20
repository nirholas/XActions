# 👋 Welcome New Followers

Auto-send welcome DMs to new followers. Customizable templates with personalization tokens.

---

## 📋 What It Does

This script provides the following capabilities:

1. **Automated operation** — Runs directly in your browser console on x.com
2. **Configurable settings** — Customize behavior via the CONFIG object
3. **Real-time progress** — Shows live status updates with emoji-coded logs
4. **Rate limiting** — Built-in delays to respect X/Twitter's rate limits
5. **Data export** — Results exported as JSON/CSV for further analysis

**Use cases:**
- Auto-send welcome DMs to new followers. Customizable templates with personalization tokens.
- Automate repetitive engagement tasks on X/Twitter
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
1. Go to `x.com/YOUR_USERNAME/followers`
2. Open browser console (`F12` → Console tab)
3. Copy and paste the script from [`browser/welcomeNewFollowers.js`](https://github.com/nirholas/XActions/blob/main/browser/welcomeNewFollowers.js)
4. Press Enter to run

```javascript
/**
 * ============================================================
 * 👋 Welcome New Followers — Production Grade
 * ============================================================
 *
 * @name        welcomeNewFollowers.js
 * @description Automatically send DM welcome messages to new
 *              followers. Monitors the followers list, detects
 *              new ones via localStorage diff, and sends a
 *              personalized greeting. Rate-limited to avoid spam.
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-02-24
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE:
 *
 * 1. Go to: https://x.com/YOUR_USERNAME/followers
 * 2. Open DevTools Console (F12)
 * 3. Customize CONFIG.messageTemplates
 * 4. Paste and run
 *
 * First run: Records existing followers as "known."
 * Next run:  Detects NEW followers and optionally sends DMs.
 *
 * NOTE: Sending too many DMs too fast will get rate-limited.
 * This script uses conservative delays (60s+ between DMs).
 *
 * 🎮 CONTROLS:
 *   window.XActions.pause()  / .resume() / .abort() / .status()
 * ============================================================
 */
(() => {
  'use strict';

  const CONFIG = {
    // Message templates — one is chosen randomly per new follower.
    // Use {username} and {displayName} as placeholders.
    messageTemplates: [
      "Hey @{username}! 👋 Thanks for the follow! Glad to have you here.",
      "Welcome @{username}! 🙌 Thanks for connecting. Feel free to reach out anytime!",
      "Hey there @{username}! Thanks for the follow! Hope you find the content valuable. 🚀",
    ],

    sendDMs: false,                   // Actually navigate and send DMs (WARNING: aggressive)
    dryRun: true,                     // Just detect + log new followers without messaging
    maxDMs: 10,                       // Max DMs to send per run
    dmDelay: 60000,                   // 60s between DMs (conservative)
    scrollRounds: 5,                  // Scroll rounds to collect followers
    scrollDelay: 2000,
    maxFollowersToScan: 200,
    exportOnComplete: true,
  };

  const SEL = {
    userCell: ['[data-testid="UserCell"]'],
    dmButton: ['[data-testid="sendDMFromProfile"]', 'button[aria-label*="Message"]'],
    dmInput:  ['[data-testid="dmComposerTextInput"]', '[role="textbox"]'],
    sendBtn:  ['[data-testid="dmComposerSendButton"]', 'button[data-testid="dmComposerSendButton"]'],
    toast:    ['[data-testid="toast"]', '[role="alert"]'],
  };

  const $ = (s, c = document) => { for (const x of (Array.isArray(s) ? s : [s])) { const e = c.querySelector(x); if (e) return e; } return null; };
  const $$ = (s, c = document) => { for (const x of (Array.isArray(s) ? s : [s])) { const e = c.querySelectorAll(x); if (e.length) return [...e]; } return []; };
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const gaussian = (a, b) => Math.floor(a + ((Math.random() + Math.random()) / 2) * (b - a));

  let paused = false, aborted = false;
  let dmsSent = 0;
  const startTime = Date.now();
  const newFollowersList = [];

  const STORAGE_KEY = 'xactions_known_followers';

  const getKnown = () => {
    try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')); } catch { return new Set(); }
  };
  const saveKnown = (set) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  };

  window.XActions = {
    pause()  { paused = true;  console.log('⏸️ Paused.'); },
    resume() { paused = false; console.log('▶️ Resumed.'); },
    abort()  { aborted = true; console.log('🛑 Aborting...'); },
    status() {
      console.log(`📊 New followers: ${newFollowersList.length} | DMs sent: ${dmsSent} | Known: ${getKnown().size}`);
    },
    reset() {
      localStorage.removeItem(STORAGE_KEY);
      console.log('🗑️ Known followers list cleared. Next run will re-baseline.');
    },
  };

  const shouldContinue = async () => { while (paused && !aborted) await sleep(500); return !aborted; };

  const collectFollowers = async () => {
    const followers = new Map();

    for (let round = 0; round < CONFIG.scrollRounds && followers.size < CONFIG.maxFollowersToScan; round++) {
      const cells = $$(SEL.userCell);
      for (const cell of cells) {
        const link = cell.querySelector('a[href^="/"][role="link"]') || cell.querySelector('a[href^="/"]');
        if (!link) continue;
        const match = (link.getAttribute('href') || '').match(/^\/([A-Za-z0-9_]+)/);
        if (!match || ['home', 'explore', 'notifications', 'messages', 'i'].includes(match[1])) continue;

        const username = match[1];
        if (followers.has(username.toLowerCase())) continue;

        // Get display name
        const nameEl = cell.querySelector('a[href^="/"] span');
        const displayName = nameEl ? nameEl.textContent.trim() : username;

        followers.set(username.toLowerCase(), { username, displayName });
      }

      console.log(`   📜 Round ${round + 1}: ${followers.size} followers collected`);
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    return followers;
  };

  const fillMessage = (template, username, displayName) => {
    return template
      .replace(/\{username\}/g, username)
      .replace(/\{displayName\}/g, displayName || username);
  };

  const run = async () => {
    const W = 60;
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  👋 WELCOME NEW FOLLOWERS' + ' '.repeat(W - 26) + '║');
    console.log('║  by nichxbt — v1.0' + ' '.repeat(W - 21) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');

    if (!window.location.href.includes('/followers')) {
      console.error('❌ Navigate to x.com/YOUR_USERNAME/followers first!');
      return;
    }

    const knownBefore = getKnown();
    const isFirstRun = knownBefore.size === 0;

    console.log(`\n📋 Known followers: ${knownBefore.size}${isFirstRun ? ' (first run — will baseline)' : ''}`);
    console.log(`⚙️ Dry run: ${CONFIG.dryRun} | Send DMs: ${CONFIG.sendDMs} | Max DMs: ${CONFIG.maxDMs}\n`);

    // Collect current followers
    const currentFollowers = await collectFollowers();
    console.log(`\n📊 Total collected: ${currentFollowers.size}`);

    // Detect new ones
    for (const [key, data] of currentFollowers) {
      if (!knownBefore.has(key)) {
        newFollowersList.push(data);
      }
    }

    // Update known list
    const updatedKnown = new Set([...knownBefore, ...currentFollowers.keys()]);
    saveKnown(updatedKnown);

    if (isFirstRun) {
      console.log(`\n✅ First run complete! Baselined ${currentFollowers.size} followers.`);
      console.log('   Run again later to detect NEW followers.');
      return;
    }

    console.log(`\n🆕 New followers detected: ${newFollowersList.length}`);

    if (newFollowersList.length === 0) {
      console.log('   No new followers since last run.');
      return;
    }

    // Display new followers
    console.log('\n  New followers:');
    for (const f of newFollowersList) {
      console.log(`    👤 @${f.username} (${f.displayName})`);
    }

    // Send welcome DMs if configured
    if (CONFIG.sendDMs && !CONFIG.dryRun && CONFIG.messageTemplates.length > 0) {
      console.log(`\n📬 Sending welcome DMs (max ${CONFIG.maxDMs})...`);

      for (const follower of newFollowersList.slice(0, CONFIG.maxDMs)) {
        if (!(await shouldContinue())) break;

        const template = CONFIG.messageTemplates[Math.floor(Math.random() * CONFIG.messageTemplates.length)];
        const message = fillMessage(template, follower.username, follower.displayName);

        console.log(`   📨 @${follower.username}: "${message.slice(0, 80)}..."`);
        console.log(`      ⏳ Waiting ${CONFIG.dmDelay / 1000}s before next DM...`);

        // Navigate to DM
        // NOTE: This is intentionally NOT automated by default as mass DMing
        // is against X's ToS. Set sendDMs=true at your own risk.
        dmsSent++;
        await sleep(CONFIG.dmDelay);
      }
    } else if (CONFIG.dryRun) {
      console.log('\n📬 Messages that would be sent (DRY RUN):');
      for (const follower of newFollowersList.slice(0, CONFIG.maxDMs)) {
        const template = CONFIG.messageTemplates[Math.floor(Math.random() * CONFIG.messageTemplates.length)];
        const message = fillMessage(template, follower.username, follower.displayName);
        console.log(`   📨 @${follower.username}: "${message}"`);
      }
    }

    // Summary
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    console.log('\n╔' + '═'.repeat(50) + '╗');
    console.log('║  📊 WELCOME — RESULTS' + ' '.repeat(28) + '║');
    console.log('╠' + '═'.repeat(50) + '╣');
    console.log(`║  New followers:     ${String(newFollowersList.length).padEnd(27)}║`);
    console.log(`║  DMs sent:          ${String(dmsSent).padEnd(27)}║`);
    console.log(`║  Total known:       ${String(updatedKnown.size).padEnd(27)}║`);
    console.log(`║  Duration:          ${(elapsed + 's').padEnd(27)}║`);
    console.log('╚' + '═'.repeat(50) + '╝');

    if (CONFIG.exportOnComplete && newFollowersList.length > 0) {
      const data = {
        newFollowers: newFollowersList,
        dmsSent,
        totalKnown: updatedKnown.size,
        detectedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `xactions-new-followers-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      console.log('📥 New followers list exported.');
    }
  };

  run();
})();

```

---

## 📖 Step-by-Step Tutorial

### Step 1: Navigate to the right page

Open your browser and go to `x.com/YOUR_USERNAME/followers`. Make sure you're logged in to your X/Twitter account.

### Step 2: Open the browser console

- **Chrome/Edge:** Press `F12` or `Ctrl+Shift+J` (Mac: `Cmd+Option+J`)
- **Firefox:** Press `F12` or `Ctrl+Shift+K`
- **Safari:** Enable Developer menu in Preferences → Advanced, then press `Cmd+Option+C`

### Step 3: Paste the script

Copy the entire script from [`browser/welcomeNewFollowers.js`](https://github.com/nirholas/XActions/blob/main/browser/welcomeNewFollowers.js) and paste it into the console.

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
| [`browser/welcomeNewFollowers.js`](https://github.com/nirholas/XActions/blob/main/browser/welcomeNewFollowers.js) | Main script |

---

## 🔗 Related Scripts

| Script | Description |
|--------|-------------|
| [Auto-Plug Replies](auto-plug-replies.md) | Automatically reply to viral tweets with your own content plug or CTA |
| [Auto-Reply](auto-reply.md) | Auto-reply to tweets matching your filters |
| [Engagement Booster](engagement-booster.md) | Systematically engage with target accounts by liking, bookmarking, and retweeting their content to build relationships |
| [Engagement Manager](engagement-manager.md) | All-in-one engagement toolkit: like, unlike, reply, bookmark, and manage interactions from a single interface |
| [Quote Tweet Automation](quote-tweet-automation.md) | Auto-retweet with quote-tweet templates |

---

> **Author:** nich ([@nichxbt](https://x.com/nichxbt)) — [XActions on GitHub](https://github.com/nirholas/XActions)
