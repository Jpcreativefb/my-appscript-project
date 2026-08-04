# Sports Advanced Questions v1.2 — Install and Test

This release requires updates to both projects:

1. Separate Sports Scores Engine
2. Awards App

## A. Sports Scores Engine

Replace:

- `SportsScoresEngine.gs`
- `SportsAdminControls.gs`

Add:

- `SportsAdvancedStatsEngine.gs`

Run in Apps Script:

1. `setupSportsAdvancedStatsSystem()`
2. `testRefreshMLBAdvancedStats()`
3. `testRefreshNFLAdvancedStats()`
4. `testGetSportsAdvancedStatsStatus()`

Confirm these tabs exist:

- `SportsTeamGameStats`
- `SportsStatCheckpoints`

Deploy a new Sports Scores Engine web-app version.

## B. Awards App

Overlay the changed-files zip at the repository root.

Run local tests:

```bash
node tests/sports_advanced_stats_engine_tests.js
node tests/sports_advanced_questions_integration_tests.js
node tests/sports_player_matchups_integration_tests.js
node tests/sports_player_props_integration_tests.js
node tests/bets_single_row_upsert_tests.js
node tests/sports_players_controls_integration_tests.js
node tests/archive_production_readiness_tests.js
node tests/leaderboard_modal_interactions_tests.js
```

Push Apps Script:

```bash
clasp push
```

Run once in the Awards App Apps Script editor:

1. `setupSportsPlayerPropSystem()`

This now also runs `setupSportsAdvancedQuestionSystem()` and adds the new reference headers without clearing data.

Deploy a new Awards App web-app version, push the frontend to GitHub, and allow Cloudflare Pages to deploy.

Hard refresh:

```text
Command + Shift + R
```

## C. First live test — final cross-game comparison

1. Open Sports as an admin.
2. Set the date range so two MLB games are loaded.
3. Select **Create Stat Question** on either MLB card.
4. Choose `Highest total`.
5. Select players or teams from two different games.
6. Choose a common statistic such as `Hits` or `Home Runs`.
7. Choose `Final game total`.
8. Create as Wager or Prediction.
9. Confirm rows appear in `Categories` and `CategorySettings`.
10. Confirm a user selection writes to `Bets` or `Picks` as expected.

## D. First checkpoint test

1. Create a one-player `Yes/No threshold` question.
2. Choose `Hits`, `At least`, `1`, and `By the end of inning 3`.
3. Keep the Sports Scores Engine live score trigger running.
4. After the checkpoint, inspect `SportsStatCheckpoints`.
5. Run Smart Sports Sync.

Expected:

- `EXACT_BOUNDARY` → may settle automatically.
- `POLL_SNAPSHOT` → `SettlementStatus` becomes `review` and `RequireAdminReview` becomes `TRUE`.

Do not treat a late poll as an exact historical boundary.
