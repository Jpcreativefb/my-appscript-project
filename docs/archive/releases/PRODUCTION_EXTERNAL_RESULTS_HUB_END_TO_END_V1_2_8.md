# External Results Hub End-to-End Reliability — v1.2.8

## Purpose

v1.2.8 closes the remaining reliability gaps between the separate External Results Hub spreadsheet and the Awards App database while keeping the Awards App authoritative.

The supported Hub providers remain:

- `manual-awards`
- `manual-reality-tv`
- `kalshi`
- `polymarket`

Sports and racing remain outside the Hub settlement path.

## End-to-end flow

```text
External provider / manual result
        ↓
ImportedResults
        ↓
ReviewQueue — administrator approval required
        ↓
Deliver Approved Results to App Inbox
        ↓
ExternalResultsInbox
        ↓
Validate Ready
        ↓
Apply Validated
        ↓
Awards / prediction → CategoryResults
Reality TV → native Reality review queue
```

Automatic inbound apply remains OFF.

## v1.2.8 changes

### 1. Reality TV Inbox reconciliation

Reality TV results no longer remain permanently at `STAGED_REALITY` after the Reality Manager finishes them.

The Inbox now records:

- `NativeRoute`
- `NativeQueueId`
- `NativeStatus`
- `NativeUpdatedAt`

When the native Reality queue becomes `APPROVED`, the matching Inbox batch becomes `APPLIED`.

When the native Reality queue is rejected, the Inbox becomes `REJECTED` instead of silently retrying or creating another queue.

A native queue error remains staged and visible so the existing Reality recovery system can repair the same queue without creating a second result.

### 2. Reality TV duplicate protection

A Hub delivery that already has a native Reality queue is matched by Hub Review ID / Imported Result ID / saved native queue ID.

- Same pending result → reuse the existing native queue.
- Same already-approved result → idempotent `APPLIED`; no duplicate queue.
- Different result → conflict error; no overwrite and no duplicate queue.

Only `manual-reality-tv` may route into native Reality TV settlement. Kalshi/Polymarket results must map to prediction questions instead.

### 3. Provider result dedupe no longer depends on provider timestamp

A repeated provider sync now identifies a result from its stable outcome identity:

```text
Provider
ExternalEventId
ExternalMarketId
ResultKey
ResultValue
WinningOutcome
Finality
```

A changing provider `updatedAt` / timestamp does not create another ImportedResult/ReviewQueue row for the same outcome.

A PROVISIONAL result becoming FINAL remains a distinct state and can create the required FINAL review row.

### 4. Deterministic delivery IDs for manually entered mappings

`AppMappings.MappingId` is still supported, but it is no longer required for duplicate-safe delivery.

If MappingId is blank, the Hub derives a stable mapping key from the mapping fields. Two nominees in the same market therefore cannot collapse onto the same delivery ID.

### 5. Mapped-only Kalshi / Polymarket result watch

Broad sync remains available for manual discovery.

A separate mapped sync polls only markets referenced by active `AppMappings` rows:

- `Sync Mapped Kalshi Results`
- `Sync Mapped Polymarket Results`
- `Sync All Mapped Results`

This is the mode used by the recurring watch.

### 6. Hourly mapped result watch

The Hub menu now contains:

- `Install Hourly Mapped Result Watch`
- `Remove Mapped Result Watch`

The trigger runs hourly and respects each provider's `PollingIntervalMinutes` with a minimum of 60 minutes. It never trades and never automatically applies results to the Awards App.

### 7. Kalshi settlement safety

A blank/null `settlement_value_dollars` is no longer converted to numeric zero. An open/unsettled market therefore cannot accidentally become a false `No` result.

A Kalshi result is imported only when the market has a settlement marker (`settlement_ts` or settled status) and a resolvable Yes/No outcome.

Mapped Kalshi polling falls back to the official historical markets endpoint when a settled market is no longer available from the regular market endpoint.

### 8. Polymarket mapped polling

Mapped numeric market IDs use the Gamma market-by-ID endpoint. Non-numeric mapping values can use the slug lookup fallback.

### 9. Hub health report

Health Check now reports:

- active mapped Kalshi target count
- active mapped Polymarket target count
- whether the mapped-provider watch trigger is installed

## Deployment requirement

**v1.2.8 changes BOTH Apps Script projects.**

1. **AWARDS APP CLASP — REQUIRED**
2. **EXTERNAL RESULTS HUB CLASP — REQUIRED**
3. Awards App frontend GitHub/Cloudflare deployment — REQUIRED

See `PRODUCTION_SMOKE_TEST_V1_2_8.md` for exact commands and tests.

## Validation

- 69 / 69 regression test files passed.
- 182 / 182 JavaScript files passed syntax validation.
- `frontend/js/app.js` matches `frontend/app.js`.
- `frontend/js/api.js` matches `frontend/api.js`.

