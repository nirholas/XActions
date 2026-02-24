# Prompt 13: Heading Hierarchy & Content Structure — Semantic HTML for SEO

> Paste this entire prompt into a new Claude Opus 4.6 chat.

---

## Context

I run **XActions** (https://xactions.app), a free, open-source X/Twitter automation toolkit with ~20 existing HTML pages and 100+ planned pages. I need to ensure every page has proper heading hierarchy and semantic HTML structure for maximum SEO value.

### Why This Matters
- Google uses heading hierarchy to understand page structure and topics
- Proper H1-H6 structure improves featured snippet eligibility
- Semantic HTML helps crawlers and screen readers
- Content structure affects time-on-page and user engagement

---

## Your Task

### 1. Heading Hierarchy Audit

For each existing page type, provide the **ideal heading structure**:

**Homepage (`/`):**
```
H1: [one per page - main value proposition]
  H2: [section 1]
    H3: [sub-section]
  H2: [section 2]
    H3: [sub-section]
  H2: [FAQ section]
    H3: [individual questions]
  H2: [CTA section]
```

Do this for:
- Homepage
- Features page
- Pricing page
- Documentation page
- Tutorial hub
- Tutorial sub-page
- Tool page (individual feature page)
- AI/MCP pages
- Blog post (article)
- Comparison page
- FAQ page
- About page

**For each, specify:**
- Exact H1 text (keyword-optimized, unique per page)
- All H2 sections with recommended text
- H3 sub-sections where needed
- Which keywords to include at each heading level
- Maximum heading depth (H3 is usually sufficient)

### 2. Semantic HTML Structure

For each page type, provide the semantic HTML skeleton:

```html
<body>
  <header role="banner">
    <nav aria-label="Main navigation">...</nav>
  </header>
  
  <nav aria-label="Breadcrumb">
    <ol itemscope itemtype="https://schema.org/BreadcrumbList">...</ol>
  </nav>
  
  <main id="main-content">
    <article>
      <header>
        <h1>...</h1>
        <p class="subtitle">...</p>
        <time datetime="2026-02-24">Last updated: Feb 24, 2026</time>
      </header>
      
      <nav aria-label="Table of contents">...</nav>
      
      <section id="section-1">
        <h2>...</h2>
        <p>...</p>
      </section>
      
      <section id="faq" itemscope itemtype="https://schema.org/FAQPage">
        <h2>Frequently Asked Questions</h2>
        ...
      </section>
      
      <aside>
        <h2>Related Tools</h2>
        ...
      </aside>
    </article>
  </main>
  
  <footer role="contentinfo">...</footer>
</body>
```

Provide this skeleton for each page type (product page, tool page, tutorial, blog post, comparison, FAQ page).

### 3. Content Formatting Best Practices

Define rules for content formatting that benefits SEO:

**Paragraph structure:**
- Maximum paragraph length (how many sentences before breaking?)
- When to use bullet lists vs numbered lists vs prose
- Bold/strong tags for key terms (and keyword placement)
- When to use `<mark>`, `<blockquote>`, `<code>`, `<pre>`

**Visual content markers:**
- When to add images (every N words?)
- When to add tables
- When to add code blocks
- When to add video embeds
- Alt text patterns

**Content hierarchy signals:**
- Table of contents: when to include (>1000 words?)
- Jump links / anchor links
- "Key Takeaway" boxes
- "TL;DR" sections
- Summary boxes at top of long articles

### 4. Accessibility + SEO Overlap

Provide accessibility practices that also benefit SEO:
- ARIA landmarks
- Skip navigation links
- Alt text requirements
- Link text best practices (no "click here")
- Color contrast (already good with dark theme)
- Focus management
- Screen reader optimization

### 5. Content Templates

For each page type, provide a **content structure template** with:
- Word count targets per section
- Keyword placement guides (where to place primary/secondary keywords)
- CTA placement (where in the content flow)
- Internal link placement (where to embed contextual links)
- FAQ placement (end of article before footer)

---

## Output Format

Provide the heading structure and semantic HTML as code blocks for each page type. Include specific keyword recommendations for headings. This should be a developer-ready reference guide that anyone creating a new page can follow.
