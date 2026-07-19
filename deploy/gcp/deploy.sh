#!/usr/bin/env bash
# Copyright (c) 2024-2026 nich (@nichxbt). Business Source License 1.1.
# ─────────────────────────────────────────────────────────────────────────────
# Deploy the XActions API backend to Google Cloud Run.
#
# One command, from the repo root:
#     PROJECT_ID=your-gcp-project bash deploy/gcp/deploy.sh
#
# It builds the existing Dockerfile (Node 24 + system Chromium for Puppeteer),
# generates and stores the internal secrets (JWT/session/admin) in Secret
# Manager, wires any external creds you dropped in deploy/gcp/.env.gcp, deploys
# to Cloud Run, and prints the exact command to point the Cloudflare Worker's
# API_ORIGIN at the new service.
#
# What works with ZERO external creds: the read surface the Worker proxies —
# scrapers, analytics, and paid x402 read execution. Boot does not require a
# database (the server warns instead of exiting; start.sh skips migrations).
#
# What needs creds in deploy/gcp/.env.gcp before it works:
#   DATABASE_URL              user accounts, unfollower history, license
#   TWITTER_CLIENT_ID/SECRET  "Sign in with X" OAuth
#   STRIPE_SECRET_KEY + ...   billing / Pro plans
# Add them any time and re-run this script — it's idempotent.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || true)}"
REGION="${REGION:-us-central1}"
SERVICE="${SERVICE:-xactions-api}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

log()  { printf '\033[0;32m✅ %s\033[0m\n' "$1"; }
warn() { printf '\033[1;33m⚠️  %s\033[0m\n' "$1"; }
die()  { printf '\033[0;31m❌ %s\033[0m\n' "$1"; exit 1; }

[ -n "$PROJECT_ID" ] || die "Set PROJECT_ID (env var) or run: gcloud config set project <id>"
gcloud auth print-access-token >/dev/null 2>&1 || die "gcloud not authenticated. Run: gcloud auth login"

echo "Project:  $PROJECT_ID"
echo "Region:   $REGION"
echo "Service:  $SERVICE"
echo "──────────────────────────────────────────"

# 1. APIs
log "Enabling required APIs (run, cloudbuild, secretmanager, artifactregistry)…"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
  secretmanager.googleapis.com artifactregistry.googleapis.com \
  --project "$PROJECT_ID" --quiet

# 2. Secret Manager — internal secrets, generated once and reused thereafter.
ensure_secret() {  # name, value
  local name="$1" value="$2"
  if ! gcloud secrets describe "$name" --project "$PROJECT_ID" >/dev/null 2>&1; then
    gcloud secrets create "$name" --replication-policy=automatic --project "$PROJECT_ID" --quiet
    printf '%s' "$value" | gcloud secrets versions add "$name" --data-file=- --project "$PROJECT_ID" --quiet
    log "Created secret $name"
  fi
}
put_secret() {   # name, value  (always adds a new version)
  local name="$1" value="$2"
  gcloud secrets describe "$name" --project "$PROJECT_ID" >/dev/null 2>&1 \
    || gcloud secrets create "$name" --replication-policy=automatic --project "$PROJECT_ID" --quiet
  printf '%s' "$value" | gcloud secrets versions add "$name" --data-file=- --project "$PROJECT_ID" --quiet
}

log "Ensuring internal secrets (generated with openssl, stored in Secret Manager)…"
ensure_secret XACTIONS_JWT_SECRET     "$(openssl rand -hex 32)"
ensure_secret XACTIONS_SESSION_SECRET "$(openssl rand -hex 32)"
ensure_secret XACTIONS_ADMIN_API_KEY  "$(openssl rand -hex 24)"

SECRET_FLAGS="JWT_SECRET=XACTIONS_JWT_SECRET:latest,SESSION_SECRET=XACTIONS_SESSION_SECRET:latest,ADMIN_API_KEY=XACTIONS_ADMIN_API_KEY:latest"

# 3. External creds (optional) — anything set in deploy/gcp/.env.gcp is pushed
#    to Secret Manager and wired in. Absent creds simply leave those routes off.
ENV_FILE="$REPO_ROOT/deploy/gcp/.env.gcp"
if [ -f "$ENV_FILE" ]; then
  log "Loading external creds from deploy/gcp/.env.gcp…"
  while IFS='=' read -r key val; do
    [[ "$key" =~ ^[[:space:]]*# ]] && continue
    [ -z "${key// }" ] && continue
    val="${val%\"}"; val="${val#\"}"
    [ -z "$val" ] && continue
    sname="XACTIONS_${key}"
    put_secret "$sname" "$val"
    SECRET_FLAGS="$SECRET_FLAGS,${key}=${sname}:latest"
    log "Wired external secret $key"
  done < "$ENV_FILE"
else
  warn "No deploy/gcp/.env.gcp — deploying read-only (scrapers + x402 reads)."
  warn "Auth/billing routes will 500 until you add DATABASE_URL / TWITTER_* / STRIPE_* there and re-run."
fi

# 4. Deploy — Cloud Build builds the repo Dockerfile, then Cloud Run serves it.
log "Building and deploying to Cloud Run (this builds Chromium image, ~4-6 min)…"
gcloud run deploy "$SERVICE" \
  --source "$REPO_ROOT" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --concurrency 40 \
  --min-instances 0 \
  --max-instances 4 \
  --set-env-vars "NODE_ENV=production,PUPPETEER_HEADLESS=true,PUPPETEER_NO_SANDBOX=true,PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium,X402_NETWORK=eip155:8453" \
  --set-secrets "$SECRET_FLAGS" \
  --quiet

URL="$(gcloud run services describe "$SERVICE" --project "$PROJECT_ID" --region "$REGION" --format='value(status.url)')"
echo "──────────────────────────────────────────"
log "Deployed: $URL"
echo ""
echo "Health check:"
echo "  curl -s $URL/api/health"
echo ""
echo "Point the Cloudflare Worker at it (makes /api reads live on xactions.app):"
echo "  cd $REPO_ROOT && npx wrangler deploy --var API_ORIGIN:$URL"
echo ""
log "Done."
