# Sports Scores Engine Production Review - 2026-07-20

## Scope

Reviewed and patched the external Sports Scores Engine files from the latest uploaded project ZIP. The goal was production readiness for live games, correct schedule building, college coverage, SportsGames population, OddsApiLog population, and cleanup of old racing overlap.

## Production fixes applied

- Removed earlier duplicate function bodies inside the Sports Scores Engine, Admin Controls, and Odds Engine files; the final override implementations are retained.
- Added missing external Sports Scores Engine routes for `installSportsScoresWindowTriggerAdmin` and `removeSportsScoresWindowTriggerAdmin`.
- Added score-window trigger helpers: `installSportsScoresWindowTrigger`, `removeSportsScoresWindowTriggers`, and `checkSportsScoresWindowTriggers`.
- Dashboard now returns `scoreWindowTriggers` so the Sports Controls UI can show trigger state correctly.
- `setupSportsScoresSheet()` now guarantees current headers for `SportsGames`, `SportsScores`, `SportsSettings`, `SportsSeasonJobs`, `SportsCollegeTeams`, and archive sheets.
- `SportsGames` is populated whenever `SportsScores` is upserted.
- `OddsApiLog` and `SportsOddsApiLog` are both created and written by Odds API calls.
- Default season job `BatchDays` is now 14 unless a league-specific value is supplied.
- Racing rows in the Sports Scores Engine `SportsSettings` sheet are disabled on setup; racing belongs to `external-engines/racing-score-engine`.
- Normal odds setup no longer creates racing odds sheets from the Sports Scores Engine.

## ESPN coverage notes

- Football-style schedule building uses season year, season type, and week where supported.
- College coverage supports broad group-based pulls and selected team IDs.
- Manual dates remain as fallback for sports/leagues where ESPN season-type behavior is inconsistent.

## Install order

1. Copy the changed files into VS Code.
2. Commit and push to `architecture-cleanup`.
3. Update the external Sports Scores Engine Apps Script project with the changed files under `external-engines/sports-scoring-engine/src/`.
4. In that Apps Script project, run `setupSportsScoresSheet()`.
5. Run `setupAllSportsOddsSheets()`.
6. Use Admin → Sports Controls → Reload Sports Controls.
7. For NFL, build schedule with ESPN + Dates and BatchDays 14.
8. For college football/basketball, set College Coverage to All D1/FBS or Selected Schools before building schedules.

## Testing performed locally

- JavaScript syntax checks with `node --check` on updated Sports Scores Engine, Admin Controls, Odds Engine, Sports Admin Bridge, Sports Wager Engine, frontend admin page, and frontend API files.
- Static route audit confirmed bridge actions now have matching external Sports Scores Engine `doGet` routes.
- Duplicate function audit confirms earlier duplicate definitions have been removed or final production overrides intentionally remain as the active final definitions.

## Important runtime test still required

Apps Script runtime calls to ESPN, SpreadsheetApp, UrlFetchApp, LockService, and ScriptApp cannot be executed inside this local sandbox. Final live validation must be done from the Google Apps Script project after deployment.
