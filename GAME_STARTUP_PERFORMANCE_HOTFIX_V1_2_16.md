# Awards App v1.2.16 — Game Startup Performance Hotfix

This hotfix targets the long pause near 90% when opening/switching games after the normalized question store and Awards batch builder increased the project data size.

## Changes

- `getCategories()` now reuses the existing per-game CategorySettings cache instead of rebuilding settings during a Categories cache miss and then rebuilding them again for saved picks.
- The normalized storage `DataIndex` is read once per Apps Script execution instead of once per entity lookup.
- The global QuestionId → GameId compatibility map is cached in ScriptCache and invalidated by the normal cache-clear paths, eliminating repeated full Questions/Categories scans on game startup.
- Live Kalshi/Polymarket probability enrichment now caches a compact per-game lookup for the normal cache TTL rather than reopening and rescanning the External Results Hub on every Picks load.
- When a question has market probability display disabled, startup skips the External Results Hub probability read entirely.
- Added regression coverage for all startup cache paths.

## Expected result

The core game payload should reach usable state much faster, especially after the first load, and app growth should no longer make every game switch repeatedly rescan global question storage. Live market probabilities remain available and refresh after the short cache TTL.
