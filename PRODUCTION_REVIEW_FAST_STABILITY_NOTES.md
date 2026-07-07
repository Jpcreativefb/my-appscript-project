# Production Review — Fast Stability Cleanup

Date: 2026-07-06

## What this package is

This is a fast, practical stability pass on the current three-part project:

1. Main Awards/PATTC app: `backend/` and `frontend/`
2. Sports Scoring Engine: `external-engines/sports-scoring-engine/`
3. Racing Score Engine: `external-engines/racing-score-engine/`

The goal of this package is not a full rewrite. It is the first production-cleanup pass to reduce timeout/lock issues, make the app load faster, keep league/private-game access wired in, and prepare the game-type/admin cleanup path.

## Biggest findings

### Main app

The main app has the most immediate timeout risk. The biggest problems found were:

- Dashboard startup makes more calls than needed, especially profile calls before the user actually opens Profile.
- League access reads `Leagues`, `LeagueMembers`, `LeagueGames`, and `GameFeatureAccess` repeatedly during a single dashboard load.
- Wager page batching existed on the frontend, but the backend API route was not passing `offset`, `limit`, `includeSummary`, or `includeLeaderboard` into `apiGetBettingPagePayload`, so the backend could still do more work than intended.
- Wager option loading built all wager category nominee payloads before slicing into batches.
- Admin game save/clone actions used blocking `waitLock(10000)`, which can produce confusing lock timeout behavior when another Apps Script action is still running.
- The project currently has duplicate frontend files in both `frontend/app.js` and `frontend/js/app.js`, plus `frontend/api.js` and `frontend/js/api.js`. The live `app.html` uses the `frontend/js/` versions, but this package keeps both copies synced where relevant.

### Sports scoring engine

The sports-scoring-engine is close structurally. It already has:

- Separate scores, odds, and admin control files.
- Lock protection on scheduled score and odds refreshes.
- Batch season job support.

Main remaining risks:

- Several full-sheet reads remain in the sports engine, but they are mostly admin/trigger workflows instead of normal app startup.
- Sports refreshes should run from scheduled triggers, not while users are loading the main app.
- Avoid running score refresh, odds refresh, and app sync buttons at the same time because they compete for sheet locks.

### Racing score engine

The racing-score-engine is still in build-out mode. It has a good split between:

- Driver DB
- Raw paste
- Race paste
- Supplemental data
- Results
- Weekly workflow
- Racing API

Main remaining risks:

- Driver/image data should stay paste/import-driven for now. Do not rely on NASCAR protected pages as the only source.
- Racing should stay separate from the main app until race results and supplemental stat scoring are reliable.
- Keep the Awards App integration to summary/sync functions only, not direct live racing sheet reads from the app frontend.

## Files changed in this package

### Backend

- `backend/Api.js`
  - Fixed `getBettingPagePayload` route so it passes batching fields to the backend.
  - Added league/game access check for wager payload loading.

- `backend/engines/AppDataEngine.js`
  - Dashboard games hub now skips profile loading unless `includeProfile=true` is explicitly passed.
  - This removes one slow call from normal dashboard startup.

- `backend/engines/BettingEngine.js`
  - `getBettingOptions(gameId, options)` now accepts `offset` and `limit`.
  - Wager categories are prepared/sorted first, then only the requested batch builds nominee/odds payloads.
  - `apiGetBettingPagePayload` now uses the backend batch metadata instead of loading all categories and slicing afterward.
  - Wager save/remove locks now fail fast with a friendly message instead of waiting up to 60 seconds.

- `backend/engines/GamesEngine.js`
  - Added request-runtime cache for `getGames()`.
  - Added `head-to-head` and `combo` game types to the game type registry.
  - `clearGamesCache()` now clears runtime game cache too.

- `backend/engines/LeagueAccessEngine.js`
  - Added request-runtime cache for league access sheet object reads.
  - Added cache clearing after league/member/game/feature access writes.
  - This reduces repeated full-sheet reads during dashboard access filtering.

- `backend/admin/AdminGames.js`
  - Replaced blocking admin game save/clone `waitLock(10000)` calls with `tryLock(8000)` and clearer errors.

### Frontend

- `frontend/js/api.js`
  - Added `getBettingPagePayload` to long-timeout API actions.
  - Sends session token and active league id with wager payload requests.

- `frontend/api.js`
  - Same sync changes as `frontend/js/api.js` for duplicate compatibility.

- `frontend/js/app.js`
  - Removed eager profile load during initial app startup.
  - Removed profile refresh after selecting a game.
  - Routes `racing-wager` to the wager page.
  - Routes `head-to-head`, `combo`, `mixed`, and `survivor` to the picks page for now.

- `frontend/app.js`
  - Same sync changes as `frontend/js/app.js` for duplicate compatibility.

- `frontend/js/pages/dashboard.js`
  - Removed duplicate dashboard profile refresh.

## Expected improvement

This package should improve the main app in these specific areas:

- Faster dashboard load because profile is no longer fetched twice around startup.
- Faster private/public league filtering because league sheets are cached during one API call.
- Faster wager page load because the API route now honors the frontend batch request and the backend builds only the requested wager batch.
- Fewer lock-timeout failures when saving/cloning games or saving/removing wagers.
- Cleaner game-type foundation for prediction, head-to-head, racing wager, ranking, combo/mixed, and confidence games.

## What this does not finish yet

These still need the next cleanup pass:

- A fully redesigned admin UI.
- A single universal scoring registry for every game type.
- Final head-to-head scoring logic beyond using the existing prediction/picks path.
- Full ranking ballot page flow if ranking games need user-entered rankings inside the main app.
- Full racing supplemental stat scoring integration into the main app.
- Consolidating duplicate frontend files and removing old/unused files.

## Apply order

1. Save your current project and commit it first.
2. Copy the updated `backend/` files into the main Apps Script project.
3. Push/deploy the main Apps Script backend.
4. Copy the updated `frontend/` files to the frontend project.
5. Redeploy the frontend.
6. Do not run sports/racing triggers while testing game save/load.
7. Test with a normal user and an admin user.

## Test checklist

### Main startup

- Login as `testuser`.
- Dashboard should load without the old timeout.
- Admin nav should still show for admin users only.
- Public games should show to everyone.
- Private league games should show only to users in an assigned league.

### Admin game save

- Admin → Games.
- Create or update a test game.
- If another admin process is running, error should say another admin save is running instead of hanging.

### Wager game

- Open a wager or racing-wager game.
- First batch should load quickly.
- More categories should load in batches.
- Console should not show repeated first-page loads caused by ignored offset/limit.

### League access

- Run `adminSetupLeagueAccessSystem` once if sheets are missing.
- Create a league.
- Add a user.
- Assign a game to the league.
- Confirm a non-member cannot see the private league game.

### Sports scoring engine

- Run score refresh manually only once.
- Do not run odds refresh at the same time.
- Confirm SportsScores and odds sheets update.

### Racing score engine

- Use paste/import workflow first.
- Confirm driver/race rows normalize correctly before syncing to main app.

## Recommended next pass

The next pass should be one focused cleanup package:

1. Admin Home simplification: Setup, Games, Leagues, Sports, Racing, Results, Users.
2. Universal Game Builder: game type, visibility, league access, scoring engine, categories/markets.
3. Scoring Registry: prediction, confidence, wager, head-to-head, ranking, racing, combo.
4. Racing integration: stable weekly workflow, copy/paste grid/results, supplemental scoring, then main app sync.
5. Remove duplicate frontend files after confirming which files Cloudflare deploys.
