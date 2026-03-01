# Changelog

All notable changes to Xeepy will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Complete rewrite from scratch with async/await architecture
- Browser automation using Playwright (no Twitter API required!)
- 12 comprehensive scrapers (replies, followers, following, tweets, etc.)
- Follow/Unfollow operations (non-followers, mass unfollow, smart unfollow)
- Engagement automation (auto-like, auto-comment, retweet, bookmark)
- Monitoring system (unfollower tracking, account monitoring, keyword alerts)
- AI integration (OpenAI GPT, Anthropic Claude, Ollama local models)
- Notification system (Discord, Telegram, Email)
- CLI interface for all operations
- Complete documentation suite
- Rate limiting to protect accounts
- Export to CSV, JSON, Excel

### Changed
- Replaced Tweepy API dependency with Playwright browser automation
- Moved from sync to async architecture
- New project structure under `xeepy/` directory

### Removed
- Deprecated Tweepy-based code (original `twitter_reply.py`)
- Twitter API key requirement

---

## [1.0.0] - 2024-XX-XX (Planned)

### Initial Release
- Full public release with all features documented
- PyPI package publication
- Comprehensive test suite
- CI/CD pipeline

---

## [0.1.0] - 2023-XX-XX (Original)

### Original Version
- Basic tweet reply extraction using Tweepy
- CSV export functionality
- Required Twitter API keys (now deprecated by Twitter)

---

## Migration Guide

### From Original Version to Xeepy

The original version used Tweepy and required Twitter API keys:

```python
# OLD (Tweepy - No longer works)
import tweepy
api.search(q="to:username")  # Deprecated!
```

The new version uses browser automation:

```python
# NEW (Xeepy - Works!)
from xeepy import Xeepy

async with Xeepy() as x:
    replies = await x.scrape.replies("https://x.com/user/status/123")
```

### Key Differences

| Old | New |
|-----|-----|
| Sync | Async |
| Tweepy | Playwright |
| API keys required | No API keys |
| $100+/month API cost | Free |
| Limited to API endpoints | Any data visible in browser |

---

## Upgrade Instructions

1. Install new dependencies:
   ```bash
   pip install xeepy
   playwright install chromium
   ```

2. Update your code:
   ```python
   # Replace imports
   # OLD: import tweepy
   # NEW: from xeepy import Xeepy
   
   # Wrap in async
   async with Xeepy() as x:
       replies = await x.scrape.replies(tweet_url)
   ```

3. Run with asyncio:
   ```python
   import asyncio
   asyncio.run(main())
   ```

---

[Unreleased]: https://github.com/nirholas/Get-Tweet-Replies-With-Python-Tweepy/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/nirholas/Get-Tweet-Replies-With-Python-Tweepy/releases/tag/v1.0.0
[0.1.0]: https://github.com/nirholas/Get-Tweet-Replies-With-Python-Tweepy/releases/tag/v0.1.0
