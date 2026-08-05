# Production Reality TV Player Flow v1.1.6

## Purpose

This release completes a focused Reality TV player-flow pass after the v1.1.5 image engine. It removes the External Results Hub from the blocking question-build path, restores the Season Survivor Pick position, reduces pick-save work, adds Reality TV pick-change controls, improves mobile question cards, and makes the page loader visibly progress while long requests are running.

## Changes

### Episode question building

- Local episode questions and answers complete before optional External Results Hub mappings.
- Hub mapping status is recorded as deferred instead of blocking the build.
- Existing jobs paused at the old `SYNC_HUB` stage safely advance without recreating completed questions.
- `Resume Build (x/y)` is recovery-only and resumes from the saved index.
- Added an inline administrator help topic and a permanent project guide.

### Season Survivor Pick

- The Survivor Pick position is reserved immediately after the score/leaderboard area.
- A visible loading placeholder appears while the Survivor data request runs.
- Survivor data loads before optional weekly statistics and compact leaderboard enhancements.
- The Survivor payload is read-only and reuses one Reality TV user-view read instead of repeating setup work.

### Faster pick saves

- Pick validation occurs before the script lock is requested.
- The lock covers only the final read/write portion of the save.
- Existing rows are updated with one row-level `setValues` operation instead of several cell writes.
- The normal save path no longer calls `SpreadsheetApp.flush()`.
- Cache invalidation is limited to the Picks sheet cache, affected game leaderboard caches, and the affected user's Reality TV statistics cache.
- Full application/game cache clearing is no longer performed for every pick.

### Pick-change rules

Reality TV seasons now store:

- `PickChangesAllowed`
- `MaxPickChanges`
- `PickChangePenalty`

The Reality TV Manager provides a dedicated **Player Pick Rules** section and **Save Player Pick Rules** action.

Default behavior is:

- Changes allowed until the question locks.
- Blank maximum changes means unlimited.
- Penalty defaults to zero.

Existing episode and supplemental categories are updated when the rules are saved.

### Player-card behavior

- Penalty and changes-left information is hidden when neither is configured.
- Unlimited changes do not display `0 changes left`.
- After a Reality TV pick is saved, the question remains visible briefly, then collapses and scrolls to the next unanswered unlocked question.
- Long question titles wrap instead of being clipped on mobile.
- Mobile card headers can wrap without pushing points or controls off-screen.

### Loader behavior

- The page loader begins below 50 percent and advances gradually while the page request is still active.
- Player loads remain simple percentage-only displays.
- Admin loads retain descriptive status text.

## Deployment type

This release changes both Apps Script backend and Cloudflare Pages frontend files. Deploy both sides.

## Validation

- All modified JavaScript files passed `node --check`.
- All 48 automated test files passed.
