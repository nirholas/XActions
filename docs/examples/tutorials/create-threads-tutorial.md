# Create Threads -- Tutorial

> Step-by-step guide to composing and publishing multi-tweet threads using XActions browser scripts and Node.js/Puppeteer.

## Prerequisites
- Logged into x.com in your browser
- Browser DevTools console (F12 -> Console tab)
- For Node.js usage: `npm install xactions` and a valid session cookie

## Quick Start
1. Navigate to x.com
2. Open DevTools (F12)
3. Copy the script from `browser/postThread.js` or `browser/threadComposer.js`
4. Edit the CONFIG section with your thread content
5. Paste into Console and press Enter

## Three Script Options

| Script | Runtime | Best For |
|--------|---------|----------|
| `browser/postThread.js` | Browser console | Quick one-off threads |
| `browser/threadComposer.js` | Browser console | Advanced threads with drafts, preview, auto-numbering |
| `src/postComposer.js` (`postThread`) | Node.js / Puppeteer | Automated thread posting from scripts |

## Configuration

### `browser/postThread.js` (Browser Console)

```js
const CONFIG = {
  thread: [
    'First tweet in the thread',
    'Second tweet continues the thought...',
    'Final tweet wraps it up!',
  ],
  delayBetweenTweets: 2000,
  dryRun: true,  // Set to false to actually post
};
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `thread` | `string[]` | `[]` | Array of tweet texts in order |
| `delayBetweenTweets` | `number` | `2000` | Milliseconds between adding each tweet |
| `dryRun` | `boolean` | `true` | Preview mode -- set `false` to post |

### `browser/threadComposer.js` (Browser Console -- Advanced)

```js
const CONFIG = {
  dryRun: true,
  autoNumber: false,         // Add "1/N" numbering to each tweet
  addThreadEmoji: true,      // Add a thread emoji to the first tweet
  delayBetween: [3000, 6000], // Random delay range between tweets
  maxChars: 280,
};
```

This script exposes commands on `window.XActions`:

```js
// Load your thread
XActions.thread([
  "First tweet of my thread",
  "Second tweet with more context...",
  "Third tweet -- the conclusion!",
]);

// Preview with character counts
XActions.preview();

// Publish (respects CONFIG.dryRun)
XActions.publish();

// Draft management
XActions.saveDraft('myThread');
XActions.loadDraft('myThread');
XActions.listDrafts();
XActions.deleteDraft('myThread');

// Export thread as JSON file
XActions.exportThread();

// Abort mid-publish
XActions.abort();
```

### `src/postComposer.js` -- `postThread` (Node.js / Puppeteer)

```js
import { postThread } from './src/postComposer.js';

// Simple text-only thread
const result = await postThread(page, [
  'Thread time! Here is what I learned this week...',
  'Lesson 1: Always test in dry-run mode first.',
  'Lesson 2: Character counts matter. Use the preview.',
  'Lesson 3: Threads get more engagement than single tweets.',
]);

// Thread with media on specific tweets
const result = await postThread(page, [
  { text: 'Check out these results!', media: '/path/to/chart.png' },
  'The data shows a 40% increase in engagement.',
  { text: 'Here is the methodology', media: '/path/to/diagram.jpg' },
  'Thanks for reading! Follow for more.',
]);
```

The `postThread` function accepts an array where each element is either:
- A `string` (text only)
- An object `{ text: string, media?: string }` (text with optional media)

## Step-by-Step Guide

### Using `postThread.js` (Browser Console)

1. Open x.com and press F12 to open DevTools
2. Copy the contents of `browser/postThread.js`
3. Edit the `CONFIG.thread` array with your tweets:
   ```js
   thread: [
     'Here is my hot take on AI agents...',
     'First, they need to understand context.',
     'Second, tool use is everything.',
     'Final thought: the best agents are invisible.',
   ],
   ```
4. Set `CONFIG.dryRun = false` when ready to post
5. Paste into the Console tab and press Enter

The script will:
- Validate all tweets are under 280 characters
- Print a preview with character counts
- Open the compose dialog
- Type each tweet and click the "+" button to add the next one
- Click "Post all" to publish the entire thread

### Using `threadComposer.js` (Browser Console -- Advanced)

1. Paste `browser/threadComposer.js` into the console
2. Load your thread content:
   ```js
   XActions.thread([
     "Hot take: browser automation is underrated",
     "Most people think you need API access to automate X",
     "But with XActions, you can do everything from the console",
     "No API keys. No rate limit fees. Just paste and go.",
   ]);
   ```
3. Review the preview -- it shows character counts and warnings:
   ```
   Tweet 1/4 -- 48/280 chars [OK]
   Tweet 2/4 -- 55/280 chars [OK]
   ...
   ```
4. Save as draft if needed: `XActions.saveDraft('my-hot-take')`
5. Publish: Set `CONFIG.dryRun = false` and call `XActions.publish()`

### Using `postComposer.js` (Node.js / Puppeteer)

1. Set up a Puppeteer page with your X session
2. Import and call `postThread`:
   ```js
   import { postThread } from './src/postComposer.js';

   const result = await postThread(page, [
     'Tweet 1 of my thread',
     'Tweet 2 continues...',
     'Tweet 3 wraps up!',
   ]);

   console.log(result);
   // { success: true, tweetCount: 3, tweets: [...], timestamp: '...' }
   ```

### How Thread Posting Works Internally

1. Navigate to `https://x.com/compose/tweet`
2. Type the first tweet in `[data-testid="tweetTextarea_0"]`
3. Click the "+" button (`[data-testid="addButton"]`) to add each subsequent tweet
4. Each new tweet gets a new textarea: `[data-testid="tweetTextarea_1"]`, `tweetTextarea_2`, etc.
5. After all tweets are typed, click `[data-testid="tweetButton"]` to post the entire thread

## Tips & Tricks

- **Dry run first**: Always test with `dryRun: true` before posting. The preview shows character counts and validates content.
- **Thread length**: Threads of 5-10 tweets tend to perform best. Very long threads (20+) lose readers.
- **First tweet matters**: The first tweet is what appears in the timeline. Make it compelling to drive clicks.
- **Auto-numbering**: Enable `autoNumber: true` in `threadComposer.js` to add "1/N" labels automatically.
- **Thread emoji**: The thread composer adds a thread emoji to the first tweet by default. Disable with `addThreadEmoji: false`.
- **Save drafts**: Use `XActions.saveDraft('name')` to save threads to localStorage for later editing.
- **Export**: Use `XActions.exportThread()` to download your thread as a JSON file.
- **Media per tweet**: When using the Puppeteer `postThread`, pass objects with `{ text, media }` to attach images to specific tweets.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Add tweet" button not found | The selector `[data-testid="addButton"]` may have changed. Check `docs/agents/selectors.md` for updates. |
| Tweet exceeds 280 chars | The script validates lengths. Shorten the offending tweet or upgrade to Premium for 25,000 chars. |
| Thread only partially posted | Network issues can interrupt posting. Check your posted tweets and re-post missing ones manually. |
| Compose box not found | Make sure you are logged into x.com. Try clicking the compose button manually first. |
| Draft not loading | Drafts are stored in `localStorage`. Clearing browser data removes them. Use `XActions.exportThread()` for permanent backups. |

## Related Scripts

- `src/postComposer.js` -- Single tweet posting with media support
- `browser/schedulePosts.js` -- Schedule threads for specific times
- `browser/textFormatting.js` -- Format text with bold, italic, etc.
- `src/articlePublisher.js` -- For long-form content that exceeds thread length
