# Ranking Sheet Initialization Hotfix v1.2.18w3

Fixes a first-open race in standalone Ranking games where concurrent page/API requests could both see `RankingEntries` as missing and both call `insertSheet("RankingEntries")`. Google Sheets then rejected the second request with `A sheet with the name "RankingEntries" already exists.`

The initializer now uses the Apps Script script lock, re-checks for the sheet after obtaining the lock, and defensively reuses the existing sheet if another execution wins the final creation race. Existing `RankingEntries` data is preserved; the hotfix does not delete or recreate the sheet.
