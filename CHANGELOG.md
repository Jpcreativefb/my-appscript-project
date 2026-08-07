## v1.2.2 — Set-and-forget Reality TV episode finalization

- Added one-click **Approve All & Finalize Episode** for the current episode.
- Settles all submitted Extra Question results server-side before the main elimination.
- Marks the current episode final before next-episode preparation.
- Added `RealityNextEpisodeJobs` so next-episode creation and bulk question materialization continue separately in the background.
- Added automatic retry for transient Sheets/lock failures; Reset/Resume are recovery-only.
- Reopening the manager polls saved state without driving approval work.
- Kept External Results Hub synchronization asynchronous and outside the local finalization critical path.

## v1.2.1 — External Results Hub write verification
- Require read-after-write verification before outbox jobs become COMPLETE.
- Record exact Hub target and write receipt.
- Recover v1.2.0 unverified COMPLETE jobs safely.
- Show configured Hub name and unverified count in Reality TV Manager.

## v1.2.0 — External Results Hub queued bridge

- Moved Reality TV Hub mirroring out of the approval/request path into `ExternalResultsHubOutbox`.
- Added a retrying background bridge worker and Hub health controls.
- Added `ExternalResultsInbox` for reviewed external deliveries.
- Changed the Hub bridge to deliver to the inbox instead of writing directly to `CategoryResults`.
- Added normalized multiple-winner delivery support.
- Automatic inbox settlement remains disabled pending phase-two verification.
## v1.1.18 — Reality TV bulk Extra Question materializer

- Removed the old one-question-at-a-time Extra Question worker from the main-elimination approval path.
- Compiles the complete next-episode question and answer plan in memory after one roster/group read.
- Writes normalized questions, CategorySettings, legacy answer rows, normalized options, and RealityEpisodeQuestions in bulk operations.
- Added real `COMPILING QUESTION PACK`, `WRITING QUESTION PACK`, and `VERIFYING QUESTION PACK` approval checkpoints.
- Keeps approvals serialized across shows and continues queued work through a server trigger.
- Prevents the displayed approval percentage from moving backward and polls saved server checkpoints every three seconds.
- Makes the bulk pass idempotent and retryable after temporary lock or Google Sheets service failures.
- Added v1.1.18 bulk-materializer regression coverage.

## v1.1.17 — Reality TV approval queue and real checkpoints

- Serialized main-elimination approvals so MasterChef, Survivor, and other Reality TV seasons cannot write the shared Game Setup sheets at the same time.
- Added a server-side continuation trigger so queued approvals continue even when the browser request ends or the administrator leaves the page.
- Added a read-only approval-state endpoint and three-second frontend polling for live saved checkpoints during long Apps Script requests.
- Replaced simulated percentage movement with monotonic, checkpoint-based progress that never falls backward.
- Split next-episode creation into visible Preparing, Main Question, Main Answers, and Save checkpoints.
- Avoided unnecessary full Game Setup reloads when creating a new episode's main question.
- Marked approval-owned Extra Question builds so they do not compete with the generic question-pack background trigger.
- Linked progress to the exact approval question-build ID and migrated in-progress v1.1.16 builds into approval ownership on resume.
- Added last-checkpoint age, visible waiting-in-queue status, stale-owner bypass, and v1.1.17 regression coverage.

## v1.1.16 — Reality TV staged approval progress

- Replaced the single frozen `QUEUED` label with a live five-stage episode approval progress bar.
- Split next-episode Extra Question creation into its own resumable `BUILD_QUESTIONS` approval stage.
- Advanced one Extra Question per browser checkpoint so the UI can show real `N of N` progress instead of waiting on one long Apps Script request.
- Added elapsed time, approximate remaining time, a working animation, and a clear stalled warning after no saved heartbeat for 150 seconds.
- Added progress bars to supplemental question approvals as well as the main elimination approval.
- Skipped unconfigured External Results Hub work immediately and kept configured Hub work best-effort after local episode readiness.
- Increased the approval continuation guard to support large Extra Question packs without stopping early.
- Added v1.1.16 runtime, progress, cache, and compatibility regression coverage.

## v1.1.15 — Reality TV approval recovery and episode question plans

- Added a stage-aware **Reset Stuck Approval** action that resumes from settlement, next-episode creation, or final sync without intentionally repeating completed work.
- Changed unexpected two-or-more eliminations from push settlement to multiple-winner settlement; every eliminated contestant is a valid winning answer and earns normal points for matching picks.
- Confirmed that main-elimination approval automatically creates the next episode when more than one active contestant remains.
- Kept automatic inheritance of enabled Extra Questions, points, wording, layout, image source, and answer rules for each newly created episode.
- Added **Update This Episode Only** so administrators can add, remove, or change Extra Questions for one open episode without changing future defaults.
- Added one-time custom questions that build in the current episode but remain disabled for future episodes.
- Added v1.1.15 runtime and regression coverage.

## v1.1.14 — Reality TV mass voting and approval resilience

- Added one-click full-round vote entry restricted to the detected losing or Tribal Council tribe.
- Added an explicit outside-voter exception while keeping vote targets restricted to the selected voting tribe.
- Added separate tribe/council selection for unusual episodes and multiple Tribal Councils.
- Replaced long-held approval locks with brief stage claims so settlement code cannot deadlock itself.
- Added bounded retries for temporary Google Sheets service and lock-contention failures.
- Collapsed the Show Format & Episode Questions parent and all five numbered sections by default.
- Added v1.1.14 functional and regression coverage.

## v1.1.13 - Reality TV inline admin actions

- Removed the global Loading Admin Tools overlay from Reality TV in-page actions.
- Preserved the open season and refreshed only the affected section.
- Added loader-suppressed fallback navigation and bumped the frontend asset cache key.

## v1.1.12 — Reality TV Results, Votes, and Schedule Resilience

- Kept manual result submission and approval inside the currently expanded season instead of returning to the manager start.
- Added one-winner, multiple-winner, and push settlement for supplemental episode questions.
- Added unexpected two-or-more elimination handling with a pushed original prediction and complete roster updates.
- Added per-ballot episode vote storage, revotes, nullified/unrevealed/lost votes, weighted extra votes, editing, deletion, tallies, and voter-to-target history.
- Exposed vote history to players only after episode finalization.
- Added Scheduled, Delayed, Rescheduled, and TBA episode controls with original-date preservation and schedule notes.
- Added optional shifting of existing and not-yet-created future episodes while preserving episode IDs, questions, picks, results, and vote history.
- Updated main and supplemental question lock times together and kept Hub schedule work non-blocking.
- Added v1.1.11 and v1.1.12 regression coverage.

## v1.1.10 — Reality TV build-status disclosure fix

- Fixed the false permanent **Starting…** state when opening **Current Episode Build Status**.
- Shared admin progress now ignores expand/collapse disclosure controls.
- The real build/resume actions remain inside the expanded stage panel.

# Changelog

## v1.1.9 — Reality TV Extra Questions Production Readiness

- Restricted each Reality TV season to preset templates that match its selected show format.
- Automatically pruned unrelated preset rows when the question pack is saved or repaired.
- Made the queued build list authoritative so selected questions are not skipped by stale template flags.
- Added immediate server-side build advancement plus a time-trigger fallback for interrupted browsers.
- Added one master current-episode build status control with stage-by-stage and question-by-question readiness.
- Added automatic custom-question insertion into the current episode and safe individual custom-question deletion.
- Moved the large Save Format & Build request to POST and synchronized both frontend API copies.
- Added production regression coverage for cooking presets, custom manual-answer questions, deletion, and readiness.

## v1.1.8 — Reality TV Current Episode Recovery and Custom Questions

- Auto-repaired missing `RealityEpisodes` rows when the current game question already exists.
- Preserved the existing Game Setup lock time during current-period repair.
- Added a Sole Survivor fallback that resolves the current period from the live main question before lock.
- Fixed individual weekly-question collapse by placing all answer controls inside the collapsible card body.
- Added accessible expanded/collapsed state and restored save-and-advance behavior.
- Rebuilt Custom Questions with a visible save button, multiple-question workflow, saved-question list, answer-source selector, manual judge/special answers, and live answer preview.
- Added v1.1.8 help, smoke testing, and regression coverage.

## v1.1.7 — Reality TV Survivor Finalization and Locked Comparison

- Rebuilt the Sole Survivor card with immediate image/bio preview and a red Finalize Pick action.
- Locked finalized active Survivor picks until elimination, then restored a filtered active-contestant selector.
- Added grayscale eliminated presentation, bio browsing, portrait containment, and condensed responsive stats.
- Added a latest-locked-episode comparison grid for every player’s Survivor Pick and weekly answers.
- Added actual-row and expected-answer verification through Verify & Repair Extra Questions.
- Improved pick-save responsiveness with cached category settings, optimistic rendering, and reliable auto-advance.
- Added v1.1.7 help, smoke testing, and regression coverage.

## v1.1.6 — Reality TV Player Flow and Pick Performance

- Completed local Reality TV episode-question builds before optional External Results Hub mappings.
- Made Resume Build a recovery-only action with persistent progress and dedicated help documentation.
- Restored the Season Survivor Pick directly after the score area with prioritized read-only loading.
- Added Reality TV Manager controls for pick changes, maximum changes, and change penalties.
- Defaulted Reality TV picks to unlimited changes until lock when no limit is configured.
- Reduced pick-save lock duration, row writes, and cache invalidation.
- Added delayed collapse and auto-scroll to the next unanswered Reality TV question.
- Hid unused penalty/change counters and fixed mobile question-title clipping.
- Added a progressive loader pulse while page data is still loading.
- Added v1.1.6 regression coverage and a production smoke test.

## v1.1.5 — Platform Image Engine

- Added one shared image-delivery helper across Reality TV, awards, sports, racing, dashboard heroes, profiles, archives, leaderboards, and admin previews.
- Deferred off-screen images with IntersectionObserver and native lazy loading.
- Added asynchronous decoding, fetch priority, fixed image dimensions, and original-URL fallback.
- Added safe provider-native size reduction for TMDB posters, ESPN team logos, Google Drive thumbnails, and Google-hosted images.
- Added optional local WebP generation with an asset manifest and `asset:` image references.
- Kept Cloudflare transformation mode disabled by default so the release remains zero-charge and works on `pages.dev`.
- Added platform-wide image regression tests and a production smoke test.

## v1.1.1 — Reality TV setup repair and group history

- Changed initial Reality TV extra-question creation to a staged, resumable build.
- Added a one-click Reality TV repair action to the Manage Games activation check.
- Added safe repair for missing questions and missing answers without duplication.
- Added normalized participant tribe/team/group history by episode.
- Added an administrator-set individual-play/merge episode.
- Preserved historical episode answers when participants change groups.
- Added starting, current, final/latest, and full group history to participant profiles.

## v1.1.0 — Production hardening

- Added route-based page module loading.
- Added role-aware gold page progress indicators.
- Added shared admin help and action-progress behavior.
- Added lightweight Reality TV season-summary and lazy detail endpoints.
- Added brief caching for the heavy Reality TV player view.
- Added indexed exact-row pick lookup and cached pick metadata.
- Reduced service-worker prefetching to the core shell.
- Archived old repository release notes and reports.
- Added production smoke tests and status documentation.

## v1.1.2 — Reality TV Season Load Optimization

- Made Reality TV season expansion strictly read-only.
- Removed automatic group sync, question-template repair, and group-history writes from season loading.
- Replaced per-contestant full-sheet group-history reads with one in-memory profile pass.
- Reduced dashboard summary counting to one indexed pass per table.
- Added admin-only long-load progress messages and a safe retry action.
- Added season-load performance diagnostics and a 30-contestant regression test.

## v1.1.3 - Admin Games module loader repair
- Fixed `adminGames.js` lazy-load failures under VS Code Live Server.
- Disabled and cleared stale Awards App service workers/caches on localhost.
- Added cache-busting retry and exact module-path diagnostics.
- Updated Reality TV staged question-pack regression tests.
## v1.1.4 — Reality TV Player Fast Startup

- Removed Reality TV leaderboard and Season Survivor calculations from the blocking Picks startup request.
- Rebuilt the player Reality TV view as a read-only, single-pass cached payload.
- Added deferred player-statistics and Season Survivor hydration after questions render.
- Prevented optional background updates from rerendering or erasing unsaved question selections.
- Reduced the core startup request timeout from 120 seconds to 45 seconds.
- Added player startup regression coverage.

