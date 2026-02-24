# Prompt 07: Convert Documentation to SEO-Optimized HTML Pages

> Paste this entire prompt into a new Claude Opus 4.6 chat.

---

## Context

I run **XActions** (https://xactions.app), a free, open-source X/Twitter automation toolkit. I have **43 detailed feature documentation files** in `docs/examples/` that are raw markdown — not served as web pages. This is a massive missed SEO opportunity.

I need you to design the **HTML page template** and generate **complete SEO-optimized HTML pages** for the highest-priority features, so each one becomes an indexable, rankable page.

### Current Docs Structure
Each markdown file follows a pattern like:

```markdown
# 🎯 Feature Name

Brief description of what it does.

## 📋 What It Does

1. Step one
2. Step two
3. Step three

## 🌐 Browser Console Script

```javascript
// Go to x.com/relevant-page
// Open browser console (F12)
// Paste this script:

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  // ... script code ...
})();
```

## ⚙️ Configuration

- `DELAY`: Time between actions (default 2000ms)
- `MAX_ITEMS`: Maximum items to process

## ⚠️ Notes

- Important caveats about the feature
- Rate limiting considerations
```

### Design Requirements

**Visual Design:**
- Match the existing XActions dark theme (black background, #1d9bf0 accent, Twitter-like UI)
- Same CSS variables as existing pages
- Responsive, mobile-friendly
- Same navigation sidebar pattern

**SEO Requirements:**
- Complete `<head>` with all meta tags (title, description, keywords, robots, canonical, OG, Twitter Card)
- JSON-LD structured data (`HowTo` + `FAQPage` + `BreadcrumbList`)
- Semantic HTML5 structure (article, section, nav, aside)
- Proper heading hierarchy (H1 → H2 → H3)
- Internal links to related pages
- Table of contents for longer pages
- "Last updated" date
- Author attribution

**Content Enhancement:**
- Transform raw docs into engaging, SEO-friendly prose
- Add FAQs (3-5 questions per page) targeting "People Also Ask"
- Add "Related Features" section linking to other feature pages
- Add "Getting Started" CTA
- Add "Try it Now" link to /run page

---

## Your Task

### 1. Create the HTML Template

Design a **reusable HTML template** (`feature-page-template.html`) that includes:
- Full `<head>` with placeholder variables for SEO tags
- Navigation matching existing site
- Hero section with feature name and description
- Table of contents
- Main content area
- FAQ section
- Related features section
- Footer with CTA
- All styled using the existing XActions CSS variables

Use `{{VARIABLE_NAME}}` placeholders for dynamic content.

### 2. Generate Complete Pages for Top 10 Features

Create complete, ready-to-deploy HTML pages for these 10 high-SEO-value features:

1. **Mass Unfollow Everyone** (`/tools/unfollow-everyone`)
   - Target keyword: "mass unfollow twitter"
   - Very high search volume

2. **Unfollow Non-Followers** (`/tools/unfollow-non-followers`)
   - Target keyword: "unfollow non followers twitter"
   - Very high search volume

3. **Download Twitter Videos** (`/tools/video-downloader`)
   - Target keyword: "download twitter video free"
   - Extremely high search volume

4. **Detect Unfollowers** (`/tools/detect-unfollowers`)
   - Target keyword: "who unfollowed me twitter"
   - High search volume

5. **Auto-Liker** (`/tools/auto-liker`)
   - Target keyword: "auto like twitter"
   - High search volume

6. **Follow Engagers** (`/tools/follow-engagers`)
   - Target keyword: "auto follow twitter"
   - High search volume

7. **Twitter Profile Scraper** (`/tools/profile-scraper`)
   - Target keyword: "twitter profile scraper"
   - High search volume in developer niche

8. **Bookmark Exporter** (`/tools/bookmark-exporter`)
   - Target keyword: "export twitter bookmarks"
   - High search volume

9. **Leave All Communities** (`/tools/leave-all-communities`)
   - Target keyword: "leave twitter communities"
   - Growing search volume

10. **Viral Tweet Scraper** (`/tools/viral-tweet-scraper`)
    - Target keyword: "scrape viral tweets"
    - Niche but high intent

### For Each Page, Generate:

**Complete HTML file** including:
- Fully optimized `<head>` section with all SEO tags
- JSON-LD structured data:
  - `HowTo` schema with realistic step-by-step instructions
  - `FAQPage` schema with 4-5 SEO-optimized questions
  - `BreadcrumbList` (Home > Tools > Feature Name)
  - `SoftwareApplication` mini-schema
- Content sections:
  - Hero with H1, subtitle, key benefit
  - "What It Does" (3-4 paragraphs, keyword-rich)
  - "How to Use" (step-by-step with code blocks)
  - "Features & Benefits" (bullet list)
  - "Configuration Options" (if applicable)
  - "FAQ" section (questions people actually search for)
  - "Related Tools" — links to 3-4 other feature pages
  - "Get Started" CTA section
- Internal links to: homepage, features page, docs page, related tutorials

**File organization:**
```
dashboard/tools/
  unfollow-everyone.html
  unfollow-non-followers.html
  video-downloader.html
  detect-unfollowers.html
  auto-liker.html
  follow-engagers.html
  profile-scraper.html
  bookmark-exporter.html
  leave-all-communities.html
  viral-tweet-scraper.html
```

### 3. Provide Sitemap Additions

List all new pages that need to be added to sitemap.xml:
```xml
<url>
  <loc>https://xactions.app/tools/unfollow-everyone</loc>
  <lastmod>2026-02-24</lastmod>
  <changefreq>monthly</changefreq>
  <priority>0.8</priority>
</url>
```

### 4. Internal Linking Map

Show which pages should link to which:
| From Page | Link To | Anchor Text |

---

## Output Format

Provide complete, production-ready HTML files. Each file should be deployable as-is. Don't use placeholder text — write real, SEO-optimized content. 

For the template, include detailed comments explaining each placeholder variable.

Start with the template, then generate all 10 pages.
