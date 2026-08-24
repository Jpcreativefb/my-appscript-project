# PATTC Predicts v1.2.18x2b — Fast Navigation + Batched Picks

Production-safe rebuild of x2 against the exact v1.2.18x1b baseline.

- Keeps the v1.2.18x1b lock/contention recovery.
- Standard prediction picks select immediately and synchronize in batches.
- Batch save uses indexed game rows instead of the normal full Picks-sheet scan.
- Warm Picks cache is kept coherent rather than discarded after each answer.
- Home/hub snapshots are account-scoped and persisted briefly for fast return navigation.
- Awards live market probabilities hydrate after the core Picks page is available when the external-price cache is cold.
- Game appearance no longer hides playable questions behind a Loading game style screen.
- Exact live Reality v4 / Team Fantasy / prior cache markers are preserved.

x2b changes installer strategy only: backend/page-performance changes use the validated core patch, while app-shell cache/version changes are applied surgically to the exact live x1b files.
