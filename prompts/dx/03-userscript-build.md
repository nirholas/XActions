# 03: one-click install as userscripts

Read `prompts/dx/00-README.md` first. Wave 2. Needs 01 merged.

## Goal

Every browser script can be installed with one click in Tampermonkey or Violentmonkey,
runs from a menu on x.com, and updates itself.

## Why

Pasting into DevTools is the only way to run a script today, and it has to be repeated
every session. No userscript exists in the repository:
`git ls-files | grep -i '\.user\.js$'` prints nothing.

## Do

1. **Builder:** `scripts/build-userscripts.mjs` reads `browser/index.json` and writes one
   `<id>.user.js` per script to a build directory that is gitignored.
   - Metadata block from the manifest: `@name`, `@namespace`, `@version` (the package
     version), `@description`, `@match https://x.com/*` and `https://twitter.com/*`,
     `@grant` for exactly what the wrapper uses, `@run-at document-idle`,
     `@homepageURL`, `@supportURL`, `@updateURL` and `@downloadURL`.
   - **Never auto-run.** The wrapper registers a `GM_registerMenuCommand` entry; the
     script body runs only when the user picks it. A write script asks for confirmation
     and shows whether dry run is on.
   - Config from the manifest schema, stored with `GM_getValue`/`GM_setValue`, editable
     from a second menu command. No hand-editing of the file.
   - When `needsCore` is true, inline `src/automation/core.js` ahead of the body.
   - Warn in the menu when the current URL does not match the script's `page`.
2. **One combined userscript** with every tool behind a single menu, built the same way,
   for people who want one install.
3. **Where updates come from.** `@updateURL` must point at a stable URL. Use release
   assets (`https://github.com/nirholas/XActions/releases/latest/download/<id>.user.js`).
   Add the build and upload step to `.github/workflows/release.yml` next to the existing
   `.mcpb` asset. Do not create a release yourself.
4. **An install page.** Generate a list of install links from the manifest for the docs
   and for `dashboard/run.html`, grouped by category.
5. **Validate.** `node --check` every output file. Parse every metadata block in a test
   and assert the required keys. Load at least three scripts (one read-only, one write
   with dry run, one that needs core) in a real browser with a userscript manager
   through Puppeteer and confirm the menu command registers; state which you verified.

## Do not

- Do not commit build output.
- Do not make a script start on page load.
- Do not request `@grant` permissions the wrapper does not use.

## Done when

- `npm run build:userscripts` produces one file per manifest entry plus the combined one.
- Tests pass for metadata, config round-trip and the URL-mismatch warning.
- `docs/browser-scripts.md` has an "Install as a userscript" section; README's install
  section links to it.
- Your report names the release step the owner runs to make the update URLs live.
