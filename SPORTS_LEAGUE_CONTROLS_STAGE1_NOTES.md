# Sports League Controls Stage 1 — Safe Limits, Counts, Preview, Display Normalization

## Purpose

This is a safe Stage 1 patch for the Sports Scores Engine / Awards App sports controls.

It does **not** archive or delete rows yet. It adds the controls and visibility needed before archive execution is added.

## What changed

### 1. Per-league safety settings

`SportsSettings` now auto-adds these optional columns when Sports Controls are opened/setup:

- `Season`
- `OddsEnabled`
- `OddsCooldownMinutes`
- `OddsDailyMaxPulls`
- `OddsMonthlyMaxPulls`
- `ArchiveAfterDays`
- `KeepSnapshotsDays`
- `KeepLogsDays`
- `LastHealthCheck`

These settings are editable from Admin → Sports Engine Controls.

### 2. Smart automation now respects per-league odds limits

The Awards App smart automation now checks per-league odds settings before asking the Sports Scores Engine to refresh odds.

It will skip odds refresh for a league when:

- odds are turned OFF for that league
- odds cooldown has not passed
- daily odds max has already been reached
- monthly odds max has already been reached

Score refresh still uses the league pregame/live/final poll settings.

### 3. Collapsible league cards

The Admin Sports Controls league section now uses collapsible league cards.

Each league card shows:

- Scores ON/OFF
- Odds ON/OFF
- Season
- Pregame / live / final poll minutes
- Snapshot ON/OFF
- Odds cooldown and max pulls
- Archive/retention settings
- Live row counts
- Safe archive-preview counts

### 4. Health/counts dashboard

The Sports Scores Engine dashboard now returns league-level counts:

- live games
- live score rows
- live odds rows
- snapshots
- logs
- score rows ready for archive preview
- snapshots ready for cleanup preview
- logs ready for trim preview

### 5. Archive preview only

Added archive preview support for each league.

Important: this is preview only. It does not move, delete, or archive rows.

### 6. Record and clock normalization

The Sports Scores Engine now normalizes score rows before writing them to `SportsScores`:

- rejects bad date/time values in `HomeRecord` / `AwayRecord`
- keeps only W-L or W-L-T style records
- formats final games as `Final` or soccer `FT`
- formats pregame as `Pregame`
- gives baseball safer inning/live labels instead of bad clocks

Also added an Admin button:

- `Repair Records / Clocks`

This repairs existing bad `SportsScores` record/clock values without calling ESPN.

## Install order

1. Update/deploy Sports Scores Engine files:
   - `external-engines/sports-scoring-engine/src/SportsScoresEngine.js`
   - `external-engines/sports-scoring-engine/src/SportsAdminControls.js`

2. Update/deploy Awards App backend files:
   - `backend/Api.js`
   - `backend/engines/SportsAdminBridgeEngine.js`
   - `backend/engines/SportsWagerEngine.js`

3. Update/publish frontend files:
   - `frontend/js/api.js`
   - `frontend/api.js`
   - `frontend/js/pages/admin.js`

## Testing

### Test 1 — Open controls and add columns

1. Open the app.
2. Go to Admin → Sports Engine Controls.
3. Click `Open Sports Controls`.
4. Check `SportsSettings` in the Sports Scores Engine sheet.
5. Confirm the new columns were added.

### Test 2 — Collapsible league cards

1. In Admin → Sports Engine Controls, confirm league cards are collapsible.
2. Open a league such as MLB or FIFA World.
3. Confirm you can see season, odds, poll, archive, snapshot, and log settings.

### Test 3 — Save per-league settings

1. Change one league setting, for example:
   - Odds cooldown = 240
   - Odds daily max = 2
   - Archive after days = 14
2. Click `Save League Settings`.
3. Reload Sports Controls.
4. Confirm the saved values remain.

### Test 4 — Archive preview

1. Open one league card.
2. Click `Preview Archive`.
3. Confirm it reports candidate counts.
4. Confirm no rows were moved or deleted.

### Test 5 — Record/clock repair

1. Click `Repair Records / Clocks`.
2. Confirm it reports repaired row count.
3. Check `SportsScores`.
4. Confirm bad record values like ISO dates are blanked out.

### Test 6 — Smart automation safety

1. Set one league OddsEnabled = OFF.
2. Save.
3. Click `Run Smart Sports Sync Now`.
4. That league should still be eligible for score sync if due, but odds refresh should be skipped by the Awards App smart automation.

## Notes

This stage is intentionally conservative. It prepares the system for season/league archiving without deleting anything yet.

The next stage should add:

- archive execution with copy-then-delete verification
- archive batch logs
- restore/export options
- per-season/date-range archive runs
