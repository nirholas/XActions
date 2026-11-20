# 🔇 Manage Muted Words

Bulk add, remove, and manage muted words and phrases. Filter out unwanted content from your timeline.

---

## 📋 What It Does

This script provides the following capabilities:

1. **Automated operation** — Runs directly in your browser console on x.com
2. **Configurable settings** — Customize behavior via the CONFIG object
3. **Real-time progress** — Shows live status updates with emoji-coded logs
4. **Rate limiting** — Built-in delays to respect X/Twitter's rate limits
5. **Data export** — Results exported as JSON/CSV for further analysis

**Use cases:**
- Bulk add, remove, and manage muted words and phrases. Filter out unwanted content from your timeline.
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
1. Go to `x.com/settings/muted_keywords`
2. Open browser console (`F12` → Console tab)
3. Copy and paste the script from [`browser/manageMutedWords.js`](https://github.com/nirholas/XActions/blob/main/browser/manageMutedWords.js)
4. Press Enter to run

```javascript
// Manage Muted Words on X - by nichxbt
// https://github.com/nirholas/xactions
// Bulk-add or manage muted words for filtering your timeline
// 1. Go to https://x.com/settings/muted_keywords
// 2. Open the Developer Console (F12)
// 3. Edit the CONFIG below
// 4. Paste this into the Developer Console and run it
//
// Last Updated: 24 February 2026
(() => {
  const CONFIG = {
    // Words/phrases to mute
    wordsToMute: [
      // 'crypto scam',
      // 'follow for follow',
      // 'giveaway',
      // 'dm me',
    ],
    // Duration: 'forever', '24h', '7d', '30d'
    duration: 'forever',
    // Mute from: 'everyone' or 'people_you_dont_follow'
    muteFrom: 'everyone',
    actionDelay: 2000,
    dryRun: true,
  };

  const $addMutedWord = '[data-testid="addMutedWord"]';
  const $mutedWordInput = 'input[name="keyword"]';
  const $saveButton = '[data-testid="settingsSave"]';

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const results = { muted: [], failed: [] };

  const run = async () => {
    console.log('🔇 MANAGE MUTED WORDS - XActions by nichxbt');

    if (CONFIG.wordsToMute.length === 0) {
      console.error('❌ No words to mute! Edit CONFIG.wordsToMute array.');
      return;
    }

    console.log(`📋 Words to mute: ${CONFIG.wordsToMute.length}`);
    CONFIG.wordsToMute.forEach((w, i) => console.log(`   ${i + 1}. "${w}"`));
    console.log(`   ⏱️ Duration: ${CONFIG.duration}`);
    console.log(`   👤 From: ${CONFIG.muteFrom}`);

    if (CONFIG.dryRun) {
      console.log('\n⚠️ DRY RUN MODE - Set CONFIG.dryRun = false to actually mute');
      return;
    }

    if (!window.location.href.includes('/muted_keywords') && !window.location.href.includes('/muted')) {
      console.error('❌ Navigate to x.com/settings/muted_keywords first!');
      return;
    }

    for (const word of CONFIG.wordsToMute) {
      try {
        // Click "+" or "Add" button
        const addBtn = document.querySelector($addMutedWord);
        if (addBtn) {
          addBtn.click();
          await sleep(1000);
        }

        // Type the word
        const input = document.querySelector($mutedWordInput);
        if (!input) {
          console.error('❌ Muted word input not found');
          results.failed.push(word);
          continue;
        }

        input.focus();
        input.value = '';
        document.execCommand('insertText', false, word);
        await sleep(500);

        // Set duration (click appropriate radio/option)
        const durationOptions = document.querySelectorAll('[role="radio"], [role="option"]');
        for (const opt of durationOptions) {
          const text = opt.textContent.toLowerCase();
          if (
            (CONFIG.duration === 'forever' && text.includes('forever')) ||
            (CONFIG.duration === '24h' && text.includes('24')) ||
            (CONFIG.duration === '7d' && text.includes('7')) ||
            (CONFIG.duration === '30d' && text.includes('30'))
          ) {
            opt.click();
            break;
          }
        }
        await sleep(300);

        // Save
        const saveBtn = document.querySelector($saveButton);
        if (saveBtn) {
          saveBtn.click();
          results.muted.push(word);
          console.log(`🔇 Muted: "${word}"`);
        } else {
          results.failed.push(word);
        }

        await sleep(CONFIG.actionDelay);
      } catch (e) {
        results.failed.push(word);
        console.warn(`⚠️ Failed to mute: "${word}"`);
      }
    }

    console.log('\n📊 RESULTS:');
    console.log(`   🔇 Muted: ${results.muted.length}`);
    console.log(`   ❌ Failed: ${results.failed.length}`);
  };

  run();
})();

```

## ⚙️ Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `wordsToMute` | `[` | Words to mute |
| `duration` | `'forever'` | Duration |
| `muteFrom` | `'everyone'` | Mute from |
| `actionDelay` | `2000` | Action delay |
| `dryRun` | `true` | Dry run |

---

## 📖 Step-by-Step Tutorial

### Step 1: Navigate to the right page

Open your browser and go to `x.com/settings/muted_keywords`. Make sure you're logged in to your X/Twitter account.

### Step 2: Open the browser console

- **Chrome/Edge:** Press `F12` or `Ctrl+Shift+J` (Mac: `Cmd+Option+J`)
- **Firefox:** Press `F12` or `Ctrl+Shift+K`
- **Safari:** Enable Developer menu in Preferences → Advanced, then press `Cmd+Option+C`

### Step 3: Paste the script

Copy the entire script from [`browser/manageMutedWords.js`](https://github.com/nirholas/XActions/blob/main/browser/manageMutedWords.js) and paste it into the console.

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
| [`browser/manageMutedWords.js`](https://github.com/nirholas/XActions/blob/main/browser/manageMutedWords.js) | Main script |

---

## 🔗 Related Scripts

| Script | Description |
|--------|-------------|
| [Mass Block](mass-block.md) | Block multiple accounts at once from a list or timeline |
| [Mass Unblock](mass-unblock.md) | Unblock all or selected users from your block list |
| [Mute by Keywords](mute-by-keywords.md) | Mute users whose posts contain specific keywords |

---

> **Author:** nich ([@nichxbt](https://x.com/nichxbt)) — [XActions on GitHub](https://github.com/nirholas/XActions)
