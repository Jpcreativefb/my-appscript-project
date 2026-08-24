#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-$(git rev-parse --show-toplevel)}"
PKG_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BRANCH="architecture-cleanup"
DEPLOYMENT_ID="AKfycbyDdfv-1xMQTL7LGhGp48_nmWqiNSvNcKLo5IHkAQTxsQCVIPaMP8ZlxMp0ZfT_bzvo"
RELEASE="v1.2.18v1 Team Fantasy Weekly Picks Rules + Scoring"
COMMITTED=0
EXPECTED_BASELINE="ae6c8c5f24f200145e939a97fde9d8f188f6a531"

cd "$REPO"
export PYTHONDONTWRITEBYTECODE=1
rm -rf tools/__pycache__

rollback_precommit() {
  local code=$?
  if [ "$COMMITTED" -eq 0 ]; then
    echo ""
    echo "===== SAFE ROLLBACK ====="
    echo "A pre-deployment check stopped v1.2.18v1. Restoring the verified v1.2.18u1 production baseline..."
    if [ -f "$PKG_ROOT/CHANGED_FILES_V1_2_18V1.txt" ]; then
      while IFS= read -r FILE; do
        [ -z "$FILE" ] && continue
        if git cat-file -e "HEAD:$FILE" 2>/dev/null; then
          git restore --source=HEAD --staged --worktree -- "$FILE" 2>/dev/null || true
        else
          rm -rf -- "$FILE"
        fi
      done < "$PKG_ROOT/CHANGED_FILES_V1_2_18V1.txt"
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
echo " PATTC Predicts v1.2.18v1"
echo " Team Fantasy Weekly Picks Rules + Scoring"
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
echo "===== VERIFY EXACT v1.2.18u1 PRODUCTION BASELINE ====="
git fetch origin "$BRANCH"
LOCAL_SHA="$(git rev-parse HEAD)"
REMOTE_SHA="$(git rev-parse "origin/$BRANCH")"
echo "Local:  $LOCAL_SHA"
echo "Remote: $REMOTE_SHA"
if [ "$LOCAL_SHA" != "$REMOTE_SHA" ]; then
  echo "STOP: Local repository and GitHub do not match. Nothing was applied."
  exit 1
fi
if [ "$LOCAL_SHA" != "$EXPECTED_BASELINE" ]; then
  echo "STOP: v1.2.18v1 requires production baseline $EXPECTED_BASELINE."
  echo "Current baseline: $LOCAL_SHA"
  exit 1
fi
echo "GITHUB + v1.2.18u1 BASELINE VERIFIED: ${LOCAL_SHA:0:7}"

echo ""
echo "===== VERIFY v1.2.18u1 PREREQUISITES ====="
for CHECK in \
  "backend/engines/SportsTeamFantasyGameDayEngine.js:TEAM_FANTASY_WEEKLY_HISTORY_COMPARE_BACKEND_v1218u1" \
  "frontend/js/pages/teamFantasy.js:TEAM_FANTASY_WEEKLY_HISTORY_COMPARE_UI_v1218u1" \
  "frontend/js/pages/teamFantasy.js:team-fantasy.css?v=1218u1" \
  "frontend/css/team-fantasy.css:v1.2.18u1 picker remaining-use palette + bye handling" \
  "tests/team_fantasy_week_history_compare_v1218u1_tests.js:Team Fantasy v1.2.18u1 dark surfaces + sticky compare + Week History tests passed."
do
  FILE="${CHECK%%:*}"; NEEDLE="${CHECK#*:}"
  if ! grep -Fq "$NEEDLE" "$FILE"; then
    echo "STOP: v1.2.18u1 prerequisite missing: $FILE :: $NEEDLE"
    exit 1
  fi
done
echo "v1.2.18u1 prerequisite verified."

echo ""
echo "===== VERIFY PACKAGE SYNTAX BEFORE TOUCHING REPO ====="
node --check "$PKG_ROOT/tests/team_fantasy_weekly_selection_help_v1218v1_tests.js"
python3 -m py_compile "$PKG_ROOT/tools/apply_team_fantasy_weekly_selection_help_v1218v1.py"
rm -rf "$PKG_ROOT/tools/__pycache__"
bash -n "$PKG_ROOT/tools/install_team_fantasy_weekly_selection_help_v1218v1.sh"

echo ""
echo "===== APPLY v1.2.18v1 TRANSACTIONALLY ====="
python3 "$PKG_ROOT/tools/apply_team_fantasy_weekly_selection_help_v1218v1.py" "$REPO"

mkdir -p docs tests tools
cp "$PKG_ROOT/CHANGED_FILES_V1_2_18V1.txt" CHANGED_FILES_V1_2_18V1.txt
cp "$PKG_ROOT/INSTALL_V1_2_18V1.txt" INSTALL_V1_2_18V1.txt
cp "$PKG_ROOT/docs/TEAM_FANTASY_WEEKLY_SELECTION_HELP_V1_2_18V1.md" docs/TEAM_FANTASY_WEEKLY_SELECTION_HELP_V1_2_18V1.md
cp "$PKG_ROOT/tests/team_fantasy_weekly_selection_help_v1218v1_tests.js" tests/team_fantasy_weekly_selection_help_v1218v1_tests.js
cp "$PKG_ROOT/tools/apply_team_fantasy_weekly_selection_help_v1218v1.py" tools/apply_team_fantasy_weekly_selection_help_v1218v1.py
cp "$PKG_ROOT/tools/install_team_fantasy_weekly_selection_help_v1218v1.sh" tools/install_team_fantasy_weekly_selection_help_v1218v1.sh
chmod +x tools/apply_team_fantasy_weekly_selection_help_v1218v1.py tools/install_team_fantasy_weekly_selection_help_v1218v1.sh

echo ""
echo "===== JAVASCRIPT / PYTHON / SHELL SYNTAX ====="
node --check backend/engines/SportsTeamFantasyEngine.js
node --check frontend/js/pages/teamFantasy.js
node --check tests/team_fantasy_weekly_selection_help_v1218v1_tests.js
node --check tests/team_fantasy_game_day_v1218r1_tests.js
node --check tests/team_fantasy_week_history_compare_v1218u1_tests.js
node --check tests/team_fantasy_weekly_hub_v1218t2_tests.js
python3 -m py_compile tools/apply_team_fantasy_weekly_selection_help_v1218v1.py
rm -rf tools/__pycache__
bash -n tools/install_team_fantasy_weekly_selection_help_v1218v1.sh

echo ""
echo "===== v1.2.18v1 WEEKLY SELECTION HELP TEST ====="
node tests/team_fantasy_weekly_selection_help_v1218v1_tests.js

echo ""
echo "===== PRESERVE v1.2.18u1 / 18t2 / 18s / 18r1 CONTRACTS ====="
node tests/team_fantasy_week_history_compare_v1218u1_tests.js
node tests/team_fantasy_weekly_hub_v1218t2_tests.js
node tests/team_fantasy_compact_game_day_v1218s_tests.js
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
echo "===== VERIFY v1.2.18v1 PLAYER CONTRACT ====="
python3 - <<'PY'
from pathlib import Path
page=Path('frontend/js/pages/teamFantasy.js').read_text()
css=Path('frontend/css/team-fantasy.css').read_text()
backend=Path('backend/engines/SportsTeamFantasyEngine.js').read_text()

def block(source, name):
    marker='function '+name+'('
    start=source.find(marker)
    if start < 0: raise SystemExit('STOP: missing function '+name)
    next_start=source.find('\nfunction ', start+len(marker))
    return source[start: next_start if next_start >= 0 else len(source)]

checks={
 '18v1 UI marker':'TEAM_FANTASY_WEEKLY_SELECTION_HELP_UI_v1218v1' in page,
 '18v1 backend marker':'TEAM_FANTASY_WEEKLY_SELECTION_HELP_BACKEND_v1218v1' in backend,
 '18v1 cache':'team-fantasy.css?v=1218v1' in page,
 'live scoring rules':'scoringRules: teamFantasyRules_(gameId).filter(function(rule) { return rule.active; })' in backend,
 'Rules popup':'function teamFantasyOpenRules_()' in page,
 'Scoring popup':'function teamFantasyOpenScoring_()' in page,
 'help row':'tf-weekly-help-row' in block(page,'teamFantasyRenderLineup_'),
 'desktop position layout':'grid-template-areas:"qb k" "rb dl" "wrte lb" "ol db"' in css,
 'mobile position order':'grid-template-areas:"qb" "rb" "wrte" "ol" "k" "dl" "lb" "db"' in css,
 'Weekly Standings':'Weekly Standings' in block(page,'teamFantasyRenderGameDayIntoMount_'),
 'Week History retained':'teamFantasyRenderWeekHistory_(res)' in page,
 'usage retained':'teamFantasyPickerRemaining_' in page,
 'BYE retained':'teamFantasyPickerIsBye_' in page,
 'u1 marker retained':'TEAM_FANTASY_WEEKLY_HISTORY_COMPARE_UI_v1218u1' in page,
}
missing=[k for k,v in checks.items() if not v]
if missing: raise SystemExit('STOP: 18v1 contract missing: '+', '.join(missing))
game_day=block(page,'teamFantasyRenderGameDayIntoMount_')
if '>Compare<' in game_day or '+ Add Team' in game_day:
    raise SystemExit('STOP: player-facing Compare controls remain in Weekly Standings mount')
test_lab=block(page,'teamFantasyRunTestLab_')
if 'Six-Team Synthetic Compare' in test_lab or 'Synthetic Weekly League Race' in test_lab:
    raise SystemExit('STOP: retired Synthetic Compare wording remains in Test Lab')
print('PASS: v1.2.18v1 Weekly Picks rules/scoring/layout/standings contract verified.')
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
print('PASS: Team Fantasy Test Lab remains in-memory only.')
PY

echo ""
echo "===== VERIFY CLEAN EOF ====="
python3 - <<'PY'
from pathlib import Path
names=(
 'backend/engines/SportsTeamFantasyEngine.js',
 'frontend/css/team-fantasy.css',
 'frontend/js/pages/teamFantasy.js',
 'tests/team_fantasy_game_day_v1218r1_tests.js',
 'tests/team_fantasy_week_history_compare_v1218u1_tests.js',
 'tests/team_fantasy_weekly_hub_v1218t2_tests.js',
 'tests/team_fantasy_weekly_selection_help_v1218v1_tests.js',
 'docs/TEAM_FANTASY_WEEKLY_SELECTION_HELP_V1_2_18V1.md',
 'CHANGED_FILES_V1_2_18V1.txt',
 'INSTALL_V1_2_18V1.txt',
)
for name in names:
    data=Path(name).read_bytes()
    if data.endswith(b'\n\n'): raise SystemExit('STOP: extra blank line at EOF: '+name)
    if not data.endswith(b'\n'): raise SystemExit('STOP: missing final newline: '+name)
print('PASS: v1.2.18v1 modified files have clean EOF markers.')
PY

echo ""
echo "===== DIFF CHECK ====="
git diff --check

echo ""
echo "===== FULL PRODUCTION CHECKS ====="
bash tools/run_production_checks.sh

echo ""
echo "===== STAGE EXACT v1.2.18v1 FILES ====="
while IFS= read -r FILE; do [ -n "$FILE" ] && git add -A -- "$FILE"; done < CHANGED_FILES_V1_2_18V1.txt
git status --short
if git diff --cached --quiet; then echo "STOP: Nothing staged for v1.2.18v1."; exit 1; fi

echo ""
echo "===== COMMIT ====="
git commit -m "Add Team Fantasy weekly rules and scoring help v1.2.18v1"
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
echo " PATTC Predicts v1.2.18v1 COMPLETE"
echo ""
echo " Rules added at the top of Weekly Picks"
echo " Scoring & Position Stats added at the top of Weekly Picks"
echo " Scoring popup uses current active TeamFantasyScoringRules"
echo " One-column order: QB RB WR/TE OL K DL LB DB"
echo " Two-column layout: offense left; K/defense right"
echo " Player-facing Compare / Six-Team Synthetic Compare retired"
echo " Weekly Standings + past-week selector retained"
echo " Week History + usage limits + BYE behavior retained"
echo " GitHub VERIFIED"
echo " Apps Script deployed"
echo " Production checks passed"
echo " Apps Script version: $VERSION_NUMBER"
echo "=========================================="
