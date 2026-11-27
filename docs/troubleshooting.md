# Troubleshooting

Start with one command:

```bash
xactions doctor --report       # or: npx xactions doctor --report
```

It checks the install, Node, the native SQLite module, `XACTIONS_HOME`, your
clock, the guest tier, the saved session, the query-ID cache and the MCP
server, and prints the result as a Markdown block. Every failing line in
plain `xactions doctor` has its fix next to it; `--report` is the same
checks in a form made to paste.

The report leaves out cookies, tokens, usernames, account ids, proxy URLs,
home directory paths and environment variable values, so it is safe to post
in a public issue. Nothing is sent anywhere.

If your problem is not in the table below, open a bug report with the report
already filled in:

```bash
xactions doctor --issue        # prints the report and a prefilled new-issue link
xactions doctor --issue --open # the same, and opens the link in your browser
```

The [bug report form](https://github.com/nirholas/XActions/issues/new?template=bug_report.yml)
asks for that report, the command you ran, what happened and what you
expected. A browser console script that stopped finding buttons on x.com has
[its own form](https://github.com/nirholas/XActions/issues/new?template=script_broken.yml).

Symptoms in the left column, causes and fixes below.

| Symptom | Jump to |
|---------|---------|
| `AUTH_REQUIRED` / `HTTP 404` on search, followers, or DMs | [Endpoints that need a login](#endpoints-that-need-a-login) |
| Everything returns `null`, `0`, or an empty list | [Empty results](#empty-results) |
| `Guest token activation failed: HTTP 404` | [Guest token activation](#guest-token-activation) |
| `RATE_LIMITED` or actions stop working mid-run | [Rate limits](#rate-limits) |
| `Query not found` | [Query not found](#query-not-found) |
| MCP server does not appear in Claude or Cursor | [MCP server not connecting](#mcp-server-not-connecting) |
| Puppeteer fails to launch | [Puppeteer](#puppeteer) |
| `npm install` fails | [Install failures](#install-failures) |
| Browser console script does nothing | [Console scripts](#console-scripts) |

---

## Endpoints that need a login

```
AuthenticationError [AUTH_REQUIRED]: HTTP 404 on
/i/api/graphql/.../SearchTimeline while unauthenticated.
```

**This is expected, not a bug.** X splits its internal API into two tiers:

| Tier | Endpoints | Login |
|------|-----------|-------|
| Guest | Profiles, public user timelines | Not needed |
| Session | Search, followers, following, likes, bookmarks, DMs, home timeline | Required |

X answers a logged-out request to a session-tier endpoint with a bare `404`,
which is why the error mentions 404 even though the resource exists.

**Fix:** supply a session. Fastest first:

```bash
xactions login --from-browser firefox     # reads x.com cookies out of your browser
xactions login --cookies-file cookies.txt # a cookies file you already exported
xactions connect                          # log in through a real browser window
xactions login                            # paste auth_token and ct0 by hand
```

`--from-browser` accepts `chrome`, `chromium`, `brave`, `edge`, `arc` and
`firefox`. It works headlessly for Firefox everywhere, and for Chromium-family
browsers on Linux and macOS. If your browser seals its cookie store with the
system keyring, or you are on Windows, XActions tells you which file to export
and use with `--cookies-file`.

For the library and the examples:

```bash
export X_AUTH_TOKEN=...
export X_CSRF_TOKEN=...
```

Get both values from DevTools, **Application**, **Cookies**, `https://x.com`.

### Why ct0 matters

`auth_token` identifies you; `ct0` is the CSRF token X requires as a request
header before it will treat a session as logged in. **With only `auth_token`,
session-tier endpoints still fail.** If you configured a login and search still
returns `AUTH_REQUIRED`, a missing `ct0` is almost always why.

---

## Empty results

A scrape that returns `null` fields or an empty array, with no error.

**Most common cause:** the browser path is being used while logged out. X no
longer serves profile or timeline content to a logged-out browser, so the DOM
scrape finds an empty page.

**Fix:** the CLI, the MCP server, and the library all prefer the HTTP client
now, which reads public data with a guest token and does not need a browser at
all. Make sure you are on a current version:

```bash
npx xactions@latest profile nasa
```

If that prints real numbers and your own code does not, you are on an older
release, or calling the Puppeteer scrapers (`scrapers.scrapeProfile`) directly
rather than the client (`Scraper.getProfile`).

**Second cause:** the account is protected, suspended, or renamed. Check it in a
logged-out browser window.

---

## Guest token activation

```
Guest token activation failed: HTTP 404 —
{"errors":[{"message":"Sorry, that page does not exist","code":34}]}
```

The endpoint exists. X rejects requests that do not look like they came from a
browser, and answers with a 404 rather than a 401, which makes it read like a
removed endpoint.

XActions sends a browser `User-Agent` on every request for exactly this reason.
If you see this error:

- **Check your version.** Releases before this fix landed will always hit it.
- **Check any custom `fetch`.** If you passed your own fetch implementation into
  `new Scraper({ fetch })` and it strips or overrides headers, add a browser
  `User-Agent` back.
- **Check your proxy.** Some corporate proxies rewrite `User-Agent`.

---

## Rate limits

```
ScraperError [RATE_LIMITED]: Rate limited (429).
```

`error.rateLimitReset` carries the reset time when X sends one:

```js
catch (error) {
  if (error.code === 'RATE_LIMITED') {
    console.log('retry after', error.rateLimitReset);
  }
}
```

**Guest tokens are throttled hard.** Authenticating raises the ceiling
substantially, so a login is the fix for read-heavy work as well as for
session-tier endpoints.

One session gets roughly 50 GraphQL calls per operation per 15 minutes, which
stalls a large follower scrape partway through. Two features exist for that: an
**account pool** spreads calls over several sessions and rotates on a 429, and
**checkpoints** let an interrupted scrape resume from its last cursor instead of
starting over. Both are in
[scraping-infrastructure.md](scraping-infrastructure.md#account-pool-and-resumable-scrapes-http-scraper).
`xactions doctor` reports whether a pool exists and how many of its accounts can
serve right now.

For browser console scripts, throttling looks different: buttons quietly stop
responding and the progress count stops climbing while the page keeps
scrolling. Stop the run, wait an hour, and raise `delay` in the script's
`CONFIG` block. See [browser-scripts.md](browser-scripts.md#rate-limits-and-not-getting-locked-out).

Rough guidance for write actions (unfollows, follows, likes, deletes): keep
`delay` at 2000ms or more and stay under a few hundred actions a day. Limits
vary by account age and standing, and X does not publish them.

---

## Query not found

```
HTTP 404: {"message":"Query not found"}
```

X rotates the query IDs of its internal GraphQL endpoints whenever it ships a
new web bundle, and a request to the old ID answers with this.

**You should almost never see it.** XActions discovers the current IDs the same
way x.com's own client gets them: it reads them out of the live JavaScript
bundles and caches them in `~/.xactions/query-ids.json`. A call that fails for a
stale ID triggers one refresh and one retry automatically, and a cache older
than 24 hours refreshes in the background. The pinned table in
[`src/scrapers/twitter/http/endpoints.js`](../src/scrapers/twitter/http/endpoints.js)
is only the offline fallback.

If you do see it:

```bash
xactions doctor --refresh-ids
```

That probes x.com now, rewrites the cache, and prints which operations resolve
from the cache versus the pinned table. Then re-run your command.

Still failing? The three causes, in order of likelihood:

- **No network route to x.com** (a proxy, a firewall, an offline machine).
  Discovery cannot run, so the pinned table is all there is. `xactions doctor`
  says so explicitly.
- **The operation is not one XActions pins.** `resolveGraphQL('<Operation>')`
  falls through to the generated table, which covers every operation x.com
  ships. See [scraping-infrastructure.md](scraping-infrastructure.md#graphql-query-id-discovery).
- **X removed the operation.** `npm run sync:endpoints:check` exits non-zero
  when an operation XActions tracks has disappeared from x.com's bundles.
  That one is worth an issue.

---

## MCP server not connecting

First, verify the server itself works, independent of your AI client:

```bash
node examples/08-mcp-tool-call.js
```

That spawns the server, completes the handshake, lists the tools, and calls
one. If it prints a profile, the server is fine and the problem is client
configuration.

If the handshake works but the tools you expect are missing, check whether the
server was started with a filter: `--tools` / `XACTIONS_MCP_TOOLS` and
`--exclude` / `XACTIONS_MCP_EXCLUDE` hide everything they do not name. Run
`npx xactions-mcp --list-groups` to see the full set. And if write tools return
a draft id instead of acting, the server is in approval mode
(`--require-approval`): run `xactions drafts list` to see what is held, then
`xactions drafts approve <id>`.

Then check, in order:

**Config file location.** Claude Desktop reads
`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS and
`%APPDATA%\Claude\claude_desktop_config.json` on Windows. Cursor and Windsurf
use their own paths. See [mcp-setup.md](mcp-setup.md).

**JSON validity.** A trailing comma silently disables the whole file. Paste it
into a validator.

**Restart the client.** MCP servers are spawned at startup. Config changes do
not take effect until a full restart, not just a new chat.

**Node on PATH.** MCP clients launch servers with a minimal environment. If
`node` came from a version manager, use an absolute path:

```json
{
  "mcpServers": {
    "xactions": {
      "command": "/usr/local/bin/node",
      "args": ["/absolute/path/to/XActions/src/mcp/server.js"]
    }
  }
}
```

**Stdout must stay clean.** MCP speaks JSON-RPC over stdout. Anything else
printed there corrupts the stream. If you added logging to a tool, send it to
`stderr` (`console.error`), which is what the server's own banner uses.

---

## Puppeteer

Most operations no longer need Puppeteer: profiles, timelines, and everything
the HTTP client covers run without a browser. Puppeteer is still used for
logged-in UI actions.

**Chromium did not download.** Reinstall it:

```bash
npx puppeteer browsers install chrome
```

**Missing shared libraries on Linux.** The bundled Chromium needs system
packages that minimal images omit:

```bash
sudo apt-get install -y \
  libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
  libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
  libgbm1 libasound2
```

**Running as root, or in Docker.** Chromium's sandbox needs unprivileged
namespaces. Set:

```bash
export PUPPETEER_NO_SANDBOX=true
```

**Headless launch times out.** Give it more room and a writable temp dir:

```bash
export PUPPETEER_HEADLESS=true
```

---

## Install failures

**`npm ci` fails but `npm install` works.** The lockfile is out of sync with
`package.json`. Run `npm install`, commit the updated `package-lock.json`.

**`ETARGET no matching version`.** A dependency version was yanked from npm.
Delete `node_modules` and `package-lock.json`, then `npm install` to resolve
fresh.

**Disk space.** A full install pulls Chromium and the Remotion renderer, which
together need several GB. `ENOSPC` during install means exactly what it says.

**Optional dependencies failed.** `@atproto/api` (Bluesky), `viem`, and the
`@x402/*` packages are optional. Their install failing does not break the core
toolkit; only the features that use them become unavailable.

---

## Console scripts

**Nothing happened.** Chrome requires you to type `allow pasting` in the console
before it accepts pasted code the first time.

**It ran but did nothing.** Almost always `dryRun: true`, which is the default
for every destructive script. Read the preview output, then set it to `false`.

**Wrong page.** Each script names the page it expects in its header comment and
in the [catalog](browser-scripts.md#the-catalog). A follower script on the home
timeline finds nothing.

**`Identifier has already been declared`.** You pasted the same script twice.
Reload the page and paste once.

**It stops partway.** X unmounts off-screen rows as you scroll, so a script that
stops finding new accounts has usually hit a throttle rather than the end of the
list. Reload, raise `delay`, and continue.

---

## Still stuck

- [Open an issue](https://github.com/nirholas/XActions/issues) with your Node
  version (`node -v`), XActions version (`npx xactions --version`), the exact
  command, and the full output.
- [Discussions](https://github.com/nirholas/XActions/discussions) for questions
  that are not bugs.

## Related

- [Getting Started](getting-started.md)
- [Configuration](configuration.md)
- [MCP Setup](mcp-setup.md)
- [Browser Scripts](browser-scripts.md)
