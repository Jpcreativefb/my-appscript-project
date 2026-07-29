# Sports Stat Comparison v1.5.0

## Summary

This update makes Create Stat Comparison a standalone admin section on the Sports page. An admin no longer needs to select a game card first.

## New standalone scope controls

- Choose any enabled supported league.
- Load games by Date Range for every league.
- Load games by Season Year, Season Phase, and Week for NFL and college football.
- The builder loads the full chosen scope independently from the Sports page Team filter.
- Existing per-game Create Stat Comparison buttons remain available as shortcuts.

## Search fixes

The Sports page Team field and the Create Stat Comparison Search field now accept multiple values separated by commas, semicolons, pipes, or new lines.

Examples:

- `Cubs, White Sox`
- `CHC, CWS`
- `Bears | Packers`

Matching uses OR behavior, so any entered team/player can be shown. The Sports page includes a frontend fallback and the Sports Scores Engine API now also supports multi-team filtering.

## Player display and position filters

Player labels now display:

`Player Name · Position · Team Abbreviation`

The comparison modal provides multi-select position chips and league-aware shortcuts:

- NFL / college football: OFF, DEF, WR/TE/RB, Special
- MLB: Pitchers, Infield, Outfield, Hitters
- Basketball: Guards, Wings, Forwards, Centers
- NHL: Forwards, Defense, Goalies
- Soccer: Goalkeepers, Defenders, Midfielders, Forwards

Individual available positions can be combined, such as QB + WR, SP + C, or WR + TE + RB.

## Sports Scores API filters

`getSportsScores` now supports:

- Multiple team names or abbreviations in `team`
- `seasonYear`
- `seasonType`
- `seasonPhase`
- `week`

## Cache version

- Sports page script: `v=250-standalone-stat-comparison`
- Service worker: `awards-app-v250-standalone-stat-comparison`

## Validation

- JavaScript syntax checks pass.
- All 15 repository test suites pass.
- Added direct regression coverage for standalone scope loading, multiple-team OR search, week filtering, player label order, and position presets.
