# Prompt 19: Performance & Core Web Vitals — Page Speed Optimization

> Paste this entire prompt into a new Claude Opus 4.6 chat.

---

## Context

I run **XActions** (https://xactions.app), a free, open-source X/Twitter automation toolkit. The site is static HTML with inline CSS (no CSS files, no build step). I need to optimize for Google's Core Web Vitals ranking factor.

### Current Tech Stack
- Static HTML pages (no framework, no SSR/SSG)
- All CSS is inline in `<style>` tags within each HTML file
- No external CSS frameworks
- No JavaScript build step
- Socket.io loaded from CDN on some pages
- Express.js API backend serves files
- Hosted on Railway (Node.js hosting)
- No CDN configured
- No image optimization pipeline
- No caching headers configured
- Dark theme (primarily CSS custom properties)

### Current Performance Issues (Likely)
- No minification of inline CSS/JS
- Socket.io CDN loaded on pages that may not need it
- No resource hints (preconnect, prefetch, preload)
- No compression (gzip/brotli) configured on server
- No browser caching headers
- No lazy loading for below-fold content
- No Critical CSS extraction needed (CSS is already inline)
- No code splitting (pages are independent HTML files)
- Potential layout shift from dynamic content loading

### Page Sizes (Estimated)
- Most pages: 50-200KB HTML (inline CSS inflates size)
- Largest pages: dashboard/index.html may be large due to inline styles + JS

---

## Your Task

### 1. Core Web Vitals Optimization Plan

**LCP (Largest Contentful Paint) — Target: <2.5s**
- Identify likely LCP elements on each page type
- Server response time optimization (TTFB)
- Resource loading optimization
- Critical rendering path analysis
- Font loading strategy (currently system fonts — good)
- Image optimization for LCP
- Preload critical resources

**FID/INP (Interaction to Next Paint) — Target: <200ms**
- JavaScript optimization
- Event handler optimization
- Third-party script impact (Socket.io)
- Main thread optimization

**CLS (Cumulative Layout Shift) — Target: <0.1**
- Identify layout shift causes
- Set explicit dimensions on dynamic content
- Font loading CLS prevention
- Dynamic content injection best practices
- CSS containment

### 2. Server Configuration (Express.js)

**Compression middleware:**
```javascript
// Complete Express.js configuration for:
// - gzip/brotli compression
// - Static file caching
// - Security headers
// - ETags
```

Provide complete Express.js middleware configuration for:
- `compression` middleware (gzip + brotli)
- Static file caching headers (`Cache-Control`, `ETag`, `Last-Modified`)
- Different cache durations for different file types (HTML: short, CSS/JS: long, images: long)
- Security headers that also help performance (`X-Content-Type-Options`, `Strict-Transport-Security`)
- Preload headers (HTTP `Link` header for critical resources)

### 3. HTML Optimization

**For each page, provide optimization instructions:**

**HTML minification:**
- Should we minify HTML? (inline CSS makes this complex)
- Build script to minify if recommended
- Trade-offs (readability vs performance)

**Resource hints (add to `<head>`):**
```html
<!-- DNS prefetch for external domains -->
<link rel="dns-prefetch" href="//cdn.socket.io">

<!-- Preconnect for critical third parties -->
<link rel="preconnect" href="https://cdn.socket.io" crossorigin>

<!-- Preload critical resources -->
<link rel="preload" href="..." as="...">
```

List exact resource hints for each page type.

**Remove unused code:**
- Which pages load Socket.io but don't need it?
- Unused CSS analysis (are there shared styles that should be extracted?)
- Script optimization (defer/async placement)

### 4. CSS Optimization

Since all CSS is inline:
- **CSS reduction:** Identify commonly duplicated CSS across pages
- **Options:** Extract shared CSS to a cached external file vs keep inline
- Performance trade-off analysis (inline = no extra request, external = caching benefit)
- **CSS containment:** Add `contain` property for layout/paint isolation
- **will-change hints:** For animated elements

### 5. JavaScript Optimization

**Script loading strategy:**
- `defer` vs `async` for each script
- Module/nomodule pattern for modern browsers
- Third-party script loading (Socket.io on CDN)
- Service Worker for caching (should XActions have one?)

Provide the `<script>` tag configuration for each page type.

### 6. CDN Setup

**Should XActions use a CDN?**
- Cloudflare (free tier) — pros/cons
- Vercel Edge Network (if hosting on Vercel)
- Railway doesn't have built-in CDN
- Configuration for whichever you recommend
- Edge caching rules for HTML vs assets

### 7. Performance Monitoring

**Setup instructions for:**
- Google PageSpeed Insights CI check
- Lighthouse CI integration
- Real User Monitoring (RUM) — lightweight options
- Core Web Vitals measurement script (web-vitals library)
- Performance budget definition

Provide a **web-vitals integration script** that:
```javascript
// Reports CWV to console and optionally to analytics
import { onLCP, onFID, onCLS, onINP, onTTFB } from 'web-vitals';
```

### 8. Performance Budget

Define performance budgets:
| Metric | Target | Max Acceptable | Current (estimate) |
|--------|--------|---------------|-------------------|
| LCP | <1.5s | <2.5s | ? |
| FID/INP | <100ms | <200ms | ? |
| CLS | <0.05 | <0.1 | ? |
| TTFB | <200ms | <600ms | ? |
| Page size | <150KB | <300KB | ? |
| Requests | <10 | <20 | ? |

### 9. Mobile Optimization

- Touch target sizes (48x48px minimum)
- Font size (16px minimum, no zoom-on-focus)
- Viewport configuration
- Responsive images strategy
- Mobile-specific performance optimizations

### 10. Complete Optimization Script

Provide a **build script** (`scripts/optimize-site.js`) that:
- Minifies HTML files
- Adds resource hints
- Validates page sizes against budget
- Reports performance estimates

---

## Output Format

Provide complete, ready-to-implement code and configurations. Include Express.js middleware code, HTML modifications, build scripts, and monitoring setup. Prioritize recommendations by impact.
