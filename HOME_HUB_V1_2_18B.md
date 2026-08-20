# Awards App v1.2.18b — Home Hub

## Purpose
Refresh the signed-in Home screen without putting heavy standings/history work back on the critical startup path.

## Home changes
- Compact welcome header with Profile shortcut.
- Career stats bar: Games, Wins, Top 3, Average Finish, Accuracy.
- Career stats reuse verified archived-game history and load after the initial Home/game payload renders.
- Current/default game is promoted to a large Featured Game card.
- Remaining active games use smaller, denser cards.
- League section loads the user's leagues and current league-specific standings in the background.
- League cards show current game, user's rank/score, current leader, and an Open Standings action.
- Trophy Room foundation shows existing game wins and podiums now, with admin-created awards clearly marked as a future feature.
- Past Games collapse into a compact archive section.
- Mobile layout uses a horizontally scrollable career bar and league-card strip instead of squeezing desktop cards.

## Startup/performance behavior
The first Home request remains `getDashboardGamesHub`. Career archive history and league standings hydrate only after the Home markup is on screen. League leaderboard requests are also background work.

## Backend change
`getDashboardGamesHub` now returns `defaultGameId` so the true default/current game can be featured without another blocking request.

## Included auth carry-forward
This package also carries forward the v1.2.18a1 Sign Up / Reset PIN tab fix (`frontend/js/auth.js` and `frontend/js/pages/auth.js`) so installing 18b is safe even if 18a1 was not installed separately.

## Future work
The Trophy Room admin-award builder is intentionally not implemented in this release. The Home preview establishes the UI/data location for it.
