# ⚡ XActions Command Center

**The one script to run them all.** Paste a single file into your browser console and get a searchable menu of all 108 XActions tools: create, scrape, analyze, grow, engage, clean up, moderate, manage lists, and more. No hunting for the right file, no editing config by hand, no re-pasting.

Script: [`xactions-command-center.js`](./xactions-command-center.js)

## Why this exists

XActions ships 100+ browser-console tools, each in its own file. Finding the right one meant browsing the repo, opening a file, editing its `CONFIG`, and pasting it. The Command Center replaces that with one paste: a floating command palette lists every tool, grouped by category, with search, one-click run, and an options form so you never touch source code.

It bundles every tool in `scripts/twitter/` directly into one script, so there are no extra network requests and nothing to install. It works on x.com's strict Content-Security-Policy because it never fetches or `eval`s remote code: everything it can run is already in the file you pasted.

## Quick start

1. Open **x.com** and go to the page you want to work on (a profile, your timeline, search results, your Likes, etc.).
2. Open DevTools: `F12`, or `Cmd+Option+I` on Mac, then click the **Console** tab.
3. If the console warns about pasting, type `allow pasting` and press Enter.
4. Paste the entire contents of [`xactions-command-center.js`](./xactions-command-center.js) and press Enter.
5. The **⚡ Command Center** palette appears (top-right). Search or pick a category, choose a tool, set any options, and press **Run**.

Reopen the palette any time with the floating **⚡** button (bottom-right) or **Cmd/Ctrl + K**.

## What you can do

- **Search** across all tools by name, description, or category. Arrow keys navigate, Enter opens.
- **Browse by category:** Create & Post, Scrape & Export, Analytics, Grow, Engage, Clean Up, Moderate, Lists, Communities, Profile, Utilities.
- **Star favorites** and see recently used tools at the top.
- **Set options in a form** instead of editing code. Every tool's settings render as fields (text, numbers, toggles, lists), with an "Edit as JSON" mode for power users. Options are applied to that run only.
- **Safety by design.** Each tool is tagged **Safe** (read-only/export), **Writes** (acts on your account at a human pace), or **Bulk / irreversible**. Destructive tools (mass unfollow, unlike, block, clear) require a second confirming click and show a warning. The palette also tells you which page each tool expects and warns if you're not on it.
- **Track and stop runs.** Launched tools appear in a dock with a **Stop** button for the long-running ones (and a **Stop all**). Progress prints to the Console, as it always has.

## How it's built

This file is **generated**, do not edit it by hand. Two sources produce it:

- [`_command-center-shell.js`](./_command-center-shell.js): the palette UI.
- [`../build-toolkit.mjs`](../build-toolkit.mjs): the curated tool catalog (titles, categories, danger levels, descriptions, where-to-run hints), plus the bundler.

The build reads every `scripts/twitter/*.js` tool, extracts its `CONFIG` defaults (to render the options form), injects a small override hook so the palette can pass your settings into that run, wraps each tool in its own scope, and writes the result to `xactions-command-center.js`.

To regenerate after changing a tool, the UI, or the catalog:

```bash
node scripts/build-toolkit.mjs
```

The build validates the output with `node --check` and fails if any tool is missing a catalog entry (or vice-versa), so the palette can never drift out of sync with the files on disk.

## Notes

- Everything runs locally in your own logged-in browser session. Nothing is sent to any server.
- Individual tool files still work on their own if you prefer to paste just one, see the other READMEs in this folder.
- Automating actions on X can hit rate limits or violate the platform's terms if pushed too hard. The action tools pace themselves; keep volumes reasonable and use the read-only tools freely.

Part of [XActions](https://github.com/nirholas/XActions) · [xactions.app](https://xactions.app)
