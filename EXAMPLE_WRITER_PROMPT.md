# 🔥 XActions — Example Writer Mega-Prompt

> **Purpose:** Give this entire prompt to Claude to generate world-class, SEO-optimized, real-world examples for every XActions feature. Each example should be so visual and well-crafted that it surprises the reader, ranks on Google, and gets cited in Google AI summaries.

---

## System Instructions

You are a world-class technical writer and SEO specialist writing example documentation for **XActions** — the complete free X/Twitter automation toolkit. Your job is to create **one detailed, real-world example page** for every feature listed below.

Every example must be:
- **Real-world** — a believable scenario someone would actually do on X.com (not abstract)
- **Visual** — rich with ASCII diagrams, terminal output previews, before/after comparisons, emoji-styled step cards, and formatted output samples that make the reader go "wow"
- **Complete** — includes every line of code, every step, every config option. Copy-paste ready.
- **SEO-optimized** — written to rank #1 on Google for the exact query someone would type
- **Google AI Summary ready** — structured so Google can extract a featured snippet or AI overview answer

---

## Output Format

For **each feature**, produce a single Markdown file following this exact structure:

```markdown
---
title: "[SEO Title — 60 chars max, includes 'X' AND 'Twitter' keywords]"
description: "[Meta description — 155 chars max, action-oriented, includes primary keyword]"
keywords: [array of 8-12 long-tail keywords people actually Google]
canonical: "https://xactions.app/examples/[slug]"
author: "nich (@nichxbt)"
date: "2026-02-24"
---

# [Emoji] [Feature Name] — [Benefit Statement]

> [One-line hook that answers the searcher's intent directly. This is what Google will show as the featured snippet.]

**Works on:** 🌐 Browser Console · 💻 CLI · 🤖 MCP (AI Agents)
**Difficulty:** 🟢 Beginner / 🟡 Intermediate / 🔴 Advanced
**Time:** ⏱️ [X minutes]
**Requirements:** [what's needed]

---

## 🎯 Real-World Scenario

> [Write a 3-4 sentence vivid scenario that a real person would relate to. Use second person "you." Paint the problem, then show XActions as the solution. Make it emotionally engaging.]

**Before XActions:**
[Visual representation of the painful manual process — use a table, diagram, or comparison]

**After XActions:**
[Visual representation of the automated result — show the dramatic improvement]

---

## 📋 What This Does (Step by Step)

[Numbered list with emoji icons showing exactly what happens when the script runs. Be specific — mention DOM elements, API calls, file outputs.]

```
┌─────────────────────────────────────────┐
│  Visual flow diagram showing the        │
│  automation pipeline using ASCII art    │
│  (boxes, arrows, labels)                │
│                                         │
│  [Start] ──→ [Step 1] ──→ [Step 2]     │
│                  │                       │
│                  ▼                       │
│            [Step 3] ──→ [Done ✓]        │
└─────────────────────────────────────────┘
```

---

## 🌐 Method 1: Browser Console (Copy-Paste)

### Prerequisites
- [Checklist of what's needed]

### Step 1: Navigate to the right page
> Go to `x.com/[specific-URL]`

[Include a text mockup of what the page looks like — styled as a UI wireframe:]

```
┌──────────────────────────────────────┐
│ 🔍 x.com/username/following          │
├──────────────────────────────────────┤
│                                      │
│  👤 @elonmusk         [Following ✓]  │
│  👤 @nichxbt           [Following ✓]  │
│  👤 @openai            [Following ✓]  │
│  ...842 more                         │
│                                      │
└──────────────────────────────────────┘
```

### Step 2: Open Developer Console
[Keyboard shortcut for each OS, with a visual showing the console UI]

### Step 3: Paste and Run
```javascript
// Full, complete, working script
// With inline comments explaining every section
// Copy-paste ready — nothing to install
```

### ✅ Expected Output
[Show exactly what the console will print — make it look like a real terminal:]

```
☢️  XActions - [FEATURE NAME]
════════════════════════════════════════
📊 Found 845 accounts
⏳ Starting... (estimated: ~12 minutes)

  ✓ Unfollowed @spam_bot_1          [1/845]
  ✓ Unfollowed @inactive_user_42    [2/845]
  ✓ Unfollowed @crypto_shill_99     [3/845]
  ⏸️  Pausing 30s (safety break)...
  ...

════════════════════════════════════════
✅ COMPLETE!
📊 Results:
   • Processed: 845
   • Successful: 841
   • Failed: 4 (rate limited)
   • Time: 11m 23s
📁 Backup saved: xactions_backup_2026-02-24.json
════════════════════════════════════════
```

---

## 💻 Method 2: CLI (Command Line)

```bash
# Install XActions globally
npm install -g xactions

# Run the command
npx xactions [command] [flags]
```

### Example with all options:
```bash
npx xactions [command] \
  --option1 value \
  --option2 value \
  --output results.json
```

### ✅ CLI Output Preview
```
⚡ XActions v2.x.x
[Show realistic CLI output with progress bars, colors described, results]
```

---

## 🤖 Method 3: MCP Server (AI Agents)

> Use with Claude Desktop, GPT, Cursor, or any MCP-compatible AI agent.

```json
{
  "tool": "x_[tool_name]",
  "arguments": {
    "param": "value"
  }
}
```

**Claude Desktop example prompt:**
> "[Natural language prompt someone would type to an AI agent to trigger this feature]"

---

## ⚙️ Configuration Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `option1` | string | `""` | What it does |
| `option2` | number | `25` | What it controls |
| ... | ... | ... | ... |

---

## 📊 Sample Output / Results

[Show a realistic, formatted sample of the data or results this feature produces. Use tables, JSON blocks, or visual representations.]

### Example JSON Export:
```json
{
  "generated": "2026-02-24T10:30:00Z",
  "tool": "xactions",
  "results": { ... }
}
```

### Example CSV:
```csv
username,followers,following,verified
@elonmusk,200000000,800,true
```

---

## 💡 Pro Tips

1. **[Tip title]** — [Actionable tip with specific detail]
2. **[Tip title]** — [Actionable tip with specific detail]
3. **[Tip title]** — [Actionable tip with specific detail]

---

## ⚠️ Important Notes

- [Rate limiting guidance]
- [Safety warning]
- [Platform policy reminder]
- [Known limitation]

---

## 🔗 Related Features

| Feature | Use Case | Link |
|---------|----------|------|
| [Related 1] | When you also want to... | [→ Guide](link) |
| [Related 2] | Combine with this for... | [→ Guide](link) |
| [Related 3] | Alternative approach... | [→ Guide](link) |

---

## ❓ FAQ

### Q: [Most commonly Googled question about this feature]?
**A:** [Direct answer — this is what Google will extract for AI summaries]

### Q: [Second common question]?
**A:** [Direct answer]

### Q: [Third common question]?
**A:** [Direct answer]

---

<footer>
Built with ⚡ by <a href="https://x.com/nichxbt">@nichxbt</a> · <a href="https://xactions.app">xactions.app</a> · <a href="https://github.com/nichxbt/xactions">GitHub</a>
</footer>
```

---

## SEO Requirements (Apply to EVERY page)

### Title Tag Formula
```
[Action Verb] [Object] on X (Twitter) — Free [Tool Type] | XActions
```
Examples:
- "Unfollow Everyone on X (Twitter) — Free Browser Script | XActions"
- "Scrape Twitter Followers to CSV — Free No-API Tool | XActions"
- "Auto-Like Tweets on X (Twitter) — Free Automation Script | XActions"

### H1 Must Include
- The primary keyword
- Both "X" and "Twitter" (people search for both)
- A benefit or outcome

### FAQ Schema Target
Every FAQ section must answer questions **exactly as people Google them:**
- "How to mass unfollow on Twitter"
- "How to unfollow everyone on X"
- "How to scrape Twitter followers without API"
- "How to see who unfollowed me on Twitter"
- "How to download Twitter videos for free"

### Long-Tail Keywords to Target (include naturally in body text)
Each page should naturally include variations like:
- "how to [action] on Twitter 2026"
- "mass [action] Twitter free"
- "[action] X Twitter no API"
- "Twitter [action] script"
- "unfollow/scrape/like Twitter automation free"
- "xactions [feature]"

### Internal Linking
Every page must link to:
- At least 2-3 related feature pages
- The main xactions.app site
- The GitHub repo
- The CLI install guide

### Structured Data Hints
Write content so that Google can easily extract:
- **HowTo steps** (numbered, with clear actions)
- **FAQ answers** (Q&A format)
- **Code snippets** (clearly labeled language blocks)
- **Tables** (comparison, configuration, results)

---

## Visual Standards

### Every page MUST include at least 3 of these visual elements:

1. **ASCII UI Mockup** — Show what the X.com page looks like before/after
```
┌─────────────────────────────────────┐
│  X.com UI representation            │
│  Shows buttons, user cards, menus   │
└─────────────────────────────────────┘
```

2. **Flow Diagram** — Show the automation pipeline
```
[You] → [Script] → [X.com] → [Results]
              │
              ▼
        [Safety Checks]
```

3. **Before/After Comparison**
```
BEFORE                          AFTER
──────                          ─────
Following: 2,847                Following: 0
Ratio: 0.3x                    Ratio: ∞
Time spent: 3 days clicking     Time spent: 12 minutes
```

4. **Terminal Output Preview** — Show realistic console output with progress
5. **Data Sample** — Show what exported data looks like (JSON/CSV table)
6. **Configuration Table** — All options in a clean table
7. **Comparison Table** — Compare methods (Browser vs CLI vs MCP)

### Method Comparison Table (include on every page that has multiple methods):
```
| Feature | 🌐 Browser | 💻 CLI | 🤖 MCP |
|---------|-----------|--------|---------|
| Setup   | None      | npm install | Config JSON |
| Speed   | Fast      | Fastest | Via AI agent |
| Best for | Quick tasks | Power users | AI workflows |
| Batch   | ✅        | ✅      | ✅       |
| Export  | JSON      | JSON/CSV | JSON     |
```

---

## Complete Feature List — Generate One Example Per Feature

### 🚫 Unfollow Management
1. **unfollow-everyone** — "I followed 5,000 people over the years and want a complete fresh start"
2. **unfollow-non-followers** — "I follow 2,000 people but only 400 follow me back — remove the rest"
3. **smart-unfollow** — "Unfollow inactive accounts and people who haven't posted in 6 months, but keep my close friends"

### 📊 Scraping & Data Export
4. **profile-scraping** — "I need detailed info on a competitor's account for a pitch deck"
5. **followers-scraping** — "Export my entire follower list to a spreadsheet for CRM import"
6. **following-scraping** — "See everyone I follow in a searchable CSV"
7. **tweet-scraping** — "Archive my last 500 tweets before I delete them"
8. **search-tweets** — "Find all tweets mentioning my product from the last 30 days"
9. **thread-scraping** — "Save a 47-tweet thread from an expert as a clean document"
10. **hashtag-scraping** — "Collect all tweets with #buildinpublic to analyze trends"
11. **media-scraping** — "Download all images from a photographer's Twitter media tab"
12. **link-scraper** — "Extract all URLs shared by tech influencers for research"
13. **list-scraping** — "Get all members of a curated 'Top AI Researchers' list"
14. **likes-scraping** — "Export the tweets I've liked for a content bookmarking system"
15. **video-downloader** — "Download a viral Twitter video to share on another platform"
16. **viral-tweet-scraper** — "Find high-engagement tweets in my niche for content inspiration"
17. **bookmark-exporter** — "Export all my X bookmarks to Notion before they become premium-only"

### ❤️ Engagement & Growth Automation
18. **auto-liker** — "Auto-like tweets about 'AI startups' to grow my presence in the AI community"
19. **auto-commenter** — "Automatically reply to trending tweets in my niche with thoughtful AI-generated comments"
20. **auto-repost** — "Repost tweets matching specific keywords to my timeline automatically"
21. **follow-engagers** — "Follow everyone who liked or retweeted a viral tweet in my niche"
22. **follow-target-followers** — "Follow the followers of @competitor to steal their audience"
23. **keyword-follow** — "Auto-follow people who tweet about 'web3 development'"
24. **growth-suite** — "Run auto-like + auto-follow + auto-comment as a coordinated growth campaign"

### 📈 Monitoring & Analytics
25. **detect-unfollowers** — "I lost 50 followers this week — who unfollowed me?"
26. **new-follower-alerts** — "Get a desktop notification every time I get a new follower with their profile info"
27. **monitor-account** — "Track @competitor's follower count daily and alert me on big changes"
28. **engagement-analytics** — "Analyze my last 100 tweets to find my best-performing content"

### 🧹 Account Cleanup
29. **leave-all-communities** — "I joined 200 communities during a binge — leave all of them"
30. **unlike-all-posts** — "Unlike every tweet I've ever liked for a privacy reset"
31. **mass-block-unblock** — "Block all 500 bot accounts following me, then unblock them to force-remove as followers"

### 📝 Content & Posting
32. **post-thread** — "Write and post a 10-tweet thread about my startup launch"
33. **schedule-posts** — "Schedule 7 tweets for the week ahead with specific times"
34. **create-poll** — "Create a poll asking your audience what feature to build next"
35. **send-direct-message** — "Send a DM to new followers welcoming them"

### 🤖 AI & Developer Tools
36. **mcp-server** — "Set up XActions as an MCP server so Claude can manage my X account"
37. **multi-account** — "Run the same automation across 3 different X accounts"

### 🏘️ Community & Lists
38. **leave-all-communities** (already listed — use as community management)

### 📊 Advanced Analytics
39. **hashtag-analytics** — "Analyze which hashtags drive the most engagement for my brand"
40. **competitor-analysis** — "Compare my engagement metrics against 3 competitors side by side"
41. **best-time-to-post** — "Find the exact hours when my audience is most active"
42. **audit-followers** — "Detect bot and fake accounts in my follower list"

---

## Quality Bar — Every Example Must Pass These Checks

- [ ] **Scenario is specific and relatable** — not "scrape some data" but "export your 10,000 followers to a Google Sheet for your marketing team"
- [ ] **Code is 100% copy-paste ready** — no placeholders like `YOUR_TOKEN_HERE` unless absolutely required, and if so, show exactly where to find it
- [ ] **Output preview looks real** — use realistic usernames, numbers, timestamps
- [ ] **At least 3 visual elements** per page (ASCII mockups, flow diagrams, terminal previews, tables, before/after)
- [ ] **FAQ answers the #1 Google query** for this feature
- [ ] **Title tag is under 60 characters** and includes "X" and "Twitter"
- [ ] **Meta description is under 155 characters** and is action-oriented
- [ ] **Internal links** to at least 2 related features
- [ ] **Method comparison table** if feature supports multiple methods
- [ ] **Configuration table** with all options documented
- [ ] **Pro tips section** with at least 2 actionable tips
- [ ] **Warnings section** about rate limits and platform policies
- [ ] **Works** — the script/command would actually work if run today

---

## Tone & Voice

- **Direct and confident** — "Here's how to do it" not "You might want to consider"
- **Slightly irreverent** — okay to have personality ("the nuclear option", "steal their audience")
- **Technically precise** — correct selectors, accurate delays, real output formats
- **No fluff** — every sentence earns its place
- **Inclusive** — works for developers AND non-technical users with clear step-by-step

---

## File Naming Convention

Save each file as:
```
docs/examples/[feature-slug].md
```

Using kebab-case matching the feature names above (e.g., `unfollow-everyone.md`, `profile-scraping.md`, `auto-liker.md`).

---

## Execution Instructions

1. **Start with the highest-SEO-value features first:**
   - `unfollow-everyone.md` (massive search volume: "how to unfollow everyone on Twitter")
   - `unfollow-non-followers.md` ("how to see who doesn't follow you back on Twitter")
   - `video-downloader.md` ("Twitter video downloader free")
   - `detect-unfollowers.md` ("who unfollowed me on Twitter")
   - `followers-scraping.md` ("scrape Twitter followers")

2. **Then cover all remaining features** in the order listed above.

3. **For each feature:**
   - Read the corresponding source file in `src/` or `scripts/` to get the exact working code
   - Read the corresponding `skills/[category]/SKILL.md` for full feature documentation
   - Read any existing `docs/examples/[feature].md` to improve upon (not duplicate) existing content
   - Produce the complete Markdown file following the template above

4. **Cross-link everything** — every page should form part of an interconnected web of content

---

## Reference Files to Read

Before writing each example, read these source files for accurate code and configuration:

| Feature | Source File(s) | Skill Doc |
|---------|---------------|-----------|
| Unfollow Everyone | `src/unfollowEveryone.js` | `skills/unfollow-management/SKILL.md` |
| Unfollow Non-Followers | `src/unfollowback.js` | `skills/unfollow-management/SKILL.md` |
| Smart Unfollow | `src/unfollowWDFBLog.js` | `skills/unfollow-management/SKILL.md` |
| Profile Scraping | `scripts/scrapeProfile.js` | `skills/twitter-scraping/SKILL.md` |
| Followers Scraping | `scripts/scrapeFollowers.js` | `skills/twitter-scraping/SKILL.md` |
| Following Scraping | `scripts/scrapeFollowing.js` | `skills/twitter-scraping/SKILL.md` |
| Tweet Scraping | `scripts/scrapeSearch.js` | `skills/twitter-scraping/SKILL.md` |
| Search Tweets | `scripts/scrapeSearch.js` | `skills/discovery-explore/SKILL.md` |
| Thread Scraping | `scripts/threadUnroller.js` | `skills/twitter-scraping/SKILL.md` |
| Hashtag Scraping | `scripts/scrapeHashtag.js` | `skills/twitter-scraping/SKILL.md` |
| Media Scraping | `scripts/scrapeMedia.js` | `skills/twitter-scraping/SKILL.md` |
| Link Scraper | `scripts/linkScraper.js` | `skills/twitter-scraping/SKILL.md` |
| List Scraping | `scripts/scrapeList.js` | `skills/lists-management/SKILL.md` |
| Likes Scraping | `scripts/scrapeLikes.js` | `skills/twitter-scraping/SKILL.md` |
| Video Downloader | `scripts/videoDownloader.js` | `skills/twitter-scraping/SKILL.md` |
| Viral Tweet Scraper | `scripts/viralTweetsScraper.js` | `skills/twitter-scraping/SKILL.md` |
| Bookmark Exporter | `scripts/bookmarkExporter.js` | `skills/bookmarks-management/SKILL.md` |
| Auto-Liker | `src/automation/autoLiker.js` | `skills/growth-automation/SKILL.md` |
| Auto-Commenter | `src/automation/autoCommenter.js` | `skills/growth-automation/SKILL.md` |
| Auto-Repost | `src/autoRepost.js` | `skills/content-posting/SKILL.md` |
| Follow Engagers | `src/automation/followEngagers.js` | `skills/growth-automation/SKILL.md` |
| Follow Target Followers | `src/automation/followTargetFollowers.js` | `skills/growth-automation/SKILL.md` |
| Keyword Follow | `src/automation/keywordFollow.js` | `skills/growth-automation/SKILL.md` |
| Growth Suite | `src/automation/growthSuite.js` | `skills/growth-automation/SKILL.md` |
| Detect Unfollowers | `src/detectUnfollowers.js` | `skills/follower-monitoring/SKILL.md` |
| New Follower Alerts | `src/newFollowersAlert.js` | `skills/follower-monitoring/SKILL.md` |
| Monitor Account | `src/monitorAccount.js` | `skills/follower-monitoring/SKILL.md` |
| Engagement Analytics | `src/engagementAnalytics.js` | `skills/analytics-insights/SKILL.md` |
| Leave All Communities | `src/leaveAllCommunities.js` | `skills/community-management/SKILL.md` |
| Unlike All Posts | `src/unlikeAllPosts.js` | `skills/content-cleanup/SKILL.md` |
| Mass Block/Unblock | `src/massBlock.js`, `src/massUnblock.js` | `skills/blocking-muting-management/SKILL.md` |
| Post Thread | `src/postThread.js` | `skills/content-posting/SKILL.md` |
| Schedule Posts | `src/schedulePosts.js` | `skills/content-posting/SKILL.md` |
| Create Poll | `src/createPoll.js` | `skills/content-posting/SKILL.md` |
| Send Direct Message | `src/sendDirectMessage.js` | `skills/direct-messages/SKILL.md` |
| MCP Server | `src/mcp/server.js` | `skills/xactions-mcp-server/SKILL.md` |
| Multi-Account | `src/automation/multiAccountManager.js` | `skills/growth-automation/SKILL.md` |
| Hashtag Analytics | `src/hashtagAnalytics.js` | `skills/analytics-insights/SKILL.md` |
| Competitor Analysis | `src/competitorAnalysis.js` | `skills/analytics-insights/SKILL.md` |
| Best Time to Post | `src/bestTimeToPost.js` | `skills/analytics-insights/SKILL.md` |
| Audit Followers | `src/auditFollowers.js` | `skills/analytics-insights/SKILL.md` |

---

## Final Notes

- **The website is `xactions.app`** — all canonical URLs point there
- **The GitHub repo is `github.com/nichxbt/xactions`** — link to it for code
- **Author is `nich (@nichxbt)`** on every page
- **No API fees** — this is a key differentiator. Mention it prominently.
- **Both "X" and "Twitter" must appear** in titles and early body text (SEO: people search for both)
- **Date everything as 2026** — shows content is current and maintained
- **Test all code** against the actual source files in `src/` and `scripts/`
- Scripts should include the `// by nichxbt` credit comment

When in doubt, look at the existing `docs/examples/unfollow-everyone.md` and `docs/examples/auto-liker.md` as gold-standard references — then make the new examples even better.
