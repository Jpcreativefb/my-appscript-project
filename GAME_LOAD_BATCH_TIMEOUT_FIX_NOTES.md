# Game Load Batch / Timeout Fix Notes

## Problem fixed
The game page was still trying to load too much data in one blocking request:

- all wager categories
- the user's bet summary
- the full wager leaderboard

That made `getBettingPagePayload` hit the browser/App Script timeout and the frontend fell back to slower legacy calls.

## Production change
The game page now loads in batches:

1. First request loads only the first 12 wager categories and the user's summary.
2. Remaining categories load in 12-category batches after the first page renders.
3. The wager leaderboard loads separately after the game page is already visible.
4. Auto-refresh no longer clears the leaderboard when the lightweight summary refresh returns without leaderboard rows.
5. User bet summary no longer builds every user's bet map. It scans only the current user's latest bets.

## Files changed

- `backend/engines/BettingEngine.js`
- `frontend/js/api.js`
- `frontend/js/pages/betting.js`
- `frontend/sw.js`

## Expected result
The game page should stop sitting on one giant request. The first visible page load should be much faster, and the console should no longer show the legacy fallback warning unless the backend itself is unavailable.

## Deployment note
After copying these files, redeploy both backend and frontend. Then hard refresh the browser or clear site data so the updated service worker cache is used.
