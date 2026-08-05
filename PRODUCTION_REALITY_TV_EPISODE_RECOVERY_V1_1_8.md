# Production Reality TV Episode Recovery and Custom Questions v1.1.8

## Purpose

This release repairs four connected Reality TV workflow failures:

1. A game can contain the current episode question and lock time while the normalized `RealityEpisodes` row is missing.
2. The Sole Survivor selector can become unavailable because it cannot resolve that missing episode row.
3. Individual weekly question cards do not collapse because their selectable content is outside the collapsible body.
4. The custom-question form does not clearly show how to save multiple questions or where answer choices come from.

## Current-period recovery

`Save Format & Build Current Episode`, `Verify & Repair Extra Questions`, custom-question creation, and episode-question building now resolve the current period in this order:

1. Requested Episode ID
2. Season `CurrentEpisodeNumber`
3. Newest open/review episode
4. Newest stored episode
5. Repair/create the current episode when no normalized row exists

When the existing Game Setup category already contains a lock time, the repair keeps that lock time rather than calculating a new one.

External Results Hub synchronization remains skipped during this recovery so it cannot block the local game.

## Sole Survivor fallback

The player-side Survivor payload now prefers an open episode whose lock is still in the future. If no normalized episode is available, it derives a read-only current episode from the main `episode-N-eliminated` game category. This allows a player to finalize before the category's real lock time while the manager repair is still pending.

## Question collapse

All answer choices, change rules, and confidence/stake controls are now inside `.pick-card-body`. Collapsing a question hides that complete body while keeping the question header and saved-pick summary visible. The header also maintains `aria-expanded` state.

## Custom questions

The Custom Questions section is open by default and now includes:

- A saved custom-question list
- Clear confirmation that multiple questions are supported
- An explicit `Save & Build This Custom Question` button
- A `Clear Form / Add Another` button
- Answer sources for active roster participants/teams, active groups/tribes, merge-aware groups/participants, Yes/No, and manual answers
- Manual-answer support for judges, guests, locations, or special outcomes
- A live answer preview before saving

Custom questions are still saved one at a time, but there is no one-question limit.

## Release cache

Frontend asset version: `308-reality-tv-episode-recovery`
