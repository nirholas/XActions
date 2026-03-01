# 🤖 AI Agent Prompts for Building Xeepy

> Complete prompts used to build this toolkit with AI coding agents.

This file documents the prompts used to build Xeepy using multiple AI agents working in parallel. These prompts can be used to:
1. Understand the architecture decisions
2. Extend the toolkit with new features
3. Learn about AI-assisted development

---

## Architecture Overview

Xeepy was built using 5 specialized AI agents working in parallel:

| Agent | Responsibility | Files |
|-------|----------------|-------|
| 🔧 InfraScraperAgent | Core infrastructure + 12 scrapers | `core/`, `scrapers/` |
| 🔄 FollowOpsAgent | Follow/unfollow operations | `actions/follow/`, `actions/unfollow/` |
| 💜 EngagementAgent | Engagement automation | `actions/engagement/` |
| 📊 MonitoringAgent | Monitoring & analytics | `monitoring/`, `notifications/` |
| 🧠 AIFeaturesAgent | AI integration | `ai/` |

---

## Agent 1: Infrastructure & Scrapers

**Purpose:** Build the core foundation and all 12 scrapers.

### Core Infrastructure Prompt

```
You are building the core infrastructure for a Python X/Twitter automation toolkit.

Create these foundational modules:

1. xeepy/core/browser.py - Playwright browser management
   - BrowserManager class with async context manager
   - Support headless and headed modes
   - Handle browser lifecycle (launch, close, restart)
   - Implement page pool for parallel operations

2. xeepy/core/auth.py - Authentication
   - Session management with cookie persistence
   - Manual login flow (opens browser)
   - Cookie import/export (JSON format)
   - Session validation

3. xeepy/core/rate_limiter.py - Rate limiting
   - Token bucket algorithm
   - Configurable limits per action type
   - Automatic delay injection
   - Rate limit state persistence

4. xeepy/core/config.py - Configuration
   - Pydantic settings model
   - Environment variable support
   - YAML/JSON config file loading
   - Default sensible values

Requirements:
- Python 3.10+ with full type hints
- Async/await throughout
- Comprehensive error handling
- Detailed docstrings
- No stubs - complete implementations
```

### Scrapers Prompt

```
Build 12 comprehensive scrapers for X/Twitter data extraction.

Each scraper should:
- Inherit from BaseScraper
- Use Playwright browser automation
- Handle infinite scroll pagination
- Parse data into Pydantic models
- Support configurable limits
- Include retry logic

Scrapers to implement:

1. ReplyScraper - Get replies to a tweet
2. ProfileScraper - User profile data
3. FollowersScraper - Follower list with details
4. FollowingScraper - Following list
5. TweetsScraper - User's tweet history
6. ThreadScraper - Full thread unroller
7. HashtagScraper - Tweets by hashtag
8. SearchScraper - Search results
9. MediaScraper - User's media posts
10. LikesScraper - Who liked a tweet
11. ListsScraper - List members
12. MentionsScraper - Mentions of a user

Data models needed:
- Tweet(id, text, username, created_at, likes, retweets, replies, url, media)
- User(id, username, name, bio, followers_count, following_count, verified)
- Media(type, url, thumbnail_url)
```

---

## Agent 2: Follow/Unfollow Operations

**Purpose:** Build all follow and unfollow functionality.

### Prompt

```
Build follow/unfollow operations for the X/Twitter automation toolkit.

FOLLOW OPERATIONS (xeepy/actions/follow/):

1. follow_user.py - Follow a single user
   - Navigate to profile, click follow button
   - Verify follow was successful
   - Handle already-following case
   - Rate limit aware

2. follow_by_keyword.py - Follow from search results
   - Search for keyword
   - Filter by criteria (min followers, verified, etc.)
   - Follow up to limit
   - Track who was followed

3. follow_by_hashtag.py - Follow users from hashtag
   - Scrape hashtag tweets
   - Extract unique users
   - Apply filters
   - Batch follow with delays

4. follow_followers.py - Follow target's followers
   - Scrape followers of target account
   - Filter (min followers, active recently, etc.)
   - Batch follow operation

5. follow_engagers.py - Follow users who engaged
   - Get likers/retweeters of a tweet
   - Follow them as they're likely interested

UNFOLLOW OPERATIONS (xeepy/actions/unfollow/):

1. unfollow_user.py - Unfollow single user
   - Navigate to profile
   - Click unfollow, confirm dialog
   - Verify unfollow success

2. unfollow_non_followers.py - Unfollow who doesn't follow back
   - Get following list
   - Check who follows back
   - Unfollow non-followers
   - Support whitelist
   - dry_run mode for preview

3. unfollow_all.py - Mass unfollow (nuclear option)
   - Unfollow everyone
   - Whitelist support
   - Requires explicit confirmation
   - Default dry_run=True

4. smart_unfollow.py - Intelligent unfollow
   - Time-based (unfollow if no follow-back in X days)
   - Engagement-based (low engagement accounts)
   - Activity-based (inactive accounts)

5. unfollow_by_criteria.py - Filter-based unfollow
   - By follower count (too many/too few)
   - By tweet frequency
   - By account age
   - By keywords in bio

All operations must:
- Use rate limiter
- Log all actions
- Store in database for history
- Return detailed result objects
- Handle errors gracefully
```

---

## Agent 3: Engagement Automation

**Purpose:** Build engagement features (like, comment, retweet, bookmark).

### Prompt

```
Build engagement automation for the X/Twitter toolkit.

LIKE OPERATIONS (xeepy/actions/engagement/like/):

1. like_tweet.py - Like a single tweet
   - Navigate to tweet
   - Click like button
   - Verify liked
   - Handle already-liked

2. auto_like.py - Auto-like by criteria
   - By keywords in tweet text
   - By hashtags
   - By specific users
   - Configurable limit and delay
   - Skip already-liked

3. like_by_user.py - Like user's recent tweets
   - Scrape user's tweets
   - Like up to limit
   - Smart selection (not too old)

COMMENT OPERATIONS (xeepy/actions/engagement/comment/):

1. comment.py - Post a comment
   - Navigate to tweet
   - Click reply button
   - Type comment
   - Submit
   - Verify posted

2. auto_comment.py - Auto-comment
   - Comment on matching tweets
   - Use template system
   - Variable substitution
   - AI-generated option

3. comment_templates.py - Template management
   - Load templates from file
   - Random selection
   - Variable support ({username}, {topic}, etc.)

RETWEET OPERATIONS (xeepy/actions/engagement/retweet/):

1. retweet.py - Retweet a tweet
2. quote_tweet.py - Quote tweet with comment
3. undo_retweet.py - Remove retweet

BOOKMARK OPERATIONS (xeepy/actions/engagement/bookmark/):

1. bookmark_tweet.py - Add bookmark
2. remove_bookmark.py - Remove bookmark
3. export_bookmarks.py - Export all bookmarks
4. bookmark_manager.py - Manage bookmark folders

All engagement must:
- Respect rate limits
- Log all actions with timestamps
- Support dry_run mode
- Return success/failure with details
```

---

## Agent 4: Monitoring & Analytics

**Purpose:** Build monitoring, tracking, and notification systems.

### Prompt

```
Build monitoring and analytics for the X/Twitter toolkit.

MONITORING (xeepy/monitoring/):

1. unfollower_tracker.py - Detect unfollowers
   - Take snapshots of followers
   - Compare over time
   - Detect new unfollowers
   - Detect new followers
   - Generate reports

2. account_monitor.py - Monitor any account
   - Track follower count changes
   - Detect bio changes
   - Detect profile changes
   - Alert on significant changes

3. keyword_monitor.py - Real-time keyword monitoring
   - Watch for keywords/hashtags
   - Stream-like functionality (poll-based)
   - Callback on new matches
   - Filter by criteria

4. growth_tracker.py - Track growth over time
   - Daily/weekly/monthly metrics
   - Follower growth rate
   - Engagement rate
   - Best performing content

ANALYTICS (xeepy/monitoring/analytics.py):

1. EngagementAnalytics
   - Calculate engagement rate
   - Best posting times
   - Top performing tweets
   - Audience insights

2. GrowthAnalytics
   - Growth velocity
   - Projection modeling
   - Trend analysis

NOTIFICATIONS (xeepy/notifications/):

1. discord.py - Discord webhooks
   - Send notifications
   - Rich embeds
   - Configurable events

2. telegram.py - Telegram bot
   - Send messages
   - Commands support

3. email.py - Email notifications
   - SMTP support
   - HTML templates

4. base.py - Notification base class
   - Common interface
   - Event filtering
   - Rate limiting notifications

Storage needs (xeepy/storage/):
1. database.py - SQLite for local data
2. snapshots.py - Follower snapshots
3. timeseries.py - Time-series data
```

---

## Agent 5: AI Features

**Purpose:** Build AI integration (OpenAI, Anthropic, Ollama).

### Prompt

```
Build AI integration for the X/Twitter toolkit.

AI PROVIDERS (xeepy/ai/providers.py):

Create abstraction layer supporting:
1. OpenAI (GPT-4, GPT-3.5)
2. Anthropic (Claude 3 Opus, Sonnet, Haiku)
3. Ollama (local models)

Base class:
- async generate(prompt, **kwargs) -> str
- async generate_structured(prompt, schema) -> dict
- Support streaming
- Handle rate limits
- Retry logic

CONTENT GENERATION (xeepy/ai/content.py):

1. ContentGenerator class
   - generate_reply(tweet_text, style, context)
   - generate_tweet(topic, style, hashtags)
   - generate_thread(topic, points)
   - improve_draft(draft)

Styles:
- friendly, witty, professional, crypto, supportive

2. Templates with AI enhancement
   - Base template + AI variation
   - Personality consistency
   - Hashtag suggestions

ANALYSIS (xeepy/ai/analysis.py):

1. SentimentAnalyzer
   - analyze_tweet(tweet) -> sentiment score
   - analyze_batch(tweets) -> aggregate
   - detect_tone(text)

2. BotDetector
   - analyze_profile(user) -> bot_probability
   - Check patterns (posting frequency, content similarity)
   - Engagement pattern analysis

3. ContentClassifier
   - Categorize tweet topics
   - Detect spam/promotional
   - Identify opportunities

SMART FEATURES (xeepy/ai/smart.py):

1. SmartTargeting
   - Suggest accounts to follow
   - Optimal engagement targets
   - Growth recommendations

2. TrendAnalyzer
   - Identify trending topics in niche
   - Predict virality
   - Content opportunity detection

Configuration:
- xeepy/ai/config.py - AI provider settings
- Support for API keys via environment
- Model selection
- Cost tracking
```

---

## Using These Prompts

### For Development

Copy the relevant prompt and give it to your AI coding assistant (Copilot, Cursor, Claude, etc.) to extend Xeepy.

### For Learning

Study the prompts to understand:
- How to structure complex systems
- How to specify requirements clearly
- How to coordinate multiple agents

### For Contributing

Use these prompts as templates when adding new features. Maintain the same:
- Code style (async, type hints)
- Documentation standards
- Error handling patterns
- Testing requirements

---

## Success Criteria

Each agent was given these universal requirements:

1. **No Stubs** - Every function must be fully implemented
2. **Type Hints** - Full typing throughout
3. **Docstrings** - Google-style docstrings
4. **Error Handling** - Comprehensive try/except
5. **Async Native** - All I/O operations async
6. **Rate Limiting** - Integrate with rate limiter
7. **Logging** - Structured logging
8. **Testing** - Unit tests for each module

---

*This documentation is part of Xeepy - the most comprehensive Python toolkit for X/Twitter automation.*
