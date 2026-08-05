# Current Production Candidate: v1.1.9

# Production Status

## Current release

Reality TV Extra Questions production-readiness workflow v1.1.9, including automatic format filtering, resilient local builds, current-episode readiness stages, safe custom-question deletion, the v1.1.8 recovery/custom workflow, and the v1.1.7 Survivor/comparison work.

## Feature readiness

| Area | Feature completeness | Production readiness | Main remaining work |
|---|---:|---:|---|
| Core games and Game Setup | 88% | 75% | Live regression, repair diagnostics, final UI consistency |
| Fixed/confidence/staked/hybrid scoring | 88% | 78% | High-volume tests and settlement audit |
| Reality TV Manager | 99% | 94% | Live deployment smoke test and the deferred External Results Hub queue |
| Reality TV player experience | 96% | 88% | Live save-duration measurement, device testing, and accessibility review |
| Sports platform | 82% | 68% | League-specific production testing and timeout reduction |
| Archives/career history | 78% | 68% | Restore verification and larger archive testing |
| External Results Hub | 72% | 58% | Common queued bridge, provider polling, repair/retry dashboard |
| Awards Manager | 0% | Foundation available | Deliberately deferred until reliability work is complete |


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
