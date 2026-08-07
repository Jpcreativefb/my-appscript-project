# Production Smoke Test v1.2.4 — Durable Reality TV Approval

## A. Recover the currently stalled approval

1. Deploy v1.2.4 backend and frontend.
2. Hard-refresh the app.
3. Reopen the Reality TV season with the stalled episode.
4. Do **not** press Reset, Resume, or individual Extra Question approval buttons.
5. Within roughly 10–60 seconds, confirm the approval changes from the old fixed
   `Settling all Extra Question results` display to durable progress such as:
   `Settling Extra Questions 1 of 4`.
6. Confirm `RealityResultQueue` has the new durable fields populated.
7. Confirm the completed count increases and does not move backward.
8. Confirm individual `RealityQuestionResultQueue` rows become `APPROVED` one at a time.
9. Confirm the approval advances to `SCORE_QUESTIONS`, then `SETTLE`,
   then `FINALIZE_CURRENT`, then `COMPLETE`.
10. Confirm the current episode becomes `FINAL`.
11. Confirm next-episode preparation runs separately in `RealityNextEpisodeJobs`.

## B. New clean episode test

1. Enter results for every enabled Extra Question.
2. Enter the main elimination result.
3. Press **Approve All & Finalize Episode** once.
4. Leave the page for at least one minute.
5. Reopen the season.
6. Confirm the job continued without Reset/Resume.
7. Confirm per-question durable progress was saved.
8. Confirm the episode finalized and the next episode preparation started separately.

## C. Failure recovery test

1. During a test approval, close the browser after the first Extra Question checkpoint.
2. Reopen later.
3. Confirm the server continued independently.
4. If a worker execution was interrupted, confirm the persistent watchdog reclaims the stale
   stage automatically.
5. Do not use **Force Recovery** unless there has been no saved checkpoint for more than five minutes.

## Expected normal admin workflow

Enter all results → **Approve All & Finalize Episode** → leave.

Reset/Resume is not part of normal operation.
