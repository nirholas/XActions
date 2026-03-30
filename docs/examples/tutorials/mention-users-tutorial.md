# Mention Users -- Tutorial

> Step-by-step guide to mentioning multiple users in posts on X using XActions browser scripts.

## Prerequisites
- Logged into x.com in your browser
- Browser DevTools console (F12 -> Console tab)

## Quick Start
1. Navigate to `https://x.com` (any page)
2. Open DevTools (F12) and go to the Console tab
3. Copy the contents of `src/mentionUsers.js`
4. Edit the `CONFIG` section (usernames, message, batch settings)
5. Paste into the console and press Enter

## Configuration

```js
const CONFIG = {
  usernames: [
    'nichxbt',
    'openai',
    'anthropic',
  ],

  messageBeforeMentions: 'Check this out',
  messageAfterMentions: 'What do you think?',

  batchSize: 5,
  createMultipleTweets: false,

  autoPost: false,
  openComposer: true,

  minDelay: 1000,
  maxDelay: 2000,
  typingDelay: 100,
};
```

### Full CONFIG Reference

| Option | Default | Description |
|--------|---------|-------------|
| `usernames` | `[]` | Array of usernames to mention (with or without @) |
| `messageBeforeMentions` | `''` | Text before the @mentions |
| `messageAfterMentions` | `''` | Text after the @mentions |
| `batchSize` | `5` | Max mentions per tweet |
| `createMultipleTweets` | `false` | Split into multiple tweets if more than batchSize |
| `autoPost` | `false` | Automatically post (false = compose only for review) |
| `openComposer` | `true` | Click the compose button to open the tweet dialog |

## Step-by-Step Guide

### Mention a Few Users in One Tweet

**Step 1:** Configure the usernames and optional message:

```js
const CONFIG = {
  usernames: ['nichxbt', 'openai', 'anthropic'],
  messageBeforeMentions: 'Loving the work you all are doing!',
  messageAfterMentions: '',
  autoPost: false,
};
```

**Step 2:** Paste the script. It opens the tweet composer and types:

```
Mentioning 3 users: @nichxbt, @openai, @anthropic

Tweet preview:
Loving the work you all are doing!

@nichxbt @openai @anthropic

Character count: 67/280
Tweet composed! Review and click "Post" when ready.
```

**Step 3:** Review the tweet in the composer and click "Post" manually (since `autoPost: false`).

### Auto-Post Mentions

Set `autoPost: true` to skip the review step:

```js
const CONFIG = {
  usernames: ['nichxbt', 'openai'],
  messageBeforeMentions: 'Great discussion happening here',
  autoPost: true,
};
```

The script will compose and post the tweet automatically.

### Batch Mentions for Large Groups

When mentioning more than 5 users, X may flag the post as spam. Use batching:

```js
const CONFIG = {
  usernames: [
    'user1', 'user2', 'user3', 'user4', 'user5',
    'user6', 'user7', 'user8', 'user9', 'user10',
    'user11', 'user12', 'user13', 'user14', 'user15',
  ],
  batchSize: 5,
  createMultipleTweets: true,
  messageBeforeMentions: 'Join our community event!',
  autoPost: true,
};
```

Output:

```
Mentioning 15 users: @user1, @user2, ... @user15
Split into 3 batches of up to 5 mentions each.

Batch 1/3 (5 mentions)...
  Tweet posted!
  Waiting 3s before next batch...

Batch 2/3 (5 mentions)...
  Tweet posted!
  Waiting 3s before next batch...

Batch 3/3 (5 mentions)...
  Tweet posted!

3/3 batches composed.
```

### Compose-Only Mode (Review First)

By default, `autoPost: false` means the script fills in the tweet composer but does not click "Post". This lets you:

1. Review the tweet text
2. Add media or a link
3. Edit the message
4. Post when you are ready

### Username Validation

The script validates all usernames:
- Removes `@` prefix if included
- Checks format (1-15 characters, alphanumeric + underscores)
- Skips and warns about invalid usernames

```js
usernames: ['@nichxbt', 'valid_user', 'this-is-invalid!'],
// Results in: "Invalid usernames (skipped): this-is-invalid!"
// Valid: nichxbt, valid_user
```

## Tips & Tricks

- **Keep mentions under 5 per tweet** to avoid spam detection. Use `batchSize: 5` with `createMultipleTweets: true` for larger groups.
- **Set `autoPost: false`** (default) to review tweets before posting. This is safer and lets you add media.
- **Character limit is 280.** The script warns if your tweet exceeds this. Reduce mentions or shorten your message.
- **Mention history** is saved to sessionStorage under `xactions_mentions`.
- **The `openComposer` option** automatically clicks the "Post" button in the sidebar to open the tweet dialog. Set to `false` if the composer is already open.
- **Use `messageBeforeMentions` and `messageAfterMentions`** to frame your mentions with context.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Please add usernames" | Add at least one username to the array |
| "No valid usernames found" | Check username format (letters, numbers, underscores, max 15 chars) |
| "Could not find the tweet compose box" | Click the "Post" button manually first, or ensure `openComposer: true` |
| "Post button is disabled" | Your tweet may have an error (over 280 chars, or empty) |
| Character count exceeds 280 | Reduce the number of mentions per batch or shorten your message |
| "Clipboard access denied" | Not relevant to this script -- it types directly into the composer |

## Related Scripts

- `src/autoReply.js` -- Auto-reply to matching tweets
- `src/quoteTweetAutomation.js` -- Quote tweet with commentary
- `src/likePost.js` -- Like posts by URL or keyword
