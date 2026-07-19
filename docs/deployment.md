# Deployment Guide

> Deploy XActions anywhere — Cloudflare, Railway, Fly.io, Render, Docker, or self-host. All free tiers supported.

## Architecture

XActions has two deployable components:

| Component | What | Needs |
|---|---|---|
| **Static Frontend** | `dashboard/` — HTML/CSS/JS pages | Any static host (CDN) |
| **API Backend** | `api/server.js` — Express + Puppeteer + WebSocket | Node.js 20+, Chromium, Postgres, Redis |

You can deploy them together (Docker, Fly.io, Railway) or split them across services (Cloudflare Workers for the site and edge API + Railway for the optional reads/analytics backend). X account actions run in the [browser extension](https://xactions.app/extension), not on any backend.

---

## Quick Start

```bash
# Auto-detect platform and deploy
./scripts/deploy.sh

# Or specify a platform
./scripts/deploy.sh railway
./scripts/deploy.sh cloudflare
./scripts/deploy.sh fly
./scripts/deploy.sh docker
```

---

## Platform Comparison

| Platform | Frontend | Backend | Free Tier | Config File |
|---|---|---|---|---|
| **Cloudflare Pages/Workers** | ✅ | Edge API + proxy | 100k req/day | `wrangler.toml` |
| **Google Cloud Run** | ❌ | ✅ | Pay-per-use, no idle cost | `deploy/gcp/cloudbuild-api.yaml` |
| **Vercel** | ✅ | ❌ | 100GB bandwidth | `vercel.json` |
| **Railway** | ❌ | ✅ | $5 credit/mo | `railway.json` |
| **Fly.io** | ❌ | ✅ | 3 shared VMs | `fly.toml` |
| **Render** | ✅ | ✅ | 750 hrs/mo web | `render.yaml` |
| **Docker** | ✅ | ✅ | Free (self-host) | `docker-compose.yml` |
| **Coolify** | ✅ | ✅ | Free (self-host) | `docker-compose.coolify.yml` |

**Recommended combo (what xactions.app runs today):** Cloudflare Pages (static site + dashboard) + Google Cloud Run (`xactions-api`, backed by Cloud SQL Postgres and a shared Memorystore Redis instance). Railway, Fly, and Render remain fully supported for self-hosters who prefer them.

---

## Cloudflare Workers (Full Site + Edge API)

xactions.app runs on a single Cloudflare Worker. It serves the entire public
surface (landing page, dashboard, docs, blog, static assets) from Workers
static assets, and handles the dynamic surface natively.

### The hosted model

| Surface | Where it runs |
|---|---|
| All pages, docs, blog, assets | Workers static assets (global CDN) |
| `/api/health`, `/api/ai/health`, `/api/ai/pricing` | Worker, at the edge |
| `/openapi.json`, `/.well-known/x402` | Worker, at the edge |
| `/api/ai/*` x402 payment gate (paid **reads**: scrape, analytics) | Worker, at the edge → `API_ORIGIN` |
| **X account actions** (follow, unfollow, like, reply, post) | **The [browser extension](https://xactions.app/extension)** |
| Other `/api/*` (auth, user, analytics) | Proxied to `API_ORIGIN` when set |

**Account actions are never executed server-side by the hosted service.**
Follow/unfollow/like/reply need your logged-in X session; running them from a
server would mean custodying your session token and driving your account from a
datacenter IP (an account-safety and X-ToS problem). Those routes return `501`
with a pointer to the extension, which performs them locally in your own
browser session. Self-hosters who want server-side execution can still run the
full Node backend (below) and set `API_ORIGIN`.

### Deploy

```bash
npx wrangler login          # once
npm run deploy:cloudflare   # builds dist-cloudflare/ and deploys the Worker
```

`npm run build:cloudflare` assembles `dist-cloudflare/` from `site/`,
`dashboard/`, `public/`, and the `llms*.txt` files, mirroring the old
`vercel.json` route table with plain file placement.

### Connect a backend (optional)

Reads (server-side scraping, analytics) and account features can run on the
full Node backend. Deploy it to Google Cloud Run (below, what production
uses), Railway, Fly, or Docker, then point the Worker/Pages proxy at it:

```bash
npx wrangler deploy --var API_ORIGIN:https://your-api.example.com
```

or set `API_ORIGIN` in `wrangler.toml`. On Cloudflare Pages, the same wiring
is a `dashboard/_redirects` rule (`/api/* https://your-api.example.com/api/:splat 200`).
Until it is set, those routes return a 503 explaining exactly this, and
everything else keeps working.

### Custom Domain

Cloudflare dashboard → Workers & Pages → `xactions` → Settings → Domains &
Routes → Add → `xactions.app`. If the DNS zone is already on Cloudflare this is
one step; TLS is automatic. (Delete any leftover apex A/CNAME record pointing
at a previous host first, or the attach is refused.)

---

## Google Cloud Run (Backend, current production)

xactions.app's `/api/*` traffic is proxied to a Cloud Run service named
`xactions-api`, backed by a dedicated Cloud SQL Postgres instance and a
Memorystore Redis instance shared with other services on the same GCP
project (Bull queue keys are namespaced with a `xactions` prefix so they
never collide — see `api/services/jobQueue.js`).

### One-time setup

```bash
gcloud auth login   # once per machine — needs a browser
bash deploy/gcp/provision-api.sh
```

This creates the Cloud SQL instance, Secret Manager entries
(`xactions-database-url`, `xactions-jwt-secret`, `xactions-session-secret`,
`xactions-admin-api-key`), the required IAM bindings, then builds and deploys
the image via Cloud Build. It prints the Cloud Run URL and the command to map
`api.xactions.app` to it.

### Redeploy after a code change

```bash
gcloud builds submit --config deploy/gcp/cloudbuild-api.yaml \
  --region us-central1 --project aerial-vehicle-466722-p5
```

### Health check

```bash
curl https://api.xactions.app/api/health
```

---

## Railway (Backend)

Free: $5 credit/month (no credit card needed), auto-sleep on inactivity.

### Deploy

1. Go to [Railway](https://railway.app) → New Project → Deploy from GitHub
2. Select `nirholas/XActions`
3. Railway auto-detects `railway.json` + `nixpacks.toml`
4. Add services:
   - **PostgreSQL** — Click "Add" → Database → PostgreSQL
   - **Redis** — Click "Add" → Database → Redis
5. Railway auto-wires `DATABASE_URL` and `REDIS_URL`
6. Set environment variables:
   ```
   JWT_SECRET=<generate with: openssl rand -hex 32>
   SESSION_SECRET=<generate with: openssl rand -hex 32>
   NODE_ENV=production
   FRONTEND_URL=https://xactions.pages.dev
   ```

### CLI Deploy

```bash
npm install -g @railway/cli
railway login
railway link  # connect to your project
railway up
```

### GitHub Actions (Automatic)

Set GitHub secret:
- `RAILWAY_TOKEN` — Get from Railway dashboard → Account → Tokens

Deploys automatically on push to `main` when `api/`, `src/`, or `prisma/` change.

---

## Fly.io (Full Stack)

Free: 3 shared-cpu VMs, 256MB RAM each, 3GB persistent storage.

### Deploy

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# First deploy
fly launch --no-deploy
fly postgres create --name xactions-db
fly postgres attach xactions-db
fly redis create --name xactions-redis

# Set secrets
fly secrets set JWT_SECRET=$(openssl rand -hex 32)
fly secrets set SESSION_SECRET=$(openssl rand -hex 32)

# Deploy
fly deploy

# Check status
fly status
fly logs
```

### Custom Domain

```bash
fly certs create yourdomain.com
# Add CNAME record: yourdomain.com → xactions.fly.dev
```

---

## Render (Full Stack)

Free: 750 hours/month web services, free PostgreSQL (90 days), static sites.

### Deploy

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New** → **Blueprint**
3. Connect GitHub repo → Select `nirholas/XActions`
4. Render reads `render.yaml` and creates:
   - `xactions-api` — Docker web service
   - `xactions-worker` — Background worker
   - `xactions-dashboard` — Static site
   - `xactions-db` — PostgreSQL
5. Click **Apply**

All environment variables are auto-configured via the blueprint.

> **Note:** Render's free PostgreSQL expires after 90 days. Either recreate or upgrade to $7/mo.

---

## Docker (Self-Host)

Free on any VPS (Oracle Cloud free tier, Hetzner, DigitalOcean, etc.)

### Quick Start

```bash
# Clone the repo
git clone https://github.com/nirholas/XActions.git
cd XActions

# Copy and edit environment variables
cp .env.example .env
# Edit .env — set JWT_SECRET, SESSION_SECRET at minimum

# Start everything
docker compose up -d

# Check status
docker compose ps
docker compose logs -f api

# Run database migrations
docker compose exec api npx prisma migrate deploy
```

### Services

| Service | Port | Description |
|---|---|---|
| `api` | 3001 | Express API + Dashboard |
| `worker` | — | Background job processor |
| `postgres` | 5432 | PostgreSQL 16 |
| `redis` | 6379 | Redis 7 |

### Useful Commands

```bash
# View logs
docker compose logs -f api

# Restart API
docker compose restart api

# Update to latest
git pull
docker compose up -d --build

# Database shell
docker compose exec postgres psql -U xactions

# Stop everything
docker compose down

# Stop and delete data
docker compose down -v
```

---

## Coolify (Self-Host with UI)

[Coolify](https://coolify.io) is a free, self-hosted Heroku/Vercel alternative.

### Deploy

1. Install Coolify on your VPS: `curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash`
2. In Coolify dashboard → New Resource → Docker Compose
3. Paste contents of `docker-compose.coolify.yml`
4. Set environment variables in Coolify UI
5. Deploy

Coolify auto-configures Traefik reverse proxy + Let's Encrypt SSL.

---

## Docker Image (GitHub Container Registry)

Pre-built images are published automatically on every push to `main`:

```bash
# Pull latest
docker pull ghcr.io/nirholas/xactions:main

# Run with external Postgres + Redis
docker run -d \
  -p 3001:3001 \
  -e NODE_ENV=production \
  -e DATABASE_URL="postgresql://..." \
  -e JWT_SECRET="your-secret" \
  -e REDIS_HOST="your-redis-host" \
  ghcr.io/nirholas/xactions:main
```

---

## Environment Variables

See `.env.example` for the full list. Required for production:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | Auth token signing key |
| `SESSION_SECRET` | Recommended | Session encryption key |
| `REDIS_HOST` | Recommended | Redis host for job queue |
| `REDIS_PORT` | Recommended | Redis port (default: 6379) |
| `NODE_ENV` | Recommended | Set to `production` |
| `FRONTEND_URL` | Optional | CORS origin for frontend |
| `PORT` | Optional | API port (default: 3001) |

Generate secrets:
```bash
openssl rand -hex 32
```

---

## CI/CD Workflows

All workflows are in `.github/workflows/`:

| Workflow | Trigger | Action |
|---|---|---|
| `ci.yml` | Push/PR to main | Tests + build check + Docker build |
| `deploy-railway.yml` | Push to main (api/src/prisma) | Deploy API to Railway |
| `deploy-cloudflare.yml` | Push to main (dashboard) | Deploy frontend to Cloudflare Pages |
| `docker-publish.yml` | Push to main + tags | Build & push to GitHub Container Registry |

### Required GitHub Secrets

| Secret | For | How to get |
|---|---|---|
| `RAILWAY_TOKEN` | Railway deploy | Railway dashboard → Account → Tokens |
| `CLOUDFLARE_API_TOKEN` | Cloudflare deploy | Cloudflare dashboard → API Tokens |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare deploy | Cloudflare dashboard sidebar |

`GITHUB_TOKEN` is automatic — no setup needed for Docker registry.

---

## Monitoring

After deployment, verify everything works:

```bash
# Health check
curl https://your-api-url/api/health

# Expected response:
# {"status":"ok","service":"xactions-api","timestamp":"..."}
```

Dashboard should be accessible at your frontend URL with all routes working (clean URLs like `/docs`, `/features`, `/mcp`).
