# SEO & Knowledge Panel Documentation

> Complete guide to getting XActions recognized as an entity in Google's Knowledge Graph and optimizing search visibility.

---

## Documents

| Document | Description | Priority |
|----------|-------------|----------|
| [knowledge-panel.md](knowledge-panel.md) | Master roadmap for Google Knowledge Panel | Start here |
| [wikidata-setup.md](wikidata-setup.md) | Step-by-step Wikidata item creation | Do first |
| [structured-data.md](structured-data.md) | JSON-LD schema reference for all pages | Reference |
| [platform-listings.md](platform-listings.md) | Platform listing checklist with URLs | Week 1-2 |
| [press-strategy.md](press-strategy.md) | Press outreach and coverage strategy | Ongoing |
| [seo-audit.md](seo-audit.md) | Technical SEO checklist | Monthly |

---

## Quick Start

1. **Read** [knowledge-panel.md](knowledge-panel.md) for the full strategy
2. **Create a Wikidata item** following [wikidata-setup.md](wikidata-setup.md) — highest ROI action
3. **Validate structured data** using [structured-data.md](structured-data.md) as reference
4. **Work through platform listings** in [platform-listings.md](platform-listings.md)
5. **Start press outreach** using templates in [press-strategy.md](press-strategy.md)
6. **Run the SEO audit** checklist in [seo-audit.md](seo-audit.md) monthly

---

## What Was Already Done

The following JSON-LD structured data has been upgraded on the live site:

### site/index.html
- `SoftwareApplication` — Added `alternateName`, `softwareVersion`, `datePublished`, `dateModified`, `license`, `isAccessibleForFree`, `codeRepository`, `programmingLanguage`, `runtimePlatform`, `downloadUrl`, `installUrl`, `screenshot`, `featureList`, `sameAs`, `publisher` with logo
- `WebSite` — Added `inLanguage`, publisher `logo` and `sameAs` array

### dashboard/about.html
- `Organization` — Added `alternateName`, `foundingDate`, `contactPoint`, `knowsAbout`, founder `alternateName` and `sameAs`, npm to `sameAs` array, logo as `ImageObject` with dimensions

### dashboard/index.html
- `WebApplication` — Added `browserRequirements`, `isAccessibleForFree`, `author` as Organization with `sameAs` array

---

## After Wikidata Item Creation

Once you create the Wikidata item and get the `Q_______` ID, update these files:

1. **site/index.html** — Add Wikidata URL to `SoftwareApplication.sameAs`
2. **dashboard/about.html** — Add Wikidata URL to `Organization.sameAs`
3. **docs/seo/structured-data.md** — Replace all `Q_______` placeholders

Search for `Q_______` in the codebase to find all placeholders.
