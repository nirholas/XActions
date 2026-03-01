# Changelog

All notable changes to Xeepy are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- GraphQL API client for higher rate limits
- Twitter Spaces scraping and audio capture
- Media download functionality (photos, videos, HQ)
- Trends and recommendations scraper
- Poll creation and voting
- DM management (send, inbox, history, search, delete)
- Scheduled tweets and drafts
- Account settings management
- Cookie session save/load/import
- AI-powered content generation with OpenAI, Anthropic, Ollama
- Sentiment analysis
- Bot detection
- Comprehensive monitoring and analytics
- Discord, Telegram, email notifications
- Full CLI interface

### Changed
- Improved rate limiting with per-operation limits
- Better error messages and handling
- Performance optimizations for large scraping jobs

### Fixed
- Session expiration handling
- Memory usage for large datasets
- Thread unrolling accuracy

---

## [1.0.0] - 2024-01-15

### Added
- Initial public release
- Core scraping functionality:
  - Tweet replies
  - User profiles
  - Followers/following lists
  - User tweets
  - Search results
  - Hashtag tweets
  - Thread unrolling
- Follow/unfollow operations:
  - Follow user
  - Follow by hashtag
  - Unfollow non-followers
  - Smart unfollow
  - Whitelist support
- Engagement actions:
  - Like tweets
  - Retweet
  - Reply
  - Bookmark
  - Auto-like by keyword
- Export functionality:
  - CSV
  - JSON
  - Excel
  - Database (SQLite, PostgreSQL, MySQL)
- Basic monitoring:
  - Unfollower detection
  - Growth tracking
- Authentication:
  - Browser-based login
  - Session persistence
  - Cookie import
- CLI interface
- Documentation

### Security
- Encrypted session storage option
- Secure credential handling

---

## [0.9.0] - 2024-01-01 (Beta)

### Added
- Beta release for testing
- Core functionality implementation
- Initial documentation

### Known Issues
- Rate limiting needs tuning
- Some UI element selectors may break

---

## Version History Summary

| Version | Date | Highlights |
|---------|------|------------|
| 1.0.0 | 2024-01-15 | Initial public release |
| 0.9.0 | 2024-01-01 | Beta release |

---

## Upgrade Guide

### Upgrading to 1.0.0

```bash
pip install --upgrade xeepy
```

No breaking changes from 0.9.0.

### Breaking Changes Log

None yet. We're committed to backwards compatibility.

---

## Links

- [GitHub Releases](https://github.com/xeepy/xeepy/releases)
- [PyPI](https://pypi.org/project/xeepy/)
- [Migration Guides](migration.md)
