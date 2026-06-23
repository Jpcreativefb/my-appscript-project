# Performance Speedup Update

This build includes safe frontend and backend changes to reduce app load time.

## Main changes

1. **Picks startup payload is now lighter**
   - `backend/engines/AppDataEngine.js`
   - `apiGetStartupPayload()` now returns only the game, categories, and the logged-in user's picks.
   - Removed heavy duplicate payload pieces: category settings, leaderboard, profile, and profile history.

2. **Dashboard game cards are now lightweight**
   - `backend/engines/AppDataEngine.js`
   - Dashboard no longer builds full leaderboard rows/previews for every game card.
   - Full leaderboard data now loads only when the leaderboard page is opened.

3. **Added a lightweight leaderboard endpoint**
   - `backend/Api.js`
   - New `action=leaderboard` route returns only leaderboard rows.
   - `frontend/js/pages/leaderboard.js` now uses `apiGetLeaderboard()` instead of the heavier live leaderboard endpoint.

4. **Repository sheet reads now use the existing cache system**
   - `backend/repositories/CategoriesRepo.js`
   - `backend/repositories/SettingsRepo.js`
   - `backend/repositories/PicksRepo.js`
   - These now use `getSheetDataCached()` when available.

5. **Added fast per-execution cache**
   - `backend/services/AppCache.js`
   - Prevents the same API call from re-reading/re-parsing the same sheet multiple times.

6. **Wager page now has a one-call payload endpoint**
   - `backend/engines/BettingEngine.js`
   - `backend/Api.js`
   - `frontend/js/api.js`
   - `frontend/js/pages/betting.js`
   - Replaces three separate wager-page startup calls with one `getBettingPagePayload` call.

7. **Wager auto-refresh is less destructive**
   - `frontend/js/pages/betting.js`
   - Auto-refresh now updates the summary and leaderboard blocks instead of redrawing the entire page.

8. **Duplicate profile loading reduced**
   - `frontend/js/pages/profile.js`
   - `loadActiveProfile()` now reuses the already-loaded profile for the same username.

9. **Hero image thumbnails reduced**
   - `backend/engines/GamesEngine.js`
   - `frontend/js/pages/adminGames.js`
   - Google Drive image size changed from `w1600` to `w800`.

## Validation

The changed JavaScript files were syntax-checked with `node --check`.

## Deployment reminder

After copying these files into Apps Script / VS Code:

1. Push backend changes with clasp or paste the updated `.js` files into Apps Script.
2. Deploy a new Apps Script web app version.
3. Upload/publish the frontend changes to Cloudflare Pages.
4. Use the app normally and test:
   - Dashboard load
   - Opening a Picks game
   - Opening Leaderboard
   - Opening Wager page
   - Saving a wager

## Hotfix: getBettingPagePayload fallback

If the frontend is deployed before the Apps Script backend is redeployed, the wager page may receive `Unknown action: getBettingPagePayload` from the older backend. The frontend now detects that case and automatically falls back to the previous three-call flow:

- `getBettingOptions`
- `getMyBets`
- `bettingLeaderboard`

This keeps the game page opening even when the optimized backend endpoint has not reached production yet. The combined backend endpoint should still be deployed for best performance.

## v3 fix: safe cache writes

Google Apps Script `CacheService.put()` has a per-item size limit. Some large sheets or category payloads can exceed that limit and throw `Argument too large: value`. v3 keeps the per-execution runtime cache, but skips cross-execution ScriptCache writes when the payload is too large. This prevents game pages from crashing while preserving the main speed gain inside each API request.
