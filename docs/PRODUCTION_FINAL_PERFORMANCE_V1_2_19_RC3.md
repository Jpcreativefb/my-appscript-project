# PATTC Predicts v1.2.19-rc3 — Final Performance Certification

Measured after RC2:

- Home: 1s
- Standard game: 10s; `getStartupPayload` 7.52s
- Admin: 9s; `adminSummary` 7.01s; overlapping `getDashboardGamesHub` observed at 15.45s
- Reality game: 18s; `getRealityTvPlayerStats` previously measured around 16s
- Home archive/profile history background request measured at 32.03s

RC3 keeps gameplay/scoring unchanged and moves these optional/read-heavy paths off the critical navigation path while adding bounded, invalidated caches for startup and user picks.
