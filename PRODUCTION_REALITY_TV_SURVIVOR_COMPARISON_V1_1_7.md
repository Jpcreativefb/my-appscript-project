# Production Reality TV Survivor and Locked Comparison v1.1.7

## Purpose

This release completes the Sole Survivor player workflow, repairs incomplete extra-question builds against actual game records, improves pick-save responsiveness, restores Reality TV question auto-advance, and adds a post-lock group comparison grid.

## Main changes

### Sole Survivor Pick

- Added immediate portrait and biography preview when a contestant is selected.
- Moved the selector and red **Finalize Pick** control directly below the portrait.
- Removed the selector after finalization.
- Prevented switching an active finalized pick.
- Restored the selector only after elimination.
- Added grayscale eliminated styling and an **ELIMINATED** overlay.
- Added an active-contestant bio browser.
- Constrained all portrait rendering so an image cannot overlap the compact leaderboard.
- Condensed statistics into a responsive grid, with Current Episode full width.

### Weekly pick flow

- Added optimistic saved-selection rendering.
- Reduced category-settings reads by using the existing settings cache during save validation.
- Preserved the saved card briefly, then collapsed it and opened/scrolled to the next unanswered unlocked question.
- Added pending-save styling and rollback on failure.

### Extra questions

- Added **Verify & Repair Extra Questions**.
- Verification checks the actual episode-question row, game category, and expected answer IDs.
- A saved build counter can no longer be the only proof that a question is complete.
- Existing valid questions and answers are reused.
- External Results Hub mapping remains deferred and cannot block local gameplay.

### Locked episode comparison

- Added an authenticated player endpoint for the latest locked Reality TV episode.
- Displays every active player's Sole Survivor Pick and weekly answers in one grid.
- The backend withholds the comparison until the episode has locked.
- The grid is responsive and horizontally scrollable on mobile.

## Deployment type

Backend and frontend deployment are both required.

## Cache version

`307-reality-tv-survivor-comparison`
