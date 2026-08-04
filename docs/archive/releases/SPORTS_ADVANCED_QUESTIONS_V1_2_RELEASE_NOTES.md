# Sports Advanced Questions v1.2

## Added

- Players and teams can be selected from one or multiple loaded MLB/NFL games.
- Question modes:
  - Wager → `Bets`
  - Prediction → `Picks`
- Question types:
  - Highest total across 2-12 players/teams
  - Yes/No threshold for one player/team
- Entity combinations:
  - Player vs player
  - Player vs team when the statistic is supported by both
  - Team vs team
  - Cross-game comparisons within the same league
- Final or checkpoint sources:
  - MLB end-of-inning checkpoints
  - NFL quarter/halftime checkpoints
  - NFL first-half two-minute checkpoint
- Team game statistics from the separate Sports Scores Engine.
- Team/checkpoint status and refresh controls inside Sports Controls.
- Smart Sports Sync settlement integration.

## Examples

- Will a selected hitter record at least one hit by the end of the 3rd inning?
- Will a player record more hits than a selected team by the end of the 7th inning?
- Which player from several different games will record the most home runs?
- Which NFL team will record more touchdowns by the first-half two-minute checkpoint?

## Checkpoint safety

ESPN summary statistics are cumulative. The system saves the first poll observed at or after a checkpoint.

- `EXACT_BOUNDARY` can settle automatically.
- `POLL_SNAPSHOT` is stored but marked for admin review by default.

MLB inning and NFL quarter transitions are intentionally classified as `POLL_SNAPSHOT` because a poll in the next period may already include new plays. Final-game questions settle automatically.

## Supported leagues

- MLB
- NFL

All entities in a single question must belong to the same league and use one shared statistic.
