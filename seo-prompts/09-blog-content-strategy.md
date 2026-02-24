# Prompt 09: Blog Content Strategy — Topic Clusters & Editorial Calendar

> Paste this entire prompt into a new Claude Opus 4.6 chat.

---

## Context

I run **XActions** (https://xactions.app), a free, open-source X/Twitter automation toolkit. I currently have NO blog. I want to create a blog strategy that drives organic traffic, establishes authority, and supports our tool pages.

### About XActions
- Free, open-source X/Twitter automation toolkit
- Features: mass unfollow, auto-liker, scrapers (15+ types), video downloader, MCP server for AI agents, CLI, browser scripts
- Audience: developers, marketers, personal brand builders, researchers, power X/Twitter users
- Differentiator: free, no API needed, open source, AI-compatible
- Author: nich (@nichxbt)
- GitHub: github.com/nirholas/xactions

### Existing Content
- ~20 static HTML pages (product pages)
- 43 feature documentation files (markdown)
- 27 skill knowledge bases (internal)
- Tutorials (7 sub-pages)
- No blog content exists yet

---

## Your Task

### 1. Blog Architecture

Design the blog structure:
- URL pattern: `/blog/[slug]` or `/guides/[slug]`?
- Category taxonomy
- Tag system
- Author page structure
- Blog index page design (listing, pagination, filtering)
- RSS feed considerations
- Blog post template structure

### 2. Topic Clusters (8-12 Clusters)

Design complete topic clusters. For each cluster:

**Cluster structure:**
- **Pillar article** (2000-3000 words, comprehensive guide)
- **Supporting articles** (6-10 per cluster, 1000-1500 words each)
- **Internal linking map** (how articles link within the cluster)
- **Link to product pages** (which XActions feature pages each article links to)

**Proposed clusters:**

1. **Twitter/X Automation** (pillar) → supporting articles on specific automation types
2. **Twitter Growth** (pillar) → follower growth strategies, engagement tips
3. **Twitter Scraping & Data** (pillar) → each scraper type, data analysis
4. **AI + Twitter** (pillar) → MCP server, LLM integration, AI agents for social media
5. **Twitter Account Management** (pillar) → unfollow management, blocking, muting
6. **Twitter API Alternatives** (pillar) → why browser automation, no-API approaches
7. **Twitter for Developers** (pillar) → scripting, CLI, npm packages
8. **Twitter Analytics & Monitoring** (pillar) → tracking, metrics, insights
9. **Open Source Social Media Tools** (pillar) → open source movement, comparisons
10. **Twitter Communities & Spaces** (pillar) → community management, spaces

For each cluster, provide:
- Pillar article title, H1, meta description, target keyword, outline (H2 sections)
- Each supporting article: title, target keyword, outline, word count
- Internal linking diagram (text description)

### 3. Editorial Calendar (6 Months)

Create a week-by-week publishing schedule:
- **Month 1:** Foundation — pillar articles + highest traffic potential articles
- **Month 2:** Fill out top 3 clusters
- **Month 3:** Comparison articles, "alternative to" content
- **Month 4:** Seasonal content, trending topics, guest post outreach
- **Month 5:** Long-tail deep dives, case studies
- **Month 6:** Update/refresh cycle + second wave of new content

For each week:
| Week | Article Title | Cluster | Target Keyword | Type | Word Count | Priority |

### 4. Article Templates

Create **5 blog post templates** for different content types:

**A. Ultimate Guide** (2000-3000 words)
- Structure, H2 sections, where to add CTAs, FAQ section, related tools section

**B. How-To Tutorial** (1000-1500 words)
- Step-by-step structure, code blocks, screenshots placeholders, "Try it now" CTA

**C. Comparison / VS Article** (1500-2000 words)
- Comparison table format, pros/cons, verdict, "why XActions" section

**D. Listicle** (1500-2000 words)
- "10 Best..." format, consistent item structure, XActions positioned naturally

**E. News/Update Article** (500-800 words)
- Changelog wrap-up, feature announcement, trend commentary

### 5. SEO Requirements Per Article

Every blog post must have:
- Optimized title tag (different from H1)
- Meta description with CTA
- Target keyword in: URL, H1, first paragraph, H2, meta description, alt text
- JSON-LD `Article` or `BlogPosting` schema
- `BreadcrumbList` schema
- FAQ schema (3-5 questions per article)
- Internal links to: 2-3 related articles, 1-2 product pages, 1 pillar article
- External links to: 2-3 authoritative sources
- Table of Contents for articles >1500 words
- Author bio with schema markup
- Published date + last modified date

### 6. Content Briefs for First 10 Articles

For the first 10 articles to publish, provide complete content briefs:

For each:
- Title and H1
- Target keyword + secondary keywords
- Meta description
- Complete outline (every H2 and H3)
- Key points to cover
- Internal links to include
- CTA placement
- FAQ questions (4-5)
- Word count target
- Estimated traffic potential
- Cluster assignment

### 7. Content Repurposing Strategy

How to repurpose blog content:
- Blog → Twitter/X thread
- Blog → GitHub README section
- Blog → YouTube script outline
- Blog → Newsletter content
- Blog → Reddit/HN post
- Blog → NPM package description

### 8. Content Performance KPIs

Define success metrics:
- Traffic targets per article (month 1, month 3, month 6)
- Ranking targets (position, featured snippets)
- Engagement metrics (time on page, bounce rate)
- Conversion metrics (tool usage, GitHub stars, npm installs)

---

## Output Format

Provide everything in a structured, actionable format. Each deliverable should be complete enough to hand to a writer (or AI) and get a finished article. Use tables for the editorial calendar and content briefs.

This is a $5000 content strategy — make it comprehensive.
