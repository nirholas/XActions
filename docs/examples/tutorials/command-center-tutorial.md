# XActions Command Center -- Tutorial

> Run every XActions browser tool from one searchable menu. Paste one script, pick a tool, press Run.

The Command Center is the fastest way to use XActions. Instead of finding a single script file, opening it, editing its config, and pasting it, you paste **one** script and get a floating command palette with all 108 tools inside it: create, scrape, analyze, grow, engage, clean up, moderate, manage lists, and more.

## Prerequisites
- Logged into x.com in your browser
- Browser DevTools console (F12, or Cmd+Option+I on Mac, then the Console tab)

## Quick Start
1. Open x.com and go to the page you want to work on (a profile, your timeline, search results, your Likes, your Followers, etc.).
2. Open DevTools (F12) and select the **Console** tab.
3. If the console warns about pasting, type `allow pasting` and press Enter.
4. Copy the entire contents of [`scripts/twitter/xactions-command-center.js`](../../../scripts/twitter/xactions-command-center.js) and paste it into the console, then press Enter.
5. The **Command Center** palette appears in the top-right corner.

Reopen the palette any time with the floating button (bottom-right) or **Cmd/Ctrl + K**.

## Finding a tool

- **Search:** start typing. It matches tool name, description, and category. Arrow keys move the selection, Enter opens the highlighted tool.
- **Categories:** click a chip (Create & Post, Scrape & Export, Analytics, Grow, Engage, Clean Up, Moderate, Lists, Communities, Profile, Utilities) to filter.
- **Favorites and Recents:** click the star on any tool to pin it. Your favorites and recently used tools show at the top of the "All" view.

## Running a tool

1. Click a tool to open its detail view.
2. Read the **Where to run** line. Each tool expects a specific page (for example, "Scrape Followers" wants `x.com/<user>/followers`). The palette warns you if you are not on the right page.
3. Open **Options** to set the tool's settings in a form (limits, keywords, templates, delays, and so on). No code editing. Power users can switch to "Edit as JSON."
4. Press **Run**. Progress prints to the Console.

### Example: export a profile's followers

1. Go to `x.com/nasa/followers`.
2. Open the Command Center, search "followers", open **Scrape Followers**.
3. (Optional) set `maxUsers` in Options.
4. Press Run. The tool auto-scrolls, prints a running count, and downloads `nasa_followers_<date>.json` plus a CSV when it finishes.

### Example: post a thread

1. Go to `x.com/compose/post`.
2. Search "thread", open **Post a Thread**.
3. In Options, set `tweets` to your list of strings. Posting tools default to a safe dry run, so set `dryRun` to `false` when you are ready to actually publish.
4. Press Run.

## Safety

Every tool is labelled:

- **Safe** -- read-only or export. Never changes your account (all the scrapers, analytics, and diagnostics).
- **Writes** -- performs actions on your account (likes, follows, posts, DMs) at a human pace, with randomized delays.
- **Bulk / irreversible** -- bulk changes that cannot be undone in one click (mass unfollow, unlike, block, bulk delete your posts). These require a **second confirming click** and show a warning. Many also default to a **dry run** so you can preview before acting.

While a tool runs, it appears in the palette's dock with a **Stop** button (and a **Stop all**) for the long-running ones. You can also stop any tool from the console with its `window.stop<ToolName>()` command, which the tool prints when it starts.

## Notes

- Everything runs locally in your own logged-in browser session. Nothing is sent to any server.
- Automating actions on X can hit rate limits or violate the platform's terms if pushed too hard. The action tools pace themselves. Keep volumes reasonable and use the read-only tools freely.
- Every individual tool still works on its own if you prefer to paste just one. See the per-tool pages at [xactions.app/scripts](https://xactions.app/scripts).

Part of [XActions](https://github.com/nirholas/XActions).
