# Current Production Candidate: v1.1.5

# Production Status

## Current release

Platform image engine v1.1.5, including Reality TV player fast startup v1.1.4 and production hardening v1.1.0.

## Feature readiness

| Area | Feature completeness | Production readiness | Main remaining work |
|---|---:|---:|---|
| Core games and Game Setup | 88% | 75% | Live regression, repair diagnostics, final UI consistency |
| Fixed/confidence/staked/hybrid scoring | 88% | 78% | High-volume tests and settlement audit |
| Reality TV Manager | 95% | 84% | Live repair/activation verification and Hub job separation |
| Reality TV player experience | 92% | 82% | Mobile/device testing and accessibility review |
| Sports platform | 82% | 68% | League-specific production testing and timeout reduction |
| Archives/career history | 78% | 68% | Restore verification and larger archive testing |
| External Results Hub | 72% | 58% | Common queued bridge, provider polling, repair/retry dashboard |
| Awards Manager | 0% | Foundation available | Deliberately deferred until reliability work is complete |


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
