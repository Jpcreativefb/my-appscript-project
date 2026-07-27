# Sports Player Props v1 — Install and Test

## Prerequisites

The separate Sports Scores Engine must already have the working v1.0.1 player backend:

- `SportsPlayers`
- `SportsPlayerGameStats`
- MLB and NFL roster sync
- MLB and NFL current-game stat refresh
- Sports Player Status admin action

The Awards App Script Properties must still contain the working Sports Scores Engine bridge values:

- `SPORTS_SCORES_ADMIN_API_URL`
- `SPORTS_SCORES_ADMIN_API_KEY`

Do not place either value in frontend JavaScript.

## Install

Copy the changed files over the same paths in the current Awards App repository, then run:

```bash
clasp push
```

Create a new Apps Script web-app deployment version. Commit and push the frontend files to GitHub so Cloudflare Pages deploys them.

The service-worker cache is now:

```text
awards-app-v214-sports-player-props
```

After deployment, hard-refresh the browser with **Command + Shift + R** on Mac.

## Optional one-time setup test

From the Awards App Apps Script editor, run:

```javascript
setupSportsPlayerPropSystem()
```

This appends any missing player-prop headers without clearing existing data. The same setup also runs automatically when the first player prop is created.

## Automated local tests

From the repository root:

```bash
node tests/sports_player_props_integration_tests.js
node tests/sports_players_controls_integration_tests.js
node tests/archive_production_readiness_tests.js
node tests/leaderboard_modal_interactions_tests.js
```

All four should pass.

## Create an MLB test prop

1. Log in as an Awards App administrator.
2. Open **Sports**.
3. Display a current or upcoming MLB game.
4. Select **Create Player Prop** on the score card.
5. Choose the destination Awards App game.
6. Choose a player from either team.
7. Choose a statistic, such as `Home Runs` or `Hits`.
8. Enter a line, such as `0.5`.
9. Leave both odds at `1.91` for the first test.
10. Select **Create Player Prop**.

Confirm:

- Two `Categories` rows were added: `Over <line>` and `Under <line>`.
- The category has `SportsMarket = player-prop`.
- The five `SportsPlayer*` / `SportsProp*` references are populated.
- One `CategorySettings` row was added.
- `LockDateTime` matches the game start.
- `OddsReady` is true.

## Create an NFL test prop

Repeat the same workflow with an NFL game and a statistic such as `Passing Yards`, `Rushing Yards`, or `Receiving Yards`.

## Settlement test

After the source game is final and `SportsPlayerGameStats` contains the final stat:

1. Run the existing **Run Smart Sports Sync Now** admin action, or run the Apps Script helper:

```javascript
testSettleSportsPlayerPropsNow()
```

2. Check `CategorySettings`:
   - `Locked = TRUE`
   - `SettlementStatus = settled`
   - `WinnerNomineeId = over` or `under`
   - `WagerResultType = win`

3. Check `CategoryResults` for the settled category.

For an exact line, confirm:

- `WinnerNomineeId = push`
- `WagerResultType = push`
- Bets are refunded by the existing Betting Engine.

## Expected pending behavior

A player prop remains pending when:

- The game is not final.
- The stat row has not been written yet.
- The player did not record that tracked statistic in the available ESPN box score.
- The player/game/stat mapping is incomplete.

Do not manually mark a missing stat as zero until the source feed behavior for that league/stat has been verified.
