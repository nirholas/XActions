# ❤️ Keyword Liker

Like posts matching specific keywords. Enter keywords via a UI prompt and auto-like matching tweets.

---

## 📋 What It Does

This script provides the following capabilities:

1. **Automated operation** — Runs directly in your browser console on x.com
2. **Configurable settings** — Customize behavior via the CONFIG object
3. **Real-time progress** — Shows live status updates with emoji-coded logs
4. **Rate limiting** — Built-in delays to respect X/Twitter's rate limits
5. **Data export** — Results exported as JSON/CSV for further analysis

**Use cases:**
- Like posts matching specific keywords. Enter keywords via a UI prompt and auto-like matching tweets.
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
1. Go to `x.com/search?q=keyword`
2. Open browser console (`F12` → Console tab)
3. Copy and paste the script from [`scripts/keywordLiker.js`](https://github.com/nirholas/XActions/blob/main/scripts/keywordLiker.js)
4. Press Enter to run

```javascript
// Quick start — copy the full script from:
// scripts/keywordLiker.js
//
// Or install via npm and use the CLI:
// npm install -g xactions
// xactions --help
```

## ⚙️ Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `maxLikes` | `50,` | Stop after this many likes |
| `delayBetween` | `[2000, 5000],` | Random delay between likes (ms) |
| `scrollRounds` | `20,` | How many scroll cycles to do |
| `scrollDelay` | `2500,` | Pause after each scroll (ms) |
| `dryRun` | `false,` | Set true to preview without actually liking |

---

## 📖 Step-by-Step Tutorial

### Step 1: Navigate to the right page

Open your browser and go to `x.com/search?q=keyword`. Make sure you're logged in to your X/Twitter account.

### Step 2: Open the browser console

- **Chrome/Edge:** Press `F12` or `Ctrl+Shift+J` (Mac: `Cmd+Option+J`)
- **Firefox:** Press `F12` or `Ctrl+Shift+K`
- **Safari:** Enable Developer menu in Preferences → Advanced, then press `Cmd+Option+C`

### Step 3: Paste the script

Copy the entire script from [`scripts/keywordLiker.js`](https://github.com/nirholas/XActions/blob/main/scripts/keywordLiker.js) and paste it into the console.

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
| [`scripts/keywordLiker.js`](https://github.com/nirholas/XActions/blob/main/scripts/keywordLiker.js) | Main script |

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
