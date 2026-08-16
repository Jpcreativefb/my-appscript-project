
## v1.2.16 Sports Confidence POST Transport Hotfix
- Removed JSONP from all three Confidence-builder admin calls: week load, destination-game load, and weekly bulk create.
- Routes those calls through the existing Awards POST proxy with request bodies instead of `<script>` query-string URLs.
- Added matching `doPost` handlers for the Confidence builder actions.
- Keeps the normal Sports scoreboard transport unchanged.

## v1.2.16 — Sports Confidence Week Bulk Hotfix

## Sports Confidence server loader hotfix
- Confidence week selection now loads Sports Scores Engine games through the authenticated Awards backend instead of browser JSONP.
- Removes the `Sports API script failed to load` failure path from Confidence week creation.
- Existing duplicate protection allows safe re-running of a partially-created week.


- Replaced the Confidence week builder's per-game create loop with grouped weekly writes so a full NFL week does not time out after only a few questions.
- Reuses the Sports Scores Engine snapshots already loaded by the Sports page instead of making one server fetch per selected matchup.
- Preserves duplicate protection and supports recovery from partial builds (for example 3 existing + 13 missing).
- Added a 16-game scheduled-week regression test and grouped-write assertions.

## v1.2.16 — Sports Confidence Week Builder

- Added an admin Sports Builders workflow to load NFL/college football by season/week (or any supported league by date range) and select matchups for an existing Confidence Game.
- Creates `confidence-points` questions with team choices, kickoff locks, SportsGameId/ESPNEventId linkage, sports result source, duplicate protection, and team metadata.
- Confidence destinations may be Setup, Preview, or Live; Draft/Archived games remain excluded.
- Existing Sports finalization now treats tied Confidence matchups as push/no-points instead of wager half-refunds.
- Existing Confidence scoring is reused unchanged.

## v1.2.16 — Sports Live Score Fetch Hotfix

- Replaced season-wide smart score polling with a small yesterday/today/tomorrow ESPN scoreboard window.
- Date-scoped NFL/MLB requests no longer send unnecessary `season`, `seasontype`, or `limit=500` parameters that were returning HTTP 403 from Apps Script.
- Added de-duplication across the live date window and clearer provider 403 diagnostics while leaving season/schedule builders unchanged.
- Added regression coverage for the live score fetch path.

## v1.2.16 — Shared Question Position Controls Hotfix

- Replaced unreliable arrow-only Manage Games question ordering with one target-position backend operation.
- Every Manage Games question now shows its visible position and supports ↑/↓ plus direct moves such as #29 → #4; all following questions shift automatically.
- Added Collapse All Questions / Expand All Questions and compact collapsed question summaries for long games.
- Awards Manager Review/Sort uses the same visible position model, direct position jump, ↑/↓, desktop drag/drop, and collapsible question cards.
- Bumped browser/service-worker assets to v326 and added executable 30-question direct-position regression coverage.

## v1.2.16 — Home Dashboard Startup Performance Hotfix
- Batched Home progress calculation across active games instead of per-game Categories/Picks/Bets reads.
- Past Games no longer perform live pick/wager progress work during initial Dashboard startup.
- Added regression coverage for the batched Dashboard progress snapshot.
## v1.2.16 — Game Load + Question Controls Hotfix

- Removed automatic legacy-to-normalized synchronization from normal player/game category reads; migration work now remains an explicit admin/migration concern.
- Added a cached Reality TV season-existence lookup so non-Reality games do not inspect the full Reality TV support tables during startup.
- Replaced Manage Games question-order swapping with one atomic backend reorder action that rewrites stable DisplayOrder values for the whole game.
- Added Manage Games **Pick Changes Before Lock** controls next to Lock Date / Time: Unlimited, No changes after first pick, or any numeric change limit.
- New Manage Games questions default to Unlimited until lock; existing questions keep their saved MaxChanges until edited.
- Bumped frontend/service-worker assets to v325 and added runtime/static regression coverage for the startup path, atomic reorder, and pick-change controls.

## v1.2.16 — Game Startup Performance Hotfix

- Removed duplicate CategorySettings rebuilds during game startup by reusing the per-game settings cache.
- Cached the normalized QuestionId → GameId compatibility map and per-execution DataIndex reads so project growth no longer forces repeated global sheet scans for every game.
- Added a compact per-game live K/P probability cache and skipped External Results Hub reads when probability display is disabled.
- Added game-startup performance regression coverage.

## v1.2.16 — Awards Manager Mobile Workflow

- Reworked Awards Manager into four collapsible, task-focused sections with clearer section-specific help.
- Replaced the bulky event workspace with a compact Question → Advanced Settings → Markets / Answers editor.
- Added mobile card layouts, touch-friendly up/down ordering, and desktop drag/drop ordering for staged Awards questions.
- Added provider category choices populated from returned event data, a single Check All/Clear toggle, smaller Load More control, and moved Load Selected Events & Questions to the end of the event section.
- Added overall build progress plus per-question Building/Built/Error status; Build All now skips questions already built. The page must remain open while the current client-driven batch runs.
- Player pick cards now explicitly show that a saved Awards pick can be changed until lock (or show the remaining change count).
- Clarified Play Type behavior: non-Hybrid games control the scoring type; Hybrid games allow per-question overrides.
- Added question up/down ordering controls to Manage Games using persisted category DisplayOrder. Nominee/answer reorder is deferred until the legacy/normalized storage compatibility path can be made migration-safe.
- Bumped browser/service-worker assets to v324 for the Awards mobile workflow.


## v1.2.16 — Awards Batch Builder Runtime Hotfix

- Fixed `optionPayload is not defined` in normalized question projection during Awards batch creation.
- Preserved question-level odds on synthetic admin anchors and per-answer odds on option rows.
- Added executable regression coverage for the failing runtime path.

## v1.2.16 — Fall Production Hardening

- Awards Manager Batch Builder: reorganized Awards setup into Game & Source Setup → Find & Select Events → Configure & Build Questions.
- Official Website, target game, default Text/Compact/Image display, probability visibility, pick-change limit, section, points, and starting order now live in Section 1.
- Search results support Check All/Clear checks, inline View Event, and a provider Market Grid popup.
- Multiple selected events load into one editable question grid before any questions are created.
- Each loaded question can independently edit wording, section, points, display order, display style, play type (Hybrid), changes, and probability visibility.
- Every provider market/answer has separate Include and Show Odds switches plus an editable answer label. Disabled answers are excluded from both nominee creation and External Results Hub mappings.
- Single multi-outcome markets can now include only selected outcomes rather than forcing every provider outcome into the game.
- Player K/P probabilities honor question-level and per-answer visibility settings while market/wager data remains stored.
- Restored inline linking of an individual provider market to an existing Awards App question.
- Bumped browser/service-worker assets to v323 for the Awards batch-builder workflow.
- Hotfix: Awards Manager workflow now supports selecting multiple provider events and adding them to one target game, with one question created per selected event.
- `View Event` now expands the Build/Link workspace directly under the selected event card.
- Awards target games show their Game Type; Prediction, Confidence, Staked, Wager, and Hybrid question scoring now follows the target game, while Hybrid can select the scoring mode per question.
- New Awards-created pick questions default to unlimited changes until lock, with explicit 0/1/2/3/5-change options.
- Fixed the deferred Season Survivor placeholder so it is emitted only for actual Reality TV games.
- Kalshi/Polymarket answer probability labels are compact `K` / `P` badges.
- Awards Wager questions convert provider probabilities to decimal wager odds and persist them per answer through normalized storage.
- Ranking can be configured in Awards Manager but remains flagged as in development until the generic Ranking engine is completed.
- Bumped browser/service-worker assets to v322 for the Awards workflow hotfix.
- Hotfix: Awards Manager now supports an Official Website URL as the preferred result/reference source while preserving Kalshi/Polymarket for market data.
- Kalshi settlement-source URLs and provider resolution URLs are used to auto-fill the official source when they point to a non-provider website; admins can override/paste the official awards/results page manually.
- Created Awards questions store both official and provider source URLs plus an explicit source priority (`official → provider → manual`) for review-first settlement.
- Bumped browser/service-worker assets to v321 for the Awards official-source hotfix.
- Hotfix: Awards Manager `View Event` now visibly opens the Build/Link workspace instead of updating a section below the search-results list with no navigation feedback.
- `View Event` now shows a loading state, scrolls/focuses the event workspace immediately, and surfaces provider-event load errors where the admin lands.
- Hotfix: Home/Active Games cards now calculate real per-user completion instead of returning a hard-coded 0%.
- Home progress supports Prediction, Confidence, Staked Prediction, Head-to-Head, Wager, Racing Wager, and Hybrid games.
- Season hubs and unfinished generic Ranking/Survivor modes no longer display a misleading 0% progress bar.
- Added centralized GET/POST API authorization with automatic protection for all `admin...` actions.
- Player-owned routes derive identity from the authenticated session and reject browser-supplied username impersonation.
- Moved login/signup/PIN reset, player writes, notification preference writes, and league-management writes to POST.
- Added automatic authenticated-session attachment in the frontend API layer.
- Added versioned salted HMAC-SHA256 PIN storage with legacy in-place migration.
- Added hashed persisted session-token storage with legacy compatibility/migration.
- Added login-failure and PIN-reset request throttling plus session revocation on reset/deactivation.
- Normalized legacy `Active` and `AccountStatus` behavior.
- Improved dashboard completion text to surface remaining picks/wagers.
- Replaced stale historic cache-marker test assertions with a current-release contract.
- Added `tools/run_production_checks.sh` and GitHub Actions CI.
- Archived historical root release notes instead of deleting them.
- Bumped browser/service-worker assets to v320 for the Awards Manager View Event UX hotfix.

## v1.2.15 — Awards Manager true event search

- Provider search now discovers events directly with pagination rather than grouping a sampled market batch.
- Added Kalshi event-catalog pagination, Polymarket public-search pagination, Load More Events, advanced provider/category/scope/closing/sort filters, and exact phrase mode.
- Event cards and opened markets include richer provider context and source links.
- Question creation reloads the selected event independently so search-page limits do not cap available answers.

## v1.2.14 — Awards Manager event-first selection

- Search results are grouped as provider events and `View Event` loads all current event markets.
- Admin can select multiple live markets as answers, edit answer labels, and create one Awards App question from the selected event.
- Hub mappings remain administrator-reviewed with automatic settlement disabled.

## v1.2.13 — Awards Manager grouped question creation

- Added batch answer creation and Awards Manager single-market Hub mapping jobs.
- Multiple related provider markets can become one Awards App question with one mapped answer per market.

## v1.2.12 — Awards Manager initial app workflow

- Added Admin Awards Manager with Kalshi/Polymarket search, create/link question flows, probability context, and External Results Hub mapping.
- Auto-settlement is forced off and administrator review is required.

## v1.2.11 — External Results Hub Mapping Manager

- Added an app-side Mapping Manager for reviewing and maintaining External Results Hub mappings with the required container UI scope.

## v1.2.10 — External Results Hub provider discovery limits

- Added safer provider-discovery boundaries so broad Kalshi/Polymarket discovery remains administrator-driven while mapped-result polling stays focused.

## v1.2.9 — Reality TV approval completion race fix

- Hardened completion-state handling around long-running Reality TV approvals so the saved final state wins over stale browser progress.

## v1.2.8 — External Results Hub end-to-end reliability

- Added Reality TV Inbox reconciliation so native Reality approvals move Hub batches from `STAGED_REALITY` to `APPLIED`, while rejected/native-error states remain explicit and duplicate-safe.
- Added persistent native route/queue/status fields to `ExternalResultsInbox` and an Admin **Sync Reality Status** control.
- Reuses an existing Reality native queue for the same Hub review and blocks conflicting duplicate results.
- Restricts native Reality routing to `manual-reality-tv`; Kalshi/Polymarket remain prediction-result providers.
- Made provider-result dedupe stable across changing provider timestamps.
- Added deterministic delivery IDs when a manual AppMappings row has no MappingId.
- Added mapped-only Kalshi/Polymarket sync plus an optional hourly mapped-result watch; broad provider sync remains manual discovery only.
- Hardened Kalshi settlement parsing so blank/null settlement values cannot be mistaken for `No`, with historical-market fallback for older settled mapped markets.
- Hub Health Check now reports mapped target counts and provider-watch installation state.
- Automatic inbound apply remains OFF and administrator review remains mandatory.
- Bumped browser/service-worker assets to v313.

## v1.2.7 — External Results Inbox result-row cleanup

- Fixed a CategoryResults double-write path where the External Results Inbox first wrote the complete nominee result set and then `adminUpdateCategory` rewrote the winner row a second time.
- Added an internal `skipCategoryResultWrite` guard so category/settings state can be updated without overwriting the authoritative Hub-import result row.
- Added scoped CategoryResults deduplication after a successful Awards/prediction settlement; duplicate legacy rows for the same GameId + CategoryId + NomineeId keep only the newest result row.
- Preserves Hub provenance, ResultValue, ImportedResultId, ReviewId, and DeliveryBatchId consistently on both winner and non-winner rows.
- Fixed the shared Admin action-progress race that could leave a completed fast request showing `Starting…` indefinitely.
- Automatic inbound apply remains OFF. Reality TV staging and Sports/Racing separation are unchanged.
- Bumped browser/service-worker assets to v312.

## v1.2.6 — External Results Inbox validation and safe apply

- Added a generic External Results Inbox validator for approved Hub deliveries.
- Restricted inbound providers to Manual Awards, Manual Reality TV, Kalshi, and Polymarket; Sports/Racing are explicitly rejected.
- Requires FINAL results, complete nominee mapping coverage, valid nominee IDs, and a non-conflicting local settlement before apply.
- Added idempotent duplicate detection so a matching already-settled category is confirmed without writing duplicate results.
- Awards and prediction-market deliveries apply through the normal `CategoryResults` + category settlement path.
- Reality TV Extra Questions stage into `RealityQuestionResultQueue`; elimination results stage into `RealityResultQueue` so the durable Reality TV finalizer remains authoritative for roster and next-episode changes.
- Added asynchronous Hub acknowledgement after a generic Awards/prediction result is applied.
- Added a main Admin `External Results Inbox` card with Refresh, Validate Ready, Apply Validated, and Retry Errors controls.
- Automatic inbound apply remains OFF until production inbox routing is verified.
- Bumped browser/service-worker assets to v311.

## v1.2.5 — Reality TV historical settled-result display

- Historical Reality TV questions now read authoritative settled results from `CategoryResults`.
- Added full `winnerNomineeIds` support so every winner is shown for multi-winner questions.
- Added result-scoped overlays/badges for WINNER, SAFE, IMMUNITY, REWARD, IDOL, TRIBAL, BOTTOM, and other Reality TV outcomes.
- Kept elimination as grayscale + ELIMINATED overlay, but only on the actual elimination question/result.
- Removed the old episode-level elimination shortcut that incorrectly grayscaled a contestant across every question in the episode.
- Historical question headers now list all settled winners instead of only the first winner.
- Multi-winner user picks are evaluated against every valid winner in the player UI.
- Result decoration is scoped to Reality TV startup so Sports/Awards startup paths do not gain an extra CategoryResults read.
- Bumped browser/service-worker assets to v310.

## v1.2.4 — Durable Reality TV approval watchdog

- Replaced all-at-once Extra Question settlement with one durable question per worker pass.
- Added persisted Extra Question completed/total/current-question checkpoints.
- Added a separate `SCORE_QUESTIONS` stage so score recalculation cannot hide inside the settlement batch.
- Added a fast ~10-second continuation trigger backed by a persistent one-minute watchdog.
- Stale APPROVING rows are automatically reclaimed instead of disappearing from the server work queue.
- Approval freshness now uses the approval heartbeat rather than unrelated row updates.
- Reopening a legacy stalled v1.2.2/v1.2.3 approval upgrades and requeues it automatically; no Reset is required.
- Next-episode continuation also uses a persistent watchdog and one durable stage per invocation.
- Recovery controls are emergency-only; normal workflow remains one-click and set-and-forget.

## v1.2.3 — External Results Hub Reality TV complete mirror

- Mirrors every built Reality TV Extra Question as its own verified Hub market with answer mappings.
- Removed the remaining synchronous Hub writes from Extra Question submission and approval.
- Added create-before-update dependency ordering so review updates cannot outrun their result/review creation.
- Added main elimination market resolution updates and schedule propagation to every episode market.
- Deactivates stale supplemental markets/mappings after episode-only question removal.
- Added per-season Reality TV Hub mirror health and smarter Repair / Retry Failed handling.
- Automatic Hub-to-App inbox settlement remains disabled for the next controlled phase.

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



## v1.2.16 Question Drag / Order Reliability Hotfix

- Replaced slow per-question reorder writes with one canonical ordered-list save.
- Added handle-based desktop drag/drop and simpler mobile position controls in Manage Games and Awards Manager.
- Removed redundant `/ total` position text and the separate Move button.
- Added batch CategorySettings DisplayOrder persistence and regression coverage.

## v1.2.16 Sports ESPN Cloudflare Proxy Hotfix
- Secured the ESPN Pages Function with an encrypted `SPORTS_PROXY_TOKEN` and matching Sports Engine request header so the endpoint cannot be used anonymously to consume the free quota.
- Routed Sports Scores Engine ESPN requests through a locked-down Cloudflare Pages Function when `SPORTS_ESPN_PROXY_URL` is configured.
- Covered scoreboard, player roster/game stats, and advanced-stat ESPN transport.
- Preserved direct ESPN as a fallback and disabled proxy response caching for live data.

## v1.2.16 Sports ESPN CDN fallback
- Added secure Cloudflare fallback from blocked `site.api.espn.com` date-scoped NFL/MLB scoreboards to ESPN's real-time `cdn.espn.com` scoreboards.
- Added CDN `content.sbData.events` parsing in Sports Scores Engine.
- Season builders remain fail-loud and are not silently substituted with current-day data.

## v1.2.16 Sports Wager Setup Destination Hotfix
- Fixed the Sports admin wager destination lookup so wager-enabled games in Setup can receive their first Sports wager before production preflight.
- Preserved Preview/Live and legacy Active destinations while continuing to exclude Draft and Archived games.
- Added lifecycle status to the Sports destination picker and regression coverage for the bootstrap workflow.

## v1.2.16 — Sports Confidence Builder Scope UI Hotfix
- Fixed Sports Builders scope fields so Date Range is hidden for League Week and vice versa.
- Clarified that only the selected Load By fields are required.
- Frontend-only; no backend behavior changed.

## v1.2.16 — Sports Wager Create / Preflight Hotfix
- Removed automatic Sports Scores Engine refresh from wager creation to avoid false update-lock errors.
- Restored Sports metadata projection into admin game setup so Run Check sees SportsGameId / ESPNEventId.
