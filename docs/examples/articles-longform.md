# 📄 Articles & Longform Content

Publish and manage long-form articles on X/Twitter (requires Premium+).

## 📋 What It Does

1. Composes rich-text articles with formatting
2. Saves drafts automatically
3. Publishes articles to your profile
4. Tracks article analytics

## 🌐 Browser Console Script

```javascript
// Go to: x.com/compose/article
// Paste scripts/publishArticle.js (configure title & body at top)
```

### Quick Article Setup

```javascript
// Navigate to x.com/compose/article, then type:
const title = document.querySelector('h1[contenteditable], [data-testid="articleTitle"]');
if (title) {
  title.focus();
  document.execCommand('insertText', false, 'My Article Title');
}
```

## 📦 Node.js Module

```javascript
import { publishArticle, saveDraft, getArticles } from 'xactions';

// Publish an article
await publishArticle(page, {
  title: 'Why Automation Matters in 2026',
  body: 'Long form content here...',
  coverImage: './cover.jpg',
});

// Save as draft
await saveDraft(page, { title: 'Draft Title', body: 'WIP...' });

// List your articles
const articles = await getArticles(page);
```

## 🔧 MCP Server

```
Tool: x_publish_article
Input: { "title": "Article Title", "body": "Content...", "publish": false }
```

## ✍️ Article Features

- **Rich text formatting**: Headers, bold, italic, lists, blockquotes
- **Media embeds**: Images, tweets, videos
- **Cover images**: Custom header images
- **Drafts**: Auto-save and manual draft saving
- **Analytics**: Views, reads, engagement metrics
- **Audio articles**: AI-generated audio narration (2026 beta)

## ⚠️ Notes

- Articles require **Premium+ ($16/mo)** subscription
- Maximum article length: ~10,000 words (no hard limit)
- Articles appear on your profile under the "Articles" tab
- Audio article generation is in beta as of early 2026
- Articles support SEO-friendly URLs
