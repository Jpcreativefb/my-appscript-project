# Sports Live Comparisons v1.3.1

## Fixed

- Create Stat Comparison search now accepts multiple entries separated by commas, semicolons, pipes, or new lines.
- Multi-name search uses **match any** behavior. Example: `Cubs, White Sox` shows both teams instead of treating the full text as one phrase.
- The division/conference selector is no longer hard-coded to MLB.
- Player choices now show player name, team abbreviation, and position when available.
- Group selection clears stale selections, switches to Teams Only, clears the search, and selects every loaded team in the chosen group.
- Selection count now shows both visible and selected totals.

## League-aware grouping

- MLB: division
- NFL: division
- NHL: division
- NBA: conference
- NCAA football, men's basketball, and women's basketball: conference, using `SportsCollegeTeams.ConferenceName`

If college conference data is unavailable, the selector is hidden rather than showing an incorrect MLB control.

## Expanded team comparisons

Team-level Create Stat Comparison is now enabled for:

- MLB
- NFL
- NHL
- NBA
- NCAA football
- NCAA men's basketball
- NCAA women's basketball

Player-level entities remain enabled for MLB and NFL, where the player feed has been validated. Other leagues display Teams Only.

## Sports Scores Engine additions

`SportsScores` now also supports:

- `HomeAbbreviation`
- `AwayAbbreviation`
- `HomeConferenceName`
- `AwayConferenceName`

College abbreviation and conference values are read from `SportsCollegeTeams` by ESPN team ID.

## Additional team statistics

- NHL: goals, shots on goal, power-play goals/opportunities, penalty minutes, blocked shots, hits, faceoff wins
- Basketball: points, field goals made, three-pointers made, free throws made, rebounds, offensive/defensive rebounds, assists, steals, blocks, turnovers, fouls
- College football uses the existing football team-stat set.

## Cache versions

- Service worker: `awards-app-v220-sports-comparison-filters`
- Sports page: `sports.js?v=220-sports-comparison-filters`
