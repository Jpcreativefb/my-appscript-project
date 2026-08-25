#!/usr/bin/env bash
set -euo pipefail

EXPECTED_BRANCH="architecture-cleanup"
EXPECTED_BASELINE="723af5d"
PROD_DEPLOYMENT="AKfycbyDdfv-1xMQTL7LGhGp48_nmWqiNSvNcKLo5IHkAQTxsQCVIPaMP8ZlxMp0ZfT_bzvo"
RELEASE_DESC="v1.2.19-rc6 Admin Question UX Performance Certification"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO="$(git rev-parse --show-toplevel 2>/dev/null || true)"

if [[ -z "$REPO" ]]; then
  echo "STOP: Run this from inside the Awards App Git repository."
  exit 1
fi
cd "$REPO"

echo "=========================================="
echo " PATTC Predicts v1.2.19-rc6"
echo " Admin Question UX Performance"
echo "=========================================="
echo "Project: $REPO"
echo "Package: $PKG_ROOT"

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
  echo "STOP: RC6 requires baseline $EXPECTED_BASELINE but this repository is ${LOCAL:0:7}."
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
done < "$PKG_ROOT/BASELINE_HASHES_V1_2_19_RC6.txt"
echo "BASELINE VERIFIED."

echo ""
echo "===== COPY CONTROLLED RC6 FILES ====="
FILES=(
  "BASELINE_HASHES_V1_2_19_RC6.txt"
  "CHANGED_FILES_V1_2_19_RC6.txt"
  "INSTALL_V1_2_19_RC6.txt"
  "PRODUCTION_STATUS.md"
  "backend/admin/AdminCategories.js"
  "backend/engines/NormalizedQuestionStorageEngine.js"
  "backend/engines/QuestionModeEngine.js"
  "backend/engines/SettingsEngine.js"
  "backend/services/AppCache.js"
  "docs/PRODUCTION_ADMIN_QUESTION_UX_PERFORMANCE_V1_2_19_RC6.md"
  "frontend/app.html"
  "frontend/app.js"
  "frontend/js/app.js"
  "frontend/js/pages/adminGameSetup.js"
  "frontend/js/pwa.js"
  "frontend/sw.js"
  "package.json"
  "tests/production_admin_question_ux_performance_v1219rc6_tests.js"
  "tests/production_cache_persistence_v1219rc4_tests.js"
  "tests/production_final_performance_v1219rc3_tests.js"
  "tests/production_performance_v1219rc2_tests.js"
  "tests/production_readiness_v1219rc1_tests.js"
  "tools/install_production_admin_question_ux_performance_v1219rc6.sh"
  "tools/run_production_checks.sh"
)

for file in "${FILES[@]}"; do
  mkdir -p "$(dirname "$file")"
  cp "$PKG_ROOT/$file" "$file"
done
chmod +x tools/install_production_admin_question_ux_performance_v1219rc6.sh tools/run_production_checks.sh

echo ""
echo "===== VERIFY FRONTEND MIRRORS / ROUTE ====="
cmp -s frontend/js/app.js frontend/app.js || {
  echo "STOP: frontend app mirrors differ after copy."
  exit 1
}
node -e 'const r=require("./frontend/_routes.json"); if (!r.include.includes("/api/app")) process.exit(1); console.log("PASS: /api/app route remains enabled");'

echo ""
echo "===== RC6 ADMIN QUESTION UX PERFORMANCE CONTRACT ====="
node tests/production_admin_question_ux_performance_v1219rc6_tests.js

echo ""
echo "===== FULL PRODUCTION CHECKS ====="
bash tools/run_production_checks.sh

echo ""
echo "===== STAGE EXACT RC6 FILES ====="
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
git commit -m "Fix Admin question UX performance v1.2.19-rc6"
COMMIT="$(git rev-parse HEAD)"

OLD_PROD_VERSION="$(clasp deployments 2>/dev/null | sed -n "s/.*${PROD_DEPLOYMENT} @\([0-9][0-9]*\).*/\1/p" | head -1)"
echo "Current production Apps Script version: ${OLD_PROD_VERSION:-unknown}"

echo ""
echo "===== DEPLOY APPS SCRIPT ====="
clasp push
VERSION_OUTPUT="$(clasp version "$RELEASE_DESC")"
echo "$VERSION_OUTPUT"
NEW_VERSION="$(printf '%s\n' "$VERSION_OUTPUT" | sed -n 's/.*Created version \([0-9][0-9]*\).*/\1/p' | tail -1)"
if [[ -z "$NEW_VERSION" ]]; then
  echo "STOP: Could not determine newly created Apps Script version."
  exit 1
fi
clasp deploy -i "$PROD_DEPLOYMENT" -V "$NEW_VERSION" -d "$RELEASE_DESC"

echo ""
echo "===== PUSH GITHUB / CLOUDFLARE ====="
if ! git push origin "$EXPECTED_BRANCH"; then
  echo "GitHub push failed."
  if [[ -n "$OLD_PROD_VERSION" ]]; then
    echo "Rolling production Apps Script back to @$OLD_PROD_VERSION ..."
    clasp deploy -i "$PROD_DEPLOYMENT" -V "$OLD_PROD_VERSION" -d "Rollback after RC6 GitHub push failure" || true
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
echo " PATTC Predicts v1.2.19-rc6 INSTALLED"
echo " Production checks: PASS"
echo " Apps Script version: $NEW_VERSION"
echo " GitHub commit: ${COMMIT:0:7}"
echo ""
echo " NEXT: re-test Admin Questions / Categories"
echo " on https://my-appscript-project.pages.dev"
echo "=========================================="
