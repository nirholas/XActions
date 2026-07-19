#!/usr/bin/env bash
# Assembles the Cloudflare Pages output directory from public/, dashboard/,
# and the marketing landing page in site/. Run from the repo root:
#   bash deploy/cloudflare/build.sh
# Then deploy the result:
#   npx wrangler pages deploy pages-out --project-name xactions
set -euo pipefail
cd "$(dirname "$0")/../.."
rm -rf pages-out
mkdir -p pages-out
cp -r public/. pages-out/
cp -r dashboard/. pages-out/
# dashboard/index.html is the app dashboard; move it aside so the marketing
# landing page can take the root, matching the old vercel.json routing
mv pages-out/index.html pages-out/dashboard.html
cp site/index.html pages-out/index.html
cp llms.txt llms-full.txt pages-out/
cp deploy/cloudflare/_redirects pages-out/_redirects
echo "Built pages-out/ ($(find pages-out -type f | wc -l) files)"
