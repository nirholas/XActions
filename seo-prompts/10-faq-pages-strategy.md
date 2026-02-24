# Prompt 10: FAQ Pages & Featured Snippets Strategy

> Paste this entire prompt into a new Claude Opus 4.6 chat.

---

## Context

I run **XActions** (https://xactions.app), a free, open-source X/Twitter automation toolkit. I want to dominate Google's "People Also Ask" boxes and Featured Snippets for Twitter automation queries. FAQ content with proper schema markup is the fastest path to this.

### About XActions
- Free, open-source X/Twitter automation (mass unfollow, auto-liker, scrapers, video downloader, MCP server, CLI, browser scripts)
- Domain: xactions.app
- Author: nich (@nichxbt)

### Current FAQ Coverage
- Only `dashboard/ai.html` has `FAQPage` schema (the only page with FAQ rich results potential)
- No other pages have FAQ sections or schema
- No dedicated FAQ page exists

---

## Your Task

### 1. Comprehensive FAQ Page

Create a **dedicated FAQ page** (`/faq`) with 50+ questions organized by category:

**Categories:**
- Getting Started (5-8 questions)
- Mass Unfollow & Account Management (8-10 questions)
- Scrapers & Data Export (8-10 questions)
- Automation Features (6-8 questions)
- AI Integration & MCP Server (6-8 questions)
- CLI & Developer Tools (5-7 questions)
- Privacy & Security (4-6 questions)
- Pricing & Free vs Paid (4-6 questions)
- Troubleshooting (5-7 questions)

**For each question, provide:**
- The question (phrased as people actually search it)
- A concise, direct answer (40-80 words — Google snippet-friendly length)
- An expanded answer (150-300 words — for the page content)
- Target keyword(s) the question addresses
- "People Also Ask" tag (is this a likely PAA question? yes/no)

### 2. Page-Level FAQ Sections

For each of these pages, generate 4-6 FAQ questions with answers to add to the page:

1. **Homepage** — General XActions questions
2. **Features page** — "What features does XActions have?", "Is it free?", etc.
3. **Pricing page** — Pricing FAQs
4. **Documentation page** — Developer-focused FAQs
5. **Each tutorial sub-page** (7 pages) — Topic-specific FAQs
6. **MCP Server page** — AI/MCP-specific FAQs
7. **AI API page** — API-specific FAQs
8. **Run page** — Usage FAQs
9. **Each tool page** (10 pages from Prompt 07) — Feature-specific FAQs

### 3. FAQPage Schema for Every Page

For each page above, generate the complete `FAQPage` JSON-LD schema:

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "...",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "..."
      }
    }
  ]
}
```

### 4. Featured Snippet Optimization

Identify the **top 30 featured snippet opportunities** for XActions:

For each:
| Query | Current Snippet Format | Our Snippet Content | Target Page | Snippet Type (paragraph/list/table) |

**Snippet types to target:**
- **Paragraph snippets** — definition-style questions ("What is Twitter automation?")
- **List snippets** — step-by-step questions ("How to mass unfollow on Twitter")
- **Table snippets** — comparison questions ("Twitter automation tools comparison")

For each, provide the **exact content** formatted to win the snippet:
- Paragraph: 40-60 word direct answer
- List: numbered steps (5-8 items)
- Table: comparison data in HTML table format

### 5. "People Also Ask" Domination Strategy

Map out the PAA cascade for top queries:

**Query: "mass unfollow twitter"**
- PAA 1: "How do I mass unfollow on Twitter?"
- PAA 2: "Is there a way to unfollow everyone on Twitter at once?"
- PAA 3: "Can you get banned for mass unfollowing on Twitter?"
- PAA 4: "What is the best Twitter unfollow tool?"
(provide answers for all)

Do this for 10 high-value seed queries:
1. "mass unfollow twitter"
2. "twitter automation tool"
3. "download twitter video"
4. "who unfollowed me twitter"
5. "twitter scraper"
6. "twitter api alternative"
7. "auto like twitter"
8. "leave twitter communities"
9. "export twitter bookmarks"
10. "mcp server twitter"

### 6. FAQ HTML Component

Create a reusable HTML/CSS **FAQ accordion component** that:
- Matches XActions dark theme
- Uses semantic HTML (`<details>` / `<summary>` or accessible accordion)
- Is mobile-friendly
- Has smooth open/close animation
- Includes the JSON-LD schema automatically
- Can be dropped into any page

### 7. FAQ Maintenance Plan

- How often should FAQs be reviewed/updated?
- How to identify new questions to add (Google Search Console query data)
- How to track which FAQs generate featured snippets
- A/B testing FAQ formats

---

## Output Format

1. Complete FAQ page HTML (production-ready, 50+ questions)
2. FAQ sections + JSON-LD for each of the ~20 pages listed
3. Featured snippet content for 30 queries
4. PAA cascade answers for 10 queries
5. Reusable FAQ accordion component (HTML + CSS + JS)
6. Summary table of all FAQ questions mapped to pages

Every FAQ answer should be written to win featured snippets — direct, authoritative, concise first sentence followed by detail.
