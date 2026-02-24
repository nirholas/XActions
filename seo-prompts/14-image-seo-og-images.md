# Prompt 14: Image SEO & OG Images — Visual Assets Strategy

> Paste this entire prompt into a new Claude Opus 4.6 chat.

---

## Context

I run **XActions** (https://xactions.app), a free, open-source X/Twitter automation toolkit. I need a comprehensive image SEO strategy including OG images for social sharing, alt text optimization, and image performance best practices.

### Current State
- OG images are referenced in meta tags (`og-home.png`, `og-dashboard.png`, `og-about.png`, `og-ai.png`) but may not actually exist as files
- No systematic alt text on images
- No image optimization pipeline
- Static HTML site — no image processing build step
- Dark theme (black background, #1d9bf0 accent blue, Twitter-like design)

### Pages Needing OG Images
- Homepage (og-home.png)
- Dashboard (og-dashboard.png)
- About (og-about.png)
- AI Integration (og-ai.png)
- Features (og-features.png)
- Pricing (og-pricing.png)
- Documentation (og-docs.png)
- MCP Server (og-mcp.png)
- AI API (og-ai-api.png)
- Tutorials (og-tutorials.png)
- Run Scripts (og-run.png)
- FAQ (og-faq.png)
- 10+ Tool pages (og-tools-[slug].png)
- Blog posts (og-blog-[slug].png)
- Comparison pages (og-compare-[slug].png)

---

## Your Task

### 1. OG Image Design System

Design a **consistent OG image template system**:

**Specifications:**
- Dimensions: 1200x630px (Facebook/LinkedIn) and 1200x600px (Twitter summary_large_image)
- File format: PNG or WebP
- File size target: <200KB each
- Dark background matching site theme

**Template Designs (describe in detail, I'll create them):**

**Template A: Feature/Tool Page**
- Layout description (what goes where)
- XActions logo placement
- Feature name (large text)
- Feature icon/emoji
- Brief tagline
- URL text
- Color scheme from site variables

**Template B: Blog Post**
- Layout for article titles
- Category tag visual
- Author attribution
- Reading time indicator

**Template C: Comparison Page**
- Split design showing "vs"
- Tool logos/names on each side
- "Free Alternative" badge

**Template D: Homepage/Landing**
- Hero-style OG image
- Main value proposition
- Feature highlights as icons

For each template, provide:
- Exact layout specifications (positions, sizes, fonts)
- Text content for each page's OG image
- Color values (hex codes from site theme)
- Framework/tool recommendation for generating these (e.g., Satori, Puppeteer screenshot, Canva API, SVG template)

### 2. Automated OG Image Generation

Provide a **Node.js script** that generates OG images programmatically:

Using `@vercel/og`, `satori`, or `puppeteer`:
- Takes page data (title, description, type) as input
- Generates consistent OG images
- Outputs to correct directory
- Can be run as build step: `node scripts/generate-og-images.js`

Include the complete script with template rendering.

**Alternative: SVG-based OG images**
If programmatic generation is complex, provide SVG templates that can be:
- Served directly as OG images (if supported)
- Or converted to PNG via a simple script

### 3. Alt Text Strategy

For every image type on the site, provide alt text rules:

**Screenshots:**
- Pattern: "Screenshot of [feature] in XActions showing [what's visible]"
- Include keywords naturally
- Describe what the user sees

**Icons/Illustrations:**
- When to use empty alt="" (decorative) vs descriptive alt
- Pattern for feature icons

**OG Images:**
- `og:image:alt` tag content for each page

**Code screenshots (if used in tutorials):**
- Alt text for code block images

Generate specific alt text for all OG images (one per page).

### 4. Image File Optimization

**File naming conventions:**
- Pattern: `xactions-[feature]-[descriptor].[ext]`
- Lowercase, hyphens, descriptive
- Include keyword in filename

**Format strategy:**
- When to use PNG vs WebP vs AVIF vs SVG
- Fallback strategy for WebP/AVIF
- `<picture>` element usage

**Lazy loading:**
- Which images to eager-load (above fold)
- Which to lazy-load
- `loading="lazy"` and `decoding="async"` attributes
- Intersection Observer approach

**Responsive images:**
- `srcset` and `sizes` attributes
- Breakpoint strategy
- Maximum dimensions served at each breakpoint

### 5. Image Sitemap

Generate an **image sitemap** (`sitemap-images.xml`) for all OG images and any in-content images:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>https://xactions.app/</loc>
    <image:image>
      <image:loc>https://xactions.app/og-home.png</image:loc>
      <image:title>XActions - Free X/Twitter Automation Platform</image:title>
      <image:caption>...</image:caption>
    </image:image>
  </url>
</urlset>
```

### 6. Favicon & PWA Icons

Provide a complete favicon set:
- favicon.ico (16x16, 32x32 multi-size)
- apple-touch-icon.png (180x180)
- icon-192.png, icon-512.png (for manifest.json)
- SVG favicon (we already have the ⚡ emoji one)
- `<link>` tags for all favicons

### 7. Social Media Preview Optimization

For each major platform, optimize sharing appearance:
- **Twitter/X:** summary_large_image card, all meta tags
- **Facebook/LinkedIn:** OG tags, image dimensions
- **Discord:** Embed optimization (Discord reads OG tags)
- **Slack:** Unfurl optimization
- **iMessage/WhatsApp:** Link preview

Provide the meta tags needed for each platform beyond standard OG/Twitter Card tags.

---

## Output Format

1. OG image template specifications (detailed enough for a designer)
2. OG image text content for every page (30+ pages)
3. Node.js OG image generation script
4. Alt text for all images
5. Image sitemap XML
6. Favicon HTML tags
7. Social media meta tags
