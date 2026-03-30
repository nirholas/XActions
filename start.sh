#!/bin/sh
set -e

# Deploy database migrations.
# Fresh DB: migrate deploy runs 0_init SQL and creates all tables.
# Existing DB (created with db push, no migration history): deploy fails on
# "relation already exists", so we mark the baseline as applied and redeploy
# to pick up any newer migrations.
npx prisma migrate deploy || {
  echo "⚠️  Tables exist without migration history - marking baseline as applied..."
  npx prisma migrate resolve --applied "0_init"
  npx prisma migrate deploy
}

exec node api/server.js
