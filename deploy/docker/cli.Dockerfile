# syntax=docker/dockerfile:1
# Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
#
# The xactions CLI and MCP server in a container, for a machine with no Node.
# by nich (@nichxbt)
#
#   docker run --rm ghcr.io/nirholas/xactions-cli profile nasa
#   docker run -i --rm -v xactions:/data ghcr.io/nirholas/xactions-cli mcp
#
# Two targets, built from the repository root:
#
#   docker build -f deploy/docker/cli.Dockerfile -t xactions-cli .                    # default
#   docker build -f deploy/docker/cli.Dockerfile --target browser -t xactions-cli:browser .
#
# The default target has no browser: HTTP reads, the guest tier and the MCP
# server. `browser` adds Debian's Chromium and the optional dependencies
# (Puppeteer and the stealth plugin among them) for the Puppeteer paths.
#
# This is not the API server image. That one is the root Dockerfile, runs
# Prisma migrations and Express, and is published as ghcr.io/nirholas/xactions.
# Nothing here installs the api/ workspace, Prisma, Redis or PostgreSQL.

ARG NODE_VERSION=22

# ─────────────────────────────────────────────────────────────────────────────
# pack: exactly the files the npm package publishes (package.json "files")
# ─────────────────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-slim AS pack
WORKDIR /src
COPY . .
# --ignore-scripts: `prepare` installs git hooks, which a build has no use for.
RUN npm pack --ignore-scripts --pack-destination /tmp >/dev/null \
    && mkdir /pkg \
    && tar -xzf /tmp/xactions-*.tgz -C /pkg --strip-components=1

# ─────────────────────────────────────────────────────────────────────────────
# deps: production dependencies of the root package, from the lockfile
# ─────────────────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-slim AS deps-base
# better-sqlite3 has no install script, so npm runs its implicit
# `node-gyp rebuild`, which needs Python and make even when the prebuilt binary
# means nothing is compiled; g++ covers a platform with no prebuild. They stay
# in this stage.
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
# The browser image uses Debian's Chromium; Puppeteer's own download is wasted.
ENV PUPPETEER_SKIP_DOWNLOAD=true
WORKDIR /app
COPY package.json package-lock.json ./
# package.json overrides deepmerge with this patched copy, and npm links it
# from node_modules, so it is copied into the runtime image too.
COPY vendor ./vendor/

FROM deps-base AS deps-slim
# --workspaces=false keeps the api/ workspace (Express middleware, Prisma,
# Stripe, Bull, Socket.IO) out. --omit=optional leaves out Puppeteer and the
# rest: tests/packaging/startup-imports.test.js holds every bin to starting
# without them.
RUN npm ci --omit=dev --omit=optional --workspaces=false --no-audit --no-fund \
    && npm cache clean --force

FROM deps-base AS deps-browser
RUN npm ci --omit=dev --workspaces=false --no-audit --no-fund \
    && npm cache clean --force

# ─────────────────────────────────────────────────────────────────────────────
# runtime-base: what both images share
# ─────────────────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-slim AS runtime-base
ARG VERSION=dev
LABEL org.opencontainers.image.title="xactions-cli" \
      org.opencontainers.image.description="The xactions CLI and MCP server: X/Twitter automation with no API key" \
      org.opencontainers.image.source="https://github.com/nirholas/XActions" \
      org.opencontainers.image.licenses="Apache-2.0" \
      org.opencontainers.image.version="${VERSION}"

# tini runs as PID 1 so Ctrl-C and `docker stop` reach the command: Node as
# PID 1 ignores SIGINT and SIGTERM unless it installed a handler, and most
# commands do not.
RUN apt-get update \
    && apt-get install -y --no-install-recommends tini ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# XACTIONS_HOME holds the session, the query-ID cache, checkpoints and the
# action ledger; mount a volume there (`-v xactions:/data`) to keep them.
# PORT and XACTIONS_MCP_HOST only apply to `mcp --http`: listen on 3000 on
# every interface so `-p 3000:3000` reaches it. Set XACTIONS_MCP_TOKEN when
# you publish that port.
ENV NODE_ENV=production \
    XACTIONS_HOME=/data \
    PORT=3000 \
    XACTIONS_MCP_HOST=0.0.0.0

WORKDIR /app
COPY --from=pack /pkg ./

# The `node` user (uid 1000) ships with the base image. /data is created here,
# owned by it, so Docker seeds a new named volume with that owner and the first
# run can write to it. Mode 700: the session cookie is stored there.
RUN chmod 755 src/cli/index.js src/mcp/server.js \
    && ln -s /app/src/cli/index.js /usr/local/bin/xactions \
    && ln -s /app/src/mcp/server.js /usr/local/bin/xactions-mcp \
    && mkdir -p /data \
    && chown node:node /data \
    && chmod 700 /data

VOLUME ["/data"]
EXPOSE 3000

# ─────────────────────────────────────────────────────────────────────────────
# browser: Chromium for the Puppeteer paths
# ─────────────────────────────────────────────────────────────────────────────
FROM runtime-base AS browser
# Debian's chromium package depends on every library it needs; only fonts are
# added, so pages render text.
RUN apt-get update \
    && apt-get install -y --no-install-recommends chromium fonts-liberation \
    && rm -rf /var/lib/apt/lists/*
ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
COPY --from=deps-browser /app/node_modules ./node_modules
COPY --from=deps-browser /app/vendor ./vendor
USER node
ENTRYPOINT ["/usr/bin/tini", "--", "xactions"]
CMD ["--help"]

# ─────────────────────────────────────────────────────────────────────────────
# cli: the default target, no browser
# ─────────────────────────────────────────────────────────────────────────────
FROM runtime-base AS cli
COPY --from=deps-slim /app/node_modules ./node_modules
COPY --from=deps-slim /app/vendor ./vendor
USER node
ENTRYPOINT ["/usr/bin/tini", "--", "xactions"]
CMD ["--help"]
