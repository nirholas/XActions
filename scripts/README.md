# 🛠️ Chrome DevTools Console Scripts

This folder contains ready-to-use scripts that you can copy-paste directly into Chrome DevTools Console to perform various automation tasks.

## 📋 What's in This Folder?

| Folder | Description |
|--------|-------------|
| `twitter/` | Scripts for Twitter/X automation (scraping, data extraction) |
| `templates/` | Template files for creating your own scripts |

## 🚀 How to Use These Scripts

### Step 1: Open the Target Website
Navigate to the website where you want to run the script (e.g., `twitter.com/username` for Twitter scripts).

### Step 2: Open Chrome DevTools
- **Windows/Linux:** Press `F12` or `Ctrl + Shift + I`
- **Mac:** Press `Cmd + Option + I`

### Step 3: Go to Console Tab
Click on the "Console" tab in DevTools.

### Step 4: Paste and Run
1. Copy the entire script from this folder
2. Paste it into the Console
3. Press `Enter` to run

### Step 5: Follow Console Output
Watch the console for progress messages and results!

## ⚠️ Important Security Warning

> **Only run scripts from sources you trust!**
> 
> Malicious scripts can steal your data, compromise your accounts, or perform unwanted actions. Always:
> - Read and understand what a script does before running it
> - Only use scripts from trusted sources
> - Never paste scripts from random websites or strangers

## 📁 Available Scripts

### Twitter/X Scripts (`twitter/`)

| Script | Description |
|--------|-------------|
| `scrape-profile-posts.js` | Scrape the last 100 posts from any Twitter/X profile page |

### Templates (`templates/`)

| Template | Description |
|----------|-------------|
| `script-template.js` | Boilerplate template for creating new DevTools scripts |

## 💡 Tips

- **Rate Limiting:** Most scripts include delays to avoid triggering rate limits
- **Console Logs:** Scripts use emoji prefixes for easy reading (🚀 start, ✅ success, ❌ error)
- **Data Export:** Scripts typically offer multiple export options (JSON download, clipboard copy)
- **Scrolling:** Twitter scripts auto-scroll to load more content

## 🔧 Creating Your Own Scripts

Check out `templates/script-template.js` for a starting point. Follow the patterns established there for:
- Header comments with usage instructions
- Progress logging
- Error handling
- Data export options

## 📚 Related Resources

- [XActions Documentation](../docs/)
- [Browser Console Scripts (src/)](../src/)
- [AGENTS.md](../AGENTS.md) - Selector references and patterns

---

*Part of the [XActions](https://github.com/nirholas/XActions) toolkit by [@nichxbt](https://x.com/nichxbt)*
