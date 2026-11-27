# Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
#
# XActions dev container image, shared by the default and the full configuration.
# This is a workspace for contributors; the production image is /Dockerfile.
#
# @author nich (@nichxbt)

# 5 is the image's own major version, 22 the Node line engines.node names as its
# floor (>=22.19), trixie the Debian release. The tag tracks Node 22 patch
# releases; it carried 22.23.5 when this file was written.
FROM mcr.microsoft.com/devcontainers/javascript-node:5-22-trixie

# Puppeteer drives a browser for `xactions connect`, the browser-driven write
# tools and the API's automation jobs. Debian's chromium package depends on every
# shared library Chromium needs, on amd64 and arm64 alike. Puppeteer's own
# download is Chrome for Testing, which has no Linux arm64 build, so on an Apple
# Silicon host it would leave those paths with nothing to launch. The fonts keep
# pages from rendering as boxes in screenshots.
#
# better-sqlite3 needs no extra package: the base image already carries python3,
# make and g++ for node-gyp.
RUN apt-get update \
    && export DEBIAN_FRONTEND=noninteractive \
    && apt-get install -y --no-install-recommends \
       chromium \
       fonts-liberation \
       fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/*

# Puppeteer reads both on its own, so every launch in the repository uses the
# system Chromium and `npm ci` skips a download nothing would run.
ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
