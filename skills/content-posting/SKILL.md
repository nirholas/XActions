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
| Post Composer | `src/postComposer.js` | Core posting module for single tweets |
| Poll Creator | `src/pollCreator.js` | Alternative poll creation script |

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

## Key Selectors

| Element | Selector |
|---------|----------|
| Compose button | `a[data-testid="SideNav_NewTweet_Button"]` |
| Tweet text area | `[data-testid="tweetTextarea_0"]` |
| Post button | `[data-testid="tweetButton"]` |
| Media button | `[data-testid="fileInput"]` |
| Poll button | `[aria-label="Add poll"]` |
| Schedule button | `[data-testid="scheduleOption"]` |
| Thread add | `[data-testid="addButton"]` |
| Retweet button | `[data-testid="retweet"]` |
| Confirm retweet | `[data-testid="retweetConfirm"]` |
| Already retweeted | `[data-testid="unretweet"]` |
| Alt text | `[data-testid="altTextInput"]` |

## MCP Tools

- `x_post_tweet` – Post a new tweet
- `x_post_thread` – Post a multi-tweet thread
- `x_create_poll` – Create a poll with options
- `x_schedule_post` – Schedule a post for later
- `x_quote_post` – Quote retweet a post
- `x_repost` – Retweet/repost a post
- `x_edit_post` – Edit a recent post (Premium)
- `x_delete_post` – Delete a post

## 2026 Features

Image polls, audio articles, and shuffle choices are in testing. Edit window is 1 hour (Premium). Bold/italics text formatting available for Premium users.

## Notes

- All posting scripts include dry-run mode by default
- Thread tweets are validated for character count before posting
- Free accounts: 280 char limit. Premium: 25,000+ chars, scheduling, edit
- Auto Repost includes safety filters (min likes, skip replies, skip sensitive)
- Add delays between actions to avoid rate limiting
