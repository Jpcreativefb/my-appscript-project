#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-.}"
cd "$ROOT"
mkdir -p docs/archive/releases docs/guides
rm -f .admin-collapsible-body summary

for file in *.md *.txt; do
  [[ -e "$file" ]] || continue
  case "$file" in
    API_CONTRACT.md|DEPLOYMENT_CHECKLIST.md|PROJECT_STRUCTURE.md|CHANGELOG.md|PRODUCTION_STATUS.md|PRODUCTION_HARDENING_V1_1_0.md|PRODUCTION_SMOKE_TEST_V1_1_0.md)
      ;;
    README_*.md)
      mv -f "$file" docs/guides/
      ;;
    *)
      mv -f "$file" docs/archive/releases/
      ;;
  esac
done

echo "Repository documentation cleanup complete. Automated tests were preserved."
