#!/usr/bin/env bash
set -euo pipefail
ROOT="${1:-.}"
cd "$ROOT"
cp frontend/js/api.js frontend/api.js
cp frontend/js/app.js frontend/app.js
echo "Frontend compatibility mirrors synchronized."
