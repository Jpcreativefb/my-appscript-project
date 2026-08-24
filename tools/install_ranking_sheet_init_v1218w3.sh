#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-$(git rev-parse --show-toplevel)}"
PKG_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHANGED="$PKG_ROOT/CHANGED_FILES_V1_2_18W3.txt"
BRANCH="architecture-cleanup"
EXPECTED_BASE="65bcb07f84d20622ee3e1449f44b8caa45916e6b"
DEPLOYMENT_ID="AKfycbyDdfv-1xMQTL7LGhGp48_nmWqiNSvNcKLo5IHkAQTxsQCVIPaMP8ZlxMp0ZfT_bzvo"
RELEASE="v1.2.18w3 Ranking Sheet Initialization Hotfix"
COMMITTED=0

cd "$REPO"

rollback_precommit(){
  local code=$?
  if [ "$COMMITTED" -eq 0 ]; then
    echo ""
    echo "===== SAFE ROLLBACK ====="
    echo "A pre-deployment check stopped v1.2.18w3. Restoring the starting repository..."
    git reset --hard HEAD >/dev/null 2>&1 || true
    for FILE in \
      CHANGED_FILES_V1_2_18W3.txt \
      docs/RANKING_SHEET_INIT_HOTFIX_V1_2_18W3.md \
      tests/ranking_sheet_init_v1218w3_tests.js \
      tools/install_ranking_sheet_init_v1218w3.sh
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
printf ' PATTC Predicts v1.2.18w3\n'
printf ' Ranking Sheet Initialization Hotfix\n'
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
echo "===== VERIFY EXACT v1.2.18w2 BASELINE ====="
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
  echo "STOP: Expected v1.2.18w2 baseline $EXPECTED_BASE"
  echo "Found: $LOCAL_SHA"
  echo "This hotfix will not overwrite a different/newer baseline."
  exit 1
fi
echo "v1.2.18w2 BASELINE VERIFIED: ${LOCAL_SHA:0:7}"

echo ""
echo "===== VERIFY RANKING FOUNDATION ====="
for CHECK in \
  "backend/engines/RankingGameEngine.js:RANKING GAME ENGINE v1.2.18w" \
  "backend/engines/RankingGameEngine.js:const RANKING_ENTRIES_SHEET = \"RankingEntries\";" \
  "frontend/js/pages/ranking.js:" \
  "backend/engines/SurvivorGameEngine.js:SURVIVOR / ELIMINATION GAME ENGINE v1.2.18w"
do
  FILE="${CHECK%%:*}"; NEEDLE="${CHECK#*:}"
  [ -f "$FILE" ] || { echo "STOP: Missing prerequisite: $FILE"; exit 1; }
  if [ -n "$NEEDLE" ] && ! grep -Fq "$NEEDLE" "$FILE"; then
    echo "STOP: Ranking/Survivor prerequisite missing: $FILE :: $NEEDLE"
    exit 1
  fi
done
echo "Survivor + Ranking v1.2.18w2 foundation verified."

echo ""
echo "===== APPLY v1.2.18w3 ====="
cp "$PKG_ROOT/backend/engines/RankingGameEngine.js" backend/engines/RankingGameEngine.js
mkdir -p docs tests tools
cp "$PKG_ROOT/docs/RANKING_SHEET_INIT_HOTFIX_V1_2_18W3.md" docs/RANKING_SHEET_INIT_HOTFIX_V1_2_18W3.md
cp "$PKG_ROOT/tests/ranking_sheet_init_v1218w3_tests.js" tests/ranking_sheet_init_v1218w3_tests.js
cp "$PKG_ROOT/CHANGED_FILES_V1_2_18W3.txt" CHANGED_FILES_V1_2_18W3.txt
cp "$PKG_ROOT/tools/install_ranking_sheet_init_v1218w3.sh" tools/install_ranking_sheet_init_v1218w3.sh
chmod +x tools/install_ranking_sheet_init_v1218w3.sh

echo "Updated: backend/engines/RankingGameEngine.js"
echo "Existing RankingEntries sheet/data will be reused, not deleted."

echo ""
echo "===== RANKING STARTUP HOTFIX TEST ====="
node --check backend/engines/RankingGameEngine.js
node tests/ranking_sheet_init_v1218w3_tests.js
node tests/survivor_ranking_games_v1218w_tests.js

echo ""
echo "===== PRESERVE CURRENT GAME TYPES ====="
for TEST in \
  tests/reality_tv_cast_forward_compat_v1218v3_tests.js \
  tests/team_fantasy_weekly_selection_help_v1218v1_tests.js \
  tests/games_phase1_integration_tests.js
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
echo "===== STAGE EXACT v1.2.18w3 FILES ====="
while IFS= read -r FILE; do
  [ -n "$FILE" ] && git add -A -- "$FILE"
done < CHANGED_FILES_V1_2_18W3.txt
git status --short
if git diff --cached --quiet; then
  echo "STOP: Nothing staged for v1.2.18w3."
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
git commit -m "Fix Ranking sheet initialization race v1.2.18w3"
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
echo " PATTC Predicts v1.2.18w3 COMPLETE"
echo ""
echo " RankingEntries first-open race fixed"
echo " Existing RankingEntries data preserved"
echo " Survivor + Ranking v1.2.18w2 preserved"
echo " Reality + Team Fantasy compatibility checked"
echo " GitHub VERIFIED"
echo " Apps Script deployed"
echo " Production checks passed"
echo " Apps Script version: $VERSION_NUMBER"
echo "=========================================="
