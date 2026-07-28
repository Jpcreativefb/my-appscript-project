# Sports Player Matchups v1.1.0 — Install and Test

## Install

Overlay the changed-files zip on the current Awards App project, then run:

```bash
node tests/sports_player_matchups_integration_tests.js
node tests/sports_player_matchup_creation_tests.js
node tests/sports_player_props_integration_tests.js
node tests/sports_player_prop_bet_save_integration_tests.js
node tests/bets_single_row_upsert_tests.js
node tests/sports_players_controls_integration_tests.js
node tests/archive_production_readiness_tests.js
node tests/leaderboard_modal_interactions_tests.js

clasp push
```

Create a new Apps Script deployment version, push the frontend commit to GitHub, allow Cloudflare Pages to deploy, and hard-refresh the browser with **Command + Shift + R**.

## One-time sheet setup

From the Awards App Apps Script editor, run:

```text
setupSportsPlayerPropSystem
```

This appends the new readable fields without clearing data:

- `SportsComparisonMode`
- `SportsQuestionMode`
- `SportsTieMode`

## Create a matchup

1. Open the Awards App **Sports** page as an administrator.
2. Find an MLB or NFL game.
3. Select **Create Player Matchup**.
4. Choose:
   - Wager or Prediction
   - Statistic
   - Two to twelve players
   - Per-player decimal odds when using Wager
   - Prediction points when using Prediction
5. Choose the destination Awards Game.

## Verify the sheet rows

`Categories` should receive one row per selected player with:

- `SportsMarket = player-matchup`
- `SportsPlayerId`
- `SportsPlayerName`
- `SportsStatType`
- `SportsComparisonMode = highest`
- `SportsQuestionMode = wager` or `prediction`

`CategorySettings` should receive one row with:

- `QuestionType = player-matchup-multi`
- `ScoreMode = wager` or `correct-pick`
- `ComparisonOperator = highest`
- `SportsTieMode = push`
- `SourceConfigJSON` containing the selected players

## Readiness check

Run:

```text
testLatestSportsPlayerMatchupReadiness
```

Expected:

- wager matchup: `expectedSheet = Bets`
- prediction matchup: `expectedSheet = Picks`
- `locked = false`
- `nomineeCount >= 2`
- `problems = []`

## Settlement test

After the source game is final and player stats are refreshed, run:

```text
testSettleSportsPlayerMatchupsNow
```

Or use **Run Smart Sports Sync Now**. Confirm:

- `WinnerNomineeId` is the player with the highest value;
- `SettlementStatus = settled`;
- `Locked = TRUE`;
- `CategoryResults` contains the result;
- a tie uses `WinnerNomineeId = push` and `WagerResultType = push`.
