#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# XActions — Quick Deploy Script
# Detects available platforms and deploys accordingly
# Usage: ./scripts/deploy.sh [platform]
# Platforms: railway, cloudflare, fly, render, docker
# by nichxbt
# ═══════════════════════════════════════════════════════════════════════════════

set -e

PLATFORM="${1:-auto}"
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}✅ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
err()  { echo -e "${RED}❌ $1${NC}"; exit 1; }

echo "🚀 XActions Deploy Script"
echo "───────────────────────────"

# ─────────────────────────────────────────────────────────────────────────────
# Auto-detect platform
# ─────────────────────────────────────────────────────────────────────────────
if [ "$PLATFORM" = "auto" ]; then
  if command -v railway &> /dev/null && [ -n "$RAILWAY_TOKEN" ]; then
    PLATFORM="railway"
  elif command -v fly &> /dev/null; then
    PLATFORM="fly"
  elif command -v wrangler &> /dev/null; then
    PLATFORM="cloudflare"
  elif command -v docker &> /dev/null; then
    PLATFORM="docker"
  else
    echo ""
    echo "Available platforms:"
    echo "  railway     — Railway.app (recommended, already configured)"
    echo "  cloudflare  — Cloudflare Pages (static frontend only)"
    echo "  fly         — Fly.io (full stack)"
    echo "  render      — Render.com (full stack)"
    echo "  docker      — Docker Compose (self-host)"
    echo ""
    echo "Usage: ./scripts/deploy.sh <platform>"
    exit 1
  fi
  log "Auto-detected platform: $PLATFORM"
fi

# ─────────────────────────────────────────────────────────────────────────────
# Deploy functions
# ─────────────────────────────────────────────────────────────────────────────

deploy_railway() {
  command -v railway &> /dev/null || err "Railway CLI not installed. Run: npm install -g @railway/cli"
  echo "📦 Deploying API to Railway..."
  railway up --service xactions-api
  log "Railway deploy complete!"
  echo ""
  echo "📝 Don't forget to set these in Railway dashboard:"
  echo "   DATABASE_URL, JWT_SECRET, REDIS_HOST, REDIS_PORT"
}

deploy_cloudflare() {
  command -v wrangler &> /dev/null || err "Wrangler CLI not installed. Run: npm install -g wrangler"
  echo "📦 Deploying dashboard to Cloudflare Pages..."
  wrangler pages deploy dashboard --project-name=xactions
  log "Cloudflare Pages deploy complete!"
}

deploy_fly() {
  command -v fly &> /dev/null || err "Fly CLI not installed. See: https://fly.io/docs/hands-on/install-flyctl/"
  
  # Check if app exists
  if ! fly apps list 2>/dev/null | grep -q "xactions"; then
    echo "📦 Creating Fly.io app..."
    fly launch --no-deploy --name xactions
    echo ""
    echo "📝 Setting up Fly Postgres..."
    fly postgres create --name xactions-db || warn "Postgres may already exist"
    fly postgres attach xactions-db || warn "Postgres may already be attached"
  fi
  
  echo "📦 Deploying to Fly.io..."
  fly deploy
  log "Fly.io deploy complete!"
}

deploy_render() {
  echo "📦 Render.com deploys via GitHub integration."
  echo ""
  echo "Steps:"
  echo "  1. Go to https://dashboard.render.com"
  echo "  2. Click 'New' → 'Blueprint'"
  echo "  3. Connect your GitHub repo (nirholas/XActions)"
  echo "  4. Render auto-detects render.yaml"
  echo "  5. Click 'Apply'"
  echo ""
  log "render.yaml is ready — just connect the repo!"
}

deploy_docker() {
  command -v docker &> /dev/null || err "Docker not installed"
  
  if [ ! -f ".env" ]; then
    warn "No .env file found. Copying from .env.example..."
    cp .env.example .env
    echo "📝 Edit .env with your production values before deploying!"
    exit 1
  fi
  
  echo "📦 Building and starting XActions stack..."
  docker compose up -d --build
  
  echo ""
  echo "Waiting for services to be healthy..."
  sleep 10
  
  # Check health
  if docker compose ps | grep -q "healthy"; then
    log "Docker stack is running!"
    echo ""
    echo "🌐 API:       http://localhost:3001"
    echo "📊 Health:    http://localhost:3001/api/health"
    echo "🗄️  Postgres:  localhost:5432"
    echo "📮 Redis:     localhost:6379"
  else
    warn "Some services may still be starting. Check: docker compose ps"
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Execute
# ─────────────────────────────────────────────────────────────────────────────
case "$PLATFORM" in
  railway)    deploy_railway ;;
  cloudflare) deploy_cloudflare ;;
  fly)        deploy_fly ;;
  render)     deploy_render ;;
  docker)     deploy_docker ;;
  *)          err "Unknown platform: $PLATFORM" ;;
esac

echo ""
echo "───────────────────────────"
echo "🎉 Done! XActions deployed via $PLATFORM"
