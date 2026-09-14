# Examples

Runnable Node.js programs built on the XActions library. Every one of these
runs against the live X, Bluesky, and Mastodon APIs, prints real data, and was
verified before it landed. Nothing here is a sketch.

```bash
git clone https://github.com/nirholas/XActions.git
cd XActions
npm install
node examples/01-profile-lookup.js
```

That first command needs no account, no API key, and no browser.

---

## What needs a login, and why

X splits its internal API into two tiers, and knowing which is which saves a
lot of confusion:

| Tier | What it covers | Login |
|------|----------------|-------|
| **Guest** | Profiles, public user timelines | Not needed |
| **Session** | Search, followers, following, likes, bookmarks, DMs, home timeline | Required |

Session-tier endpoints answer a logged-out request with a bare `404`, which is
why the examples that need one check up front and tell you how to fix it rather
than failing halfway through.

The painless way, either of which writes the cookie file the examples read:

```bash
npx xactions connect              # opens a real browser, you log in, it captures the session
npx xactions login --from-browser # reads x.com cookies from a browser you are already logged in to
```

`--from-browser` takes `chrome`, `chromium`, `brave`, `edge`, `arc`, or
`firefox`, and defaults to firefox.

By hand, if you would rather see exactly what is being copied:

1. Open [x.com](https://x.com) and log in.
2. DevTools (<kbd>F12</kbd>) → **Application** → **Cookies** → `https://x.com`
3. Copy the values of `auth_token` **and** `ct0`.
4. Either export them:

   ```bash
   export X_AUTH_TOKEN=...
   export X_CSRF_TOKEN=...
   ```

   or paste them into `npx xactions login`.

Check where you stand at any time with `npx xactions doctor`.

Both cookies matter. `auth_token` proves who you are; `ct0` is the CSRF token X
requires as a header before it treats the request as logged in. With only
`auth_token`, session-tier endpoints stay closed.

---

## The examples

| # | File | What it does | Login |
|---|------|--------------|:-----:|
| 01 | [01-profile-lookup.js](01-profile-lookup.js) | Fetch public profiles. The shortest path to real data. | no |
| 02 | [02-user-timeline.js](02-user-timeline.js) | Stream a timeline, rank posts by engagement, report the median. | no |
| 03 | [03-sentiment-report.js](03-sentiment-report.js) | Score an account's tone with the offline analyzer. | no |
| 04 | [04-cross-platform.js](04-cross-platform.js) | The same brand on X, Bluesky, and Mastodon, side by side. | no |
| 05 | [05-export-followers.js](05-export-followers.js) | Stream a follower list to a spreadsheet-ready CSV. | yes |
| 06 | [06-find-non-followers.js](06-find-non-followers.js) | Set difference of following vs followers. Read-only. | yes |
| 07 | [07-keyword-monitor.js](07-keyword-monitor.js) | Poll search, score sentiment, POST a webhook on negatives. | yes |
| 08 | [08-mcp-tool-call.js](08-mcp-tool-call.js) | Drive the MCP server over stdio the way Claude does. | no |
| 09 | [09-draft-approval.js](09-draft-approval.js) | Hold an agent's write call as a draft, review it, discard it. | no |

[auth.js](auth.js) is the shared helper the others import. It resolves a
session from the environment or the CLI's cookie file and prints setup
instructions when it cannot find one.

---

## Walkthroughs

```bash
# 01 — one profile, or several at once
node examples/01-profile-lookup.js
node examples/01-profile-lookup.js nasa github vercel

# 02 — timeline analysis; second argument is how many posts to sample
node examples/02-user-timeline.js github 40

# 03 — tone of an account, computed locally with no model and no API key
node examples/03-sentiment-report.js nasa 25

# 04 — cross-network comparison: X handle, Bluesky handle, Mastodon user@instance
node examples/04-cross-platform.js nasa bsky.app Gargron@mastodon.social

# 05 — CSV export: handle, max rows, output file
node examples/05-export-followers.js nasa 500 nasa-followers.csv

# 06 — with no handle, audits the logged-in account
node examples/06-find-non-followers.js

# 07 — brand monitor; second argument is the poll interval in seconds
ALERT_WEBHOOK=https://hooks.example.com/x node examples/07-keyword-monitor.js "your brand" 120

# 08 — verify an MCP setup without an AI client in the loop
node examples/08-mcp-tool-call.js
node examples/08-mcp-tool-call.js x_get_tweets github

# 09 — see the approval gate hold a write call. Nothing is ever posted.
node examples/09-draft-approval.js
node examples/09-draft-approval.js "text for the held draft"
```

### Sample output

`node examples/04-cross-platform.js`:

```
Profiles
--------
Network   Handle                    Followers   Following   Posts
X         @NASA                     92.4M       117         74.2K
Bluesky   @bsky.app                 34.7M       13          822
Mastodon  @Gargron                  382.4K      735         82.1K
```

`node examples/09-draft-approval.js`:

```
An agent asks to post
---------------------
  held      true
  draft id  88aae55b
  tool      x_post_tweet
  text      A post an agent proposed. Never sent.

  Approval mode is on. "x_post_tweet" was saved as draft 88aae55b and has NOT been executed.
```

---

## Using XActions in your own project

Install from npm and import the same modules the examples use:

```bash
npm install xactions
```

```js
import { Scraper } from 'xactions/client';

const scraper = new Scraper();

// Guest tier — no login
const profile = await scraper.getProfile('nasa');
console.log(profile.name, profile.followersCount);

for await (const tweet of scraper.getTweets('nasa', 20)) {
  console.log(`https://x.com/i/web/status/${tweet.id}`, tweet.text);
}

// Session tier — attach cookies first
await scraper.setCookies(`auth_token=${process.env.X_AUTH_TOKEN}; ct0=${process.env.X_CSRF_TOKEN}`);

for await (const follower of scraper.getFollowers('nasa', 100)) {
  console.log(follower.username);
}
```

Errors carry a machine-readable `code` and the HTTP status, so you can branch on
the failure kind instead of matching on message text:

```js
try {
  for await (const tweet of scraper.searchTweets('mars', 10)) {
    console.log(tweet.id);
  }
} catch (error) {
  if (error.code === 'AUTH_REQUIRED') {
    // X restricts this endpoint to logged-in sessions
  } else if (error.code === 'RATE_LIMITED') {
    console.log('retry after', error.rateLimitReset);
  }
}
```

---

## Browser console scripts

The examples above are Node.js programs. XActions also ships 95 scripts you
paste straight into DevTools on x.com with nothing installed at all. The
best-known one unfollows everybody who does not follow you back:

1. Open `https://x.com/YOUR_USERNAME/following`
2. Open DevTools (<kbd>F12</kbd>) → **Console**
3. Paste the contents of [`scripts/unfollowback.js`](../scripts/unfollowback.js)

Use [`scripts/unfollowWDFBLog.js`](../scripts/unfollowWDFBLog.js) instead if you
want a downloadable log of who was unfollowed. The full catalog is in
[docs/browser-scripts.md](../docs/browser-scripts.md).

---

## Other surfaces

These examples cover the Node.js library. XActions has four more entry points:

- **CLI** — 55 top-level commands, 157 counting sub-commands. `npx xactions profile nasa`. See [docs/cli-reference.md](../docs/cli-reference.md).
- **MCP server** — 154 tools for Claude, Cursor, and Windsurf. See [docs/mcp-setup.md](../docs/mcp-setup.md).
- **Agent skills** — 49 of them, installable with `npx xactions skills install --all`. See [docs/skills.md](../docs/skills.md).
- **Browser scripts** — 95 of them, pasted into DevTools with no install. See [docs/browser-scripts.md](../docs/browser-scripts.md).
- **REST API** — self-hosted. See [docs/rest-api.md](../docs/rest-api.md).

Guided, end-to-end walkthroughs live in [tutorials/](../tutorials/).

---

## Contributing an example

Good examples are short, do one thing, and run. If you add one:

- Name it `NN-kebab-case.js` and add a row to the table above.
- Run it before opening the PR, and paste the real output into the PR body.
- Handle the unauthenticated case explicitly. Never let an example print zeros
  or empty results as if they were success.
- No placeholder values, no `// TODO`, no mock data.

See [CONTRIBUTING.md](../CONTRIBUTING.md).
