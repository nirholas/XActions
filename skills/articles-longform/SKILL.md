---
name: articles-longform
description: Publishes long-form articles on X/Twitter using the Premium+ article editor. Creates articles with titles, body content, and cover images, saves drafts, lists published articles, and retrieves article analytics. Use when users want to publish, draft, or manage articles on X.
license: MIT
metadata:
  author: nichxbt
  version: "3.0"
---

# Articles & Long-Form Content

Browser automation for publishing and managing long-form articles on X/Twitter. Requires Premium+ subscription.

## Script Selection

| Goal | File | Navigate to |
|------|------|-------------|
| Publish or draft an article | `src/articlePublisher.js` | `x.com/compose/article` |
| List published articles | `src/articlePublisher.js` | `x.com/USERNAME/articles` |
| Get article analytics | `src/articlePublisher.js` | Article URL |

## Article Publisher

**File:** `src/articlePublisher.js`

Puppeteer-based module for creating, drafting, listing, and analyzing long-form articles.

### Functions

| Function | Purpose |
|----------|---------|
| `publishArticle(page, { title, body, coverImage? })` | Publish with optional cover image |
| `saveDraft(page, { title, body })` | Save article as draft |
| `getArticles(page, username)` | List all published articles for a user |
| `getArticleAnalytics(page, articleUrl)` | Get likes, reposts, views for an article |

### How It Works

1. Navigates to `x.com/compose/article`
2. Types title into the title field, body into the rich text editor
3. Optionally uploads a cover image via file chooser
4. Clicks Publish or Save Draft
5. Returns success status with metadata (title, body length, timestamp)

### Usage (Node.js / Puppeteer)

```javascript
import { publishArticle, saveDraft } from './src/articlePublisher.js';

await publishArticle(page, {
  title: 'My Article',
  body: 'Full article content...',
  coverImage: '/path/to/cover.jpg', // optional
});

await saveDraft(page, { title: 'Draft', body: 'Content...' });
```

## DOM Selectors

| Element | Selector |
|---------|----------|
| Title input | `[data-testid="articleTitle"]` |
| Body editor | `[data-testid="articleBody"]` |
| Publish button | `[data-testid="articlePublish"]` |
| Save draft | `[data-testid="articleSaveDraft"]` |
| Cover image | `[data-testid="articleCoverImage"]` |
| Article card | `[data-testid="articleCard"]` |

## Prerequisites & Limits

- **Premium+ subscription** ($16/mo) required for article publishing
- Cover images: JPEG/PNG, under 5MB
- 3s delay after navigation, 5s wait after publish to confirm

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Premium+ required" error | Article compose requires Premium+ subscription |
| Cover image upload fails | Check file format (JPEG/PNG) and size (< 5MB) |
| Article not appearing in feeds | May take a few minutes to surface |
| Empty title/body error | Both fields are required to publish |
