# Phase 1 Games Section Fixes v1.0.0

## Scope

This update completes the Phase 1 Games-section work identified in the July 31, 2026 code review:

1. Preserve game-type and scoring flags during Draft, Setup, Preview, Active, and Default status changes.
2. Route Staked Prediction games into the Picks experience.
3. Give Hybrid/Mixed and legacy Combo games access to both Picks and Wagers.
4. Add game-type-aware production preflight checks.
5. Make new game shells safe by default: Draft, inactive, and locked.
6. Consolidate Combo under Hybrid while retaining backward compatibility.

## Changes

### Safe publishing

Publishing actions now update only publication state fields:

- Status
- Active
- Archived
- DefaultGame
- LockAllPicks

They no longer overwrite:

- PredictionEnabled
- RankingEnabled
- ConfidenceEnabled
- WagerEnabled
- StakedPointsEnabled
- FixedPointsEnabled

The guided Game form now saves a requested active game as Setup/inactive/locked first, runs the newest preflight against the saved configuration, and activates only when the preflight has no errors.

### Safe new games

A new game now starts with:

- `Active = FALSE`
- `Status = Draft`
- `LockAllPicks = TRUE`
- `DefaultGame = FALSE`

Game-type defaults are preserved even when optional feature flags are omitted from the create payload.

### Staked Prediction

`staked-prediction` now routes to the Picks page. New Staked Prediction games default to:

- Predictions enabled
- Staked points enabled
- Fixed points disabled

Preflight verifies stake minimum, maximum, increment alignment, and at least one active `staked-points` question.

### Hybrid Game mode chooser

Mixed/Hybrid and legacy Combo games now open a simple Game Sections page. Depending on enabled features, it shows:

- Make Picks
- Place Wagers
- View Leaderboard

This prevents wager questions from being hidden when a Hybrid game enters the Picks page.

### Combo consolidation

- New game setup shows one `Hybrid Game` option.
- Existing `combo` rows remain supported.
- `hybrid` and `combo` normalize to Mixed/Hybrid behavior.
- Combo receives a preflight warning recommending migration when convenient.

No forced spreadsheet migration is required.

### Type-aware preflight

Preflight now checks:

- Required feature flags for each game type
- Exactly two active choices for Head-to-Head questions
- Staked question modes and stake limits
- Wager question modes
- Hybrid enabled sections versus actual question modes
- Missing sports event identifiers for sports-sourced questions
- Leaderboard-only parent games without requiring parent questions
- Connected mini-game warning for empty leaderboard-only hubs

Ranking and Survivor publishing remain intentionally blocked because their player-entry and scoring lifecycles are not Phase 1 complete.

## Deployment

### Google Apps Script backend

Copy or push:

- `backend/admin/AdminGames.js`
- `backend/admin/AdminPreflight.js`
- `backend/engines/GamesEngine.js`

Then run:

```bash
clasp push
```

Create a new Apps Script web-app deployment/version if your current deployment is versioned rather than using the head deployment.

### Cloudflare/frontend

Deploy:

- `frontend/app.html`
- `frontend/app.js`
- `frontend/js/app.js`
- `frontend/js/pages/admin.js`
- `frontend/js/pages/adminGames.js`
- `frontend/js/pages/gameModeHub.js`
- `frontend/sw.js`

The service-worker cache was bumped to:

`awards-app-v251-phase1-games-hub`

After deployment, fully close/reopen the installed PWA or hard-refresh the browser so the new service worker and page file load.

## Live smoke tests

1. **New game safety**
   - Create a new Prediction game.
   - Confirm it saves as Draft, inactive, and locked.
   - Confirm Predictions remain enabled for the game type.

2. **Publishing preserves flags**
   - Configure a Wager game with WagerEnabled on and Predictions off.
   - Move it through Setup, Preview, Active, and Default.
   - Confirm WagerEnabled remains on and Predictions remains off.

3. **Staked Prediction routing**
   - Create or open a Staked Prediction game with one `staked-points` question.
   - Select the game from the dashboard.
   - Confirm it opens Make Your Picks and shows stake controls.

4. **Hybrid mode chooser**
   - Open a Hybrid game with Predictions and Wagers enabled.
   - Confirm the Game Sections page shows Make Picks, Place Wagers, and Leaderboard.
   - Confirm each button loads the correct section.

5. **Head-to-Head preflight**
   - Add three active choices to a Head-to-Head question.
   - Run preflight or attempt activation.
   - Confirm activation is blocked until exactly two active choices remain.

6. **Wager and Staked preflight**
   - Confirm a Wager game with no `wager` question is blocked.
   - Confirm a Staked game with no `staked-points` question is blocked.

7. **Leaderboard-only parent**
   - Run preflight on a leaderboard-only parent with connected mini games and no parent questions.
   - Confirm missing parent questions is not an error.

## Local validation

- JavaScript syntax: 116 files passed.
- Regression suites: 16 of 16 passed.
- New Phase 1 suite: `tests/games_phase1_integration_tests.js` passed.
