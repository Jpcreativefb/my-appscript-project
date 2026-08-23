#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-$(git rev-parse --show-toplevel)}"
PKG_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BRANCH="architecture-cleanup"
BASELINE="f99f9a172e23c7e0d9369206aa1626c974ef5fff"
DEPLOYMENT_ID="AKfycbyDdfv-1xMQTL7LGhGp48_nmWqiNSvNcKLo5IHkAQTxsQCVIPaMP8ZlxMp0ZfT_bzvo"
RELEASE="v1.2.18s Team Fantasy Compact Game-Day UX"
COMMITTED=0

cd "$REPO"
export PYTHONDONTWRITEBYTECODE=1
rm -rf tools/__pycache__

rollback_precommit() {
  local code=$?
  if [ "$COMMITTED" -eq 0 ]; then
    echo ""
    echo "===== SAFE ROLLBACK ====="
    echo "A pre-deployment check stopped v1.2.18s. Restoring verified v1.2.18r1 production baseline..."
    if [ -f "$PKG_ROOT/CHANGED_FILES_V1_2_18S.txt" ]; then
      while IFS= read -r FILE; do
        [ -z "$FILE" ] && continue
        if git cat-file -e "HEAD:$FILE" 2>/dev/null; then
          git restore --source=HEAD --staged --worktree -- "$FILE" 2>/dev/null || true
        else
          rm -rf -- "$FILE"
        fi
      done < "$PKG_ROOT/CHANGED_FILES_V1_2_18S.txt"
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
echo " PATTC Predicts v1.2.18s"
echo " Team Fantasy Compact Game-Day UX"
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
echo "===== VERIFY EXACT v1.2.18r1 PRODUCTION BASELINE ====="
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
  echo "STOP: Expected production baseline f99f9a1 (v1.2.18r1)."
  echo "Current baseline: $LOCAL_SHA"
  exit 1
fi
echo "PRODUCTION BASELINE VERIFIED: f99f9a1"

echo ""
echo "===== VERIFY 18r1 GAME-DAY FOUNDATION ====="
for CHECK in \
  "backend/engines/SportsTeamFantasyGameDayEngine.js:TEAM_FANTASY_GAME_DAY_VERSION" \
  "frontend/js/pages/teamFantasy.js:TEAM_FANTASY_GAME_DAY_UI_v1218r1" \
  "frontend/js/pages/teamFantasy.js:Run 6-Team Test Lab" \
  "frontend/css/team-fantasy.css:v1.2.18r1 game-day compare + synthetic Test Lab" \
  "tests/team_fantasy_game_day_v1218r1_tests.js:Team Fantasy v1.2.18r1"
do
  FILE="${CHECK%%:*}"
  NEEDLE="${CHECK#*:}"
  if ! grep -Fq "$NEEDLE" "$FILE"; then
    echo "STOP: Required v1.2.18r1 prerequisite is missing: $FILE :: $NEEDLE"
    exit 1
  fi
done
echo "v1.2.18r1 game-day foundation verified."

echo ""
echo "===== VERIFY PACKAGE SYNTAX BEFORE TOUCHING REPO ====="
node --check "$PKG_ROOT/tests/team_fantasy_compact_game_day_v1218s_tests.js"
python3 -m py_compile "$PKG_ROOT/tools/apply_team_fantasy_compact_game_day_v1218s.py"
rm -rf "$PKG_ROOT/tools/__pycache__"
bash -n "$PKG_ROOT/tools/install_team_fantasy_compact_game_day_v1218s.sh"

echo ""
echo "===== APPLY v1.2.18s TRANSACTIONALLY ====="
python3 "$PKG_ROOT/tools/apply_team_fantasy_compact_game_day_v1218s.py" "$REPO"

mkdir -p docs tests tools
cp "$PKG_ROOT/CHANGED_FILES_V1_2_18S.txt" CHANGED_FILES_V1_2_18S.txt
cp "$PKG_ROOT/INSTALL_V1_2_18S.txt" INSTALL_V1_2_18S.txt
cp "$PKG_ROOT/docs/TEAM_FANTASY_COMPACT_GAME_DAY_V1_2_18S.md" docs/TEAM_FANTASY_COMPACT_GAME_DAY_V1_2_18S.md
cp "$PKG_ROOT/tests/team_fantasy_compact_game_day_v1218s_tests.js" tests/team_fantasy_compact_game_day_v1218s_tests.js
cp "$PKG_ROOT/tools/apply_team_fantasy_compact_game_day_v1218s.py" tools/apply_team_fantasy_compact_game_day_v1218s.py
cp "$PKG_ROOT/tools/install_team_fantasy_compact_game_day_v1218s.sh" tools/install_team_fantasy_compact_game_day_v1218s.sh
chmod +x tools/apply_team_fantasy_compact_game_day_v1218s.py tools/install_team_fantasy_compact_game_day_v1218s.sh

echo ""
echo "===== JAVASCRIPT / PYTHON SYNTAX ====="
node --check backend/engines/SportsTeamFantasyGameDayEngine.js
node --check frontend/js/pages/teamFantasy.js
node --check tests/team_fantasy_compact_game_day_v1218s_tests.js
python3 -m py_compile tools/apply_team_fantasy_compact_game_day_v1218s.py
rm -rf tools/__pycache__

echo ""
echo "===== v1.2.18s COMPACT GAME-DAY TEST ====="
node tests/team_fantasy_compact_game_day_v1218s_tests.js

echo ""
echo "===== EXISTING 18r1 TEST LAB CONTRACT ====="
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
echo "===== VERIFY TEST LAB REMAINS IN-MEMORY ONLY ====="
python3 - <<'PY'
from pathlib import Path
s=Path('backend/engines/SportsTeamFantasyGameDayEngine.js').read_text()
a=s.index('function teamFantasyBuildSyntheticGameDayLab_()')
b=s.index('function apiAdminGetTeamFantasyTestLab', a)
block=s[a:b]
for forbidden in ('SpreadsheetApp', 'teamFantasyReadRows_', 'teamFantasyUpsert_', 'teamFantasyAppendObject_'):
    if forbidden in block:
        raise SystemExit('STOP: Synthetic Test Lab contains a real-data primitive: ' + forbidden)
print('PASS: Synthetic Test Lab remains in-memory only.')
PY

echo ""
echo "===== VERIFY COMPACT UX CONTRACT ====="
python3 - <<'PY'
from pathlib import Path
page=Path('frontend/js/pages/teamFantasy.js').read_text()
css=Path('frontend/css/team-fantasy.css').read_text()
checks={
 'logo picker':'teamFantasyOpenTeamPicker_' in page,
 'limit filter':"team.eligible === true" in page,
 'AP/R badge':'tf-pick-method' in page,
 'weekly rank':'tf-slot-rank' in page,
 'league record':'tf-compare-record' in page,
 'sticky header':'.tf-compare-team-head{position:sticky' in css,
 'live green':'#16a34a' in css,
 'final blue':'#2563eb' in css,
 'upcoming gray':'#94a3b8' in css,
 'css cache bump':'team-fantasy.css?v=1218s' in page,
}
missing=[name for name,ok in checks.items() if not ok]
if missing: raise SystemExit('STOP: compact UX contract missing: '+', '.join(missing))
print('PASS: Compact lineup / compare UX contract verified.')
PY

echo ""
echo "===== VERIFY CLEAN EOF ====="
python3 - <<'PY'
from pathlib import Path
for name in ('frontend/css/team-fantasy.css','frontend/js/pages/teamFantasy.js','backend/engines/SportsTeamFantasyGameDayEngine.js'):
    data=Path(name).read_bytes()
    if data.endswith(b'\n\n'): raise SystemExit('STOP: extra blank line at EOF: '+name)
    if not data.endswith(b'\n'): raise SystemExit('STOP: missing final newline: '+name)
print('PASS: 18s runtime files have clean EOF markers.')
PY

echo ""
echo "===== DIFF CHECK ====="
git diff --check

echo ""
echo "===== FULL PRODUCTION CHECKS ====="
bash tools/run_production_checks.sh

echo ""
echo "===== STAGE EXACT v1.2.18s FILES ====="
while IFS= read -r FILE; do
  [ -n "$FILE" ] && git add -A -- "$FILE"
done < CHANGED_FILES_V1_2_18S.txt

git status --short
if git diff --cached --quiet; then
  echo "STOP: Nothing staged for v1.2.18s."
  exit 1
fi

echo ""
echo "===== COMMIT ====="
git commit -m "Polish Team Fantasy compact game-day UX v1.2.18s"
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
echo " PATTC Predicts v1.2.18s COMPLETE"
echo ""
echo " Compact logo + abbreviation team picker installed"
echo " Position-specific exhausted teams removed from picker"
echo " AP / R pick-method badges installed"
echo " Weekly position rank displayed beside points"
echo " Selected-league rank + W-L-T displayed"
echo " Final blue / Live green / Upcoming gray borders installed"
echo " Sticky mobile compare headers installed"
echo " 2-6 comparison + pick privacy preserved"
echo " 18r1 synthetic Test Lab preserved and extended"
echo " Notifications / Reality compatibility checked"
echo " GitHub VERIFIED"
echo " Apps Script deployed"
echo " Production checks passed"
echo " Apps Script version: $VERSION_NUMBER"
echo "=========================================="
