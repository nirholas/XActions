# 01: browser scripts get one home and one manifest

Read `prompts/dx/00-README.md` first. Wave 1. Prompts 02, 03, 04, 05 and 08 build on this.

## Goal

Every browser console script has exactly one source file, and one generated manifest
describes all of them. Every other place that lists scripts reads the manifest.

## Why

A user who wants "the unfollow script" finds several, and they differ.

- Four trees hold console scripts: `browser/` (112 files), `scripts/` (about 95 console
  scripts mixed with about 40 build tools), `scripts/twitter/` (113) and
  `src/automation/` (20). Re-measure: `ls browser | wc -l`, `ls scripts/twitter | wc -l`.
- 61 filenames exist in both `scripts/` and `browser/`:
  `comm -12 <(ls scripts | grep '\.js$' | sort) <(ls browser | sort) | wc -l`.
  All eight pairs compared on 2026-11-26 had different content and line counts.
- `AGENTS.md` ("Straight to the file") sends some requests to `browser/` and others to
  `scripts/`.
- The 2026-08-27 audit (`docs/audits/2026-08-27-competitive-and-structural-audit.md`,
  "Still open") already calls for this.

## Do

1. **Inventory.** List every console script in the four trees with its line count, its
   `@version` and `@date` header where present, and who links to it (docs, dashboard
   pages, README, skills, the extension, `AGENTS.md`).
2. **Pick the canonical file for each tool.** `browser/` is the home: it is already
   linted with browser globals only and described that way in `AGENTS.md`. Where two or
   more files are the same tool, keep the one that does more and is newer, and port any
   behaviour only the other one has. Do not lose a feature. Record each decision.
3. **Write the manifest builder**, `scripts/build-script-manifest.mjs`, producing
   `browser/index.json`. One entry per script: `id`, `title`, `description`, `category`,
   `path`, `page` (the x.com URL pattern the user must be on), `writes` (true when it
   changes the account), `supportsDryRun`, `dryRunDefault`, `needsCore` (true when
   `src/automation/core.js` must be pasted first), `config` (option name, type, default,
   read from the script's `CONFIG` object), `aliases` (every legacy path). Derive from
   the script headers and source, not from a hand-kept list. Give it a `--check` mode and
   add that to `npm run docs:check`.
4. **Keep old paths working.** People paste from raw GitHub URLs. Each legacy path
   becomes a generated mirror of its canonical file, with a first-line comment naming the
   source and saying it is generated. The manifest builder writes the mirrors and
   `--check` fails when one drifts. Build tools stay in `scripts/` untouched.
5. **Point the readers at the manifest:** `scripts/build-browser-scripts-doc.mjs`,
   `scripts/build-script-pages.js`, `scripts/build-toolkit.mjs`,
   `scripts/build-ask-actions.mjs`, `scripts/build-ask-index.mjs`,
   `api/routes/scripts.js`, `src/ask/engine.js`. Find the rest with
   `grep -rln "scripts/twitter\|src/automation\|browser/" scripts api src extension`.
6. **Update the words:** `AGENTS.md` (directory map, the three-contexts table, "Straight
   to the file"), `scripts/README.md`, `docs/browser-scripts.md`, the skills that name a
   script path.

## Do not

- Do not delete a legacy file. Mirrors only; removal is the owner's call.
- Do not change what a script does on x.com beyond porting a feature across a merge.
- Do not touch the extension's script list (prompt 04) or add CLI commands (prompt 02).

## Done when

- `node scripts/build-script-manifest.mjs --check` passes and is part of `docs:check`.
- Every tool has one canonical file; `browser/index.json` lists them all.
- Every legacy path still runs when pasted, and is byte-identical to a fresh build.
- A test asserts each manifest entry's `path` exists and parses (`node --check`), and
  that no two entries share an `id`.
- Your report includes the merge decisions and the list of mirrors the owner could
  delete later, with the command.
