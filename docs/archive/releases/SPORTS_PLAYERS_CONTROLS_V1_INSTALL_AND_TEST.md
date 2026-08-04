# Sports Players Controls v1 — Install and Test

This update connects the Awards App Sports Controls UI to the working player backend in the separate Sports Scores Engine.

## Changed production files

- `backend/Api.js`
- `backend/engines/SportsAdminBridgeEngine.js`
- `frontend/js/api.js`
- `frontend/api.js`
- `frontend/js/pages/admin.js`
- `frontend/sw.js`

The package also includes:

- `SPORTS_PLAYERS_CONTROLS_V1_NOTES.md`
- `tests/sports_players_controls_integration_tests.js`

## Install into the current repository

Extract the changed-files package directly over the repository root so the folders line up.

Then run:

```bash
cd ~/Desktop/my-appscript-project
node tests/sports_players_controls_integration_tests.js
git status --short
git diff --stat
```

## Save to GitHub

```bash
git add \
  backend/Api.js \
  backend/engines/SportsAdminBridgeEngine.js \
  frontend/js/api.js \
  frontend/api.js \
  frontend/js/pages/admin.js \
  frontend/sw.js \
  tests/sports_players_controls_integration_tests.js \
  SPORTS_PLAYERS_CONTROLS_V1_NOTES.md \
  SPORTS_PLAYERS_CONTROLS_V1_INSTALL_AND_TEST.md

git commit -m "Add player controls to Sports admin"
git push origin "$(git branch --show-current)"
```

## Deploy backend

From the repository root:

```bash
clasp push
```

Then update the existing Awards App web-app deployment to a new version in Apps Script:

1. **Deploy** → **Manage deployments**
2. Edit the current web app
3. Choose **New version**
4. Deploy

## Deploy frontend

If Cloudflare Pages is connected to this GitHub branch, the GitHub push should start the frontend deployment automatically.

The service-worker cache was bumped to `awards-app-v213-sports-player-controls` so the new admin JavaScript replaces the prior cached build.

## Test in the app

1. Open the Awards App as an admin.
2. Open **Admin** → **Sports Controls**.
3. Expand **MLB** or **NFL**.
4. Expand **Players**.
5. Confirm the section shows:
   - Active player count
   - Total player count
   - Player stat-row count
   - Last roster update
   - Last player-stat update
6. Click **Sync Players**.
7. Confirm the league card remains open and the counts refresh.
8. Click **Refresh Current Game Stats**.
9. Confirm game/stat counts and last-updated values refresh.

## Expected v1 behavior

- MLB and NFL buttons are enabled when the league is ON.
- MLB and NFL buttons are disabled when the league is OFF.
- Other leagues show the Players section but explain that v1 support is currently MLB and NFL.
- The Sports Scores Engine admin key remains server-side in the Awards App Script Properties.
