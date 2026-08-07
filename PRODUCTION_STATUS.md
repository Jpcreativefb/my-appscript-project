## Reality TV historical results completed in v1.2.5

- Historical Extra Questions display their settled result directly on the matching answer card.
- Multiple winners are preserved and rendered instead of collapsing to the first winner.
- Elimination grayscale/overlay is scoped to the elimination result and no longer bleeds into immunity, reward, safety, or other questions.
- The player startup payload reads authoritative Reality TV resolutions from CategoryResults without adding that read to non-Reality startup paths.

# Production Status

Current candidate: **v1.2.4 durable Reality TV approval watchdog**

- One Extra Question settles per durable server pass, with a checkpoint saved after every question.
- A separate score-recalculation stage runs after all Extra Questions are settled.
- Fast ~10-second continuation is backed by a persistent one-minute watchdog.
- Killed Apps Script executions are automatically reclaimed from their last durable checkpoint.
- Legacy stalled v1.2.2/v1.2.3 approvals self-upgrade when their status is polled after deployment.
- Reset/Resume is no longer part of normal operation; **Force Recovery** is emergency-only.
- Current episode finalization remains independent of next-episode preparation and External Results Hub work.
- Backend and frontend deployment required; separate Hub Apps Script deployment is not required.
- 65 regression test files and 178 JavaScript syntax checks passed before packaging.

---

# Production Status

Current candidate: **v1.2.3 External Results Hub Reality TV complete mirror**

- Every built Reality TV Extra Question mirrors to the Hub as a separate market with verified mappings.
- Extra Question result submission and approval now use only the verified local outbox; no synchronous Hub spreadsheet calls remain in those paths.
- Review updates wait for their matching create dependency without burning retry attempts.
- Main elimination and Extra Question markets receive resolution updates after local approval.
- Episode schedule changes propagate to all Hub markets for that episode.
- Removed Extra Questions deactivate stale Hub mappings/markets rather than leaving them active.
- Reality TV Manager shows current-episode Hub mirror completeness.
- `Repair / Retry Failed` retries valid jobs and archives only irreparable legacy dependency errors.
- Automatic inbound settlement remains disabled.
- Awards App backend and frontend deployment required; separate Hub Apps Script deployment is not required.
- 64 regression test files and 177 JavaScript syntax checks passed before packaging.

---

# Production Status

Current candidate: **v1.2.2 set-and-forget Reality TV episode finalizer**

- One master approval settles all submitted Extra Questions and the main elimination.
- The browser no longer owns normal episode finalization; a server continuation worker does.
- The current episode becomes FINAL before the next episode is prepared.
- `RealityNextEpisodeJobs` prepares the next episode separately using the bulk question materializer.
- Temporary lock / Google Sheets failures automatically retry up to five times.
- External Results Hub bridge v1.2.1 remains asynchronous and verified.
- Backend and frontend deployment required; Hub script deployment is not required for v1.2.2.
- 63 regression test files and 176 JavaScript syntax checks passed before packaging.

---

# Production Status

Current candidate: **v1.2.0 External Results Hub queued bridge**

- Reality TV bulk question materializer from v1.1.18 retained.
- Hub writes removed from the Reality TV approval critical path.
- Outbound queue, retries, health status, and inbound staging are implemented.
- Automatic inbound settlement and Awards Show Manager remain the next phase.

# Production Status

Current production candidate: **v1.1.18**

Reality TV next-episode Extra Questions are now compiled and written in one bulk pass instead of being built one question at a time. Approvals remain serialized across seasons, use real server checkpoints, and can safely retry the idempotent bulk materializer after temporary Google Sheets or lock failures.

## v1.1.18 release readiness

- Backend and frontend deployment required.
- 60 regression test files passed.
- 155 JavaScript files passed syntax validation.
- Complete `PRODUCTION_SMOKE_TEST_V1_1_18.md` after deployment.
- External Results Hub remains separate and must not block local episode readiness.

---

# Production Status

Current production candidate: **v1.1.17**

Reality TV main-elimination approvals now run through one serialized server queue. Progress is based on saved checkpoints rather than simulated movement, so percentages do not move backward and a second show displays **Waiting for another approval** instead of silently competing for the shared sheets. Approval-owned Extra Question builds no longer contend with the generic question worker.

## v1.1.17 release readiness

- Backend and frontend deployment required.
- 59 regression test files passed.
- 154 JavaScript files passed syntax validation.
- Complete `PRODUCTION_SMOKE_TEST_V1_1_17.md` after deployment.
- Reset the currently stale Survivor approval after the active MasterChef approval finishes.
- External Results Hub connection remains the next planned phase after local approval timing is verified.

---

# Production Status

Current production candidate: **v1.1.16**

Reality TV approvals now expose visible, resumable progress through settlement, next-episode creation, Extra Question building, finalization, and readiness. The interface shows elapsed time, an approximate remaining-time estimate, per-question build counts, and a stalled warning instead of leaving administrators with only `Progress: QUEUED`.

## v1.1.16 release readiness

- Backend and frontend deployment required.
- 58 regression test files passed.
- 166 JavaScript files passed syntax validation.
- Complete `PRODUCTION_SMOKE_TEST_V1_1_16.md` after deployment.
- External Results Hub connection remains the next planned Reality TV phase.

---

# Production Status

Current production candidate: **v1.1.15**

Reality TV approvals can now be reset safely by stage. Unexpected double or larger eliminations settle every eliminated contestant as a winning answer. Main-elimination approval automatically creates the next episode and inherits the season's Extra Question defaults, while **Update This Episode Only** supports one-off changes without altering future episodes.

## v1.1.15 release readiness

- Backend and frontend deployment required.
- 57 regression test files passed.
- 165 JavaScript files passed syntax validation.
- Complete `PRODUCTION_SMOKE_TEST_V1_1_15.md` after deployment.
- External Results Hub connection remains the next planned Reality TV phase.

---

# Production Status

Current production candidate: **v1.1.14**

Reality TV episode voting now supports tribe-restricted full-round entry with an explicit outside-voter exception. Main and supplemental approvals use short stage claims plus retryable spreadsheet operations, eliminating the self-created global-lock timeout. All Show Format & Episode Questions sections start collapsed.

## v1.1.14 release readiness

- Backend and frontend deployment required.
- 56 regression test files passed.
- 151 JavaScript files passed syntax validation.
- Complete `PRODUCTION_SMOKE_TEST_V1_1_14.md` after deployment.
- External Results Hub connection remains the next planned Reality TV phase.

---

# Production Status

Current production candidate: **v1.1.13**

Reality TV action buttons now run with inline progress and no full-screen 4% admin overlay. Backend remains v1.1.12-compatible.

# Current Production Candidate: v1.1.12

# Production Status

## Current release

Reality TV Results, Votes, and Schedule Resilience v1.1.12. This release includes the v1.1.11 manual-result improvements and the v1.1.12 episode vote and schedule controls.

## Feature readiness

| Area | Feature completeness | Production readiness | Main remaining work |
|---|---:|---:|---|
| Core games and Game Setup | 89% | 77% | Live regression, repair diagnostics, final UI consistency |
| Fixed/confidence/staked/hybrid scoring | 89% | 80% | High-volume tests and settlement audit |
| Reality TV Manager | 99% | 96% | Live deployment smoke test and External Results Hub queue |
| Reality TV player experience | 97% | 91% | Device testing, accessibility review, and live vote-history validation |
| Sports platform | 82% | 68% | League-specific production testing and timeout reduction |
| Archives/career history | 78% | 68% | Restore verification and larger archive testing |
| External Results Hub | 72% | 58% | Common queued bridge, provider polling, repair/retry dashboard |
| Awards Manager | 0% | Foundation available | Deliberately deferred until the shared Hub queue is stable |

## Reality TV results, votes, and scheduling completed in v1.1.12

- Manual result work remains inside the expanded season and advances to the next unresolved question.
- Supplemental questions support one winner, multiple winners, and push/no-result settlement.
- Unexpected multiple eliminations push the original single-choice prediction while removing every selected contestant.
- Episode Vote Details stores and displays valid, nullified, unrevealed, lost, abstained, extra, and revote ballots.
- Players see vote tallies and who voted for whom only after an episode is finalized.
- Episode schedules support Scheduled, Delayed, Rescheduled, and TBA states.
- Administrators may move one episode or shift every later open episode, including episodes created in the future.
- Schedule edits preserve permanent episode IDs, questions, picks, results, vote history, and contestant history.
- TBA episodes keep their questions and remain open until a replacement date is saved.

## Remaining Reality TV production step

Deploy v1.1.12 and complete `PRODUCTION_SMOKE_TEST_V1_1_12.md`. After that, connect the queued External Results Hub workflow and then begin the Awards Show Manager.

## Reality TV Extra Questions finalized in v1.1.9

- Each season now stores and loads only presets that match the selected show format; custom questions remain season-specific.
- Save, Build, and Verify operations remove stale cross-theme preset rows without touching custom templates.
- A selected build job uses its saved question list as the source of truth and no longer re-skips a selected item because of an older `Enabled` value.
- New builds advance immediately on the server and schedule a one-time continuation trigger when work remains, so a closed browser does not leave a job permanently at `BUILD_LOCAL 0/N`.
- The manager has one master current-episode status control showing episode creation, main elimination linkage, selection, insertion, answer verification, and final local readiness.
- Every preset and custom question displays Available, Needs Build, Building, Needs Verification, Needs Attention, or Ready in Episode.
- Saving a custom question automatically enables and inserts it into the current episode; custom templates can now be deleted individually.
- Custom deletion removes the current episode copy only when no saved picks, wagers, or results depend on it; played history remains preserved.
- Local readiness does not wait for External Results Hub mappings. Hub synchronization remains the next production phase.




## Reality TV episode recovery and custom questions completed in v1.1.8

- Missing current `RealityEpisodes` rows are repaired automatically by Save & Build, Verify & Repair, and custom-question creation.
- Existing Game Setup lock times are preserved during repair, including episodes less than an hour from lock.
- Sole Survivor can resolve an open current period from the main game question when the normalized episode row is absent.
- Each weekly question now has a real collapsible body, and successful saves collapse and advance correctly.
- Custom Questions clearly supports multiple saved questions, roster/group/merge-aware/Yes-No/manual answer sources, judges and special choices, and a live answer preview.

## Reality TV Survivor and comparison completed in v1.1.7

- The Sole Survivor image and biography preview update immediately when a player chooses a contestant.
- Finalized active picks cannot be switched; the selector returns only after elimination.
- Eliminated picks remain visible in grayscale with an ELIMINATED overlay until replacement.
- Survivor statistics are condensed, and portrait containment prevents leaderboard overlap.
- The most recently locked episode exposes a group comparison grid for Survivor Picks and weekly answers.
- Verify & Repair Extra Questions validates the actual game category, episode-question row, and expected answers.
- Weekly pick saves use cached settings and retain the collapse/advance player flow.

## Reality TV player flow completed in v1.1.6

- Episode-question builds now finish all local questions and answers before optional External Results Hub mappings.
- Resume Build is a recovery action and continues from the saved question index without duplicating completed questions.
- Season Survivor Pick loads in its reserved position immediately after the score area and no longer waits behind weekly statistics.
- Reality TV Manager now controls whether picks may change before lock, the maximum changes, and any penalty.
- Blank maximum changes defaults to unlimited changes before lock.
- Pick saves use a shorter lock, one row write, and targeted cache clearing instead of full application cache invalidation.
- Reality TV questions collapse and advance after a successful save, unused counters stay hidden, and long mobile titles wrap correctly.
- The page progress bar now advances while a long request is still running instead of remaining at one percentage.

## Platform image delivery completed in v1.1.5

- All current dynamic images in the main frontend use one shared rendering helper.
- Off-screen images wait until they approach the viewport instead of loading every contestant, nominee, player, and logo at once.
- The default browser mode is free and requires no Images subscription, R2 bucket, Worker, or custom domain.
- Permission-cleared images can be compressed locally into small WebP variants and served as free Cloudflare Pages static assets.
- Existing external URLs remain compatible and fall back to the original source when an optimization attempt fails.
- This release improves browser rendering and bandwidth; it does not replace the separate Apps Script payload and Hub timeout work.

## Reality TV production repair completed in v1.1.1

- Initial episode question packs are built in resumable stages after the main exit question and its roster are safely created.
- Manage Games preflight can repair missing Reality TV questions and answers and then rerun the activation check.
- Participant tribe/team/group changes are stored by effective episode instead of overwriting history.
- Group-based gameplay uses the assignment active during each historical episode.
- An administrator-controlled individual-play episode switches hybrid group/participant questions after merge.

## Production hardening completed in v1.1.0

- Page JavaScript is loaded by route instead of loading every player and admin module at startup.
- Initial parsed JavaScript was reduced from approximately 1,003,575 bytes to 96,278 bytes.
- Admin page loads use a gold progress bar with a descriptive current step.
- Player page loads use a gold progress bar with a small percentage only.
- Reality TV Admin initially loads season summaries; full details load only when one season is expanded.
- Reality TV user payloads use a short cache to make repeated game/page navigation faster.
- Pick saving uses an exact indexed row lookup instead of scanning the complete Picks sheet.
- Pick question/category metadata uses existing application caches.
- Common admin help popups and save progress states are progressively applied across admin pages.
- The service worker cache was reset and reduced to the core application shell.
- Old release notes and reports were moved to `docs/archive/releases`.
- Automated tests remain in `tests`; they do not affect the deployed browser or Apps Script runtime.

## Next production priorities

1. Deploy and complete the live smoke test checklist.
2. Measure Apps Script execution times from the Executions dashboard.
3. Convert External Results Hub synchronization into queued, resumable jobs.
4. Add persisted Reality TV weekly-stat snapshots at settlement if first-load scoring remains slow with a large user base.
5. Complete Sports admin/page payload splitting using the same summary/detail pattern.
6. Build the Awards Manager only after the shared Hub queue is stable.

