# Prompt 02: Schema & Structured Data — JSON-LD for Every Page

> Paste this entire prompt into a new Claude Opus 4.6 chat.

---

## Context

I run **XActions** (https://xactions.app), an open-source X/Twitter automation toolkit. I need comprehensive JSON-LD structured data for every page to maximize rich snippet eligibility in Google Search.

### Current Structured Data Coverage

**Pages WITH structured data (already done):**
- Homepage (`site/index.html`): `SoftwareApplication` schema
- Dashboard (`dashboard/index.html`): `WebApplication` schema
- About (`dashboard/about.html`): `Organization` schema
- AI Integration (`dashboard/ai.html`): `SoftwareApplication` + `HowTo` + `FAQPage` (best page)
- AI API (`dashboard/ai-api.html`): `TechArticle` schema
- MCP Server (`dashboard/mcp.html`): `TechArticle` schema

**Pages WITHOUT structured data (need it):**
- Features page (`/features`)
- Pricing page (`/pricing`)
- Documentation page (`/docs`)
- Tutorials hub (`/tutorials`)
- 6 tutorial sub-pages (`/tutorials/unfollow`, `/tutorials/scrapers`, `/tutorials/automation`, `/tutorials/communities`, `/tutorials/mcp`, `/tutorials/monitoring`)
- Run page (`/run`)
- Privacy Policy (`/privacy`)
- Terms of Service (`/terms`)
- 404 page (skip — noindex)
- Login (skip — noindex)
- Admin (skip — noindex)

### About XActions (for schema content)

- **Name:** XActions
- **Description:** The Complete X/Twitter Automation Toolkit — Scrapers, MCP server for AI agents, CLI, browser scripts. No API fees. Open source.
- **URL:** https://xactions.app
- **Author:** nich (@nichxbt), URL: https://x.com/nichxbt
- **GitHub:** https://github.com/nirholas/xactions
- **Price:** Free (open source), AI API is pay-per-request starting at $0.001
- **Category:** BrowserApplication / DeveloperApplication
- **License:** MIT
- **NPM:** xactions (npm install xactions)

### Key Features (for ItemList / Feature schema)
1. Mass Unfollow Non-Followers
2. Auto-Liker
3. Auto-Follow Engagers
4. Detect Unfollowers
5. Leave All Communities
6. Video Downloader
7. Profile Scraper
8. Follower/Following Scraper
9. Tweet Scraper
10. Like Scraper
11. Bookmark Exporter
12. Thread Unroller
13. Viral Tweet Scraper
14. MCP Server for AI Agents
15. CLI Tools
16. Real-time Analytics Dashboard

### Pricing Tiers (for pricing schema)
- **Free (Humans):** Browser scripts, CLI, all scraping tools — $0/forever
- **AI API Pay-per-Use:** Starting at $0.001/request, X-402 payment protocol
- **Self-Hosted:** Free, run your own MCP server

---

## Your Task

Generate complete JSON-LD `<script type="application/ld+json">` blocks for every page listed above. Include **multiple schemas per page** where appropriate.

### Required Schema Types Per Page

**Features Page (`/features`):**
- `ItemList` — list of all features with position, name, description, URL
- `SoftwareApplication` — the app itself
- `BreadcrumbList` — Home > Features

**Pricing Page (`/pricing`):**
- `Product` with multiple `Offer` items (Free tier, AI API tier)
- `FAQPage` — pricing FAQs (generate 5-8 realistic Q&As about pricing, free vs paid, etc.)
- `BreadcrumbList` — Home > Pricing

**Documentation Page (`/docs`):**
- `TechArticle` — documentation overview
- `ItemList` — list of documentation sections
- `BreadcrumbList` — Home > Documentation

**Tutorials Hub (`/tutorials`):**
- `CollectionPage` with `hasPart` references to each tutorial sub-page
- `ItemList` — list of tutorial categories
- `BreadcrumbList` — Home > Tutorials

**Each Tutorial Sub-Page (unfollow, scrapers, automation, communities, mcp, monitoring):**
- `HowTo` — with step-by-step instructions (generate realistic steps for each)
- `FAQPage` — 3-5 FAQs relevant to each tutorial topic
- `BreadcrumbList` — Home > Tutorials > [Topic]

**Run Page (`/run`):**
- `WebApplication` — one-click script runner
- `HowTo` — how to use the one-click runner
- `BreadcrumbList` — Home > Run Scripts

**Privacy Policy (`/privacy`):**
- `WebPage` with `speakable` property
- `BreadcrumbList` — Home > Privacy Policy

**Terms of Service (`/terms`):**
- `WebPage` with `speakable` property
- `BreadcrumbList` — Home > Terms of Service

### Also Generate Site-Wide Schemas

**For the homepage (to enhance existing):**
- `WebSite` with `SearchAction` (sitelinks search box)
- `Organization` with `sameAs` links (GitHub, X/Twitter, npm)
- Update existing `SoftwareApplication` with `aggregateRating`, `review` placeholders
- `BreadcrumbList` (just Home)

**Global schema (include on every page):**
- `Organization` mini-schema with logo, name, URL, sameAs

---

## Output Format

For each page, provide:
1. The page URL/path
2. The complete `<script type="application/ld+json">` block(s) — ready to paste into the HTML
3. Which existing schema it replaces (if any) or "NEW"
4. Brief note on what Google rich results this enables (FAQ rich result, HowTo rich result, Breadcrumb trail, Sitelinks searchbox, etc.)

### Quality Requirements
- Use correct schema.org vocabulary (validate against schema.org)
- All URLs must be absolute (https://xactions.app/...)
- Include `@context: "https://schema.org"` in every block
- Use realistic, keyword-rich descriptions (not placeholder text)
- For HowTo schemas, generate actual realistic step-by-step instructions based on the feature
- For FAQ schemas, generate real questions users would search for
- Ensure nesting is correct (e.g., `HowTo` > `HowToStep` > `HowToDirection`)
- Test-ready — I should be able to paste into Google's Rich Results Test and pass

Be exhaustive. Generate everything.
