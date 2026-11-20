# 💼 Business & Ads Tools

Business analytics, brand monitoring, social listening, and advertising tools for X/Twitter.

## 📋 What It Does

1. Monitors brand mentions with sentiment analysis
2. Scrapes competitor analytics
3. Provides audience insights
4. Tracks advertising performance

## 🌐 Browser Console Script

```javascript
// Go to: x.com (or search for your brand)
// Paste scripts/businessAnalytics.js (set CONFIG.brand at top)
```

### Quick Brand Monitor

```javascript
(() => {
  const BRAND = 'YourBrand';
  window.location.href = `https://x.com/search?q=${encodeURIComponent(BRAND)}&f=live`;
  // Then run the full businessAnalytics.js script
})();
```

## 📦 Node.js Module

```javascript
import { monitorBrandMentions, getAudienceInsights, analyzeCompetitors } from 'xactions/src/businessTools.js';

// Monitor brand mentions
const mentions = await monitorBrandMentions(page, 'XActions', { limit: 50 });
console.log(`Sentiment: ${mentions.analysis.sentiment}`);

// Audience insights
const audience = await getAudienceInsights(page, 'yourhandle');

// Competitor analysis
const competitors = await analyzeCompetitors(page, ['@competitor1', '@competitor2']);
```

## 🔧 MCP Server

```
Tool: x_brand_monitor
Input: { "brand": "XActions", "limit": 50, "sentiment": true }

Tool: x_competitor_analysis
Input: { "handles": ["@competitor1", "@competitor2"] }
```

## 📊 Features

| Feature | Description | Access |
|---------|-------------|--------|
| Brand Monitoring | Track mentions with sentiment | Free |
| Social Listening | Keyword-based real-time alerts | Free |
| Audience Insights | Demographics and interests | Premium |
| Competitor Analysis | Compare metrics side-by-side | Free |
| X Pro (TweetDeck) | Multi-column dashboard | Premium |
| X Ads Manager | Campaign management | Business |
| Handle Marketplace | Buy/sell verified handles | Premium (2026) |

## 💰 Business Pricing

- **X Pro** (TweetDeck): Included with Premium
- **Verified Organizations**: $200/mo (gold badge)
- **Verified Organizations+**: $1,000/mo (full suite)
- **X Ads**: Self-serve, pay-per-result

## ⚠️ Notes

- Sentiment analysis uses keyword-based scoring (basic) — upgrade to AI models for better accuracy
- Rate limits apply to search-based brand monitoring
- X Ads requires separate advertiser account setup
- Handle Marketplace (2026) allows transferring verified handles for a fee
