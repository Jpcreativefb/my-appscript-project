# v1.2.16 Home Dashboard Progress Hotfix

The Fall Production Hardening smoke test exposed a dashboard-only defect: `buildDashboardGameHubItemLite_()` returned hard-coded zero progress values even when the user had saved picks.

This hotfix:

- calculates lightweight Home-card progress directly from the user's saved Picks/Bets rows;
- supports Prediction, Confidence, Staked Prediction, Head-to-Head, Wager, Racing Wager, and Hybrid game modes;
- counts Hybrid completion by unique category so a category is not double-counted;
- keeps the expensive leaderboard/profile work out of Home startup;
- suppresses misleading percentage bars when progress is not meaningful (season hubs and unfinished generic Ranking/Survivor modes);
- bumps the frontend asset marker to `319-home-dashboard-progress-v1216`.

Run `./tools/run_production_checks.sh` before deployment.
