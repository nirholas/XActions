# scripts/

Build, check and maintenance tools for this repository, run with Node.

**Looking for a console script to paste into DevTools on x.com?** They live in
[`browser/`](../browser/), one file per tool, and
[`browser/index.json`](../browser/index.json) lists every one with its title,
the page to run it on, whether it changes your account, and its options. The
catalog with descriptions is [`docs/browser-scripts.md`](../docs/browser-scripts.md).

## The `.js` console scripts here are copies

Console scripts used to live in four places: `browser/`, this folder,
`scripts/twitter/` and `src/automation/`. The same tool often existed in two or
three of them with different code. Each tool now has one source,
`browser/<id>.js`, and every old path is kept as a generated copy of it so a
raw GitHub URL someone saved still pastes and runs. A copy's first line says:

```js
// GENERATED FILE: a copy of browser/unfollowEveryone.js, written by scripts/build-script-manifest.mjs. ...
```

Do not edit a copy; the next build overwrites it. Edit the `browser/` file,
then:

```bash
npm run browser:build   # rewrite browser/index.json and every copy
npm run browser:check   # fail if either is stale (part of npm run docs:check)
```

Each script lists the old paths it replaces in its `@aliases` header tag. To
find which file a copy comes from, read its first line or search
`browser/index.json` for the path.

## What is here

| File | What it does |
|------|--------------|
| `build-script-manifest.mjs` | Builds `browser/index.json` from the header and `CONFIG` of each `browser/` script, and writes the legacy copies |
| `build-browser-scripts-doc.mjs` | The catalog in `docs/browser-scripts.md`, from the manifest |
| `build-script-pages.js` | The `/scripts/<slug>` pages on xactions.app, from the manifest, with redirects for old file names |
| `build-toolkit.mjs` | `scripts/twitter/xactions-command-center.js`, the one-paste palette of every standalone script |
| `build-ask-index.mjs`, `build-ask-actions.mjs` | The Ask XActions search index and action catalog |
| `audit-docs.mjs` | Dead links, stale counts and missing references in the docs |
| `check-*.mjs`, `sync-*.mjs` | Release, site, endpoint and registry checks, and the syncs they rely on |
| `build-*.js`, `build-*.mjs` | Site, docs, bundle and package builds |
| `lib/` | Helpers shared by the tools above |
| `templates/` | A starting point for a new console script |
| `twitter/` | The command center (`_command-center-shell.js` and its generated bundle) and generated copies of `browser/` scripts |

## Writing a new console script

Put it in `browser/`, not here. Start from
[`templates/script-template.js`](templates/script-template.js) and give the
first doc block these tags, one per line:

```js
// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * @name        myScript.js
 * @title       My Script
 * @description One sentence on what it does.
 * @category    cleanup
 * @page        x.com/<you>/following
 * @writes      true
 */
```

`@category` is one of the ids in `browser/index.json` under `categories`.
`@page` is the x.com page to run it on, with `<you>`, `<username>`, `<id>` or
`<query>` placeholders and alternatives joined by ` or `. Keep every option in
a `CONFIG` object literal; a `dryRun` key there marks the script as supporting
a dry run. Then run `npm run browser:build`.

---

*Part of the [XActions](https://github.com/nirholas/XActions) toolkit by [@nichxbt](https://x.com/nichxbt)*
