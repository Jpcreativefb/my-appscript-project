# Sports Stats Section Runtime Fix v1.2.1

## Confirmed runtime failures

1. `frontend/js/sports.js` removed each Sports Scores JSONP callback after 20 seconds. When Apps Script returned later, the browser executed a callback name that no longer existed and logged:

   `Uncaught ReferenceError: sportsJsonpCallback_... is not defined`

2. The standalone `frontend/sports.html` page loads `config.js` and `sports.js`, but not `frontend/js/api.js`. The advanced-stat workflow called `apiAdminGetSportsAdvancedQuestionOptions()` and `apiAdminCreateSportsAdvancedQuestion()`, which were therefore undefined on this page.

3. Player props, player matchups, stat questions, destination-game loading, and Sports usage used direct cross-origin `fetch()` calls from Cloudflare Pages to Apps Script. The standalone score feed already used JSONP specifically to avoid this browser/CORS problem.

4. `tests/sports_advanced_stats_engine_tests.js` used a machine-specific `/mnt/data/scores/SportsAdvancedStatsEngine.gs` path instead of the engine file included in the repository.

## Production changes

### `frontend/js/sports.js`

- Increased normal Sports JSONP timeout from 20 seconds to 90 seconds.
- Added a 120-second timeout for Awards App admin/stat actions.
- Preserves a harmless callback after timeout/error so delayed Apps Script responses cannot throw a browser `ReferenceError`.
- Adds a cache-busting timestamp to JSONP requests.
- Routes Awards App Sports calls through JSONP instead of direct cross-origin `fetch()`.
- Makes Create Stat Question self-contained instead of relying on frontend API functions not loaded by `sports.html`.
- Validates advanced-stat options and gives a direct setup/deployment error when the Sports Scores Engine is missing or outdated.
- Routes Sports usage through the same JSONP transport.

### `frontend/sports.html`

- Adds a version query to `sports.js` so Cloudflare/browser caches request the corrected runtime file.

### `frontend/sw.js`

- Bumps the service-worker cache to `awards-app-v218-sports-stats-runtime`.

### Tests

- Adds `tests/sports_page_stats_runtime_tests.js`.
- Corrects the advanced-stats engine test path.
- Updates cache-version assertions.

## Automated results

All 11 repository tests pass, including:

- Sports page stats runtime
- Sports Advanced Questions
- Sports Advanced Stats Engine
- Player Props
- Player Matchups creation and settlement
- Player Prop bet saving
- Sports Players controls
- Bets single-row upsert
- Archive readiness
- Leaderboard modal interactions

## Deployment order

1. Copy the changed files over the current repository.
2. Commit and push so Cloudflare Pages deploys the frontend.
3. Because `frontend/sw.js` changed, hard refresh the Sports page with `Command + Shift + R`.
4. Confirm the latest Awards App Apps Script backend version is deployed. The frontend actions already exist in the uploaded backend files, but an older live deployment will still return `Unknown action`.
5. Confirm the latest separate Sports Scores Engine version is deployed with:
   - `SportsPlayersEngine`
   - `SportsAdvancedStatsEngine`
   - `SportsTeamGameStats`
   - `SportsStatCheckpoints`
6. In the Sports Scores Engine, run `setupSportsAdvancedStatsSystem()` once if those advanced-stat sheets do not exist.
7. Sync MLB/NFL players before testing player props or matchups.

## Recommended live test order

1. Load the Sports page for one day only and confirm no `sportsJsonpCallback_... is not defined` error appears.
2. Create Player Prop.
3. Create Player Matchup as Wager.
4. Create Player Matchup as Prediction.
5. Create Stat Question as Wager.
6. Create Stat Question as Prediction.
7. Run Smart Sports Sync after a final game and verify settlement.
