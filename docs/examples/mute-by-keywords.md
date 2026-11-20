# 🔕 Mute by Keywords

Mute users whose posts contain specific keywords. Automatically filters noisy accounts from your timeline.

---

## 📋 What It Does

This script provides the following capabilities:

1. **Automated operation** — Runs directly in your browser console on x.com
2. **Configurable settings** — Customize behavior via the CONFIG object
3. **Real-time progress** — Shows live status updates with emoji-coded logs
4. **Rate limiting** — Built-in delays to respect X/Twitter's rate limits
5. **Data export** — Results exported as JSON/CSV for further analysis

**Use cases:**
- Mute users whose posts contain specific keywords. Automatically filters noisy accounts from your timeline.
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
1. Go to `x.com (any page)`
2. Open browser console (`F12` → Console tab)
3. Copy and paste the script from [`browser/muteByKeywords.js`](https://github.com/nirholas/XActions/blob/main/browser/muteByKeywords.js)
4. Press Enter to run

```javascript
// Mute Users by Keywords on X - by nichxbt
// https://github.com/nirholas/xactions
// 1. Go to any X timeline or search page
// 2. Open the Developer Console (F12)
// 3. Paste this into the Developer Console and run it
//
// Mutes users whose posts contain specified keywords
// Last Updated: 24 February 2026
(() => {
  const CONFIG = {
    keywords: [
      // Add keywords/phrases to match. Users posting these get muted.
      // 'spam',
      // 'giveaway',
      // 'follow for follow',
    ],
    maxMutes: 50,
    minDelay: 1500,
    maxDelay: 3000,
    scrollDelay: 2000,
    maxScrollAttempts: 20,
    caseSensitive: false,
  };

  const $tweet = 'article[data-testid="tweet"]';
  const $tweetText = '[data-testid="tweetText"]';
  const $moreButton = '[data-testid="caret"]'; // Three-dot on tweet
  const $muteOption = '[data-testid="muteLink"]';

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const randomDelay = () => Math.floor(Math.random() * (CONFIG.maxDelay - CONFIG.minDelay + 1)) + CONFIG.minDelay;

  const mutedUsers = new Set();
  const processedTweets = new Set();
  let scrollAttempts = 0;

  const matchesKeywords = (text) => {
    const t = CONFIG.caseSensitive ? text : text.toLowerCase();
    return CONFIG.keywords.some(kw => {
      const k = CONFIG.caseSensitive ? kw : kw.toLowerCase();
      return t.includes(k);
    });
  };

  const getUsernameFromTweet = (tweetEl) => {
    const link = tweetEl.querySelector('a[href^="/"][role="link"]');
    if (link) {
      const match = link.href.match(/x\.com\/([^\/]+)/);
      return match ? match[1] : null;
    }
    return null;
  };

  const run = async () => {
    console.log('🔇 MUTE BY KEYWORDS - XActions by nichxbt');

    if (CONFIG.keywords.length === 0) {
      console.error('❌ No keywords configured! Edit CONFIG.keywords array.');
      return;
    }

    console.log(`🔍 Keywords: ${CONFIG.keywords.join(', ')}`);
    console.log(`📊 Max mutes: ${CONFIG.maxMutes}`);

    while (mutedUsers.size < CONFIG.maxMutes && scrollAttempts < CONFIG.maxScrollAttempts) {
      const tweets = document.querySelectorAll($tweet);
      let foundNew = false;

      for (const tweet of tweets) {
        const tweetId = tweet.querySelector('a[href*="/status/"]')?.href || '';
        if (processedTweets.has(tweetId)) continue;
        processedTweets.add(tweetId);
        foundNew = true;

        const textEl = tweet.querySelector($tweetText);
        if (!textEl) continue;

        const text = textEl.textContent;
        if (!matchesKeywords(text)) continue;

        const username = getUsernameFromTweet(tweet);
        if (!username || mutedUsers.has(username)) continue;

        try {
          // Click the three-dot menu on the tweet
          const caret = tweet.querySelector($moreButton);
          if (!caret) continue;

          caret.click();
          await sleep(800);

          // Find and click mute option
          const muteLink = document.querySelector($muteOption);
          if (muteLink) {
            muteLink.click();
            mutedUsers.add(username);
            console.log(`🔇 Muted @${username} (matched: "${text.substring(0, 50)}...")`);
            await sleep(randomDelay());
          } else {
            // Close menu if mute not found
            document.body.click();
            await sleep(300);
          }
        } catch (e) {
          document.body.click();
          await sleep(300);
        }
      }

      if (!foundNew) scrollAttempts++;
      else scrollAttempts = 0;

      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    console.log(`\n✅ Done! Muted ${mutedUsers.size} users.`);
    console.log('Muted users:', [...mutedUsers].join(', '));
  };

  run();
})();

```

## ⚙️ Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `keywords` | `[` | Keywords |
| `maxMutes` | `50` | Max mutes |
| `minDelay` | `1500` | Min delay |
| `maxDelay` | `3000` | Max delay |
| `scrollDelay` | `2000` | Scroll delay |
| `maxScrollAttempts` | `20` | Max scroll attempts |
| `caseSensitive` | `false` | Case sensitive |

---

## 📖 Step-by-Step Tutorial

### Step 1: Navigate to the right page

Open your browser and go to `x.com (any page)`. Make sure you're logged in to your X/Twitter account.

### Step 2: Open the browser console

- **Chrome/Edge:** Press `F12` or `Ctrl+Shift+J` (Mac: `Cmd+Option+J`)
- **Firefox:** Press `F12` or `Ctrl+Shift+K`
- **Safari:** Enable Developer menu in Preferences → Advanced, then press `Cmd+Option+C`

### Step 3: Paste the script

Copy the entire script from [`browser/muteByKeywords.js`](https://github.com/nirholas/XActions/blob/main/browser/muteByKeywords.js) and paste it into the console.

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
| [`browser/muteByKeywords.js`](https://github.com/nirholas/XActions/blob/main/browser/muteByKeywords.js) | Main script |

---

## 🔗 Related Scripts

| Script | Description |
|--------|-------------|
| [Manage Muted Words](manage-muted-words.md) | Bulk add, remove, and manage muted words and phrases |
| [Mass Block](mass-block.md) | Block multiple accounts at once from a list or timeline |
| [Mass Unblock](mass-unblock.md) | Unblock all or selected users from your block list |

---

> **Author:** nich ([@nichxbt](https://x.com/nichxbt)) — [XActions on GitHub](https://github.com/nirholas/XActions)
