#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-$(git rev-parse --show-toplevel)}"
PKG_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BRANCH="architecture-cleanup"
EXPECTED_BASE="1b1043d2c5bf83d2289f4a567f4548031596eb89"
DEPLOYMENT_ID="AKfycbyDdfv-1xMQTL7LGhGp48_nmWqiNSvNcKLo5IHkAQTxsQCVIPaMP8ZlxMp0ZfT_bzvo"
RELEASE="v1.2.18x2b Fast Navigation + Batched Picks"
CHANGED="$PKG_ROOT/CHANGED_FILES_V1_2_18X2B.txt"
CORE_PATCH="$PKG_ROOT/tools/patches/fast_navigation_batched_picks_core_v1218x2b.patch"
SHELL_PATCHER="$PKG_ROOT/tools/patch_exact_live_shell_v1218x2b.py"
COMMITTED=0

cd "$REPO"

rollback_precommit(){
  local code=$?
  if [ "$COMMITTED" -eq 0 ]; then
    echo ""
    echo "===== SAFE ROLLBACK ====="
    echo "A pre-deployment check stopped v1.2.18x2b. Restoring the starting repository..."
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
printf ' PATTC Predicts v1.2.18x2b\n'
printf ' Fast Navigation + Batched Picks\n'
printf ' Exact x1b Surgical Installer\n'
printf '==========================================\n'
printf 'Project: %s\n' "$REPO"

if [ "$(git branch --show-current)" != "$BRANCH" ]; then
  echo "STOP: Expected $BRANCH branch."
  exit 1
fi

for REQUIRED in \
  "$CHANGED" \
  "$CORE_PATCH" \
  "$SHELL_PATCHER" \
  "$PKG_ROOT/tests/navigation_batch_pick_exact_baseline_v1218x2b_tests.js" \
  "$PKG_ROOT/INSTALL_V1_2_18X2B.txt" \
  "$PKG_ROOT/docs/FAST_NAVIGATION_BATCHED_PICKS_V1_2_18X2B.md"
do
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
echo "===== VERIFY EXACT v1.2.18x1b BASELINE ====="
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
  echo "STOP: Expected v1.2.18x1b baseline $EXPECTED_BASE"
  echo "Found: $LOCAL_SHA"
  echo "This release will not overwrite a different/newer baseline."
  exit 1
fi
echo "v1.2.18x1b BASELINE VERIFIED: ${LOCAL_SHA:0:7}"

echo ""
echo "===== VERIFY EXACT LIVE COMPATIBILITY MARKERS ====="
for CHECK in \
  "frontend/js/app.js:v1218v4-reality-draft-switch" \
  "frontend/app.html:v1218v4-reality-draft-switch" \
  "frontend/sw.js:v1218v4-reality-draft-switch" \
  "frontend/sw.js:v1218j-team-fantasy" \
  "frontend/js/app.js:v1218x1b-performance" \
  "backend/services/AppCache.js:const CACHE_TTL = 600;" \
  "backend/engines/RankingGameEngine.js:lock.tryLock(2500)" \
  "backend/engines/SportsWagerEngine.js:sportsWagerAcquireAutomationLease_" \
  "backend/engines/NotificationsEngine.js:notificationPushAcquireReminderLease_"
do
  FILE="${CHECK%%:*}"; NEEDLE="${CHECK#*:}"
  [ -f "$FILE" ] || { echo "STOP: Missing prerequisite: $FILE"; exit 1; }
  grep -Fq "$NEEDLE" "$FILE" || { echo "STOP: Required live marker missing: $FILE :: $NEEDLE"; exit 1; }
done
cmp -s frontend/js/app.js frontend/app.js || { echo "STOP: frontend app mirrors are not synchronized before x2b."; exit 1; }
cmp -s frontend/js/api.js frontend/api.js || { echo "STOP: frontend API mirrors are not synchronized before x2b."; exit 1; }
echo "Exact x1b Reality/Team Fantasy/performance foundation verified."

echo ""
echo "===== VERIFY x2b CORE PATCH AGAINST EXACT LIVE FILES ====="
git apply --check "$CORE_PATCH"
echo "Core x2 patch matches the exact live non-shell files."

echo ""
echo "===== INSTALL x2b RELEASE SUPPORT FILES ====="
cp "$PKG_ROOT/CHANGED_FILES_V1_2_18X2B.txt" CHANGED_FILES_V1_2_18X2B.txt
cp "$PKG_ROOT/INSTALL_V1_2_18X2B.txt" INSTALL_V1_2_18X2B.txt
mkdir -p docs tools/patches tests
cp "$PKG_ROOT/docs/FAST_NAVIGATION_BATCHED_PICKS_V1_2_18X2B.md" docs/FAST_NAVIGATION_BATCHED_PICKS_V1_2_18X2B.md
cp "$CORE_PATCH" tools/patches/fast_navigation_batched_picks_core_v1218x2b.patch
cp "$SHELL_PATCHER" tools/patch_exact_live_shell_v1218x2b.py
cp "$PKG_ROOT/tests/navigation_batch_pick_exact_baseline_v1218x2b_tests.js" tests/navigation_batch_pick_exact_baseline_v1218x2b_tests.js
cp "$PKG_ROOT/tools/install_fast_navigation_batched_picks_v1218x2b.sh" tools/install_fast_navigation_batched_picks_v1218x2b.sh
chmod +x tools/patch_exact_live_shell_v1218x2b.py tools/install_fast_navigation_batched_picks_v1218x2b.sh

echo ""
echo "===== APPLY x2 CORE PERFORMANCE CHANGES ====="
git apply "$CORE_PATCH"

echo ""
echo "===== PATCH EXACT LIVE APP SHELL SURGICALLY ====="
python3 "$SHELL_PATCHER" "$REPO"

echo ""
echo "===== EXACT BASELINE PRESERVATION CHECK ====="
node tests/navigation_batch_pick_exact_baseline_v1218x2b_tests.js
if [ -f tests/reality_tv_cast_draft_switch_v1218v4_tests.js ]; then
  node tests/reality_tv_cast_draft_switch_v1218v4_tests.js
fi

echo ""
echo "===== x2 PERFORMANCE CONTRACT ====="
node tests/navigation_batch_pick_performance_v1218x2_tests.js
node tests/global_performance_lock_v1218x1b_tests.js
node tests/appearance_studio_refinement_v1217t_tests.js

echo ""
echo "===== CORE COMPATIBILITY ====="
for TEST in \
  tests/games_phase1_integration_tests.js \
  tests/staked_pick_risk_first_tests.js \
  tests/confidence_compact_batch_v1217a_tests.js \
  tests/awards_manager_workflow_v1216_tests.js \
  tests/home_hub_v1218b_tests.js \
  tests/home_hub_navigation_v1218c6_tests.js \
  tests/survivor_ranking_games_v1218w_tests.js \
  tests/survivor_edge_cases_v1218w4_tests.js \
  tests/reality_tv_player_flow_v116_tests.js \
  tests/reality_tv_cast_forward_compat_v1218v3_tests.js \
  tests/team_fantasy_weekly_selection_help_v1218v1_tests.js
do
  [ -f "$TEST" ] && node "$TEST"
done

echo ""
echo "===== VERIFY FRONTEND CACHE / MIRRORS ====="
cmp -s frontend/js/app.js frontend/app.js || { echo "STOP: frontend app mirrors are not synchronized."; exit 1; }
cmp -s frontend/js/api.js frontend/api.js || { echo "STOP: frontend API mirrors are not synchronized."; exit 1; }
for FILE in frontend/js/app.js frontend/app.js frontend/app.html frontend/sw.js; do
  grep -Fq 'v1218v4-reality-draft-switch' "$FILE" || { echo "STOP: $FILE lost Reality v4 marker."; exit 1; }
  grep -Fq 'v1218x2-fast-nav-batch-picks' "$FILE" || { echo "STOP: $FILE x2 marker missing."; exit 1; }
done
grep -Fq 'v1218j-team-fantasy' frontend/sw.js || { echo "STOP: service worker lost Team Fantasy cache history."; exit 1; }
if grep -Fq 'Loading game style…' frontend/css/picks.css; then
  echo "STOP: Blocking Picks appearance loading shell still exists."
  exit 1
fi

echo ""
echo "===== DIFF CHECK ====="
git diff --check

echo ""
echo "===== FULL PRODUCTION CHECKS ====="
bash tools/run_production_checks.sh

echo ""
echo "===== STAGE EXACT v1.2.18x2b FILES ====="
while IFS= read -r FILE; do
  [ -n "$FILE" ] && git add -A -- "$FILE"
done < CHANGED_FILES_V1_2_18X2B.txt
git status --short
if git diff --cached --quiet; then
  echo "STOP: Nothing staged for v1.2.18x2b."
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
git commit -m "Make navigation and prediction picks fast v1.2.18x2b"
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
echo " PATTC Predicts v1.2.18x2b COMPLETE"
echo ""
echo " Standard prediction picks select immediately and sync in batches"
echo " Pending standard picks survive transient navigation/network delay"
echo " Batch save avoids normal full Picks-sheet scan"
echo " Warm Picks cache remains coherent after batch saves"
echo " Home/hub snapshots are account-scoped and persisted for fast return"
echo " Dashboard payload has a short server-side cache"
echo " Awards live probabilities no longer block the core Picks page"
echo " Blocking 'Loading game style' page removed"
echo " Saved game appearance applies in place from session cache"
echo " Reality v4 and Team Fantasy cache history preserved"
echo " x1b lock/contention recovery preserved"
echo " GitHub VERIFIED"
echo " Apps Script deployed"
echo " Production checks passed"
echo " Apps Script version: $VERSION_NUMBER"
echo "=========================================="
