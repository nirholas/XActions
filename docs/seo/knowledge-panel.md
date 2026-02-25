# Google Knowledge Panel Strategy for XActions

> How to get XActions recognized as a notable entity in Google's Knowledge Graph, triggering a Knowledge Panel in search results.

---

## What Is a Knowledge Panel?

A Knowledge Panel is the information box that appears on the right side of Google search results (desktop) or at the top (mobile) when Google recognizes a query as a known entity — a person, company, product, or software project.

**Goal:** When someone searches "XActions" or "XActions Twitter automation", Google displays a panel with:
- Name, logo, description
- Official website link
- Social profiles (GitHub, X/Twitter, npm)
- Key facts (open-source, MIT license, Node.js)
- Related tools (alternatives)

---

## How Google Builds Knowledge Panels

Google's Knowledge Graph pulls entity data from:

1. **Wikidata** — Primary structured knowledge base (Google reads directly)
2. **Wikipedia** — Most authoritative source of entity notability
3. **Schema.org JSON-LD** — Structured data on your own website
4. **Authoritative third-party sites** — Crunchbase, Product Hunt, npm, GitHub
5. **Google's own crawl data** — Consistent naming/descriptions across the web

**Key insight:** You don't "apply" for a Knowledge Panel. You build enough structured, consistent signals that Google auto-generates one.

---

## Step-by-Step Roadmap

### Phase 1: Foundation (Week 1-2)

#### 1. Create a Wikidata Item
See [wikidata-setup.md](wikidata-setup.md) for the complete walkthrough.

This is the **single highest-ROI action**. Google reads Wikidata directly.

#### 2. Upgrade JSON-LD Structured Data
See [structured-data.md](structured-data.md) for the full schema reference.

Ensure every page on xactions.app includes:
- `Organization` schema with `sameAs` links
- `SoftwareApplication` schema with rich properties
- `WebSite` schema with `SearchAction`

#### 3. Consistent Entity Naming
Across every platform, use identical information:
- **Name:** XActions
- **Tagline:** "The Complete X/Twitter Automation Toolkit"
- **Description:** "Free, open-source X/Twitter automation tools — scrapers, MCP server for AI agents, CLI, and browser scripts. No API fees."
- **Author:** nich (@nichxbt)
- **URL:** https://xactions.app
- **Repository:** https://github.com/nirholas/XActions

### Phase 2: Authority Signals (Week 2-4)

#### 4. Platform Listings
See [platform-listings.md](platform-listings.md) for the complete checklist.

Get XActions listed on:
- Product Hunt, AlternativeTo, Crunchbase
- npm (already done), PyPI (if applicable)
- awesome-* GitHub repos
- MCP server directories

#### 5. Press & Independent Coverage
See [press-strategy.md](press-strategy.md) for outreach templates and targets.

Google requires **independent, reliable sources** to confirm notability. This means coverage NOT written by you.

### Phase 3: Wikipedia (Month 2-3)

#### 6. Wikipedia Article
Only attempt after you have:
- [ ] 3+ independent reliable sources citing XActions
- [ ] Wikidata item already created
- [ ] Significant GitHub stars (1,000+)
- [ ] Press coverage from recognized publications

Wikipedia has strict notability guidelines for software — premature attempts get deleted and make future attempts harder.

### Phase 4: Claim & Optimize (Once Panel Appears)

#### 7. Claim the Knowledge Panel
Once Google generates a panel:
1. Search "XActions" on Google
2. Click "Claim this knowledge panel" at the bottom
3. Verify via one of your linked accounts (Google, X, GitHub)
4. Suggest edits to description, logo, social links
5. Google reviews and applies changes

**Verification URL:** https://support.google.com/knowledgepanel/answer/7534842

---

## Timeline & Expectations

| Milestone | Expected Timeline |
|-----------|-------------------|
| Wikidata item created | Week 1 |
| JSON-LD upgraded across all pages | Week 1 |
| Listed on 5+ platforms | Week 2 |
| First independent press mention | Month 1-2 |
| Knowledge Panel appears | 1-6 months after Wikidata + press |
| Knowledge Panel claimed & optimized | Within days of appearance |

---

## Monitoring

- **Search "XActions" weekly** on Google — check if panel appears
- **Google Search Console** — monitor entity recognition signals
- **Google's Structured Data Testing Tool** — validate JSON-LD: https://search.google.com/test/rich-results
- **Schema Markup Validator** — https://validator.schema.org/
- **Wikidata item views** — track at https://pageviews.wmcloud.org/

---

## Common Pitfalls

1. **Inconsistent naming** — "XActions" vs "xactions" vs "X-Actions" across platforms confuses Google
2. **Self-published sources only** — Google needs INDEPENDENT coverage, not just your blog
3. **Premature Wikipedia article** — Gets deleted, makes future attempts harder
4. **Missing `sameAs` links** — Google can't connect your profiles without explicit `sameAs` in JSON-LD
5. **No Wikidata item** — The single biggest miss; Google reads Wikidata more than any other source

---

## Files in This Guide

| File | Purpose |
|------|---------|
| [knowledge-panel.md](knowledge-panel.md) | This file — overview and roadmap |
| [wikidata-setup.md](wikidata-setup.md) | Step-by-step Wikidata item creation |
| [structured-data.md](structured-data.md) | JSON-LD schema reference for all pages |
| [platform-listings.md](platform-listings.md) | Platform listing checklist with URLs |
| [press-strategy.md](press-strategy.md) | Press outreach and coverage strategy |
| [seo-audit.md](seo-audit.md) | Technical SEO checklist |
