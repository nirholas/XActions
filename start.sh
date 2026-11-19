#!/bin/sh

# Run database migrations only if DATABASE_URL is available
if [ -n "$DATABASE_URL" ]; then
  echo "🔄 Running database migrations..."
  # Fresh DB: migrate deploy runs 0_init SQL and creates all tables.
  # Existing DB created with `db push` (tables but no migration history):
  # Prisma refuses with P3005 "The database schema is not empty". That one case,
  # and only that one, is resolved by marking the baseline as applied and
  # deploying again. Any other failure (unreachable database, bad credentials,
  # a migration whose SQL fails) stops the container: starting the API against a
  # schema it does not match only moves the failure to the first request.
  if ! migrate_output=$(npx prisma migrate deploy 2>&1); then
    echo "$migrate_output"
    if echo "$migrate_output" | grep -qE 'P3005|database schema is not empty'; then
      echo "⚠️  Tables exist without migration history - marking baseline as applied..."
      npx prisma migrate resolve --applied "0_init" && npx prisma migrate deploy || {
        echo "❌ Baselining the existing database failed; not starting the API."
        exit 1
      }
    else
      echo "❌ Database migration failed; not starting the API."
      exit 1
    fi
  else
    echo "$migrate_output"
  fi
else
  echo "⚠️ DATABASE_URL not set, skipping migrations"
fi

exec node api/server.js
