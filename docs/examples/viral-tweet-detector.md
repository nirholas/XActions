# 🔥 Viral Tweet Detector

Scan your timeline to identify viral tweets. Detects high-engagement content based on likes, retweets, and reply ratios.

---

## 📋 What It Does

This script provides the following capabilities:

1. **Automated operation** — Runs directly in your browser console on x.com
2. **Configurable settings** — Customize behavior via the CONFIG object
3. **Real-time progress** — Shows live status updates with emoji-coded logs
4. **Rate limiting** — Built-in delays to respect X/Twitter's rate limits
5. **Data export** — Results exported as JSON/CSV for further analysis

**Use cases:**
- Scan your timeline to identify viral tweets. Detects high-engagement content based on likes, retweets, and reply ratios.
- Automate repetitive analytics tasks on X/Twitter
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
1. Go to `x.com (any timeline)`
2. Open browser console (`F12` → Console tab)
3. Copy and paste the script from [`src/viralTweetDetector.js`](https://github.com/nirholas/XActions/blob/main/src/viralTweetDetector.js)
4. Press Enter to run

```javascript
// Quick start — copy the full script from:
// src/viralTweetDetector.js
//
// Or install via npm and use the CLI:
// npm install -g xactions
// xactions --help
```

## ⚙️ Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `maxTweets` | `80` | max Tweets |
| `scrollRounds` | `5` | scroll Rounds |
| `scrollDelay` | `2000` | scroll Delay |
| `viralThreshold` | `2.0,` | Engagement rate % above which = viral |
| `velocityThreshold` | `50,` | Eng/hour above which = going viral |
| `exportResults` | `true` | export Results |

---

## 📖 Step-by-Step Tutorial

### Step 1: Navigate to the right page

Open your browser and go to `x.com (any timeline)`. Make sure you're logged in to your X/Twitter account.

### Step 2: Open the browser console

- **Chrome/Edge:** Press `F12` or `Ctrl+Shift+J` (Mac: `Cmd+Option+J`)
- **Firefox:** Press `F12` or `Ctrl+Shift+K`
- **Safari:** Enable Developer menu in Preferences → Advanced, then press `Cmd+Option+C`

### Step 3: Paste the script

Copy the entire script from [`src/viralTweetDetector.js`](https://github.com/nirholas/XActions/blob/main/src/viralTweetDetector.js) and paste it into the console.

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
| [`src/viralTweetDetector.js`](https://github.com/nirholas/XActions/blob/main/src/viralTweetDetector.js) | Main script |

---

## 🔗 Related Scripts

| Script | Description |
|--------|-------------|
| [Account Health Monitor](account-health-monitor.md) | Comprehensive health check for your X/Twitter account |
| [Audience Demographics](audience-demographics.md) | Analyze your follower demographics including bio keywords, locations, account age, and interests |
| [Audience Overlap](audience-overlap.md) | Compare the follower lists of two accounts to find audience overlap |
| [Engagement Leaderboard](engagement-leaderboard.md) | Analyze who engages most with your tweets |
| [Follower Growth Tracker](follower-growth-tracker.md) | Track your follower count over time |

---

> **Author:** nich ([@nichxbt](https://x.com/nichxbt)) — [XActions on GitHub](https://github.com/nirholas/XActions)
