# 08: a searchable docs site, built at deploy time

Read `prompts/dx/00-README.md` first. Wave 3. Needs 01 and 07 merged.

## Goal

The documentation is a site with search and sidebar navigation, built from `docs/` by a
standard generator during deploy. Generated pages are no longer committed, and GitHub
stops describing the repository as HTML.

## Why

- 689 generated files are tracked: `git ls-files dashboard/docs dashboard/scripts
  dashboard/blog | wc -l`. They are produced by hand-written scripts
  (`npm run site:docs`, `site:scripts`, `site:index`) and committed.
- GitHub reports the primary language as HTML (about 24 MB of HTML against 15 MB of
  JavaScript), which misdescribes a JavaScript toolkit to everyone who finds it.
- There is no search and no versioning on the JavaScript docs. The Python side already
  uses mkdocs.
- The 2026-08-27 audit: `deploy-cloudflare.yml` deploys the committed output without
  running `site:build`. Check whether that is still true before you start.

## Do

1. **Quick win first, as its own commit.** Add to `.gitattributes`:
   `dashboard/docs/** linguist-generated`, `dashboard/scripts/** linguist-generated`,
   `dashboard/blog/** linguist-generated`, and `linguist-documentation` for `docs/**`.
   Confirm locally with `github-linguist` if it is available; otherwise say you could
   not verify the resulting language bar.
2. **Choose the generator.** Compare VitePress and Starlight against these needs:
   builds from the Markdown in `docs/` as restructured by prompt 07 without rewriting
   it, built-in local search, sidebar from folders, dark theme matching the dashboard,
   static output Cloudflare Pages can serve, a current release and active maintenance.
   Pick one and state why in two lines.
3. **Build it** under `site/docs/` (config only; content stays in `docs/`). Sidebar by
   lane. Script pages are generated from `browser/index.json` (title, page, config
   table, copy button, userscript install link if prompt 03 has landed).
4. **Keep every public URL.** List the URLs the current site serves under `/docs` and
   `/scripts` (from `dashboard/sitemap.xml`). Each one must resolve to the same content
   or redirect to it through `dashboard/_redirects`.
5. **Build in the deploy.** `deploy/cloudflare/build.sh` and
   `.github/workflows/deploy-cloudflare.yml` run the docs build. `npm run site:build`
   does the same locally.
6. **Stop tracking output.** Once the deploy builds it, add the generated directories to
   `.gitignore` and remove them from the index with `git rm -r --cached`. This is a
   removal: prepare it as a separate final commit and do not make it until the owner
   says yes. The earlier commits must leave the site working with the files still
   tracked.
7. Retire the hand-written generators only by leaving them in place and unreferenced
   from `package.json`; list them in the report.

## Do not

- Do not deploy.
- Do not change the dashboard's app pages (`dashboard/*.html` outside the generated
  directories).

## Done when

- The site builds locally, search finds a known phrase, and every URL from the old
  sitemap resolves in a local preview (script the check and report the count).
- `npm run site:check` and `npm run docs:check` pass.
- The report gives the exact command for the "stop tracking" commit and the size the
  repository checkout loses.
