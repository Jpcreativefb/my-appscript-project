#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-$(git rev-parse --show-toplevel)}"
PKG_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHANGED="$PKG_ROOT/CHANGED_FILES_V1_2_18X1B.txt"
BRANCH="architecture-cleanup"
EXPECTED_BASE="1a4378fad4732df1d9f81bb22d7d9087e5e882e5"
DEPLOYMENT_ID="AKfycbyDdfv-1xMQTL7LGhGp48_nmWqiNSvNcKLo5IHkAQTxsQCVIPaMP8ZlxMp0ZfT_bzvo"
RELEASE="v1.2.18x1b Global Performance + Lock Recovery"
COMMITTED=0

cd "$REPO"

rollback_precommit(){
  local code=$?
  if [ "$COMMITTED" -eq 0 ]; then
    echo ""
    echo "===== SAFE ROLLBACK ====="
    echo "A pre-deployment check stopped v1.2.18x1b. Restoring the starting repository..."
    git reset --hard HEAD >/dev/null 2>&1 || true
    for FILE in \
      CHANGED_FILES_V1_2_18X1B.txt \
      INSTALL_V1_2_18X1B.txt \
      docs/GLOBAL_PERFORMANCE_LOCK_RECOVERY_V1_2_18X1B.md \
      tests/global_performance_lock_v1218x1b_tests.js \
      tools/apply_global_performance_lock_v1218x1b.py \
      tools/install_global_performance_lock_v1218x1b.sh
    do
      if ! git cat-file -e "HEAD:$FILE" 2>/dev/null; then rm -f -- "$FILE"; fi
    done
    echo "Repository restored after failed pre-deployment check."
    git status --short
  fi
  exit "$code"
}
trap rollback_precommit ERR

printf '\n==========================================\n'
printf ' PATTC Predicts v1.2.18x1b\n'
printf ' Global Performance + Lock Recovery\n'
printf '==========================================\n'
printf 'Project: %s\n' "$REPO"

if [ "$(git branch --show-current)" != "$BRANCH" ]; then
  echo "STOP: Expected $BRANCH branch."
  exit 1
fi

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
echo "===== VERIFY EXACT v1.2.18w4 BASELINE ====="
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
  echo "STOP: Expected v1.2.18w4 baseline $EXPECTED_BASE"
  echo "Found: $LOCAL_SHA"
  echo "This performance release will not overwrite a different/newer baseline."
  exit 1
fi
echo "v1.2.18w4 BASELINE VERIFIED: ${LOCAL_SHA:0:7}"

echo ""
echo "===== VERIFY PERFORMANCE FOUNDATIONS ====="
for CHECK in \
  "backend/services/AppCache.js:const CACHE_TTL = 120;" \
  "backend/engines/SportsWagerEngine.js:runSportsWagerScoreRefresh" \
  "backend/engines/NotificationsEngine.js:notificationPushRunScheduledPickReminders" \
  "backend/engines/RankingGameEngine.js:RANKING GAME ENGINE v1.2.18w" \
  "backend/engines/SurvivorGameEngine.js:SURVIVOR / ELIMINATION GAME ENGINE v1.2.18w" \
  "docs/SURVIVOR_EDGE_CASE_FINISH_V1_2_18W4.md:" \
  "frontend/sports.html:Sports"
do
  FILE="${CHECK%%:*}"; NEEDLE="${CHECK#*:}"
  [ -f "$FILE" ] || { echo "STOP: Missing prerequisite: $FILE"; exit 1; }
  if [ -n "$NEEDLE" ] && ! grep -Fq "$NEEDLE" "$FILE"; then
    echo "STOP: Required baseline marker missing: $FILE :: $NEEDLE"
    exit 1
  fi
done
echo "Current w4 app/cache/Sports foundations verified."

echo ""
echo "===== INSTALL x1b RELEASE FILES ====="
mkdir -p docs tests tools
cp "$PKG_ROOT/CHANGED_FILES_V1_2_18X1B.txt" CHANGED_FILES_V1_2_18X1B.txt
cp "$PKG_ROOT/INSTALL_V1_2_18X1B.txt" INSTALL_V1_2_18X1B.txt
cp "$PKG_ROOT/docs/GLOBAL_PERFORMANCE_LOCK_RECOVERY_V1_2_18X1B.md" docs/GLOBAL_PERFORMANCE_LOCK_RECOVERY_V1_2_18X1B.md
cp "$PKG_ROOT/tests/global_performance_lock_v1218x1b_tests.js" tests/global_performance_lock_v1218x1b_tests.js
cp "$PKG_ROOT/tools/apply_global_performance_lock_v1218x1b.py" tools/apply_global_performance_lock_v1218x1b.py
cp "$PKG_ROOT/tools/install_global_performance_lock_v1218x1b.sh" tools/install_global_performance_lock_v1218x1b.sh
chmod +x tools/apply_global_performance_lock_v1218x1b.py tools/install_global_performance_lock_v1218x1b.sh

echo ""
echo "===== APPLY GLOBAL PERFORMANCE RECOVERY ====="
python3 tools/apply_global_performance_lock_v1218x1b.py "$REPO"

echo ""
echo "===== PERFORMANCE / LOCK CONTRACT ====="
node tests/global_performance_lock_v1218x1b_tests.js

echo ""
echo "===== CORE PLAYER-SAVE COMPATIBILITY ====="
for TEST in \
  tests/bets_single_row_upsert_tests.js \
  tests/staked_pick_risk_first_tests.js \
  tests/confidence_compact_batch_v1217a_tests.js \
  tests/sports_wager_setup_destination_v1216_tests.js \
  tests/sports_player_props_integration_tests.js \
  tests/sports_live_display_integration_tests.js \
  tests/survivor_ranking_games_v1218w_tests.js \
  tests/survivor_edge_cases_v1218w4_tests.js \
  tests/reality_tv_inline_admin_actions_v1113_tests.js \
  tests/reality_tv_player_flow_v116_tests.js \
  tests/push_automatic_pick_reminder_scheduling_v1218j_tests.js \
  tests/team_fantasy_weekly_selection_help_v1218v1_tests.js \
  tests/reality_tv_cast_forward_compat_v1218v3_tests.js \
  tests/games_phase1_integration_tests.js
do
  [ -f "$TEST" ] && node "$TEST"
done

echo ""
echo "===== VERIFY FRONTEND CACHE / MIRRORS ====="
cmp -s frontend/js/app.js frontend/app.js || { echo "STOP: frontend app mirrors are not synchronized."; exit 1; }
grep -Fq 'v1218x1b-performance' frontend/js/app.js || { echo "STOP: app.js x1b asset marker missing."; exit 1; }
grep -Fq 'v1218x1b-performance' frontend/app.html || { echo "STOP: app.html x1b asset marker missing."; exit 1; }
grep -Fq 'v1218x1b-performance' frontend/sw.js || { echo "STOP: service-worker x1b cache marker missing."; exit 1; }
grep -Fq 'Sports Scores & Game Builder' frontend/js/pages/admin.js || { echo "STOP: Admin Sports launcher missing."; exit 1; }
grep -Fq 'Admin access required.' frontend/js/sports.js || { echo "STOP: Admin-only Sports guard missing."; exit 1; }

echo ""
echo "===== DIFF CHECK ====="
git diff --check

echo ""
echo "===== FULL PRODUCTION CHECKS ====="
bash tools/run_production_checks.sh

echo ""
echo "===== STAGE EXACT v1.2.18x1b FILES ====="
while IFS= read -r FILE; do
  [ -n "$FILE" ] && git add -A -- "$FILE"
done < CHANGED_FILES_V1_2_18X1B.txt
git status --short
if git diff --cached --quiet; then
  echo "STOP: Nothing staged for v1.2.18x1b."
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
git commit -m "Recover global app performance and lock contention v1.2.18x1b"
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
echo " PATTC Predicts v1.2.18x1b COMPLETE"
echo ""
echo " Background Sports jobs no longer hold player-save lock"
echo " Automatic reminders no longer hold player-save lock"
echo " Interactive lock waits capped under 5 seconds where possible"
echo " Wager lock narrowed to bankroll/write critical section"
echo " Ranking ballot no longer rewrites the full entries sheet"
echo " Whole-app cache flushes removed from common save paths"
echo " Shared data cache extended to 10 minutes"
echo " Revisited public pages render from instant session snapshots"
echo " Admin Sports Scores & Game Builder restored"
echo " Survivor/Ranking/Reality/Team Fantasy preserved"
echo " GitHub VERIFIED"
echo " Apps Script deployed"
echo " Production checks passed"
echo " Apps Script version: $VERSION_NUMBER"
echo "=========================================="
