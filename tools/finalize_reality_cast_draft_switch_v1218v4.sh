#!/usr/bin/env bash
set -euo pipefail

DEPLOYMENT_ID="AKfycbyDdfv-1xMQTL7LGhGp48_nmWqiNSvNcKLo5IHkAQTxsQCVIPaMP8ZlxMp0ZfT_bzvo"
RELEASE="v1.2.18v4 Reality Cast Draft Switching"
BRANCH="architecture-cleanup"
REPO="$(git rev-parse --show-toplevel)"
PKG_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO"
export PYTHONDONTWRITEBYTECODE=1
COMMITTED=0

allowed_package_file() {
  case "$1" in
    CHANGED_FILES_V1_2_18V4.txt|INSTALL_V1_2_18V4.txt|docs/REALITY_TV_CAST_DRAFT_SWITCH_V1_2_18V4.md|tests/reality_tv_cast_draft_switch_v1218v4_tests.js|tools/apply_reality_cast_draft_switch_v1218v4.py|tools/finalize_reality_cast_draft_switch_v1218v4.sh|update-project)
      return 0 ;;
    *) return 1 ;;
  esac
}

rollback_precommit() {
  local code=$?
  if [ "$COMMITTED" -eq 0 ]; then
    echo ""
    echo "===== SAFE ROLLBACK ====="
    echo "A pre-deployment check stopped v1.2.18v4. Restoring tracked application files..."
    git restore --staged --worktree -- \
      backend/engines/RealityTvSeasonEngine.js \
      frontend/app.js \
      frontend/js/app.js \
      frontend/app.html \
      frontend/sw.js 2>/dev/null || true
    rm -rf tools/__pycache__
    echo "Tracked application files restored. Package files remain for retry/inspection."
    git status --short
  fi
  exit "$code"
}
trap rollback_precommit ERR

echo ""
echo "=========================================="
echo " PATTC Predicts v1.2.18v4"
echo " Reality Cast Draft Switching"
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
echo "===== VERIFY CURRENT REALITY + FANTASY BASELINE ====="
for FILE in \
  tests/reality_tv_production_automation_v1218n_tests.js \
  tests/reality_tv_cast_forwardfix_v1218v2_tests.js \
  tests/reality_tv_cast_forward_compat_v1218v3_tests.js \
  tests/team_fantasy_compare_restore_v1218v3_tests.js
 do
  [ -f "$FILE" ] || { echo "STOP: Current production prerequisite missing: $FILE"; exit 1; }
 done
grep -Fq 'function apiAdminPrepareRealityCastDraft' frontend/js/api.js || { echo "STOP: New-season Reality cast foundation missing."; exit 1; }
grep -Fq 'function realityTvPrepareCastImportSheet_' backend/engines/RealityTvSeasonEngine.js || { echo "STOP: RealityCastImport engine missing."; exit 1; }
echo "Reality v1.2.18v3-forward + current Team Fantasy baseline verified."

echo ""
echo "===== VERIFY PACKAGE SYNTAX ====="
python3 -m py_compile "$PKG_ROOT/tools/apply_reality_cast_draft_switch_v1218v4.py"
node --check "$PKG_ROOT/tests/reality_tv_cast_draft_switch_v1218v4_tests.js"
bash -n "$PKG_ROOT/tools/finalize_reality_cast_draft_switch_v1218v4.sh"
rm -rf "$PKG_ROOT/tools/__pycache__"

echo ""
echo "===== APPLY REALITY DRAFT SWITCH FIX ====="
python3 "$PKG_ROOT/tools/apply_reality_cast_draft_switch_v1218v4.py" "$REPO"

mkdir -p docs tests tools
if [ "$PKG_ROOT" != "$REPO" ]; then
  cp "$PKG_ROOT/CHANGED_FILES_V1_2_18V4.txt" CHANGED_FILES_V1_2_18V4.txt
  cp "$PKG_ROOT/INSTALL_V1_2_18V4.txt" INSTALL_V1_2_18V4.txt
  cp "$PKG_ROOT/docs/REALITY_TV_CAST_DRAFT_SWITCH_V1_2_18V4.md" docs/REALITY_TV_CAST_DRAFT_SWITCH_V1_2_18V4.md
  cp "$PKG_ROOT/tests/reality_tv_cast_draft_switch_v1218v4_tests.js" tests/reality_tv_cast_draft_switch_v1218v4_tests.js
  cp "$PKG_ROOT/tools/apply_reality_cast_draft_switch_v1218v4.py" tools/apply_reality_cast_draft_switch_v1218v4.py
  cp "$PKG_ROOT/tools/finalize_reality_cast_draft_switch_v1218v4.sh" tools/finalize_reality_cast_draft_switch_v1218v4.sh
fi
chmod +x tools/apply_reality_cast_draft_switch_v1218v4.py tools/finalize_reality_cast_draft_switch_v1218v4.sh

echo ""
echo "===== REALITY v1.2.18v4 CONTRACT TEST ====="
node tests/reality_tv_cast_draft_switch_v1218v4_tests.js

echo ""
echo "===== PRESERVE EXISTING REALITY AUTOMATION ====="
for TEST in \
  tests/reality_tv_cast_import_v1218k_tests.js \
  tests/reality_tv_production_automation_v1218n_tests.js \
  tests/reality_tv_cast_forwardfix_v1218v2_tests.js \
  tests/reality_tv_cast_forward_compat_v1218v3_tests.js
 do
  [ -f "$TEST" ] && node "$TEST"
 done

echo ""
echo "===== PRESERVE CURRENT TEAM FANTASY ====="
for TEST in \
  tests/team_fantasy_compare_restore_v1218v3_tests.js \
  tests/team_fantasy_weekly_selection_help_v1218v1_tests.js \
  tests/team_fantasy_week_history_compare_v1218u1_tests.js \
  tests/team_fantasy_weekly_hub_v1218t2_tests.js
 do
  [ -f "$TEST" ] && node "$TEST"
 done

echo ""
echo "===== SYNTAX / MIRROR CHECK ====="
node --check backend/engines/RealityTvSeasonEngine.js
node --check frontend/js/app.js
node --check frontend/app.js
node --check tests/reality_tv_cast_draft_switch_v1218v4_tests.js
python3 -m py_compile tools/apply_reality_cast_draft_switch_v1218v4.py
rm -rf tools/__pycache__
bash -n tools/finalize_reality_cast_draft_switch_v1218v4.sh
cmp -s frontend/app.js frontend/js/app.js || { echo "STOP: frontend app mirror mismatch."; exit 1; }

echo ""
echo "===== DIFF CHECK ====="
git diff --check

echo ""
echo "===== FULL PRODUCTION CHECKS ====="
bash tools/run_production_checks.sh

echo ""
echo "===== VERIFY PATCH IS IDEMPOTENT ====="
BEFORE_HASH="$(sha256sum backend/engines/RealityTvSeasonEngine.js frontend/app.js frontend/js/app.js frontend/app.html frontend/sw.js | sha256sum | awk '{print $1}')"
python3 tools/apply_reality_cast_draft_switch_v1218v4.py "$REPO" >/tmp/pattc-v1218v4-idempotent.log
AFTER_HASH="$(sha256sum backend/engines/RealityTvSeasonEngine.js frontend/app.js frontend/js/app.js frontend/app.html frontend/sw.js | sha256sum | awk '{print $1}')"
cat /tmp/pattc-v1218v4-idempotent.log
rm -f /tmp/pattc-v1218v4-idempotent.log
if [ "$BEFORE_HASH" != "$AFTER_HASH" ]; then
  echo "STOP: v1.2.18v4 patch is not idempotent."
  exit 1
fi
echo "PASS: second patch run made no application changes."

echo ""
echo "===== STAGE EXACT v1.2.18v4 FILES ====="
while IFS= read -r FILE; do
  [ -n "$FILE" ] && git add -A -- "$FILE"
done < CHANGED_FILES_V1_2_18V4.txt
git status --short
if git diff --cached --quiet; then
  echo "STOP: Nothing staged for v1.2.18v4."
  exit 1
fi

echo ""
echo "===== COMMIT ====="
git commit -m "Fix Reality cast draft switching v1.2.18v4"
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

echo ""
echo "===== DEPLOY PRODUCTION WEB APP ====="
clasp_cmd deploy -i "$DEPLOYMENT_ID" -V "$VERSION_NUMBER" -d "$RELEASE"

echo ""
echo "===== PUSH GITHUB / TRIGGER CLOUDFLARE ====="
git push origin "$BRANCH"

echo ""
echo "===== VERIFY GITHUB ====="
git fetch origin "$BRANCH"
LOCAL_SHA="$(git rev-parse HEAD)"
REMOTE_SHA="$(git rev-parse "origin/$BRANCH")"
[ "$LOCAL_SHA" = "$REMOTE_SHA" ] || { echo "STOP: GitHub verification failed."; exit 1; }
echo "GITHUB VERIFIED: $REMOTE_SHA"

echo ""
echo "===== VERIFY APPS SCRIPT DEPLOYMENT ====="
clasp_cmd deployments

echo ""
echo "===== FINAL PRODUCTION CHECK ====="
bash tools/run_production_checks.sh

echo ""
echo "===== FINAL STATUS ====="
rm -rf tools/__pycache__
git status --short
git log -1 --oneline

echo ""
echo "=========================================="
echo " PATTC Predicts v1.2.18v4 COMPLETE"
echo ""
echo " Survivor/Amazing Race/DWTS drafts no longer cross-reuse stale draft IDs"
echo " RealityCastImport opens on the current draft block"
echo " Prior staging rows preserved"
echo " Reality v1.2.18v3-forward preserved"
echo " Team Fantasy current baseline preserved"
echo " GitHub VERIFIED"
echo " Apps Script deployed"
echo " Production checks passed"
echo " Apps Script version: $VERSION_NUMBER"
echo "=========================================="
