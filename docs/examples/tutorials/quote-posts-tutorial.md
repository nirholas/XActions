# Quote Posts -- Tutorial

> Step-by-step guide to quote tweeting on X using XActions browser scripts.

## Prerequisites
- Logged into x.com in your browser
- Browser DevTools console (F12 -> Console tab)

## Quick Start
1. Navigate to a search result, user timeline, or list on x.com
2. Open DevTools (F12) and go to the Console tab
3. Copy the contents of `browser/quoteTweetAutomation.js`
4. Edit the `CONFIG` section (templates, keywords, dryRun)
5. Paste into the console and press Enter

## Configuration

### Templates

Templates define the commentary added to each quote tweet. The script rotates through them:

```js
templates: [
  'This is so underrated. Everyone needs to see this.',
  'Saving this for later -- great insight here.',
  'Couldn\'t agree more. Well said.',
],
```

You can use `{author}` and `{text}` placeholders:

```js
templates: [
  'Great take by {author}!',
  'This is key: "{text}" -- worth reading.',
],
```

### Keyword Filters

```js
onlyKeywords: ['AI', 'machine learning'],  // Only quote tweets with these words
skipKeywords: ['ad', 'promoted', 'giveaway', 'dm me'],  // Never quote these
```

### Full CONFIG Options

| Option | Default | Description |
|--------|---------|-------------|
| `maxQuotes` | `5` | Max quote tweets per session (keep low) |
| `dryRun` | `true` | Preview mode -- no tweets are posted |
| `templates` | 3 defaults | Array of commentary strings |
| `onlyKeywords` | `[]` | Only quote tweets containing these (empty = all) |
| `skipKeywords` | spam terms | Skip tweets containing these |
| `skipRetweeted` | `true` | Skip already-retweeted posts |
| `minEngagement` | `0` | Minimum likes + retweets to qualify |
| `delayBetween` | `[45000, 90000]` | 45-90 second delay between quotes |
| `typeDelay` | `[50, 150]` | Per-character typing speed (ms) |
| `scrollRounds` | `3` | How many scroll rounds to collect targets |

## Step-by-Step Guide

### Step 1: Dry Run First

Always start with `dryRun: true` (the default):

```js
const CONFIG = {
  maxQuotes: 3,
  dryRun: true,
  templates: [
    'This deserves more attention.',
    'Solid insight. Worth a read.',
  ],
  onlyKeywords: ['AI agents'],
};
```

Paste the script. The console shows what it would do:

```
Collecting target tweets...
  Round 1: 4 eligible tweets
  Round 2: 7 eligible tweets

Found 7 eligible. Processing 3.

[1/3] Quote-tweeting "Just launched our new AI agent..." (by @someuser)
  Typing: "This deserves more attention."
  DRY RUN -- would post now. Closing dialog...
```

### Step 2: Go Live

Change `dryRun` to `false`:

```js
dryRun: false,
```

The script will open the quote dialog, type your template text character by character (human-like), and click the post button.

### Step 3: Control the Script

While running:

```js
XActions.pause();   // Pause after current action
XActions.resume();  // Continue
XActions.abort();   // Stop permanently
```

### Step 4: Review Results

A JSON file is auto-downloaded with your quote tweet log:

```json
[
  {
    "author": "someuser",
    "text": "Just launched our new AI agent framework...",
    "template": "This deserves more attention.",
    "engagement": 42,
    "quotedAt": "2026-03-30T10:15:00.000Z"
  }
]
```

### Using Templates with Placeholders

```js
templates: [
  '{author} nailed it with this take.',
  'Key insight: "{text}" -- read the rest.',
  'This is exactly what I was thinking. Great thread.',
],
```

`{author}` is replaced with the tweet author's display name. `{text}` is replaced with the first 50 characters of the tweet text.

### Targeting High-Engagement Posts

To only quote posts that already have traction:

```js
minEngagement: 50,  // Minimum combined likes + retweets
```

## Tips & Tricks

- **Keep `maxQuotes` low** (3-5). Excessive quote tweeting triggers spam detection.
- **Use long delays** (the default 45-90 seconds is recommended).
- **Write unique templates** that sound natural. Generic comments get flagged.
- **Navigate to a niche search page** before running (e.g., `x.com/search?q=AI+startups`) for better targeting.
- **The script types character by character** at a randomized speed to mimic human behavior.
- **Templates rotate** -- each quote uses the next template in the array.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "No eligible tweets found" | Broaden `onlyKeywords` or increase `scrollRounds` |
| "Quote option not found in menu" | X may have changed the repost dropdown UI |
| "Tweet compose box not found" | The quote dialog may not have opened properly |
| Script is too slow | The delays are intentionally long. Do not reduce below 30s. |
| Tweets look spammy | Add more varied templates. Avoid repetitive phrasing. |

## Related Scripts

- `browser/repostPost.js` -- Simple repost (no commentary)
- `browser/autoReply.js` -- Auto-reply to matching tweets
- `browser/likePost.js` -- Like posts by URL or keyword
