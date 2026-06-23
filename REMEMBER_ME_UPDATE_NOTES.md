# Remember Me / Stay Signed In Update

This update adds a checked-by-default **Keep me signed in on this device** option to the login screen.

## What changed

### Frontend
- `frontend/index.html` adds the checkbox and loads `state.js` on the login page.
- `frontend/js/auth.js` passes `rememberMe` to login and auto-opens `app.html` when a saved session is still valid.
- `frontend/js/api.js` adds `apiValidateSession()`.
- `frontend/js/state.js` supports backend `expiresAt` session expiration.
- `frontend/js/app.js` validates saved sessions against the backend before opening the app.
- `frontend/js/config.js` changes frontend session TTL from 7 days to 30 days.
- `frontend/css/styles.css` styles the checkbox row.

### Backend
- `backend/AuthEngine.js` stores remembered tokens with a 30-day expiration and validates them from the Users sheet.
- `backend/Api.js` adds the `validateSession` action.
- `backend/repositories/UsersRepo.js` auto-adds `SessionToken` and `SessionExpiresAt` columns.
- `backend/engines/UsersEngine.js` maps those new columns.

## New Users sheet columns
The backend will auto-add these if they do not exist:

- `SessionToken`
- `SessionExpiresAt`

## Important
Apps Script CacheService cannot hold tokens for 30 days, so this update keeps a persistent remembered token in the Users sheet. The ScriptCache is still used as a fast short-term cache.
