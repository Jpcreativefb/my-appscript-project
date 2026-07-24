# Hybrid Game Foundation v1

## Purpose

This release adds the first production foundation for a centralized hybrid game system while preserving the existing prediction, confidence, sports wager, ranking, sports-score, and racing systems.

## Added in this release

### Game-level structure

- Standard or hybrid game format.
- Standalone, parent-season, or mini-game role.
- Parent/child game linking.
- Child contribution controls:
  - Add points.
  - Weighted points.
  - Placement points.
  - Best-N mini games.
- Prediction leaderboard modes:
  - Combined net score.
  - Fixed-points only.
  - Staked-points balance.
  - Separate fixed and staked displays.
- Parent wager leaderboard rollup that counts the parent starting bankroll once and child net profit/loss only.

### Question-level scoring

- `fixed-points`
- `confidence-points`
- `staked-points`
- `wager`
- `ranking`

Existing blank/legacy question rows remain backward compatible.

### Staked predictions

- Game starting points balance.
- Minimum and maximum stake.
- Stake increments.
- Win and loss multipliers.
- Pending stakes reserve available points immediately.
- Users cannot reuse reserved points on another question.
- Correct answer adds the configured win amount.
- Incorrect answer subtracts the configured loss amount.
- Push/cancelled outcome returns the stake with no gain or loss.
- No negative displayed points balance.
- Stake values are stored in the dedicated `Picks.StakePoints` column.

### Centralized result-source metadata

Questions can now store normalized result-source information for future adapters:

- Manual/admin review.
- Sports score or player-stat provider.
- Awards result provider.
- Reality-TV result provider.
- Prediction-market provider.
- Imported/API result.

Added metadata includes source type/provider, external event/market/subject IDs, stat key, comparison operator, threshold, auto-settle flag, admin-review flag, source URL, and source configuration JSON.

### Admin controls

Manage Games now includes controls for:

- Game format and role.
- Parent game and contribution method.
- Fixed and staked prediction switches.
- Starting points and stake rules.
- Leaderboard calculation mode.
- Placement scoring table.

Category setup now includes:

- Question scoring mode.
- Per-question stake overrides.
- Result source and provider metadata.
- External IDs and stat/comparison settings.
- Automatic settlement/admin-review settings.

### Player and leaderboard UI

- Staked-points balance and available-points summary.
- Mobile-friendly stake controls and presets.
- Validation when the player lacks the minimum available stake.
- Fixed/staked combined or separate leaderboard displays.
- Parent/mini-game contribution rollups.

## Spreadsheet changes

The migration is additive. Existing columns and data are preserved.

### Games additions

`GameRole`, `ParentGameId`, `IncludeInParent`, `ParentContributionMode`, `ParentContributionWeight`, `ParentBestCount`, `PlacementPointsJSON`, `LeaderboardScoreMode`, `FixedPointsEnabled`, `StakedPointsEnabled`, `StartingPoints`, `MinStake`, `MaxStake`, `StakeIncrement`, `StakeWinMultiplier`, `StakeLossMultiplier`.

The existing `ScoringMode` column stores `standard` or `hybrid` for compatibility.

### CategorySettings additions

`ScoreMode`, `MinStake`, `MaxStake`, `StakeIncrement`, `StakeWinMultiplier`, `StakeLossMultiplier`, `ResultSourceType`, `ResultProvider`, `ExternalEventId`, `ExternalMarketId`, `ExternalSubjectId`, `StatKey`, `ComparisonOperator`, `Threshold`, `AutoSettle`, `RequireAdminReview`, `SourceUrl`, `SourceConfigJSON`.

### Picks addition

`StakePoints`.

## Automated checks completed

- JavaScript syntax check for all backend, frontend, sports-engine, and racing-engine JavaScript files.
- Mixed fixed/confidence/staked scoring behavior.
- Stake win/loss/push/pending accounting.
- Stake reservation and available-balance enforcement.
- Disabled scoring-mode protection.
- Parent add, weighted, placement, and best-N rollups.
- Parent wager bankroll rollup without duplicate starting balances.
- Additive sheet migration and CategoryResults row-1 repair.
- No new duplicate backend function names were introduced.

## Deliberately not included yet

This is the centralized game and scoring foundation. It does **not** yet add live ESPN player-stat ingestion, awards-page adapters, reality-TV adapters, or prediction-market API adapters. Those providers can now be added without redesigning the Games, Categories, Picks, settlement, or leaderboard systems.
