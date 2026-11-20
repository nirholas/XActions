# Create Polls -- Tutorial

> Step-by-step guide to creating poll tweets using XActions browser scripts and Node.js/Puppeteer.

## Prerequisites
- Logged into x.com in your browser
- Browser DevTools console (F12 -> Console tab)
- For Node.js usage: `npm install xactions` and a valid session cookie

## Quick Start
1. Navigate to x.com
2. Open DevTools (F12)
3. Copy the script from `browser/createPoll.js`
4. Edit the CONFIG section with your poll question and options
5. Paste into Console and press Enter

## Two Script Options

| Script | Runtime | Best For |
|--------|---------|----------|
| `browser/createPoll.js` | Browser console | Quick poll creation from DevTools |
| `src/pollCreator.js` | Node.js / Puppeteer | Automated poll creation, result scraping |

## Configuration

### `browser/createPoll.js` (Browser Console)

```js
const CONFIG = {
  question: 'What is your preferred programming language?',
  options: [
    'JavaScript',
    'Python',
    'Rust',
    'Go',
  ],
  durationDays: 1,
  durationHours: 0,
  durationMinutes: 0,
  dryRun: true,
};
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `question` | `string` | -- | The poll question (tweet text), max 280 chars |
| `options` | `string[]` | -- | 2-4 poll choices, each max 25 chars |
| `durationDays` | `number` | `1` | Days the poll runs (0-7) |
| `durationHours` | `number` | `0` | Hours (0-23) |
| `durationMinutes` | `number` | `0` | Minutes (0-59) |
| `dryRun` | `boolean` | `true` | Preview mode -- set `false` to post |

### `src/pollCreator.js` (Node.js / Puppeteer)

```js
import { createPoll } from './src/pollCreator.js';

const result = await createPoll(page, 'Best frontend framework?', [
  'React',
  'Vue',
  'Svelte',
  'Angular',
], {
  durationDays: 3,
  durationHours: 0,
  durationMinutes: 0,
});
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `durationDays` | `number` | `1` | Days (0-7) |
| `durationHours` | `number` | `0` | Hours (0-23) |
| `durationMinutes` | `number` | `0` | Minutes (0-59) |

## Step-by-Step Guide

### Creating a Poll (Browser Console)

1. Open x.com and press F12 for DevTools
2. Copy `browser/createPoll.js`
3. Edit your poll configuration:
   ```js
   question: 'Tabs or spaces?',
   options: ['Tabs', 'Spaces'],
   durationDays: 1,
   dryRun: false,
   ```
4. Paste and run

The script performs these steps:
1. Validates the question is under 280 characters
2. Validates each option is under 25 characters
3. Validates you have 2-4 options
4. Opens the compose dialog via `[data-testid="SideNav_NewTweet_Button"]`
5. Types the question into `[data-testid="tweetTextarea_0"]`
6. Clicks the poll button `[data-testid="pollButton"]`
7. Fills in option 1 (`[data-testid="pollOptionTextInput_0"]`) and option 2 (`[data-testid="pollOptionTextInput_1"]`)
8. For options 3 and 4, clicks `[data-testid="addPollOptionButton"]` first
9. Clicks `[data-testid="tweetButton"]` to post

### Creating a Poll (Node.js / Puppeteer)

```js
import { createPoll, getPollResults } from './src/pollCreator.js';

// Create a 2-option poll
const result = await createPoll(page, 'Coffee or tea?', ['Coffee', 'Tea']);

// Create a 4-option poll with custom duration
const result = await createPoll(page, 'Best season?', [
  'Spring',
  'Summer',
  'Autumn',
  'Winter',
], {
  durationDays: 7,
});

// Scrape poll results later
const results = await getPollResults(page, 'https://x.com/user/status/123456789');
console.log(results);
// { url: '...', results: { options: [...], totalVotes: '1,234', timeRemaining: '2 hours' } }
```

### Poll Duration

Polls can run from 5 minutes to 7 days. Set the duration using the three fields:

| Duration | Days | Hours | Minutes |
|----------|------|-------|---------|
| 5 minutes | 0 | 0 | 5 |
| 1 hour | 0 | 1 | 0 |
| 1 day (default) | 1 | 0 | 0 |
| 3 days | 3 | 0 | 0 |
| 7 days (max) | 7 | 0 | 0 |

### Scraping Poll Results

The `pollCreator.js` module includes a `getPollResults` function:

```js
import { getPollResults } from './src/pollCreator.js';

const results = await getPollResults(page, 'https://x.com/user/status/123456789');
```

This returns the vote percentages, total votes, and time remaining.

## Tips & Tricks

- **Option length**: Each poll option is limited to 25 characters. Keep options concise.
- **Question framing**: The question is your tweet text (280 char limit). Ask clear, specific questions for better engagement.
- **2 vs 4 options**: Two-option polls get more total votes (easier to decide). Four-option polls generate more discussion.
- **Duration**: 24-hour polls create urgency. 7-day polls accumulate more votes. Match duration to your audience's activity.
- **Engagement boost**: Polls naturally drive engagement because they are interactive. Use them to start conversations.
- **Image polls (2026)**: X is rolling out the ability to attach images to poll options. This feature is in development in `pollCreator.js`.
- **Dry run first**: Always test with `dryRun: true` to verify your content before posting.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Poll button not found | The poll feature may require Premium on some accounts. Check `[data-testid="pollButton"]`. |
| Option exceeds 25 chars | Shorten the option text. Each choice has a strict 25-character limit. |
| Only 2 options showing | Options 3 and 4 require clicking the "Add option" button first. The script handles this automatically. |
| Poll not posting | Check that the tweet button is enabled. Both the question and at least 2 options must be filled. |
| Cannot set duration | Duration controls may not appear in all UI versions. The default is 1 day. |

## Related Scripts

- `src/postComposer.js` -- General tweet posting (includes `createPoll` function)
- `browser/postThread.js` -- Create threads (combine polls with threads for engagement)
- `browser/schedulePosts.js` -- Schedule a poll for a specific time
