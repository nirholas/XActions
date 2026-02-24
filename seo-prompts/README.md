# SEO Prompt Suite for XActions

> 20 comprehensive prompts designed to be pasted into individual Claude Opus 4.6 chat sessions.  
> Each prompt is self-contained with full context about XActions so the AI can produce actionable output.

## Execution Order

### Phase 1 — Technical Foundation (Do First)
| # | File | Purpose | Est. Time |
|---|------|---------|-----------|
| 01 | `01-technical-seo-audit-fixes.md` | robots.txt, sitemap.xml, meta tags, canonicals | 30 min |
| 02 | `02-schema-structured-data.md` | JSON-LD for every page type | 45 min |
| 03 | `03-on-page-seo-fixes.md` | Fix all under-optimized pages | 45 min |

### Phase 2 — Keyword & Content Strategy
| # | File | Purpose | Est. Time |
|---|------|---------|-----------|
| 04 | `04-keyword-research-mapping.md` | Full keyword map for every page + gaps | 60 min |
| 05 | `05-competitor-seo-analysis.md` | Reverse-engineer competitor SEO | 45 min |
| 06 | `06-content-gap-analysis.md` | Find missing content opportunities | 45 min |

### Phase 3 — Content Expansion (Biggest ROI)
| # | File | Purpose | Est. Time |
|---|------|---------|-----------|
| 07 | `07-docs-to-seo-pages.md` | Convert 43 docs → indexable HTML pages | 90 min |
| 08 | `08-programmatic-seo-pages.md` | Auto-generate long-tail keyword pages | 60 min |
| 09 | `09-blog-content-strategy.md` | Topic clusters, editorial calendar | 60 min |
| 10 | `10-faq-pages-strategy.md` | FAQ pages with schema for featured snippets | 45 min |

### Phase 4 — On-Site Optimization
| # | File | Purpose | Est. Time |
|---|------|---------|-----------|
| 11 | `11-internal-linking-strategy.md` | Silo architecture, cross-linking plan | 45 min |
| 12 | `12-title-meta-description-optimization.md` | CTR-optimized titles & descriptions | 30 min |
| 13 | `13-heading-hierarchy-content-structure.md` | H1-H6 structure, content formatting | 30 min |
| 14 | `14-image-seo-og-images.md` | OG images, alt text, image optimization | 45 min |

### Phase 5 — Off-Site & Distribution
| # | File | Purpose | Est. Time |
|---|------|---------|-----------|
| 15 | `15-link-building-strategy.md` | Backlink acquisition plan | 45 min |
| 16 | `16-github-npm-developer-seo.md` | GitHub README SEO, npm listing, dev communities | 30 min |
| 17 | `17-social-seo-distribution.md` | Twitter/X, Reddit, HN, Product Hunt optimization | 30 min |

### Phase 6 — Advanced & Monitoring
| # | File | Purpose | Est. Time |
|---|------|---------|-----------|
| 18 | `18-ai-search-optimization-geo.md` | Optimize for ChatGPT, Perplexity, AI Overviews | 60 min |
| 19 | `19-performance-core-web-vitals.md` | Page speed, CWV, mobile optimization | 45 min |
| 20 | `20-analytics-monitoring-setup.md` | GSC, GA4, rank tracking, dashboards | 30 min |

## How to Use

1. Open a **new** Claude Opus 4.6 chat
2. Paste the entire contents of the prompt file
3. Let the AI generate the full output
4. Implement the recommendations
5. Move to the next prompt

## Site Context (shared across all prompts)

- **Domain:** xactions.app
- **Pages:** ~20 HTML pages (dashboard/, site/, tutorials/)
- **Docs:** 43 feature docs in docs/examples/ + 8 reference docs
- **Skills:** 27 skill category knowledge bases in skills/
- **Tech stack:** Static HTML, no SSR/SSG framework, Express.js API backend
- **Author:** nich (@nichxbt)
- **GitHub:** github.com/nirholas/xactions
