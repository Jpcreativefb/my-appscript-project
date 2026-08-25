#!/usr/bin/env bash
set -euo pipefail

EXPECTED_BRANCH="architecture-cleanup"
EXPECTED_BASELINE="efd13a2"
PROD_DEPLOYMENT="AKfycbyDdfv-1xMQTL7LGhGp48_nmWqiNSvNcKLo5IHkAQTxsQCVIPaMP8ZlxMp0ZfT_bzvo"
RELEASE_DESC="v1.2.19-rc8 Sports Wager Integrity Certification"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO="$(git rev-parse --show-toplevel 2>/dev/null || true)"

if [[ -z "$REPO" ]]; then
  echo "STOP: Run this from inside the Awards App Git repository."
  exit 1
fi
cd "$REPO"

if command -v clasp >/dev/null 2>&1; then
  CLASP_BIN="$(command -v clasp)"
else
  NPM_PREFIX="$(npm config get prefix 2>/dev/null || true)"
  CLASP_BIN="${NPM_PREFIX%/}/bin/clasp"
fi
if [[ -z "${CLASP_BIN:-}" || ! -x "$CLASP_BIN" ]]; then
  echo "STOP: Could not find clasp. Expected it on PATH or under npm's prefix."
  echo "Try: npm config get prefix"
  exit 1
fi

echo "=========================================="
echo " PATTC Predicts v1.2.19-rc8"
echo " Sports Wager Integrity Certification"
echo "=========================================="
echo "Project: $REPO"
echo "Package: $PKG_ROOT"
echo "Clasp:   $CLASP_BIN"

echo ""
echo "===== VERIFY CLEAN GIT BASELINE ====="
if [[ -n "$(git status --porcelain)" ]]; then
  echo "STOP: Repository has local changes. Nothing was installed."
  git status --short
  exit 1
fi

BRANCH="$(git branch --show-current)"
if [[ "$BRANCH" != "$EXPECTED_BRANCH" ]]; then
  echo "STOP: Expected branch $EXPECTED_BRANCH but found $BRANCH"
  exit 1
fi

git fetch origin "$EXPECTED_BRANCH"
LOCAL="$(git rev-parse HEAD)"
REMOTE="$(git rev-parse "origin/$EXPECTED_BRANCH")"
echo "Local:  $LOCAL"
echo "Remote: $REMOTE"
if [[ "$LOCAL" != "$REMOTE" ]]; then
  echo "STOP: Local and GitHub are not aligned."
  exit 1
fi
if [[ "$LOCAL" != ${EXPECTED_BASELINE}* ]]; then
  echo "STOP: RC8 requires baseline $EXPECTED_BASELINE but this repository is ${LOCAL:0:7}."
  exit 1
fi

echo ""
echo "===== VERIFY BASELINE FILE HASHES ====="
while read -r hash file; do
  [[ -z "${hash:-}" || "$hash" == \#* ]] && continue
  if [[ ! -f "$file" ]]; then
    echo "STOP: Baseline file missing: $file"
    exit 1
  fi
  actual="$(shasum -a 256 "$file" | awk '{print $1}')"
  if [[ "$actual" != "$hash" ]]; then
    echo "STOP: Baseline mismatch: $file"
    echo "Expected: $hash"
    echo "Actual:   $actual"
    exit 1
  fi
done < "$PKG_ROOT/BASELINE_HASHES_V1_2_19_RC8.txt"
echo "BASELINE VERIFIED."

echo ""
echo "===== COPY CONTROLLED RC8 FILES ====="
FILES=(
  "BASELINE_HASHES_V1_2_19_RC8.txt"
  "CHANGED_FILES_V1_2_19_RC8.txt"
  "INSTALL_V1_2_19_RC8.txt"
  "PRODUCTION_STATUS.md"
  "backend/admin/AdminPreflight.js"
  "backend/engines/SportsWagerEngine.js"
  "docs/PRODUCTION_SPORTS_WAGER_INTEGRITY_V1_2_19_RC8.md"
  "package.json"
  "tests/production_admin_question_ux_performance_v1219rc6_tests.js"
  "tests/production_cache_persistence_v1219rc4_tests.js"
  "tests/production_final_performance_v1219rc3_tests.js"
  "tests/production_performance_v1219rc2_tests.js"
  "tests/production_pick_lock_integrity_v1219rc7_tests.js"
  "tests/production_readiness_v1219rc1_tests.js"
  "tests/production_sports_wager_integrity_v1219rc8_tests.js"
  "tools/install_production_sports_wager_integrity_v1219rc8.sh"
  "tools/run_production_checks.sh"
)

for file in "${FILES[@]}"; do
  mkdir -p "$(dirname "$file")"
  cp "$PKG_ROOT/$file" "$file"
done
chmod +x tools/install_production_sports_wager_integrity_v1219rc8.sh tools/run_production_checks.sh

echo ""
echo "===== VERIFY FRONTEND MIRRORS / ROUTE ====="
cmp -s frontend/js/app.js frontend/app.js || {
  echo "STOP: frontend app mirrors differ after copy."
  exit 1
}
node -e 'const r=require("./frontend/_routes.json"); if (!r.include.includes("/api/app")) process.exit(1); console.log("PASS: /api/app route remains enabled");'

echo ""
echo "===== RC8 SPORTS WAGER INTEGRITY CONTRACT ====="
node tests/production_sports_wager_integrity_v1219rc8_tests.js

echo ""
echo "===== FULL PRODUCTION CHECKS ====="
bash tools/run_production_checks.sh

echo ""
echo "===== STAGE EXACT RC8 FILES ====="
git add -- "${FILES[@]}"
git status --short

UNSTAGED="$(git status --porcelain | awk 'substr($0,2,1)!=" " || substr($0,1,1)=="?" {print}')"
if [[ -n "$UNSTAGED" ]]; then
  echo "STOP: Unexpected unstaged/untracked changes remain:"
  echo "$UNSTAGED"
  exit 1
fi

echo ""
echo "===== COMMIT ====="
git commit -m "Repair Sports Wager setup integrity v1.2.19-rc8"
COMMIT="$(git rev-parse HEAD)"

OLD_PROD_VERSION="$($CLASP_BIN deployments 2>/dev/null | sed -n "s/.*${PROD_DEPLOYMENT} @\([0-9][0-9]*\).*/\1/p" | head -1 || true)"
echo "Current production Apps Script version: ${OLD_PROD_VERSION:-unknown}"

echo ""
echo "===== DEPLOY APPS SCRIPT ====="
"$CLASP_BIN" push
VERSION_LOG="$(mktemp)"
"$CLASP_BIN" version "$RELEASE_DESC" 2>&1 | tee "$VERSION_LOG"
NEW_VERSION="$(sed -n 's/.*Created version \([0-9][0-9]*\).*/\1/p' "$VERSION_LOG" | tail -1)"
rm -f "$VERSION_LOG"
if [[ -z "$NEW_VERSION" ]]; then
  echo "STOP: Could not determine newly created Apps Script version."
  exit 1
fi
"$CLASP_BIN" deploy -i "$PROD_DEPLOYMENT" -V "$NEW_VERSION" -d "$RELEASE_DESC"

echo ""
echo "===== PUSH GITHUB / CLOUDFLARE ====="
if ! git push origin "$EXPECTED_BRANCH"; then
  echo "GitHub push failed."
  if [[ -n "$OLD_PROD_VERSION" ]]; then
    echo "Rolling production Apps Script back to @$OLD_PROD_VERSION ..."
    "$CLASP_BIN" deploy -i "$PROD_DEPLOYMENT" -V "$OLD_PROD_VERSION" -d "Rollback after RC8 GitHub push failure" || true
  fi
  exit 1
fi

echo ""
echo "===== VERIFY GITHUB ====="
git fetch origin "$EXPECTED_BRANCH"
REMOTE_AFTER="$(git rev-parse "origin/$EXPECTED_BRANCH")"
if [[ "$REMOTE_AFTER" != "$COMMIT" ]]; then
  echo "STOP: GitHub verification failed."
  exit 1
fi
echo "GITHUB VERIFIED: $COMMIT"

echo ""
echo "===== FINAL PRODUCTION CHECKS ====="
bash tools/run_production_checks.sh

echo ""
echo "===== FINAL STATUS ====="
git status

echo ""
echo "=========================================="
echo " PATTC Predicts v1.2.19-rc8 INSTALLED"
echo " Production checks: PASS"
echo " Apps Script version: $NEW_VERSION"
echo " GitHub commit: ${COMMIT:0:7}"
echo ""
echo " NEXT: Run Check on Production Test - Wager"
echo " on https://my-appscript-project.pages.dev"
echo "=========================================="
