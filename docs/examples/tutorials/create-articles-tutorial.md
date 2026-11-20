# Create Articles -- Tutorial

> Step-by-step guide to publishing long-form articles on X/Twitter using XActions Node.js/Puppeteer automation.

## Prerequisites
- Logged into x.com in your browser
- Browser DevTools console (F12 -> Console tab)
- **X Premium+ subscription** (articles are a Premium+-only feature)
- For Node.js usage: `npm install xactions` and a valid session cookie

## Quick Start
1. Set up a Puppeteer session with your X login
2. Import `publishArticle` from `src/articlePublisher.js`
3. Call `publishArticle(page, { title, body, coverImage })`
4. The article is published to your profile

## What Are X Articles?

Articles are X's long-form content format, similar to blog posts. They offer:
- No character limit (unlike tweets)
- Rich text formatting
- Cover images
- A dedicated Articles tab on your profile
- Their own URL and preview card when shared as tweets
- Full analytics (views, likes, reposts)

## Configuration

### Publishing an Article

```js
import { publishArticle } from './src/articlePublisher.js';

const result = await publishArticle(page, {
  title: 'The Complete Guide to X Automation',
  body: `Your full article body goes here.

This can be as long as you need. Articles support
multiple paragraphs and long-form content.

Include technical details, analysis, tutorials,
or any content that benefits from more space.`,
  coverImage: '/path/to/cover-image.jpg',  // Optional
});
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `title` | `string` | Yes | Article title |
| `body` | `string` | Yes | Full article body text |
| `coverImage` | `string` | No | Path to a cover/hero image file |

### Saving a Draft

```js
import { saveDraft } from './src/articlePublisher.js';

const result = await saveDraft(page, {
  title: 'Work in Progress: Automation Deep Dive',
  body: 'Draft content here... still working on this.',
});
```

### Listing Articles

```js
import { getArticles } from './src/articlePublisher.js';

const articles = await getArticles(page, 'nichxbt');
console.log(articles);
// {
//   username: 'nichxbt',
//   articles: [
//     { title: '...', preview: '...', time: '...', link: '...' },
//     ...
//   ],
//   count: 5,
// }
```

### Getting Article Analytics

```js
import { getArticleAnalytics } from './src/articlePublisher.js';

const stats = await getArticleAnalytics(page, 'https://x.com/nichxbt/articles/123');
console.log(stats);
// {
//   articleUrl: '...',
//   analytics: { title: '...', likes: '42', reposts: '12', views: '1,234' },
// }
```

## Step-by-Step Guide

### 1. Navigate to the Article Composer

The script navigates to `https://x.com/compose/article`. This page is only available to Premium+ subscribers.

### 2. Enter the Title

The title is typed into `[data-testid="articleTitle"]`:

```js
await page.click('[data-testid="articleTitle"]');
await page.keyboard.type('Your Article Title', { delay: 20 });
```

### 3. Write the Body

The body content goes into `[data-testid="articleBody"]`:

```js
await page.click('[data-testid="articleBody"]');
await page.keyboard.type('Your article content...', { delay: 10 });
```

The body supports paragraphs (use newlines), and X's article editor provides basic formatting tools.

### 4. Add a Cover Image (Optional)

A cover image appears at the top of the article as a hero banner:

```js
const coverButton = await page.$('[data-testid="articleCoverImage"]');
if (coverButton) {
  const [fileChooser] = await Promise.all([
    page.waitForFileChooser(),
    coverButton.click(),
  ]);
  await fileChooser.accept(['/path/to/cover.jpg']);
}
```

Recommended cover image:
- Aspect ratio: 16:9
- Minimum width: 1200px
- Format: JPG or PNG

### 5. Publish or Save Draft

```js
// Publish immediately
await page.click('[data-testid="articlePublish"]');

// Or save as draft
await page.click('[data-testid="articleSaveDraft"]');
```

## Available Functions

| Function | Description | Returns |
|----------|-------------|---------|
| `publishArticle(page, article)` | Publish an article | `{ success, title, bodyLength, hasCover, timestamp }` |
| `saveDraft(page, article)` | Save as draft | `{ success, action: 'draft_saved', title }` |
| `getArticles(page, username)` | List user's articles | `{ username, articles: [...], count }` |
| `getArticleAnalytics(page, url)` | Get article stats | `{ articleUrl, analytics: { likes, reposts, views } }` |

## Article vs Extended Tweet vs Thread

| Feature | Article | Extended Tweet | Thread |
|---------|---------|----------------|--------|
| Subscription | Premium+ | Premium | Free |
| Character limit | Unlimited | 25,000 | 280 per tweet |
| Formatting | Rich text | Plain text | Plain text |
| Cover image | Yes | No | No |
| Dedicated tab | Yes (Articles) | No | No |
| Timeline display | Link card | Full text | Connected tweets |
| Engagement | Lower visibility | High | Highest |

## Tips & Tricks

- **Hook in the title**: The title is what appears when the article is shared. Make it compelling and clear.
- **Cover image quality**: A high-quality cover image significantly increases click-through rates.
- **Save drafts often**: Use `saveDraft()` periodically while writing to avoid losing work.
- **Promote with a tweet**: After publishing, share the article link in a tweet with a compelling summary.
- **SEO value**: Article titles and content are indexed by search engines, giving your content discoverability beyond X.
- **Analytics**: Use `getArticleAnalytics()` to track performance and understand what content resonates.
- **Error handling**: The script returns `{ success: false, error: '...' }` if Premium+ is not available, so check the result.
- **Body formatting**: Use clear paragraph breaks and structure. The article editor handles basic formatting.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Article compose not available" | Articles require Premium+. The script returns an error if the feature is not accessible. |
| Title input not found | The article composer may not have loaded. Increase `navigationDelay` or check your subscription. |
| Cover image upload failed | Verify the file path is absolute and the image is a valid format (JPG, PNG). |
| Draft not saving | Ensure the title field is filled in. Drafts require at least a title. |
| Article not appearing on profile | Articles may take a few minutes to propagate. Refresh your profile page. |
| Analytics showing zeros | New articles take time to accumulate views. Check again after 24 hours. |

## Related Scripts

- `src/postComposer.js` -- Regular tweet posting (for promoting your articles)
- `browser/schedulePosts.js` -- Schedule a tweet linking to your article
- `docs/examples/tutorials/longer-content-tutorial.md` -- Extended tweets and video guide
- `docs/examples/tutorials/post-content-tutorial.md` -- General posting guide
