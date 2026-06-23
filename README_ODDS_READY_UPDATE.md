# Odds Ready Wiring Update

This patch wires the sports wager odds lifecycle together.

## New/used sheet columns

### Categories
- `BettingOdds` = nominee-level odds shown to users.
- `OddsSource` = source for that nominee's odds.
- `OddsLastUpdated` = timestamp when that nominee row got odds.

### CategorySettings
- `OddsReady` = category-level gate for user selections.
- `OddsSource` = category-level odds source/status.
- `OddsLastUpdated` = category-level timestamp when the category became ready.

## Behavior

- Admin can now choose `Real Odds Only / Pending Until Odds Pull`.
- If real odds are missing, the wager/category is created with blank `Categories.BettingOdds`.
- `CategorySettings.OddsReady` stays `FALSE`.
- The user can see the category, but nominee buttons are disabled and show `Odds pending`.
- When `adminAutoSetSportsWagerOdds` later fills all required `BettingOdds`, it syncs `CategorySettings.OddsReady` to `TRUE`.
- Backend bet saving also rejects pending odds, so users cannot bypass the disabled UI.

## Files changed

- `backend/engines/SportsWagerEngine.js`
- `backend/engines/SettingsEngine.js`
- `backend/engines/BettingEngine.js`
- `frontend/js/pages/betting.js`
- `frontend/css/betting.css`
- `frontend/js/sports.js`
