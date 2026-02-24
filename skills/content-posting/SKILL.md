---
name: content-posting
description: Create and publish content on X/Twitter programmatically. Post threads, schedule posts, create polls, auto-repost tweets by keyword/user filters. Use when users want to automate content creation, schedule tweets, or build threads.
license: MIT
metadata:
  author: nichxbt
  version: "3.0"
---

# Content Posting with XActions

Browser console scripts for automating content creation and publishing on X/Twitter.

## Available Scripts

| Script | File | Purpose |
|--------|------|---------|
| Post Thread | `src/postThread.js` | Compose and publish a multi-tweet thread |
| Schedule Posts | `src/schedulePosts.js` | Queue posts for future publishing |
| Create Poll | `src/createPoll.js` | Create a poll tweet programmatically |
| Auto Repost | `src/autoRepost.js` | Auto-retweet by keyword or user filters |

## Post Thread

**File:** `src/postThread.js`

Compose and post a connected thread of tweets.

### Configuration

```javascript
const CONFIG = {
  thread: [
    'First tweet in the thread 🧵',
    'Second tweet continues...',
    'Final tweet wraps it up! 🎉',
  ],
  delayBetweenTweets: 2000,
  dryRun: true,
};
```

### How to use

1. Go to x.com
2. Edit the `thread` array with your tweets
3. Set `dryRun = false` to post
4. Open DevTools (F12) → Console
5. Paste the script → Enter

### How it works

1. Opens the compose dialog
2. Types the first tweet
3. Clicks "+" to add each subsequent tweet
4. Clicks "Post all" to publish the entire thread

### Validation

- Checks each tweet is ≤ 280 characters
- Shows character count per tweet in dry-run mode

## Schedule Posts

**File:** `src/schedulePosts.js`

Queue multiple posts for future publishing using X's native scheduling (Premium feature).

### Configuration

```javascript
const CONFIG = {
  posts: [
    { text: 'Morning post!', scheduledFor: '2026-02-25T10:00:00' },
    { text: 'Afternoon post!', scheduledFor: '2026-02-25T14:00:00' },
  ],
};
```

### Note

Scheduling posts requires X Premium. The script uses X's built-in scheduler UI.

## Create Poll

**File:** `src/createPoll.js`

Create a poll with 2-4 options and configurable duration.

### Configuration

```javascript
const CONFIG = {
  question: 'What is your preferred language?',
  options: ['JavaScript', 'Python', 'Rust', 'Go'],
  durationDays: 1,
  dryRun: true,
};
```

### Validation

- Enforces 2-4 options
- Each option max 25 characters
- Question max 280 characters

## Auto Repost

**File:** `src/autoRepost.js`

Automatically repost tweets matching keywords or from specific users.

### Configuration

```javascript
const CONFIG = {
  keywords: ['AI agents', 'open source'],
  fromUsers: ['nichxbt'],
  maxReposts: 20,
  skipReplies: true,
  minLikes: 5,  // Only repost tweets with at least 5 likes
};
```

### How it works

1. Scrolls your timeline or search results
2. Matches tweets against keyword/user filters
3. Clicks retweet → confirm on matching tweets
4. Respects configurable delays and limits

### Key selectors

| Element | Selector |
|---------|----------|
| Retweet button | `[data-testid="retweet"]` |
| Confirm retweet | `[data-testid="retweetConfirm"]` |
| Already retweeted | `[data-testid="unretweet"]` |

## Notes

- All posting scripts include dry-run mode by default
- Thread tweets are validated for character count before posting
- Poll creation may require Premium
- Auto Repost includes safety filters (min likes, skip replies, skip sensitive)
- Add delays between actions to avoid rate limiting
