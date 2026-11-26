# 07: docs organised by how people use XActions

Read `prompts/dx/00-README.md` first. Wave 2. Needs 06 merged.

## Goal

A reader who arrives with one way of using XActions in mind finds everything for it in
one folder, each topic has one page, and internal working papers are out of the user
docs.

## Why

`docs/` has about 90 files in one flat folder (`ls docs | wc -l`).

- Near-duplicates: `graph.md`, `graph-system.md`, `social-graph.md`; `scraping.md`,
  `scrapers.md`, `scraping-infrastructure.md`, `stealth-scraping.md`; `scheduler.md`,
  `scheduling.md`; `streaming.md`, `streams.md`; `extension.md`, `browser-extension.md`,
  `extension-api.md`; `agents.md`, `agent-system.md` and five more `agent-*.md`;
  `api-reference.md`, `rest-api.md`.
- Internal material sits beside user docs: `GROWTH_STRATEGY.md`, `seo/`,
  `seo-articles/` (57 files), `launch/`, `pr-reviews/`, `research/`, `audits/`.
- The 2026-08-27 audit lists both as still open.

Another agent had uncommitted edits in `docs/` on 2026-11-26, and `docs/x-api/` is
someone else's work in progress. Re-read before editing; leave `docs/x-api/` alone.

## Do

1. **Map first.** For every file in `docs/`: what it covers, who links to it (other
   docs, README, `AGENTS.md`, skills, dashboard pages, `llms.txt`, the site build
   scripts `scripts/build-all-docs.js`, `scripts/build-docs-pages.js`,
   `scripts/fix-doc-links.js`, `scripts/build-ask-index.mjs`), and which other file it
   overlaps.
2. **New layout**, one folder per lane, each with an `index.md`:
   `docs/start/`, `docs/browser-scripts/`, `docs/cli/`, `docs/mcp/`, `docs/library/`,
   `docs/api/`, `docs/self-host/`, `docs/guides/` (cross-lane how-tos), `docs/reference/`
   (selectors, configuration, database).
3. **Merge duplicates.** One page per topic. Where two pages disagree, the code decides.
   Do not lose a fact: every command, option and caveat in a merged-away page appears in
   the surviving one or is shown by the code to be wrong.
4. **Keep old URLs alive.** Every moved or merged file leaves a short stub at its old
   path: title, one line saying where it went, the link. The published site pages get a
   redirect (`dashboard/_redirects` is how Cloudflare Pages does it here).
5. **Internal material** moves to `docs/internal/` with a README saying it is not user
   documentation. Exclude it from the site build and the Ask index.
6. **Rewrite `docs/README.md`** as the map of the new layout and fix every inbound link
   you found in step 1.
7. Update the generators so `npm run site:docs` and `npm run ask:index` read the new
   layout.

## Do not

- Do not delete a page. Stubs and moves only.
- Do not rewrite content for style. Merge and relocate.
- Do not touch `docs/articles/`, `docs/examples/` or `docs/x-api/` beyond fixing links
  into moved pages.

## Done when

- `npm run docs:check` passes with zero dead links.
- No two pages under the lane folders cover the same topic; the report lists every merge.
- `npm run site:docs` builds and the old public URLs redirect.
- `AGENTS.md`, README and `llms.txt` link into the new layout.
