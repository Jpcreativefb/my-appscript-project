# Sports Wager Hand-Picked Game Sync Fix

Copy these files into the same paths in your project / Apps Script project:

- `backend/engines/SportsWagerEngine.js`
- `backend/engines/SportsAdminBridgeEngine.js`
- `backend/Api.js`
- `frontend/js/api.js`
- `frontend/api.js`
- `frontend/js/pages/betting.js`

## What this fixes

The Sports page can update correctly while selected wager rows in `Categories` / `CategorySettings` stay stale. That happens when the hand-picked wager rows have missing or stale `SportsGameId` / `ESPNEventId` values.

This fix changes the wager refresh path so it repairs the selected wager rows using this order:

1. Current `Categories` row IDs.
2. Matching `CategorySettings` row IDs.
3. The ESPN event id embedded at the end of the generated sports wager `CategoryId`.

That means `Refresh Scores / Records`, `Auto Odds`, and `Settle Final Games` can find the right event again instead of skipping the row or updating with the wrong teams.

## Important deploy steps

1. Copy the backend files into Apps Script.
2. Deploy Apps Script as a new Web App version.
3. Copy the frontend files into your Cloudflare project.
4. Deploy Cloudflare Pages.
5. Hard refresh the app or open it in an incognito/private window.

## Test order

1. Open the wager game page that contains the hand-picked wager categories.
2. Click `Refresh Scores / Records`.
3. Check `Categories`:
   - `HomeTeam`
   - `AwayTeam`
   - `HomeRecord`
   - `AwayRecord`
   - `HomeScore`
   - `AwayScore`
   - `SportsStatus`
   - `SportsGameId`
   - `ESPNEventId`
4. Click `Auto Odds`.
5. Check `Categories.BettingOdds` and `CategorySettings.OddsReady`.
6. Try making a wager pick.
7. For completed games, click `Settle Final Games`.

## What to look for in the admin button response

`Refresh Scores / Records` now returns extra fields:

- `repairedIds`: number of category rows where missing/stale event IDs were repaired.
- `settingsSynced`: number of CategorySettings rows repaired/synced.

If `updated` is 0 and `repairedIds` is 0, the wager page is probably using the wrong Awards `GameId`, or the rows are missing both a usable ESPNEventId and a generated sports wager CategoryId.
