# Stability Fix Notes

This build is focused on the issues reported on July 1, 2026:

- Login sometimes stalls.
- Games are not recording reliably.
- Wagers are not recording reliably.
- New users are not being made reliably.

## What changed

### 1. Apps Script API now supports JSONP

File changed:

- `backend/Api.js`

The Cloudflare frontend was using browser `fetch()` directly against the Apps Script web app URL. That can fail or hang because Apps Script web apps commonly redirect and do not behave like a normal CORS API from a static frontend.

The backend `json()` helper now supports a safe `callback` / `jsonp` query parameter. Normal JSON responses still work, but the frontend can now call Apps Script through a script tag when needed.

### 2. Frontend API uses JSONP for Apps Script and has timeouts

Files changed:

- `frontend/js/api.js`
- `frontend/api.js`

When `API_BASE` points to `script.google.com/macros/`, frontend reads now use JSONP instead of direct `fetch()`. API calls also return a clear timeout message instead of spinning forever.

This should directly improve login, signup, game saves, and wager saves because those actions use the shared `api()` function.

### 3. Login remembers the device correctly

File changed:

- `frontend/js/auth.js`

The login form now passes the Remember this device checkbox to the backend login call and stores the session through `setSession()` when available.

### 4. Backend session validation no longer depends only on 6-hour cache

Files changed:

- `backend/engines/AppDataEngine.js`
- `backend/admin/AdminTools.js`

The previous app-data/admin session checks only trusted `CacheService`. Apps Script script cache is temporary, so a user could have a valid stored session token but still get kicked out or fail admin actions once cache expired.

These checks now validate the session token against the Users sheet session fields through `getUsernameFromSessionToken_()`.

### 5. Admin-created users now use the real user creation flow

File changed:

- `backend/admin/AdminTools.js`

`apiAdminCreateUser()` now calls `createUser()` instead of manually appending a partial row. That keeps admin-created users aligned with signup-created users and fills the user/session/contact columns correctly.

### 6. Game sheet headers are repaired before game saves

File changed:

- `backend/admin/AdminGames.js`

`adminEnsureGameOptionalHeaders_()` now makes sure the Games sheet has the full set of columns used by the current app, not just two wager columns. Missing game fields can make a game appear saved while important settings are blank.

### 7. PWA cache was bumped

File changed:

- `frontend/sw.js`

The service worker cache name was bumped to force the browser/PWA to refresh old cached files. A missing cached file entry was also removed.

## Deploy order

1. Push or paste the updated `backend` files into Apps Script.
2. Deploy Apps Script as a new Web App version.
3. Confirm `frontend/js/api.js` still points to the new/current Apps Script deployment URL if the deployment URL changed.
4. Deploy the updated `frontend` folder to Cloudflare Pages.
5. Open the app in a private/incognito window first.
6. On phones/PWA installs, close the app completely and reopen. If old behavior remains, remove/reinstall the PWA or clear site data for the Cloudflare Pages URL.

## Important setup checks after deploy

Run or confirm these in Apps Script/admin tools as needed:

- League access setup is installed if leagues are enabled.
- Betting sheets exist if wagers are enabled.
- Games sheet has the full header row from this build.
- The game is active and has the needed flags turned on:
  - `Active = TRUE`
  - `PredictionEnabled = TRUE` for picks
  - `WagerEnabled = TRUE` for wagers
  - `LockAllPicks = FALSE` when users should be allowed to pick/wager
- Wager categories must have odds/settings ready, otherwise the backend can correctly block the wager.

## Validation performed

All JavaScript files under `backend` and `frontend` passed `node --check` syntax validation after these changes.

Live sheet-write testing was not performed because that requires your Apps Script deployment/account and app admin credentials.
