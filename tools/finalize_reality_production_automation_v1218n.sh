#!/usr/bin/env bash
set -euo pipefail

DEPLOYMENT_ID="AKfycbyDdfv-1xMQTL7LGhGp48_nmWqiNSvNcKLo5IHkAQTxsQCVIPaMP8ZlxMp0ZfT_bzvo"
RELEASE="v1.2.18n Reality TV Production Automation"
REPO="$(git rev-parse --show-toplevel)"
cd "$REPO"

if [ "$(git branch --show-current)" != "architecture-cleanup" ]; then
  echo "STOP: Expected architecture-cleanup branch."
  exit 1
fi

echo "=============================================="
echo " PATTC Predicts v1.2.18n Reality TV Automation"
echo "=============================================="
echo "Project: $REPO"

echo ""
echo "===== VERIFY PACKAGE EXTRACTION ONLY ====="
EXPECTED="$(mktemp)"
cat > "$EXPECTED" <<'EOF'
CHANGED_FILES_V1_2_18N.txt
INSTALL_V1_2_18N.txt
REALITY_TV_PRODUCTION_AUTOMATION_V1_2_18N.md
tests/reality_tv_production_automation_v1218n_tests.js
tools/apply_reality_cast_foundation_v1218n.js
tools/apply_reality_production_automation_v1218n.js
tools/finalize_reality_production_automation_v1218n.sh
tools/reality_cast_frontend_foundation_v1218n.snippet
tools/reality_exit_reason_helpers_v1218n.snippet
tools/reality_group_controls_v1218n.snippet
EOF
BAD=0
while IFS= read -r LINE; do
  [ -z "$LINE" ] && continue
  FILE="${LINE:3}"
  [ "$FILE" = "update-project" ] && continue
  if ! grep -Fxq "$FILE" "$EXPECTED"; then
    echo "UNEXPECTED CHANGE: $FILE"
    BAD=1
  fi
done < <(git status --porcelain)
rm -f "$EXPECTED"
if [ "$BAD" -ne 0 ]; then
  echo "STOP: Repo contains work outside the extracted v1.2.18n package."
  git status --short
  exit 1
fi

echo ""
echo "===== VERIFY LOCAL == GITHUB BASELINE ====="
git fetch origin architecture-cleanup
LOCAL_SHA="$(git rev-parse HEAD)"
REMOTE_SHA="$(git rev-parse origin/architecture-cleanup)"
echo "Local:  $LOCAL_SHA"
echo "Remote: $REMOTE_SHA"
if [ "$LOCAL_SHA" != "$REMOTE_SHA" ]; then
  echo "STOP: Local and GitHub do not match. Do not merge another feature release yet."
  exit 1
fi

echo "BASELINE VERIFIED."

echo ""
echo "===== VERIFY NOTIFICATION + TEAM FANTASY BASELINE ====="
grep -q 'teamFantasyNotificationOutstandingSummary_' backend/engines/NotificationsEngine.js || { echo "STOP: Team Fantasy notification bridge missing."; exit 1; }
grep -q 'v1.2.18j AUTOMATIC OUTSTANDING-PICK REMINDER SCHEDULING' backend/engines/NotificationsEngine.js || { echo "STOP: Automatic pick reminder scheduler missing."; exit 1; }
grep -q 'function teamFantasyNotificationOutstandingSummary_(' backend/engines/SportsTeamFantasyEngine.js || { echo "STOP: Team Fantasy helper missing."; exit 1; }
echo "Notifications + Team Fantasy preserved baseline verified."

echo ""
echo "===== ENSURE REALITY CAST FOUNDATION ====="
node tools/apply_reality_cast_foundation_v1218n.js

echo ""
echo "===== APPLY REALITY PRODUCTION AUTOMATION ====="
node tools/apply_reality_production_automation_v1218n.js

echo ""
echo "===== REALITY v1.2.18n CONTRACT TEST ====="
node tests/reality_tv_production_automation_v1218n_tests.js

echo ""
echo "===== CROSS-FEATURE COMPATIBILITY ====="
for TEST in \
  tests/team_fantasy_v1218j_tests.js \
  tests/team_fantasy_admin_controls_v1218j2_tests.js \
  tests/push_automatic_reminders_team_fantasy_compat_v1218j4_tests.js \
  tests/push_automatic_pick_reminder_scheduling_v1218j_tests.js \
  tests/push_missing_pick_reminders_v1218h_tests.js \
  tests/push_notification_test_lab_v1218i_tests.js
  do
    [ -f "$TEST" ] && node "$TEST"
  done

echo ""
echo "===== JAVASCRIPT SYNTAX ====="
for FILE in \
  backend/engines/RealityTvSeasonEngine.js \
  backend/engines/RealityTvQuestionPackEngine.js \
  backend/Api.js \
  frontend/js/pages/adminRealityTv.js \
  frontend/js/api.js \
  frontend/api.js \
  frontend/js/app.js \
  frontend/app.js \
  frontend/sw.js \
  tools/apply_reality_cast_foundation_v1218n.js \
  tools/apply_reality_production_automation_v1218n.js
  do
    node --check "$FILE"
  done

echo ""
echo "===== DIFF CHECK ====="
git diff --check

echo ""
echo "===== FULL PRODUCTION CHECK ====="
bash tools/run_production_checks.sh

echo ""
echo "=============================================="
echo " ALL PRODUCTION CHECKS PASSED"
echo " COMMITTING + DEPLOYING v1.2.18n"
echo "=============================================="

echo ""
echo "===== STAGE EXACT RELEASE FILES ====="
for LIST in CHANGED_FILES_V1_2_18N_FOUNDATION_RUNTIME.txt CHANGED_FILES_V1_2_18N_RUNTIME.txt; do
  if [ -f "$LIST" ]; then
    while IFS= read -r FILE; do
      [ -n "$FILE" ] && git add -A -- "$FILE"
    done < "$LIST"
    git add -A -- "$LIST"
  fi
done

git add -A -- \
  CHANGED_FILES_V1_2_18N.txt \
  INSTALL_V1_2_18N.txt \
  REALITY_TV_PRODUCTION_AUTOMATION_V1_2_18N.md \
  tests/reality_tv_production_automation_v1218n_tests.js \
  tools/apply_reality_cast_foundation_v1218n.js \
  tools/apply_reality_production_automation_v1218n.js \
  tools/finalize_reality_production_automation_v1218n.sh \
  tools/reality_cast_frontend_foundation_v1218n.snippet \
  tools/reality_exit_reason_helpers_v1218n.snippet \
  tools/reality_group_controls_v1218n.snippet

git status --short
if git diff --cached --quiet; then
  echo "STOP: Nothing staged after successful production checks."
  exit 1
fi

echo ""
echo "===== COMMIT ====="
git commit -m "Harden Reality TV production automation v1.2.18n"

echo ""
echo "===== PUSH APPS SCRIPT ====="
if command -v clasp >/dev/null 2>&1; then
  CLASP=(clasp)
else
  CLASP=(npx --yes @google/clasp)
fi
"${CLASP[@]}" push

echo ""
echo "===== CREATE APPS SCRIPT VERSION ====="
VERSION_OUTPUT="$("${CLASP[@]}" version "$RELEASE")"
echo "$VERSION_OUTPUT"
VERSION_NUMBER="$(printf '%s\n' "$VERSION_OUTPUT" | sed -nE 's/.*Created version ([0-9]+).*/\1/p' | tail -1)"
if ! [[ "$VERSION_NUMBER" =~ ^[0-9]+$ ]]; then
  echo "STOP: Could not determine Apps Script version number."
  exit 1
fi

echo "Apps Script version: $VERSION_NUMBER"

echo ""
echo "===== DEPLOY PRODUCTION APPS SCRIPT ====="
"${CLASP[@]}" deploy -i "$DEPLOYMENT_ID" -V "$VERSION_NUMBER" -d "$RELEASE"

echo ""
echo "===== PUSH GITHUB / TRIGGER CLOUDFLARE ====="
git push origin architecture-cleanup

echo ""
echo "===== VERIFY GITHUB ====="
git fetch origin architecture-cleanup
LOCAL_SHA="$(git rev-parse HEAD)"
REMOTE_SHA="$(git rev-parse origin/architecture-cleanup)"
if [ "$LOCAL_SHA" != "$REMOTE_SHA" ]; then
  echo "STOP: GitHub verification failed."
  echo "Local:  $LOCAL_SHA"
  echo "Remote: $REMOTE_SHA"
  exit 1
fi
echo "GITHUB VERIFIED: $REMOTE_SHA"

echo ""
echo "===== VERIFY APPS SCRIPT ====="
"${CLASP[@]}" deployments

echo ""
echo "===== FINAL PRODUCTION CHECK ====="
bash tools/run_production_checks.sh

echo ""
echo "===== FINAL STATUS ====="
git status --short
git log -1 --oneline

echo ""
echo "=============================================="
echo " PATTC Predicts v1.2.18n COMPLETE"
echo " Reality production automation installed"
echo " Reality cast foundation preserved/installed"
echo " Notifications preserved"
echo " Team Fantasy preserved"
echo " GitHub VERIFIED"
echo " Apps Script deployed"
echo " Cloudflare triggered"
echo " Production checks passed"
echo "=============================================="
