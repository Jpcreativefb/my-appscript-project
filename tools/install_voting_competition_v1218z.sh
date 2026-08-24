#!/usr/bin/env bash
set -euo pipefail

RELEASE="v1.2.18z Voting / Competition"
MAIN_DEPLOYMENT_ID="AKfycbyDdfv-1xMQTL7LGhGp48_nmWqiNSvNcKLo5IHkAQTxsQCVIPaMP8ZlxMp0ZfT_bzvo"
PACKAGE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO="${1:-$(git rev-parse --show-toplevel)}"
cd "$REPO"
ORIGINAL_HEAD="$(git rev-parse HEAD)"
COMMITTED=0

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

cleanup_uncommitted_release() {
  status=$?
  if [ "$status" -ne 0 ] && [ "$COMMITTED" -eq 0 ]; then
    echo ""
    echo "===== ROLL BACK UNCOMMITTED RELEASE FILES ====="
    git reset --hard "$ORIGINAL_HEAD" >/dev/null 2>&1 || true
    if [ -f "$PACKAGE_ROOT/BASELINE_HASHES_V1_2_18Z.txt" ]; then
      while read -r expected file; do
        [ "${expected:-}" = "NEW" ] || continue
        rm -f -- "$REPO/$file"
      done < "$PACKAGE_ROOT/BASELINE_HASHES_V1_2_18Z.txt"
    fi
    echo "Repository restored to $ORIGINAL_HEAD."
  fi
  exit "$status"
}
trap cleanup_uncommitted_release EXIT

echo "=========================================="
echo " PATTC Predicts v1.2.18z"
echo " Voting / Competition"
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

for required in CHANGED_FILES_V1_2_18Z.txt BASELINE_HASHES_V1_2_18Z.txt INSTALL_V1_2_18Z.txt docs/VOTING_COMPETITION_V1_2_18Z.md tests/voting_competition_v1218z_tests.js; do
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
      echo "STOP: Expected a new v1.2.18z file, but it already exists: $file"
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
done < "$PACKAGE_ROOT/BASELINE_HASHES_V1_2_18Z.txt"
echo "BASELINE VERIFIED."

echo ""
echo "===== COPY CONTROLLED v1.2.18z FILES ====="
while IFS= read -r file; do
  [ -n "$file" ] || continue
  if [ ! -f "$PACKAGE_ROOT/$file" ]; then
    echo "STOP: Package payload is missing: $file"
    exit 1
  fi
  mkdir -p "$(dirname "$REPO/$file")"
  cp "$PACKAGE_ROOT/$file" "$REPO/$file"
done < "$PACKAGE_ROOT/CHANGED_FILES_V1_2_18Z.txt"
chmod +x "$REPO/tools/install_voting_competition_v1218z.sh"

if [ -x tools/sync_frontend_mirrors.sh ]; then
  echo ""
  echo "===== SYNC FRONTEND MIRRORS ====="
  bash tools/sync_frontend_mirrors.sh
fi

echo ""
echo "===== TARGETED JAVASCRIPT SYNTAX ====="
for file in \
  backend/Api.js \
  backend/admin/AdminPreflight.js \
  backend/engines/AppDataEngine.js \
  backend/engines/GamesEngine.js \
  backend/engines/VotingCompetitionEngine.js \
  frontend/js/api.js \
  frontend/js/app.js \
  frontend/js/pages/admin.js \
  frontend/js/pages/adminGameSetup.js \
  frontend/js/pages/dashboard.js \
  frontend/js/pages/voting.js \
  frontend/sw.js \
  tests/voting_competition_v1218z_tests.js; do
  node --check "$file"
done

echo ""
echo "===== VOTING / COMPETITION v1.2.18z CONTRACT ====="
node tests/voting_competition_v1218z_tests.js "$REPO"

for testfile in \
  tests/survivor_ranking_games_v1218w_tests.js \
  tests/platform_image_engine_tests.js; do
  if [ -f "$testfile" ]; then
    echo ""
    echo "===== $(basename "$testfile") ====="
    node "$testfile" "$REPO"
  fi
done

echo ""
echo "===== VERIFY LEGACY VOTING / RANKING FILES WERE NOT REPLACED ====="
for legacy in \
  backend/engines/VotingEngine.js \
  backend/Ballot.js \
  backend/VotingValidation.js \
  backend/VotingUtils.js \
  backend/engines/RankingGameEngine.js; do
  if grep -Fxq "$legacy" CHANGED_FILES_V1_2_18Z.txt; then
    echo "STOP: Legacy compatibility file unexpectedly entered the v1.2.18z changed-file list: $legacy"
    exit 1
  fi
done
echo "Legacy voting and prediction-ranking engines remain outside this release payload."

echo ""
echo "===== DIFF CHECK ====="
git diff --check

echo ""
echo "===== FULL PRODUCTION CHECKS ====="
bash tools/run_production_checks.sh

echo ""
echo "===== STAGE EXACT v1.2.18z FILES ====="
while IFS= read -r file; do
  [ -n "$file" ] && git add -A -- "$file"
done < CHANGED_FILES_V1_2_18Z.txt

git status --short
if git diff --cached --quiet; then
  echo "STOP: Nothing staged for v1.2.18z."
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
git commit -m "Add Voting Competition participant ballots v1.2.18z"
COMMITTED=1
trap - EXIT

echo ""
echo "===== DEPLOY PATTC PREDICTS APPS SCRIPT ====="
clasp_cmd push
VERSION_OUTPUT="$(clasp_cmd version "$RELEASE")"
echo "$VERSION_OUTPUT"
VERSION="$(printf '%s\n' "$VERSION_OUTPUT" | sed -nE 's/.*Created version ([0-9]+).*/\1/p' | tail -1)"
if ! [[ "$VERSION" =~ ^[0-9]+$ ]]; then
  echo "STOP: Could not determine PATTC Predicts Apps Script version."
  exit 1
fi
clasp_cmd deploy -i "$MAIN_DEPLOYMENT_ID" -V "$VERSION" -d "$RELEASE"

echo ""
echo "===== PUSH GITHUB / TRIGGER FRONTEND DEPLOYMENT ====="
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
echo " PATTC Predicts v1.2.18z COMPLETE"
echo " Voting / Competition game added"
echo " Participant self-entry + phone photos added"
echo " Custom participant fields + display card controls added"
echo " Numbered / Drag / Arrow ballots added"
echo " Legacy movie/awards voting preserved"
echo " Prediction Ranking engine preserved"
echo " Apps Script version: $VERSION"
echo "=========================================="
