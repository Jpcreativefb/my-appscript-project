# External Results Hub Reality TV Complete Mirror v1.2.3

## Purpose

v1.2.3 completes the outbound Reality TV representation in the External Results Hub without putting the Hub back into the local approval critical path.

The Awards App remains authoritative. Reality TV actions write locally first and enqueue Hub work into `ExternalResultsHubOutbox`.

## What changed

### Complete episode question mirroring

Every built Reality TV episode now mirrors:

- the episode `ExternalEvent`
- the main elimination `ExternalMarket`
- every built Extra Question as its own `ExternalMarket`
- answer subjects used by those questions
- one `AppMappings` row for each selectable answer

The new outbox job type is:

`UPSERT_REALITY_QUESTION_PACK`

The job is verified with the same read-after-write receipt used by v1.2.1.

### No synchronous Hub calls from Extra Question submission/approval

Extra Question result submission now enqueues `CREATE_RESULT_REVIEW` instead of opening the Hub spreadsheet.

Extra Question approval now queues:

1. a full question-pack mirror refresh, so the Hub market receives the final resolution; and
2. `UPDATE_REVIEW` for the matching Hub review record.

### Dependency-safe review updates

`UPDATE_REVIEW` cannot run ahead of its matching `CREATE_RESULT_REVIEW`.

The bridge:

- processes create jobs before update jobs;
- detects the matching create dependency by `ReviewId` or `ImportedResultId`;
- waits without consuming the normal retry count while the create job is pending;
- automatically requeues a failed create dependency when appropriate.

### Main elimination market resolution

Main elimination approval queues `UPSERT_MARKET_RESOLUTION` so the Hub's elimination market is updated to resolved with the winning outcome(s), including multiple eliminations and no-elimination results.

### Replace-aware question packs

When an administrator removes an Extra Question from an open episode, stale supplemental Hub mappings are set inactive and stale supplemental markets are marked inactive. Historical main elimination mappings are not touched.

### Schedule updates cover all episode markets

Changing an episode air/lock time now updates the closing time for the main elimination market and every Extra Question market.

### Reality TV Hub mirror health

The Reality TV Manager Hub card now shows per-season current-episode mirror health:

- Event found
- Hub markets found / expected
- contestant subjects found / expected
- active mappings found / expected
- Hub mirror complete / incomplete

### Legacy dependency cleanup

**Repair / Retry Failed** now:

- retries valid failed jobs;
- repairs ordering when a matching create job exists;
- archives only legacy `UPDATE_REVIEW` errors that have no matching create job and no existing Hub dependency row.

Archived rows remain in `ExternalResultsHubOutbox` for audit and do not affect local scoring.

## Important boundary

Automatic Hub -> Awards App settlement is still disabled in v1.2.3.

`ExternalResultsInbox` remains the staging point for the next integration phase.

## Deployment

Awards App backend: **clasp push required**.

Awards App frontend: **Cloudflare/GitHub deployment required**.

External Results Hub Apps Script project: **no clasp push required** for v1.2.3. The changes are in the Awards App bridge and Reality TV manager.
