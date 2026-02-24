# Prompt 01: Technical SEO Foundation — robots.txt, Sitemap, Meta Tags, Canonicals

> Paste this entire prompt into a new Claude Opus 4.6 chat.

---

## Context

I run **XActions** (https://xactions.app), an open-source X/Twitter automation toolkit. The site is static HTML hosted at xactions.app. I need you to create the complete technical SEO foundation.

### Current Site Pages

**Well-optimized (have most meta tags):**
- `https://xactions.app` — Homepage (site/index.html)
- `https://xactions.app/dashboard` — Dashboard (dashboard/index.html)
- `https://xactions.app/about` — About page
- `https://xactions.app/ai` — AI Integration page (best optimized — has 3 JSON-LD schemas)
- `https://xactions.app/ai-api` — AI API page
- `https://xactions.app/mcp` — MCP Server page

**Under-optimized (missing OG, Twitter Card, canonical, robots, structured data):**
- `https://xactions.app/features` — Features page
- `https://xactions.app/docs` — Documentation page
- `https://xactions.app/pricing` — Pricing page
- `https://xactions.app/run` — One-click scripts page (also missing description)
- `https://xactions.app/tutorials` — Tutorials hub
- `https://xactions.app/tutorials/unfollow` — Unfollow tutorials
- `https://xactions.app/tutorials/scrapers` — Scraper tutorials
- `https://xactions.app/tutorials/automation` — Automation tutorials
- `https://xactions.app/tutorials/communities` — Communities tutorials
- `https://xactions.app/tutorials/mcp` — MCP tutorials
- `https://xactions.app/tutorials/monitoring` — Monitoring tutorials

**Should be noindex:**
- `https://xactions.app/admin` — Admin panel
- `https://xactions.app/login` — Login page

**Already noindex (correct):**
- `https://xactions.app/404` — 404 page

### What's Currently Missing
1. **No robots.txt** exists anywhere
2. **No sitemap.xml** exists anywhere
3. **No web app manifest** (manifest.json)
4. 6+ pages missing `<meta name="robots">` directive
5. 6+ pages missing `<link rel="canonical">`
6. 6+ pages missing Open Graph tags
7. 6+ pages missing Twitter Card tags
8. No Google Search Console verification meta tag placeholder
9. No analytics tracking code
10. `.gitignore` explicitly ignores `sitemap*.xml` and `robots.txt`

### Tech Stack
- Static HTML pages (no build step, no SSR/SSG)
- Express.js API backend (api/server.js)
- Hosted on Railway/Vercel
- Domain: xactions.app
- Author: nich (@nichxbt on X/Twitter)

---

## Your Task

### 1. Create robots.txt

Generate a production-ready `robots.txt` that:
- Allows all search engine crawlers
- Disallows `/admin`, `/login`, `/api/` paths
- Points to the sitemap
- Includes crawl-delay consideration
- Has specific rules for AI crawlers (GPTBot, ChatGPT-User, Google-Extended, CCBot, anthropic-ai) — **allow them** since XActions wants AI visibility

### 2. Create sitemap.xml

Generate a complete `sitemap.xml` with:
- All public pages listed above with proper `<lastmod>`, `<changefreq>`, `<priority>` values
- Priority hierarchy: homepage (1.0), features/pricing/ai (0.9), docs/tutorials (0.8), sub-pages (0.7), legal (0.3)
- Proper XML formatting with namespace declaration
- Today's date for lastmod

### 3. Create sitemap-index.xml

If the site is large enough, create a sitemap index that references sub-sitemaps. Otherwise explain why a single sitemap suffices.

### 4. Fix Meta Tags for All Under-Optimized Pages

For each under-optimized page listed above, provide the **exact complete `<head>` section** that should replace the existing one, including:
- `<title>` (optimized for CTR, 50-60 chars, primary keyword first)
- `<meta name="description">` (compelling, 150-160 chars, includes CTA)
- `<meta name="keywords">` (10-15 relevant keywords)
- `<meta name="robots" content="index, follow">`
- `<link rel="canonical" href="...">`
- Full Open Graph tags (og:type, og:title, og:description, og:url, og:site_name, og:image, og:image:width, og:image:height, og:locale)
- Full Twitter Card tags (twitter:card, twitter:site, twitter:creator, twitter:title, twitter:description, twitter:image)
- Favicon link
- Author meta tag

### 5. Fix noindex Pages

Provide the exact meta tags for admin.html and login.html that include `<meta name="robots" content="noindex, nofollow">`.

### 6. Create manifest.json

Generate a web app manifest with:
- name, short_name, description
- start_url, display, background_color, theme_color
- Icon placeholders (192x192, 512x512)

### 7. Provide .gitignore Update

Show me exactly what lines to remove/modify in `.gitignore` so these files are tracked in version control.

### 8. Express.js Server Integration

Show me the Express.js middleware/routes needed to serve:
- `/robots.txt` → robots.txt
- `/sitemap.xml` → sitemap.xml
- `/manifest.json` → manifest.json
from the API server (since this is a static site served by Express).

---

## Output Format

For each deliverable, provide:
1. The **complete file contents** (not snippets)
2. The **exact file path** where it should be saved
3. Any **implementation notes** or caveats

Be thorough — I'll implement everything you produce directly.
