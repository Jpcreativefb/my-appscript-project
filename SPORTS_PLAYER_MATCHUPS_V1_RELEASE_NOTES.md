# Sports Player Matchups v1.1.0

## Added

- Admin **Create Player Matchup** button on MLB and NFL score cards.
- Two to twelve players from the same source game.
- One shared statistic per matchup.
- Two question modes:
  - **Wager**: user selections write to `Bets`; per-player decimal odds are supported.
  - **Prediction**: user selections write to `Picks`; category points are supported.
- Automatic settlement from `SportsPlayerGameStats`.
- Highest statistic wins.
- Exact ties settle as `push`:
  - wagers refund;
  - predictions have no winning nominee and award no correct-pick points.
- Player matchup readiness diagnostic:
  - `testLatestSportsPlayerMatchupReadiness()`
- Permanent creation, settlement, API, UI, and regression tests.

## Existing behavior preserved

- Over/Under player props remain unchanged.
- Team moneyline, spread, total, and soccer wager settlement skip both player markets.
- Existing single-row `Bets` upsert behavior remains active.
- The Sports Scores Engine remains the source of rosters and player game statistics.

## v1 limits

- MLB and NFL only.
- All selected players must belong to the same source game.
- One shared statistic per matchup.
- Maximum 12 selected players.
- If any selected player is missing a completed numeric stat row, settlement remains pending for admin review rather than guessing.
