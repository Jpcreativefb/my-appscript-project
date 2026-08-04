# Phase 2 Reality TV Multiline Contestant Import v1.0.21

Frontend-only parser hotfix for the Reality TV Season Manager bulk contestant importer.

## Fixes

- Keeps quoted spreadsheet cells containing embedded line breaks in one contestant row.
- Normalizes embedded line breaks to spaces, for example `Woodland, California`.
- Accepts `Full Name` as the contestant display name when no separate `Name` column is present.
- Preserves tab-separated and CSV header mapping.
- Detects a missing closing quote and displays a validation error.

## Changed files

- `frontend/js/pages/adminRealityTv.js`
- `frontend/app.html`
- `frontend/sw.js`
- `tests/reality_tv_bulk_contestant_import_tests.js`

## Deployment

This is frontend-only. Commit and push to GitHub/Cloudflare. No `clasp push` or Apps Script deployment is required.
