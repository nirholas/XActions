---
title: "Community Notes — Tutorial"
description: "View, write, and rate Community Notes on X/Twitter posts using XActions. Scan your timeline for noted tweets and contribute notes."
keywords: ["twitter community notes", "x community notes script", "rate community notes", "write community note", "xactions community notes"]
canonical: "https://xactions.app/examples/community-notes"
author: "nich (@nichxbt)"
date: "2026-03-30"
---

# Community Notes — Tutorial

> Step-by-step guide to viewing, writing, and rating Community Notes on X/Twitter posts using XActions.

**Works on:** Browser Console
**Difficulty:** Intermediate
**Time:** 5-15 minutes
**Requirements:** Logged into x.com, enrolled in Community Notes (for writing/rating)

---

## Prerequisites

- Logged into x.com in your browser
- Browser DevTools console (F12 or Cmd+Option+J on Mac)
- For writing/rating notes: enrolled in Community Notes at `x.com/i/communitynotes`
- For viewing notes: no special requirements

---

## Quick Start

1. Go to your timeline on x.com (or a specific tweet)
2. Open DevTools Console (F12, then click the **Console** tab)
3. Edit the `CONFIG` object to select your action (`view`, `write`, `rate`, or `browse`)
4. Set `dryRun: false` when ready to act
5. Paste the script and press **Enter**

---

## Configuration

```javascript
const CONFIG = {
  action: 'view',
  //   'view'   — view Community Notes on visible tweets
  //   'write'  — write a note on a specific tweet (requires tweetUrl)
  //   'rate'   — rate existing notes as helpful/not helpful
  //   'browse' — browse tweets with Community Notes on your timeline

  // Write parameters
  tweetUrl: '',                      // URL of tweet to add a note to
  noteText: '',                      // The note content to write
  noteClassification: 'misleading',  // 'misleading', 'not_misleading', 'might_be_misleading'

  // Rate parameters
  rateAsHelpful: true,               // true = helpful, false = not helpful

  // Browse settings
  maxTweets: 30,
  maxScrollAttempts: 20,

  // Timing
  scrollDelay: 2000,
  actionDelay: 2000,
  navigationDelay: 3000,
  typeCharDelay: 30,

  // Safety
  dryRun: true,
};
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `action` | string | `'view'` | What to do: `view`, `write`, `rate`, or `browse` |
| `tweetUrl` | string | `''` | Tweet URL for writing a note |
| `noteText` | string | `''` | Content of the note to write |
| `noteClassification` | string | `'misleading'` | Classification: `misleading`, `not_misleading`, `might_be_misleading` |
| `rateAsHelpful` | boolean | `true` | Rate notes as helpful (true) or not helpful (false) |
| `maxTweets` | number | `30` | Max tweets to scan |
| `dryRun` | boolean | `true` | Preview mode -- set `false` to actually act |

---

## Step-by-Step Guide

### Action 1: View Community Notes on Your Timeline

Scan your timeline for tweets that have Community Notes attached:

```javascript
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  console.log('📝 VIEW COMMUNITY NOTES - XActions by nichxbt');

  const SEL = {
    communityNote: '[data-testid="communityNote"]',
    tweet: 'article[data-testid="tweet"]',
    tweetText: '[data-testid="tweetText"]',
    userName: '[data-testid="User-Name"]',
  };

  const processedTweets = new Set();
  let notesFound = 0;
  let tweetsScanned = 0;
  const maxScrollAttempts = 20;

  for (let scroll = 0; scroll < maxScrollAttempts; scroll++) {
    const tweets = document.querySelectorAll(SEL.tweet);

    for (const tweet of tweets) {
      const link = tweet.querySelector('a[href*="/status/"]')?.href || '';
      if (!link || processedTweets.has(link)) continue;
      processedTweets.add(link);
      tweetsScanned++;

      const note = tweet.querySelector(SEL.communityNote);
      if (note) {
        const noteText = note.textContent?.trim() || '';
        const author = tweet.querySelector(SEL.userName + ' a')?.textContent || '';
        const tweetText = tweet.querySelector(SEL.tweetText)?.textContent || '';

        notesFound++;
        console.log(`📝 Note #${notesFound} found on tweet by ${author}:`);
        console.log(`   Tweet: "${tweetText.slice(0, 80)}..."`);
        console.log(`   Note: "${noteText.slice(0, 150)}..."`);
        console.log(`   Link: ${link}`);
        console.log('');
      }
    }

    window.scrollBy(0, 600);
    await sleep(2000);
  }

  console.log(`✅ Scanned ${tweetsScanned} tweets, found ${notesFound} Community Notes`);
})();
```

### Expected Output (View)

```
📝 VIEW COMMUNITY NOTES - XActions by nichxbt
📝 Note #1 found on tweet by @example_user:
   Tweet: "Breaking: Major event happened today that changes everything about..."
   Note: "This claim is missing important context. According to official sources..."
   Link: https://x.com/example_user/status/1234567890

📝 Note #2 found on tweet by @news_account:
   Tweet: "CONFIRMED: New policy announced that will affect all users..."
   Note: "While a policy was announced, the claim about affecting all users is..."
   Link: https://x.com/news_account/status/0987654321

✅ Scanned 45 tweets, found 2 Community Notes
```

### Action 2: Write a Community Note

To write a note on a specific tweet (requires Community Notes enrollment):

```javascript
(async () => {
  const CONFIG = {
    tweetUrl: 'https://x.com/example/status/1234567890',
    noteText: 'This claim lacks important context. According to the official source (link), the actual data shows a different conclusion.',
    noteClassification: 'misleading',
    dryRun: true,  // Set to false when ready
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  console.log('✍️ WRITE COMMUNITY NOTE - XActions by nichxbt');

  if (!CONFIG.tweetUrl) {
    console.error('❌ Set CONFIG.tweetUrl to the tweet you want to annotate');
    return;
  }
  if (!CONFIG.noteText) {
    console.error('❌ Set CONFIG.noteText with your note content');
    return;
  }

  if (CONFIG.dryRun) {
    console.log('⚠️ DRY RUN — preview only');
    console.log(`📋 Tweet: ${CONFIG.tweetUrl}`);
    console.log(`📋 Classification: ${CONFIG.noteClassification}`);
    console.log(`📋 Note: "${CONFIG.noteText}"`);
    console.log('💡 Set dryRun: false to actually submit');
    return;
  }

  // Navigate to the tweet
  if (window.location.href !== CONFIG.tweetUrl) {
    window.location.href = CONFIG.tweetUrl;
    console.log('🔄 Navigating to tweet... Re-run after page loads.');
    return;
  }

  await sleep(3000);

  // Find the tweet and open the more menu
  const tweet = document.querySelector('article[data-testid="tweet"]');
  if (!tweet) {
    console.error('❌ Could not find the tweet');
    return;
  }

  const caretBtn = tweet.querySelector('[data-testid="caret"]');
  if (caretBtn) {
    caretBtn.click();
    await sleep(2000);

    const menuItems = [...document.querySelectorAll('[role="menuitem"]')];
    const writeBtn = menuItems.find(item =>
      item.textContent.toLowerCase().includes('note') ||
      item.textContent.toLowerCase().includes('community note')
    );

    if (writeBtn) {
      writeBtn.click();
      await sleep(3000);
      console.log('✅ Opened note writing form');
      console.log('💡 Complete the form manually with your note text');
    } else {
      console.log('❌ "Write a note" option not found in menu');
      console.log('💡 Ensure you are enrolled at x.com/i/communitynotes');
    }
  }
})();
```

### Action 3: Rate Existing Notes

Scroll through your timeline and rate Community Notes as helpful or not helpful:

```javascript
(async () => {
  const CONFIG = {
    rateAsHelpful: true,
    maxScrollAttempts: 15,
    dryRun: true,
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  console.log(`📝 RATE COMMUNITY NOTES - XActions by nichxbt`);
  console.log(`Rating as: ${CONFIG.rateAsHelpful ? 'Helpful' : 'Not Helpful'}`);

  if (CONFIG.dryRun) {
    console.log('⚠️ DRY RUN — will scan but not rate');
  }

  const processedTweets = new Set();
  let notesRated = 0;

  for (let scroll = 0; scroll < CONFIG.maxScrollAttempts; scroll++) {
    const tweets = document.querySelectorAll('article[data-testid="tweet"]');

    for (const tweet of tweets) {
      const link = tweet.querySelector('a[href*="/status/"]')?.href || '';
      if (!link || processedTweets.has(link)) continue;
      processedTweets.add(link);

      const note = tweet.querySelector('[data-testid="communityNote"]');
      if (!note) continue;

      const rateBtn = note.querySelector('[data-testid="rateNote"]')
        || note.querySelector('[aria-label*="ate"], [aria-label*="elpful"]');

      if (rateBtn) {
        const author = tweet.querySelector('[data-testid="User-Name"] a')?.textContent || '';
        console.log(`📝 Found note on tweet by ${author}`);

        if (!CONFIG.dryRun) {
          rateBtn.click();
          await sleep(2000);

          const options = [...document.querySelectorAll('[role="radio"], [role="option"], button')];
          const targetText = CONFIG.rateAsHelpful ? 'helpful' : 'not helpful';
          const targetOption = options.find(opt =>
            opt.textContent?.toLowerCase()?.includes(targetText)
          );

          if (targetOption) {
            targetOption.click();
            await sleep(2000);

            const submitBtn = document.querySelector('[data-testid="submitRating"], button[type="submit"]');
            if (submitBtn) submitBtn.click();
          }
        }

        notesRated++;
        console.log(`   ✅ ${CONFIG.dryRun ? 'Would rate' : 'Rated'} as ${CONFIG.rateAsHelpful ? 'helpful' : 'not helpful'} (${notesRated})`);
      }
    }

    window.scrollBy(0, 600);
    await sleep(2000);
  }

  console.log(`\n✅ ${CONFIG.dryRun ? 'Found' : 'Rated'} ${notesRated} Community Notes`);
})();
```

### Action 4: Browse and Export Noted Tweets

Browse your timeline and export all noted tweets as JSON:

```javascript
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  console.log('🔍 BROWSE COMMUNITY NOTES - XActions by nichxbt');
  console.log('💡 Tip: Visit x.com/i/communitynotes for the full dashboard');

  const notedTweets = [];
  const processedTweets = new Set();

  for (let scroll = 0; scroll < 20; scroll++) {
    const tweets = document.querySelectorAll('article[data-testid="tweet"]');

    for (const tweet of tweets) {
      const link = tweet.querySelector('a[href*="/status/"]')?.href || '';
      if (!link || processedTweets.has(link)) continue;
      processedTweets.add(link);

      const note = tweet.querySelector('[data-testid="communityNote"]');
      if (note) {
        notedTweets.push({
          tweetLink: link,
          author: tweet.querySelector('[data-testid="User-Name"] a')?.textContent || '',
          tweetText: tweet.querySelector('[data-testid="tweetText"]')?.textContent?.slice(0, 200) || '',
          noteText: note.textContent?.trim()?.slice(0, 300) || '',
        });
      }
    }

    window.scrollBy(0, 600);
    await sleep(2000);
  }

  console.log(`\n📋 Found ${notedTweets.length} noted tweets`);

  if (notedTweets.length > 0) {
    console.log(JSON.stringify(notedTweets, null, 2));

    // Auto-download
    const blob = new Blob([JSON.stringify(notedTweets, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `community-notes-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    console.log('📥 Exported to JSON');
  }
})();
```

---

## Tips & Tricks

1. **Enrollment required for writing** -- You must enroll at `x.com/i/communitynotes` before you can write or rate notes. Viewing notes does not require enrollment.

2. **Note quality matters** -- Community Notes uses a consensus-based ranking system. Notes rated helpful by people across different perspectives are more likely to be shown.

3. **Include sources** -- When writing a note, always include links to authoritative sources. Notes with citations are rated more favorably.

4. **Abort at any time** -- If the full script from `browser/communityNotes.js` is running, type `XActions.abort()` in the console to stop it.

5. **Check status** -- While the script is running, type `XActions.status()` to see progress.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Write a note" not in menu | You need to be enrolled in Community Notes. Visit `x.com/i/communitynotes` to sign up. |
| No notes found on timeline | Community Notes are not on every tweet. Try scrolling through more content or visit trending topics. |
| Rate button not found | The rate option may appear differently. Try clicking on the note itself to expand rating options. |
| Script stops early | X rate-limits scrolling. Wait a few seconds and re-run. |
| Page reload interrupts script | The `write` action may require a page reload. Re-run the script after the page loads. |

---

## Related Scripts

| Feature | Script | Description |
|---------|--------|-------------|
| Tweet Scraping | `src/scrapers/twitter/index.js` | Scrape tweet content and metadata |
| Auto Commenter | `src/autoCommenter.js` | Automate replies to tweets |
| View Analytics | `browser/viewAnalytics.js` | View engagement metrics on your posts |

---

<footer>
Built with XActions by <a href="https://x.com/nichxbt">@nichxbt</a> · <a href="https://xactions.app">xactions.app</a> · <a href="https://github.com/nichxbt/xactions">GitHub</a>
</footer>
