#!/usr/bin/env bash
# Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
#
# Smoke test for the CLI image built from deploy/docker/cli.Dockerfile.
# by nich (@nichxbt)
#
#   deploy/docker/smoke.sh xactions-cli:dev
#   deploy/docker/smoke.sh xactions-cli:browser --browser
#
# Runs, against a fresh named volume:
#   1. xactions --version
#   2. xactions profile nasa --compact, live against X's guest tier
#   3. a check that the non-root user wrote its state into the new volume
#   4. MCP initialize and tools/list over stdio, through `mcp` and through
#      `--entrypoint xactions-mcp`
#   5. with --browser, a Puppeteer launch of the image's Chromium
#
# Needs docker and node on the host. Exits non-zero on the first failure.

set -euo pipefail

image="${1:?usage: deploy/docker/smoke.sh <image> [--browser]}"
browser="${2:-}"
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
volume="xactions-smoke-$$"

cleanup() { docker volume rm -f "$volume" >/dev/null 2>&1 || true; }
trap cleanup EXIT

step() { printf '\n== %s\n' "$*"; }

step "xactions --version"
version="$(docker run --rm "$image" --version)"
echo "$version"
[[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+ ]] || { echo "not a version: $version" >&2; exit 1; }

step "xactions profile nasa --compact (live guest tier)"
profile="$(docker run --rm -v "$volume:/data" "$image" profile nasa --compact)"
echo "$profile"
grep -q 'username=NASA' <<<"$profile" || { echo "no NASA profile in the output" >&2; exit 1; }

step "state written to the volume by the non-root user"
docker run --rm -v "$volume:/data" --entrypoint sh "$image" -c '
  set -e
  uid="$(id -u)"
  [ "$uid" != 0 ] || { echo "running as root" >&2; exit 1; }
  owner="$(stat -c %u /data)"
  [ "$owner" = "$uid" ] || { echo "/data is owned by $owner, not $uid" >&2; exit 1; }
  [ -n "$(ls -A /data)" ] || { echo "/data is empty after a read" >&2; exit 1; }
  echo "uid $uid owns /data:"
  ls -ln /data
'

step "MCP initialize + tools/list over stdio (xactions mcp)"
node "$here/mcp-smoke.mjs" -- docker run -i --rm -v "$volume:/data" "$image" mcp

step "MCP initialize + tools/list over stdio (--entrypoint xactions-mcp)"
node "$here/mcp-smoke.mjs" -- docker run -i --rm -v "$volume:/data" --entrypoint xactions-mcp "$image"

if [[ "$browser" == "--browser" ]]; then
  step "Puppeteer launches Chromium"
  docker run --rm --entrypoint node "$image" --input-type=module -e "
    const { default: puppeteer } = await import('puppeteer');
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
    console.log('launched', await browser.version());
    await browser.close();
  "
fi

step "all smoke checks passed for $image"
