#!/bin/bash
# PicLagbe → Cloudflare Pages (photolagbe.pages.dev)
# Usage: bash /home/z/my-project/scripts/cf_deploy.sh
set -e
cd /home/z/my-project/piclagbe

# 1. Build (no VITE_BASE → base '/', correct for pages.dev)
npx vite build
node scripts/generate_sitemap.mjs

# 2. SPA fallback: dist/_redirects has `/* /index.html 200` (official CF Pages
#    SPA pattern). NO dist/404.html — its presence makes CF Pages serve deep
#    links with HTTP 404 status (Googlebot sees 404 → nothing gets indexed).
#    Google live test caught this: /photographers etc = 404. Keep 404.html OUT.
rm -f dist/404.html

# 3. Deploy
export CLOUDFLARE_API_TOKEN=$(grep '^CLOUDFLARE_API_TOKEN=' /home/z/my-project/scripts/cf_token.txt | cut -d= -f2)
export CLOUDFLARE_ACCOUNT_ID=$(grep '^CLOUDFLARE_ACCOUNT_ID=' /home/z/my-project/scripts/cf_token.txt | cut -d= -f2)
npx wrangler pages deploy dist --project-name=photolagbe --branch=main --commit-dirty=true

echo "Live: https://photolagbe.pages.dev"
