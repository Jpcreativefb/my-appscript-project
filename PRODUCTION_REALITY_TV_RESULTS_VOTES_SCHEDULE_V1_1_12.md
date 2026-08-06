# Reality TV Results, Votes, and Schedule Controls — v1.1.12

## Scope

This release completes the current Reality TV Manager manual-results workflow before External Results Hub integration.

## Manual result workflow

- Result submissions and approvals refresh the open season in place instead of returning the administrator to the Reality TV Manager start.
- Supplemental episode questions support one winner, multiple winners, or a pushed/no-result outcome.
- Every selected winner is written to CategoryResults and scores as correct for players who selected that answer.
- The main elimination result supports one elimination, two or more unexpected eliminations, no elimination, medical withdrawal, or quit.
- Unexpected multiple eliminations push the original single-elimination prediction while removing every selected contestant from the active roster.
- Bulk settlement deduplicates repeated nominee rows safely.

## Episode Vote Details

A new `RealityEpisodeVotes` sheet stores one row per ballot with:

- episode and voting round
- voter and target contestant IDs
- vote status
- weighted vote value
- notes and audit timestamps

Supported statuses are:

- Valid
- Nullified by idol or advantage
- Not read / unrevealed
- Lost or blocked vote
- Abstained / no vote cast

The manager displays:

- valid votes and total votes cast against each contestant
- nullified and unrevealed vote totals
- who each contestant voted for
- separate initial vote, revote, second Tribal, and custom rounds
- edit and delete controls without leaving the open season

Vote history is independent of question settlement and elimination. Saving a vote cannot accidentally eliminate a contestant or settle a prediction.

Players receive vote details only after the episode is finalized. Open-episode votes remain private to administrators.

## Schedule changes and delays

A new Episode Schedule & Delays panel supports:

- Scheduled, Delayed, Rescheduled, and TBA states
- editing air date/time and pick lock time
- preserving the original air date
- schedule notes visible to players
- shifting all later open episodes by the same amount
- shifting the season schedule anchor so episodes created later inherit the new cadence

Changing an episode schedule preserves its permanent episode ID, questions, answers, picks, results, vote history, and contestant history.

When an episode is marked TBA:

- its air and lock times are cleared
- its existing questions remain in place
- picks remain open until a replacement date and lock time are saved

Main and supplemental question lock times update together. External Results Hub schedule updates are attempted when configured but cannot block the local manager.

## Validation

- 54 regression test files passed.
- 149 JavaScript files passed syntax validation.
- New automated coverage verifies multiple winners, multiple eliminations, in-place result entry, vote storage/deletion, finalized-player visibility, TBA behavior, lock propagation, shifting existing future episodes, and shifting not-yet-created future episodes.
