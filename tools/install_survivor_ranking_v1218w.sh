#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-$(git rev-parse --show-toplevel)}"
PKG_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PATCH="$PKG_ROOT/patches/survivor_ranking_v1218w.patch"
CHANGED="$PKG_ROOT/CHANGED_FILES_V1_2_18W.txt"
BRANCH="architecture-cleanup"
DEPLOYMENT_ID="AKfycbyDdfv-1xMQTL7LGhGp48_nmWqiNSvNcKLo5IHkAQTxsQCVIPaMP8ZlxMp0ZfT_bzvo"
RELEASE="v1.2.18w Survivor + Ranking Games"
COMMITTED=0

cd "$REPO"

rollback_precommit(){
  local code=$?
  if [ "$COMMITTED" -eq 0 ]; then
    echo ""
    echo "===== SAFE ROLLBACK ====="
    echo "A pre-deployment check stopped v1.2.18w. Restoring the starting repository..."
    git reset --hard HEAD >/dev/null 2>&1 || true
    if [ -f "$CHANGED" ]; then
      while IFS= read -r FILE; do
        [ -z "$FILE" ] && continue
        if ! git cat-file -e "HEAD:$FILE" 2>/dev/null; then
          rm -rf -- "$FILE"
        fi
      done < "$CHANGED"
    fi
    echo "Repository restored after failed pre-deployment check."
    git status --short
  fi
  exit "$code"
}
trap rollback_precommit ERR

printf '\n==========================================\n'
printf ' PATTC Predicts v1.2.18w\n'
printf ' Survivor + Ranking Games\n'
printf '==========================================\n'
printf 'Project: %s\n' "$REPO"

[ -f "$PATCH" ] || { echo "STOP: Release patch is missing: $PATCH"; exit 1; }
[ -f "$CHANGED" ] || { echo "STOP: Changed-files manifest is missing: $CHANGED"; exit 1; }

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
echo "===== SYNC CURRENT GITHUB BASELINE ====="
git fetch origin "$BRANCH"
LOCAL_SHA="$(git rev-parse HEAD)"
REMOTE_SHA="$(git rev-parse "origin/$BRANCH")"
echo "Local:  $LOCAL_SHA"
echo "Remote: $REMOTE_SHA"
if [ "$LOCAL_SHA" != "$REMOTE_SHA" ]; then
  if git merge-base --is-ancestor "$LOCAL_SHA" "$REMOTE_SHA"; then
    echo "Local branch is behind GitHub; fast-forwarding automatically..."
    git merge --ff-only "origin/$BRANCH"
  else
    echo "STOP: Local branch is not a clean ancestor of GitHub. Nothing was applied."
    exit 1
  fi
fi
echo "GITHUB BASELINE SYNCHRONIZED: $(git rev-parse --short HEAD)"

echo ""
echo "===== VERIFY CURRENT PROJECT FOUNDATION ====="
for CHECK in \
  "backend/engines/GamesEngine.js:id: \"survivor\"" \
  "backend/engines/GamesEngine.js:id: \"ranking\"" \
  "backend/engines/CategoryResultsEngine.js:FinalRank" \
  "frontend/js/pages/teamFantasy.js:TEAM_FANTASY_WEEKLY_SELECTION_HELP_UI_v1218v1" \
  "backend/engines/RealityTvSeasonEngine.js:function realityTvPrepareCastImportSheet_" \
  "tests/reality_tv_cast_forward_compat_v1218v3_tests.js:"
do
  FILE="${CHECK%%:*}"; NEEDLE="${CHECK#*:}"
  [ -f "$FILE" ] || { echo "STOP: Required current-production file missing: $FILE"; exit 1; }
  if [ -n "$NEEDLE" ] && ! grep -Fq "$NEEDLE" "$FILE"; then
    echo "STOP: Required production prerequisite missing: $FILE :: $NEEDLE"
    exit 1
  fi
done
echo "Current Reality, Team Fantasy, and universal result foundations verified."

echo ""
echo "===== VERIFY PATCH ====="
git apply --check "$PATCH"
echo "Patch matches this baseline."

echo ""
echo "===== APPLY SURVIVOR + RANKING RELEASE ====="
git apply "$PATCH"
mkdir -p patches
cp "$PATCH" patches/survivor_ranking_v1218w.patch
bash tools/sync_frontend_mirrors.sh .
chmod +x tools/install_survivor_ranking_v1218w.sh

echo ""
echo "===== SURVIVOR + RANKING REGRESSION ====="
node tests/survivor_ranking_games_v1218w_tests.js
node tests/games_phase1_integration_tests.js
node tests/awards_manager_workflow_v1216_tests.js

echo ""
echo "===== PRESERVE REALITY + TEAM FANTASY ====="
for TEST in \
  tests/reality_tv_cast_forward_compat_v1218v3_tests.js \
  tests/reality_tv_production_automation_v1218n_tests.js \
  tests/team_fantasy_weekly_selection_help_v1218v1_tests.js \
  tests/team_fantasy_week_history_compare_v1218u1_tests.js \
  tests/team_fantasy_game_day_v1218r1_tests.js
do
  [ -f "$TEST" ] && node "$TEST"
done

echo ""
echo "===== DIFF CHECK ====="
git diff --check

echo ""
echo "===== FULL PRODUCTION CHECKS ====="
bash tools/run_production_checks.sh

echo ""
echo "===== STAGE EXACT v1.2.18w FILES ====="
while IFS= read -r FILE; do
  [ -n "$FILE" ] && git add -A -- "$FILE"
done < CHANGED_FILES_V1_2_18W.txt
git status --short
if git diff --cached --quiet; then
  echo "STOP: Nothing staged for v1.2.18w."
  exit 1
fi

echo ""
echo "===== COMMIT ====="
git commit -m "Finish Survivor and Ranking games v1.2.18w"
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
echo " PATTC Predicts v1.2.18w COMPLETE"
echo ""
echo " Survivor round/elimination play LIVE"
echo " Survivor-specific standings LIVE"
echo " Ranking ordered ballots LIVE"
echo " Ranking official-order results LIVE"
echo " Ranking partial-credit scoring LIVE"
echo " Run Check blockers removed/replaced"
echo " Reality + Team Fantasy preserved"
echo " GitHub VERIFIED"
echo " Apps Script deployed"
echo " Production checks passed"
echo " Apps Script version: $VERSION_NUMBER"
echo "=========================================="
