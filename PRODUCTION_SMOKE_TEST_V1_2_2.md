# Production Smoke Test — v1.2.2 Reality TV Episode Finalizer

Run this test on one disposable or controlled Reality TV episode before relying on it for a live episode.

## Preconditions

- Deploy the v1.2.2 Awards App backend and frontend.
- Hard-refresh the admin app.
- Confirm the episode has a submitted main elimination result.
- Confirm every enabled Extra Episode Question either has a submitted result, is already final, or is explicitly Push / No Result.

## Test

1. Open Reality TV Manager and the target season.
2. Review all episode results. Confirm the main card reports all Extra Question results ready.
3. Select **Approve All & Finalize Episode** exactly once.
4. Confirm the approval enters `SETTLE_QUESTIONS`, then `SETTLE`, then `FINALIZE_CURRENT`, then `COMPLETE`.
5. During processing, close or reload the admin page. Reopen the season and confirm progress is still visible and the backend continued without selecting Resume Approval.
6. Confirm all submitted Extra Questions are final and scored.
7. Confirm the main elimination is final, including multiple-winner elimination behavior when applicable.
8. Confirm the roster reflects the eliminated contestant(s).
9. Confirm the current episode is marked final before next-episode preparation completes.
10. Open the `RealityNextEpisodeJobs` sheet and confirm a job exists for the next episode when Auto Create Next Episode is enabled.
11. Confirm the next-episode card progresses independently and eventually reaches COMPLETE.
12. Confirm the next episode contains its main question and the enabled Extra Questions with valid answer rows.
13. Confirm the Hub outbox receives any appropriate asynchronous mirror jobs separately; Hub activity must not keep the episode finalizer open.
14. Confirm no duplicate next episode, question, or answer rows are created if the page is refreshed or a server retry occurs.

## Failure expectations

- Do not use Reset/Resume during normal processing.
- A temporary Sheets/lock error should automatically requeue up to five times.
- Use recovery controls only if the UI explicitly reports stalled / needs attention or the job exhausts retries.
