# PATTC Prediction Market R9 — Release Validation / Operational Readiness R6

## Status

R6 is a validation/readiness phase only. It does not authorize merge, deployment, production storage initialization, or production-data mutation.

Accepted starting checkpoint:

`ae7fcb09addb619a22ec67a01e93a6f849a29591`

R6 branch:

`test/prediction-market-r9-release-validation-r6`

## Release-readiness conclusion

The R1–R5 implementation can be considered internally code-ready for a **MANUAL-provider V1** only after the R6 automated validation suite and inherited production checks pass. Actual user enablement remains blocked until the integrated/deployed build has isolated Prediction Market storage initialized under Director authorization and manual browser validation is completed against a safe RC/staging target.

External providers are not required for MANUAL-provider V1 operation. Kalshi production transport, Polymarket integration, scheduled price synchronization, historical charts, transaction-history UI, real money, AMM, P2P, and an order book are deferred and non-blocking unless later product requirements change.

---

# 1. Isolated production storage contract

The accepted R2 authority defines exactly five isolated stores/sheets. No R6 code creates a second setup path.

## `PredictionMarketMarkets`

Headers, in accepted order:

`MarketId, Title, Description, Category, Status, YesLabel, NoLabel, ReferenceYesPrice, ReferenceNoPrice, ReferencePriceAsOf, ReferencePriceTrusted, ProviderKind, ProviderId, ExternalMarketId, SourceUrl, ProviderMetadataJson, OpenTime, LockTime, ResolutionStatus, WinningOutcome, Voided, CreatedAt, CreatedBy, UpdatedAt, UpdatedBy`

## `PredictionMarketWallets`

`PlayerId, AvailableCredits, ReservedCredits, Version, CreatedAt, CreatedBy, UpdatedAt, UpdatedBy`

## `PredictionMarketTransactions`

`TransactionId, Fingerprint, PlayerId, MarketId, Side, Outcome, Quantity, ExecutionReferencePrice, GrossCredits, Status, WalletVersionBefore, WalletVersionAfter, RequestedAt, CommittedAt, CommittedResultJson`

## `PredictionMarketPositions`

`PlayerId, MarketId, Outcome, Quantity, CostBasisCredits, AverageCostCredits, RealizedCredits, SettledCredits, SettledCostBasisCredits, Settled, CreatedAt, UpdatedAt`

## `PredictionMarketSettlements`

`SettlementKey, MarketId, PlayerId, MarketStatus, WinningOutcome, PayoutCredits, ReturnedCostBasisCredits, WalletVersionBefore, WalletVersionAfter, PositionResultsJson, Status, CommittedAt, CommittedResultJson`

These stores are separate from ordinary PATTC game, wager, sports-wager, confidence, survivor, fantasy, cup, or general/custom storage.

---

# 2. Accepted setup authority

The accepted R2 engine exposes the existing setup authority:

`engine.setup(adminContext)`

That delegates to the accepted Apps Script Prediction Market repository's:

`repository.setup()`

No other setup mechanism should be introduced for release.

R6 does **not** invoke either function against production.

---

# 3. Controlled setup checklist

> **DO NOT RUN UNTIL DIRECTOR AUTHORIZES DEPLOYMENT / STORAGE INITIALIZATION**

Before any setup event:

- [ ] Record the exact integrated/deployed commit SHA.
- [ ] Confirm a rollback point and backup/restore procedure exist for the target Apps Script environment.
- [ ] Verify the exact Apps Script project/environment targeted by the deployment.
- [ ] Verify the environment is **not production** unless production initialization is explicitly authorized by Director.
- [ ] Confirm there are no preexisting conflicting sheets named `PredictionMarketMarkets`, `PredictionMarketWallets`, `PredictionMarketTransactions`, `PredictionMarketPositions`, or `PredictionMarketSettlements`.
- [ ] If any conflicting name exists, **abort**. Do not rename, reuse, truncate, or overwrite it during the setup event.
- [ ] Verify ordinary PATTC game/wager/sports storage before setup so unexpected mutation can be detected.
- [ ] Invoke the accepted R2 setup authority once using an authenticated Admin/System context.
- [ ] Confirm exactly the five Prediction Market stores above exist after setup.
- [ ] Confirm every store header exactly matches the accepted R2 header contract.
- [ ] Confirm newly initialized stores contain headers only and no unexpected market, wallet, transaction, position, or settlement rows.
- [ ] Record the resulting store/sheet names and environment identifier in the deployment record.
- [ ] Perform a non-destructive Prediction Market read through the accepted API/repository path.
- [ ] Re-check ordinary PATTC game/wager/sports storage and confirm it did not change.
- [ ] Stop immediately on any unexpected mutation, unexpected preexisting data, header mismatch, wrong environment, or setup failure.

Do not repeatedly run setup as an attempted repair. Investigate first.

---

# 4. Setup rollback / abort conditions

Abort the controlled setup event if any of the following occurs:

- target environment cannot be positively identified;
- target appears to be production without explicit production authorization;
- any of the five expected Prediction Market sheet names already exists unexpectedly;
- any existing Prediction Market sheet has non-matching headers;
- setup attempts to touch ordinary PATTC game/wager/sports sheets;
- setup creates anything outside the five accepted isolated stores;
- setup writes non-header Prediction Market data unexpectedly;
- a non-destructive read fails after initialization;
- security/session identity cannot be verified;
- any unexplained mutation is observed.

If setup has partially completed, do not improvise cleanup against production. Preserve evidence, stop, and follow the Director-approved rollback procedure.

---

# 5. Manual RC / browser validation checklist

These checks remain **pending** until a safe integrated RC/staging deployment exists. R6 must not claim they passed based on static or Node tests.

## Admin

- [ ] Open `Admin → Games & Design → Prediction Markets`.
- [ ] Confirm market list renders.
- [ ] Create a DRAFT market.
- [ ] Edit that DRAFT market.
- [ ] Apply a MANUAL reference price.
- [ ] Confirm external-provider Refresh Reference Price behavior, including expected unconfigured state where production transport is not enabled.
- [ ] Open a valid market.
- [ ] Lock an OPEN market.
- [ ] Resolve a LOCKED market YES.
- [ ] Resolve a separate LOCKED market NO.
- [ ] VOID a nonterminal market.
- [ ] Confirm terminal markets no longer expose lifecycle actions that would reopen or re-resolve them.
- [ ] Confirm provider failures retain the last accepted reference price and timestamp.

## Player

- [ ] Open the dedicated Markets navigation destination.
- [ ] Confirm market browser shows lifecycle, YES/NO price, timestamp, provider/source, lock time, and trading state.
- [ ] Open market detail.
- [ ] Confirm wallet bootstrap/current virtual-credit wallet display.
- [ ] BUY YES.
- [ ] BUY NO.
- [ ] SELL part of an owned position.
- [ ] Confirm YES and NO holdings remain separate.
- [ ] Confirm portfolio values refresh from server state.
- [ ] Confirm Prediction Market leaderboard renders without changing the ordinary leaderboard.
- [ ] Confirm stale-price state disables trading and is clearly presented.
- [ ] Confirm LOCKED markets are viewable but not tradable.
- [ ] Confirm RESOLVED and VOID presentation.
- [ ] Exercise an uncertain-response retry and confirm the same transaction ID/payload is reused for the unchanged trade intent.
- [ ] Confirm changing trade intent creates a new transaction ID.

## Mobile

Perform all key trading interactions at:

- [ ] 360px viewport width
- [ ] 390px viewport width
- [ ] 430px viewport width

Verify:

- [ ] no destructive horizontal overflow;
- [ ] trade confirmation remains reachable;
- [ ] submit controls are not covered by bottom navigation;
- [ ] holdings and portfolio remain understandable;
- [ ] stale/error messages remain visible;
- [ ] BUY/SELL controls remain tappable.

---

# 6. Release blockers before user enablement

The following are blockers before Prediction Market can be enabled for users:

1. Prediction Market isolated storage has not been initialized in the authorized deployed environment.
2. R1–R6 have not been integrated into the intended release branch/build.
3. The integrated build has not been deployed to a safe RC/staging target for browser validation.
4. The Admin/player/mobile browser checklist above has not been completed on that integrated build.
5. Any security, atomicity, idempotency, settlement-recovery, or lifecycle validation failure.
6. Any inability to safely create/read/write only the five isolated Prediction Market stores.
7. Any indication that Prediction Market setup or operation mutates ordinary PATTC game/wager/sports storage.

---

# 7. Deferred / non-blocking for MANUAL-provider V1

Unless future testing exposes a dependency, these are **not blockers** for a MANUAL-provider V1:

- Kalshi production transport
- Polymarket integration
- scheduled provider synchronization
- provider polling workers
- automatic market creation
- historical price charts
- transaction-history screen
- real-money features
- deposits or withdrawals
- cash redemption
- P2P trading
- AMM / liquidity pools
- order book
- provider-driven automatic settlement

MANUAL remains a complete reference-price path.

---

# 8. Scheduling plan after R6

Scheduled provider refresh remains deferred.

A later operational phase should only add scheduling after explicit approval of provider transport, price convention, rate limits, retry/backoff policy, observability, alerting, and environment controls.

Any scheduler must reuse the accepted path:

`provider adapter → strict normalization → R2 freshness/trust validation → R2 setReferencePrice`

It must not create a second storage-write authority and must not automatically settle markets.

---

# 9. R6 safety statement

R6 itself must leave these conditions true:

- no merge;
- no deploy;
- no production Prediction Market storage initialization;
- no production-data modification;
- no real-money behavior;
- no live external provider dependency added;
- no runtime behavior changes made solely to satisfy R6 tests.
