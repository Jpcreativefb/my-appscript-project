#!/usr/bin/env bash
set -euo pipefail

RELEASE="v1.2.18o Team Fantasy Sports Proxy Routing"
MAIN_DEPLOYMENT_ID="AKfycbyDdfv-1xMQTL7LGhGp48_nmWqiNSvNcKLo5IHkAQTxsQCVIPaMP8ZlxMp0ZfT_bzvo"
PACKAGE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO="${1:-$(git rev-parse --show-toplevel)}"
cd "$REPO"

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

echo "=========================================="
echo " PATTC Predicts v1.2.18o"
echo " Team Fantasy Sports Proxy Routing"
echo "=========================================="
echo "Project: $REPO"

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

echo "BASELINE VERIFIED."

for required in \
  backend/engines/SportsTeamFantasyEngine.js \
  backend/engines/SportsWagerEngine.js \
  backend/engines/NotificationsEngine.js \
  external-engines/sports-scoring-engine/.clasp.json \
  external-engines/sports-scoring-engine/src/SportsScoresEngine.js \
  frontend/_routes.json \
  functions/api/team-fantasy.js; do
  if [ ! -f "$required" ]; then
    echo "STOP: Required file is missing: $required"
    exit 1
  fi
done

grep -q 'teamFantasyNotificationOutstandingSummary_' backend/engines/NotificationsEngine.js || {
  echo "STOP: Team Fantasy notification compatibility hook is missing."
  exit 1
}

# If this exact data bridge is already present, stop instead of duplicating it.
if grep -q 'action === "getTeamFantasyNflSchedule"' external-engines/sports-scoring-engine/src/SportsScoresEngine.js || \
   grep -q 'function teamFantasySportsEngineJson_(' backend/engines/SportsTeamFantasyEngine.js; then
  echo "STOP: Team Fantasy Sports Scores Engine bridge already appears to be installed."
  echo "Bring the current git status/log back to Release Control before applying another copy."
  exit 1
fi

echo ""
echo "===== COPY CONTROLLED RELEASE SUPPORT FILES ====="
mkdir -p tests tools docs
cp "$PACKAGE_ROOT/tests/team_fantasy_sports_proxy_routing_v1218o_tests.js" tests/
cp "$PACKAGE_ROOT/tools/apply_team_fantasy_sports_proxy_routing_v1218o.py" tools/
cp "$PACKAGE_ROOT/tools/install_team_fantasy_sports_proxy_routing_v1218o.sh" tools/
cp "$PACKAGE_ROOT/docs/TEAM_FANTASY_SPORTS_PROXY_ROUTING_V1_2_18O.md" docs/
cp "$PACKAGE_ROOT/CHANGED_FILES_V1_2_18O.txt" ./
chmod +x tools/apply_team_fantasy_sports_proxy_routing_v1218o.py tools/install_team_fantasy_sports_proxy_routing_v1218o.sh

echo ""
echo "===== APPLY TEAM FANTASY 18o ====="
python3 tools/apply_team_fantasy_sports_proxy_routing_v1218o.py "$REPO"

echo ""
echo "===== JAVASCRIPT SYNTAX ====="
node --check backend/engines/SportsTeamFantasyEngine.js
node --check external-engines/sports-scoring-engine/src/SportsScoresEngine.js
node --check functions/api/team-fantasy.js
node --check tests/team_fantasy_sports_proxy_routing_v1218o_tests.js

echo ""
echo "===== TEAM FANTASY SPORTS PROXY TEST ====="
node tests/team_fantasy_sports_proxy_routing_v1218o_tests.js "$REPO"

for testfile in \
  tests/team_fantasy_v1218j_tests.js \
  tests/team_fantasy_admin_controls_v1218j2_tests.js \
  tests/team_fantasy_transport_scope_v1218j3_tests.js \
  tests/push_automatic_reminders_team_fantasy_compat_v1218j4_tests.js \
  tests/push_automatic_pick_reminder_scheduling_v1218j_tests.js \
  tests/reality_tv_cast_import_v1218k_tests.js \
  tests/reality_tv_production_automation_v1218n_tests.js; do
  if [ -f "$testfile" ]; then
    echo ""
    echo "===== $(basename "$testfile") ====="
    node "$testfile"
  fi
done

if [ -x tools/sync_frontend_mirrors.sh ]; then
  echo ""
  echo "===== SYNC FRONTEND MIRRORS ====="
  bash tools/sync_frontend_mirrors.sh
fi

echo ""
echo "===== DIFF CHECK ====="
git diff --check

echo ""
echo "===== FULL PRODUCTION CHECKS ====="
bash tools/run_production_checks.sh

echo ""
echo "===== VERIFY SPORTS SCORES ENGINE DEPLOYMENT ====="
cd "$REPO/external-engines/sports-scoring-engine"
SPORTS_DEPLOYMENTS="$(clasp_cmd deployments)"
echo "$SPORTS_DEPLOYMENTS"
cd "$REPO"

SPORTS_DEPLOYMENT_ID="$(SPORTS_DEPLOYMENTS_ENV="$SPORTS_DEPLOYMENTS" python3 - "$REPO/backend/engines/SportsWagerEngine.js" <<'PY'
import os, re, sys
text=open(sys.argv[1], encoding='utf-8').read()
deployments=os.environ.get('SPORTS_DEPLOYMENTS_ENV', '')
ids=[]
for value in re.findall(r'https://script\.google\.com/macros/s/([A-Za-z0-9_-]+)/exec', text):
    if value not in ids:
        ids.append(value)
for value in ids:
    if value in deployments:
        print(value)
        break
PY
)"
if [ -z "$SPORTS_DEPLOYMENT_ID" ]; then
  echo "STOP: None of the Sports Scores Engine deployment IDs configured in SportsWagerEngine.js belong to the separate Sports Scores Engine project."
  exit 1
fi
echo "Verified Sports deployment ID: $SPORTS_DEPLOYMENT_ID"

echo ""
echo "===== STAGE EXACT 18o FILES ====="
while IFS= read -r FILE; do
  [ -n "$FILE" ] && git add -A -- "$FILE"
done < CHANGED_FILES_V1_2_18O.txt

git status --short
if git diff --cached --quiet; then
  echo "STOP: Nothing staged for v1.2.18o."
  exit 1
fi

echo ""
echo "===== COMMIT ====="
git commit -m "Route Team Fantasy through Sports Scores Engine v1.2.18o"

echo ""
echo "===== DEPLOY SPORTS SCORES ENGINE FIRST ====="
cd "$REPO/external-engines/sports-scoring-engine"
clasp_cmd push
SPORTS_VERSION_OUTPUT="$(clasp_cmd version "$RELEASE - Sports Scores Engine")"
echo "$SPORTS_VERSION_OUTPUT"
SPORTS_VERSION="$(printf '%s\n' "$SPORTS_VERSION_OUTPUT" | sed -nE 's/.*Created version ([0-9]+).*/\1/p' | tail -1)"
if ! [[ "$SPORTS_VERSION" =~ ^[0-9]+$ ]]; then
  echo "STOP: Could not determine Sports Scores Engine version."
  exit 1
fi
clasp_cmd deploy -i "$SPORTS_DEPLOYMENT_ID" -V "$SPORTS_VERSION" -d "$RELEASE - Sports Scores Engine"

echo ""
echo "===== DEPLOY PATTC PREDICTS APPS SCRIPT SECOND ====="
cd "$REPO"
clasp_cmd push
MAIN_VERSION_OUTPUT="$(clasp_cmd version "$RELEASE")"
echo "$MAIN_VERSION_OUTPUT"
MAIN_VERSION="$(printf '%s\n' "$MAIN_VERSION_OUTPUT" | sed -nE 's/.*Created version ([0-9]+).*/\1/p' | tail -1)"
if ! [[ "$MAIN_VERSION" =~ ^[0-9]+$ ]]; then
  echo "STOP: Could not determine PATTC Predicts Apps Script version."
  exit 1
fi
clasp_cmd deploy -i "$MAIN_DEPLOYMENT_ID" -V "$MAIN_VERSION" -d "$RELEASE"

echo ""
echo "===== PUSH GITHUB / TRIGGER CLOUDFLARE LAST ====="
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
echo " PATTC Predicts v1.2.18o COMPLETE"
echo ""
echo " /api/team-fantasy routing installed"
echo " /api/espn-proxy preserved"
echo " Sports Scores Engine NFL bridge deployed"
echo " Direct Apps Script -> ESPN path removed"
echo " Team Fantasy data/settings/triggers preserved"
echo " Notifications/Reality compatibility preserved"
echo " GitHub VERIFIED"
echo " Cloudflare triggered"
echo " Sports Apps Script version: $SPORTS_VERSION"
echo " PATTC Apps Script version: $MAIN_VERSION"
echo " Production checks passed"
echo "=========================================="
