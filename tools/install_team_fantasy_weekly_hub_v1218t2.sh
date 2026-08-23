#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-$(git rev-parse --show-toplevel)}"
PKG_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BRANCH="architecture-cleanup"
DEPLOYMENT_ID="AKfycbyDdfv-1xMQTL7LGhGp48_nmWqiNSvNcKLo5IHkAQTxsQCVIPaMP8ZlxMp0ZfT_bzvo"
RELEASE="v1.2.18t2 Team Fantasy Weekly Hub"
COMMITTED=0
EXPECTED_BASELINE="a72ab6bcf1d04a62e18c81f78e656e0c24cf16a8"

cd "$REPO"
export PYTHONDONTWRITEBYTECODE=1
rm -rf tools/__pycache__

rollback_precommit() {
  local code=$?
  if [ "$COMMITTED" -eq 0 ]; then
    echo ""
    echo "===== SAFE ROLLBACK ====="
    echo "A pre-deployment check stopped v1.2.18t2. Restoring the verified current production baseline..."
    if [ -f "$PKG_ROOT/CHANGED_FILES_V1_2_18T2.txt" ]; then
      while IFS= read -r FILE; do
        [ -z "$FILE" ] && continue
        if git cat-file -e "HEAD:$FILE" 2>/dev/null; then
          git restore --source=HEAD --staged --worktree -- "$FILE" 2>/dev/null || true
        else
          rm -rf -- "$FILE"
        fi
      done < "$PKG_ROOT/CHANGED_FILES_V1_2_18T2.txt"
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
echo " PATTC Predicts v1.2.18t2"
echo " Team Fantasy Weekly Hub"
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
echo "===== VERIFY CURRENT GITHUB BASELINE ====="
git fetch origin "$BRANCH"
LOCAL_SHA="$(git rev-parse HEAD)"
REMOTE_SHA="$(git rev-parse "origin/$BRANCH")"
echo "Local:  $LOCAL_SHA"
echo "Remote: $REMOTE_SHA"
if [ "$LOCAL_SHA" != "$REMOTE_SHA" ]; then
  echo "STOP: Local repository and GitHub do not match. Nothing was applied."
  exit 1
fi
echo "GITHUB BASELINE VERIFIED: ${LOCAL_SHA:0:7}"
if [ "$LOCAL_SHA" != "$EXPECTED_BASELINE" ]; then
  echo "STOP: v1.2.18t2 expects deployed 18s baseline $EXPECTED_BASELINE."
  echo "Current baseline is $LOCAL_SHA. Nothing was applied."
  exit 1
fi
echo "EXACT 18s BASELINE VERIFIED: ${EXPECTED_BASELINE:0:7}"

echo ""
echo "===== VERIFY DEPLOYED v1.2.18s PREREQUISITE ====="
for CHECK in \
  "backend/engines/SportsTeamFantasyGameDayEngine.js:TEAM_FANTASY_COMPACT_GAME_DAY_BACKEND_v1218s" \
  "frontend/js/pages/teamFantasy.js:TEAM_FANTASY_COMPACT_GAME_DAY_UI_v1218s" \
  "frontend/js/pages/teamFantasy.js:team-fantasy.css?v=1218s" \
  "frontend/css/team-fantasy.css:v1.2.18s compact game-day rankings + picker" \
  "tests/team_fantasy_compact_game_day_v1218s_tests.js:Team Fantasy v1.2.18s"
do
  FILE="${CHECK%%:*}"; NEEDLE="${CHECK#*:}"
  if ! grep -Fq "$NEEDLE" "$FILE"; then
    echo "STOP: v1.2.18s prerequisite missing: $FILE :: $NEEDLE"
    exit 1
  fi
done
echo "v1.2.18s prerequisite verified."

echo ""
echo "===== VERIFY PACKAGE SYNTAX BEFORE TOUCHING REPO ====="
node --check "$PKG_ROOT/tests/team_fantasy_weekly_hub_v1218t2_tests.js"
python3 -m py_compile "$PKG_ROOT/tools/apply_team_fantasy_weekly_hub_v1218t2.py"
rm -rf "$PKG_ROOT/tools/__pycache__"
bash -n "$PKG_ROOT/tools/install_team_fantasy_weekly_hub_v1218t2.sh"

echo ""
echo "===== APPLY v1.2.18t2 TRANSACTIONALLY ====="
python3 "$PKG_ROOT/tools/apply_team_fantasy_weekly_hub_v1218t2.py" "$REPO"

mkdir -p docs tests tools
cp "$PKG_ROOT/CHANGED_FILES_V1_2_18T2.txt" CHANGED_FILES_V1_2_18T2.txt
cp "$PKG_ROOT/INSTALL_V1_2_18T2.txt" INSTALL_V1_2_18T2.txt
cp "$PKG_ROOT/docs/TEAM_FANTASY_WEEKLY_HUB_V1_2_18T2.md" docs/TEAM_FANTASY_WEEKLY_HUB_V1_2_18T2.md
cp "$PKG_ROOT/tests/team_fantasy_weekly_hub_v1218t2_tests.js" tests/team_fantasy_weekly_hub_v1218t2_tests.js
cp "$PKG_ROOT/tools/apply_team_fantasy_weekly_hub_v1218t2.py" tools/apply_team_fantasy_weekly_hub_v1218t2.py
cp "$PKG_ROOT/tools/install_team_fantasy_weekly_hub_v1218t2.sh" tools/install_team_fantasy_weekly_hub_v1218t2.sh
chmod +x tools/apply_team_fantasy_weekly_hub_v1218t2.py tools/install_team_fantasy_weekly_hub_v1218t2.sh

echo ""
echo "===== JAVASCRIPT / PYTHON SYNTAX ====="
node --check backend/engines/SportsTeamFantasyGameDayEngine.js
node --check frontend/js/pages/teamFantasy.js
node --check tests/team_fantasy_weekly_hub_v1218t2_tests.js
python3 -m py_compile tools/apply_team_fantasy_weekly_hub_v1218t2.py
rm -rf tools/__pycache__

echo ""
echo "===== v1.2.18t2 WEEKLY HUB TEST ====="
node tests/team_fantasy_weekly_hub_v1218t2_tests.js

echo ""
echo "===== REPAIR + PRESERVE v1.2.18s + v1.2.18r1 CONTRACTS ====="
node --check tests/team_fantasy_compact_game_day_v1218s_tests.js
node --check tests/team_fantasy_game_day_v1218r1_tests.js
node tests/team_fantasy_compact_game_day_v1218s_tests.js
node tests/team_fantasy_game_day_v1218r1_tests.js
python3 - <<'PY'
from pathlib import Path
s18=Path('tests/team_fantasy_compact_game_day_v1218s_tests.js').read_text()
r1=Path('tests/team_fantasy_game_day_v1218r1_tests.js').read_text()
if "teamFantasyCssCacheMatch" not in s18 or "!== '1218r1'" not in s18:
    raise SystemExit('STOP: historical 18s cache regression repair missing')
if "teamFantasyCompareSupportsTwoToSix" not in r1 or "+ Add Team" not in r1 or "selected.slice(0,6)" not in r1:
    raise SystemExit('STOP: historical 18r1 compare regression repair missing')
print('PASS: Historical 18s CSS cache regression accepts later Team Fantasy cache versions.')
print('PASS: Historical 18r1 comparison regression accepts + Add Team while preserving the 2–6 cap.')
PY

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
echo "===== VERIFY WEEKLY HUB / CONTRAST CONTRACT ====="
python3 - <<'PY'
from pathlib import Path
page=Path('frontend/js/pages/teamFantasy.js').read_text()
css=Path('frontend/css/team-fantasy.css').read_text()
backend=Path('backend/engines/SportsTeamFantasyGameDayEngine.js').read_text()
checks={
 'Weekly Picks':'<h2>Weekly Picks</h2>' in page,
 'collapse':'teamFantasyLineupCollapsed_' in page,
 'League View':'League View' in page,
 'Compare':'>Compare</button>' in page,
 'Add Team':'+ Add Team' in page,
 'old preset buttons removed':'>H2H</button>' not in page and '>2–6</button>' not in page,
 'weekly math':'pointsBehindLeader' in backend and 'pointsToMoveUp' in backend and 'cushionOverBelow' in backend,
 'league list':'out.leagues = leagues.map' in backend,
 'header contrast':'.tf-weekly-picks-head' in css and 'background:#0f172a' in css and 'color:#f8fafc' in css,
 'compare contrast':'.tf-compare-team-head{background:#0f172a!important;color:#f8fafc!important' in css,
 'cache bump':'team-fantasy.css?v=1218t2' in page,
}
missing=[k for k,v in checks.items() if not v]
if missing: raise SystemExit('STOP: 18t contract missing: '+', '.join(missing))
print('PASS: Weekly Hub / high-contrast header contract verified.')
PY

echo ""
echo "===== VERIFY TEST LAB REMAINS IN-MEMORY ONLY ====="
python3 - <<'PY'
from pathlib import Path
s=Path('backend/engines/SportsTeamFantasyGameDayEngine.js').read_text()
a=s.index('function teamFantasyBuildSyntheticGameDayLab_()')
b=s.index('function apiAdminGetTeamFantasyTestLab', a)
block=s[a:b]
for forbidden in ('SpreadsheetApp', 'teamFantasyReadRows_', 'teamFantasyUpsert_', 'teamFantasyAppendObject_'):
    if forbidden in block: raise SystemExit('STOP: Test Lab real-data primitive: '+forbidden)
print('PASS: Synthetic Test Lab remains in-memory only.')
PY

echo ""
echo "===== VERIFY CLEAN EOF ====="
python3 - <<'PY'
from pathlib import Path
for name in ('frontend/css/team-fantasy.css','frontend/js/pages/teamFantasy.js','backend/engines/SportsTeamFantasyGameDayEngine.js'):
    data=Path(name).read_bytes()
    if data.endswith(b'\n\n'): raise SystemExit('STOP: extra blank line at EOF: '+name)
    if not data.endswith(b'\n'): raise SystemExit('STOP: missing final newline: '+name)
print('PASS: 18t runtime files have clean EOF markers.')
PY

echo ""
echo "===== DIFF CHECK ====="
git diff --check

echo ""
echo "===== FULL PRODUCTION CHECKS ====="
bash tools/run_production_checks.sh

echo ""
echo "===== STAGE EXACT v1.2.18t2 FILES ====="
while IFS= read -r FILE; do [ -n "$FILE" ] && git add -A -- "$FILE"; done < CHANGED_FILES_V1_2_18T2.txt
git status --short
if git diff --cached --quiet; then echo "STOP: Nothing staged for v1.2.18t2."; exit 1; fi

echo ""
echo "===== COMMIT ====="
git commit -m "Add Team Fantasy Weekly Hub v1.2.18t2"
COMMITTED=1
trap - ERR

clasp_cmd() {
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
if ! [[ "$VERSION_NUMBER" =~ ^[0-9]+$ ]]; then echo "STOP: Could not determine Apps Script version."; exit 1; fi
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
if [ "$LOCAL_SHA" != "$REMOTE_SHA" ]; then echo "STOP: GitHub verification failed."; exit 1; fi
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
echo " PATTC Predicts v1.2.18t2 COMPLETE"
echo ""
echo " Weekly Picks high-contrast header fixed"
echo " Completed lineups collapse by default"
echo " League View + Compare installed"
echo " Complete/subleague weekly race installed"
echo " Behind leader / move-up / cushion math installed"
echo " Single + Add Team compare flow installed"
echo " 18s compact picker/AP-R/ranks preserved"
echo " 18r1 Test Lab / 5-min scoring preserved"
echo " Historical 18r1 2–6 comparison contract repaired"
echo " Notifications / Reality compatibility checked"
echo " GitHub VERIFIED"
echo " Apps Script deployed"
echo " Production checks passed"
echo " Apps Script version: $VERSION_NUMBER"
echo "=========================================="
