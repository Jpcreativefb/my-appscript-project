# PATTC Sports Scores Engine v48 Production Hardening

Built from the exact Sports Scores Engine v47 source supplied on Aug. 25, 2026.

## Root causes fixed

1. **Google Sheets 10,000,000-cell failure**
   - Production workbook reached 9,999,993 allocated cells.
   - SportsLogs alone had 172,877 rows x 26 allocated columns while only 5 columns contained data.
   - Adds 6-hour workbook maintenance, diagnostic-log retention, blank grid trimming, capacity reporting, and a 90% checkpoint capture safety guard so nonessential checkpoint writes cannot take the whole engine down.
   - Trimmed sheets can automatically re-expand if a future schema needs more columns.

2. **Odds refresh lock failure**
   - High-level odds refreshes hold a ScriptLock.
   - Odds API logging tried to acquire the same ScriptLock again while creating/checking SportsOddsApiLog, causing `Could not lock script while setting up sheet: SportsOddsApiLog` after a provider request.
   - Header/log setup now uses a separate DocumentLock.
   - API logging is best-effort; a logging failure can no longer turn a successful paid odds response into a failed odds refresh.

3. **Odds limits silently stopped leagues**
   - Legacy defaults were 1 refresh/day and 30/month.
   - v48 defaults are 5/day and 100/month.
   - A one-time migration upgrades only legacy 1/30 rows, preserving later admin choices.
   - Provider-wide safety cap remains in place.

4. **Late-night game date mismatch**
   - Score and odds date keys were slicing UTC ISO dates, so Chicago evening games could be filtered as the following day while the UI displayed the prior local date.
   - Date filtering and odds matching now format timestamps in the spreadsheet/script timezone (America/Chicago in this project).

## Production safety

- No score, player-stat, team-stat, or checkpoint history is deleted by routine maintenance.
- SportsLogs keeps the newest 20,000 data rows.
- SportsOddsApiLog / OddsApiLog keep the newest 5,000 data rows each.
- At 90% workbook capacity, new checkpoint capture pauses rather than allowing the spreadsheet to hit the 10M hard limit. Scores and odds can keep operating.
- Admin dashboard API now exposes workbook capacity status.

## Validation

- All Sports Engine JavaScript files pass `node --check`.
- 14 v48 regression/static safety checks pass.

## Post-deploy verification

1. Load Sports Engine Controls.
2. MLB Odds should show the migrated daily/monthly limits and no SportsOddsApiLog lock error.
3. Run one MLB odds refresh.
4. Reload Sports Scores & Game Builder with an Aug. 25–26 range; visually Aug. 24 local games should no longer leak into the Aug. 25 filter because of UTC date slicing.
5. Starting-pitcher display is not stored by this Sports Engine source. If pitchers remain TBD after current data refresh, that is a separate Awards App builder/probable-pitcher integration path and should be patched there, not guessed into this engine.
