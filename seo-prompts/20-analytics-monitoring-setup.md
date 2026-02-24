# Prompt 20: Analytics, Monitoring & Search Console Setup

> Paste this entire prompt into a new Claude Opus 4.6 chat.

---

## Context

I run **XActions** (https://xactions.app), a free, open-source X/Twitter automation toolkit. I currently have NO analytics or search monitoring set up. I need a comprehensive analytics and SEO monitoring system to track the impact of all the SEO work I'm doing.

### Current State
- No Google Search Console configured
- No Google Analytics or alternative analytics
- No rank tracking
- No uptime monitoring
- No performance monitoring
- Express.js backend (could log server-side analytics)
- Privacy-conscious audience (open source / developer community)

### Privacy Considerations
- As an open source tool, users are privacy-conscious
- Need a solution that respects privacy (GDPR compliant)
- May prefer privacy-focused analytics over Google Analytics
- Must update Privacy Policy if adding tracking

---

## Your Task

### 1. Google Search Console Setup

**Step-by-step setup guide:**
- How to verify xactions.app ownership
- Verification methods (HTML file, DNS, meta tag)
- Provide the HTML verification file and meta tag placeholder
- Property setup (domain vs URL prefix — which and why)

**Configuration:**
- Sitemap submission (our new sitemap.xml)
- URL inspection tool usage
- Index coverage monitoring
- How to request indexing of new pages
- International targeting (English only)
- Remove any legacy URLs

**Monitoring dashboards to create:**
- Total clicks/impressions dashboard
- Top queries report (weekly review)
- Top pages by clicks
- Click-through rate by page
- New vs declining keywords
- Crawl errors and fix workflow
- Core Web Vitals report

### 2. Analytics Platform Selection & Setup

**Evaluate and recommend:**

| Platform | Privacy | Free Tier | Features | Recommendation |
|----------|---------|-----------|----------|---------------|
| Google Analytics 4 | Low | Unlimited | Full suite | ? |
| Plausible | High | $9/mo | Essential metrics | ? |
| Umami | High | Free (self-hosted) | Good metrics | ? |
| Fathom | High | $14/mo | GDPR-first | ? |
| PostHog | Medium | Free tier | Product analytics | ? |
| Vercel Analytics | High | Free tier | Web vitals + traffic | ? |
| Simple Analytics | High | $19/mo | Minimal | ? |
| Matomo | High | Free (self-hosted) | Full suite | ? |

Recommend the **best option** for XActions considering:
- Privacy-conscious audience
- Open source project (prefer free/self-hosted)
- Need to track SEO metrics specifically
- Budget available if needed
- Ease of setup

### 3. Analytics Implementation

For your recommended analytics platform, provide:

**Tracking script:**
- Exact code to add to each page
- Where to place it (head vs body)
- Conditional loading (respect Do Not Track?)
- Cookie consent requirements (if any)

**Custom events to track:**
- Page views (automatic)
- Script copy events (user copies a script to clipboard)
- GitHub link clicks
- NPM install command copies
- Tutorial completion
- Feature page engagement
- Outbound link clicks
- Search queries (if site search added)
- Dark/light mode toggle (if added)

**UTM parameter strategy:**
- UTM naming convention for different campaigns
- UTM for social posts, email, community links
- UTM for GitHub README links
- Tracking template

### 4. SEO-Specific Monitoring

**Rank Tracking:**
- Recommend a tool for tracking keyword rankings
- List of 50 keywords to track (from our keyword research)
- Tracking frequency (daily? weekly?)
- Competitor ranking comparison

**Backlink Monitoring:**
- Tool recommendation (Ahrefs, SE Ranking, Moz free?)
- Metrics to monitor (DA, new/lost backlinks, referring domains)
- Alert setup for new backlinks

**Technical SEO Monitoring:**
- Broken link checker (automated)
- 404 monitoring
- Redirect chain detection
- Crawl budget optimization
- Index coverage tracking
- Schema validation monitoring

### 5. SEO Dashboard

Design an **SEO dashboard** (could be a simple HTML page or Notion/sheet) that displays:

**Weekly KPIs:**
| Metric | This Week | Last Week | Change | Target |
|--------|-----------|-----------|--------|--------|
| Organic clicks | ? | ? | +?% | 1000 |
| Impressions | ? | ? | +?% | 50000 |
| Avg CTR | ? | ? | ? | 5% |
| Avg position | ? | ? | ? | <20 |
| Indexed pages | ? | ? | +? | 100% |
| Backlinks | ? | ? | +? | +10/wk |
| Domain Authority | ? | ? | ? | 30 |

**Monthly Report Template:**
- Executive summary
- Keyword ranking changes
- Top performing pages
- Content performance
- Technical issues
- Link building progress
- Next month priorities

Provide a **markdown template** for the monthly SEO report.

### 6. Automated Monitoring & Alerts

**Set up alerts for:**
- Significant ranking drops (>5 positions for tracked keywords)
- Traffic drops (>20% week-over-week)
- New 404 errors
- Crawl errors in Search Console
- Core Web Vitals regressions
- New backlinks from high-DA sites
- Competitor ranking changes

**Tools/methods for each alert:**
- Google Search Console email notifications
- Analytics custom alerts
- Uptime monitoring (which service?)
- Automated Lighthouse checks
- GitHub Action for periodic checks

### 7. Server-Side Analytics (Express.js)

**Lightweight server-side tracking:**
```javascript
// Express.js middleware that logs:
// - Page views (path, referrer, user agent)
// - API usage
// - Error rates
// Without cookies, GDPR-compliant
```

Provide complete middleware code for privacy-friendly server-side analytics.

### 8. A/B Testing Setup

**For SEO experiments:**
- Title tag A/B testing (which titles get more clicks?)
- Meta description testing
- CTA text testing
- Page layout testing
- Tool recommendation and setup

### 9. Reporting Cadence & Process

**Weekly (15 min):**
- Check Search Console for new queries
- Review analytics for traffic changes
- Check for crawl errors

**Monthly (1 hour):**
- Full keyword ranking review
- Backlink profile check
- Content performance analysis
- Competitor ranking comparison
- Write monthly SEO report

**Quarterly (2 hours):**
- Full technical SEO audit
- Content strategy review
- Keyword strategy refresh
- Link building strategy review

### 10. Privacy Policy Updates

What to add to the Privacy Policy page based on analytics implementation:
- What data is collected
- How it's used
- Cookie disclosure (if any)
- Opt-out mechanism
- GDPR/CCPA compliance

---

## Output Format

Provide complete setup instructions, configuration code, and tracking scripts. Include the monthly report template, dashboard design, and all Express.js code. Everything should be implementable within a day.
