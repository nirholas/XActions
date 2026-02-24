# Prompt 11: Internal Linking Strategy — Silo Architecture & Cross-Linking

> Paste this entire prompt into a new Claude Opus 4.6 chat.

---

## Context

I run **XActions** (https://xactions.app), a free, open-source X/Twitter automation toolkit. I need a comprehensive internal linking strategy that creates topical authority through proper site architecture.

### Complete Site Map (Current + Planned)

**Main Pages:**
- `/` — Homepage
- `/features` — Features overview
- `/pricing` — Pricing
- `/docs` — Documentation hub
- `/about` — About
- `/ai` — AI Integration
- `/ai-api` — AI API
- `/mcp` — MCP Server
- `/run` — One-click script runner
- `/faq` — FAQ (planned)

**Tutorial Pages:**
- `/tutorials` — Tutorials hub
- `/tutorials/unfollow` — Unfollow tutorials
- `/tutorials/scrapers` — Scraper tutorials
- `/tutorials/automation` — Automation tutorials
- `/tutorials/communities` — Communities tutorials
- `/tutorials/mcp` — MCP tutorials
- `/tutorials/monitoring` — Monitoring tutorials

**Tool Pages (planned, from Prompt 07):**
- `/tools/unfollow-everyone`
- `/tools/unfollow-non-followers`
- `/tools/video-downloader`
- `/tools/detect-unfollowers`
- `/tools/auto-liker`
- `/tools/follow-engagers`
- `/tools/profile-scraper`
- `/tools/bookmark-exporter`
- `/tools/leave-all-communities`
- `/tools/viral-tweet-scraper`
(+ 30 more tool pages planned)

**Programmatic Pages (planned, from Prompt 08):**
- `/guides/how-to-[action]-on-twitter` (40+ pages)
- `/compare/[tool1]-vs-[tool2]` (20+ pages)
- `/best/[category]-tools-for-twitter` (20+ pages)
- `/alternative/[competitor]-alternative` (15+ pages)
- `/use-cases/twitter-[feature]-for-[audience]` (20+ pages)

**Blog (planned, from Prompt 09):**
- `/blog/[slug]` (60+ articles planned over 6 months)

**Legal:**
- `/privacy` — Privacy Policy
- `/terms` — Terms of Service
- `/404` — Error page

---

## Your Task

### 1. Site Architecture / Silo Design

Design the **topical silo structure** — how pages are organized into authority-building groups:

**Silo 1: Unfollow Management**
- Hub: /tools (or /features filtered to unfollow)
- Pages: unfollow-everyone, unfollow-non-followers, detect-unfollowers
- Tutorials: /tutorials/unfollow
- Guides: how-to-mass-unfollow-twitter, how-to-unfollow-non-followers
- Comparisons: xactions-vs-circleboom, xactions-vs-tweepi
- Blog: related articles

**Design all silos** (suggest 8-12 silos) with:
- Hub page
- Tool pages in the silo
- Tutorial pages
- Guide pages
- Comparison/alternative pages
- Blog articles
- How they all link to each other

### 2. Complete Internal Link Map

Create a **link map** showing every page → page connection:

**Format:**
| Source Page | Destination Page | Anchor Text | Link Location (nav/body/sidebar/footer/related) | Priority (must-have/nice-to-have) |

Generate this for ALL pages (current + planned). This will be a large table — that's expected.

### 3. Anchor Text Strategy

**Rules for anchor text:**
- Primary keyword anchor: use only once per target page
- Variation anchors: 3-5 per target page
- Branded anchors: "XActions [feature]"
- Natural/generic: "learn more", "see how", "this tool"
- Long-tail: full question phrases

For each major target page, provide:
| Target Page | Primary Anchor | Variation Anchors (3-5) | Branded Anchor | Natural Anchors |

### 4. Navigation Link Optimization

**Header navigation:** What pages should be in the main nav?
**Footer navigation:** What pages to include?
**Sidebar navigation:** (for tool/tutorial/blog pages) — what links?
**Breadcrumbs:** Breadcrumb path for every page (and HTML markup)
**Related pages:** Algorithm for "Related Tools" / "Related Articles" sections

### 5. Hub & Spoke Model

Design **hub pages** that serve as link distribution points:

**Features Hub** (`/features`):
- Links to: every tool page
- Receives links from: homepage, blog, tutorials
- Anchor text pattern: "[Tool Name] — [Brief Benefit]"

**Tutorials Hub** (`/tutorials`):
- Links to: every tutorial sub-page
- Receives links from: tool pages ("See tutorial →"), docs
- Anchor text pattern: "Learn how to [action]"

**Tools Directory** (should this be a dedicated page?):
- Links to: all 40+ tool pages
- Like a mini-sitemap but for users

Design each hub with linking strategy.

### 6. Contextual Linking Rules

Create rules for embedding links within body content:

- **Minimum links per page:** X contextual internal links
- **Maximum links per page:** Don't exceed Y links
- **Link density:** 1 internal link per 200-300 words
- **Link placement:** Best positions (first paragraph, middle, conclusion)
- **CTA links:** Where to place product CTAs vs informational links
- **Link to older content:** Every new page must link to 3+ existing pages
- **Link from older content:** When adding a new page, update N existing pages to link to it

### 7. Link Equity Flow

Diagram the **PageRank flow** through the site:
- Homepage distributes to → main pages → sub-pages → individual pages
- Which pages need the most link equity? (tool pages for high-value keywords)
- Where are link equity bottlenecks?
- Are there orphan pages? (pages with <2 incoming internal links)

### 8. Implementation Checklist

Step-by-step implementation plan:
1. Add breadcrumbs to all pages
2. Add "Related Tools" section to all tool pages
3. Add contextual links to all existing pages
4. Update navigation
5. Create hub pages
6. etc.

---

## Output Format

Use tables for the link map (it will be large — that's fine). Use visual text diagrams for silo architecture. Provide specific anchor text for every link — not generic suggestions. This is an implementation guide, not strategy advice.
