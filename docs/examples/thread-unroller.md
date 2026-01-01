# 🧵 Thread Unroller

Save any Twitter/X thread as clean text or markdown.

## 📋 What It Does

1. Detects the thread author
2. Scrolls to load all tweets
3. Extracts text and media
4. Formats as markdown, text, or JSON
5. Downloads the file

## 🌐 Browser Console Script

```javascript
// Go to: x.com/user/status/123456 (any tweet in a thread)
// Open Console (Ctrl+Shift+J) and paste the script from:
// src/scrapers/threadUnroller.js
```

## ⚙️ Configuration

```javascript
const CONFIG = {
  FORMAT: 'markdown',     // 'text', 'markdown', 'json'
  INCLUDE_MEDIA: true,    // Include image URLs
  INCLUDE_STATS: true,    // Include engagement stats
  MAX_TWEETS: 50,         // Max tweets in thread
};
```

## 📊 Output

- Formatted thread in console
- Downloaded as .md, .txt, or .json
- Copied to clipboard
- `window.unrolledThread` for access

## 💡 Use Cases

- Save valuable threads before they're deleted
- Convert threads to blog posts
- Archive educational content
- Read threads offline

---

*Part of [XActions](https://github.com/nirholas/XActions) by [@nichxbt](https://x.com/nichxbt)*
