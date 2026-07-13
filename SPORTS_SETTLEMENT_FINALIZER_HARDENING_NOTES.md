# Sports Settlement Finalizer Hardening Fix

## Problem fixed

Finished sports wager games could show Final/locked in the UI, but still not finish settlement in the Awards App sheets:

- `CategorySettings.WinnerNomineeId` stayed blank
- `CategorySettings.Locked` stayed FALSE
- `CategorySettings.SettlementStatus` stayed pending
- `CategoryResults` stayed blank

This happened even though game creation worked and the game page could recognize the match was final.

## What changed

### 1. CategorySettings write is now hardened

`updateSportsWagerSettingWinner_()` now:

- writes `WinnerNomineeId`
- writes `WagerResultType`
- writes `Locked = TRUE`
- writes `SettlementStatus = settled`
- writes `ResultSource = sports-engine`
- updates all matching rows
- creates a missing `CategorySettings` row if no row exists for that sports `CategoryId`

### 2. CategoryResults now has a direct fallback writer

Sports settlement now writes to `CategoryResults` even if `CategoryResultsEngine.js` is not loaded in the live Apps Script deployment.

The preferred writer is still `upsertCategoryResult_()` when available. If that function is missing or errors, the sports engine writes directly to the `CategoryResults` sheet.

### 3. Smart automation now runs a no-ESPN finalizer pass

`runSportsWagerSmartAutomation()` now runs a lightweight finalizer pass before and after the external score/odds sync.

This pass reads the Awards App `Categories` sheet only. It does not call ESPN. If a game is already marked final in `Categories`, it finalizes `CategorySettings` and `CategoryResults` immediately.

### 4. Manual full sync status is clearer

The admin message now reports:

- score rows updated
- odds rows updated
- settled from engine
- finalized from Categories
- skipped settlements

## Files changed

- `backend/engines/SportsWagerEngine.js`
- `backend/Api.js`
- `frontend/js/pages/admin.js`

Included for safety:

- `backend/engines/CategoryResultsEngine.js`

## Deploy steps

1. Copy the changed files into the project.
2. Redeploy the Awards App backend Apps Script.
3. Publish the frontend.
4. In the app, go to Admin → Sports Engine Controls.
5. Click `Run Smart Sports Sync Now`.
6. Confirm the message shows `finalized from Categories`.
7. Check:
   - `CategorySettings.WinnerNomineeId`
   - `CategorySettings.Locked`
   - `CategorySettings.SettlementStatus`
   - `CategoryResults`

## Test function

You can also run this directly in the Awards App backend Apps Script:

```js
function testFinalizeAllSportsWagerResultsFromCategoriesNow()
```

This does not call ESPN. It only finalizes sports wager categories that already show final score/status in the Awards App `Categories` sheet.
