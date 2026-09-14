# Tutorial 01 — Your first scrape

**Time:** 5 minutes · **Login required:** no · **You need:** Node.js 18+

By the end of this you will have pulled real data off X from a terminal and from
a Node.js program, and you will understand the one distinction that explains
most XActions questions: which reads need a login and which do not.

---

## Step 1 — Run it without installing anything

```bash
npx xactions profile nasa
```

```
⚡ @NASA

  Name:      NASA
  Bio:       Making the seemingly impossible, possible. ✨
  Location:  Pale Blue Dot
  Website:   http://www.nasa.gov/
  Joined:    2007-12-19
  Following: 117  Followers: 92.4M
  Tweets:    74.2K  Listed:    0
  ✓ Verified
```

(Your numbers will differ. NASA gains followers while you read this.)

No API key. No account. No browser. That took about a second, because it went
straight to X's internal GraphQL API over HTTP rather than launching Chromium
and reading a rendered page.

Try a few more:

```bash
npx xactions profile github
npx xactions profile vercel --json
```

`--json` gives you the full object, which is what you want when piping into
something else:

```bash
npx xactions profile nasa --json | jq '.followersCount'
```

---

## Step 2 — Pull a timeline

```bash
npx xactions tweets nasa --limit 10
```

That streams posts as it pages, then prints them as JSON. To save instead:

```bash
npx xactions tweets nasa --limit 100 --output nasa.json
npx xactions tweets nasa --limit 100 --output nasa.csv
```

The extension decides the format. `.csv` and `.xlsx` both work, which matters
when you are handing results to someone who lives in a spreadsheet.

---

## Step 3 — The two tiers

Now try a search:

```bash
npx xactions search "mars rover"
```

That fails, and the error tells you why:

```
✖ Search failed
HTTP 404 on /i/api/graphql/hyPfJYJ_XAtDYoslQc-Rgg/SearchTimeline while
unauthenticated. X restricts this endpoint to logged-in sessions. Authenticate
first with scraper.login(...), scraper.setCookies(...), or
scraper.loadCookies(...) using your auth_token cookie (DevTools > Application >
Cookies > x.com > auth_token), then retry.
```

It also exits non-zero, so `set -e` and `&&` do the right thing in a script.

**This is the distinction worth internalising.** X splits its internal API in
two:

| Tier | Endpoints | Login |
|------|-----------|:-----:|
| Guest | Profiles, public user timelines | no |
| Session | Search, followers, following, likes, bookmarks, DMs, home timeline | yes |

X answers a logged-out request to a session-tier endpoint with a bare `404`,
which is why the message mentions 404 for a resource that plainly exists. Nothing
is broken. You just need a session.

---

## Step 4 — Log in

There are three ways in, easiest first. All three end at the same file,
`~/.xactions/cookies.json`, and every other command reads it from there.

**Through a real browser.** XActions opens one, you log in normally, it captures
the session and closes:

```bash
npx xactions connect
```

**From a browser you are already logged in to.** No window opens; it reads the
cookies out of the browser's own store:

```bash
npx xactions login --from-browser chrome
```

Takes `chrome`, `chromium`, `brave`, `edge`, `arc`, or `firefox`, and defaults
to firefox.

**By hand**, if you would rather see exactly what is being copied:

```bash
npx xactions login
```

It asks for two cookie values:

1. Open [x.com](https://x.com).
2. DevTools (<kbd>F12</kbd>) → **Application** → **Cookies** → `https://x.com`
3. Copy `auth_token`.
4. Copy `ct0`.

**Both.** `auth_token` says who you are; `ct0` is the CSRF token X requires as a
header before it treats the request as logged in. Supply only the first and
session-tier endpoints keep returning 404, which is the single most common
setup mistake with this tool.

Already have cookies in a file? `npx xactions login --cookies-file <path>` reads
Netscape `cookies.txt`, Cookie-Editor or EditThisCookie JSON, a Playwright or
Puppeteer `storageState`, or a raw `auth_token=...; ct0=...` string.

> Treat `auth_token` like a password. It is a full session. Never paste it into
> an issue or a screenshot, and consider using a secondary account for
> automation.

Now search works:

```bash
npx xactions search "mars rover" --limit 20
npx xactions followers nasa --limit 100 --output followers.csv
npx xactions non-followers YOUR_USERNAME
```

---

## Step 5 — From Node.js

The CLI is a thin wrapper over a library you can use directly.

```bash
mkdir first-scrape && cd first-scrape
npm init -y
npm pkg set type=module
npm install xactions
```

`scrape.js`:

```js
import { Scraper } from 'xactions/client';

const scraper = new Scraper();

// Guest tier — works with no session at all
const profile = await scraper.getProfile('nasa');
console.log(`${profile.name} has ${profile.followersCount.toLocaleString()} followers`);

// Timelines stream, so you can stop early on a huge account
let count = 0;
for await (const tweet of scraper.getTweets('nasa', 25)) {
  const engagement = (tweet.likes || 0) + (tweet.retweets || 0);
  if (engagement > 1000) {
    console.log(`${engagement} — ${tweet.text.slice(0, 70)}`);
  }
  count += 1;
}
console.log(`Scanned ${count} posts.`);
```

```bash
node scrape.js
```

`getTweets`, `getFollowers`, `getFollowing`, `searchTweets`, and the rest are
async generators. They page under the hood and yield as results arrive, so a
`break` costs you nothing and memory stays flat regardless of the account size.

### Adding a session in code

```js
const scraper = new Scraper();
await scraper.setCookies(`auth_token=${process.env.X_AUTH_TOKEN}; ct0=${process.env.X_CSRF_TOKEN}`);

for await (const follower of scraper.getFollowers('nasa', 200)) {
  console.log(follower.username, follower.followersCount);
}
```

Or reuse a browser-exported cookie jar, which is more robust because it carries
everything X expects:

```js
await scraper.loadCookies('./cookies.json');
await scraper.saveCookies('./cookies.json');  // persist a refreshed session
```

---

## Step 6 — Handle failure properly

Errors carry a machine-readable `code`, so you can branch on the failure kind
instead of matching on message text:

```js
try {
  const profile = await scraper.getProfile('some_account');
  console.log(profile.name);
} catch (error) {
  switch (error.code) {
    case 'AUTH_REQUIRED':
      console.error('Log in first.');
      break;
    case 'RATE_LIMITED':
      console.error('Throttled. Retry after', error.rateLimitReset);
      break;
    default:
      console.error(`${error.code}: ${error.message} (HTTP ${error.httpStatus})`);
  }
}
```

Guest tokens are throttled hard. If you are doing read-heavy work, logging in
raises the ceiling substantially, quite apart from unlocking the session tier.

---

---

## Step 7 — Check your footing

`doctor` is the command to run when anything is confusing. It tests the guest
tier for real, reports whether a session is saved and still valid, and tells you
what each problem's fix is:

```bash
npx xactions doctor
```

```
⚡ XActions doctor  v3.5.0

  Environment
  ✓ Node                 Node 24.14.0
  ✓ Browser              Chromium installed for browser-driven commands
  ✓ MCP server           MCP server exposes 154 tools
  ! Skills               No skills installed (claude 0, cursor 0, codex 0, windsurf 0)
    → Run `xactions skills install --all --global` so your agent knows which script to reach for.
  ✓ GraphQL query IDs    148 query IDs cached, 13h old (/home/you/.xactions/query-ids.json)

  Guest tier (works with no account)
  ✓ Profile read         Read @NASA without a login (92,356,564 followers)
  ✓ Timeline read        Pulled 3 posts from @nasa without a login

  Session tier (search, followers, DMs)
  ! Session saved        No session saved, so only the guest tier is available
    → Run `xactions connect` to unlock search, followers, following, likes, bookmarks and DMs.
```

It exits non-zero when something is actually broken, so a cron job can check
itself before doing work. `npx xactions quickstart` is the friendlier version of
the same idea, and `npx xactions quickstart --json` gives you `{"tier":"guest"}`
or `{"tier":"session"}` for a script.

---

## What you learned

- Guest tier vs session tier, and why session-tier failures look like 404s
- `xactions connect` and `login --from-browser` beat copying cookies by hand
- `auth_token` **and** `ct0`, not just the first
- The CLI and the library are the same thing with different skins
- Timelines are async generators: stream them, do not collect them
- Errors carry `code`, `httpStatus`, and `rateLimitReset`

## Next

- **[Tutorial 02 — Claude that can use X](02-mcp-with-claude.md)** — hand all of
  this to an AI assistant
- [Examples](../examples/) — the same operations as runnable programs
- [CLI reference](../docs/cli-reference.md) — every command
- [Troubleshooting](../docs/troubleshooting.md) — when something does not work
