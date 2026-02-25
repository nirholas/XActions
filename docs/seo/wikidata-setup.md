# Wikidata Setup Guide for XActions

> Step-by-step instructions to create a Wikidata item for XActions, the single most impactful action for triggering a Google Knowledge Panel.

---

## Why Wikidata?

- Google's Knowledge Graph **directly ingests** Wikidata
- A Wikidata item can trigger a Knowledge Panel even without a Wikipedia article
- It's **free**, takes **30 minutes**, and has **no notability requirement** (unlike Wikipedia)
- Once created, it becomes a permanent structured data source for search engines

---

## Prerequisites

1. Create a Wikidata account: https://www.wikidata.org/wiki/Special:CreateAccount
2. Read the basic editing guide: https://www.wikidata.org/wiki/Help:Editing
3. Have all XActions metadata ready (see below)

---

## Step 1: Create the Item

Go to: https://www.wikidata.org/wiki/Special:NewItem

Fill in:

| Field | Value |
|-------|-------|
| **Language** | en (English) |
| **Label** | XActions |
| **Description** | open-source X/Twitter automation toolkit |
| **Aliases** | xactions, X Actions, XActions CLI, XActions MCP |

Click **Create**.

---

## Step 2: Add Statements (Properties)

After creating the item, add these statements one by one. Click "add statement" for each.

### Core Identity

| Property | Value | Notes |
|----------|-------|-------|
| **instance of** (P31) | free and open-source software (Q341) | |
| **instance of** (P31) | software toolkit (Q131093) | Add second value |
| **official name** (P1448) | XActions | |
| **inception** (P571) | 2024 | Year project started |
| **developer** (P178) | Create item for "nich" if needed, or use text | |
| **programmed in** (P277) | JavaScript (Q2005) | |
| **platform** (P400) | Node.js (Q756100) | |
| **platform** (P400) | web browser (Q6368) | Add second value |
| **license** (P275) | MIT license (Q334661) | |

### Links & Identifiers

| Property | Value | Notes |
|----------|-------|-------|
| **official website** (P856) | https://xactions.app | |
| **source code repository URL** (P1324) | https://github.com/nirholas/XActions | |
| **npm package** (P8262) | xactions | |
| **GitHub topic** (P9100) | xactions | |

### Descriptive Properties

| Property | Value | Notes |
|----------|-------|-------|
| **use** (P366) | social media automation | Custom or find existing item |
| **use** (P366) | web scraping | Q190117 |
| **described at URL** (P973) | https://xactions.app/docs | |
| **image** (P18) | Upload XActions logo to Wikimedia Commons first | |

### Software-Specific

| Property | Value | Notes |
|----------|-------|-------|
| **software version identifier** (P348) | 3.1.0 | Current version |
| **operating system** (P306) | cross-platform (Q174666) | |
| **readable file format** (P1072) | JSON (Q2063) | If applicable |

---

## Step 3: Add Descriptions in Other Languages

Click "add" next to the language list and add descriptions in major languages:

| Language | Description |
|----------|-------------|
| **de** (German) | quelloffenes Automatisierungs-Toolkit für X/Twitter |
| **fr** (French) | boîte à outils d'automatisation X/Twitter open source |
| **es** (Spanish) | kit de herramientas de automatización de X/Twitter de código abierto |
| **pt** (Portuguese) | kit de ferramentas de automação X/Twitter de código aberto |
| **ja** (Japanese) | オープンソースのX/Twitter自動化ツールキット |
| **zh** (Chinese) | 开源X/Twitter自动化工具包 |
| **ko** (Korean) | 오픈소스 X/Twitter 자동화 도구킷 |

This helps Google understand XActions as an entity across languages.

---

## Step 4: Upload Logo to Wikimedia Commons

1. Go to: https://commons.wikimedia.org/wiki/Special:Upload
2. Upload the XActions logo (SVG preferred, PNG acceptable)
3. **Filename:** `XActions_logo.svg`
4. **Description:** `Logo of XActions, an open-source X/Twitter automation toolkit`
5. **License:** Select the appropriate free license (e.g., MIT, CC-BY-SA)
6. After upload, go back to the Wikidata item and add the image (P18) property

---

## Step 5: Link Back from Your Website

Add the Wikidata item URL to your website's JSON-LD. In the `Organization` or `SoftwareApplication` schema:

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "XActions",
  "sameAs": [
    "https://www.wikidata.org/wiki/Q_______",
    "https://github.com/nirholas/XActions",
    "https://x.com/nichxbt",
    "https://www.npmjs.com/package/xactions"
  ]
}
```

Replace `Q_______` with the actual Wikidata item ID after creation.

---

## Step 6: Verify & Monitor

### Verify the item is correct
- Visit your item page: `https://www.wikidata.org/wiki/Q_______`
- Check all statements are present and linked correctly
- Run the constraint checker: Click "Constraint report" in the sidebar

### Monitor indexing
- Google re-crawls Wikidata regularly (within days to weeks)
- Check Google's Knowledge Graph API (if you have access):
  ```
  https://kgsearch.googleapis.com/v1/entities:search?query=XActions&key=YOUR_API_KEY
  ```
- Search "XActions" on Google weekly to check for panel appearance

---

## Maintenance

- **Update version numbers** when new releases ship
- **Add new properties** as the project grows (e.g., awards, number of users)
- **Respond to edit suggestions** — other Wikidata editors may suggest changes
- **Keep consistent with website** — Wikidata and xactions.app should always agree

---

## Example Wikidata Items (For Reference)

Study these similar software project items to see what properties they use:

| Project | Wikidata ID | Stars |
|---------|------------|-------|
| n8n | Q110302679 | ~50k |
| Puppeteer | Q60784946 | ~90k |
| Express.js | Q5421965 | ~65k |
| Prisma | Q97052498 | ~40k |

Visit these items and use them as templates for XActions.

---

## FAQ

**Q: Can my Wikidata item be deleted?**
A: Unlike Wikipedia, Wikidata has no notability requirement. Items need only verifiability. As long as XActions exists as real software with a real website and repository, the item is valid.

**Q: How long until Google indexes it?**
A: Typically 1-4 weeks. Google continuously synchronizes with Wikidata.

**Q: Should I create a Wikidata item for "nich" (the author) too?**
A: Yes — if nich has notable enough credentials. This helps Google connect the entity graph: nich → created → XActions.

**Q: What if someone edits my item incorrectly?**
A: Add the item to your Wikidata watchlist. You'll be notified of any changes and can revert vandalism.
