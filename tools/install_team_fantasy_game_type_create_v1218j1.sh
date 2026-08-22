#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-$(git rev-parse --show-toplevel 2>/dev/null || true)}"
PKG_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOYMENT_ID="AKfycbyDdfv-1xMQTL7LGhGp48_nmWqiNSvNcKLo5IHkAQTxsQCVIPaMP8ZlxMp0ZfT_bzvo"

if [ -z "$REPO" ] || [ ! -d "$REPO/.git" ]; then
  echo "STOP: Could not find the Awards App Git repository."
  exit 1
fi
cd "$REPO"

DIRTY="$(git status --porcelain | grep -v '^?? update-project$' || true)"
if [ -n "$DIRTY" ]; then
  echo ""
  echo "STOP: The project currently has uncommitted changes."
  echo "Nothing was changed by the Team Fantasy j1 hotfix."
  echo ""
  git status --short
  exit 1
fi

if command -v clasp >/dev/null 2>&1; then
  CLASP=(clasp)
elif command -v npx >/dev/null 2>&1; then
  CLASP=(npx --yes @google/clasp)
else
  echo "STOP: clasp (or npx) is not available."
  exit 1
fi
clasp_cmd() { "${CLASP[@]}" "$@"; }

echo ""
echo "===== APPLY TEAM FANTASY v1.2.18j1 ====="
python3 "$PKG_ROOT/tools/apply_team_fantasy_game_type_create_v1218j1.py" "$REPO"

echo ""
echo "===== JAVASCRIPT SYNTAX ====="
node --check frontend/js/pages/admin.js
node --check tests/team_fantasy_game_type_create_v1218j1_tests.js

if [ -x tools/sync_frontend_mirrors.sh ]; then
  echo ""
  echo "===== SYNC FRONTEND MIRRORS ====="
  bash tools/sync_frontend_mirrors.sh
fi

echo ""
echo "===== TEAM FANTASY CREATE-GAME TEST ====="
node tests/team_fantasy_game_type_create_v1218j1_tests.js

if [ -x tools/run_production_checks.sh ]; then
  echo ""
  echo "===== FULL PRODUCTION CHECKS ====="
  bash tools/run_production_checks.sh
fi

echo ""
echo "===== SAVE HOTFIX ====="
while IFS= read -r file; do
  [ -n "$file" ] && git add -- "$file"
done < CHANGED_FILES_V1_2_18J1.txt

if git diff --cached --quiet; then
  echo "No new j1 changes to commit (already applied)."
else
  git commit -m "Fix Team Fantasy game creation v1.2.18j1"
fi

echo ""
echo "===== PUSH GITHUB / CLOUDFLARE ====="
git push origin HEAD

echo ""
echo "===== PUSH APPS SCRIPT ====="
clasp_cmd push

echo ""
echo "===== CREATE APPS SCRIPT VERSION ====="
VERSION_OUTPUT="$(clasp_cmd version "v1.2.18j1 Team Fantasy create-game hotfix")"
printf '%s\n' "$VERSION_OUTPUT"
VERSION_NUMBER="$(printf '%s\n' "$VERSION_OUTPUT" | sed -n 's/^Created version \([0-9][0-9]*\).*/\1/p' | tail -1)"
if [ -z "$VERSION_NUMBER" ]; then
  echo "STOP: Could not determine the new Apps Script version number."
  exit 1
fi

echo ""
echo "===== DEPLOY PRODUCTION WEB APP ====="
clasp_cmd deploy -i "$DEPLOYMENT_ID" -V "$VERSION_NUMBER" -d "v1.2.18j1 Team Fantasy create-game hotfix"

echo ""
echo "=========================================="
echo " TEAM FANTASY v1.2.18j1 DEPLOYED"
echo "=========================================="
echo "Git branch: $(git branch --show-current)"
echo "Apps Script version: $VERSION_NUMBER"
echo "Cloudflare frontend: GitHub push sent"
echo ""
echo "NEXT:"
echo "1. Hard refresh the app (Command + Shift + R)."
echo "2. Admin > Manage Games > Create New Game."
echo "3. Game Type should now include Team Fantasy Football."
echo "4. Create the game in Setup status first."
