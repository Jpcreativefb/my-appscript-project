# PATTC Predicts v1.2.18v1 — Team Fantasy Weekly Selection Help

This release moves the player help to the place it is needed: the top of **Weekly Picks**.

## Player changes

- Adds **Rules** and **Scoring & Position Stats** buttons directly below the Weekly Picks heading.
- Rules explain weekly lineup construction, per-position team-use limits, kickoff locking, BYE handling, weekly scoring, standings, and postseason behavior.
- Scoring & Position Stats reads the game's **currently active `TeamFantasyScoringRules`** and groups them by position, so admin scoring changes are reflected automatically instead of being hard-coded in the player UI.
- Changes the position presentation order to `QB, RB, WR/TE, OL, K, DL, LB, DB` on one-column screens.
- On two-column screens, keeps offense on the left (`QB, RB, WR/TE, OL`) and `K, DL, LB, DB` on the right.
- Retires the player-facing **Compare / Six-Team Synthetic Compare** view. Weekly Standings and historical week selection remain.
- Renames the in-memory admin Test Lab output so it no longer presents itself as a Six-Team Synthetic Compare game.

## Safety

The release is locked to the verified v1.2.18u1 production commit and stops before modifying the repository if the local branch, GitHub branch, or prerequisite markers do not match. It runs Team Fantasy regression tests and the full production checks before committing or deploying.

## Admin verification

The in-memory Team Fantasy Test Lab remains available to admins. Only the player-facing Compare/Six-Team Compare mode is retired.
