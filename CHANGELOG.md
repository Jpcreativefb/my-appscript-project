# Changelog

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

