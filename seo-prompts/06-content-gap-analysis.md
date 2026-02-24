# Prompt 06: Content Gap Analysis — Missing Pages & Content Opportunities

> Paste this entire prompt into a new Claude Opus 4.6 chat.

---

## Context

I run **XActions** (https://xactions.app), a free, open-source X/Twitter automation toolkit with 43+ features. My site has ~20 HTML pages but I have massive untapped content that could become SEO-optimized pages.

### Current Published Pages
- Homepage, Features, Pricing, Docs, Tutorials (hub + 7 sub-pages), AI, AI API, MCP, About, Run, Privacy, Terms, Login, Admin, 404

### Existing Unpublished Content (docs/examples/ — 43 markdown files)
These are detailed feature documentation files that are NOT served as web pages:
1. `auto-liker.md` — Auto-like tweets
2. `auto-poster.md` — Auto-post tweets
3. `bookmark-exporter.md` — Export bookmarks
4. `bookmark-scraper.md` — Scrape bookmarks
5. `comment-auto-replier.md` — Auto-reply to tweets
6. `community-manager.md` — Manage X communities
7. `csv-exporter.md` — Export data to CSV
8. `detect-unfollowers.md` — Detect who unfollowed you
9. `dm-scraper.md` — Scrape direct messages
10. `engagement-analytics.md` — Engagement analytics
11. `follow-engagers.md` — Follow people who engage with tweets
12. `follower-scraper.md` — Scrape followers list
13. `following-scraper.md` — Scrape following list
14. `hashtag-scraper.md` — Scrape hashtag tweets
15. `leave-all-communities.md` — Leave all X communities
16. `like-scraper.md` — Scrape liked tweets
17. `liker-scraper.md` — Scrape tweet likers
18. `link-scraper.md` — Extract links from tweets
19. `list-scraper.md` — Scrape X lists
20. `mass-block.md` — Mass block users
21. `mass-mute.md` — Mass mute users
22. `media-scraper.md` — Scrape media/images
23. `notification-scraper.md` — Scrape notifications
24. `profile-scraper.md` — Scrape profiles
25. `quote-retweet-scraper.md` — Scrape quote retweets
26. `reply-scraper.md` — Scrape replies
27. `search-scraper.md` — Scrape search results
28. `thread-unroller.md` — Unroll tweet threads
29. `tweet-deleter.md` — Delete tweets
30. `tweet-scheduler.md` — Schedule tweets
31. `unfollow-everyone.md` — Mass unfollow everyone
32. `unfollow-non-followers.md` — Unfollow non-followers
33. `video-downloader.md` — Download X/Twitter videos
34. `viral-tweet-scraper.md` — Scrape viral/popular tweets
(+ others)

### Existing Skill Knowledge Bases (skills/ — 27 categories)
Detailed internal AI knowledge files, NOT web pages:
analytics-insights, articles-longform, blocking-muting-management, bookmarks-management, business-ads, community-management, content-cleanup, content-posting, creator-monetization, direct-messages, discovery-explore, engagement-interaction, follower-monitoring, grok-ai, growth-automation, lists-management, messaging-engagement, notifications-management, posting-content, premium-subscriptions, profile-management, settings-privacy, spaces-live, twitter-scraping, unfollow-management, xactions-cli, xactions-mcp-server

---

## Your Task

### 1. Page-Level Content Gap Analysis

Identify **every page that should exist but doesn't**. Organize into categories:

**Feature Pages (one per feature):**
- For each of the 43 docs/examples features, should it become its own SEO-optimized page?
- Which features have enough search volume to justify a dedicated page?
- Which can be combined into hub pages?
- Prioritize by search volume potential

**Comparison/VS Pages:**
- "XActions vs Hypefury"
- "XActions vs TweetHunter"
- "XActions vs Twitter API"
- "XActions vs Circleboom"
- "XActions vs Tweepy"
- "XActions vs Buffer"
- "Free vs Paid Twitter Automation Tools"
- Any other comparison pages worth creating
- Template structure for comparison pages

**"Alternative to" Pages:**
- "Hypefury Alternative"
- "TweetHunter Alternative"
- "Twitter API Alternative"
- "ManageFlitter Alternative" (defunct — huge opportunity!)
- "Crowdfire Alternative"
- Other "alternative to" page opportunities

**Use Case Pages:**
- "Twitter Automation for Developers"
- "Twitter Automation for Marketers"
- "Twitter Automation for Personal Branding"
- "Twitter Automation for Agencies"
- Other audience-specific pages

**Integration Pages:**
- "XActions + Claude Desktop"
- "XActions + ChatGPT"
- "XActions + Cursor IDE"
- "XActions + Node.js"
- Other integration pages

**How-To/Guide Pages:**
- "How to Mass Unfollow on Twitter in 2026"
- "How to Download Twitter Videos for Free"
- "How to Detect Unfollowers on Twitter"
- Generate 30+ how-to page ideas based on features

**Resource/Utility Pages:**
- Twitter Character Counter
- Tweet Formatter
- Twitter Handle Checker
- Follower Count Tracker
- Thread Planner
- Other free tools that attract organic traffic

### 2. Content Priority Matrix

For every recommended new page, provide:
| Page Title | URL Slug | Target Keyword | Est. Monthly Volume | Competition | Priority (1-5) | Content Type | Word Count Target |

Sort by priority (highest ROI first).

### 3. Content Conversion Plan

For the 43 existing docs/examples files:
- Which ones should become standalone HTML pages?
- Which should be merged into cluster pages?
- What SEO enhancements are needed (beyond the raw doc content)?
- Suggested URL structure for each

### 4. URL Architecture

Propose the ideal URL structure for all new content:
```
/tools/[feature-name]        ← individual feature pages
/compare/[tool-vs-tool]      ← comparison pages
/alternative/[competitor]    ← alternative-to pages
/guides/[topic]              ← how-to guides
/use-cases/[audience]        ← use case pages
/integrations/[platform]     ← integration pages
/resources/[tool-name]       ← free utility tools
```

Or propose a better structure with justification.

### 5. Content Production Roadmap

Phase the content creation:
- **Week 1-2:** (Quick wins) Which 10 pages to create first?
- **Week 3-4:** Next 10 pages
- **Month 2:** Long-form content, comparison pages
- **Month 3:** Resource tools, use case pages
- **Ongoing:** Blog content cadence

### 6. Estimated Traffic Impact

For the top 30 recommended new pages, estimate:
- Monthly organic traffic potential if page ranks in top 5
- Revenue impact (if applicable — AI API conversions)
- Brand visibility impact

---

## Output Format

Use tables, priority rankings, and actionable specifics. For each recommended page, I need enough detail to brief a writer or AI agent to create it. Don't be generic — every recommendation should be specific to XActions and the X/Twitter automation niche.

End with a **"Top 10 Pages to Create First"** list with full justification.
