#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-$(git rev-parse --show-toplevel)}"
PKG_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BRANCH="architecture-cleanup"
EXPECTED_BASE="ebfb0ef17afec9434acf2a7e5b25385b1f8e0c9c"
DEPLOYMENT_ID="AKfycbyDdfv-1xMQTL7LGhGp48_nmWqiNSvNcKLo5IHkAQTxsQCVIPaMP8ZlxMp0ZfT_bzvo"
RELEASE="v1.2.18x2c Confidence Appearance + PWA Refresh"
CHANGED="$PKG_ROOT/CHANGED_FILES_V1_2_18X2C.txt"
APPLIER="$PKG_ROOT/tools/apply_confidence_appearance_pwa_refresh_v1218x2c.py"
TEST="$PKG_ROOT/tests/confidence_appearance_pwa_refresh_v1218x2c_tests.js"
COMMITTED=0

cd "$REPO"

rollback_precommit(){
  local code=$?
  if [ "$COMMITTED" -eq 0 ]; then
    echo ""
    echo "===== SAFE ROLLBACK ====="
    echo "A pre-deployment check stopped v1.2.18x2c. Restoring the starting repository..."
    git reset --hard HEAD >/dev/null 2>&1 || true
    if [ -f "$CHANGED" ]; then
      while IFS= read -r FILE; do
        [ -n "$FILE" ] || continue
        if ! git cat-file -e "HEAD:$FILE" 2>/dev/null; then rm -f -- "$FILE"; fi
      done < "$CHANGED"
    fi
    echo "Repository restored after failed pre-deployment check."
    git status --short
  fi
  exit "$code"
}
trap rollback_precommit ERR

printf '\n==========================================\n'
printf ' PATTC Predicts v1.2.18x2c\n'
printf ' Confidence Appearance + PWA Refresh\n'
printf '==========================================\n'
printf 'Project: %s\n' "$REPO"

if [ "$(git branch --show-current)" != "$BRANCH" ]; then
  echo "STOP: Expected $BRANCH branch."
  exit 1
fi

for REQUIRED in "$CHANGED" "$APPLIER" "$TEST" "$PKG_ROOT/INSTALL_V1_2_18X2C.txt" "$PKG_ROOT/docs/CONFIDENCE_APPEARANCE_PWA_REFRESH_V1_2_18X2C.md"; do
  [ -f "$REQUIRED" ] || { echo "STOP: Missing package file: $REQUIRED"; exit 1; }
done

echo ""
echo "===== VERIFY CLEAN REPOSITORY ====="
DIRTY="$(git status --porcelain | grep -v '^?? update-project$' || true)"
if [ -n "$DIRTY" ]; then
  echo "STOP: Repository has unfinished changes. Nothing was applied."
  git status --short
  exit 1
fi
echo "Repository clean."

echo ""
echo "===== VERIFY EXACT v1.2.18x2b BASELINE ====="
git fetch origin "$BRANCH"
LOCAL_SHA="$(git rev-parse HEAD)"
REMOTE_SHA="$(git rev-parse "origin/$BRANCH")"
echo "Local:  $LOCAL_SHA"
echo "Remote: $REMOTE_SHA"
if [ "$LOCAL_SHA" != "$REMOTE_SHA" ]; then
  echo "STOP: Local and GitHub are not synchronized. Nothing was applied."
  exit 1
fi
if [ "$LOCAL_SHA" != "$EXPECTED_BASE" ]; then
  echo "STOP: Expected v1.2.18x2b baseline $EXPECTED_BASE"
  echo "Found: $LOCAL_SHA"
  exit 1
fi
echo "v1.2.18x2b BASELINE VERIFIED: ${LOCAL_SHA:0:7}"

echo ""
echo "===== VERIFY x2b PERFORMANCE + COMPATIBILITY FOUNDATION ====="
for CHECK in \
  "frontend/js/app.js:v1218x2-fast-nav-batch-picks" \
  "frontend/js/app.js:v1218v4-reality-draft-switch" \
  "frontend/sw.js:v1218j-team-fantasy" \
  "frontend/js/pages/picks.js:function hydrateConfidenceAppearance_()" \
  "frontend/js/pages/picks.js:applyPicksAppearanceToPage_();" \
  "frontend/css/picks.css:v1.2.17v — Confidence width containment" \
  "backend/services/AppCache.js:const CACHE_TTL = 600;"
do
  FILE="${CHECK%%:*}"; NEEDLE="${CHECK#*:}"
  grep -Fq "$NEEDLE" "$FILE" || { echo "STOP: Required x2b marker missing: $FILE :: $NEEDLE"; exit 1; }
done
cmp -s frontend/js/app.js frontend/app.js || { echo "STOP: frontend app mirrors differ before x2c."; exit 1; }
echo "Current x2b performance/Reality/Team Fantasy foundation verified."

echo ""
echo "===== INSTALL x2c RELEASE SUPPORT FILES ====="
cp "$PKG_ROOT/CHANGED_FILES_V1_2_18X2C.txt" CHANGED_FILES_V1_2_18X2C.txt
cp "$PKG_ROOT/INSTALL_V1_2_18X2C.txt" INSTALL_V1_2_18X2C.txt
mkdir -p docs tests tools
cp "$PKG_ROOT/docs/CONFIDENCE_APPEARANCE_PWA_REFRESH_V1_2_18X2C.md" docs/CONFIDENCE_APPEARANCE_PWA_REFRESH_V1_2_18X2C.md
cp "$TEST" tests/confidence_appearance_pwa_refresh_v1218x2c_tests.js
cp "$APPLIER" tools/apply_confidence_appearance_pwa_refresh_v1218x2c.py
cp "$PKG_ROOT/tools/install_confidence_appearance_pwa_refresh_v1218x2c.sh" tools/install_confidence_appearance_pwa_refresh_v1218x2c.sh
chmod +x tools/apply_confidence_appearance_pwa_refresh_v1218x2c.py tools/install_confidence_appearance_pwa_refresh_v1218x2c.sh

echo ""
echo "===== APPLY CONFIDENCE APPEARANCE + PWA REFRESH ====="
python3 tools/apply_confidence_appearance_pwa_refresh_v1218x2c.py "$REPO"

echo ""
echo "===== x2c TARGETED CONTRACT ====="
node tests/confidence_appearance_pwa_refresh_v1218x2c_tests.js
[ -f tests/navigation_batch_pick_performance_v1218x2_tests.js ] && node tests/navigation_batch_pick_performance_v1218x2_tests.js
[ -f tests/navigation_batch_pick_exact_baseline_v1218x2b_tests.js ] && node tests/navigation_batch_pick_exact_baseline_v1218x2b_tests.js
[ -f tests/reality_tv_cast_draft_switch_v1218v4_tests.js ] && node tests/reality_tv_cast_draft_switch_v1218v4_tests.js
[ -f tests/confidence_compact_batch_v1217a_tests.js ] && node tests/confidence_compact_batch_v1217a_tests.js
[ -f tests/appearance_studio_refinement_v1217t_tests.js ] && node tests/appearance_studio_refinement_v1217t_tests.js

echo ""
echo "===== VERIFY FRONTEND CACHE / MIRRORS ====="
cmp -s frontend/js/app.js frontend/app.js || { echo "STOP: frontend app mirrors diverged."; exit 1; }
for FILE in frontend/js/app.js frontend/app.js frontend/app.html frontend/sw.js; do
  grep -Fq 'v1218v4-reality-draft-switch' "$FILE" || { echo "STOP: $FILE lost Reality v4 marker."; exit 1; }
done
grep -Fq 'v1218j-team-fantasy' frontend/sw.js || { echo "STOP: service worker lost Team Fantasy cache history."; exit 1; }
grep -Fq 'v1218x2c-confidence-appearance' frontend/js/app.js || { echo "STOP: app x2c marker missing."; exit 1; }
grep -Fq 'v1218x2c-confidence-appearance' frontend/sw.js || { echo "STOP: service worker x2c marker missing."; exit 1; }
grep -Fq 'v1218x2c-confidence-appearance' frontend/js/pwa.js || { echo "STOP: PWA x2c marker missing."; exit 1; }

echo ""
echo "===== DIFF CHECK ====="
git diff --check

echo ""
echo "===== FULL PRODUCTION CHECKS ====="
bash tools/run_production_checks.sh

echo ""
echo "===== STAGE EXACT v1.2.18x2c FILES ====="
while IFS= read -r FILE; do
  [ -n "$FILE" ] && git add -A -- "$FILE"
done < CHANGED_FILES_V1_2_18X2C.txt
git status --short
if git diff --cached --quiet; then
  echo "STOP: Nothing staged for v1.2.18x2c."
  exit 1
fi

echo ""
echo "===== VERIFY NO UNSTAGED RELEASE CHANGES ====="
UNSTAGED="$(git status --porcelain | grep -E '^ [MADRCU?]|^\?\?' || true)"
if [ -n "$UNSTAGED" ]; then
  echo "STOP: Release left unstaged/untracked files:"
  echo "$UNSTAGED"
  exit 1
fi

echo ""
echo "===== COMMIT ====="
git commit -m "Restore Confidence appearance after fast-load hydration v1.2.18x2c"
COMMITTED=1
trap - ERR

clasp_cmd(){
  if command -v clasp >/dev/null 2>&1; then clasp "$@";
  elif command -v npx >/dev/null 2>&1; then npx --yes @google/clasp "$@";
  else echo "STOP: Neither clasp nor npx is available."; return 1; fi
}

echo ""
echo "===== PUSH APPS SCRIPT ====="
clasp_cmd push

echo ""
echo "===== CREATE APPS SCRIPT VERSION ====="
VERSION_OUTPUT="$(clasp_cmd version "$RELEASE")"
echo "$VERSION_OUTPUT"
VERSION_NUMBER="$(printf '%s\n' "$VERSION_OUTPUT" | sed -nE 's/.*Created version ([0-9]+).*/\1/p' | tail -1)"
if ! [[ "$VERSION_NUMBER" =~ ^[0-9]+$ ]]; then
  echo "STOP: Could not determine Apps Script version."
  exit 1
fi

echo ""
echo "===== DEPLOY PRODUCTION WEB APP ====="
clasp_cmd deploy -i "$DEPLOYMENT_ID" -V "$VERSION_NUMBER" -d "$RELEASE"

echo ""
echo "===== PUSH GITHUB / CLOUDFLARE ====="
git push origin "$BRANCH"

echo ""
echo "===== VERIFY GITHUB ====="
git fetch origin "$BRANCH"
LOCAL_SHA="$(git rev-parse HEAD)"; REMOTE_SHA="$(git rev-parse "origin/$BRANCH")"
if [ "$LOCAL_SHA" != "$REMOTE_SHA" ]; then
  echo "STOP: GitHub verification failed."
  exit 1
fi
echo "GITHUB VERIFIED: $REMOTE_SHA"

echo ""
echo "===== VERIFY APPS SCRIPT ====="
clasp_cmd deployments

echo ""
echo "===== FINAL PRODUCTION CHECK ====="
bash tools/run_production_checks.sh

echo ""
echo "===== FINAL GIT STATUS ====="
git status --short

echo ""
echo "===== CURRENT COMMIT ====="
git log -1 --oneline

echo ""
echo "=========================================="
echo " PATTC Predicts v1.2.18x2c COMPLETE"
echo ""
echo " Confidence appearance redraws after deferred style load"
echo " Only the Confidence slate redraws; no blocking style screen"
echo " Picks CSS/API/Picks module cache keys refreshed"
echo " PWA/service-worker cache version refreshed"
echo " x2b fast navigation + batched picks preserved"
echo " Reality v4 + Team Fantasy compatibility preserved"
echo " GitHub VERIFIED"
echo " Apps Script deployed"
echo " Production checks passed"
echo " Apps Script version: $VERSION_NUMBER"
echo "=========================================="
