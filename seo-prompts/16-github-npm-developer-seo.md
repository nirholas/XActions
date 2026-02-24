# Prompt 16: GitHub, NPM & Developer Platform SEO

> Paste this entire prompt into a new Claude Opus 4.6 chat.

---

## Context

I run **XActions** (https://xactions.app), a free, open-source X/Twitter automation toolkit. As an open-source project, GitHub and NPM are major traffic sources and ranking signals. I need to optimize my presence across all developer platforms.

### Current Presence
- **GitHub:** github.com/nirholas/xactions (main repo)
- **NPM:** npmjs.com/package/xactions (v3.0.42, `npm install xactions`)
- **MIT License**
- No presence on: PyPI, Docker Hub, VS Code Marketplace, Homebrew

### Repository Structure
- Well-documented README.md
- CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md
- AGENTS.md (AI agent instructions)
- docs/ folder with examples
- src/ with all source code
- Good package.json with description, homepage, repository fields

---

## Your Task

### 1. GitHub README SEO Optimization

GitHub README is indexed by Google. Optimize for search:

**Title/H1 area:**
- Keyword-rich project name and tagline
- Badges that signal quality (npm version, license, stars, downloads, build status)
- One-line description with primary keywords

**Content structure:**
- Table of contents (with jump links)
- Feature list with keyword-rich descriptions
- Installation commands (npm, yarn, pnpm)
- Quick start / Usage examples
- Screenshots/GIFs of features
- Comparison table (vs competitors)
- API reference section
- Contributing section
- License

**Keyword placement in README:**
- Which keywords to naturally include
- How many times to mention key terms
- Alt text for any images in README

Provide the **complete, optimized README.md content** (or the structural outline with exact H2/H3 headings and keyword recommendations per section).

### 2. GitHub Repository Settings

Optimize these GitHub-specific SEO factors:

**Repository metadata:**
- Description (short, keyword-rich, 350 char max)
- Website URL
- Topics/Tags (GitHub allows up to 20)
  - List the 20 optimal topics (e.g., `twitter`, `automation`, `scraper`, `mcp`, `cli`, `open-source`, etc.)

**GitHub-specific files:**
- `.github/FUNDING.yml` — sponsor button
- `.github/ISSUE_TEMPLATE/` — bug, feature, question templates
- `.github/PULL_REQUEST_TEMPLATE.md`
- `.github/DISCUSSION_CATEGORIES` — enable discussions

**Repository features to enable:**
- Discussions (for community + indexable content)
- Wiki (for additional indexed content)
- Projects (for roadmap visibility)
- Releases (for changelog indexing)

### 3. NPM Package Optimization

**package.json SEO fields:**
```json
{
  "name": "xactions",
  "description": "...",  // Optimize this
  "keywords": [...],     // Optimize this (npm supports keywords)
  "homepage": "...",
  "repository": "...",
  "bugs": "...",
  "author": "..."
}
```

Provide the optimized values for each field.

**NPM README:** (can differ from GitHub README)
- What should the npm README emphasize?
- Installation-focused, developer-focused
- Quick code examples
- Link back to full docs at xactions.app

**NPM Keywords:** List 15-20 optimal keywords for npm discoverability

### 4. GitHub Releases / Changelog SEO

**Release notes optimization:**
- How to structure release notes for Google indexing
- Keyword placement in release titles
- Changelog format (Keep a Changelog)
- Tag naming convention (v3.0.x)

### 5. GitHub Discussions as SEO Content

**Strategy for using GitHub Discussions as indexed content:**
- Discussion categories to create
- Seed discussions with common questions (these get indexed!)
- How to make discussions rank for long-tail keywords
- Moderation strategy
- Template for starting discussions

List **20 discussion topics** to create that target keywords:
| Discussion Title | Target Keyword | Category |

### 6. Additional Developer Platforms

**Docker Hub:**
- Should XActions have a Docker image?
- Dockerfile + Docker Hub listing optimization
- Description, tags, README for Docker Hub

**VS Code Extension Marketplace:**
- Could XActions benefit from a VS Code extension? (MCP server config, etc.)
- Marketplace listing optimization

**Homebrew:**
- Should XActions be available via Homebrew?
- Formula creation

**Other platforms:**
- awesome-selfhosted inclusion
- awesome-nodejs inclusion
- Other awesome-* lists
- Dev.to series / Hashnode blog
- Stack Overflow tag creation strategy

### 7. GitHub Social Proof Optimization

**Star growth strategies:**
- How to ethically grow GitHub stars
- Star history badge
- "Star us on GitHub" CTAs on the website

**Contributor growth:**
- Good first issues strategy
- Hacktoberfest participation
- Contributor wall/recognition

**Community metrics:**
- Used-by badge
- Download counts
- Fork/star ratios as social proof

### 8. Cross-Platform Linking

How all platforms should link to each other:
- GitHub README → xactions.app, npm
- NPM README → xactions.app, GitHub
- xactions.app → GitHub, npm
- All pages → consistent social profiles

---

## Output Format

1. Complete optimized GitHub description + 20 topics
2. README.md structure with keyword recommendations
3. Optimized package.json fields
4. npm keyword list
5. 20 GitHub Discussion topics
6. Developer platform expansion plan
7. Cross-platform linking checklist
