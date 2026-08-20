# v1.2.18a — Login + Device Sessions

## Goal
Make the Awards App behave like an installed phone app: sign in once on a remembered device, reopen directly into the app, and only return to the PIN screen after logout, revocation, inactivity expiry, or account/security changes.

## Changes
- Added persistent per-device sessions in `UserSessions` with hashed bearer tokens.
- Remembered devices use a sliding 90-day expiry; non-remembered sessions use 24 hours and browser `sessionStorage`.
- Existing pre-v1.2.18a single-user session tokens remain valid during migration.
- Logout revokes only the current device token.
- PIN resets and user deactivation revoke all device sessions for that account.
- The login page now validates a remembered device before revealing the login form, preventing login-screen flash.
- Login is guarded against double taps and visibly shows `Signing in…` and success/error states.
- App startup avoids immediately re-validating a token that the login shell just validated.
- Refreshed login screen for desktop and iPhone/PWA safe-area layouts.

## Test
1. Sign in with **Keep me signed in** checked.
2. Close and reopen the browser/PWA. It should enter the app without a PIN prompt.
3. Refresh/app update. It should remain signed in.
4. Log out. Reopening should require login.
5. Sign in with the box unchecked, close that browser session, and confirm it does not become a permanent remembered login.
6. Sign in on a second device and confirm the first device remains signed in.
