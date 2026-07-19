# Deploy the XActions backend to Google Cloud Run

The Cloudflare Worker serves the whole site and the edge API, and proxies the
**read** routes (scrapers, analytics, paid x402 read execution) plus auth to
`API_ORIGIN`. This directory stands that origin up on Cloud Run.

> Account actions (follow / unfollow / like / reply / post) do **not** run here —
> they run in the [browser extension](https://xactions.app/extension). This
> backend is reads, analytics, accounts, and billing only.

## One command

```bash
# from the repo root
PROJECT_ID=your-gcp-project bash deploy/gcp/deploy.sh
```

That script:

1. Enables `run`, `cloudbuild`, `secretmanager`, `artifactregistry`.
2. Generates `JWT_SECRET`, `SESSION_SECRET`, `ADMIN_API_KEY` with `openssl` and
   stores them in Secret Manager (once — reused on every later deploy).
3. Wires any external creds from `deploy/gcp/.env.gcp` (see below).
4. Builds the repo `Dockerfile` (Node 24 + system Chromium for Puppeteer) via
   Cloud Build and deploys it to Cloud Run (2 GiB / 2 vCPU, scales to zero).
5. Prints the service URL and the exact `wrangler` command to point the Worker's
   `API_ORIGIN` at it.

## What works with no credentials

The backend boots without a database (the server warns instead of exiting;
`start.sh` skips migrations when `DATABASE_URL` is unset). So a bare deploy
already serves the read surface the Worker proxies:

- `/api/ai/scrape/*`, `/api/ai/analytics/*`, `/api/ai/search/*`
- Paid x402 read execution

## What needs credentials

Copy the template and fill in only what you want on:

```bash
cp deploy/gcp/.env.gcp.example deploy/gcp/.env.gcp
# edit deploy/gcp/.env.gcp, then re-run deploy.sh — it's idempotent
```

| Feature | Needs |
|---|---|
| User accounts, unfollower history, licenses | `DATABASE_URL` (Neon / Supabase / Cloud SQL) |
| Sign in with X | `TWITTER_CLIENT_ID`, `TWITTER_CLIENT_SECRET` |
| Billing / Pro plans | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, price IDs |

`deploy/gcp/.env.gcp` is gitignored — real secrets never touch the repo. The
script pushes them to Secret Manager and references them by name.

## After it's live

```bash
# 1. sanity check
curl -s https://xactions-api-XXXX.run.app/api/health

# 2. make the reads live on xactions.app
npx wrangler deploy --var API_ORIGIN:https://xactions-api-XXXX.run.app
```

## Note on server-side scraping

X applies bot detection to datacenter IPs. Server-side scraping from Cloud Run
works but is rate-limited by X far more aggressively than the same scrape run
from a residential IP. For heavy scraping prefer the CLI or the
[extension](https://xactions.app/extension), which run on the user's own IP.
This backend is best for the paid x402 API, analytics, and account/billing
state — not high-volume scraping.
