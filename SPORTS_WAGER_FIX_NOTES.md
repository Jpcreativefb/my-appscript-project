# Sports Wager Odds / Refresh / Settle Fix

Copy these full files into the same locations in your Awards App Apps Script project:

- `backend/engines/SportsWagerEngine.js`
- `backend/engines/SportsAdminBridgeEngine.js`
- `backend/Api.js`

## What changed

1. `SportsWagerEngine.js` no longer depends only on the old hard-coded Sports Scores Engine URL.
   It now checks Apps Script Properties first:
   - `SPORTS_SCORES_ADMIN_API_URL`
   - `SPORTS_SCORES_ADMIN_API_KEY`
   - fallback key: `SPORTS_ADMIN_API_KEY`

2. Sports wager API calls now include the admin key when that key exists.
   This helps if the Sports Scores Engine requires admin authentication for scores/odds refresh.

3. `Auto Odds` now tries real odds first, then falls back to app record/default odds for regular moneyline/soccer-moneyline wagers.
   This prevents wagers from being stuck forever with:
   - `OddsReady = FALSE`
   - `OddsSource = pending-real-odds`

4. `CategorySettings.OddsReady` sync is more forgiving.
   If it finds an old settings row with the right CategoryId but blank GameId, it fills the GameId and updates that row.
   If no row exists, it creates a minimal settings row and updates OddsReady/OddsSource.

5. Sports Scores API responses are parsed more defensively.
   It accepts `scores`, `games`, `events`, `data`, or a single score object.

6. `SportsAdminBridgeEngine.js` now also falls back to `SPORTS_ADMIN_API_KEY` and uses the same URL helper when available.

## Deploy order

1. Replace the three files in Apps Script.
2. In Awards App Apps Script, open Project Settings -> Script Properties.
3. Confirm these are current:
   - `SPORTS_SCORES_ADMIN_API_URL`
   - `SPORTS_SCORES_ADMIN_API_KEY`
4. Deploy Apps Script as a new Web App version.
5. Open the app as admin.
6. On the wager page press:
   - `Refresh Scores / Records`
   - `Auto Odds`
   - `Settle Final Games`

## Important

If a wager has already accepted bets, Auto Odds still protects that wager unless the backend call is made with `force=true`.
That is intentional so odds do not change after users already made picks.
