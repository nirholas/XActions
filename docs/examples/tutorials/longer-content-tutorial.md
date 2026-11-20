# Post Longer Content & Longer Videos -- Tutorial

> Step-by-step guide to posting extended tweets, long-form articles, and longer videos using XActions with Premium/Premium+ tiers.

## Prerequisites
- Logged into x.com in your browser
- Browser DevTools console (F12 -> Console tab)
- **X Premium or Premium+ subscription** (required for extended limits)
- For Node.js usage: `npm install xactions` and a valid session cookie

## Quick Start
1. Navigate to x.com
2. Open DevTools (F12)
3. Use `src/postComposer.js` for extended tweets or `src/articlePublisher.js` for articles
4. Premium subscribers can post up to 25,000 characters per tweet

## Content Limits by Tier

### Character Limits

| Tier | Tweet Length | Thread Tweet Length |
|------|-------------|-------------------|
| Free | 280 characters | 280 per tweet |
| Premium | 25,000 characters | 25,000 per tweet |
| Premium+ | 25,000 characters | 25,000 per tweet |

### Video Limits

| Tier | Max Length | Max File Size | Max Resolution |
|------|-----------|---------------|----------------|
| Free | 2 min 20 sec | 512MB | 1920x1200 |
| Premium | 60 minutes | 2GB | 1920x1200 |
| Premium+ | 3 hours | 8GB | 4K |

### Articles (Premium+ Only)

| Feature | Limit |
|---------|-------|
| Title | No strict limit |
| Body | No strict character limit |
| Cover image | Yes, optional |
| Drafts | Unlimited |
| Rich formatting | Yes |

## Posting Extended Tweets

### Node.js / Puppeteer

Extended tweets work the same as regular tweets -- just type more text:

```js
import { postTweet } from './src/postComposer.js';

const longText = `This is an extended tweet that goes well beyond the 280-character limit.

With X Premium, you can write up to 25,000 characters in a single tweet. This is useful for detailed explanations, stories, or technical content that would otherwise require a thread.

The full text appears in the timeline with a "Show more" button for viewers.`;

await postTweet(page, longText);
```

### Browser Console

```js
// Open compose dialog
document.querySelector('[data-testid="SideNav_NewTweet_Button"]').click();

// Wait, then type extended content
setTimeout(() => {
  const textarea = document.querySelector('[data-testid="tweetTextarea_0"]');
  textarea.focus();
  document.execCommand('insertText', false, 'Your very long post content here...');
}, 1500);
```

### Extended Tweets vs Threads

| Approach | Best For |
|----------|----------|
| Extended tweet (25k chars) | Long-form explanations, stories, detailed takes |
| Thread (multiple 280-char tweets) | Structured arguments, numbered points, engagement |
| Article (Premium+) | Blog-style content with formatting, cover images |

Extended tweets display with a "Show more" button in the timeline. Not all users click it, so put your hook in the first 280 characters.

## Publishing Articles (Premium+)

Articles are X's long-form content format, similar to blog posts.

### Node.js / Puppeteer (`src/articlePublisher.js`)

```js
import { publishArticle, saveDraft, getArticles } from './src/articlePublisher.js';

// Publish an article
const result = await publishArticle(page, {
  title: 'Why Browser Automation Beats API Access',
  body: `Full article body goes here. Articles support long-form content
with paragraphs, and you can include as much detail as needed.

This is the second paragraph of the article. Unlike tweets, articles
are displayed in a reader-friendly format with proper typography.`,
  coverImage: '/path/to/cover.jpg',  // Optional
});

// Save as draft instead of publishing
const draft = await saveDraft(page, {
  title: 'Draft: Upcoming Feature Analysis',
  body: 'Work in progress...',
});

// List your published articles
const articles = await getArticles(page, 'nichxbt');
console.log(articles);
```

### Article Functions

| Function | Description |
|----------|-------------|
| `publishArticle(page, { title, body, coverImage? })` | Publish an article |
| `saveDraft(page, { title, body })` | Save article as draft |
| `getArticles(page, username)` | List published articles |
| `getArticleAnalytics(page, articleUrl)` | Get article engagement stats |

### How Article Publishing Works

1. Navigate to `https://x.com/compose/article`
2. Click the title input (`[data-testid="articleTitle"]`) and type the title
3. Click the body editor (`[data-testid="articleBody"]`) and type the content
4. Optionally upload a cover image via `[data-testid="articleCoverImage"]`
5. Click publish (`[data-testid="articlePublish"]`) or save draft (`[data-testid="articleSaveDraft"]`)

### Article Features

- **Rich formatting**: Articles support headers, paragraphs, and text styling
- **Cover images**: Add a hero image that appears at the top of the article
- **Drafts**: Save work in progress and return to it later
- **Analytics**: Track views, likes, reposts, and engagement on your articles
- **Shareable**: Articles get their own URL and preview card when shared

## Uploading Longer Videos

### Premium Video Upload (up to 60 minutes)

```js
import { postTweet } from './src/postComposer.js';

// Upload a longer video (Premium accounts)
await postTweet(page, 'Full tutorial walkthrough - 45 minutes of content!', {
  media: '/path/to/long-tutorial.mp4',
});
```

For large video files, you may need to increase wait times since processing takes longer:

```js
// The default 2-second wait in postComposer.js may not be enough
// For production use, poll for upload completion
```

### Video Best Practices

- **Compress first**: Use ffmpeg or HandBrake to compress videos before uploading
- **Format**: MP4 with H.264 video codec and AAC audio codec works best
- **Thumbnail**: X auto-generates a thumbnail from the first frame
- **Captions**: Add captions using `browser/videoCaptions.js` for accessibility (see the video captions tutorial)
- **Processing time**: Large videos can take several minutes to process on X's servers

## Extended Content Strategy

### When to Use Extended Tweets

- Detailed explanations that lose meaning when split into thread chunks
- Stories or narratives that flow better as continuous text
- Technical documentation or tutorials
- Responses to complex questions

### When to Use Threads Instead

- Numbered lists or step-by-step guides
- Content designed for maximum engagement (threads get more interaction)
- Content where each point stands alone
- Building suspense or narrative tension

### When to Use Articles

- Blog-style content with structure and formatting
- Content you want discoverable via your profile's Articles tab
- Evergreen content that should be easy to find later
- Long tutorials, guides, or analyses

## Tips & Tricks

- **First 280 characters matter**: Even in extended tweets, the timeline only shows the first ~280 characters with a "Show more" button. Hook readers early.
- **Video compression**: A 60-minute video at 1080p can be several gigabytes. Compress to a reasonable bitrate (5-8 Mbps for 1080p).
- **Article SEO**: Article titles appear in search results. Use clear, descriptive titles.
- **Draft regularly**: For articles, use `saveDraft()` frequently to avoid losing work.
- **Premium check**: The script will fail gracefully if Premium features are not available, returning an error message instead of crashing.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Character count exceeded (free tier) | Upgrade to Premium for 25,000-character tweets, or split into a thread. |
| Video too long (free tier) | Free accounts are limited to 2:20. Upgrade to Premium for 60 minutes. |
| Article compose not available | Articles require Premium+. The script returns an error if not available. |
| Video processing stuck | Large videos can take 5-10 minutes. Refresh the page and check if processing completed. |
| Cover image upload failed | Verify the image file exists and is a valid format (JPG, PNG). |
| Article draft not saving | Check that you have Premium+ and the title field is filled in. |

## Related Scripts

- `src/postComposer.js` -- Standard tweet posting (supports extended tweets)
- `src/articlePublisher.js` -- Article publishing and management
- `browser/postThread.js` -- Thread posting (alternative to extended tweets)
- `browser/videoCaptions.js` -- Add captions to longer videos
- `browser/schedulePosts.js` -- Schedule extended tweets for later
