# Sports League Controls Stage 2 Condensed — Season Windows + Per-League Odds/Schedule

## Purpose
This patch condenses Sports Engine Controls so admins do not need separate global Schedule/Season Loader and Odds Controls sections. Schedule, season windows, scores, odds, limits, and archive preview are managed inside each collapsible league card.

## Key decisions
- A year is not enough to define a season.
- Each league can use an overall season window plus optional preseason, regular season, postseason, tournament, and bowl windows.
- Smart automation skips a league when SeasonActive is off, Scores/Odds are off, the league is outside its configured windows, or cooldown/usage limits have not been met.
- Odds limits stay per league: OddsCooldownMinutes, OddsDailyMaxPulls, OddsMonthlyMaxPulls.
- Global “Run Hybrid Odds Refresh Now” is removed from the visible admin workflow. Odds refresh is driven by the per-league card and Smart Sports Sync.
- Global Schedule/Season Loader is removed from the visible admin workflow. Schedule/season refresh belongs in each league card.
- Archive remains preview-only. This patch does not delete, move, or archive rows.

## Admin workflow
1. Admin → Sports Engine Controls.
2. Open Sports Controls.
3. Open the league card you want, such as MLB 2026.
4. Set Season ON/OFF, Scores ON/OFF, Odds ON/OFF, poll minutes, odds limits, and archive preview retention.
5. Use End Season to shut that league down cleanly.
6. Use Run Smart Sports Sync Now for an immediate sync.
7. Use Install Smart Sports Automation once for recurring smart checks.

## Season windows
New/expanded SportsSettings columns supported by this patch:
- SeasonActive
- Season
- SeasonStartDate / SeasonEndDate
- PreseasonStartDate / PreseasonEndDate
- RegularSeasonStartDate / RegularSeasonEndDate
- PostseasonStartDate / PostseasonEndDate
- TournamentStartDate / TournamentEndDate
- BowlStartDate / BowlEndDate

If optional phase windows are blank, the overall season window controls the league. If all windows are blank, the league remains open for backward compatibility.

## Safety checks before source pulls
Before scores or odds refreshes, Smart Sports Automation should check:
- League enabled
- SeasonActive is true
- Current date is inside at least one season window, or no windows are configured
- There are Awards App wagers or scheduled games for that league
- League is due by Pregame/Live/Final poll minutes
- OddsEnabled is true before odds calls
- Odds cooldown has passed
- Daily/monthly odds limits are not exceeded
- LockService prevents overlapping runs

## Mobile admin cleanup
League cards are collapsible and compact. The previously separate Odds Controls and Schedule/Season Loader sections are hidden from the main dashboard to avoid duplicate/confusing buttons.

## Testing
1. Open Sports Controls and confirm league cards render.
2. Confirm global Schedule/Season Loader and global Odds Controls no longer show in the main dashboard.
3. Open one league card and save settings; the card should stay open.
4. Turn Season OFF and confirm Scores/Odds/Snapshots can be shut down for the league.
5. Confirm monthly odds usage remains visible in the top Sports Automation & Usage card and per-league odds usage appears in each league summary.
6. Run Smart Sports Sync Now and confirm it skips inactive/out-of-window leagues.

## Files changed
- external-engines/sports-scoring-engine/src/SportsScoresEngine.js
- external-engines/sports-scoring-engine/src/SportsAdminControls.js
- backend/Api.js
- backend/engines/SportsAdminBridgeEngine.js
- backend/engines/SportsWagerEngine.js
- frontend/js/api.js
- frontend/api.js
- frontend/js/pages/admin.js
