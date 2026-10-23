#!/usr/bin/env bash
set -euo pipefail
cd /opt/hinton-studio
test "$(git branch --show-current)" = main || { echo 'Expected main branch'; exit 1; }
test -z "$(git status --porcelain)" || { echo 'Commit/stash local source changes before updating'; exit 1; }
git pull --ff-only origin main
npm ci
# Build in a new directory while the current production server keeps running.
NEXT_PUBLIC_BASE_PATH=/ai_studio NEXT_DIST_DIR=.next-candidate npm run build
sudo systemctl stop hinton-studio
if [ -d .next ]; then mv .next ".next-backup-$(date +%Y%m%d%H%M%S)"; fi
mv .next-candidate .next
sudo systemctl start hinton-studio
curl --fail --silent --output /dev/null http://127.0.0.1:3210/ai_studio/
echo 'Updated main successfully. Keep the previous build for rollback.'
