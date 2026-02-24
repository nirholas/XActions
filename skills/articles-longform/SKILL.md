```skill
---
name: articles-longform
description: Publish and manage long-form articles on X/Twitter (Premium+). Features include rich formatting, embeds, audio articles (2026), analytics, and SEO optimization.
license: MIT
metadata:
  author: nichxbt
  version: "3.0"
---

# Articles & Long-Form Content with XActions

Publish and manage long-form articles on X/Twitter (Premium+ required).

## Features

- **Rich Text**: Formatted articles with headers, bold, italics, lists
- **Embeds**: Images, videos, tweets, links within articles
- **Audio Articles**: Embed voiceovers and podcasts (2026, testing)
- **Analytics**: Track reads, engagement, sharing metrics
- **SEO**: Article titles and descriptions for search discovery
- **Publishing**: Draft, schedule, publish workflow
- **Distribution**: Articles appear in followers' feeds

## Browser Console Script

**File:** `scripts/publishArticle.js`

### How to use

1. Navigate to `x.com/compose/article`
2. Open DevTools (F12) → Console
3. Paste the script → Enter

### Key selectors

| Element | Selector |
|---------|----------|
| Article compose | `a[href="/compose/article"]` |
| Title input | `[data-testid="articleTitle"]` |
| Body editor | `[data-testid="articleBody"]` |
| Publish button | `[data-testid="articlePublish"]` |
| Draft save | `[data-testid="articleSaveDraft"]` |
| Cover image | `[data-testid="articleCoverImage"]` |

## MCP Tools

- `x_publish_article` – Publish a long-form article
- `x_draft_article` – Save article as draft
- `x_get_articles` – Get published articles
- `x_article_analytics` – Article performance data

## API Endpoints

- `POST /api/articles/publish` – Publish article
- `POST /api/articles/draft` – Save draft
- `GET /api/articles` – List articles
- `GET /api/articles/:id/analytics` – Article analytics
- `PUT /api/articles/:id` – Update article
- `DELETE /api/articles/:id` – Delete article

## Related Files

- `src/articlePublisher.js` – Core article module
- `scripts/publishArticle.js` – Browser article script

## Notes

- Requires Premium+ subscription ($16/mo)
- Articles support rich formatting and media embeds
- Audio articles are a 2026 testing feature
- No character limit for articles
- Articles get their own analytics dashboard
```
