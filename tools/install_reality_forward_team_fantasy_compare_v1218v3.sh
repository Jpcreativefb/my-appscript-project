#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-$(git rev-parse --show-toplevel)}"
PKG_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BRANCH="architecture-cleanup"
DEPLOYMENT_ID="AKfycbyDdfv-1xMQTL7LGhGp48_nmWqiNSvNcKLo5IHkAQTxsQCVIPaMP8ZlxMp0ZfT_bzvo"
RELEASE="v1.2.18v3 Reality Forward + Team Fantasy Compare Restore"
COMMITTED=0

cd "$REPO"
export PYTHONDONTWRITEBYTECODE=1
rm -rf tools/__pycache__

rollback_precommit(){
  local code=$?
  if [ "$COMMITTED" -eq 0 ]; then
    echo ""
    echo "===== SAFE ROLLBACK ====="
    echo "A pre-deployment check stopped v1.2.18v3. Restoring the synchronized production baseline..."
    if [ -f "$PKG_ROOT/CHANGED_FILES_V1_2_18V3.txt" ]; then
      while IFS= read -r FILE; do
        [ -z "$FILE" ] && continue
        if git cat-file -e "HEAD:$FILE" 2>/dev/null; then
          git restore --source=HEAD --staged --worktree -- "$FILE" 2>/dev/null || true
        else
          rm -rf -- "$FILE"
        fi
      done < "$PKG_ROOT/CHANGED_FILES_V1_2_18V3.txt"
    fi
    rm -rf tools/__pycache__
    echo "Repository restored after failed pre-deployment check."
    git status --short
  fi
  exit "$code"
}
trap rollback_precommit ERR

echo ""
echo "=========================================="
echo " PATTC Predicts v1.2.18v3"
echo " Reality Forward + Fantasy Compare Restore"
echo "=========================================="
echo "Project: $REPO"

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
echo "===== VERIFY CURRENT REALITY + TEAM FANTASY FOUNDATIONS ====="
for CHECK in \
  "frontend/js/pages/teamFantasy.js:TEAM_FANTASY_WEEKLY_SELECTION_HELP_UI_v1218v1" \
  "backend/engines/SportsTeamFantasyEngine.js:TEAM_FANTASY_WEEKLY_SELECTION_HELP_BACKEND_v1218v1" \
  "frontend/js/api.js:function apiAdminPrepareRealityCastDraft" \
  "frontend/js/api.js:function apiAdminPrepareRealityCastImport" \
  "backend/engines/RealityTvSeasonEngine.js:function realityTvPrepareCastImportSheet_" \
  "tests/reality_tv_production_automation_v1218n_tests.js:"
do
  FILE="${CHECK%%:*}"; NEEDLE="${CHECK#*:}"
  [ -f "$FILE" ] || { echo "STOP: Required current-production file missing: $FILE"; exit 1; }
  if [ -n "$NEEDLE" ] && ! grep -Fq "$NEEDLE" "$FILE"; then
    echo "STOP: Required production prerequisite missing: $FILE :: $NEEDLE"
    exit 1
  fi
done
echo "Reality production foundation + Team Fantasy v1 weekly help verified."

echo ""
echo "===== VERIFY PACKAGE SYNTAX BEFORE TOUCHING REPO ====="
node --check "$PKG_ROOT/tools/apply_reality_cast_forwardfix_v1218v2.js"
node --check "$PKG_ROOT/tests/reality_tv_cast_forward_compat_v1218v3_tests.js"
node --check "$PKG_ROOT/tests/team_fantasy_compare_restore_v1218v3_tests.js"
python3 -m py_compile "$PKG_ROOT/tools/apply_team_fantasy_compare_restore_v1218v3.py"
rm -rf "$PKG_ROOT/tools/__pycache__"
bash -n "$PKG_ROOT/tools/install_reality_forward_team_fantasy_compare_v1218v3.sh"

echo ""
echo "===== CARRY LATEST REALITY CAST FIXES FORWARD ====="
node "$PKG_ROOT/tools/apply_reality_cast_forwardfix_v1218v2.js" "$REPO"

echo ""
echo "===== RESTORE TEAM FANTASY COMPARE + HEADER FIX ====="
python3 "$PKG_ROOT/tools/apply_team_fantasy_compare_restore_v1218v3.py" "$REPO"

mkdir -p docs tests tools
cp "$PKG_ROOT/CHANGED_FILES_V1_2_18V3.txt" CHANGED_FILES_V1_2_18V3.txt
cp "$PKG_ROOT/INSTALL_V1_2_18V3.txt" INSTALL_V1_2_18V3.txt
cp "$PKG_ROOT/docs/REALITY_FORWARD_TEAM_FANTASY_COMPARE_V1_2_18V3.md" docs/REALITY_FORWARD_TEAM_FANTASY_COMPARE_V1_2_18V3.md
cp "$PKG_ROOT/tests/reality_tv_cast_forward_compat_v1218v3_tests.js" tests/reality_tv_cast_forward_compat_v1218v3_tests.js
cp "$PKG_ROOT/tests/team_fantasy_compare_restore_v1218v3_tests.js" tests/team_fantasy_compare_restore_v1218v3_tests.js
cp "$PKG_ROOT/tools/apply_reality_cast_forwardfix_v1218v2.js" tools/apply_reality_cast_forwardfix_v1218v2.js
cp "$PKG_ROOT/tools/apply_team_fantasy_compare_restore_v1218v3.py" tools/apply_team_fantasy_compare_restore_v1218v3.py
cp "$PKG_ROOT/tools/install_reality_forward_team_fantasy_compare_v1218v3.sh" tools/install_reality_forward_team_fantasy_compare_v1218v3.sh
chmod +x tools/apply_reality_cast_forwardfix_v1218v2.js tools/apply_team_fantasy_compare_restore_v1218v3.py tools/install_reality_forward_team_fantasy_compare_v1218v3.sh

echo ""
echo "===== REALITY v1.2.18v3 FORWARD-COMPAT TEST ====="
node tests/reality_tv_cast_forward_compat_v1218v3_tests.js

echo ""
echo "===== TEAM FANTASY v1.2.18v3 COMPARE TEST ====="
node tests/team_fantasy_compare_restore_v1218v3_tests.js

echo ""
echo "===== PRESERVE REALITY AUTOMATION / CAST IMPORT ====="
for TEST in \
  tests/reality_tv_cast_import_v1218k_tests.js \
  tests/reality_tv_production_automation_v1218n_tests.js \
  tests/reality_tv_cast_forwardfix_v1218v2_tests.js
 do
  [ -f "$TEST" ] && node "$TEST"
 done

echo ""
echo "===== PRESERVE TEAM FANTASY WEEKLY HELP + REGRESSION CHAIN ====="
for TEST in \
  tests/team_fantasy_weekly_selection_help_v1218v1_tests.js \
  tests/team_fantasy_week_history_compare_v1218u1_tests.js \
  tests/team_fantasy_weekly_hub_v1218t2_tests.js \
  tests/team_fantasy_compact_game_day_v1218s_tests.js \
  tests/team_fantasy_game_day_v1218r1_tests.js \
  tests/team_fantasy_v1218j_tests.js \
  tests/team_fantasy_admin_controls_v1218j2_tests.js \
  tests/push_automatic_reminders_team_fantasy_compat_v1218j4_tests.js \
  tests/team_fantasy_sports_proxy_routing_v1218o_tests.js \
  tests/team_fantasy_fast_preflight_v1218p_tests.js \
  tests/team_fantasy_player_routing_v1218q2_tests.js
 do
  [ -f "$TEST" ] && node "$TEST"
 done

echo ""
echo "===== VERIFY ADMIN TEST LAB REMAINS AVAILABLE ====="
grep -Fq 'Run Team Fantasy Test Lab' frontend/js/pages/teamFantasy.js
python3 - <<'PY'
from pathlib import Path
s=Path('backend/engines/SportsTeamFantasyGameDayEngine.js').read_text()
a=s.index('function teamFantasyBuildSyntheticGameDayLab_()')
b=s.index('function apiAdminGetTeamFantasyTestLab', a)
block=s[a:b]
for forbidden in ('SpreadsheetApp','teamFantasyReadRows_','teamFantasyUpsert_','teamFantasyAppendObject_'):
    if forbidden in block: raise SystemExit('STOP: Test Lab real-data primitive: '+forbidden)
print('PASS: Admin Team Fantasy Test Lab remains available and in-memory only.')
PY

echo ""
echo "===== JAVASCRIPT / PYTHON / SHELL SYNTAX ====="
for FILE in \
  backend/Api.js \
  backend/engines/RealityTvSeasonEngine.js \
  frontend/api.js \
  frontend/js/api.js \
  frontend/js/pages/teamFantasy.js \
  tests/reality_tv_cast_forward_compat_v1218v3_tests.js \
  tests/team_fantasy_compare_restore_v1218v3_tests.js
 do
  node --check "$FILE"
 done
python3 -m py_compile tools/apply_team_fantasy_compare_restore_v1218v3.py
rm -rf tools/__pycache__
bash -n tools/install_reality_forward_team_fantasy_compare_v1218v3.sh

echo ""
echo "===== VERIFY REALITY PATCH IS IDEMPOTENT ====="
BEFORE_HASH="$(sha256sum backend/Api.js backend/engines/RealityTvSeasonEngine.js frontend/api.js frontend/js/api.js frontend/app.html | sha256sum | awk '{print $1}')"
node "$PKG_ROOT/tools/apply_reality_cast_forwardfix_v1218v2.js" "$REPO" >/tmp/pattc-v1218v3-reality-idempotent.log
AFTER_HASH="$(sha256sum backend/Api.js backend/engines/RealityTvSeasonEngine.js frontend/api.js frontend/js/api.js frontend/app.html | sha256sum | awk '{print $1}')"
cat /tmp/pattc-v1218v3-reality-idempotent.log
rm -f /tmp/pattc-v1218v3-reality-idempotent.log
if [ "$BEFORE_HASH" != "$AFTER_HASH" ]; then
  echo "STOP: Reality cast-forward patch is not idempotent on this baseline."
  exit 1
fi
echo "PASS: Reality forward patch is idempotent."

echo ""
echo "===== DIFF CHECK ====="
git diff --check

echo ""
echo "===== FULL PRODUCTION CHECKS ====="
bash tools/run_production_checks.sh

echo ""
echo "===== STAGE EXACT v1.2.18v3 FILES ====="
while IFS= read -r FILE; do
  [ -n "$FILE" ] && git add -A -- "$FILE"
done < CHANGED_FILES_V1_2_18V3.txt
git status --short
if git diff --cached --quiet; then
  echo "STOP: Nothing staged for v1.2.18v3."
  exit 1
fi

echo ""
echo "===== COMMIT ====="
git commit -m "Carry Reality fixes forward and restore Team Fantasy Compare v1.2.18v3"
COMMITTED=1
trap - ERR

clasp_cmd(){
  if command -v clasp >/dev/null 2>&1; then clasp "$@";
  elif command -v npx >/dev/null 2>&1; then npx --yes @google/clasp "$@";
  else echo "STOP: Neither clasp nor npx is available."; return 1; fi
}

echo ""
echo "===== PUSH PATTC APPS SCRIPT ====="
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
echo "Apps Script version: $VERSION_NUMBER"

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
rm -rf tools/__pycache__
git status --short

echo ""
echo "===== CURRENT COMMIT ====="
git log -1 --oneline

echo ""
echo "=========================================="
echo " PATTC Predicts v1.2.18v3 COMPLETE"
echo ""
echo " Latest Reality cast-forward fixes preserved"
echo " Reality staging-row recovery preserved"
echo " Team Fantasy Compare restored"
echo " 2-6 team Compare + Add Team retained"
echo " Frozen viewer header stacking repaired"
echo " Rules + Scoring & Position Stats retained"
echo " OL-before-K / offense-left layout retained"
echo " Admin Team Fantasy Test Lab retained"
echo " GitHub VERIFIED"
echo " Apps Script deployed"
echo " Production checks passed"
echo " Apps Script version: $VERSION_NUMBER"
echo "=========================================="
