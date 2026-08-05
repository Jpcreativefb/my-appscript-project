# Production Reality TV Player Fast Startup v1.1.4

## Problem

Opening a Reality TV game as a player could take roughly two minutes and then fail with:

`Could not load picks — Connection timed out. Please try again.`

The startup payload was blocking on work that was not required to display the questions:

- complete Reality TV player statistics and weekly rankings
- compact leaderboard generation
- Season Survivor history and entity details
- group/history setup writes during a player read
- repeated group-history reads for each contestant and eliminated participant

## Fix

The player load is now split into two layers.

### Fast core

The initial startup request returns only:

- game configuration
- questions and answers
- saved picks
- read-only Reality TV season/episode layout
- participant and group display data

The Reality TV core reads each required Reality TV table once, performs no setup or repair writes, and uses one shared game-level cache.

### Deferred enhancements

After the Picks page is usable, separate requests load:

- player weekly statistics
- compact leaderboard
- Season Survivor Pick details and history

A slow or failed optional request no longer prevents the questions from loading or picks from being saved.

## Additional safeguards

- The core startup timeout is reduced from two minutes to 45 seconds.
- Deferred updates replace only the score/summary areas and episode-stat headers.
- The question cards are not rerendered, so unsaved on-screen selections are not erased.
- Reality TV player statistics use a short per-user cache.
- Frontend/service-worker asset version: `304-player-picks-fast-startup`.

## Changed backend files

- `backend/Api.js`
- `backend/engines/AppDataEngine.js`
- `backend/engines/RealityTvSeasonEngine.js`

## Changed frontend files

- `frontend/js/api.js`
- `frontend/api.js`
- `frontend/js/pages/picks.js`
- `frontend/js/app.js`
- `frontend/app.js`
- `frontend/js/pwa.js`
- `frontend/app.html`
- `frontend/sw.js`

## Validation

- All modified JavaScript files pass syntax validation.
- All 46 automated test files pass.
- A focused regression test confirms the initial player payload performs no Reality TV setup writes and defers statistics and Season Survivor details.
