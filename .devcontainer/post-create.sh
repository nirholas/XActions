#!/usr/bin/env bash
# Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
#
# Runs once, when the dev container is created.
#
#   bash .devcontainer/post-create.sh          default: dependencies and the CLI
#   bash .devcontainer/post-create.sh --full   also: API secrets and database migrations
#
# @author nich (@nichxbt)

set -euo pipefail
cd "$(dirname "$0")/.."

# The root install covers the api/ workspace too.
npm ci

# Needs no database. Tests and the API import the generated client.
npx prisma generate

# Puts `xactions`, `xactions-mcp` and `xactions-agent` on the PATH, pointing at
# this checkout, so an edit under src/ is live in the next command.
npm link

if [ "${1:-}" != "--full" ]; then
  exit 0
fi

# The API signs sessions with JWT_SECRET and encrypts saved X cookies with
# SESSION_SECRET. Neither belongs in a committed file, so each container makes its
# own, in its home directory rather than the workspace, and every new shell
# exports them for `npm run dev`. Rebuilding the container makes new ones, which
# only signs out local dashboard sessions.
env_file="$HOME/.xactions-dev.env"
if [ ! -f "$env_file" ]; then
  (
    umask 077
    node -e "const { randomBytes } = require('node:crypto');
      for (const name of ['JWT_SECRET', 'SESSION_SECRET']) console.log(name + '=' + randomBytes(32).toString('hex'));" > "$env_file"
  )
fi
for rc in "$HOME/.bashrc" "$HOME/.zshrc"; do
  if [ -f "$rc" ] && ! grep -qF "$env_file" "$rc"; then
    printf '\n# XActions API secrets for this container\nset -a; . "%s"; set +a\n' "$env_file" >> "$rc"
  fi
done

# compose.yaml starts the app container only once PostgreSQL reports healthy.
npx prisma migrate deploy
