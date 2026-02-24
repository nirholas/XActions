---
name: articles-longform
description: Publishes long-form articles on X/Twitter using the Premium+ article editor. Supports rich formatting, embeds, and drafts. Use when users want to publish or manage articles on X.
license: MIT
metadata:
  author: nichxbt
  version: "3.0"
---

# Articles & Long-Form Content

Browser console script for publishing articles on X/Twitter. Requires Premium+ subscription.

## Available Scripts

| Script | File | Purpose |
|--------|------|---------|
| Article Publisher | `src/articlePublisher.js` | Publish, draft, and manage long-form articles |

## Article Publisher

**File:** `src/articlePublisher.js`

### How to use

1. Navigate to `x.com/compose/article`
2. Open DevTools (F12) → Console
3. Paste the script → Enter

### Key Selectors

| Element | Selector |
|---------|----------|
| Article compose | `a[href="/compose/article"]` |
| Title input | `[data-testid="articleTitle"]` |
| Body editor | `[data-testid="articleBody"]` |
| Publish button | `[data-testid="articlePublish"]` |
| Draft save | `[data-testid="articleSaveDraft"]` |
| Cover image | `[data-testid="articleCoverImage"]` |

## Notes

- Requires Premium+ subscription ($16/mo)
- Articles support rich formatting (headers, bold, italics, lists) and media embeds
- No character limit for articles
- Articles appear in followers' feeds and have their own analytics
