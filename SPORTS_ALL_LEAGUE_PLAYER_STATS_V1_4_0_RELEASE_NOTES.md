# Sports All-League Player Stats v1.4.0

## Summary

This release expands the Sports Scores Engine player and team statistics system beyond MLB and NFL. The same player-prop, stat-comparison, live-display, and settlement paths now support:

- MLB
- NFL
- College football
- NBA
- WNBA
- NCAA men’s basketball
- NCAA women’s basketball
- NHL
- Every enabled soccer competition in `SportsSettings`

The implementation remains league-generic. A new ESPN soccer competition can be added as a `SportsSettings` row without adding another parser.

## Player data

`SportsPlayers` and `SportsPlayerGameStats` now include `TeamAbbreviation` and preserve player position when the source provides it. Player selectors can display:

`Player Name · TEAM · POS`

Roster and game-summary parsing now handles the different structures used by football, baseball, basketball, hockey, and soccer.

## Individual stat catalogs

### Football

Passing/rushing/receiving yards and touchdowns, completions, attempts, interceptions, receptions, carries, sacks, tackles, field goals, extra points, and related supported values.

### Baseball

Hits, runs, home runs, RBI, walks, strikeouts, total bases, stolen bases, pitching innings, hits/runs/earned runs allowed, pitcher strikeouts, walks allowed, and saves.

### Basketball

Minutes, points, field goals made/attempted, three-pointers made/attempted, free throws made/attempted, rebounds, assists, steals, blocks, turnovers, fouls, and plus/minus.

### Hockey

Time on ice, goals, assists, points, shots, hits, blocked shots, penalty minutes, faceoffs, saves, goals against, and save percentage.

### Soccer

Minutes, goals, assists, shots, shots on target, saves, fouls, yellow/red cards, offsides, tackles, interceptions, clearances, passes, passes completed, and chances created when supplied by the source.

## Team stat catalogs

Team comparisons now support league-appropriate statistics for football, baseball, basketball, hockey, and soccer. Soccer includes goals, shots, shots on target, possession, passing, corners, fouls, cards, offsides, saves, tackles, interceptions, and clearances.

## Automatic live updates

The normal Sports Scores refresh now reuses each live/final game summary to update:

- `SportsPlayers`
- `SportsPlayerGameStats`
- `SportsTeamGameStats`
- configured live checkpoints

Pregame games are skipped so the engine does not make unnecessary summary calls. Final games receive a final stat refresh even when they do not need another live checkpoint.

## Soccer competition library

Previously configured soccer competitions remain enabled. The setup now also adds a larger competition library, with newly added rows defaulting to **Off** to prevent a single smart-sync run from calling dozens of leagues.

Previously enabled:

- MLS
- Premier League
- La Liga
- Liga MX
- Serie A
- Bundesliga
- Ligue 1
- UEFA Champions League
- UEFA Europa League
- UEFA Nations League
- FIFA World Cup

Available, initially Off when newly added:

- English Championship
- Dutch Eredivisie
- Portuguese Primeira Liga
- Scottish Premiership
- Brazilian Série A
- Argentine Liga Profesional
- NWSL
- Women’s Super League
- UEFA Women’s Champions League
- FIFA Women’s World Cup
- UEFA Conference League
- Concacaf Champions Cup
- CONMEBOL Libertadores
- CONMEBOL Sudamericana
- FIFA Club World Cup
- Club Friendly
- International Friendly

Every enabled competition can sync all teams returned by its team endpoint and all available player roster/stat rows.

## Compatibility

- Existing MLB/NFL questions keep their current IDs and settlement behavior.
- Existing Player Matchup questions remain supported.
- Advanced Stat Comparison remains the preferred admin creation workflow.
- Missing source statistics are left unavailable; the engine does not invent values.
