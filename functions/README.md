# Cloudflare Pages Functions

The dynamic half of [xactions.app](https://xactions.app). Everything in this
directory runs on Cloudflare's edge as part of the same Pages deployment that
serves the static site, so the endpoints below work with **no backend server,
no database, and no browser automation**.

```
functions/
  mcp.js               ALL  /mcp   the hosted MCP server
  openapi.json.js      GET  /openapi.json
  .well-known/
    mcp.json.js        GET  /.well-known/mcp.json
    x402.js            GET  /.well-known/x402
  api/
    health.js          GET  /api/health
    ask.js             POST /api/ask
    ask/
      health.js        GET  /api/ask/health
    ai/
      health.js        GET  /api/ai/health
      pricing.js       GET  /api/ai/pricing
    [[path]].js        catch-all for every other /api/* route
    video/
      extract.js       POST /api/video/extract
      extract-form.js  POST /api/video/extract-form
      download.js      GET  /api/video/download
```

## Why this exists

`dashboard/_redirects` used to forward `/api/*` to a Node backend on another
host. Cloudflare Pages rejects a 200-proxy rule pointing at a different origin
("Proxy (200) redirects can only point to relative paths"), so that rule never
took effect: `POST /api/video/extract` fell through to the static asset handler,
which answers a bare `405` for any non-GET method. That is what broke
[xactions.app/video](https://xactions.app/video).

The video downloader needs nothing a Node server provides, so it now runs here
instead.

## Endpoints

### `/mcp` - the hosted MCP server

A [Model Context Protocol](https://modelcontextprotocol.io) server over
Streamable HTTP, stateless, no authentication. Any agent connects with a URL:

```bash
claude mcp add --transport http xactions https://xactions.app/mcp
```

`POST` speaks JSON-RPC. `GET` with `Accept: application/json` returns a server
descriptor, and anything else gets the `/mcp-docs` page, so a human who pastes
the URL into a browser sees an explanation rather than a protocol error.

The page file is `dashboard/mcp-docs.html`, not `mcp.html`, on purpose: a file
named `mcp.html` makes the asset handler canonicalise `/mcp` back to itself, and
a browser follows that redirect into this function again.

Six read-only tools (four free, `x_profile` and `x_posts` priced per call in
USDC over x402), roughly 700 documentation resources, five prompts. The
protocol core and tool definitions live in [`src/mcp/`](../src/mcp); the full
guide is [docs/mcp-remote.md](../docs/mcp-remote.md).

### `GET /api/health`

Reports the edge surface and whether a Node origin is configured. `/status`
polls it.

```bash
curl https://xactions.app/api/health
```

### `POST /api/video/extract`

Body: `{ "url": "https://x.com/user/status/123" }`. Returns every mp4 variant
for the tweet, best quality first, plus thumbnail, duration, author and text.

```bash
curl -X POST https://xactions.app/api/video/extract \
  -H 'content-type: application/json' \
  -d '{"url":"https://x.com/SpaceX/status/2092648130856571283"}'
```

Successful lookups are held in the Cloudflare edge cache for an hour, keyed by
tweet ID; a cache hit comes back with `"cached": true`.

Status codes: `400` malformed URL, `404` no such tweet or no video in it, `502`
X could not be reached, `405` on a GET.

### `GET /api/video/download`

`?url=<mp4>&author=<handle>&tweetId=<id>`. Streams the mp4 back through
xactions.app with `Content-Disposition: attachment`, because a cross-origin
`<a download>` is ignored by browsers and `video.twimg.com` sends no CORS
headers. Only `video.twimg.com` and `pbs.twimg.com` are proxyable, so this can
never be turned into an open proxy.

### `POST /api/video/extract-form`

The no-JavaScript path: the page's `<form>` posts here natively and gets a `303`
to the download proxy for the best quality. Failures redirect to
`/video?error=invalid|novideo|failed`, which the page renders inline.

### `POST /api/ask`

Ask XActions. Body: `{ "question": "...", "history": [], "byok": {} }`. Streams
Server-Sent Events: a `sources` event with the documentation and repo chunks the
answer is grounded in, then `token` events, then `done`.

The retrieval index is the static asset `/data/ask-index.json`
(`npm run ask:index` builds it) and the LLM lanes are plain `fetch` calls, so
this needs no key: three lanes in the chain are keyless. Keyed lanes join
automatically when their variable is set on the Pages project.

```bash
curl -N -X POST https://xactions.app/api/ask \
  -H 'content-type: application/json' \
  -d '{"question":"How do I unfollow everyone?"}'
```

### `GET /api/ask/health`

Whether the index loaded, how many chunks it holds, and which lanes are in the
chain for this deployment.

### `GET /openapi.json` and `GET /.well-known/x402`

The OpenAPI 3.1 description of the AI API, and the x402 discovery document that
lets an agent find the paid endpoints and their prices without a human. Both are
generated from `api/openapi.js` and `api/config/x402-config.js`, the same
modules the Node server uses, so the published prices cannot drift from the
charged ones.

### `GET /api/ai/health` and `GET /api/ai/pricing`

Service status with the x402 facilitator and pay-to address, and the
per-operation price table. Without `XACTIONS_API_ORIGIN` the price table lists
only the edge resources in `src/edge/paidResources.js`, because those are the
only paid endpoints this deployment serves; with it, the full table.

### `/api/*` (catch-all)

Every other route in `api/routes/` needs Postgres, Redis, and Puppeteer. Set
`XACTIONS_API_ORIGIN` on the Pages project to forward them to a self-hosted
deployment; without it they answer a JSON `503` explaining that, instead of the
site's HTML 404 page, which no API client can parse.

## Extraction lanes

The lane chain lives in [`src/video/edgeExtractor.js`](../src/video/edgeExtractor.js)
so the Express API (`api/services/videoExtractor.js`) runs the identical code
with a Puppeteer lane added underneath. See
[docs/video-downloader.md](../docs/video-downloader.md#how-it-works).

## Environment variables

Both are optional, set on the Pages project (Settings, then Variables):

| Variable | Effect when unset |
|---|---|
| `TWITTER_BEARER_TOKEN` | The guest-token GraphQL lane is skipped. The two credential-free lanes still run. |
| `XACTIONS_API_ORIGIN` | Non-edge `/api/*` routes answer `503` instead of proxying. |

## Local development

Run the site and these functions together, from the repo root:

```bash
bash deploy/cloudflare/build.sh
npx wrangler pages dev pages-out --port 8788
```

Wrangler picks up `functions/` from the repo root automatically and compiles it
into the Pages Worker. Then open `http://127.0.0.1:8788/video`.

Serve `pages-out/`, not `dashboard/`: the root page comes from `site/`, and the
og images, icons, `robots.txt` and `sitemap.xml` come from `public/`. Pointing
wrangler at `dashboard/` puts the app shell at `/` and drops every public asset.

```bash
curl -X POST http://127.0.0.1:8788/api/video/extract \
  -H 'content-type: application/json' \
  -d '{"url":"https://x.com/SpaceX/status/2092648130856571283"}'
```

Tests for the shared extraction module:

```bash
npx vitest run tests/video/edgeExtractor.test.js
```

## Deployment

These functions ship with the site. `.github/workflows/deploy-cloudflare.yml`
assembles `pages-out/` with `deploy/cloudflare/build.sh` and then runs
`wrangler pages deploy pages-out --project-name=xactions --branch=main` on every
push to `main` that touches the site or the code behind these functions.

That workflow needs two repository secrets, `CLOUDFLARE_API_TOKEN` (Account,
then Cloudflare Pages, then Edit) and `CLOUDFLARE_ACCOUNT_ID`. Without them
wrangler exits 1 with *"it's necessary to set a CLOUDFLARE_API_TOKEN environment
variable"* and nothing reaches the site.

To deploy by hand:

```bash
export CLOUDFLARE_API_TOKEN=...
export CLOUDFLARE_ACCOUNT_ID=...
npm run deploy:pages
```

by nichxbt
