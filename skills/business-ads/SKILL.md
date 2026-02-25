---
name: business-ads
description: Monitors brand mentions with sentiment analysis, analyzes audience demographics, and compares competitor profiles on X/Twitter. Provides social listening, audience insights, and competitive intelligence via browser automation. Use when users want brand monitoring, audience analysis, or competitor comparison on X.
license: MIT
metadata:
  author: nichxbt
  version: "3.0"
---

# Business & Ads Tools

Browser automation for X/Twitter business intelligence — brand monitoring, audience insights, and competitor analysis.

## Script Selection

| Goal | File | Navigate to |
|------|------|-------------|
| Monitor brand mentions | `src/businessTools.js` | Search results page |
| Audience insights | `src/businessTools.js` | `x.com/USERNAME/followers` |
| Competitor analysis | `src/businessTools.js` | Any profile page |

## Business Tools

**File:** `src/businessTools.js`

Puppeteer-based module with three core functions for business intelligence.

### Functions

| Function | Purpose |
|----------|---------|
| `monitorBrandMentions(page, brandName, { limit, since })` | Search for brand mentions with sentiment tagging |
| `getAudienceInsights(page, username, { sampleSize })` | Analyze follower bios for interests and demographics |
| `analyzeCompetitors(page, ['user1', 'user2'])` | Compare follower counts, bios, and verification status |

### Brand Mention Monitoring

Searches X for a brand name or handle and collects mentions with basic sentiment analysis (positive/negative/neutral based on keyword matching).

**Returns:** mention text, author, timestamp, link, likes, reposts, and sentiment breakdown.

### Audience Insights

Scrapes a sample of followers and analyzes their bios to extract common interests (e.g., developer, founder, crypto, AI). Reports verified follower percentage.

### Competitor Analysis

Visits each competitor's profile page and collects follower/following counts, verification status, and bio. Returns side-by-side comparison.

## DOM Selectors

| Element | Selector |
|---------|----------|
| Tweet | `article[data-testid="tweet"]` |
| Tweet text | `[data-testid="tweetText"]` |
| User cell | `[data-testid="UserCell"]` |
| Search input | `[data-testid="SearchBox_Search_Input"]` |
| User description | `[data-testid="UserDescription"]` |
| Verified icon | `[data-testid="icon-verified"]` |

## Rate Limiting

- 1.5s delay between scroll cycles
- 1–2s delay between competitor profile visits
- Each competitor takes ~5s to analyze

## Notes

- Sentiment analysis is keyword-based (not ML) — useful for quick polarity, not nuanced analysis
- Audience insights sample a configurable number of followers (default: 50)
- No X Ads API integration — this is browser-side intelligence gathering
