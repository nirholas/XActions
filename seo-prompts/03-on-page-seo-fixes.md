# Prompt 03: On-Page SEO Fixes — Complete Head Sections for All Under-Optimized Pages

> Paste this entire prompt into a new Claude Opus 4.6 chat.

---

## Context

I run **XActions** (https://xactions.app), an open-source X/Twitter automation toolkit. 6+ pages on my site have incomplete or missing SEO meta tags. I need you to generate the **complete, production-ready `<head>` sections** for every under-optimized page so I can drop them in directly.

### My Well-Optimized Page Template (use as reference)

Here's what my best-optimized page (ai.html) looks like — match this quality level:

```html
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Integration - XActions | GPT, Claude & LLM Twitter Automation</title>
  <meta name="description" content="Integrate AI agents with X/Twitter using XActions. Compatible with GPT, Claude, Gemini & any LLM. MCP server support, natural language automation. Free & open-source.">
  <meta name="keywords" content="AI Twitter automation, GPT Twitter bot, Claude Twitter, LLM automation, MCP server Twitter, AI agents X, Grok automation, xAI tools, natural language Twitter, AI social media, machine learning Twitter, automated tweets AI">
  <meta name="author" content="nich (@nichxbt)">
  <meta name="robots" content="index, follow">

  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="AI Integration - XActions | LLM-Powered Twitter Automation">
  <meta property="og:description" content="Connect GPT, Claude, Gemini or any LLM to X/Twitter. MCP server support, AI agents, natural language automation. 100% free & open-source.">
  <meta property="og:url" content="https://xactions.app/ai">
  <meta property="og:site_name" content="XActions">
  <meta property="og:image" content="https://xactions.app/og-ai.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="XActions AI Integration - Connect LLMs to Twitter">
  <meta property="og:locale" content="en_US">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@nichxbt">
  <meta name="twitter:creator" content="@nichxbt">
  <meta name="twitter:title" content="AI Integration - XActions | LLM Twitter Automation">
  <meta name="twitter:description" content="Connect any AI/LLM to X/Twitter automation. GPT, Claude, Gemini compatible. Free MCP server.">
  <meta name="twitter:image" content="https://xactions.app/og-ai.png">

  <link rel="canonical" href="https://xactions.app/ai">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚡</text></svg>">
</head>
```

### Pages That Need Fixing

**1. Features Page** (`dashboard/features.html`)
- Current title: "Features - XActions | Free X/Twitter Automation Tools"
- Current description: exists but basic
- MISSING: keywords, robots, canonical, OG tags, Twitter Card tags
- Page content: Lists all XActions features — mass unfollow, auto-liker, scrapers, MCP server, CLI, video downloader, etc.

**2. Documentation Page** (`dashboard/docs.html`)
- Current title: "Documentation - XActions | Free X/Twitter Automation"
- Current description: exists but basic
- MISSING: keywords, robots, canonical, OG tags, Twitter Card tags
- Page content: Documentation hub with getting started, CLI reference, API docs, examples

**3. Pricing Page** (`dashboard/pricing.html`)
- Current title: "Pricing - XActions | Free for Humans, Pay-per-Use for AI"
- Current description: exists
- MISSING: keywords, robots, canonical, OG tags, Twitter Card tags
- Page content: Free tier for humans, AI API pay-per-request, self-hosted option

**4. Run Page** (`dashboard/run.html`)
- Current title: "One-Click Scripts | XActions"
- MISSING: description, keywords, robots, canonical, OG tags, Twitter Card tags
- Page content: One-click script runner — paste and run automation scripts directly

**5. Tutorials Hub** (`dashboard/tutorials.html`)
- Current title: "Tutorials - XActions | Step-by-Step X/Twitter Automation Guides"
- Current description: exists
- MISSING: canonical (inconsistent), structured data link
- Has OG + Twitter Card tags already but verify they're complete

**6. Tutorial Sub-Pages** (all in `dashboard/tutorials/`)
For each of these, they have only title and description:
- `tutorials/index.html` — Tutorials Hub (duplicate of tutorials.html?)
- `tutorials/unfollow.html` — Unfollow tutorials
- `tutorials/scrapers.html` — Scraper tutorials
- `tutorials/automation.html` — Automation tutorials
- `tutorials/communities.html` — Communities tutorials
- `tutorials/mcp.html` — MCP tutorials
- `tutorials/monitoring.html` — Monitoring tutorials
- `tutorials/scrapers-full.html` — Full scrapers guide
- MISSING on ALL: keywords, robots, canonical, OG tags, Twitter Card tags

**7. Admin Page** (`dashboard/admin.html`)
- Current title: "Admin - XActions Live Sessions"
- Needs: `<meta name="robots" content="noindex, nofollow">` and nothing else (don't need OG/social tags)

**8. Login Page** (`dashboard/login.html`)
- Current title: "Login - XActions | AI-Powered X/Twitter Automation Platform"
- Needs: `<meta name="robots" content="noindex, nofollow">` added (currently missing)

---

## Your Task

For **each page above**, generate the COMPLETE `<head>` meta tag block (everything between the existing `<meta charset>` and where `<style>` or `<link>` tags begin). Include:

1. **Title tag** — SEO-optimized, 50-60 characters, primary keyword first, brand last, use pipes (|) or dashes (—)
2. **Meta description** — Compelling, 150-160 chars, includes keywords naturally, has a subtle CTA
3. **Meta keywords** — 10-15 relevant long-tail keywords specific to each page's content
4. **Meta robots** — `index, follow` for public pages; `noindex, nofollow` for admin/login
5. **Meta author** — `nich (@nichxbt)`
6. **Canonical URL** — Absolute URL, matching the page's primary URL
7. **Open Graph tags** — Complete set (type, title, description, url, site_name, image, image dimensions, image alt, locale)
8. **Twitter Card tags** — Complete set (card type `summary_large_image`, site, creator, title, description, image)
9. **Favicon** — The SVG emoji favicon we use: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚡</text></svg>`

### Title Tag Best Practices to Follow
- Primary keyword FIRST in the title
- Brand name (XActions) last, separated by | or —
- Unique across all pages (no duplicates)
- Include power words: Free, Complete, Ultimate, Step-by-Step, etc. where natural
- Max 60 characters

### Description Best Practices
- Start with action verb or key benefit
- Include 1-2 target keywords naturally
- End with subtle CTA or differentiator
- 150-160 characters exactly
- Unique across all pages

### Keyword Strategy by Page
- **Features:** focus on specific tool names (mass unfollow, auto-liker, etc.)
- **Docs:** focus on "how to" + technical terms
- **Pricing:** focus on "free twitter automation", "twitter api alternative", cost comparisons
- **Run:** focus on "one-click twitter scripts", "browser automation"
- **Tutorials:** focus on step-by-step, guide, how-to + specific topic
- **Each tutorial sub-page:** long-tail keywords specific to that feature

---

## Output Format

For each page provide:

```
### [Page Name] — [URL]

[Complete meta tag block, ready to paste]
```

Also provide a **summary table** at the end showing:
| Page | Title (chars) | Description (chars) | Primary Keyword | OG Image |

Make titles and descriptions unique, keyword-rich, and compelling. I'll implement all of these directly.
