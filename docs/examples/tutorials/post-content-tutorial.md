# Post Content -- Tutorial

> Step-by-step guide to posting tweets with text, photos, GIFs, videos, and links using XActions browser scripts and Node.js/Puppeteer.

## Prerequisites
- Logged into x.com in your browser
- Browser DevTools console (F12 -> Console tab)
- For Node.js usage: `npm install xactions` and a valid session cookie

## Quick Start
1. Navigate to x.com
2. Open DevTools (F12)
3. Copy the script from `src/postComposer.js`
4. Edit the CONFIG section
5. Paste into Console and press Enter

## Two Approaches

### Approach 1: Browser Console (Manual)

The simplest way to post is to use the compose dialog directly via DOM manipulation:

```js
// Open the compose dialog
document.querySelector('[data-testid="SideNav_NewTweet_Button"]').click();

// Wait a moment, then type into the compose box
setTimeout(() => {
  const textarea = document.querySelector('[data-testid="tweetTextarea_0"]');
  textarea.focus();
  document.execCommand('insertText', false, 'Hello from XActions!');
}, 1500);
```

To post the tweet, click the Post button:

```js
document.querySelector('[data-testid="tweetButton"]').click();
```

### Approach 2: Node.js / Puppeteer (`src/postComposer.js`)

The `postTweet` function automates the full flow using Puppeteer:

```js
import { postTweet } from './src/postComposer.js';

// Simple text post
const result = await postTweet(page, 'Hello from XActions!');

// Post with an image and alt text
const result = await postTweet(page, 'Check out this photo!', {
  media: '/path/to/image.jpg',
  altText: 'A scenic mountain landscape at sunset',
});

// Reply to an existing post
const result = await postTweet(page, 'Great thread!', {
  replyTo: 'https://x.com/user/status/123456789',
});
```

## Configuration

The `postTweet` function accepts these options:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `media` | `string` | `null` | Local file path to an image, GIF, or video |
| `altText` | `string` | `null` | Accessibility description for the media |
| `replyTo` | `string` | `null` | URL of the post to reply to |

## Step-by-Step Guide

### Posting Text

1. The script navigates to `https://x.com/compose/tweet`
2. It clicks the tweet textarea (`[data-testid="tweetTextarea_0"]`)
3. Text is typed character by character with a 30ms delay to mimic human typing
4. The tweet button (`[data-testid="tweetButton"]`) is clicked
5. A 3-second wait ensures the post completes

### Posting with Media

1. After typing text, the script finds the file input (`[data-testid="fileInput"]`)
2. `uploadFile()` attaches the local file
3. A 2-second wait allows X to process the upload
4. If `altText` is provided, the script clicks `[data-testid="altTextInput"]` and types the description

### Posting with Links

Links are automatically detected by X when included in the tweet text. Simply include the URL in your text:

```js
await postTweet(page, 'Check out this article https://example.com/article');
```

X will generate a link preview card automatically. The URL counts toward your character limit.

### Quoting a Post

Use the `quotePost` function to add your commentary to an existing post:

```js
import { quotePost } from './src/postComposer.js';

await quotePost(page, 'https://x.com/user/status/123456789', 'This is so insightful!');
```

### Reposting

Use the `repost` function for a simple repost (no added commentary):

```js
import { repost } from './src/postComposer.js';

await repost(page, 'https://x.com/user/status/123456789');
```

## Tips & Tricks

- **Character limit**: Standard accounts have 280 characters. Premium accounts get 25,000.
- **Rate limits**: X enforces aggressive rate limits. Always include 1-3 second delays between posts.
- **Media types**: Supported formats include JPG, PNG, GIF (up to 15MB), and MP4 video (up to 512MB).
- **Link previews**: To suppress a link preview, place the URL at the very end and remove it after posting (edit within the 1-hour window).
- **Typing delay**: The 30ms delay per character in `postTweet` mimics human behavior and reduces detection risk.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Compose box not found | Make sure you are logged in and on x.com. The selector `[data-testid="tweetTextarea_0"]` must exist. |
| Media upload fails | Check the file path is absolute and the file exists. Puppeteer requires local file paths. |
| Alt text input not found | The alt text button may need to be clicked first. This varies by X UI version. |
| Tweet button not clickable | The button is disabled if the tweet is empty or exceeds the character limit. |
| Rate limited | Wait 15-30 minutes before retrying. Reduce posting frequency. |

## Related Scripts

- `browser/postThread.js` -- Post multi-tweet threads (browser console)
- `browser/threadComposer.js` -- Advanced thread composer with drafts (browser console)
- `browser/schedulePosts.js` -- Schedule posts for later (browser console)
- `browser/textFormatting.js` -- Format text with bold, italic, etc.
- `browser/createPoll.js` -- Create poll tweets (browser console)
