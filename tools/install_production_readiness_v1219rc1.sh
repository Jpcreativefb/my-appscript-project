#!/usr/bin/env bash
set -euo pipefail

RELEASE="v1.2.19-rc1 Production Readiness"
MAIN_DEPLOYMENT_ID="AKfycbyDdfv-1xMQTL7LGhGp48_nmWqiNSvNcKLo5IHkAQTxsQCVIPaMP8ZlxMp0ZfT_bzvo"
PACKAGE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO="${1:-$(git rev-parse --show-toplevel)}"
cd "$REPO"
ORIGINAL_HEAD="$(git rev-parse HEAD)"
COMMITTED=0
PREVIOUS_DEPLOYED_VERSION=""
NEW_VERSION=""

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

current_deployed_version() {
  clasp_cmd deployments 2>/dev/null \
    | grep -F "$MAIN_DEPLOYMENT_ID" \
    | sed -nE 's/.*@([0-9]+).*/\1/p' \
    | tail -1 || true
}

cleanup_uncommitted_release() {
  status=$?
  if [ "$status" -ne 0 ] && [ "$COMMITTED" -eq 0 ]; then
    echo ""
    echo "===== ROLL BACK UNCOMMITTED RELEASE FILES ====="
    git reset --hard "$ORIGINAL_HEAD" >/dev/null 2>&1 || true
    if [ -f "$PACKAGE_ROOT/BASELINE_HASHES_V1_2_19_RC1.txt" ]; then
      while read -r expected file; do
        [ "${expected:-}" = "NEW" ] || continue
        rm -f -- "$REPO/$file"
      done < "$PACKAGE_ROOT/BASELINE_HASHES_V1_2_19_RC1.txt"
    fi
    echo "Repository restored to $ORIGINAL_HEAD."
  fi
  exit "$status"
}
trap cleanup_uncommitted_release EXIT

echo "=========================================="
echo " PATTC Predicts v1.2.19-rc1"
echo " Production Readiness"
echo "=========================================="
echo "Project: $REPO"
echo "Package: $PACKAGE_ROOT"

if [ "$(git branch --show-current)" != "architecture-cleanup" ]; then
  echo "STOP: Expected architecture-cleanup branch."
  exit 1
fi

DIRTY="$(git status --porcelain | grep -v '^?? update-project$' || true)"
if [ -n "$DIRTY" ]; then
  echo "STOP: Repository has uncommitted changes. Nothing was modified."
  git status --short
  exit 1
fi

for required in \
  CHANGED_FILES_V1_2_19_RC1.txt \
  BASELINE_HASHES_V1_2_19_RC1.txt \
  INSTALL_V1_2_19_RC1.txt \
  PRODUCTION_SMOKE_TEST_V1_2_19_RC1.md \
  docs/PRODUCTION_READINESS_V1_2_19_RC1.md \
  tests/production_readiness_v1219rc1_tests.js \
  functions/api/app.js; do
  if [ ! -f "$PACKAGE_ROOT/$required" ]; then
    echo "STOP: Release package is missing $required"
    exit 1
  fi
done

echo ""
echo "===== VERIFY GITHUB BASELINE ====="
git fetch origin architecture-cleanup
LOCAL_SHA="$(git rev-parse HEAD)"
REMOTE_SHA="$(git rev-parse origin/architecture-cleanup)"
echo "Local:  $LOCAL_SHA"
echo "Remote: $REMOTE_SHA"
if [ "$LOCAL_SHA" != "$REMOTE_SHA" ]; then
  echo "STOP: Local repo and GitHub do not match."
  exit 1
fi

echo ""
echo "===== VERIFY EXACT UPLOADED SOURCE BASELINE ====="
while read -r expected file; do
  [ -n "${file:-}" ] || continue
  if [ "$expected" = "NEW" ]; then
    if [ -e "$REPO/$file" ]; then
      echo "STOP: Expected a new v1.2.19-rc1 file, but it already exists: $file"
      exit 1
    fi
    continue
  fi
  if [ ! -f "$REPO/$file" ]; then
    echo "STOP: Required baseline file is missing: $file"
    exit 1
  fi
  actual="$(shasum -a 256 "$REPO/$file" | awk '{print $1}')"
  if [ "$actual" != "$expected" ]; then
    echo "STOP: Baseline mismatch: $file"
    echo "Expected: $expected"
    echo "Actual:   $actual"
    echo "Nothing was modified. Use the exact latest full project supplied for this release."
    exit 1
  fi
done < "$PACKAGE_ROOT/BASELINE_HASHES_V1_2_19_RC1.txt"
echo "BASELINE VERIFIED."

echo ""
echo "===== COPY CONTROLLED v1.2.19-rc1 FILES ====="
while IFS= read -r file; do
  [ -n "$file" ] || continue
  if [ ! -f "$PACKAGE_ROOT/$file" ]; then
    echo "STOP: Package payload is missing: $file"
    exit 1
  fi
  mkdir -p "$(dirname "$REPO/$file")"
  cp "$PACKAGE_ROOT/$file" "$REPO/$file"
done < "$PACKAGE_ROOT/CHANGED_FILES_V1_2_19_RC1.txt"
chmod +x "$REPO/tools/install_production_readiness_v1219rc1.sh"

if [ -x tools/sync_frontend_mirrors.sh ]; then
  echo ""
  echo "===== SYNC FRONTEND MIRRORS ====="
  bash tools/sync_frontend_mirrors.sh
fi

echo ""
echo "===== TARGETED JAVASCRIPT SYNTAX ====="
for file in \
  backend/Api.js \
  backend/admin/AdminTools.js \
  backend/core/ApiSecurity.js \
  backend/engines/AutomationHealthEngine.js \
  frontend/js/api.js \
  frontend/js/app.js \
  frontend/js/pages/admin.js \
  frontend/js/sports.js \
  frontend/sw.js \
  functions/api/app.js \
  tests/production_readiness_v1219rc1_tests.js \
  tests/sports_page_stats_runtime_tests.js; do
  node --check "$file"
done

echo ""
echo "===== v1.2.19-rc1 PRODUCTION READINESS CONTRACT ====="
node tests/production_readiness_v1219rc1_tests.js "$REPO"

echo ""
echo "===== SPORTS POST TRANSPORT REGRESSION ====="
node tests/sports_page_stats_runtime_tests.js "$REPO"

echo ""
echo "===== DIFF CHECK ====="
git diff --check

echo ""
echo "===== FULL PRODUCTION CHECKS ====="
bash tools/run_production_checks.sh

echo ""
echo "===== STAGE EXACT v1.2.19-rc1 FILES ====="
while IFS= read -r file; do
  [ -n "$file" ] && git add -A -- "$file"
done < CHANGED_FILES_V1_2_19_RC1.txt

git status --short
if git diff --cached --quiet; then
  echo "STOP: Nothing staged for v1.2.19-rc1."
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
git commit -m "Harden PATTC Predicts production candidate v1.2.19-rc1"
COMMITTED=1
trap - EXIT

PREVIOUS_DEPLOYED_VERSION="$(current_deployed_version)"
if [[ "$PREVIOUS_DEPLOYED_VERSION" =~ ^[0-9]+$ ]]; then
  echo "Current production Apps Script version: $PREVIOUS_DEPLOYED_VERSION"
else
  echo "WARNING: Could not determine current production deployment version for automatic rollback."
  PREVIOUS_DEPLOYED_VERSION=""
fi

echo ""
echo "===== DEPLOY BACKEND FIRST (MIXED-DEPLOYMENT SAFE) ====="
clasp_cmd push
VERSION_OUTPUT="$(clasp_cmd version "$RELEASE")"
echo "$VERSION_OUTPUT"
NEW_VERSION="$(printf '%s\n' "$VERSION_OUTPUT" | sed -nE 's/.*Created version ([0-9]+).*/\1/p' | tail -1)"
if ! [[ "$NEW_VERSION" =~ ^[0-9]+$ ]]; then
  echo "STOP: Could not determine PATTC Predicts Apps Script version."
  exit 1
fi
clasp_cmd deploy -i "$MAIN_DEPLOYMENT_ID" -V "$NEW_VERSION" -d "$RELEASE"

echo ""
echo "===== PUSH GITHUB / TRIGGER CLOUDFLARE DEPLOYMENT ====="
if ! git push origin architecture-cleanup; then
  echo "ERROR: GitHub push failed after Apps Script deployment."
  if [[ "$PREVIOUS_DEPLOYED_VERSION" =~ ^[0-9]+$ ]]; then
    echo "Rolling production Apps Script deployment back to version $PREVIOUS_DEPLOYED_VERSION..."
    clasp_cmd deploy -i "$MAIN_DEPLOYMENT_ID" -V "$PREVIOUS_DEPLOYED_VERSION" -d "Automatic rollback after v1.2.19-rc1 GitHub push failure" || true
  fi
  exit 1
fi

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
echo "===== APPS SCRIPT DEPLOYMENTS ====="
clasp_cmd deployments || true

echo ""
echo "===== FINAL PRODUCTION CHECKS ====="
bash tools/run_production_checks.sh

echo ""
echo "===== FINAL STATUS ====="
git status --short

echo ""
echo "=========================================="
echo " PATTC Predicts v1.2.19-rc1 INSTALLED"
echo " Production hardening code gate: PASS"
echo " Apps Script version: $NEW_VERSION"
echo " GitHub commit: $(git rev-parse --short HEAD)"
echo ""
echo " NEXT: Run PRODUCTION_SMOKE_TEST_V1_2_19_RC1.md"
echo " against the deployed app before declaring LIVE."
echo "=========================================="
