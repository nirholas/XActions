# Technical SEO Audit Checklist for XActions

> Comprehensive checklist to ensure xactions.app is fully optimized for search engines, structured data validation, and Knowledge Panel eligibility.

---

## 1. Structured Data Validation

### JSON-LD Schemas Present

| Page | Required Schemas | Status |
|------|-----------------|--------|
| site/index.html | SoftwareApplication, WebSite, FAQPage | [ ] Validate |
| dashboard/index.html | WebApplication, BreadcrumbList | [ ] Validate |
| dashboard/about.html | Organization, BreadcrumbList | [ ] Validate |
| dashboard/faq.html | FAQPage, BreadcrumbList | [ ] Validate |
| dashboard/pricing.html | Product/Offer, BreadcrumbList | [ ] Validate |
| dashboard/docs.html | CollectionPage, BreadcrumbList | [ ] Validate |
| dashboard/blog/*.html | BlogPosting, BreadcrumbList | [ ] Validate |
| dashboard/tutorials.html | CollectionPage, BreadcrumbList | [ ] Validate |
| dashboard/features.html | SoftwareApplication, BreadcrumbList | [ ] Validate |
| dashboard/compare.html | Product comparison schema | [ ] Validate |

### Validation Steps
1. Open https://search.google.com/test/rich-results
2. Enter each page URL
3. Confirm: no errors, no critical warnings
4. Document any issues below

### Common Issues to Check
- [ ] No `sameAs` missing in Organization schema
- [ ] `softwareVersion` matches current release (3.1.0)
- [ ] `dateModified` is recent
- [ ] All URLs use HTTPS
- [ ] `logo` URL resolves (returns 200)
- [ ] Wikidata URL in `sameAs` (once created)

---

## 2. Meta Tags Audit

### Every Page Must Have

| Meta Tag | Present? | Consistent? |
|----------|----------|-------------|
| `<title>` — unique, includes "XActions" | [ ] | [ ] |
| `<meta name="description">` — unique, 150-160 chars | [ ] | [ ] |
| `<meta name="robots" content="index, follow">` | [ ] | [ ] |
| `<link rel="canonical">` — absolute URL, no trailing slash inconsistency | [ ] | [ ] |
| `<meta property="og:title">` | [ ] | [ ] |
| `<meta property="og:description">` | [ ] | [ ] |
| `<meta property="og:url">` | [ ] | [ ] |
| `<meta property="og:image">` — 1200×630px | [ ] | [ ] |
| `<meta property="og:type">` | [ ] | [ ] |
| `<meta property="og:site_name" content="XActions">` | [ ] | [ ] |
| `<meta name="twitter:card" content="summary_large_image">` | [ ] | [ ] |
| `<meta name="twitter:site" content="@nichxbt">` | [ ] | [ ] |
| `<meta name="twitter:title">` | [ ] | [ ] |
| `<meta name="twitter:description">` | [ ] | [ ] |
| `<meta name="twitter:image">` | [ ] | [ ] |

### Title Tag Formula
```
[Page Name] - XActions | [Category/Benefit]
```
Examples:
- "XActions — Free AI-Powered X/Twitter Automation Tools"
- "MCP Server - XActions | AI Agent Twitter Integration"
- "About XActions | Open-Source X/Twitter Automation Toolkit"

---

## 3. Crawlability & Indexing

### robots.txt
- **Location:** https://xactions.app/robots.txt
- [ ] `Allow: /` for all user agents
- [ ] `Disallow: /admin`, `/login`, `/api/`
- [ ] `Sitemap: https://xactions.app/sitemap.xml`
- [ ] No accidental disallows blocking important pages

### sitemap.xml
- **Location:** https://xactions.app/sitemap.xml
- [ ] All public pages included
- [ ] No non-existent URLs (404s)
- [ ] `<changefreq>` and `<priority>` set appropriately
- [ ] Submitted to Google Search Console

### Google Search Console
- [ ] Property verified (https://xactions.app)
- [ ] Sitemap submitted
- [ ] No manual actions or penalties
- [ ] Coverage report: all pages indexed
- [ ] Monitor "Page experience" report

### Indexing Commands
```
# Request indexing for a specific page via Search Console:
# URL Inspection → Enter URL → Request Indexing

# Check if a page is indexed:
# Google search: site:xactions.app/about
```

---

## 4. Performance & Core Web Vitals

### Targets

| Metric | Target | Tool |
|--------|--------|------|
| LCP (Largest Contentful Paint) | < 2.5s | PageSpeed Insights |
| FID (First Input Delay) | < 100ms | PageSpeed Insights |
| CLS (Cumulative Layout Shift) | < 0.1 | PageSpeed Insights |
| Mobile score | > 90 | PageSpeed Insights |
| Desktop score | > 95 | PageSpeed Insights |

### Optimization Checklist
- [ ] Images optimized (WebP format, lazy loading)
- [ ] CSS minified
- [ ] JavaScript deferred/async where possible
- [ ] No render-blocking resources above the fold
- [ ] Font display: swap used
- [ ] Gzip/Brotli compression enabled on server
- [ ] CDN configured (Cloudflare, Vercel, etc.)
- [ ] HTTP/2 enabled

### Test URLs
```
https://pagespeed.web.dev/analysis?url=https://xactions.app
https://pagespeed.web.dev/analysis?url=https://xactions.app/about
https://pagespeed.web.dev/analysis?url=https://xactions.app/features
```

---

## 5. Mobile Friendliness

- [ ] Responsive design on all pages
- [ ] No horizontal scroll on mobile
- [ ] Tap targets at least 48px × 48px
- [ ] Text readable without zooming
- [ ] Mobile-Friendly Test: https://search.google.com/test/mobile-friendly

---

## 6. Internal Linking

### Key Pages Must Be Reachable in ≤ 3 Clicks from Homepage

| Page | Clicks from Home | Linked From |
|------|-----------------|-------------|
| /features | 1 | Main nav |
| /docs | 1 | Main nav |
| /about | 1 | Main nav / footer |
| /pricing | 1 | Main nav |
| /tutorials | 1 | Main nav |
| /blog | 1-2 | Nav or footer |
| /mcp | 1-2 | Features or nav |
| /compare | 1-2 | Pricing or nav |
| /contact | 2 | Footer |

### Internal Link Best Practices
- [ ] All important pages linked from the homepage
- [ ] Descriptive anchor text (not "click here")
- [ ] No orphan pages (pages with zero internal links to them)
- [ ] Breadcrumb navigation on all subpages
- [ ] Footer links to key pages

---

## 7. URL Structure

### Rules
- [ ] All URLs lowercase
- [ ] No trailing slashes (or consistent trailing slashes)
- [ ] No query parameters for content pages
- [ ] Descriptive slugs (e.g., `/blog/how-to-mass-unfollow-twitter`)
- [ ] No duplicate content (canonical tags set correctly)

### URL Audit

| URL | SEO-Friendly? | Canonical Set? |
|-----|--------------|----------------|
| /features | ✓ | [ ] |
| /about | ✓ | [ ] |
| /docs | ✓ | [ ] |
| /pricing | ✓ | [ ] |
| /blog/how-to-mass-unfollow-twitter | ✓ | [ ] |
| /tutorials/unfollow | ✓ | [ ] |

---

## 8. Open Graph & Social Sharing

### Image Requirements
- **Dimensions:** 1200 × 630 pixels (Facebook/LinkedIn) or 1200 × 675 (Twitter)
- **Format:** PNG or JPEG
- **File size:** < 1MB
- **Content:** Product name + tagline + visual, no excessive text

### Sharing Test URLs
- Facebook: https://developers.facebook.com/tools/debug/
- Twitter: https://cards-dev.twitter.com/validator
- LinkedIn: https://www.linkedin.com/post-inspector/

### OG Images Needed
- [ ] `/og-home.png` — Homepage
- [ ] `/og-about.png` — About page
- [ ] `/og-dashboard.png` — Dashboard
- [ ] `/og-features.png` — Features
- [ ] `/og-blog-unfollow.png` — Blog: mass unfollow
- [ ] `/og-blog-automation.png` — Blog: automation tools
- [ ] `/og-blog-mcp.png` — Blog: MCP server

---

## 9. Knowledge Panel Specific Signals

### Entity Consistency Score

Check that the same information appears identically on:

| Platform | Name | URL | Description |
|----------|------|-----|-------------|
| xactions.app | XActions | ✓ | ✓ |
| GitHub | XActions | ✓ | ✓ |
| npm | xactions | ✓ | ✓ |
| Wikidata | XActions | ✓ | ✓ |
| Product Hunt | XActions | ✓ | ✓ |
| AlternativeTo | XActions | ✓ | ✓ |
| Crunchbase | XActions | ✓ | ✓ |

### `sameAs` Links Present in JSON-LD

The Organization schema on about.html must include `sameAs` pointing to ALL of these:
- [ ] `https://github.com/nirholas/XActions`
- [ ] `https://x.com/nichxbt`
- [ ] `https://www.npmjs.com/package/xactions`
- [ ] `https://www.wikidata.org/wiki/Q_______` (after creation)
- [ ] Product Hunt URL (after listing)
- [ ] Crunchbase URL (after listing)
- [ ] LinkedIn company URL (after creation)

---

## 10. Security & Trust Signals

- [ ] HTTPS on all pages (no mixed content)
- [ ] HSTS header set
- [ ] Security.txt at `/.well-known/security.txt` or `/security.txt`
- [ ] Privacy policy page exists and is linked
- [ ] Terms of service page exists and is linked
- [ ] Contact information accessible

---

## Monthly Maintenance

| Task | Frequency | Tool |
|------|-----------|------|
| Validate structured data | Monthly | Rich Results Test |
| Check Google Search Console for errors | Weekly | GSC |
| Review Core Web Vitals | Monthly | PageSpeed Insights |
| Update `softwareVersion` in JSON-LD | Per release | Manual |
| Check for broken links | Monthly | Screaming Frog / ahrefs |
| Review sitemap for new pages | Per deploy | Manual |
| Monitor Knowledge Panel status | Weekly | Google Search |
| Check mobile friendliness | Quarterly | Mobile-Friendly Test |
