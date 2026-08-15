# Production Smoke Test v1.1.2

## Reality TV admin season loading

1. Open Admin → Reality TV Season Manager.
2. Confirm season summary cards appear before season details.
3. Expand one season.
4. Confirm the gold progress bar says it is reading roster, episodes, questions, results, and settings.
5. Confirm the season opens without creating or changing spreadsheet rows.
6. Close and reopen the same season and confirm it remains responsive.
7. Expand a different season and confirm only that season loads.

## Data integrity

1. Record row counts for RealityGroups, RealityContestantGroupHistory, RealityQuestionTemplates, and RealityEpisodeQuestions.
2. Expand and close a season several times.
3. Confirm all row counts remain unchanged.
4. Confirm starting/current/final tribe history still displays correctly.

## Save and repair actions

1. Save one group assignment and confirm it persists.
2. Run Repair Reality TV Setup on a test season and confirm repair still works.
3. Confirm ordinary season expansion does not run repair automatically.

## Timeout recovery

1. If a cold Apps Script start takes longer than seven seconds, confirm the loading message updates.
2. If a request fails, click Retry Season Load.
3. Confirm no duplicate questions, groups, or history rows are created.
