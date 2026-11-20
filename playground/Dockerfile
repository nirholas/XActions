# Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
#
# XActions Playground.
#
# Built from the repository root so the image can carry the three source
# directories the service imports, without vendoring a copy of them:
#
#   docker build -f playground/Dockerfile -t xactions-playground .
#
# The image installs only the playground's own five dependencies rather than
# the repository's full set. Puppeteer, Prisma and Remotion are what the
# product needs and none of what this demo needs, and leaving them out takes
# the image from roughly a gigabyte to under a hundred megabytes.
#
# The in-image directory layout mirrors the repository exactly, because
# server.mjs reaches into ../src by relative path. Flattening it would break
# the imports at container start rather than at build time.

FROM node:22-alpine AS deps

WORKDIR /app
COPY playground/package.json ./package.json
RUN npm install --omit=dev --no-audit --no-fund

FROM node:22-alpine AS runtime

# Tini reaps zombies and forwards SIGTERM, so Cloud Run's shutdown signal
# actually reaches Node instead of being swallowed by PID 1.
RUN apk add --no-cache tini

ENV NODE_ENV=production
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

COPY playground/package.json ./playground/package.json
COPY playground/server.mjs ./playground/server.mjs
COPY playground/public ./playground/public

# The scraper client, the report analyser and the query translator, plus the
# HTTP layer and utilities the client imports. tests/playground-image.test.js
# walks the import graph from server.mjs and fails when a file it reaches is
# not copied here, which is how this image came to crash at start.
COPY src/client ./src/client
COPY src/analysis ./src/analysis
COPY src/codegen ./src/codegen
COPY src/scrapers/twitter/http ./src/scrapers/twitter/http
COPY src/utils ./src/utils

# Cloud Run injects PORT. 8080 is its default and the local default too.
ENV PORT=8080
EXPOSE 8080

# Runs unprivileged. The service writes nothing to disk and holds no secrets.
USER node

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "playground/server.mjs"]
