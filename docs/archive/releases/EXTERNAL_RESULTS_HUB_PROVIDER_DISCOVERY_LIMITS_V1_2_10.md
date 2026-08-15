# External Results Hub Provider Discovery Limits v1.2.10

## Problem

Production Kalshi discovery exposed two Apps Script / Google Sheets failure modes:

1. Kalshi nested event payloads could exceed Google Sheets' 50,000-character limit when stored in `RawJSON`.
2. Broad discovery could process dozens of events, open markets, settled markets, and outcome subjects in one Apps Script execution, causing `Exceeded maximum execution time`.

## Fix

- Broad Kalshi and Polymarket discovery is now intentionally browse-sized: at most 5 current items and 2 historical/settled items per run.
- Targeted discovery using explicit event/market IDs or tickers remains available and is not restricted by the broad browse cap.
- Kalshi broad event discovery no longer requests nested markets; markets are discovered through the dedicated market endpoint.
- Provider `RawJSON` is now serialized through a Sheets-safe helper. Oversize payloads are stored as valid JSON containing a truncation marker, original length, and preview rather than causing the whole sync to fail.
- New provider defaults use the same safer limits.
- The hourly production watch is unchanged: it still polls only active mapped Kalshi/Polymarket targets and still requires administrator review.

## Deployment

Only the separate External Results Hub Apps Script project needs this patch.

1. Overlay the changed files into the repository.
2. From `external-engines/external-results-hub`, run `clasp status` and `clasp push`.
3. Refresh the External Results Hub spreadsheet.
4. Run `External Results Hub -> Sync Kalshi Discovery` once.

No Awards App web deployment or Cloudflare frontend deployment is required for this patch.
