# Sports Wager Timeout Fix

This is a fixes-only package. Copy these whole files over the matching files in your project.

## Files included

- `backend/engines/SportsWagerEngine.js`
- `backend/engines/SportsAdminBridgeEngine.js`
- `backend/Api.js`
- `frontend/js/api.js`
- `frontend/api.js`
- `frontend/js/pages/betting.js`

## What this fixes

### 1. Refresh Scores / Records browser timeout

The frontend timeout was 18 seconds. The message:

`Connection timed out. Please try again.`

came from the frontend, not the backend.

The sports admin actions now get a 90-second timeout:

- `adminRefreshSportsWagerScores`
- `adminAutoSetSportsWagerOdds`
- `adminSettleSportsWagers`
- `adminRunSportsOddsHybridRefresh`
- `adminRefreshSportsOddsLeague`

Normal app calls still use the shorter timeout.

### 2. Faster score/record refresh

`refreshSportsWagerScores()` now writes score/record/status/logo columns in batches instead of using many single-cell writes.

### 3. Faster auto odds

`autoSetSportsWagerOdds()` now writes updated odds columns in batches and reads the Bets sheet once instead of repeatedly scanning it for every category.

### 4. Settle Final Games avoids doing a full refresh first

The admin settle path now defaults to `skipRefresh = true`. This keeps the Settle Final Games button from re-running the slow Refresh Scores / Records job before settlement starts.

## Deploy order

1. Copy backend files into Apps Script.
2. Deploy Apps Script as a new Web App version.
3. Copy frontend files into your frontend project.
4. Deploy frontend to Cloudflare Pages.
5. Open the app in incognito or clear the PWA/app cache on the phone.

## Test order

1. Open Wager page as admin.
2. Press `Refresh Scores / Records`.
3. Press `Auto Odds`.
4. Check if the Categories sheet has `BettingOdds` and CategorySettings has `OddsReady = TRUE`.
5. Try making a pick.
6. Press `Settle Final Games` for completed games.

If Refresh still times out after this, the Sports Scores Engine itself is likely hanging or using an old deployment URL. Check the Awards App Script Properties:

- `SPORTS_SCORES_ADMIN_API_URL`
- `SPORTS_SCORES_ADMIN_API_KEY`
- optional fallback: `SPORTS_ADMIN_API_KEY`
