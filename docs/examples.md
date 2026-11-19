# Examples

Copy-paste snippets for the four ways to use XActions. For complete programs you
can run and edit, see [`examples/`](../examples/) — eight of them, each verified
against the live API.

---

## Command line

No install, no API key, no account:

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
  Following: 119  Followers: 92.2M
  Tweets:    74.3K  Listed:    97.0K
  ✓ Verified
```

More:

```bash
npx xactions tweets nasa --limit 100 --output nasa.csv   # timeline to a spreadsheet
npx xactions login                                        # unlock search, followers, DMs
npx xactions search "your brand" --limit 50               # what people are saying
npx xactions non-followers YOUR_USERNAME                  # who does not follow back
```

Every command is documented in the [CLI reference](cli-reference.md).

---

## Node.js library

```bash
npm install xactions
```

```js
import { Scraper } from 'xactions/client';

const scraper = new Scraper();

// Guest tier — no login needed
const profile = await scraper.getProfile('nasa');
console.log(profile.name, profile.followersCount);

// Timelines are async generators, so you can stop early on a huge account
for await (const tweet of scraper.getTweets('nasa', 25)) {
  console.log(tweet.id, tweet.text);
}
```

Session-tier reads (search, followers, likes, bookmarks, DMs) need cookies:

```js
await scraper.setCookies(`auth_token=${process.env.X_AUTH_TOKEN}; ct0=${process.env.X_CSRF_TOKEN}`);

for await (const follower of scraper.getFollowers('nasa', 200)) {
  console.log(follower.username, follower.followersCount);
}
```

Errors carry a machine-readable `code`, so you can branch on the failure kind
rather than matching on message text:

```js
try {
  await scraper.getProfile('some_account');
} catch (error) {
  if (error.code === 'AUTH_REQUIRED') {
    // X restricts this endpoint to logged-in sessions
  } else if (error.code === 'RATE_LIMITED') {
    console.log('retry after', error.rateLimitReset);
  }
}
```

---

## Browser console

Nothing installed at all. Open `x.com/YOUR_USERNAME/following`, open DevTools
(<kbd>F12</kbd>) then the **Console** tab, and paste
[`scripts/unfollowback.js`](../scripts/unfollowback.js).

Every destructive script opens with `dryRun: true`, so the first run previews
what it would do and changes nothing:

```js
const CONFIG = {
  maxUnfollows: 50,          // Start small
  whitelist: ['a_friend'],   // Never touch these
  dryRun: true,              // Preview — set false to run
  delay: 3000,               // ms between actions
};
```

All 93 scripts are catalogued in [browser-scripts.md](browser-scripts.md).

---

## Docker

```bash
docker build -t xactions .
docker run -it xactions xactions profile nasa

# Run the MCP server
docker run -p 3000:3000 xactions npm run mcp

# With a session
docker run -e XACTIONS_SESSION_COOKIE=your_auth_token xactions xactions followers nasa
```

---

## AI agents (MCP)

Point Claude Desktop, Cursor, or Windsurf at the MCP server and it gets 155
tools:

```json
{
  "mcpServers": {
    "xactions": {
      "command": "npx",
      "args": ["-y", "xactions-mcp"],
      "env": {
        "XACTIONS_SESSION_COOKIE": "your_auth_token",
        "XACTIONS_CSRF_TOKEN": "your_ct0"
      }
    }
  }
}
```

Then ask in plain language:

> Look up @nasa and @spacex. Compare their follower counts, posting frequency,
> and which one gets more engagement per post.

Setup details and troubleshooting: [mcp-setup.md](mcp-setup.md).

---

## Guest tier vs session tier

The one distinction that explains most questions about this tool:

| Tier | What it covers | Login |
|------|----------------|-------|
| **Guest** | Profiles, public user timelines | Not needed |
| **Session** | Search, followers, following, likes, bookmarks, DMs, home timeline | Required |

X answers a logged-out request to a session-tier endpoint with a bare `404`, so
those failures look like missing resources until you know to look for it.
XActions turns them into an `AUTH_REQUIRED` error that says what to do about it.

Getting cookies: DevTools, then **Application** then **Cookies** then
`https://x.com`, and copy `auth_token` **and** `ct0`. Both are required. See
[configuration.md](configuration.md).

---

## Next

- [Getting started](getting-started.md) — pick an interface and set it up
- [Runnable examples](../examples/) — complete programs
- [Tutorials](../tutorials/) — guided walkthroughs
- [Troubleshooting](troubleshooting.md) — when something does not work
