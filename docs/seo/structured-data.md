# Structured Data Reference for XActions

> Complete JSON-LD schema markup reference for all XActions web pages. These schemas help Google understand XActions as an entity and trigger rich results.

---

## Overview

XActions uses [Schema.org](https://schema.org) JSON-LD structured data to communicate entity information to search engines. This document defines the canonical schemas used across the site.

**Validation tools:**
- Google Rich Results Test: https://search.google.com/test/rich-results
- Schema Markup Validator: https://validator.schema.org/
- Google Search Console → Enhancements

---

## 1. Organization Schema (about.html, footer-global)

This is the **most important schema for Knowledge Panel eligibility**. It defines XActions as an entity with connected profiles.

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "XActions",
  "alternateName": ["xactions", "X Actions"],
  "description": "Free, open-source X/Twitter automation toolkit — scrapers, MCP server for AI agents, CLI, and browser scripts. No API fees.",
  "url": "https://xactions.app",
  "logo": {
    "@type": "ImageObject",
    "url": "https://xactions.app/logo.png",
    "width": 512,
    "height": 512
  },
  "foundingDate": "2024",
  "founder": {
    "@type": "Person",
    "name": "nich",
    "alternateName": "nichxbt",
    "url": "https://x.com/nichxbt",
    "sameAs": [
      "https://github.com/nirholas",
      "https://x.com/nichxbt"
    ]
  },
  "sameAs": [
    "https://github.com/nirholas/XActions",
    "https://x.com/nichxbt",
    "https://www.npmjs.com/package/xactions",
    "https://www.wikidata.org/wiki/Q_______"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "url": "https://xactions.app/contact",
    "contactType": "customer support"
  },
  "knowsAbout": [
    "X/Twitter automation",
    "social media scraping",
    "MCP servers",
    "browser automation",
    "AI agents"
  ]
}
```

> **Action required:** Replace `Q_______` with the actual Wikidata item ID after creation.

---

## 2. SoftwareApplication Schema (site/index.html)

Defines XActions as a software product with rich metadata that Google can display in search results.

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "XActions",
  "alternateName": ["xactions", "X Actions"],
  "description": "Free, open-source AI-powered X/Twitter automation tools with LLM integration. Compatible with GPT, Claude, and MCP servers for intelligent mass unfollow, auto-engagement, scraping, and growth.",
  "url": "https://xactions.app",
  "applicationCategory": "DeveloperApplication",
  "operatingSystem": "Web Browser, Node.js, CLI",
  "softwareVersion": "3.1.0",
  "datePublished": "2024-01-01",
  "dateModified": "2026-02-25",
  "license": "https://opensource.org/licenses/MIT",
  "isAccessibleForFree": true,
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD",
    "availability": "https://schema.org/InStock"
  },
  "author": {
    "@type": "Person",
    "name": "nich",
    "alternateName": "nichxbt",
    "url": "https://x.com/nichxbt"
  },
  "publisher": {
    "@type": "Organization",
    "name": "XActions",
    "url": "https://xactions.app"
  },
  "codeRepository": "https://github.com/nirholas/XActions",
  "programmingLanguage": "JavaScript",
  "runtimePlatform": "Node.js",
  "downloadUrl": "https://www.npmjs.com/package/xactions",
  "installUrl": "https://www.npmjs.com/package/xactions",
  "screenshot": "https://xactions.app/og-home.png",
  "featureList": [
    "Mass unfollow non-followers",
    "X/Twitter profile scraping",
    "MCP server for AI agents (Claude, GPT)",
    "CLI tool",
    "Browser automation scripts",
    "Auto-liker and auto-commenter",
    "Keyword-based auto-follow",
    "Account monitoring",
    "Video downloader",
    "Social graph analysis"
  ],
  "sameAs": [
    "https://github.com/nirholas/XActions",
    "https://www.npmjs.com/package/xactions",
    "https://www.wikidata.org/wiki/Q_______"
  ]
}
```

---

## 3. WebSite Schema (site/index.html)

Enables Google Sitelinks Search Box and defines the publisher entity.

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "XActions",
  "url": "https://xactions.app",
  "description": "Free AI-powered X/Twitter automation tools — mass unfollow, scrapers, MCP server, CLI",
  "inLanguage": "en",
  "publisher": {
    "@type": "Organization",
    "name": "XActions",
    "url": "https://xactions.app",
    "logo": {
      "@type": "ImageObject",
      "url": "https://xactions.app/logo.png"
    }
  },
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://xactions.app/features?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
}
```

---

## 4. WebApplication Schema (dashboard/index.html)

For the dashboard SPA.

```json
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "XActions Dashboard",
  "description": "AI-powered X/Twitter automation control center with LLM integration. Compatible with GPT, Claude, MCP servers.",
  "url": "https://xactions.app/dashboard",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web Browser",
  "browserRequirements": "Requires JavaScript. Works in Chrome, Firefox, Safari, Edge.",
  "isAccessibleForFree": true,
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "author": {
    "@type": "Organization",
    "name": "XActions",
    "url": "https://xactions.app"
  }
}
```

---

## 5. FAQPage Schema (site/index.html, faq.html)

Targets Google's "People Also Ask" and Featured Snippets.

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Is XActions free?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes! XActions is 100% free and open-source. All browser scripts, the CLI, and the dashboard are free with no API fees."
      }
    },
    {
      "@type": "Question",
      "name": "How do I mass unfollow on Twitter/X?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Open x.com in your browser, press F12 to open DevTools, paste the XActions unfollow script into the console, and press Enter. It will automatically unfollow accounts that don't follow you back."
      }
    },
    {
      "@type": "Question",
      "name": "Does XActions require the Twitter API?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No. XActions uses browser automation — scripts run directly in your browser on x.com. No API keys, no developer account, no monthly fees."
      }
    },
    {
      "@type": "Question",
      "name": "What is the XActions MCP server?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The MCP server lets AI agents like Claude, GPT-4, and Cursor automate X/Twitter actions. It provides 20+ tools for scraping, posting, unfollowing, and monitoring."
      }
    },
    {
      "@type": "Question",
      "name": "Is XActions safe to use?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. XActions is open-source (MIT license). Scripts run locally in your browser — your credentials never leave your device. Built-in rate limiting prevents account issues."
      }
    }
  ]
}
```

---

## 6. BreadcrumbList Schema (all subpages)

Used on every subpage to define hierarchy. Example for `/about`:

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://xactions.app"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "About",
      "item": "https://xactions.app/about"
    }
  ]
}
```

---

## 7. Article / BlogPosting Schema (blog posts)

For blog content:

```json
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "How to Mass Unfollow on Twitter in 2026",
  "description": "Step-by-step guide to mass unfollow non-followers on X/Twitter using XActions.",
  "url": "https://xactions.app/blog/how-to-mass-unfollow-twitter",
  "datePublished": "2025-01-15",
  "dateModified": "2026-02-25",
  "author": {
    "@type": "Person",
    "name": "nich",
    "url": "https://x.com/nichxbt"
  },
  "publisher": {
    "@type": "Organization",
    "name": "XActions",
    "url": "https://xactions.app",
    "logo": {
      "@type": "ImageObject",
      "url": "https://xactions.app/logo.png"
    }
  },
  "image": "https://xactions.app/og-blog-unfollow.png",
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://xactions.app/blog/how-to-mass-unfollow-twitter"
  }
}
```

---

## Validation Checklist

After updating any page, validate with:

1. **Google Rich Results Test** — https://search.google.com/test/rich-results
   - Enter the page URL
   - Confirm all schemas are detected and valid
   - Fix any warnings or errors

2. **Schema Markup Validator** — https://validator.schema.org/
   - Paste the JSON-LD directly
   - Confirm no unknown properties

3. **Google Search Console** — https://search.google.com/search-console
   - Check Enhancements → Unparsable structured data
   - Monitor for new rich result types appearing

---

## Implementation Notes

- All JSON-LD goes in `<script type="application/ld+json">` tags in `<head>`
- Multiple JSON-LD blocks per page are fine (and recommended)
- Keep `sameAs` arrays consistent across all schemas
- Update `softwareVersion` and `dateModified` with each release
- The `Q_______` Wikidata placeholder must be replaced once the item is created
