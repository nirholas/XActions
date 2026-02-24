# Deployment Guide

> Deploy XActions anywhere — Cloudflare, Railway, Fly.io, Render, Docker, or self-host. All free tiers supported.

## Architecture

XActions has two deployable components:

| Component | What | Needs |
|---|---|---|
| **Static Frontend** | `dashboard/` — HTML/CSS/JS pages | Any static host (CDN) |
| **API Backend** | `api/server.js` — Express + Puppeteer + WebSocket | Node.js 20+, Chromium, Postgres, Redis |

You can deploy them together (Docker, Fly.io, Railway) or split them across services (Cloudflare Pages + Railway).

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
| **Cloudflare Pages** | ✅ | ❌ | Unlimited bandwidth | `wrangler.toml` |
| **Vercel** | ✅ | ❌ | 100GB bandwidth | `vercel.json` |
| **Railway** | ❌ | ✅ | $5 credit/mo | `railway.json` |
| **Fly.io** | ❌ | ✅ | 3 shared VMs | `fly.toml` |
| **Render** | ✅ | ✅ | 750 hrs/mo web | `render.yaml` |
| **Docker** | ✅ | ✅ | Free (self-host) | `docker-compose.yml` |
| **Coolify** | ✅ | ✅ | Free (self-host) | `docker-compose.coolify.yml` |

**Recommended combo:** Cloudflare Pages (frontend) + Railway (backend)

---

## Cloudflare Pages (Frontend)

Free: unlimited requests, 500 builds/month, global edge CDN.

### Option A: GitHub Integration (Recommended)

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) → Pages
2. Create a project → Connect GitHub → Select `nirholas/XActions`
3. Build configuration:
   - **Build command:** (leave empty)
   - **Build output directory:** `dashboard`
4. Deploy

### Option B: CLI

```bash
npm install -g wrangler
wrangler login
wrangler pages deploy dashboard --project-name=xactions
```

### Option C: GitHub Actions (Automatic)

Set these GitHub secrets:
- `CLOUDFLARE_API_TOKEN` — [Create token](https://dash.cloudflare.com/profile/api-tokens) with "Cloudflare Pages: Edit" permission
- `CLOUDFLARE_ACCOUNT_ID` — Found in Cloudflare dashboard sidebar

Deploys automatically on push to `main` when `dashboard/` changes.

### Custom Domain

```bash
wrangler pages project list
# In Cloudflare dashboard: Pages → xactions → Custom domains → Add
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
