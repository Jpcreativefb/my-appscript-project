# Storage Performance v2.1.2 — Leaderboard Career Panel Portal Fix

## Problem

On the Oscars 2026 full leaderboard, selecting **Career Stats** dimmed the leaderboard but displayed no visible dialog content. The backdrop was opening, which proved the click handler was running, but the dialog panel was mounted inside the page-render container and could be clipped or lost by that layout. The leaderboard popup stylesheet was also not explicitly included in the service-worker application shell.

## Fix

- Removed the Compare and Career modal shells from leaderboard page HTML.
- Both dialogs are now created once and mounted directly under `document.body`.
- Invalid or partial dialog shells are automatically removed and rebuilt.
- Dialog display, visibility, opacity, accessibility state, and panel visibility are set explicitly.
- Career History shows a visible header and loading message before the API request starts.
- Career History now reports API, timeout, and rendering errors inside the dialog instead of leaving a blank backdrop.
- Compare uses the same hardened body-level dialog portal.
- Added `frontend-leaderboard-profile.css` to the service-worker application shell.
- Bumped the service-worker cache to `awards-app-v212-career-panel-portal-fix`.

## Changed files

- `frontend/js/pages/leaderboard.js`
- `frontend/css/frontend-leaderboard-profile.css`
- `frontend/sw.js`
- `tests/leaderboard_modal_interactions_tests.js`
- `tests/archive_production_readiness_tests.js`

## Deployment

This is a frontend-only release. Do not run `clasp push` and do not create a new Apps Script deployment.

Commit and push the changed files to `architecture-cleanup`, allow Cloudflare Pages to deploy, then hard-refresh with Command + Shift + R.
