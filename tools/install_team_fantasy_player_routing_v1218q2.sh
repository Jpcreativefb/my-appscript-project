#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-$(git rev-parse --show-toplevel)}"
PKG_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BRANCH="architecture-cleanup"
BASELINE="db71af9041bdfd2a77b929e754b5079ca73504fe"
DEPLOYMENT_ID="AKfycbyDdfv-1xMQTL7LGhGp48_nmWqiNSvNcKLo5IHkAQTxsQCVIPaMP8ZlxMp0ZfT_bzvo"
RELEASE="v1.2.18q2 Team Fantasy Player Routing Repair"

cd "$REPO"
export PYTHONDONTWRITEBYTECODE=1
rm -rf tools/__pycache__

echo ""
echo "=========================================="
echo " PATTC Predicts v1.2.18q2"
echo " Team Fantasy Player Routing Repair"
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
  echo "STOP: Expected production baseline db71af9."
  echo "Current baseline: $LOCAL_SHA"
  exit 1
fi
echo "PRODUCTION BASELINE VERIFIED: db71af9"

echo ""
echo "===== VERIFY q FAILURE LEFT NO RUNTIME CHANGES ====="
if git status --porcelain -- backend/engines/AppDataEngine.js | grep -q .; then
  echo "STOP: AppDataEngine.js is not clean after the failed q attempt."
  exit 1
fi
echo "Failed q attempt left runtime clean."

echo ""
echo "===== VERIFY TEAM FANTASY PREREQUISITES ====="
for FN in \
  getDashboardGameMode_ \
  getDashboardGameTypeLabel_ \
  getDashboardEnterLabel_ \
  getDashboardGameDescription_ \
  getDashboardGameProgressLite_ \
  getDashboardGameProgress_ \
  getDashboardHubPlacement_ \
  buildDashboardGameHubItemLite_ \
  getDashboardLockLabel_
do
  if ! grep -q "function $FN" backend/engines/AppDataEngine.js; then
    echo "STOP: Required AppDataEngine function missing: $FN"
    exit 1
  fi
done
if ! grep -q 'adminPreflightGameType_(game) === "team-fantasy"' backend/admin/AdminPreflight.js; then
  echo "STOP: v1.2.18p Team Fantasy fast preflight is missing."
  exit 1
fi
if ! grep -q 'function teamFantasyPreflightIssues_' backend/engines/SportsTeamFantasyEngine.js; then
  echo "STOP: Team Fantasy engine prerequisite is missing."
  exit 1
fi
if ! grep -q 'if (gameType === "team-fantasy")' frontend/js/app.js; then
  echo "STOP: Team Fantasy player route prerequisite is missing."
  exit 1
fi
if ! grep -Fq '"team-fantasy": ["teamFantasy"]' frontend/js/app.js; then
  echo "STOP: Team Fantasy player module registration is missing."
  exit 1
fi
echo "Team Fantasy prerequisites verified."

echo ""
echo "===== APPLY v1.2.18q2 ====="
python3 "$PKG_ROOT/tools/apply_team_fantasy_player_routing_v1218q2.py" "$REPO"
cp "$PKG_ROOT/tests/team_fantasy_player_routing_v1218q2_tests.js" tests/team_fantasy_player_routing_v1218q2_tests.js
cp "$PKG_ROOT/docs/TEAM_FANTASY_PLAYER_ROUTING_V1_2_18Q2.md" docs/TEAM_FANTASY_PLAYER_ROUTING_V1_2_18Q2.md
cp "$PKG_ROOT/CHANGED_FILES_V1_2_18Q2.txt" CHANGED_FILES_V1_2_18Q2.txt
cp "$PKG_ROOT/tools/apply_team_fantasy_player_routing_v1218q2.py" tools/apply_team_fantasy_player_routing_v1218q2.py
cp "$PKG_ROOT/tools/install_team_fantasy_player_routing_v1218q2.sh" tools/install_team_fantasy_player_routing_v1218q2.sh
chmod +x tools/apply_team_fantasy_player_routing_v1218q2.py tools/install_team_fantasy_player_routing_v1218q2.sh

echo ""
echo "===== JAVASCRIPT / PYTHON SYNTAX ====="
node --check backend/engines/AppDataEngine.js
node --check tests/team_fantasy_player_routing_v1218q2_tests.js
python3 -m py_compile tools/apply_team_fantasy_player_routing_v1218q2.py
rm -rf tools/__pycache__

echo ""
echo "===== TEAM FANTASY PLAYER ROUTING TEST ====="
node tests/team_fantasy_player_routing_v1218q2_tests.js

echo ""
echo "===== TEAM FANTASY REGRESSION CHAIN ====="
for TEST in \
  tests/team_fantasy_v1218j_tests.js \
  tests/team_fantasy_admin_controls_v1218j2_tests.js \
  tests/team_fantasy_transport_scope_v1218j3_tests.js \
  tests/push_automatic_reminders_team_fantasy_compat_v1218j4_tests.js \
  tests/team_fantasy_sports_proxy_routing_v1218o_tests.js \
  tests/team_fantasy_fast_preflight_v1218p_tests.js
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
echo "===== DIFF CHECK ====="
git diff --check

echo ""
echo "===== FULL PRODUCTION CHECKS ====="
bash tools/run_production_checks.sh

echo ""
echo "===== STAGE EXACT v1.2.18q2 FILES ====="
while IFS= read -r FILE; do
  [ -n "$FILE" ] && git add -A -- "$FILE"
done < CHANGED_FILES_V1_2_18Q2.txt

git status --short
if git diff --cached --quiet; then
  echo "STOP: Nothing staged for v1.2.18q2."
  exit 1
fi

echo ""
echo "===== COMMIT ====="
git commit -m "Fix Team Fantasy player routing v1.2.18q2"

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
echo " PATTC Predicts v1.2.18q2 COMPLETE"
echo ""
echo " Team Fantasy Dashboard mode preserved"
echo " Player Play button routes to dedicated lineup"
echo " Lite/full Category progress bypassed"
echo " Sports / NFL placement enforced"
echo " NFL kickoff lock copy fixed"
echo " v1.2.18p fast preflight preserved"
echo " Notifications/Reality compatibility checked"
echo " GitHub VERIFIED"
echo " Apps Script deployed"
echo " Production checks passed"
echo " Apps Script version: $VERSION_NUMBER"
echo "=========================================="
