# Sweep an X search: delete, like, repost, or reply to every result

> Turn any X search into a bulk action. The one it was built for: delete every reply you ever sent one account.

X has no bulk tool for "remove everything I said to this person." Its search
does find those posts, though:

```
https://x.com/search?q=from%3Acryptopumps%20%40nichxbt&src=typed_query&f=live
```

[`scripts/searchSweep.js`](../scripts/searchSweep.js) takes that result list and
applies one action to every post in it: **delete**, **like**, **repost**, or
**reply**. It runs in the browser console on x.com, with a floating panel, a dry
run that touches nothing, and a memory of what it already did.

---

## Run it

1. Open the search you care about, for example
   `https://x.com/search?q=from%3Ayou%20%40someone&src=typed_query&f=live`.
   Or open any search at all: the panel can build and run the query for you.
2. Open DevTools (<kbd>F12</kbd>), Console tab.
3. Paste [`scripts/searchSweep.js`](../scripts/searchSweep.js). A panel appears bottom-right.
4. It picks up whatever query is already in the address bar. Pick your action.
   Leave **Dry run** ticked. Click **Start**.
5. Read the log. When it looks right, untick **Dry run** and start again.

<kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd> starts and stops,
<kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd> pauses. Deleting for real asks for
confirmation once, then counts down five seconds before the first deletion.

### Building the query from the panel

| Field | Becomes | Example |
|-------|---------|---------|
| From | `from:handle` | `me` resolves to the account you are signed in as |
| Mentions | `@handle` | posts of yours that mention them |
| To | `to:handle` | direct replies to them only |
| Extra operators | appended verbatim | `filter:replies -filter:links since:2023-01-01` |
| Raw query | used as-is, wins over everything above | `from:me @someone -filter:media` |

**Run this search now** submits it through X's own search box, which keeps the
page (and the running script) alive. Reloading the URL by hand would throw the
script away, so use the button rather than the address bar.

Leave **Latest tab** ticked. Top ranking shows a curated handful and hides most
of what you are looking for.

---

## Actions

| Action | What it does | Whose posts |
|--------|--------------|-------------|
| 🗑️ Delete | Opens the post menu, hits Delete, confirms. Permanent. | Yours only. A post by anyone else is refused, twice: once by the filters, once inside the delete itself. |
| ❤️ Like | Clicks like, verifies it turned into unlike. | Anyone's |
| 🔁 Repost | Clicks repost, confirms, verifies. | Anyone's |
| 💬 Reply | Opens the composer, types, posts, waits for it to close. | Anyone's |

Delete is exclusive. A post you are about to remove is not one you also want to
like, so ticking Delete unticks and locks the other three.

Deleting a post you reposted is not possible, so for those the script takes the
menu's **Undo repost** instead. Reposts are skipped entirely unless you tick
"Include reposts".

---

## Two things about X search you need to know

**Search returns a slice, not the set.** One pass never finds everything, no
matter how far you scroll. So the script runs several passes: after each one it
re-runs the query (by bouncing off the Top tab and back, which is X's own router
doing a refetch) and sweeps the fresh list. Default is 6 passes, and it stops
early once two passes in a row find nothing to act on.

**The search index lags deletions by minutes.** A post you just deleted can
still be listed on the next pass. Every id the script acts on is remembered in
`localStorage` under `xactions_search_sweep`, so a later pass skips it instead
of erroring on a menu that no longer has a Delete entry. Dry runs write nothing.

For a big cleanup, expect to run it more than once over a day or two. The
memory persists, so the second run only picks up what search had not yet
surfaced. `XSearchSweep.forget()` clears it if you want a genuinely fresh start.

---

## Filters: what it refuses to touch

| Setting | Effect |
|---------|--------|
| Older than (days) | Only posts at least this old |
| Likes at most / Reposts at most | Protects anything that outperformed. A reply that did numbers survives a cleanup. |
| Never touch posts containing | Comma-separated keywords. Any match, and the post is left alone. |
| Include reposts | Off by default |
| Max posts | Cap for this run. `0` means no cap. Set it to 25 for a first live run. |

Always skipped: promoted posts, your pinned post, empty posts, posts already
handled in an earlier run, and (when deleting) anything that is not yours.

`beforeDate` and `afterDate` exist too, as absolute versions of "older than",
but they have no panel field: set them on `XSearchSweep.config.filters`. For a
date window, prefer the `since:` and `until:` operators in the query itself.
X applies those server-side, so it never sends the posts you were going to
throw away.

`XSearchSweep.preview()` returns every result currently on screen with the
verdict the filters give it, so you can check the filters without starting a
run:

```js
XSearchSweep.preview().map((p) => [p.author, p.likes, p.verdict.ok, p.verdict.why]);
```

---

## Pacing

| Preset | Between posts | Between actions |
|--------|---------------|-----------------|
| Stealth | 12 to 24 s | 2.5 to 5 s |
| Safe (default) | 4 to 9 s | 1.5 to 3.2 s |
| Moderate | 2.5 to 5 s | 1.1 to 2.4 s |
| Fast | 1.3 to 2.6 s | 0.8 to 1.6 s |

Replies run at three times the between-posts delay whatever the preset, because
X weighs a published post far more heavily than a menu click when it decides to
limit an account.

On top of the preset it rests two minutes every 25 posts, and after four
failures in a row it backs off for five minutes. Every action is verified
against the DOM, and any toast that reads like a throttle stops the run rather
than burning through the limit. A thousand deletions is a multi-hour job on
Safe. That is the point: the fast version is exactly the pattern X flags.

---

## Reply text

Same two sources as [`scripts/engageProfile.js`](engage.md):

- **Templates**: one per line in the panel. `{author}` becomes `@handle`,
  `{name}` the display name. Never the same one twice in a row.
- **AI**: a one-line brief, and the model writes each reply against the post it
  is replying to. x.com's Content-Security-Policy only lets the page reach a
  short list of hosts, and `https://api.x.ai` is one of them, so **xAI (Grok)
  works straight from the console** with your key from
  [console.x.ai](https://console.x.ai). For OpenAI, Anthropic, OpenRouter, or
  Ollama, install the [browser extension](../extension/) and switch the provider
  to the bridge. The key is only stored in the browser if you tick "Remember",
  and it shares one slot with `engageProfile.js`.

**Test on a visible post** runs the model once against a result on screen and
prints what it wrote, before any of it is published.

---

## When it finishes

A JSON file downloads with the query, the stats, and a row per post: id, url,
author, timestamp, first 200 characters, which actions ran, and any errors.
**Export** in the panel writes the same file mid-run.

If you are deleting, export your posts first. There is no undo.
[`scripts/backupAccount.js`](../scripts/backupAccount.js) writes the archive.

---

## Console API

`window.XSearchSweep` is available once the panel is up:

| Call | Does |
|------|------|
| `start()` / `pause()` / `stop()` | Same as the buttons. Stop finishes the current post first. |
| `query()` | The query the panel would run |
| `goTo(q)` | Run a query now, without starting a sweep |
| `preview()` | Every visible result with its filter verdict |
| `export()` | Download the JSON record so far |
| `forget()` | Drop the memory of earlier runs |
| `config` / `state` | Live objects. Editing `config` works; the panel reads it back on the next change. |

---

## Related

- [`scripts/engageProfile.js`](engage.md) sweeps one profile's timeline instead of a search.
- [`browser/bulkDeleteTweets.js`](../browser/bulkDeleteTweets.js) and [`scripts/twitter/delete-tweets.js`](../scripts/twitter/delete-tweets.js) delete from your own profile timeline, filtered by age, keywords, or engagement.
- [`docs/browser-scripts.md`](browser-scripts.md) is the full catalog.
- [`docs/dom-selectors.md`](dom-selectors.md) if X changes its markup and something stops finding the button.
