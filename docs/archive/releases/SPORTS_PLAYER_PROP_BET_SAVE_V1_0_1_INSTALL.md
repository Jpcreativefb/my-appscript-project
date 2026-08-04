# Install Sports Player Prop Bet Save v1.0.1

Copy the changed files over the current Awards App project and run:

```bash
clasp push
```

Create a new Apps Script web-app deployment version. Commit and push the frontend files so Cloudflare Pages redeploys, then hard-refresh with Command + Shift + R.

Run tests from the repository root:

```bash
node tests/sports_player_props_integration_tests.js
node tests/sports_player_prop_bet_save_integration_tests.js
node tests/sports_players_controls_integration_tests.js
node tests/archive_production_readiness_tests.js
node tests/leaderboard_modal_interactions_tests.js
```

Then run in the Apps Script editor:

```javascript
testLatestSportsPlayerPropWagerReadiness()
```

Player-prop selections should write to `Bets`, never `Picks`.
