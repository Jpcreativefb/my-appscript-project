# Phase 2 — Reality TV Weekly Stats Header v1.0.32

## Summary

Adds a player score summary and compressed leaderboard above the pinned Season Survivor Pick. Each Reality TV episode/leg/round now displays its own scoring summary directly in the collapsible header.

## User page order

1. Player season score and simple statistics
2. Compressed leaderboard
3. Season Survivor Pick
4. Latest episode/leg/round (expanded)
5. Previous periods (collapsed)

## Top player summary

Displays:

- Total season points
- Current place and number of players
- Correct answers across settled Reality TV questions
- Season Survivor net adjustment
- Compact top-five leaderboard
- Logged-in user appended when outside the top five

## Per-period header statistics

Each collapsible period header displays:

- Points earned in that period
- Cumulative season place after that period
- Position movement compared with the prior period
- Correct answers out of settled questions
- Picks saved count
- The contestant/team eliminated in that exact period

Position movement uses:

- Green up arrow for places gained
- Red down arrow for places lost
- Dash for no movement or no previous settled period

## Historical elimination display fix

Historical participant cards now show the ELIMINATED overlay only when:

`participant.EliminatedEpisode === displayed episode number`

This prevents a Week 2 elimination from appearing as eliminated inside the Week 1 question cards. Current elimination status remains available in the pinned Season Survivor Pick.

## Scoring notes

- Weekly points include fixed question points plus that period's Season Survivor bonus/penalty adjustment.
- Correct-answer totals count settled winner questions.
- Cumulative place is calculated after each period.
- Overall score and compact leaderboard use the app's normal leaderboard scoring source.

## Changed files

- `backend/engines/AppDataEngine.js`
- `backend/engines/RealityTvSeasonEngine.js`
- `frontend/js/pages/picks.js`
- `frontend/css/styles.css`
- `frontend/app.html`
- `frontend/sw.js`
- `tests/reality_tv_weekly_header_stats_tests.js`

## Validation

All 43 repository test files passed.
