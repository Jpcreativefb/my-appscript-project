# Prediction Market R9 — Reference Providers R5

## Scope

R5 adds a replaceable, read-only reference-price provider layer. External markets never become PATTC counterparties. PATTC remains the virtual counterparty, and player trades never move the external reference price.

## Normalized provider snapshot

Every accepted provider proposal has:

- `providerKind`
- `providerId`
- `externalMarketId`
- `referenceYesPrice`
- `referenceNoPrice`
- `referencePriceAsOf`
- `trusted`
- `sourceUrl`
- `providerMetadata`

YES and NO must each be finite in `[0, 1]`, sum to `1` within `0.000001`, and include an explicit timestamp, provider identity, external market identity, and trusted boolean. Invalid input is rejected rather than silently repaired.

Provider freshness classification is informational and uses the same R2 max-age value supplied by the caller. The R2 engine remains the authoritative trading freshness gate.

## Provider kinds

### MANUAL

Fully supported and first-class. Existing R3 `Update Price` remains unchanged and calls the accepted R2 `setManualPrice` authority. No external service is required.

### KALSHI

R5 includes a tested mapping adapter boundary for Kalshi public market data. The mapping consumes a single market payload, takes `last_price_dollars` as the YES reference price, derives NO as `1 - YES`, and uses `updated_time` as the source timestamp. It preserves ticker/event/status metadata.

**Production live network transport is NOT enabled in R5.** The adapter only performs network I/O when a transport is explicitly injected. This allows deterministic tests for timeout, HTTP errors, malformed JSON, missing markets, rate limits, and mapping without making CI depend on Kalshi uptime.

Official documentation reviewed:

- Kalshi market-data quick start: `https://docs.kalshi.com/getting_started/quick_start_market_data`
- Kalshi API reference / current Trade API market schema: `https://docs.kalshi.com/api-reference`
- Kalshi Help Center API overview: `https://help.kalshi.com/en/articles/13823854-kalshi-api`

The official material confirms public market-data access and current Trade API market fields. R5 still leaves production networking disabled because the current Apps Script production path does not provide the explicit per-request timeout control required by this phase's network-safety contract.

### POLYMARKET

Registered as an explicit R5 provider kind, but live mapping is intentionally `UNCONFIGURED`.

Official documentation reviewed:

- Polymarket API help: `https://help.polymarket.com/en/articles/13364254-does-polymarket-have-an-api`
- Polymarket documentation: `https://docs.polymarket.com/`
- Polymarket Data API v2: `https://data-api.polymarket.com/v2/docs`

The official material confirms public API availability. R5 does not fabricate a production binary-price adapter because the exact canonical market-to-current-price mapping to use for PATTC was not sufficiently established for this controlled phase.

### DIRECTOR_APPROVED

Registered as an explicit provider kind and returns `UNCONFIGURED` until a Director-approved transport/mapping is supplied in a later phase. No hidden configuration or credential store is created.

## Accepted-price authority

Providers never write market storage. R5 adds a vendor-neutral R2 Admin authority `setReferencePrice(context, marketId, snapshot)` for an already-normalized snapshot. The Admin refresh flow first fetches a proposal, then asks R2 to validate the prospective stored reference state using the same R2 price/freshness gate, and only then applies the snapshot through `setReferencePrice`.

Failures, stale data, invalid data, provider errors, and unconfigured providers do not overwrite the last accepted reference price or advance its timestamp.

## R2/R4 bridge

External provider kinds use a stored-reference bridge when the R2 engine validates trading. The bridge performs no network I/O; it simply exposes the market's already-accepted YES/NO/timestamp/trusted fields to the existing R2 validation routine.

R4 therefore consumes server-stored accepted prices only. Players cannot request provider refreshes or call external provider APIs.

## Network contract

The injectable Kalshi adapter contract requires:

- GET only
- caller-supplied bounded timeout
- `maxAttempts: 1`
- no uncontrolled retries
- explicit 429 handling
- explicit non-2xx handling
- malformed JSON rejection
- missing-market rejection
- no frontend credentials

No production transport is enabled by this R5 branch, so no provider secrets are required or committed.

## Scheduling

R5 deliberately adds no scheduled synchronization. A later operational phase may add scheduling only after provider behavior, timeout/runtime choice, rate limits, observability, and failure policy are Director-approved. Scheduled work must continue to call the same provider abstraction and accepted R2 price authority rather than introducing a second write path.
