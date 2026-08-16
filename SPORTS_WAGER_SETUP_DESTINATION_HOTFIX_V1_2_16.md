# Sports Wager Setup Destination Hotfix — v1.2.16

## Problem
Manage Games intentionally saves Draft/Setup games with `Active = FALSE`. The Sports admin destination lookup used `getActiveGames()`, so a correctly configured wager game in Setup was discarded before `WagerEnabled` was checked. This created a circular workflow: the game could not go Live until it contained a wager question, while Sports could not create the first wager question until the game was already Live.

## Fix
- `apiAdminGetSportsWagerGames` now reads all games for the admin builder and accepts non-archived wager-enabled destinations in Setup, Preview, or Live/Active.
- Draft remains excluded so admins deliberately move a game into Setup before Sports content is created.
- Legacy rows with no Status but `Active = TRUE` remain compatible.
- Player visibility and wagering rules are unchanged. Setup remains hidden/locked; Preview remains visible/locked; Live remains player-playable according to the normal lock controls.
- The Sports destination picker now shows lifecycle status and gives an accurate empty-state message.

## Expected workflow
`Draft -> Setup -> create Sports wagers -> Run Check -> Preview/Live`
