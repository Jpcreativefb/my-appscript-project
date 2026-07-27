# Storage Performance v2.1.1 — Leaderboard Career Stats and Compare Fix

## Problem

The normal combined leaderboard included both modal shells, but the separate prediction leaderboard and wager leaderboard omitted the Career Stats modal. Career Stats buttons therefore exited silently because `careerProfileModal` did not exist.

The Compare button also relied only on inline `onclick` handlers. In the affected full-leaderboard layout, the interaction could fail without displaying an error even though the compare modal markup existed.

## Fix

- Added the Career Stats modal shell to all leaderboard layouts:
  - Combined prediction leaderboard
  - Separate fixed/staked prediction leaderboard
  - Wager leaderboard
- Replaced Career Stats and Compare inline handlers with one delegated leaderboard click handler.
- Added automatic modal-shell recovery before opening either popup.
- Kept archived career history and compare APIs unchanged.
- Bumped the service-worker cache to `awards-app-v211-career-modal-fix`.

## Changed files

- `frontend/js/pages/leaderboard.js`
- `frontend/sw.js`
- `tests/archive_production_readiness_tests.js`
- `tests/leaderboard_modal_interactions_tests.js`

## Deployment

This is frontend-only.

- Do not run `clasp push` for this patch.
- Do not create a new Apps Script web-app deployment.
- Commit and push to `architecture-cleanup` so Cloudflare Pages deploys the frontend.
- Hard-refresh after Cloudflare completes.

## Live verification

1. Open Oscars 2026.
2. Open the full leaderboard.
3. Select a player's `Career stats` control.
4. Confirm the Career History popup opens.
5. Close it.
6. Select `Compare` for another player.
7. Confirm the comparison popup opens and shows either the comparison data or an explicit access/error message.
