# Sports Advanced Stats Engine v1.1 — Install and Test

Replace:

- `SportsScoresEngine.gs`
- `SportsAdminControls.gs`

Add:

- `SportsAdvancedStatsEngine.gs`

Run:

1. `setupSportsAdvancedStatsSystem()`
2. `testRefreshMLBAdvancedStats()`
3. `testRefreshNFLAdvancedStats()`
4. `testGetSportsAdvancedStatsStatus()`

Confirm:

- `SportsTeamGameStats` contains MLB/NFL team rows.
- `SportsStatCheckpoints` is created.
- The normal score trigger remains installed so checkpoint capture can occur as games cross boundaries.

Then deploy a new Sports Scores Engine web-app version.
