# Production Smoke Test v1.1.0

## Player

- Log in and confirm the loader shows a gold bar and percentage without admin loading text.
- Open Dashboard, Picks, Leaderboard, Profile, and return to Picks.
- Confirm the first route visit loads correctly and repeated visits are faster.
- Save a fixed-point pick and confirm the saved choice updates without a full page reload.
- Change an allowed pick and confirm change counts remain correct.
- Test confidence and staked questions if enabled.
- Open a Reality TV game and verify overall stats, compact leaderboard, Season Survivor Pick, episode sections, images, bios, groups, and eliminated overlays.

## Admin

- Confirm admin page loading shows the current loading step.
- Open Manage Games, Game Setup, Reality TV Manager, Sports Controls, Archive, and Profile tools.
- Confirm collapsible sections, help `?` buttons, and save/build progress states.
- In Reality TV Manager, confirm season summaries load first.
- Expand one season and confirm only that season loads full details.
- Save one harmless setting and verify progress changes from gold to success.
- Save a deliberately invalid value in a test item and verify a visible error state.

## Data integrity

- Confirm existing picks, CategoryResults, balances, and leaderboards did not change during deployment.
- Confirm a pick update changes one existing row rather than creating duplicates.
- Confirm a new pick creates one row.
- Run storage health and archive health checks.

## External Results Hub

- Confirm the Hub connection status appears.
- Do not enable automatic provider settlement.
- Run one manual result through pending review, approval, and CategoryResults.

## Monitoring

- Review Apps Script Executions for `getStartupPayload`, `savePick`, `adminGetRealityTvDashboardSummary`, and `adminGetRealityTvSeasonDetails`.
- Record execution duration and failures before enabling more users.
