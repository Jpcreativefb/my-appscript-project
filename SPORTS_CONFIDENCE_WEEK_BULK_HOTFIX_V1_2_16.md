# Sports Confidence Week Bulk Hotfix — v1.2.16

## Problem
The Sports Confidence week picker could select a full scheduled football week, but the backend processed every matchup as a complete standalone create workflow. Each selected game re-fetched the Sports API, re-read game setup, created one question, created two choices, rescanned Categories, flushed Sheets, and cleared caches. A full NFL week could therefore stop after only a few questions were written.

## Fix
`adminCreateSportsConfidenceQuestionsBulk` is now a real weekly batch operation.

- The Sports page sends the already-loaded Sports Scores Engine snapshot for every selected matchup.
- The backend validates all selected snapshots before writing.
- Existing questions are detected once for duplicate protection.
- Questions are written to normalized storage in one grouped replacement.
- Team choices are written to normalized storage in one grouped replacement.
- Legacy Categories rows are appended in one grouped write.
- CategorySettings rows are appended in one grouped write.
- Spreadsheet flush/cache clearing happens once at the end.
- A single script lock protects the whole weekly build.
- Older clients without snapshots retain the previous per-game Sports API fallback.

## Recovery behavior
If a prior attempt created only part of the week, run the same week again and select all games. Existing sports event IDs are treated as duplicates and only the missing games are added. For example, if 3 of 16 were already created, the next run adds the remaining 13.

## Validation
The regression suite includes a simulated 16-game scheduled NFL week and verifies:

- 16 questions created
- 32 team choices created
- one grouped Categories write
- one grouped CategorySettings write
- no per-game Sports API fetch when week snapshots are supplied
- duplicate recovery correctly skips 3 existing games and prepares the remaining 13
