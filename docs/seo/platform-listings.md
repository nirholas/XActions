# Platform Listings Checklist for XActions

> Every platform where XActions should be listed to build entity recognition signals for Google Knowledge Graph.

---

## Priority Tier 1: Must-Have (Do This Week)

### Wikidata
- **URL:** https://www.wikidata.org/wiki/Special:NewItem
- **Status:** [ ] Not started
- **Details:** See [wikidata-setup.md](wikidata-setup.md)
- **Impact:** Highest — Google reads Wikidata directly
- **Time:** 30 minutes

### npm
- **URL:** https://www.npmjs.com/package/xactions
- **Status:** [x] Already published
- **Optimize:**
  - [ ] Ensure `description` in package.json is keyword-rich
  - [ ] Add all relevant `keywords`
  - [ ] Set `homepage` to https://xactions.app
  - [ ] Add `repository` URL
  - [ ] Verify README renders correctly on npm

### GitHub
- **URL:** https://github.com/nirholas/XActions
- **Status:** [x] Already live
- **Optimize:**
  - [ ] Add up to 20 topics (Settings → Topics)
  - [ ] Set description: "⚡ The Complete X/Twitter Automation Toolkit — Scrapers, MCP server for AI agents, CLI, browser scripts. No API fees."
  - [ ] Upload social preview image (1280×640px) at Settings → Social preview
  - [ ] Verify LICENSE file renders properly (should show "MIT")
  - [ ] Pin important discussions/issues
  - [ ] Add "Releases" with detailed changelogs

### Product Hunt
- **URL:** https://www.producthunt.com/posts/new
- **Status:** [ ] Not started
- **Listing details:**
  - Name: XActions
  - Tagline: "Free X/Twitter automation — scrapers, MCP server, CLI. No API fees."
  - Description: Full feature breakdown with screenshots
  - Topics: Developer Tools, Twitter, Automation, Open Source, AI
  - Makers: nich (@nichxbt)
- **Tips:**
  - Launch on Tuesday or Wednesday morning (PT)
  - Have 10+ people ready to upvote in first hour
  - Respond to every comment
  - Cross-promote from X/Twitter

### AlternativeTo
- **URL:** https://alternativeto.net/software/submit/
- **Status:** [ ] Not started
- **List as alternative to:**
  - Twitter API
  - Crowdfire
  - Hypefury
  - Tweethunter
  - Typefully
  - Buffer
  - Hootsuite
  - TweetDeck
  - Tweepy
- **Tags:** Twitter, Automation, Open Source, Free, Developer Tools

---

## Priority Tier 2: High Impact (Week 2)

### Crunchbase
- **URL:** https://www.crunchbase.com/add-new
- **Status:** [ ] Not started
- **Profile type:** Product (or Organization)
- **Details:**
  - Name: XActions
  - Founded: 2024
  - Category: Developer Tools, Social Media
  - Description: Full description
  - Website: https://xactions.app
  - GitHub: https://github.com/nirholas/XActions
- **Impact:** Google uses Crunchbase as an authoritative source

### StackShare
- **URL:** https://stackshare.io/
- **Status:** [ ] Not started
- **Category:** Developer Tools → Social Media Tools
- **Stack:** Node.js, Express, Prisma, Puppeteer, Redis

### LibHunt / awesome lists aggregator
- **URL:** https://js.libhunt.com/
- **Status:** [ ] Not started
- **Also submit to:** https://nodejs.libhunt.com/

### MCP Server Directories
- **awesome-mcp-servers repos:**
  - [ ] https://github.com/punkpeye/awesome-mcp-servers (30k+ stars)
  - [ ] https://github.com/wong2/awesome-mcp-servers
  - [ ] https://github.com/appcypher/awesome-mcp-servers
  - Submit PR adding XActions under "Social Media" or "Twitter" category
- **mcp.so:** https://mcp.so — Submit XActions MCP server
- **Glama MCP Directory:** https://glama.ai/mcp/servers
- **Smithery:** https://smithery.ai — MCP server registry

### Awesome GitHub Lists
Submit PRs to these repositories:
- [ ] `awesome-twitter-tools` or `awesome-twitter`
- [ ] `awesome-web-scraping`
- [ ] `awesome-automation`
- [ ] `awesome-social-media`
- [ ] `awesome-puppeteer`
- [ ] `awesome-nodejs`
- [ ] `awesome-cli-apps`
- [ ] `awesome-mcp-servers`
- [ ] `awesome-open-source`

---

## Priority Tier 3: Additional Visibility (Week 3-4)

### LinkedIn Company Page
- **URL:** https://www.linkedin.com/company/setup/new/
- **Status:** [ ] Not started
- **Details:**
  - Name: XActions
  - Industry: Software Development
  - Type: Open Source Project
  - Website: https://xactions.app
  - Description: Same canonical description

### Dev.to Organization
- **URL:** https://dev.to/settings/organization
- **Status:** [ ] Not started
- **Purpose:** Publish articles under XActions brand

### Hashnode Blog
- **URL:** https://hashnode.com/
- **Status:** [ ] Not started
- **Purpose:** Cross-post articles with canonical URL pointing to xactions.app

### Open Source Directories
- [ ] **Open Source Initiative:** https://opensource.org/
- [ ] **OSS Insight:** https://ossinsight.io/ (auto-indexes from GitHub)
- [ ] **Open Hub:** https://www.openhub.net/
- [ ] **Liberapay:** https://liberapay.com/ (if accepting donations)

### Developer Tool Directories
- [ ] **DevHunt:** https://devhunt.org/
- [ ] **SaaSHub:** https://www.saashub.com/
- [ ] **ToolJet Marketplace** (if applicable)
- [ ] **Raycast Store** (if extension exists)

### Social Profiles
- [ ] **X/Twitter:** @nichxbt (already exists) — verify bio mentions XActions
- [ ] **Discord/Telegram:** Create community if none exists
- [ ] **YouTube:** Channel for demo videos and tutorials

---

## Listing Copy Templates

### Short Description (1 line)
```
Free, open-source X/Twitter automation toolkit — scrapers, MCP server for AI agents, CLI, browser scripts. No API fees.
```

### Medium Description (2-3 lines)
```
XActions is a free, open-source X/Twitter automation toolkit. Mass unfollow non-followers, scrape profiles, auto-engage, monitor accounts, and download videos. Includes an MCP server for AI agents (Claude, GPT), a CLI, and browser scripts. No API fees — runs directly in your browser or Node.js.
```

### Full Description (paragraph)
```
XActions is the complete X/Twitter automation platform — 100% free and open-source. Built for developers, growth hackers, and AI agents.

Features include: mass unfollow non-followers, profile/follower/tweet scraping, auto-liker, auto-commenter, keyword-based auto-follow, account monitoring, video downloader, social graph analysis, thread composer, and more.

XActions includes an MCP (Model Context Protocol) server with 20+ tools, making it compatible with Claude Desktop, GPT-4, Cursor, and other AI agents. The CLI tool (`xactions`) provides all features from the terminal.

No Twitter API required — XActions uses browser automation, so there are no API fees, no developer account needed, and no monthly charges. Scripts run locally in your browser; your credentials never leave your device.

Tech stack: Node.js, Express, Prisma, Puppeteer, Redis. MIT licensed.
```

---

## Tracking Sheet

After listing, track the status:

| Platform | Submitted | Approved | URL | Date |
|----------|-----------|----------|-----|------|
| Wikidata | [ ] | [ ] | | |
| npm | [x] | [x] | npmjs.com/package/xactions | |
| GitHub | [x] | [x] | github.com/nirholas/XActions | |
| Product Hunt | [ ] | [ ] | | |
| AlternativeTo | [ ] | [ ] | | |
| Crunchbase | [ ] | [ ] | | |
| StackShare | [ ] | [ ] | | |
| awesome-mcp-servers | [ ] | [ ] | | |
| mcp.so | [ ] | [ ] | | |
| LinkedIn | [ ] | [ ] | | |
| Dev.to | [ ] | [ ] | | |
| Open Hub | [ ] | [ ] | | |
| DevHunt | [ ] | [ ] | | |
| SaaSHub | [ ] | [ ] | | |

---

## Key Principle

**Consistency is everything.** Use the exact same:
- Name: **XActions**
- URL: **https://xactions.app**
- Description: Same canonical description (short or medium from above)
- Author: **nich (@nichxbt)**

Google connects entities by matching consistent information across multiple authoritative sources. Inconsistency (e.g., "xActions" vs "XActions" vs "X-Actions") weakens the signal.
