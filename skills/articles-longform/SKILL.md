---
name: articles-longform
description: Publishes and manages long-form articles on X/Twitter using the Premium+ article editor. Supports rich formatting, embeds, drafts, content repurposing, and thread-to-article conversion. Use when users want to publish articles, convert threads to long-form, or manage article content on X.
license: MIT
metadata:
  author: nichxbt
  version: "4.0"
---

# Articles & Long-Form Content

Browser console scripts for publishing and managing long-form articles on X/Twitter. Requires Premium+ subscription for article publishing.

## Script Selection

| Goal | File | Navigate to |
|------|------|-------------|
| Publish/draft articles | `src/articlePublisher.js` | `x.com/compose/article` |
| Convert tweets → threads | `src/threadComposer.js` | `x.com/USERNAME` |
| Convert tweets → blog outlines | `src/contentRepurposer.js` | `x.com/USERNAME` |
| Convert tweets → tweet storms | `src/contentRepurposer.js` | `x.com/USERNAME` |
| Analyze article-worthy content | `src/tweetPerformance.js` | `x.com/USERNAME` |

## Article Publisher

**File:** `src/articlePublisher.js`

### How to Use

1. Navigate to `x.com/compose/article`
2. Open DevTools (F12) → Console
3. Paste the script → Enter

### Features

- Set article title and body content
- Add cover image
- Save as draft
- Publish immediately
- Rich text formatting support (headers, bold, italics, lists)
- Media embed support

## Content Repurposer for Long-Form

**File:** `src/contentRepurposer.js`

The content repurposer includes a `toBlog(i)` function that generates blog/article outlines from your existing tweets — perfect for converting your best-performing tweets into full articles.

### How to Use

1. Navigate to your profile page
2. Paste the script
3. Run `XActions.scan()` to collect your tweets  
4. Run `XActions.toBlog(i)` on any tweet index to generate an article outline

### Generated Outline Includes

- Article title derived from tweet content
- Subtitle with engagement context
- Section headings from each sentence
- Key takeaways section
- SEO keyword suggestions
- Estimated word count
- Call to action linking back to original tweet

## Thread Composer for Long-Form

**File:** `src/threadComposer.js`

When an article is too heavy, threads are the lightweight alternative for long-form content on X.

### Controls

- `XActions.create(topic, points)` — Generate a thread outline
- `XActions.preview()` — Preview all parts
- `XActions.post()` — Post the thread
- `XActions.export()` — Download thread data

## DOM Selectors

| Element | Selector | Notes |
|---------|----------|-------|
| Article compose | `a[href="/compose/article"]` | Navigation link |
| Title input | `[data-testid="articleTitle"]` | Article title field |
| Body editor | `[data-testid="articleBody"]` | Rich text editor |
| Publish button | `[data-testid="articlePublish"]` | Publish article |
| Draft save | `[data-testid="articleSaveDraft"]` | Save as draft |
| Cover image | `[data-testid="articleCoverImage"]` | Add cover photo |
| Format toolbar | `[data-testid="articleToolbar"]` | Formatting options |

## Content Strategy for Articles

### When to write an article vs thread vs tweet

| Format | Best For | Engagement Pattern |
|--------|----------|--------------------|
| **Tweet** (< 280 chars) | Hot takes, questions, announcements | Highest reach, lowest depth |
| **Thread** (3-15 tweets) | Tutorials, stories, analysis | High reach + depth |
| **Article** (500+ words) | Deep dives, research, guides | Lower reach, highest authority |

### Article workflow using XActions

1. **Identify article-worthy content:** Run `src/tweetPerformance.js` to find your highest-engagement tweets
2. **Generate outline:** Use `src/contentRepurposer.js` → `XActions.toBlog(i)` on top tweets
3. **Expand into article:** Use the generated outline as a skeleton
4. **Publish:** Use `src/articlePublisher.js` to publish on X
5. **Promote:** Create a thread summary with `src/threadComposer.js` linking to the article
6. **Track:** Monitor with `src/tweetPerformance.js`

### Repurposing pipeline

```
Tweet (high engagement)
  ↓ contentRepurposer.js → toBlog()
Article outline
  ↓ Write full article
Published article
  ↓ contentRepurposer.js → toThread()
Promotional thread
  ↓ contentRepurposer.js → toQuoteTemplates()
Quote-retweet variations for ongoing promotion
```

## Prerequisites

- **Article publishing:** Requires Premium+ subscription ($16/mo)
- **Thread composer:** No special subscription needed
- **Content repurposer:** No special subscription needed

## Article Best Practices

- **Cover image:** Always include one — articles with covers get 3x more clicks
- **First paragraph:** Hook the reader in the first 2 sentences
- **Length:** 800-2000 words performs best on X
- **Formatting:** Use headers every 200-300 words for scanability
- **Embeds:** Include your own tweets as embeds for engagement
- **CTA:** End with a clear call to action (follow, subscribe, share)

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Compose article" not available | Requires Premium+ subscription |
| Article won't publish | Check for empty title or body — both are required |
| Formatting lost on publish | Use the built-in toolbar, not HTML |
| Draft not saving | Check network connection — drafts auto-save every 30s |
| Article not showing in timeline | Articles may take a few minutes to appear in followers' feeds |
| Cover image upload fails | Image must be JPEG/PNG, under 5MB |
| Script can't find article editor | Ensure you're on `x.com/compose/article`, not the tweet compose box |

## Related Skills

- **content-posting** — Tweet and thread creation
- **analytics-insights** — Track article performance
- **creator-monetization** — Articles drive subscriber interest
- **growth-automation** — Promote articles for maximum reach
