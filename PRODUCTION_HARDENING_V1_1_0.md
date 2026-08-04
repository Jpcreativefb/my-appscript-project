# Production Hardening v1.1.0

## Goals

This release pauses new feature development and focuses on speed, reliability, consistent administration, and understandable loading/saving feedback.

## Frontend performance

### Route-based module loading

The previous `app.html` loaded every page script before the first page appeared, including the large Admin, Game Setup, Reality TV, and Betting modules. The application now loads only core files at startup and retrieves a page module when its route is opened.

Measured local script bytes referenced by `app.html`:

- Before: 1,003,575 bytes
- After: 96,278 bytes
- Reduction: approximately 90.4%

Loaded modules remain in the browser and are reused when switching back to the page.

### Role-aware loader

- Admin: gold progress bar, percentage, and descriptive loading step.
- Player: gold progress bar and small percentage only.

### Service worker

The cache version is `awards-app-v300-production-hardening`. Only the core shell is prefetched. Route assets are cached by the existing network-first fetch handler after they are used.

## Backend performance

### Reality TV Manager

`adminGetRealityTvDashboardSummary` reads normalized tables once and returns lightweight season counts. `adminGetRealityTvSeasonDetails` loads one expanded season with its contestants, groups, episodes, review queues, question templates, build state, and Season Survivor settings.

### Player Reality TV view

The assembled user Reality TV presentation/statistics payload is cached briefly. Repeated page switching no longer recalculates the complete season immediately every time.

### Pick saving

`PicksRepo.findPick` uses:

1. A validated exact-row cache.
2. The normalized `DataIndex` game row list.
3. A targeted category TextFinder fallback.

The save flow no longer begins by loading the entire Picks sheet. Category settings and question data also use the existing application caches.

## Common admin experience

The shared `adminUi.js` progressively adds:

- Game Manager-style `?` help popups to admin fields that do not already have help.
- Standard action-button processing, success, and error colors.
- A progress bar and operation message beside save/build/sync/import/approval buttons.
- Consistent collapsible-section classes.

Existing specialized progress implementations are preserved.

## Repository cleanup

Old version notes, changed-file lists, and test reports are under `docs/archive/releases`. Current operating documents remain in the project root. Tests remain under `tests` because they are not loaded by the production app and are needed to prevent regressions.

## Deployment

1. Replace the project with the complete release or copy the changed files.
2. Run `clasp push -f`.
3. Deploy a new version of the existing Apps Script web app.
4. Commit and push the frontend to GitHub.
5. Wait for Cloudflare Pages to finish.
6. Hard-refresh the application.
7. Complete `PRODUCTION_SMOKE_TEST_V1_1_0.md`.
