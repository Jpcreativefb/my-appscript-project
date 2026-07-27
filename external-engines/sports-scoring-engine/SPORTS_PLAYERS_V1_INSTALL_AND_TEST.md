# Sports Players Engine v1.0.1.0 — Install and Test

## Included files

- `SportsScoresEngine.gs` — updated API routes, player sheet schema hooks, active racing processing removed, duplicate globals cleaned.
- `SportsOddsEngine.gs` — racing/motorsport mappings and active racing odds paths removed.
- `SportsAdminControls.gs` — player setup/status added to the admin dashboard payload.
- `SportsPlayersEngine.gs` — new player roster and game-stat engine.
- `appsscript.json` — one clean manifest object.

## What v1 supports

- NFL roster synchronization.
- MLB roster synchronization.
- NFL and MLB current/live/final game box-score stat refresh.
- Public read-only API actions:
  - `getSportsPlayers`
  - `getSportsPlayerGameStats`
- Protected admin actions:
  - `setupSportsPlayersAdmin`
  - `syncSportsPlayersAdmin`
  - `refreshSportsPlayerGameStatsAdmin`
  - `getSportsPlayerStatusAdmin`

No automatic player-stat trigger is installed in v1. Player refresh is manual/admin-controlled until the data is verified in production.

## Install

1. Back up the current Apps Script project or commit it to Git.
2. Replace the existing three files with the updated versions in this package.
3. Add `SportsPlayersEngine.gs` as a new Apps Script file.
4. Replace `appsscript.json` only if the project manifest currently contains the duplicated JSON object.
5. Push with `clasp push`, or paste/save the files in Apps Script.
6. Run `setupSportsScoresSheet()` once.
7. Re-deploy the web app because `doGet()` now contains new API actions.

## First test order

Run these functions from the Apps Script editor in this order:

1. `testSportsPlayersStatParser()`
2. `testSetupSportsPlayersSystem()`
3. `testSyncMLBPlayers()`
4. Confirm `SportsPlayers` contains MLB athletes and the headers are correct.
5. `testRefreshMLBCurrentPlayerStats()`
6. Confirm `SportsPlayerGameStats` contains rows such as `home-runs`, `runs-batted-in`, and `pitching-strikeouts`.
7. `testSyncNFLPlayers()`

NFL game-stat refresh may return `gamesFound: 0` during the offseason. That is normal. NFL roster synchronization can still be tested.

## Public API tests

Use the deployed Sports Scores Engine web-app URL:

```text
?action=getSportsPlayers&league=mlb&active=true&limit=25
```

```text
?action=getSportsPlayers&league=nfl&search=mahomes
```

```text
?action=getSportsPlayerGameStats&league=mlb&statType=home-runs&limit=100
```

```text
?action=getSportsPlayerGameStats&gameId=mlb_401816268
```

## Admin API examples

The admin key remains a server-side Script Property. Do not put it in frontend JavaScript.

```text
?action=syncSportsPlayersAdmin&sport=baseball&league=mlb&adminKey=YOUR_SERVER_SIDE_KEY
```

```text
?action=refreshSportsPlayerGameStatsAdmin&sport=baseball&league=mlb&adminKey=YOUR_SERVER_SIDE_KEY
```

For one game:

```text
?action=refreshSportsPlayerGameStatsAdmin&gameId=mlb_401816268&adminKey=YOUR_SERVER_SIDE_KEY
```

## Racing cleanup

The live Sports Scores Engine no longer:

- Normalizes racing events.
- Writes `SportsRacingResults`.
- Resolves NASCAR or Formula One to paid odds keys.
- Refreshes racing odds.

The following safeguards intentionally remain:

- Existing racing rows in `SportsSettings` are disabled and skipped.
- Old racing API actions return a message directing callers to the separate Racing Score Engine.

Historical racing tabs in the spreadsheet are not deleted by setup.

## Security cleanup

A hardcoded admin key found in an old test helper was removed. Because that value existed in source code, rotate the `SPORTS_ADMIN_API_KEY` Script Property before the next deployment.

## Next phase

After MLB roster/stat rows are verified, add the Players section to each Awards App Sports Controls league card. The backend dashboard now returns a `players` status object with player counts and last-updated values.


## v1.0.1 timeout recovery

If v1.0 timed out in `sportsV13EnsureSheetHeaders_`, replace both `SportsScoresEngine.gs` and `SportsPlayersEngine.gs` with the v1.0.1 files. No spreadsheet restore is required because the failed setup did not clear data. Run these functions in order:

1. `setupSportsPlayersSystem()`
2. `testSportsPlayersStatParser()`
3. `testSyncMLBPlayers()`

Run `setupSportsScoresSheet()` only after the three player tests pass. The full setup is now retry-safe and avoids checking the same large sheets multiple times.
