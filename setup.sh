#!/bin/bash
# XActions — One-command setup for local development
# Starts PostgreSQL, installs deps, pushes schema, and runs the server
# Usage: bash setup.sh
# by nichxbt

set -e

echo "⚡ XActions Setup"
echo ""

# 1. Create .env if missing
if [ ! -f .env ]; then
  echo "📝 Creating .env from .env.example..."
  cp .env.example .env
  # Set dev-friendly defaults
  sed -i 's|DATABASE_URL=.*|DATABASE_URL="postgresql://xactions:xactions_dev_password@localhost:5432/xactions?schema=public"|' .env
  sed -i 's|JWT_SECRET=.*|JWT_SECRET=xactions-dev-secret-key-local-only|' .env
  sed -i 's|NODE_ENV=.*|NODE_ENV=development|' .env
else
  echo "✅ .env already exists"
fi

# 2. Start PostgreSQL via Docker (if not already running)
if docker ps --format '{{.Names}}' 2>/dev/null | grep -q 'xactions-db'; then
  echo "✅ PostgreSQL already running"
else
  echo "🐘 Starting PostgreSQL..."
  docker run -d --name xactions-db \
    -e POSTGRES_USER=xactions \
    -e POSTGRES_PASSWORD=xactions_dev_password \
    -e POSTGRES_DB=xactions \
    -p 5432:5432 \
    postgres:16-alpine 2>/dev/null || \
  docker start xactions-db 2>/dev/null || \
  echo "⚠️  Could not start PostgreSQL — try: docker compose up postgres -d"

  # Wait for PostgreSQL to be ready
  echo "   Waiting for PostgreSQL..."
  for i in $(seq 1 15); do
    if pg_isready -h localhost -p 5432 -U xactions 2>/dev/null; then
      break
    fi
    sleep 1
  done
fi

# 3. Install dependencies
echo "📦 Installing dependencies..."
npm install

# 4. Generate Prisma client + push schema
echo "🗄️  Setting up database schema..."
npx prisma generate
npx prisma db push

echo ""
echo "✅ Setup complete!"
echo ""
echo "   Start the server:  npm run dev"
echo "   Open dashboard:    http://localhost:3001"
echo "   Login page:        http://localhost:3001/login"
echo ""
