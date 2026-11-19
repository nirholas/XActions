# Configuration

XActions is configured in four places, and which ones you need depends entirely
on which surface you use.

| Surface | Configuration needed |
|---------|----------------------|
| Browser console scripts | None. Edit the `CONFIG` block in the script. |
| CLI | `~/.xactions/config.json`, written by `xactions login`. |
| Node.js library | Cookies passed in code, or `X_AUTH_TOKEN` / `X_CSRF_TOKEN`. |
| MCP server | Environment block in your AI client's MCP config. |
| Self-hosted API and dashboard | `.env`. |

Only the last one needs a `.env` file at all. Copy [`.env.example`](../.env.example)
if you are running the server.

---

## Session cookies

Everything that reads private or session-tier data needs two cookies from a
logged-in x.com session.

**Where to get them:** the CLI can read them for you, which is faster and less
error-prone than copying by hand.

```bash
xactions login --from-browser firefox     # also: chrome, chromium, brave, edge, arc
xactions login --cookies-file cookies.txt # Netscape, Cookie-Editor JSON, Playwright storageState
xactions connect                          # log in through a real browser window
```

By hand: open [x.com](https://x.com), log in, then DevTools
(<kbd>F12</kbd>), **Application**, **Cookies**, `https://x.com`.

| Cookie | What it is | Required |
|--------|------------|:--------:|
| `auth_token` | Your session. Treat it like a password. | yes |
| `ct0` | CSRF token X requires as a request header. | yes |

**Both are required.** With only `auth_token`, X still treats the request as
logged out, and search, followers, likes, bookmarks, and DMs all answer `404`.
This is the single most common configuration mistake.

### CLI

```bash
npx xactions login
```

Prompts for both and writes `~/.xactions/config.json`:

```json
{
  "authToken": "...",
  "csrfToken": "..."
}
```

`xactions logout` removes it.

### Library and examples

```bash
export X_AUTH_TOKEN=...
export X_CSRF_TOKEN=...
```

or in code:

```js
import { Scraper } from 'xactions/client';

const scraper = new Scraper();
await scraper.setCookies(`auth_token=${authToken}; ct0=${csrfToken}`);
```

A full cookie jar exported from the browser also works and is preferred when
you have one, because it carries everything X expects:

```js
await scraper.loadCookies('./cookies.json');   // [{ "name": "auth_token", "value": "..." }, ...]
await scraper.saveCookies('./cookies.json');   // persist a refreshed session
```

### MCP server

Set them in the `env` block of your AI client's MCP configuration, not in a
`.env` file. MCP servers are spawned with a minimal environment:

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

Without them the server still starts and still serves all 155 tools. The
guest-tier ones (profiles, public timelines) work and the rest report that they
need a session.

### MCP server flags and env

| Variable | Flag | Effect |
|----------|------|--------|
| `XACTIONS_MCP_TOOLS` | `--tools <list>` | Expose only these tools. Accepts tool names, group names, or `prefix*` patterns, comma separated. |
| `XACTIONS_MCP_EXCLUDE` | `--exclude <list>` | Hide these, same syntax. |
| `XACTIONS_MCP_REQUIRE_APPROVAL` | `--require-approval` | Hold every write call as a draft. Nothing reaches X until `xactions drafts approve <id>` runs in a terminal. |
| `MCP_TRANSPORT=http` | `--http` | Serve Streamable HTTP on `/mcp` instead of stdio. |
| `XACTIONS_MCP_HOST` | `--host <addr>` | HTTP bind address, default `127.0.0.1`. |
| `PORT` | `--port <n>` | HTTP port, default `8787`. |
| `XACTIONS_MCP_TOKEN` | none | Required bearer token for `--http`. Never expose the HTTP transport without one. |
| `XACTIONS_ACTION_CAPS` | none | JSON object overriding the daily per-action caps. Also readable from `~/.xactions/action-caps.json`. |
| `XACTIONS_ACCOUNT` | none | Names which account the daily action ledger is charged against. Default `default`. |

`npx xactions-mcp --list-groups` prints every group with its tools, which is the
fastest way to build a `--tools` value. The groups are `read`, `analytics`,
`write`, `automation`, `monitoring`, `workflows`, `ai`, `data`, `graph`,
`persona`, `dm`, `lists`, `spaces`, `grok`, `auth` and `drafts`. The `drafts`
group is always available regardless of `--tools`, so an agent can always report
what it is waiting on.

### Keeping them out of your repo

`.env`, `.env.local`, and `cookies.json` are gitignored. A leaked `auth_token`
is a full account takeover, so:

- Never paste one into an issue, a screenshot, or a PR.
- Log out of x.com in that browser to invalidate a token you think leaked.
- Prefer a secondary account for automation.

---

## Environment variables

Only relevant when self-hosting the API server or dashboard. Grouped by what
they turn on; nothing here is needed for the CLI, the library, or console
scripts.

### Server

| Variable | Default | Notes |
|----------|---------|-------|
| `NODE_ENV` | `development` | `production` enables stricter startup checks. |
| `PORT` | `3001` | HTTP port. |
| `API_URL` | `http://localhost:3001` | Public base URL, used in generated links. |
| `FRONTEND_URL` | `http://localhost:3000` | Used for CORS and redirects. |
| `DEV_ORIGINS` | localhost:3000, 3001, 5173 | Development only: the comma-separated CORS origins, replacing the localhost defaults. Production allows `https://xactions.app` and `FRONTEND_URL`. |
| `TRUST_PROXY` | `1` on Fly, Railway and Render; off elsewhere | How many proxies sit in front of the API, so rate limits see the real client IP (any Express `trust proxy` value works). Never set it higher than the real number of proxies: clients could then choose their own IP with `X-Forwarded-For`. |

### Security

| Variable | Notes |
|----------|-------|
| `JWT_SECRET` | **Required in production.** The server refuses to start without it. |
| `SESSION_SECRET` | **Required in production.** Same. |
| `ADMIN_API_KEY` | Guards the admin endpoints. Generate with `openssl rand -hex 32`. |
| `COOKIE_ENCRYPTION_KEY` | Encrypts saved X sessions, and the session a running monitor or RSS feed keeps so it can act later. Falls back to `SESSION_SECRET`, then `JWT_SECRET`. Changing it makes saved sessions unreadable, so users save them again. |
| `XACTIONS_WEBHOOK_ALLOW_PRIVATE` | `true` lets webhooks and notifications deliver to private or internal addresses. Off by default, so a caller cannot point the server at its own network. |

### Database and queue

| Variable | Notes |
|----------|-------|
| `DATABASE_URL` | PostgreSQL connection string. See [database.md](database.md). |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` | Backing store for the background job queue. |
| `REDIS_QUEUE_PREFIX` | Key prefix for the queue, so one Redis can serve several deployments. Default `xactions`. |
| `XACTIONS_WORKER_CONCURRENCY` | How many jobs one worker process runs at once. Default `8`; each job type also keeps its own lower limit. See [architecture.md](architecture.md#background-jobs). |
| `XACTIONS_HOME` | Where the worker keeps per-caller state that is not in Postgres or Redis: the daily action ledger, follow dates for smart unfollow, saved RSS feeds, personas, workflows, teams and exports, and the analytics, CRM and lead store. Default `~/.xactions`. Run one worker host, or put it on a shared volume. |

### Scraping

| Variable | Notes |
|----------|-------|
| `XACTIONS_SESSION_COOKIE` | `auth_token` value. |
| `XACTIONS_CSRF_TOKEN` | `ct0` value. |
| `XACTIONS_MODE` | `local` (Puppeteer, free) or `remote` (hosted API). |
| `XACTIONS_API_URL` | Endpoint used in `remote` mode. |
| `XACTIONS_SCRAPER_ADAPTER` | `puppeteer` (default), `playwright`, or `http`. |

### Puppeteer

| Variable | Notes |
|----------|-------|
| `PUPPETEER_HEADLESS` | `true` in servers, `false` to watch a run. |
| `PUPPETEER_NO_SANDBOX` | Set `true` in Docker and when running as root. |
| `PUPPETEER_EXECUTABLE_PATH` | Point at a system Chromium instead of the bundled one. |

### Optional integrations

| Variable | Enables |
|----------|---------|
| `OPENROUTER_API_KEY` | LLM-backed sentiment mode and AI tweet generation. |
| `TWITTER_CLIENT_ID` / `TWITTER_CLIENT_SECRET` | OAuth 2.0 login in the dashboard. |
| `STRIPE_*` | Subscription billing. |
| `X402_*` | Per-request payments on the hosted API. Documented inline in [`.env.example`](../.env.example); verify a setup with `npm run verify:x402`. |
| `SENTRY_DSN` | Error reporting. |

---

## Personas and niches

The autonomous agent reads two JSON files that decide what it talks about and
how it sounds. Both live in [`config/`](../config/) and are plain data, so
adding your own is a matter of dropping in a file.

### Personas: how the agent writes

[`config/personas/`](../config/personas/) ships three:
`thought-leader`, `technical-builder`, `community-builder`.

```json
{
  "name": "ThoughtLeader",
  "tone": "opinionated, visionary, contrarian but well-reasoned",
  "expertise": ["technology trends", "industry analysis"],
  "opinions": ["The next decade belongs to builders, not fundraisers"],
  "avoid": ["empty platitudes", "engagement farming", "corporate jargon"],
  "exampleTweets": ["..."]
}
```

`avoid` matters more than it looks. It is the difference between output that
reads like a person and output that reads like a bot, and it is the first field
worth editing.

### Niches: what the agent looks at

[`config/niches/`](../config/niches/) ships `ai-engineering`, `saas-startups`,
and `web3-crypto`.

```json
{
  "name": "AI Engineering",
  "searchTerms": ["AI agents", "LLM engineering", "prompt engineering"]
}
```

The agent uses these to find accounts and posts worth engaging with, which is
also how it trains your timeline algorithm toward a topic.

### Agent settings

Copy [`config/agent-config.example.json`](../config/agent-config.example.json)
to `data/agent-config.json` and edit, or run the wizard:

```bash
npx xactions agent setup
```

---

## Console script settings

Browser scripts are configured in the script itself. Every one opens with a
`CONFIG` block:

```js
const CONFIG = {
  maxUnfollows: Infinity,
  whitelist: [],
  dryRun: true,       // Preview without acting. Set false to run.
  delay: 2000,
};
```

Most destructive scripts ship with `dryRun: true`, but not all of them do, and
the ones that do not act on the first run. **Read the `CONFIG` block before you
paste.** See [browser-scripts.md](browser-scripts.md#start-in-dry-run).

---

## Related

- [Getting Started](getting-started.md)
- [Database Schema](database.md)
- [MCP Setup](mcp-setup.md)
- [Deployment](deployment.md)
- [Troubleshooting](troubleshooting.md)
