# Sports Players Engine v1.0.1

## Retry-safe spreadsheet patch

- Replaced the shared player-sheet setup dependency with an independent retry-safe helper.
- Removed `getLastRow()` from header detection.
- Added five-attempt retry handling for transient Google Sheets service timeouts.
- Made formatting non-fatal and batched text-column formatting with `RangeList`.
- Added retries around player sheet reads, updates, and appends.
- Optimized `setupSportsScoresSheet()` so each core sheet is upgraded only once per run.
- Removed the duplicate `upgradeSportsControlsV12()` pass from full setup.

# Sports Players Engine v1.0 Changelog

## Added

- `SportsPlayers` schema and setup.
- `SportsPlayerGameStats` schema and setup.
- ESPN team roster synchronization with batched roster requests.
- ESPN game-summary player stat normalization.
- NFL settlement-oriented stat names such as `passing-yards`, `rushing-yards`, and `receiving-yards`.
- MLB settlement-oriented stat names such as `home-runs`, `runs-batted-in`, and `pitching-strikeouts`.
- Incremental row upserts rather than clearing/rebuilding the player-stat sheet.
- Player status information in `getSportsAdminDashboard`.
- Public read-only player APIs and protected admin refresh APIs.

## Cleaned

- Removed active racing normalization and racing-results writes from Sports Scores Engine.
- Removed racing/motorsport odds mappings and refresh paths from Sports Odds Engine.
- Kept only the legacy racing rejection/disable safeguards.
- Removed obsolete duplicate global function definitions.
- Removed a hardcoded admin key from a test helper.
- Corrected the duplicated manifest JSON by providing one valid `appsscript.json` object.

## Intentionally deferred

- Awards App player-prop question creation and settlement.
- Automatic player-stat triggers.
- NBA, WNBA, NHL, college, soccer, and UFC player synchronization.
- Player-stat archive/retention controls.
