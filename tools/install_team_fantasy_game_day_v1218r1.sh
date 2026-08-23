#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-$(git rev-parse --show-toplevel)}"
PKG_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BRANCH="architecture-cleanup"
BASELINE="181e58a8cb6537a91895b05ffe881daefe987609"
DEPLOYMENT_ID="AKfycbyDdfv-1xMQTL7LGhGp48_nmWqiNSvNcKLo5IHkAQTxsQCVIPaMP8ZlxMp0ZfT_bzvo"
RELEASE="v1.2.18r1 Team Fantasy Game Day + Test Lab"
COMMITTED=0

cd "$REPO"
export PYTHONDONTWRITEBYTECODE=1
rm -rf tools/__pycache__

cleanup_precommit_failure() {
  local code=$?
  if [ "$COMMITTED" -eq 0 ]; then
    echo ""
    echo "===== SAFE ROLLBACK ====="
    echo "A pre-deployment check stopped v1.2.18r1. Restoring the verified production baseline..."
    if [ -f "$PKG_ROOT/CHANGED_FILES_V1_2_18R1.txt" ]; then
      while IFS= read -r FILE; do
        [ -z "$FILE" ] && continue
        if git cat-file -e "HEAD:$FILE" 2>/dev/null; then
          git restore --source=HEAD --staged --worktree -- "$FILE" 2>/dev/null || true
        else
          rm -rf -- "$FILE"
        fi
      done < "$PKG_ROOT/CHANGED_FILES_V1_2_18R1.txt"
    fi
    rm -rf tools/__pycache__
    echo "Repository restored after failed pre-deployment check."
    git status --short
  fi
  exit "$code"
}
trap cleanup_precommit_failure ERR

echo ""
echo "=========================================="
echo " PATTC Predicts v1.2.18r1"
echo " Team Fantasy Game Day + Test Lab"
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
echo "===== VERIFY EXACT PRODUCTION BASELINE ====="
git fetch origin "$BRANCH"
LOCAL_SHA="$(git rev-parse HEAD)"
REMOTE_SHA="$(git rev-parse "origin/$BRANCH")"
echo "Local:  $LOCAL_SHA"
echo "Remote: $REMOTE_SHA"
if [ "$LOCAL_SHA" != "$REMOTE_SHA" ]; then
  echo "STOP: Local repository and GitHub do not match. Nothing was applied."
  exit 1
fi
if [ "$LOCAL_SHA" != "$BASELINE" ]; then
  echo "STOP: Expected production baseline 181e58a."
  echo "Current baseline: $LOCAL_SHA"
  exit 1
fi
echo "PRODUCTION BASELINE VERIFIED: 181e58a"

echo ""
echo "===== VERIFY TEAM FANTASY PRODUCTION CHAIN ====="
for CHECK in \
  "backend/engines/SportsTeamFantasyEngine.js:function teamFantasyPreflightIssues_" \
  "backend/engines/SportsTeamFantasyEngine.js:function teamFantasySportsEngineJson_" \
  "backend/admin/AdminPreflight.js:adminPreflightGameType_(game) === \"team-fantasy\"" \
  "backend/engines/AppDataEngine.js:getDashboardGameProgressLite_" \
  "frontend/js/pages/teamFantasy.js:teamFantasyFill_" \
  "frontend/js/pages/adminTeamFantasy.js:adminTfInstallTrigger_"
do
  FILE="${CHECK%%:*}"
  NEEDLE="${CHECK#*:}"
  if ! grep -Fq "$NEEDLE" "$FILE"; then
    echo "STOP: Required Team Fantasy prerequisite is missing: $FILE :: $NEEDLE"
    exit 1
  fi
done
if [ ! -f tests/team_fantasy_player_routing_v1218q2_tests.js ]; then
  echo "STOP: v1.2.18q2 production checkpoint test is missing."
  exit 1
fi
echo "Team Fantasy q2 / p / o prerequisites verified."

echo ""
echo "===== VERIFY PACKAGE SYNTAX BEFORE TOUCHING REPO ====="
node --check "$PKG_ROOT/backend/engines/SportsTeamFantasyGameDayEngine.js"
node --check "$PKG_ROOT/tests/team_fantasy_game_day_v1218r1_tests.js"
python3 -m py_compile "$PKG_ROOT/tools/apply_team_fantasy_game_day_v1218r1.py"
rm -rf "$PKG_ROOT/tools/__pycache__"
bash -n "$PKG_ROOT/tools/install_team_fantasy_game_day_v1218r1.sh"

echo ""
echo "===== APPLY v1.2.18r1 TRANSACTIONALLY ====="
python3 "$PKG_ROOT/tools/apply_team_fantasy_game_day_v1218r1.py" "$REPO"

mkdir -p docs tests tools
cp "$PKG_ROOT/CHANGED_FILES_V1_2_18R1.txt" CHANGED_FILES_V1_2_18R1.txt
cp "$PKG_ROOT/INSTALL_V1_2_18R1.txt" INSTALL_V1_2_18R1.txt
cp "$PKG_ROOT/docs/TEAM_FANTASY_GAME_DAY_TEST_LAB_V1_2_18R1.md" docs/TEAM_FANTASY_GAME_DAY_TEST_LAB_V1_2_18R1.md
cp "$PKG_ROOT/tests/team_fantasy_game_day_v1218r1_tests.js" tests/team_fantasy_game_day_v1218r1_tests.js
cp "$PKG_ROOT/tools/apply_team_fantasy_game_day_v1218r1.py" tools/apply_team_fantasy_game_day_v1218r1.py
cp "$PKG_ROOT/tools/install_team_fantasy_game_day_v1218r1.sh" tools/install_team_fantasy_game_day_v1218r1.sh
chmod +x tools/apply_team_fantasy_game_day_v1218r1.py tools/install_team_fantasy_game_day_v1218r1.sh

echo ""
echo "===== JAVASCRIPT / PYTHON SYNTAX ====="
for FILE in \
  backend/engines/SportsTeamFantasyEngine.js \
  backend/engines/SportsTeamFantasyGameDayEngine.js \
  backend/Api.js \
  frontend/js/pages/teamFantasy.js \
  frontend/js/pages/adminTeamFantasy.js \
  tests/team_fantasy_game_day_v1218r1_tests.js
do
  node --check "$FILE"
done
python3 -m py_compile "$PKG_ROOT/tools/apply_team_fantasy_game_day_v1218r1.py"
rm -rf "$PKG_ROOT/tools/__pycache__" tools/__pycache__

echo ""
echo "===== SYNTHETIC SIX-TEAM TEST LAB ====="
node tests/team_fantasy_game_day_v1218r1_tests.js

echo ""
echo "===== TEAM FANTASY REGRESSION CHAIN ====="
for TEST in \
  tests/team_fantasy_v1218j_tests.js \
  tests/team_fantasy_admin_controls_v1218j2_tests.js \
  tests/team_fantasy_transport_scope_v1218j3_tests.js \
  tests/push_automatic_reminders_team_fantasy_compat_v1218j4_tests.js \
  tests/team_fantasy_sports_proxy_routing_v1218o_tests.js \
  tests/team_fantasy_fast_preflight_v1218p_tests.js \
  tests/team_fantasy_player_routing_v1218q2_tests.js
do
  [ -f "$TEST" ] && node "$TEST"
done

echo ""
echo "===== REALITY / NOTIFICATION COMPATIBILITY ====="
for TEST in \
  tests/push_missing_pick_reminders_v1218h_tests.js \
  tests/push_notification_test_lab_v1218i_tests.js \
  tests/push_automatic_pick_reminder_scheduling_v1218j_tests.js \
  tests/reality_tv_cast_import_v1218k_tests.js \
  tests/reality_tv_production_automation_v1218n_tests.js
do
  [ -f "$TEST" ] && node "$TEST"
done

echo ""
echo "===== VERIFY TEST LAB DOES NOT WRITE REAL DATA ====="
python3 - <<'PY'
from pathlib import Path
s=Path('backend/engines/SportsTeamFantasyGameDayEngine.js').read_text()
a=s.index('function teamFantasyBuildSyntheticGameDayLab_()')
b=s.index('function apiAdminGetTeamFantasyTestLab', a)
block=s[a:b]
for forbidden in ('SpreadsheetApp', 'teamFantasyReadRows_', 'teamFantasyUpsert_', 'teamFantasyAppendObject_'):
    if forbidden in block:
        raise SystemExit('STOP: Synthetic Test Lab contains a real-data write/read primitive: ' + forbidden)
print('PASS: Synthetic Test Lab is in-memory only.')
PY

echo ""
echo "===== VERIFY CLEAN EOF ====="
python3 - <<'PYEOF'
from pathlib import Path
for name in ('frontend/css/team-fantasy.css', 'frontend/js/pages/teamFantasy.js'):
    data = Path(name).read_bytes()
    if data.endswith(b"\n\n"):
        raise SystemExit("STOP: extra blank line at EOF: " + name)
    if not data.endswith(b"\n"):
        raise SystemExit("STOP: missing final newline: " + name)
print("PASS: Team Fantasy frontend files have clean EOF markers.")
PYEOF

echo ""
echo "===== DIFF CHECK ====="
git diff --check

echo ""
echo "===== FULL PRODUCTION CHECKS ====="
bash tools/run_production_checks.sh

echo ""
echo "===== STAGE EXACT v1.2.18r1 FILES ====="
while IFS= read -r FILE; do
  [ -n "$FILE" ] && git add -A -- "$FILE"
done < CHANGED_FILES_V1_2_18R1.txt

git status --short
if git diff --cached --quiet; then
  echo "STOP: Nothing staged for v1.2.18r1."
  exit 1
fi

echo ""
echo "===== COMMIT ====="
git commit -m "Add Team Fantasy game-day Test Lab and live compare v1.2.18r1"
COMMITTED=1
trap - ERR

clasp_cmd() {
  if command -v clasp >/dev/null 2>&1; then
    clasp "$@"
  elif command -v npx >/dev/null 2>&1; then
    npx --yes @google/clasp "$@"
  else
    echo "STOP: Neither clasp nor npx is available."
    return 1
  fi
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
LOCAL_SHA="$(git rev-parse HEAD)"
REMOTE_SHA="$(git rev-parse "origin/$BRANCH")"
if [ "$LOCAL_SHA" != "$REMOTE_SHA" ]; then
  echo "STOP: GitHub verification failed."
  echo "Local:  $LOCAL_SHA"
  echo "Remote: $REMOTE_SHA"
  exit 1
fi
echo "GITHUB VERIFIED: $REMOTE_SHA"

echo ""
echo "===== VERIFY APPS SCRIPT ====="
clasp_cmd deployments

echo ""
echo "===== FINAL PRODUCTION CHECK ====="
bash tools/run_production_checks.sh
rm -rf tools/__pycache__

echo ""
echo "===== FINAL GIT STATUS ====="
git status --short

echo ""
echo "===== CURRENT COMMIT ====="
git log -1 --oneline

echo ""
echo "=========================================="
echo " PATTC Predicts v1.2.18r1 COMPLETE"
echo ""
echo " Synthetic 6-team Test Lab installed"
echo " Test Lab writes no real Team Fantasy rows"
echo " Team usage verified per team / per position"
echo " 2-6 team game-day comparison installed"
echo " Opponent picks hidden until kickoff"
echo " Live / Final / Upcoming visual states installed"
echo " Cached fantasy scores poll every 5 minutes"
echo " Random / Auto Pick inline progress installed"
echo " 5-minute game-day trigger installer ready"
echo " q2 / p / o Team Fantasy chain preserved"
echo " Notifications / Reality compatibility checked"
echo " GitHub VERIFIED"
echo " Apps Script deployed"
echo " Production checks passed"
echo " Apps Script version: $VERSION_NUMBER"
echo ""
echo " NEXT: Run the in-app Test Lab first."
echo " If every check passes, click Install / Update 5-min Sync once in Team Fantasy Admin."
echo "=========================================="
