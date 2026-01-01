# 📚 Bookmark Exporter

Export all your X/Twitter bookmarks to JSON or CSV.

## 📋 What It Does

1. Goes through your bookmarks page
2. Extracts all bookmark data
3. Includes engagement metrics
4. Exports to JSON and/or CSV

## 🌐 Browser Console Script

```javascript
// Go to: x.com/i/bookmarks
// Open Console (Ctrl+Shift+J) and paste the script from:
// src/scrapers/bookmarkExporter.js
```

## ⚙️ Configuration

```javascript
const CONFIG = {
  MAX_BOOKMARKS: 1000,    // Max bookmarks to export
  SCROLL_DELAY: 1500,     // Delay between scrolls
  FORMAT: 'both',         // 'json', 'csv', 'both'
};
```

## 📊 Output

Each bookmark includes:
- Tweet text
- Author handle and display name
- Tweet URL
- Timestamp
- Likes, retweets, replies, views
- Image URLs
- External links

## 📁 Files Downloaded

- `bookmarks_[timestamp].json` - Full data
- `bookmarks_[timestamp].csv` - Spreadsheet format

## 💡 Use Cases

- Backup your bookmarks
- Search bookmarks in a spreadsheet
- Build a content library
- Migrate to another tool

## ⚠️ Notes

- Works only on your own bookmarks
- May take a while for large collections
- X doesn't provide an official export, so this fills that gap!

---

*Part of [XActions](https://github.com/nirholas/XActions) by [@nichxbt](https://x.com/nichxbt)*
