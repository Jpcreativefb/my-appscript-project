# Reality TV Episode Finalizer v1.2.2

## Goal

Replace the weekly Reality TV approval babysitting workflow with one server-owned finalization job. An administrator enters the episode results, submits the main elimination result, and selects **Approve All & Finalize Episode** once. The server settles the current episode and prepares the next episode without requiring the browser to remain open.

## New weekly workflow

1. Enter or submit a result for every enabled Extra Episode Question. Use Push / No Result when appropriate.
2. Enter the main elimination result. Multiple eliminations remain valid multiple winners.
3. Review the result summary.
4. Select **Approve All & Finalize Episode** once.
5. The backend settles all Extra Question result queues, settles the elimination, updates scoring/roster state, and marks the current episode final.
6. A separate `RealityNextEpisodeJobs` worker creates and prepares the next episode in the background.
7. External Results Hub synchronization remains asynchronous through the Hub outbox and does not block local finalization.

## Server-owned finalization

The main result queue now supports `EpisodeFinalizeMode = ALL_RESULTS` and these stages:

- `SETTLE_QUESTIONS`
- `SETTLE`
- `FINALIZE_CURRENT`
- `COMPLETE`

Temporary Google Sheets and lock failures are automatically requeued up to five attempts. Reset/Resume remain recovery tools only.

## Separate next-episode preparation

`RealityNextEpisodeJobs` is created automatically. Next-episode work is no longer part of the current episode's approval completion. Its stages are:

- `CREATE_EPISODE`
- `BUILD_QUESTIONS`
- `COMPLETE`

The worker reuses the v1.1.18 bulk Extra Question materializer. If the browser is closed, an Apps Script continuation trigger owns the unfinished job. A next-episode job waits while a current-episode approval owns the shared Reality TV write path.

## Admin UI

The main result card now includes **Approve All & Finalize Episode**. It shows readiness for all enabled Extra Questions and refuses the one-click finalization when an enabled question has neither a final result nor a submitted/pending result.

While the job runs, the manager states that processing is automatic and the page may be closed. Reset/Resume controls are kept under a recovery section. Reopening the season starts a read-only status poller; the browser does not drive the job.

After the current episode is final, next-episode preparation appears as a separate progress card.

## Compatibility

Legacy approval stages remain supported so old v1.1.x/v1.2.1 stuck approvals can still be reset or resumed. Per-question approval remains available as an optional correction/recovery path.

## Deployment

- Awards App backend: deploy required (`clasp push` plus a new version of the existing web-app deployment).
- Awards App frontend: deploy required (Cloudflare/GitHub path).
- External Results Hub Apps Script: no code changes in v1.2.2; no Hub `clasp push` is required.
