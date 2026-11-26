# 04: the extension offers every script, from the manifest

Read `prompts/dx/00-README.md` first. Wave 2. Needs 01 merged.

## Goal

The browser extension lists every script in `browser/index.json`, with a settings form
built from each script's config schema, and each release carries an installable zip.

## Why

- The extension exposes 11 automations (`extension/README.md`) while `browser/` holds
  112 scripts. A user of the extension never sees most of the project.
- Its cards and settings are hand-written, so each new script needs extension work.
- The only documented install is "Load unpacked" from a clone.

## Do

1. Read `extension/manifest.json`, `extension/popup/`, `extension/background/` and
   `extension/content/injected.js` to learn how the 11 automations are wired today.
   Keep all 11 working exactly as they do now.
2. Add a generated catalogue: a build step copies `browser/index.json` and the canonical
   scripts into the extension package. The popup renders a searchable, category-filtered
   list from it, and a settings form per script from the manifest's `config` (text,
   number, boolean, list). Settings persist in `chrome.storage`.
3. Run a script by injecting it into the active x.com tab with the user's settings
   applied, `core.js` first when `needsCore` is true. Show progress and a stop button
   wired to the script's own controls (`window.XActions.pause/resume/abort` where the
   script provides them).
4. Safety in the UI: a write script shows that it changes the account, shows the dry-run
   state, and needs one confirming click. Disable Run with a reason when the tab is not
   on the script's `page`.
5. Request no new permission you do not need. Manifest V3 forbids remotely hosted code:
   every script must ship inside the package.
6. Packaging: `npm run build:extension` writes a versioned zip (version synced from
   `package.json`). Attach it in `.github/workflows/release.yml`. Document Chrome and
   Edge install from the zip.
7. Store submission is the owner's step. Write `extension/STORE.md` with the listing
   text, the permission justifications and the upload steps.

## Do not

- Do not remove or restyle the existing 11 cards beyond what the shared list needs.
- Do not fetch scripts from the network at run time.
- Do not submit to a store.

## Done when

- The extension, loaded unpacked in a real Chromium through Puppeteer, lists every
  manifest entry, and you ran one read-only script and one write script in dry run on
  x.com. Say exactly what you ran and saw.
- A test asserts the packaged catalogue matches `browser/index.json`.
- `docs/extension.md` and `extension/README.md` describe the new list, with true counts.
