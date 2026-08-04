# Phase 1 Hybrid Routing and Wager Filter Hotfix v1.0.11

## Problems corrected

1. A Hybrid game with Wagers enabled was classified as a plain Wager game on the dashboard because the resolver checked `WagerEnabled` before the explicit Game Type.
2. The Wager page loaded every active question in a Hybrid game instead of only questions whose `ScoreMode` is `wager`.
3. A manually created wager with no sports event or external odds source displayed **Odds pending** and could not be played.

## New behavior

- Explicit Game Type wins over feature flags.
- `hybrid`, `mixed`, and legacy `combo` games open the Game Sections chooser.
- **Make Picks** shows non-wager questions.
- **Place Wagers** shows only `ScoreMode: wager` questions.
- A manual wager with no external sports/odds source uses even decimal odds of `2x` by default.
- A sports-linked wager continues to wait for real odds when required.

## Deployment

This hotfix changes Apps Script backend files and the frontend service worker.

1. Copy the changed files into the repository.
2. Run the tests.
3. Run `clasp push`.
4. Update the fixed Apps Script web-app deployment version when applicable.
5. Commit and push the branch so Cloudflare deploys the frontend cache update.
6. Hard-refresh the browser and fully close/reopen the installed PWA.

## Test 4 expected result

Opening the live Hybrid test game displays:

- Make Picks
- Place Wagers
- View Leaderboard

The Picks section contains only the fixed-points prediction. The Wager section contains only the wager question. A manual wager displays `2x`, not **Odds pending**.
