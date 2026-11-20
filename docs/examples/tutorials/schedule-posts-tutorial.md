# Schedule Posts -- Tutorial

> Step-by-step guide to scheduling tweets for future publication using XActions browser scripts and Node.js/Puppeteer.

## Prerequisites
- Logged into x.com in your browser
- Browser DevTools console (F12 -> Console tab)
- **X Premium subscription** (scheduling is a Premium feature)
- For Node.js usage: `npm install xactions` and a valid session cookie

## Quick Start
1. Navigate to x.com
2. Open DevTools (F12)
3. Copy the script from `browser/schedulePosts.js`
4. Edit the CONFIG section with your posts and times
5. Paste into Console and press Enter

## Two Script Options

| Script | Runtime | Best For |
|--------|---------|----------|
| `browser/schedulePosts.js` | Browser console | Scheduling multiple posts from DevTools |
| `src/postComposer.js` (`schedulePost`) | Node.js / Puppeteer | Programmatic scheduling from scripts |

## Configuration

### `browser/schedulePosts.js` (Browser Console)

```js
const CONFIG = {
  posts: [
    { text: 'Good morning! Rise and grind.', scheduledFor: '2026-04-01T09:00:00' },
    { text: 'Afternoon productivity tip: take breaks.', scheduledFor: '2026-04-01T14:00:00' },
    { text: 'Wrapping up the day. What did you ship?', scheduledFor: '2026-04-01T18:00:00' },
  ],
  useNativeScheduler: true,
  retryOnFailure: true,
};
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `posts` | `Array<{text, scheduledFor}>` | `[]` | Array of posts with text and ISO datetime |
| `useNativeScheduler` | `boolean` | `true` | Use X's built-in scheduling UI |
| `retryOnFailure` | `boolean` | `true` | Retry failed scheduling attempts |

Each post object:

| Field | Type | Description |
|-------|------|-------------|
| `text` | `string` | Tweet content |
| `scheduledFor` | `string` | ISO 8601 datetime (e.g., `'2026-04-01T10:00:00'`) |

### `src/postComposer.js` -- `schedulePost` (Node.js / Puppeteer)

```js
import { schedulePost } from './src/postComposer.js';

const result = await schedulePost(page, 'Scheduled tweet content!', '2026-04-01T10:00:00');

console.log(result);
// { success: true, text: 'Scheduled tweet...', scheduledFor: '2026-04-01T10:00:00.000Z', timestamp: '...' }
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | `Page` | Puppeteer page instance |
| `text` | `string` | Tweet text |
| `scheduledTime` | `Date\|string` | When to publish (Date object or ISO string) |

## Step-by-Step Guide

### Scheduling Posts (Browser Console)

1. Open x.com and press F12 for DevTools
2. Copy `browser/schedulePosts.js`
3. Edit the `CONFIG.posts` array:
   ```js
   posts: [
     { text: 'Morning tweet!', scheduledFor: '2026-04-01T09:00:00' },
     { text: 'Afternoon tweet!', scheduledFor: '2026-04-01T14:00:00' },
   ],
   ```
4. Paste and run

The script processes each post sequentially:

1. Sorts posts by scheduled time
2. Opens the compose dialog via `[data-testid="SideNav_NewTweet_Button"]`
3. Types the tweet text into `[data-testid="tweetTextarea_0"]`
4. Clicks the schedule icon `[data-testid="scheduleOption"]`
5. Sets the date in `[data-testid="scheduledDateField"]`
6. Sets the time in `[data-testid="scheduledTimeField"]`
7. Confirms via `[data-testid="scheduledConfirmationPrimaryAction"]`
8. Reports success or failure for each post

### Scheduling a Single Post (Node.js / Puppeteer)

```js
import { schedulePost } from './src/postComposer.js';

// Schedule for a specific date and time
await schedulePost(page, 'This will post at 10 AM tomorrow!', '2026-04-01T10:00:00');

// Schedule using a Date object
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
tomorrow.setHours(10, 0, 0, 0);
await schedulePost(page, 'Automated morning post', tomorrow);
```

### How Scheduling Works Internally

The Puppeteer `schedulePost` function:

1. Navigates to `https://x.com/compose/tweet`
2. Types the tweet text
3. Clicks the schedule button (`[data-testid="scheduleOption"]`)
4. Parses the scheduled time into date and time strings:
   ```js
   const date = new Date(scheduledTime);
   const dateStr = date.toISOString().split('T')[0];     // '2026-04-01'
   const timeStr = date.toTimeString().split(' ')[0].substring(0, 5); // '10:00'
   ```
5. Fills in the date and time inputs
6. Clicks the schedule confirm button

### Managing Scheduled Posts

X provides a native scheduled posts manager at `https://x.com/compose/tweet/unsent`. You can:
- View all scheduled posts
- Edit scheduled posts
- Delete/cancel scheduled posts
- Reschedule posts to a different time

### Scheduling a Content Calendar

For a full week of content:

```js
const CONFIG = {
  posts: [
    // Monday
    { text: 'Monday motivation: Ship something today.', scheduledFor: '2026-04-06T09:00:00' },
    { text: 'Hot take: Tests are documentation.', scheduledFor: '2026-04-06T14:00:00' },

    // Tuesday
    { text: 'Tuesday tip: Automate the boring stuff.', scheduledFor: '2026-04-07T09:00:00' },
    { text: 'What are you building this week?', scheduledFor: '2026-04-07T17:00:00' },

    // Wednesday
    { text: 'Midweek check-in: How is your week going?', scheduledFor: '2026-04-08T12:00:00' },

    // Thursday
    { text: 'Throwback to when I thought APIs were the only way.', scheduledFor: '2026-04-09T10:00:00' },

    // Friday
    { text: 'Friday wins: What shipped this week?', scheduledFor: '2026-04-10T16:00:00' },
  ],
};
```

## Date and Time Format

Posts use ISO 8601 format: `YYYY-MM-DDTHH:MM:SS`

| Example | Meaning |
|---------|---------|
| `'2026-04-01T09:00:00'` | April 1, 2026 at 9:00 AM (local time) |
| `'2026-04-01T14:30:00'` | April 1, 2026 at 2:30 PM (local time) |
| `'2026-12-25T00:00:00'` | December 25, 2026 at midnight |

Note: Times are in your local timezone unless you specify a UTC offset.

## Tips & Tricks

- **Best posting times**: Engagement is typically highest at 9 AM, 12 PM, and 5 PM in your audience's timezone.
- **Batch scheduling**: Prepare a week's content on Sunday and schedule it all at once.
- **Content variety**: Mix different content types (questions, tips, threads, polls) across your schedule.
- **Time zones**: X uses your account's timezone setting. Make sure it matches your target audience.
- **Buffer time**: Leave 2-second gaps between scheduling operations to avoid hitting rate limits.
- **Verify scheduled posts**: After scheduling, visit `https://x.com/compose/tweet/unsent` to confirm all posts are queued.
- **Premium required**: Scheduling is only available with X Premium. The script detects this and reports an error if unavailable.
- **No media scheduling**: The browser console script handles text-only scheduling. For media, use the Puppeteer approach.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Native scheduler not available" | Scheduling requires X Premium. Upgrade your subscription. |
| Schedule button not found | The selector `[data-testid="scheduleOption"]` may have changed. Check `docs/agents/selectors.md`. |
| Date/time not setting correctly | X's date picker can be tricky. The Puppeteer approach sets values directly on the input fields. |
| Posts not posting at scheduled time | Verify your timezone settings in X. Times are relative to your account timezone. |
| "Schedule requires Premium" error | The Puppeteer `schedulePost` function returns `{ success: false, error: 'Schedule requires Premium' }`. |
| Multiple posts failing | X may rate-limit rapid scheduling. Increase the delay between scheduling operations. |

## Related Scripts

- `src/postComposer.js` -- Post tweets immediately (text, media, polls)
- `browser/postThread.js` -- Create threads (schedule the first tweet, then manually thread the rest)
- `browser/threadComposer.js` -- Advanced thread composition with drafts
- `docs/examples/tutorials/post-content-tutorial.md` -- General posting guide
