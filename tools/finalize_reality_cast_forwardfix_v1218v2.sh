#!/usr/bin/env bash
set -euo pipefail

DEPLOYMENT_ID="AKfycbyDdfv-1xMQTL7LGhGp48_nmWqiNSvNcKLo5IHkAQTxsQCVIPaMP8ZlxMp0ZfT_bzvo"
RELEASE="v1.2.18v2 Reality Cast Forward Fixes"
BRANCH="architecture-cleanup"
REPO="$(git rev-parse --show-toplevel)"
PKG_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO"

export PYTHONDONTWRITEBYTECODE=1
COMMITTED=0

allowed_package_file() {
  case "$1" in
    CHANGED_FILES_V1_2_18V2.txt|INSTALL_V1_2_18V2.txt|docs/REALITY_TV_CAST_FORWARD_FIXES_V1_2_18V2.md|tests/reality_tv_cast_forwardfix_v1218v2_tests.js|tools/apply_reality_cast_forwardfix_v1218v2.js|tools/finalize_reality_cast_forwardfix_v1218v2.sh|update-project)
      return 0 ;;
    *) return 1 ;;
  esac
}

rollback_precommit() {
  local code=$?
  if [ "$COMMITTED" -eq 0 ]; then
    echo ""
    echo "===== SAFE ROLLBACK ====="
    echo "A pre-deployment check stopped v1.2.18v2. Restoring tracked files to HEAD..."
    git restore --staged --worktree -- \
      backend/Api.js \
      backend/engines/RealityTvSeasonEngine.js \
      frontend/api.js \
      frontend/js/api.js \
      frontend/app.html 2>/dev/null || true
    rm -f CHANGED_FILES_V1_2_18V2_RUNTIME.txt
    echo "Tracked application files restored. Package files were left in place for inspection/retry."
    git status --short
  fi
  exit "$code"
}
trap rollback_precommit ERR

echo ""
echo "=========================================="
echo " PATTC Predicts v1.2.18v2"
echo " Reality Cast Forward Fixes"
echo "=========================================="
echo "Project: $REPO"

if [ "$(git branch --show-current)" != "$BRANCH" ]; then
  echo "STOP: Expected $BRANCH branch."
  exit 1
fi

echo ""
echo "===== VERIFY NO UNFINISHED WORK ====="
BAD=0
while IFS= read -r LINE; do
  [ -z "$LINE" ] && continue
  FILE="${LINE:3}"
  if ! allowed_package_file "$FILE"; then
    echo "UNFINISHED/UNEXPECTED: $LINE"
    BAD=1
  fi
done < <(git status --porcelain)
if [ "$BAD" -ne 0 ]; then
  echo "STOP: Repository has work outside this update. Nothing was applied."
  exit 1
fi
echo "Repository is safe to update."

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
    echo "STOP: Local branch is not a clean ancestor of GitHub. Resolve branch divergence first."
    exit 1
  fi
fi
echo "GITHUB BASELINE SYNCHRONIZED: $(git rev-parse --short HEAD)"

echo ""
echo "===== VERIFY NEWER PRODUCTION PREREQUISITES ====="
[ -f tests/reality_tv_production_automation_v1218n_tests.js ] || { echo "STOP: v1.2.18n Reality automation test missing."; exit 1; }
[ -f tests/team_fantasy_weekly_selection_help_v1218v1_tests.js ] || { echo "STOP: newer v1.2.18v1 Team Fantasy baseline missing."; exit 1; }
grep -q 'function apiAdminPrepareRealityCastDraft' frontend/js/api.js || { echo "STOP: Reality new-season cast foundation missing."; exit 1; }
grep -q 'function apiAdminPrepareRealityCastImport' frontend/js/api.js || { echo "STOP: Reality existing-season cast foundation missing."; exit 1; }
grep -q 'function realityTvPrepareCastImportSheet_' backend/engines/RealityTvSeasonEngine.js || { echo "STOP: RealityCastImport staging engine missing."; exit 1; }
echo "Reality v1.2.18n + newer production baseline verified."

echo ""
echo "===== VERIFY PACKAGE SYNTAX ====="
node --check "$PKG_ROOT/tools/apply_reality_cast_forwardfix_v1218v2.js"
node --check "$PKG_ROOT/tests/reality_tv_cast_forwardfix_v1218v2_tests.js"
bash -n "$PKG_ROOT/tools/finalize_reality_cast_forwardfix_v1218v2.sh"

echo ""
echo "===== APPLY REALITY CAST FORWARD FIXES ====="
node "$PKG_ROOT/tools/apply_reality_cast_forwardfix_v1218v2.js" "$REPO"

mkdir -p docs tests tools
# The normal one-paste workflow extracts this package directly into the repo,
# so package files are already in place. If run from an external package root,
# copy them in without ever attempting cp file -> same file.
if [ "$PKG_ROOT" != "$REPO" ]; then
  cp "$PKG_ROOT/CHANGED_FILES_V1_2_18V2.txt" CHANGED_FILES_V1_2_18V2.txt
  cp "$PKG_ROOT/INSTALL_V1_2_18V2.txt" INSTALL_V1_2_18V2.txt
  cp "$PKG_ROOT/docs/REALITY_TV_CAST_FORWARD_FIXES_V1_2_18V2.md" docs/REALITY_TV_CAST_FORWARD_FIXES_V1_2_18V2.md
  cp "$PKG_ROOT/tests/reality_tv_cast_forwardfix_v1218v2_tests.js" tests/reality_tv_cast_forwardfix_v1218v2_tests.js
  cp "$PKG_ROOT/tools/apply_reality_cast_forwardfix_v1218v2.js" tools/apply_reality_cast_forwardfix_v1218v2.js
  cp "$PKG_ROOT/tools/finalize_reality_cast_forwardfix_v1218v2.sh" tools/finalize_reality_cast_forwardfix_v1218v2.sh
fi
chmod +x tools/apply_reality_cast_forwardfix_v1218v2.js tools/finalize_reality_cast_forwardfix_v1218v2.sh

echo ""
echo "===== v1.2.18v2 CONTRACT TEST ====="
node tests/reality_tv_cast_forwardfix_v1218v2_tests.js

echo ""
echo "===== PRESERVE REALITY PRODUCTION AUTOMATION ====="
node tests/reality_tv_cast_import_v1218k_tests.js
node tests/reality_tv_production_automation_v1218n_tests.js

echo ""
echo "===== PRESERVE CURRENT TEAM FANTASY + NOTIFICATIONS ====="
for TEST in \
  tests/team_fantasy_weekly_selection_help_v1218v1_tests.js \
  tests/team_fantasy_week_history_compare_v1218u1_tests.js \
  tests/team_fantasy_weekly_hub_v1218t2_tests.js \
  tests/team_fantasy_compact_game_day_v1218s_tests.js \
  tests/push_missing_pick_reminders_v1218h_tests.js \
  tests/push_automatic_pick_reminder_scheduling_v1218j_tests.js
 do
  [ -f "$TEST" ] && node "$TEST"
 done

echo ""
echo "===== JAVASCRIPT + SHELL SYNTAX ====="
for FILE in \
  backend/Api.js \
  backend/engines/RealityTvSeasonEngine.js \
  frontend/api.js \
  frontend/js/api.js \
  tests/reality_tv_cast_forwardfix_v1218v2_tests.js \
  tools/apply_reality_cast_forwardfix_v1218v2.js
 do
  node --check "$FILE"
 done
bash -n tools/finalize_reality_cast_forwardfix_v1218v2.sh

echo ""
echo "===== DIFF CHECK ====="
git diff --check

echo ""
echo "===== FULL PRODUCTION CHECKS ====="
bash tools/run_production_checks.sh

echo ""
echo "===== VERIFY PATCH IS IDEMPOTENT ====="
BEFORE_HASH="$(sha256sum backend/Api.js backend/engines/RealityTvSeasonEngine.js frontend/api.js frontend/js/api.js frontend/app.html | sha256sum | awk '{print $1}')"
node tools/apply_reality_cast_forwardfix_v1218v2.js "$REPO" >/tmp/pattc-v1218v2-idempotent.log
AFTER_HASH="$(sha256sum backend/Api.js backend/engines/RealityTvSeasonEngine.js frontend/api.js frontend/js/api.js frontend/app.html | sha256sum | awk '{print $1}')"
cat /tmp/pattc-v1218v2-idempotent.log
rm -f /tmp/pattc-v1218v2-idempotent.log
if [ "$BEFORE_HASH" != "$AFTER_HASH" ]; then
  echo "STOP: v1.2.18v2 patch is not idempotent."
  exit 1
fi
echo "PASS: second patch run made no application changes."

echo ""
echo "===== STAGE EXACT RELEASE FILES ====="
while IFS= read -r FILE; do
  [ -n "$FILE" ] && git add -A -- "$FILE"
done < CHANGED_FILES_V1_2_18V2.txt
[ -f CHANGED_FILES_V1_2_18V2_RUNTIME.txt ] && git add -A -- CHANGED_FILES_V1_2_18V2_RUNTIME.txt

git status --short
if git diff --cached --quiet; then
  echo "STOP: Nothing staged for v1.2.18v2."
  exit 1
fi

echo ""
echo "===== COMMIT ====="
git commit -m "Carry Reality cast fixes forward v1.2.18v2"
COMMITTED=1
trap - ERR

clasp_cmd() {
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
  echo "STOP: Could not determine Apps Script version number."
  exit 1
fi
echo "Apps Script version: $VERSION_NUMBER"

echo ""
echo "===== DEPLOY PRODUCTION APPS SCRIPT ====="
clasp_cmd deploy -i "$DEPLOYMENT_ID" -V "$VERSION_NUMBER" -d "$RELEASE"

echo ""
echo "===== PUSH GITHUB / TRIGGER CLOUDFLARE ====="
git push origin "$BRANCH"

echo ""
echo "===== VERIFY GITHUB ====="
git fetch origin "$BRANCH"
LOCAL_SHA="$(git rev-parse HEAD)"
REMOTE_SHA="$(git rev-parse "origin/$BRANCH")"
if [ "$LOCAL_SHA" != "$REMOTE_SHA" ]; then
  echo "STOP: GitHub verification failed."
  exit 1
fi
echo "GITHUB VERIFIED: $REMOTE_SHA"

echo ""
echo "===== VERIFY APPS SCRIPT DEPLOYMENTS ====="
clasp_cmd deployments

echo ""
echo "===== FINAL PRODUCTION CHECK ====="
bash tools/run_production_checks.sh

echo ""
echo "===== FINAL STATUS ====="
git status --short
git log -1 --oneline

echo ""
echo "=========================================="
echo " PATTC Predicts v1.2.18v2 COMPLETE"
echo " Reality cast direct transport installed"
echo " Reality cast staging-row recovery installed"
echo " Existing Reality automation preserved"
echo " Newer Team Fantasy work preserved"
echo " GitHub verified"
echo " Apps Script deployed"
echo " Cloudflare triggered"
echo " Production checks passed"
echo "=========================================="
