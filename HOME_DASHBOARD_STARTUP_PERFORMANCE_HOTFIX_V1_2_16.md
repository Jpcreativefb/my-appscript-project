# Awards App v1.2.16 — Home Dashboard Startup Performance Hotfix

## Problem
The initial Home / Dashboard load could pause near the loader's 90% pulse ceiling for roughly 14–15 seconds even after individual game startup had improved.

## Root cause
`apiGetDashboardGamesHub` built each game card independently. For every active and past game it could calculate question totals, user pick progress, and wager progress separately. As the game archive grew, Home startup became an N × games sheet-read workload.

## Fix
- Build one compact progress snapshot for all active games.
- Read Categories once and count unique questions only for active games.
- Read Picks once and summarize the logged-in user's latest pick per active game/question.
- Read Bets once and summarize the logged-in user's wagered questions per active game.
- Past/archived games no longer calculate live progress during Home startup.
- Season hubs continue to defer their specialized episode progress to the season view.
- Existing per-game progress helpers remain as fallback paths.

## Validation
- JavaScript syntax: 117 files pass.
- Regression/behavior tests: 90 pass.
- New runtime test verifies multiple active games are summarized from one batched snapshot and unrequested/past games are excluded.
