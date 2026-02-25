# Prompt 10: Build Essential Missing Pages

> Build all missing essential pages for the XActions website (xactions.app).
> Each page must match the existing dark theme, sidebar nav, and footer pattern used across all dashboard/*.html files.

---

## Context

XActions (github.com/nirholas/XActions) is a free, open-source X/Twitter automation toolkit.
The website lives in `dashboard/` — static HTML files with inline CSS, dark Twitter-inspired theme, sidebar navigation.

### Existing Design System

- CSS variables: `--bg-primary: #000`, `--bg-secondary: #16181c`, `--accent: #1d9bf0`, `--text-primary: #e7e9ea`, `--text-secondary: #8b8f94`, `--border: #2f3336`
- Shared stylesheet: `/css/common.css` (layout, sidebar, nav, footer, focus styles, responsive)
- Sidebar nav with 10 items + GitHub link (see any existing page like `features.html` for the exact nav HTML)
- Footer: 4-column grid (Brand, Product, Company, Legal) + bottom bar with copyright
- Font: system stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`)
- All external links get `target="_blank" rel="noopener noreferrer"`
- Emoji icons in nav, `aria-label` on all icon-only elements
- Skip-nav link at top of every page
- `<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚡</text></svg>">`

### SEO Requirements (Every Page)

- `<title>` — keyword-rich, under 60 chars, brand at end
- `<meta name="description">` — compelling, 150-160 chars
- `<meta name="keywords">` — 8-12 relevant terms
- Open Graph tags: `og:type`, `og:title`, `og:description`, `og:url`, `og:site_name`, `og:image`
- Twitter Card tags: `twitter:card`, `twitter:site` (@nichxbt), `twitter:title`, `twitter:description`
- `<link rel="canonical">`
- JSON-LD structured data (BreadcrumbList at minimum, plus page-specific schema)
- `<meta name="robots" content="index, follow">` (except admin/login pages)

### Navigation Pattern

Copy the exact sidebar nav from `dashboard/features.html` — it has the standardized 10-item nav:
Home, One-Click, Dashboard, All Scripts, Tutorials, Documentation, AI/MCP, Pricing, About, GitHub

### Footer Pattern

Copy the exact footer from `dashboard/features.html` — 4-column grid footer.

---

## Page 1: FAQ (`dashboard/faq.html`)

### Purpose
Answer the top questions users have. Reduces support load, improves SEO (FAQ pages rank well), builds trust for a tool that automates Twitter accounts.

### Content Structure

```
Header: "Frequently Asked Questions"
Subtitle: "Everything you need to know about XActions"

Sections (accordion-style, click to expand):

## General
- What is XActions?
  → Free, open-source X/Twitter automation toolkit. 43+ tools for unfollowing, scraping, auto-engaging, and more. No API fees.
  
- Is XActions really free?
  → Yes, 100% free and open source (MIT license). No hidden fees, no premium tiers, no credit system.

- Do I need a Twitter/X API key?
  → No. XActions uses browser automation — scripts run directly in your browser's DevTools console on x.com. No API key, no developer account.

- Is XActions affiliated with X/Twitter?
  → No. XActions is an independent open-source project. Not endorsed by or affiliated with X Corp.

## Safety & Security
- Is my account safe?
  → XActions runs in YOUR browser — your credentials never leave your machine. The scripts add human-like delays (1-3 seconds) between actions to avoid rate limits.

- Will I get banned/suspended?
  → XActions mimics human behavior with built-in delays. However, any automation carries some risk. Start with conservative settings and avoid running multiple scripts simultaneously.

- Do you store my data?
  → No. Browser scripts run entirely in your browser. Nothing is sent to our servers. If you use the MCP server or CLI, they run locally on your machine.

- Is the code safe to run?
  → Yes — it's fully open source. You can read every line of code on GitHub before running it. Over [X] GitHub stars from the community.

## Usage
- How do I use XActions?
  → 3 ways: (1) Copy-paste scripts into browser DevTools on x.com, (2) Use the CLI (`npx xactions`), (3) Use the MCP server with AI agents like Claude.

- What can I automate?
  → Unfollowing, following, liking, posting, scraping profiles/tweets/followers, detecting unfollowers, downloading videos, training your algorithm, and more. See /features for the full list.

- How do I unfollow people who don't follow me back?
  → Go to x.com, open DevTools (F12), paste the unfollowback.js script from our docs, and run it. See /tutorials/unfollow for step-by-step.

- Can I schedule automations?
  → The MCP server and CLI can be combined with cron jobs or AI agents for scheduling. Browser scripts run on-demand.

## MCP & AI Integration
- What is the MCP server?
  → Model Context Protocol server that lets AI assistants (Claude, Cursor, Windsurf) control Twitter actions through natural language. "Unfollow everyone who hasn't tweeted in 6 months."

- How do I set up MCP with Claude Desktop?
  → `npx xactions-mcp` + add the config to Claude Desktop. See /tutorials/mcp for the full guide.

## Technical
- Which browsers are supported?
  → Chrome, Edge, Brave, and any Chromium-based browser. Firefox works for most scripts.

- Does it work on mobile?
  → Browser scripts require desktop DevTools. The CLI and MCP server work on any machine with Node.js.

- How do I report a bug?
  → Open an issue on GitHub: github.com/nirholas/XActions/issues
```

### Technical Details
- Use `<details>` + `<summary>` elements for native accordion (no JS needed)
- Style summaries with pointer cursor, padding, border-bottom
- Add FAQ JSON-LD structured data (`FAQPage` schema) — this gets rich results in Google
- Group questions under section headings (h2)
- Internal links to relevant pages (/features, /tutorials/unfollow, /tutorials/mcp, /docs)

### JSON-LD Schema
```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Is XActions really free?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes, 100% free and open source (MIT license)..."
      }
    }
  ]
}
```

---

## Page 2: Changelog (`dashboard/changelog.html`)

### Purpose
Show project momentum. Users and contributors want to see active development. Also useful for SEO — "XActions changelog" is a navigational query.

### Content Source
Read `CHANGELOG.md` from the repo root. Currently minimal (just "1.0.0 - Initial release"), so generate a realistic changelog from the git history and feature set.

### Content Structure

```
Header: "Changelog"
Subtitle: "What's new in XActions"

Timeline-style layout (newest first):

## v1.2.0 — February 2026
### Added
- 🤖 MCP server for AI agents (Claude, Cursor, Windsurf)
- 📊 Real-time analytics dashboard
- 🔍 Detect unfollowers with snapshot comparison
- 🎥 Video downloader with quality selection
- 🧵 Thread unroller and summarizer

### Improved
- ⚡ 2x faster mass unfollow with adaptive delays
- 🎨 New dark theme matching X/Twitter design

## v1.1.0 — January 2026
### Added
- 📝 Auto-commenter with AI-generated replies
- 🔄 Auto-repost with scheduling
- 📋 Bookmark exporter (JSON, CSV, Markdown)
- 🏷️ Hashtag scraper with engagement metrics

## v1.0.0 — February 2026
### Added
- 🚀 Initial release
- Mass unfollow (everyone / non-followers)
- 15+ scraping tools
- CLI tool (`npx xactions`)
- Browser extension (Chrome/Edge)
```

### Technical Details
- Timeline-style cards with version badges
- Color-coded tags: Added (green), Improved (blue), Fixed (yellow), Removed (red)
- Each entry is a card with `border-left: 3px solid var(--accent)` or color per type
- Link each feature to its docs/tutorial page
- Add "Subscribe to updates" link → GitHub releases page
- No JS required — pure HTML/CSS

---

## Page 3: Contact / Support (`dashboard/contact.html`)

### Purpose
Every site needs a way to reach the team. Builds trust, required for business credibility.

### Content Structure

```
Header: "Contact & Support"
Subtitle: "Get help with XActions"

## 🐛 Report a Bug
Open an issue on GitHub — include steps to reproduce, browser version, and any error messages.
→ Button: "Open GitHub Issue" (links to github.com/nirholas/XActions/issues/new)

## 💬 Community & Discussions
Join the community to ask questions, share scripts, and get help from other users.
→ Button: "GitHub Discussions" (links to github.com/nirholas/XActions/discussions)

## 🐦 Follow for Updates
Get announcements, tips, and interact with the creator.
→ Button: "Follow @nichxbt on X" (links to x.com/nichxbt)

## 📧 Email
For business inquiries, partnerships, or security reports.
→ Email link or contact form

## 🔐 Security
Found a security vulnerability? Please report it responsibly.
→ Link to /security or SECURITY.md instructions

## ⭐ Contribute
XActions is open source. PRs, bug reports, and feature requests welcome.
→ Button: "Contributing Guide" (links to github.com/nirholas/XActions/blob/main/CONTRIBUTING.md)

## Quick Links
- Documentation → /docs
- Tutorials → /tutorials  
- GitHub → github.com/nirholas/XActions
- Twitter → x.com/nichxbt
```

### Technical Details
- Card-based layout — each section is a card with icon, description, and CTA button
- 2-column grid on desktop, single column on mobile
- Buttons styled as `.action-btn` (accent color, pill shape)
- Optional: simple contact form (name, email, message) — but since there's no backend form handler, just use mailto: or link to GitHub Issues
- JSON-LD: `ContactPage` schema

---

## Page 4: Blog Index (`dashboard/blog.html`) + First 3 Posts

### Purpose
SEO powerhouse. Blog posts targeting "how to unfollow on twitter", "twitter automation tools 2026", etc. drive organic traffic.

### Blog Index Structure

```
Header: "Blog"
Subtitle: "Tips, guides, and updates from the XActions team"

Card grid (2 columns on desktop):

Each card:
- Title (linked to post)
- Date
- Reading time estimate
- 1-2 sentence excerpt
- Category tag (Tutorial / Guide / Update / Tips)
```

### Blog Post Template (`dashboard/blog/[slug].html`)

```
- Breadcrumb: Home > Blog > [Post Title]
- Title (h1)
- Meta: Date · X min read · Category
- Author: nich (@nichxbt) with avatar/link
- Article body (proper semantic HTML: h2, h3, p, ul, code blocks)
- Related posts at bottom
- CTA: "Try XActions — it's free" with GitHub link
```

### First 3 Posts to Create

**Post 1: `dashboard/blog/how-to-mass-unfollow-twitter.html`**
- Title: "How to Mass Unfollow on Twitter/X in 2026 (Free Method)"
- Target keyword: "mass unfollow twitter"
- Content: Step-by-step guide using XActions browser script, with screenshots described, code blocks, tips
- ~800-1200 words

**Post 2: `dashboard/blog/best-twitter-automation-tools.html`**
- Title: "7 Best Free Twitter/X Automation Tools in 2026"
- Target keyword: "twitter automation tools"
- Content: Comparison of tools (XActions, Tweepy, Twitter API v2, etc.), highlighting XActions as the free/no-API option
- ~1000-1500 words

**Post 3: `dashboard/blog/twitter-mcp-server-ai-agents.html`**
- Title: "How to Control Twitter with AI Using MCP (Claude, Cursor, GPT)"
- Target keyword: "twitter mcp server"
- Content: What is MCP, why it matters, setup guide for XActions MCP with Claude Desktop
- ~800-1200 words

### Technical Details
- Each post gets its own JSON-LD `Article` schema with `author`, `datePublished`, `headline`
- Blog index gets `CollectionPage` schema
- Proper `<article>` semantic HTML
- Code blocks styled with dark background, monospace font, copy button (optional)
- Create `dashboard/blog/` directory for all posts
- Blog index should be easy to extend — just add more cards

---

## Page 5: Status Page (`dashboard/status.html`)

### Purpose
Build trust. Users depending on XActions tools want to know if the API is up. Even a simple page is better than nothing.

### Content Structure

```
Header: "System Status"
Subtitle: "Current operational status of XActions services"

## Current Status
🟢 All Systems Operational (or 🟡 Degraded / 🔴 Down)

Status cards:
- Website (xactions.app) → 🟢 Operational
- API Server (xactions-api.up.railway.app) → 🟢 Operational  
- MCP Server → 🟢 Operational (runs locally)
- Browser Scripts → 🟢 Operational (runs in your browser)
- CLI Tool → 🟢 Operational (runs locally)

## Note
Most XActions tools run entirely in your browser or locally on your machine.
They don't depend on our servers. The API server is only used for:
- Video downloading
- Thread unrolling
- AI-powered features

## Uptime History (Last 30 Days)
Simple bar chart or grid showing daily status (green = good, yellow = partial, red = down)

## Report an Issue
If something isn't working, open a GitHub issue.
→ Button: "Report Issue"
```

### Technical Details
- Live status check: on page load, `fetch('/api/health')` to check if the API is responding. If yes → green. If timeout → red.
- Fallback: if API is unreachable, show "API Unavailable" in yellow/red, but reassure users that browser scripts still work
- Simple status grid using CSS grid, colored dots
- Auto-refresh every 60 seconds (optional)
- No heavy dependencies — vanilla JS fetch

---

## Page 6: Security (`dashboard/security.html`)

### Purpose
Automation tools that touch Twitter accounts NEED a security page. Builds massive trust. Surface the existing SECURITY.md content.

### Content Source
Read and adapt `SECURITY.md` from the repo root.

### Content Structure

```
Header: "Security"
Subtitle: "How XActions protects your data"

## 🔒 Your Data Stays Local
XActions browser scripts run entirely in YOUR browser. Your credentials, cookies, and data never leave your machine.

## 🛡️ No Server-Side Storage
- Browser scripts: zero server communication
- CLI tool: runs locally on your machine  
- MCP server: runs locally, all data stays on your machine
- API features (video download, thread unroll): we process the request and return results. We don't store your data.

## 🔐 Open Source = Auditable
Every line of code is public on GitHub. You can audit the code before running it. We have nothing to hide.

## 🍪 Session Cookie Handling
If you use the hosted dashboard features, your X/Twitter session cookie is:
- Encrypted with AES-256-GCM before storage
- Never logged or transmitted to third parties
- Deletable at any time from your settings
- Used only to execute the automation you requested

## ⚠️ Responsible Disclosure
Found a vulnerability? Please report it responsibly:
- Email: [security contact]
- DO NOT open a public GitHub issue for security vulnerabilities
- We aim to respond within 48 hours
- We'll credit you in our changelog (unless you prefer anonymity)

## 🔑 Best Practices
- Never share your auth_token cookie with anyone
- Use XActions in a browser profile you control
- Regularly rotate your X/Twitter password
- Review scripts before running them (they're open source for this reason)

## Dependencies
We keep dependencies minimal and audited:
- @modelcontextprotocol/sdk for MCP
- Express.js for the API
- Puppeteer for browser automation
- Prisma for database (PostgreSQL)
- No tracking, no analytics, no ads
```

### Technical Details
- Shield/lock icons for each section
- Clean card layout, no accordion needed — security info should be immediately visible
- Link to GitHub repo for code audit
- Link to SECURITY.md for full policy
- JSON-LD: `WebPage` with security topic

---

## Page 7: Use Cases (`dashboard/use-cases.html`)

### Purpose
Help different user personas see themselves using XActions. "I'm a marketer" → here's how. "I'm a developer" → here's how. Improves conversion.

### Content Structure

```
Header: "Use Cases"
Subtitle: "See how people use XActions"

## 🎯 Marketers & Growth Hackers
Clean up your following list, analyze competitor accounts, find your best posting times, auto-engage with your niche.
Key tools: Mass Unfollow, Competitor Analysis, Best Time to Post, Auto-Liker, Follow Engagers
→ "Get Started" button

## 💻 Developers & AI Engineers  
Integrate Twitter into your AI workflows. Use the MCP server with Claude, build custom scrapers, export data.
Key tools: MCP Server, Profile Scraper, Tweet Scraper, CLI Tool, API
→ "Set Up MCP" button

## 📊 Data Analysts & Researchers
Scrape tweets, followers, hashtags, engagement data. Export to JSON/CSV for analysis.
Key tools: 15+ Scrapers, Export to CSV, Analytics Dashboard, Hashtag Scraper
→ "View Scrapers" button

## 🎨 Content Creators & Influencers
Grow your audience, detect unfollowers, train your algorithm, schedule content.
Key tools: Detect Unfollowers, Algorithm Trainer, Auto-Repost, Thread Composer
→ "Start Growing" button

## 🏢 Agencies & Teams
Manage multiple accounts, bulk operations, white-label options.
Key tools: CLI (scriptable), Batch Operations, License System
→ "View Pricing" button

## 🤖 AI Agents & Bots
Give your AI agent full Twitter capabilities through MCP. Scrape, post, follow, like — all through natural language.
Key tools: MCP Server (20+ tools), AI Writer, Voice Analyzer
→ "MCP Docs" button
```

### Technical Details
- Large hero cards with gradient backgrounds (subtle, dark theme appropriate)
- Each card: icon, persona title, 2-3 sentence description, list of key tools (linked), CTA button
- 2-column grid on desktop, single column on mobile
- Each tool name links to its docs or tutorial page

---

## Page 8: Integrations (`dashboard/integrations.html`)

### Purpose
Show how XActions works with other tools. MCP is the big one, but also CLI, browser extension, etc.

### Content Structure

```
Header: "Integrations"
Subtitle: "XActions works with your favorite AI tools"

## Tier 1: AI Assistants (via MCP)
Cards for each:
- Claude Desktop — "Full MCP integration. Ask Claude to manage your Twitter."
- Cursor — "Twitter data in your IDE. Scrape profiles while coding."
- Windsurf — "AI-powered Twitter automation in Windsurf."
- Any MCP Client — "XActions works with any MCP-compatible client."

Each card: Logo/icon, name, 1-liner, "Setup Guide →" link

## Tier 2: Developer Tools
- Node.js / npm — `npx xactions` CLI
- GitHub Actions — Automate on schedule with CI/CD
- Cron / Task Scheduler — Set up recurring automations

## Tier 3: Data & Export
- JSON export — All scrapers output JSON by default
- CSV export — Built-in CSV export for spreadsheets
- Google Sheets — Copy-paste or import CSV
- Notion — Paste exported data into Notion databases

## Tier 4: Browser
- Chrome Extension — Install from source
- DevTools Console — Copy-paste scripts
- Bookmarklets — One-click automation from toolbar

## Coming Soon
- Zapier / Make integration
- Discord bot
- Telegram bot
- REST API with OpenAPI spec
```

### Technical Details
- Logo/icon grid layout
- Grouped by tier/category
- Each integration links to its setup docs
- "Coming Soon" items shown with lower opacity + badge

---

## Page 9: Contributing (`dashboard/contributing.html`)

### Purpose
Surface CONTRIBUTING.md for non-GitHub visitors. Attract contributors. Open source projects live or die by their contributor funnel.

### Content Source
Read and adapt `CONTRIBUTING.md` from the repo root.

### Content Structure

```
Header: "Contribute to XActions"
Subtitle: "Help build the best free Twitter automation toolkit"

## Why Contribute?
- Join [X] contributors building open-source Twitter tools
- Get credited in CHANGELOG and contributors page
- Learn browser automation, MCP, AI integration
- Solve real problems for [X]k+ users

## How to Contribute

### 🐛 Report Bugs
→ GitHub Issues link with bug report template

### 💡 Request Features  
→ GitHub Issues link with feature request template

### 🔧 Submit Code
1. Fork the repo
2. Create a feature branch
3. Write your changes
4. Submit a PR
→ Link to contributing guide

### 📝 Improve Documentation
Docs, tutorials, examples — always welcome.

### 📢 Spread the Word
Star on GitHub, share on Twitter, write about XActions.

## Good First Issues
[Dynamic or curated list of beginner-friendly issues]

## Project Structure
Brief overview of the codebase layout (from AGENTS.md)

## Code Style
- const over let, async/await, emojis in console.log
- data-testid selectors for DOM
- Author credit: // by nichxbt
```

### Technical Details
- Cards for each contribution type
- "Good First Issues" section could link to GitHub label filter
- CTA: "Star on GitHub" button prominently displayed
- JSON-LD: could use `HowTo` schema for the contribution steps

---

## Page 10: Compare / Alternatives (`dashboard/compare.html`)

### Purpose
EXTREMELY high SEO value. People searching "XActions vs Tweepy", "free twitter automation", "twitter api alternative" — this page captures all of those queries.

### Content Structure

```
Header: "XActions vs Alternatives"
Subtitle: "How XActions compares to other Twitter/X tools"

## Comparison Table

| Feature | XActions | Twitter API v2 | Tweepy | Selenium DIY | Paid Tools |
|---------|---------|----------------|--------|-------------|------------|
| Price | Free forever | $100/mo+ | Free (needs API) | Free (DIY) | $29-299/mo |
| API Key Required | No | Yes | Yes | No | Varies |
| Setup Time | 30 seconds | Hours | 30 min | Hours | Minutes |
| Mass Unfollow | ✅ | ❌ (rate limited) | ⚠️ | ⚠️ DIY | ✅ |
| Scraping | ✅ 15+ scrapers | ⚠️ Limited | ⚠️ Limited | ⚠️ DIY | ✅ |
| AI Integration | ✅ MCP | ❌ | ❌ | ❌ | ⚠️ Some |
| Video Download | ✅ | ❌ | ❌ | ⚠️ | ⚠️ |
| Open Source | ✅ MIT | N/A | ✅ | ✅ | ❌ |
| Browser Scripts | ✅ | ❌ | ❌ | ❌ | ❌ |
| CLI | ✅ | ❌ | ✅ | ❌ | ⚠️ |
| No Rate Limit* | ✅ | ❌ | ❌ | ✅ | ⚠️ |

*XActions uses browser automation which has X's standard rate limits, but no API-imposed limits.

## Detailed Comparisons

### XActions vs Twitter API v2
[3-4 paragraphs on why XActions is better for most people]

### XActions vs Tweepy
[3-4 paragraphs]

### XActions vs Paid Tools (Circleboom, Audiense, etc.)
[3-4 paragraphs]

### XActions vs DIY Selenium/Playwright
[3-4 paragraphs — XActions IS browser automation but pre-built]

## Why Choose XActions?
- No API fees
- No developer account needed  
- 43+ tools ready to use
- AI-agent integration via MCP
- Active open-source community
→ CTA: "Get Started Free"
```

### Technical Details
- Styled comparison table with sticky header
- ✅/❌/⚠️ icons for clear scanning
- Green highlight on XActions column
- Each "vs" section is expandable or linked separately for SEO
- Target keywords in headings: "XActions vs Twitter API", "free twitter automation tool"
- JSON-LD: could use `ItemList` for comparison items

---

## Implementation Notes

### File Creation Order (Priority)
1. `dashboard/faq.html` — fastest ROI, FAQ schema = rich results
2. `dashboard/changelog.html` — shows momentum, content from existing CHANGELOG.md + git history
3. `dashboard/contact.html` — quick to build, essential for trust
4. `dashboard/compare.html` — highest SEO value
5. `dashboard/security.html` — critical for automation tool trust
6. `dashboard/use-cases.html` — conversion optimization
7. `dashboard/blog.html` + `dashboard/blog/` (3 posts) — long-term SEO
8. `dashboard/integrations.html` — showcases MCP ecosystem
9. `dashboard/contributing.html` — community building
10. `dashboard/status.html` — nice to have

### Navigation Update
After creating pages, add to sidebar nav where appropriate:
- FAQ → could go under Documentation or as its own item
- Blog → add to nav
- Changelog → link from footer
- Contact → link from footer
- Others → link from footer and relevant pages

### Sitemap Update
Add all new pages to `dashboard/sitemap.xml`.

### Quality Checklist (Every Page)
- [ ] Valid HTML5, no errors
- [ ] All SEO meta tags present
- [ ] JSON-LD structured data
- [ ] Canonical URL
- [ ] Skip-nav link
- [ ] Sidebar nav matches other pages
- [ ] Footer matches other pages
- [ ] Responsive (test at 480px, 768px, 1200px)
- [ ] All links have noopener noreferrer where target="_blank"
- [ ] Correct `<title>` under 60 chars
- [ ] `<meta description>` 150-160 chars
- [ ] No broken internal links
- [ ] aria-labels on icon-only elements
- [ ] common.css linked
