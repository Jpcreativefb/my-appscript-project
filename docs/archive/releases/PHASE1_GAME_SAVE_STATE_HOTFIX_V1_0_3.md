# Phase 1 Game Save-State Hotfix v1.0.3

## Purpose

Makes unsaved changes obvious in **Admin → Manage Games → Settings** without using risky full autosave.

## New behavior

- Normal state: **SAVE GAME** in the normal yellow style.
- Any field, dropdown, text box, checkbox, or game-state button change:
  - shows **Unsaved changes**;
  - changes the button to **CHANGES MADE — SAVE NOW**;
  - changes the button to orange/red and pulses once.
- While saving: **SAVING...**.
- Successful save: **SAVED ✓** in green, then returns to **SAVE GAME**.
- The save bar remains sticky on desktop while scrolling.
- Leaving Manage Games with unsaved changes displays a confirmation warning.
- Closing a game card with unsaved changes displays a confirmation warning.
- Draft, Setup, Preview, Activate, and Make Default automatically save pending form changes first, then perform the selected publishing action.
- Archive and Restore remain explicit actions; they are not autosaved.

## Files changed

- `frontend/js/pages/admin.js`
- `frontend/js/pages/adminGames.js`
- `frontend/js/app.js`
- `frontend/app.js`
- `frontend/css/styles.css`
- `frontend/sw.js`
- Phase 1 regression tests that verify the service-worker version
- `tests/games_phase1_integration_tests.js`

## Deployment

This is a frontend-only update. A `clasp push` is not required.

1. Copy the hotfix files into the current repository.
2. Run the tests.
3. Commit and push the frontend changes to the Cloudflare deployment branch.
4. Wait for Cloudflare to finish.
5. Hard-refresh the browser and fully close/reopen the installed PWA.

Service-worker cache:

`awards-app-v254-unsaved-save-warning`

## Quick smoke test

1. Open **Admin → Manage Games** and expand a game.
2. Change Game Name or click one Availability state button.
3. Confirm the save button says **CHANGES MADE — SAVE NOW** and the message says **Unsaved changes**.
4. Click **SAVE NOW**.
5. Confirm it shows **SAVING...**, then **SAVED ✓**, then reloads the Manage Games screen.
6. Make another change and click **Back to Admin**. Confirm the unsaved-change warning appears.
7. Make another change and click **Preview** or **Setup**. Confirm the pending change is saved before the publishing state changes.
