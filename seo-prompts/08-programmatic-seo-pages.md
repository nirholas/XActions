# Prompt 08: Programmatic SEO — Auto-Generate Long-Tail Keyword Pages

> Paste this entire prompt into a new Claude Opus 4.6 chat.

---

## Context

I run **XActions** (https://xactions.app), a free, open-source X/Twitter automation toolkit. I want to implement **programmatic SEO** — creating many pages at scale from templates to capture long-tail keywords.

### What XActions Does
- Mass unfollow, auto-liker, auto-follow, detect unfollowers
- Leave all communities, video downloader
- 15+ scrapers (profiles, followers, tweets, likes, bookmarks, etc.)
- MCP server for AI agents, CLI tools, browser scripts
- AI API with X-402 payment protocol

### Pages I Already Have
~20 manually crafted pages (homepage, features, pricing, docs, tutorials, etc.)

### Pages I'm Creating (from Prompt 07)
10 feature tool pages at `/tools/[feature]`

---

## Your Task

### 1. Programmatic Page Designs

Design **5 programmatic page types** that can generate 50-200+ pages each from template + data:

**Type A: "How to [Action] on Twitter/X in 2026" Pages**

Template: `/guides/how-to-[action]-on-twitter`
- Examples: "How to mass unfollow on Twitter in 2026", "How to download Twitter videos in 2026", "How to scrape Twitter data in 2026"
- Generate 40+ page ideas from XActions features
- Template structure with placeholders

**Type B: "[Tool] vs [Tool]" Comparison Pages**

Template: `/compare/[tool1]-vs-[tool2]`
- Generate all viable comparison combinations
- XActions vs each competitor
- Competitor vs competitor (where we can be the "try XActions instead" recommendation)
- Template structure with comparison table

**Type C: "Best [Category] Tools for Twitter" Listicle Pages**

Template: `/best/[category]-tools-for-twitter`
- "Best free Twitter unfollow tools"
- "Best Twitter automation tools 2026"
- "Best Twitter scraping tools"
- Generate 20+ listicle page ideas
- Template where XActions is featured #1

**Type D: "[Competitor] Alternative — Free & Open Source" Pages**

Template: `/alternative/[competitor]-alternative`
- One page for every competitor
- Template showing why XActions is the better free alternative
- Generate 15+ alternatives pages

**Type E: "Twitter [Feature] for [Audience/Use Case]" Pages**

Template: `/use-cases/twitter-[feature]-for-[audience]`
- "Twitter automation for developers"
- "Twitter scraping for researchers"
- "Twitter growth for startups"
- Generate 20+ audience-specific pages

### 2. For Each Page Type, Provide:

**A. Complete HTML template** with:
- `{{PLACEHOLDER}}` variables for all dynamic content
- Full SEO `<head>` section (all meta tags parametrized)
- JSON-LD structured data with placeholders
- Content structure (H1, sections, FAQ, CTA)
- Matching XActions dark theme styling

**B. Data schema** — what data each template needs:
```json
{
  "slug": "mass-unfollow-twitter",
  "title": "How to Mass Unfollow on Twitter in 2026",
  "description": "...",
  "primary_keyword": "mass unfollow twitter",
  "h1": "...",
  "steps": [...],
  "faqs": [...],
  "related_tools": [...]
}
```

**C. Complete data for all pages** — generate the full JSON dataset for every page:
- All 40+ "How to" pages
- All comparison pages
- All listicle pages
- All alternative pages
- All use case pages

**D. Node.js build script** that:
- Reads the template + data JSON
- Generates static HTML files
- Outputs them to the correct directory
- Also generates sitemap entries for all new pages
- Can be run with `node scripts/generate-seo-pages.js`

### 3. Internal Linking Strategy

For programmatic pages:
- How should they link to each other?
- How should they link to main pages (features, pricing, docs)?
- How should main pages link back to them?
- Contextual linking patterns within content

### 4. Avoiding Thin Content / Duplicate Content

- How to ensure each page has enough unique content (not just template with swapped keywords)
- Minimum word count targets per page type
- Unique content sections per page
- Canonical URL strategy for similar pages
- `noindex` criteria (when should a programmatic page NOT be indexed?)

### 5. Sitemap Strategy for Scale

- Should programmatic pages have their own sitemap? (sitemap-guides.xml, sitemap-comparisons.xml, etc.)
- Sitemap index structure
- Priority and changefreq settings per page type

---

## Output Format

1. Five complete HTML templates (full code)
2. Five JSON data schema definitions
3. Complete JSON datasets for ALL pages (every single one)
4. Node.js build script (complete, runnable code)
5. Sitemap generation code
6. Summary table of all pages to be generated

Generate everything needed to produce 100+ SEO-optimized pages from running a single build command.
