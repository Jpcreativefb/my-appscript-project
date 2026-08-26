#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-.}"
cd "$ROOT"

echo "== Awards App production checks =="

echo "[1/13] JavaScript syntax"
syntax_count=0
while IFS= read -r -d '' file; do
  node --check "$file" >/dev/null
  syntax_count=$((syntax_count + 1))
done < <(find backend frontend external-engines functions -type f -name '*.js' -print0)
echo "  PASS: ${syntax_count} JavaScript files"

echo "[2/13] Frontend compatibility mirrors"
cmp -s frontend/js/api.js frontend/api.js || {
  echo "ERROR: frontend/js/api.js and frontend/api.js differ" >&2
  exit 1
}
cmp -s frontend/js/app.js frontend/app.js || {
  echo "ERROR: frontend/js/app.js and frontend/app.js differ" >&2
  exit 1
}
echo "  PASS: API/app mirrors synchronized"

echo "[3/13] Regression tests"
test_count=0
for test_file in tests/*.js; do
  node "$test_file" >/dev/null
  test_count=$((test_count + 1))
done
echo "  PASS: ${test_count} regression tests"

echo "[4/13] Legacy production hardening contract"
node tests/production_hardening_v1216_tests.js >/dev/null
echo "  PASS: v1.2.16 security regression contract"

echo "[5/13] Production readiness contract"
node tests/production_readiness_v1219rc1_tests.js >/dev/null
echo "  PASS: v1.2.19-rc1 production readiness contract"

echo "[6/13] RC2 performance certification contract"
node tests/production_performance_v1219rc2_tests.js >/dev/null
echo "  PASS: v1.2.19-rc2 performance certification contract"

echo "[7/13] RC3 final performance certification contract"
node tests/production_final_performance_v1219rc3_tests.js >/dev/null
echo "  PASS: v1.2.19-rc3 final performance certification contract"

echo "[8/13] RC4 cache persistence contract"
node tests/production_cache_persistence_v1219rc4_tests.js >/dev/null
echo "  PASS: v1.2.19-rc4 cache persistence contract"

echo "[9/13] RC5 Admin question performance contract"
node tests/production_admin_question_performance_v1219rc5_tests.js >/dev/null
echo "  PASS: v1.2.19-rc5 Admin question performance contract"

echo "[10/13] RC6 Admin question UX performance contract"
node tests/production_admin_question_ux_performance_v1219rc6_tests.js >/dev/null
echo "  PASS: v1.2.19-rc6 Admin question UX performance contract"

echo "[11/13] RC7 pick lock integrity contract"
node tests/production_pick_lock_integrity_v1219rc7_tests.js >/dev/null
echo "  PASS: v1.2.19-rc7 pick lock integrity contract"

echo "[12/13] RC8 sports wager integrity contract"
node tests/production_sports_wager_integrity_v1219rc8_tests.js >/dev/null
echo "  PASS: v1.2.19-rc8 sports wager integrity contract"

echo "[13/13] RC9 parallel integration contract"
node tests/production_parallel_integration_v1219rc9_tests.js >/dev/null
echo "  PASS: v1.2.19-rc9 parallel integration contract"

echo "ALL PRODUCTION CHECKS PASSED"
