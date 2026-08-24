#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-$(git rev-parse --show-toplevel)}"
PKG_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHANGED="$PKG_ROOT/CHANGED_FILES_V1_2_18W4.txt"
BRANCH="architecture-cleanup"
EXPECTED_BASE="99215a9c346f0ef1c474a66e74588df4cd7fee40"
DEPLOYMENT_ID="AKfycbyDdfv-1xMQTL7LGhGp48_nmWqiNSvNcKLo5IHkAQTxsQCVIPaMP8ZlxMp0ZfT_bzvo"
RELEASE="v1.2.18w4 Survivor Edge-Case Finish"
COMMITTED=0

cd "$REPO"

rollback_precommit(){
  local code=$?
  if [ "$COMMITTED" -eq 0 ]; then
    echo ""
    echo "===== SAFE ROLLBACK ====="
    echo "A pre-deployment check stopped v1.2.18w4. Restoring the starting repository..."
    git reset --hard HEAD >/dev/null 2>&1 || true
    for FILE in \
      CHANGED_FILES_V1_2_18W4.txt \
      INSTALL_V1_2_18W4.txt \
      docs/SURVIVOR_EDGE_CASE_FINISH_V1_2_18W4.md \
      tests/survivor_edge_cases_v1218w4_tests.js \
      tools/apply_survivor_edge_cases_v1218w4.py \
      tools/install_survivor_edge_cases_v1218w4.sh
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
printf ' PATTC Predicts v1.2.18w4\n'
printf ' Survivor Edge-Case Finish\n'
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
echo "===== VERIFY EXACT v1.2.18w3 BASELINE ====="
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
  echo "STOP: Expected v1.2.18w3 baseline $EXPECTED_BASE"
  echo "Found: $LOCAL_SHA"
  echo "This hotfix will not overwrite a different/newer baseline."
  exit 1
fi
echo "v1.2.18w3 BASELINE VERIFIED: ${LOCAL_SHA:0:7}"

echo ""
echo "===== VERIFY SURVIVOR / RANKING FOUNDATION ====="
for CHECK in \
  "backend/engines/SurvivorGameEngine.js:SURVIVOR / ELIMINATION GAME ENGINE v1.2.18w" \
  "frontend/js/pages/survivor.js:SURVIVOR / ELIMINATION PLAYER PAGE v1.2.18w" \
  "backend/engines/RankingGameEngine.js:RANKING GAME ENGINE v1.2.18w" \
  "backend/engines/NotificationsEngine.js:function notificationPushGameParticipants_(gameId)" \
  "docs/RANKING_SHEET_INIT_HOTFIX_V1_2_18W3.md:"
do
  FILE="${CHECK%%:*}"; NEEDLE="${CHECK#*:}"
  [ -f "$FILE" ] || { echo "STOP: Missing prerequisite: $FILE"; exit 1; }
  if [ -n "$NEEDLE" ] && ! grep -Fq "$NEEDLE" "$FILE"; then
    echo "STOP: Required v1.2.18w3 foundation marker missing: $FILE :: $NEEDLE"
    exit 1
  fi
done
echo "Current Survivor, Ranking w3, and participant-roster foundations verified."

echo ""
echo "===== APPLY v1.2.18w4 ====="
mkdir -p backend/engines frontend/js/pages docs tests tools
cp "$PKG_ROOT/backend/engines/SurvivorGameEngine.js" backend/engines/SurvivorGameEngine.js
cp "$PKG_ROOT/frontend/js/pages/survivor.js" frontend/js/pages/survivor.js
cp "$PKG_ROOT/tests/survivor_edge_cases_v1218w4_tests.js" tests/survivor_edge_cases_v1218w4_tests.js
cp "$PKG_ROOT/docs/SURVIVOR_EDGE_CASE_FINISH_V1_2_18W4.md" docs/SURVIVOR_EDGE_CASE_FINISH_V1_2_18W4.md
cp "$PKG_ROOT/CHANGED_FILES_V1_2_18W4.txt" CHANGED_FILES_V1_2_18W4.txt
cp "$PKG_ROOT/INSTALL_V1_2_18W4.txt" INSTALL_V1_2_18W4.txt
cp "$PKG_ROOT/tools/apply_survivor_edge_cases_v1218w4.py" tools/apply_survivor_edge_cases_v1218w4.py
cp "$PKG_ROOT/tools/install_survivor_edge_cases_v1218w4.sh" tools/install_survivor_edge_cases_v1218w4.sh
chmod +x tools/apply_survivor_edge_cases_v1218w4.py tools/install_survivor_edge_cases_v1218w4.sh
python3 tools/apply_survivor_edge_cases_v1218w4.py "$REPO"

echo "Survivor participant roster, missed-pick, winner, and co-winner behavior applied."

echo ""
echo "===== SURVIVOR EDGE-CASE TESTS ====="
node --check backend/engines/SurvivorGameEngine.js
node --check frontend/js/pages/survivor.js
node tests/survivor_ranking_games_v1218w_tests.js
node tests/survivor_edge_cases_v1218w4_tests.js
[ -f tests/ranking_sheet_init_v1218w3_tests.js ] && node tests/ranking_sheet_init_v1218w3_tests.js

echo ""
echo "===== PRESERVE REALITY + TEAM FANTASY ====="
for TEST in \
  tests/reality_tv_cast_draft_switch_v1218v4_tests.js \
  tests/reality_tv_cast_forward_compat_v1218v3_tests.js \
  tests/team_fantasy_weekly_selection_help_v1218v1_tests.js \
  tests/games_phase1_integration_tests.js
do
  [ -f "$TEST" ] && node "$TEST"
done

echo ""
echo "===== VERIFY FRONTEND CACHE / MIRRORS ====="
cmp -s frontend/js/app.js frontend/app.js || { echo "STOP: frontend app mirrors are not synchronized."; exit 1; }
grep -Fq 'v1218w4-survivor-edge-cases' frontend/js/app.js
grep -Fq 'v1218w4-survivor-edge-cases' frontend/app.html
grep -Fq 'v1218w4-survivor-edge-cases' frontend/sw.js

echo ""
echo "===== DIFF CHECK ====="
git diff --check

echo ""
echo "===== FULL PRODUCTION CHECKS ====="
bash tools/run_production_checks.sh

echo ""
echo "===== STAGE EXACT v1.2.18w4 FILES ====="
while IFS= read -r FILE; do
  [ -n "$FILE" ] && git add -A -- "$FILE"
done < CHANGED_FILES_V1_2_18W4.txt
git status --short
if git diff --cached --quiet; then
  echo "STOP: Nothing staged for v1.2.18w4."
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
git commit -m "Finish Survivor edge cases v1.2.18w4"
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
echo " PATTC Predicts v1.2.18w4 COMPLETE"
echo ""
echo " Survivor no-pick participants retained in standings"
echo " Missed settled round => eliminated"
echo " Final survivors => WINNER"
echo " Co-winners supported"
echo " Multi-player Survivor ordering verified"
echo " Ranking v1.2.18w3 preserved"
echo " Reality + Team Fantasy compatibility checked"
echo " GitHub VERIFIED"
echo " Apps Script deployed"
echo " Production checks passed"
echo " Apps Script version: $VERSION_NUMBER"
echo "=========================================="
