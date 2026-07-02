# Sports Wager CategorySettings Source Fix

This fix treats `CategorySettings` as the source of truth for hand-picked sports wager games.

## Why
The previous refresh flow mainly read existing wager rows from `Categories`. If `Categories` had stale, missing, or wrong rows, the admin refresh had nothing reliable to update. That matches the issue where the Sports page feed updates, but the selected wager games do not update in `Categories` / `CategorySettings`.

## Changed file
- `backend/engines/SportsWagerEngine.js`

## What changed
- Adds a CategorySettings-first backfill step.
- Before refresh/auto-odds/settlement, the backend now scans `CategorySettings` for sports wager rows.
- If a selected wager category exists in `CategorySettings` but has missing `Categories` rows, it rebuilds the nominee rows in `Categories` from the Sports Scores Engine.
- It tries to recover the ESPN event id from the sports wager `CategoryId` when `SportsGameId` / `ESPNEventId` are missing.
- `CategorySettings` now also gets a `SportsMarket` column if missing.
- Admin responses now include a `settingsBackfill` object so you can see whether it found and rebuilt rows.

## Deploy order
1. Replace `backend/engines/SportsWagerEngine.js` in Apps Script.
2. Deploy Apps Script as a new Web App version.
3. Open the app in incognito/private mode.
4. Click `Refresh Scores / Records` on the problem wager game.
5. Check the admin response for `settingsBackfill`.
6. Check `Categories` rows for that Awards game.
7. Click `Auto Odds`.
8. Check `CategorySettings.OddsReady`.

## What to look for
If `settingsBackfill.checkedSettings` is 0, then the selected wager rows are not in `CategorySettings` for that Awards game. That means wager creation itself did not record the selected games into CategorySettings.

If `checkedSettings` is greater than 0 but `createdCategoryRows` is 0, then `Categories` already had rows and refresh should update them.

If `errors` has items, those messages point to the Sports Scores Engine response or ID mismatch.
