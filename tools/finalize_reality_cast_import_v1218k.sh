#!/usr/bin/env bash
set -euo pipefail

DEPLOYMENT_ID="AKfycbyDdfv-1xMQTL7LGhGp48_nmWqiNSvNcKLo5IHkAQTxsQCVIPaMP8ZlxMp0ZfT_bzvo"
BASELINE_SHA="fe116abe3b48f595b8831f0d105189a7655fa4e4"
RELEASE="v1.2.18k Reality Cast Import Staging"
UPDATES="$HOME/Awards-App-Updates"
LOG="$UPDATES/v1.2.18k-reality-cast-import-deploy-log.txt"

mkdir -p "$UPDATES"
exec > >(tee "$LOG") 2>&1

REPO="$(git rev-parse --show-toplevel)"
cd "$REPO"

echo "=========================================="
echo " PATTC Predicts v1.2.18k"
echo " Reality Cast Import Staging"
echo "=========================================="
echo "Project: $REPO"

if [ "$(git branch --show-current)" != "architecture-cleanup" ]; then
  echo "STOP: Expected architecture-cleanup branch."
  exit 1
fi

echo ""
echo "===== VERIFY PACKAGE EXTRACTION DID NOT TOUCH TRACKED FILES ====="

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "STOP: Tracked local changes exist before the Reality patch."
  git status --short
  exit 1
fi

EXPECTED="$(mktemp)"
cat > "$EXPECTED" <<'EOF'
CHANGED_FILES_V1_2_18K.txt
INSTALL_V1_2_18K.txt
REALITY_TV_CAST_IMPORT_V1_2_18K.md
tests/reality_tv_cast_import_v1218k_tests.js
tools/apply_reality_cast_import_v1218k.js
tools/finalize_reality_cast_import_v1218k.sh
tools/reality_cast_frontend_v1218k.snippet
EOF

BAD=0
while IFS= read -r LINE; do
  [ -z "$LINE" ] && continue
  FILE="${LINE:3}"
  [ "$FILE" = "update-project" ] && continue

  STATUS="${LINE:0:2}"
  if [ "$STATUS" = "??" ]; then
    if ! grep -Fxq "$FILE" "$EXPECTED"; then
      echo "UNEXPECTED UNTRACKED FILE: $FILE"
      BAD=1
    fi
  else
    echo "UNEXPECTED TRACKED CHANGE: $LINE"
    BAD=1
  fi
done < <(git status --porcelain)

rm -f "$EXPECTED"

if [ "$BAD" -ne 0 ]; then
  echo "STOP: Repository contains files outside this release."
  git status --short
  exit 1
fi

echo ""
echo "===== VERIFY EXACT PRODUCTION BASELINE ====="

LOCAL_SHA="$(git rev-parse HEAD)"
echo "Local: $LOCAL_SHA"

if [ "$LOCAL_SHA" != "$BASELINE_SHA" ]; then
  echo "STOP: This package was built specifically for fe116ab."
  echo "Current commit is not the expected production checkpoint."
  exit 1
fi

git fetch origin architecture-cleanup
REMOTE_SHA="$(git rev-parse origin/architecture-cleanup)"
echo "Remote: $REMOTE_SHA"

if [ "$REMOTE_SHA" != "$BASELINE_SHA" ]; then
  echo "STOP: GitHub moved beyond fe116ab. Do not apply this package."
  exit 1
fi

echo "BASELINE VERIFIED."

echo ""
echo "===== APPLY REALITY CAST IMPORT ====="

node tools/apply_reality_cast_import_v1218k.js

echo ""
echo "===== REALITY CAST IMPORT TEST ====="

node tests/reality_tv_cast_import_v1218k_tests.js

echo ""
echo "===== CROSS-FEATURE COMPATIBILITY ====="

for TEST in \
  tests/team_fantasy_v1218j_tests.js \
  tests/team_fantasy_admin_controls_v1218j2_tests.js \
  tests/push_automatic_reminders_team_fantasy_compat_v1218j4_tests.js \
  tests/push_automatic_pick_reminder_scheduling_v1218j_tests.js \
  tests/push_missing_pick_reminders_v1218h_tests.js
do
  [ -f "$TEST" ] && node "$TEST"
done

echo ""
echo "===== JAVASCRIPT SYNTAX ====="

node --check backend/engines/RealityTvSeasonEngine.js
node --check backend/Api.js
node --check frontend/js/pages/adminRealityTv.js
node --check frontend/js/api.js
node --check frontend/api.js
node --check frontend/js/app.js
node --check frontend/app.js
node --check frontend/sw.js

echo ""
echo "===== DIFF CHECK ====="

git diff --check

echo ""
echo "===== FULL PRODUCTION CHECK ====="

bash tools/run_production_checks.sh

echo ""
echo "=========================================="
echo " ALL PRODUCTION CHECKS PASSED"
echo " COMMITTING + DEPLOYING"
echo "=========================================="

echo ""
echo "===== STAGE EXACT RELEASE ====="

while IFS= read -r FILE; do
  [ -n "$FILE" ] && git add -A -- "$FILE"
done < CHANGED_FILES_V1_2_18K_RUNTIME.txt

git add -- \
  tools/apply_reality_cast_import_v1218k.js \
  tools/finalize_reality_cast_import_v1218k.sh \
  tools/reality_cast_frontend_v1218k.snippet \
  tests/reality_tv_cast_import_v1218k_tests.js \
  REALITY_TV_CAST_IMPORT_V1_2_18K.md \
  CHANGED_FILES_V1_2_18K.txt \
  INSTALL_V1_2_18K.txt \
  CHANGED_FILES_V1_2_18K_RUNTIME.txt

git status --short

if git diff --cached --quiet; then
  echo "STOP: Nothing staged after successful checks."
  exit 1
fi

echo ""
echo "===== COMMIT ====="

git commit -m "Add Reality TV cast import staging v1.2.18k"

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

VERSION_NUMBER="$(
  printf '%s\n' "$VERSION_OUTPUT" |
  sed -nE 's/.*Created version ([0-9]+).*/\1/p' |
  tail -1
)"

if ! [[ "$VERSION_NUMBER" =~ ^[0-9]+$ ]]; then
  echo "STOP: Could not determine Apps Script version."
  exit 1
fi

echo "Apps Script version: $VERSION_NUMBER"

echo ""
echo "===== DEPLOY PRODUCTION APPS SCRIPT ====="

"${CLASP[@]}" deploy \
  -i "$DEPLOYMENT_ID" \
  -V "$VERSION_NUMBER" \
  -d "$RELEASE"

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
echo "===== FINAL GIT STATUS ====="

git status --short

echo ""
echo "===== CURRENT COMMIT ====="

git log -1 --oneline

echo ""
echo "=========================================="
echo " PATTC Predicts v1.2.18k COMPLETE"
echo ""
echo " RealityCastImport installed"
echo " Team Fantasy preserved"
echo " Notifications preserved"
echo " GitHub VERIFIED"
echo " Cloudflare triggered"
echo " Apps Script deployed"
echo " Production checks passed"
echo "=========================================="
