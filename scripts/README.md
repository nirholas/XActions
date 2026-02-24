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

#### 🗑️ Unfollow & Cleanup
| Script | Description |
|--------|-------------|
| `unfollow-everyone.js` | Mass unfollow all accounts you follow |
| `unfollow-non-followers.js` | Unfollow accounts that don't follow you back |
| `unfollow-with-log.js` | Unfollow with a downloadable log of all actions |
| `smart-unfollow.js` | Time-based smart unfollow for non-followers after grace period |
| `leave-all-communities.js` | Leave all X Communities you've joined |

#### 👀 Monitoring & Tracking
| Script | Description |
|--------|-------------|
| `detect-unfollowers.js` | Compare follower snapshots to detect who unfollowed you |
| `monitor-account.js` | Track any account's follower/following changes |
| `continuous-monitor.js` | Auto-refresh monitoring with browser notifications |
| `new-followers-alert.js` | New follower alerts with welcome message templates |

#### 🤖 Automation
| Script | Description |
|--------|-------------|
| `auto-liker.js` | Auto-like tweets with keyword/user filtering |
| `auto-commenter.js` | Auto-comment on target user's posts |
| `follow-engagers.js` | Follow likers/retweeters of specific posts |
| `follow-target-users.js` | Follow followers/following of target accounts |
| `keyword-follow.js` | Follow users from keyword search results |
| `protect-active-users.js` | Find engaged users to protect from unfollow |

#### � Analytics
| Script | Description |
|--------|-------------|
| `tweet-price-correlation.js` | Correlate founder tweets with token price movements (CoinGecko/GeckoTerminal) |

#### �📊 Scrapers
| Script | Description |
|--------|-------------|
| `scrape-profile-posts.js` | Advanced tweet scraper with filtering, analytics, multi-format export |
| `viral-tweets-scraper.js` | Find top-performing viral tweets by engagement |
| `link-scraper.js` | Extract all links shared by a specific user |
| `bookmark-exporter.js` | Export all your bookmarks to JSON and CSV |
| `thread-unroller.js` | Save Twitter threads as markdown, text, or JSON |
| `video-downloader.js` | Download videos from any X/Twitter post |

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
