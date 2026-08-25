# PATTC Predicts v1.2.19-rc4 — Cache Persistence Certification

Live RC3 testing passed Home/Admin and warm game navigation, but after ten minutes standard games returned to ~14 seconds and Reality TV to ~18 seconds. The browser fast-page snapshot had a hard ten-minute maximum and the shared Apps Script caches were also cooling in the same window.

RC4 keeps the existing ten-minute DOM-snapshot safety bound, but adds a bounded device startup-payload cache that re-enters the normal renderer immediately and refreshes server data quietly. It also lengthens only caches with explicit write invalidation. No game/scoring behavior and no recurring trigger are added.

Production acceptance test: open a standard and Reality TV game, wait at least 10 minutes without reopening them, then reopen both. The page should paint from the device startup payload immediately while server refresh occurs in the background.
