# PATTC Prediction Market R9 — Foundation Architecture R1

**Status:** Foundation / contract only
**Starting Director checkpoint:** `76fb1ad95e19586014439b3e59ec28e7b981532d`
**Branch:** `feature/prediction-market-r9-foundation-r1`

## 1. Product boundary

Prediction Market is a separate **Games & Design product area**. It is not a new `GamesEngine` canonical type and it does not extend the eight accepted General / Custom builder types.

Those eight remain exactly:

- `prediction`
- `head-to-head`
- `staked-prediction`
- `wager`
- `racing-wager`
- `voting`
- `ranking`
- `mixed`

Prediction Market is also distinct from Sports Wager, Confidence, Survivor, Team Fantasy, Playoff / Forecast, Cups / competitions, trivia, polls, surveys, and ordinary prediction games.

V1 uses virtual PATTC credits only. No real money, deposits, withdrawals, cash redemption, or player-to-player transfer is part of this architecture.

## 2. Existing architecture audit

The repository already has useful patterns, but not all existing wager assumptions fit a trading product.

### Reuse directly

| Existing authority | R9 use |
| --- | --- |
| `UsersEngine.js` / existing authenticated player identity | Player identity authority; Prediction Market does not invent a second login identity. |
| Existing Admin → Games & Design lifecycle/navigation concepts | Placement and navigation vocabulary. Prediction Market receives its own product destination. |
| Existing result/automation concepts (`ResultsEngine.js`, `ScoringAutomationEngine.js`, external-results bridge patterns) | Architectural precedent for controlled resolution/background work. R2 may adapt scheduling/error patterns after a targeted implementation audit. |
| Existing Apps Script locking conventions | R2 trade/settlement writes must use a server-side critical section, not frontend-only protection. |
| Existing API retry/error conventions | R2 APIs should return stable idempotent results for retries and explicit conflicts for reused identifiers with changed payloads. |

### Adapt, do not copy blindly

| Existing authority | Adaptation |
| --- | --- |
| `GamesEngine.js` lifecycle/configuration conventions | Use naming/validation discipline, but do **not** register `prediction-market`. Market lifecycle is DRAFT → OPEN → LOCKED → RESOLVED/VOID and is independent of ordinary Games-row scoring types. |
| Question/result storage patterns | Binary market wording and resolution can borrow normalized identity/result ideas, but markets require provider metadata, reference prices, positions and settlement state that ordinary questions do not own. |
| Leaderboard patterns | Reuse player display/ranking presentation later, but leaderboard value is portfolio value, not ordinary pick points or wager profit. |
| External provider bridges | Reuse adapter/error-handling ideas. Keep the internal market contract provider-agnostic. |

### Isolate

| New R9 authority | Why isolated |
| --- | --- |
| Market records | A market has reference prices and a trading lifecycle that is not an ordinary Games question. |
| Wallet / credit ledger | Needs reserved/available credit invariants and atomic versioning. |
| Trade transaction ledger | Needs globally unique Prediction Market transaction IDs and retry-safe committed results. |
| Positions | Needs quantity, cost basis, average cost, realized/unrealized/settled value. |
| Settlement ledger | Needs one unique settlement key and exactly-once payout semantics. |
| Provider adapters | External source changes must not alter the internal market/trade contract. |

### Explicitly not reused as the Prediction Market engine

- `BettingEngine.js` is the accepted ordinary `wager` engine and remains authoritative for its Bets-sheet model.
- `SportsWagerEngine.js` remains the accepted Sports Wager authority.
- Sports odds/provider behavior is not a substitute for event-market trading.
- `GamesEngine` canonical type registration is not extended.
- Existing scoring points are not treated as a Prediction Market cash ledger.
- No AMM, bonding curve, liquidity pool, order book, peer-to-peer matching, or player-created price system is introduced.

## 3. V1 binary market contract

`backend/engines/PredictionMarketContracts.js` defines the R1 contract.

A binary market has:

- `marketId`
- `title`
- `description`
- `category`
- `status`
- `outcomes.YES` and `outcomes.NO`
- `referencePrices.YES` and `referencePrices.NO`
- reference-price `asOf`
- provider descriptor
- `openTime`
- `lockTime`
- `resolutionStatus`
- `winningOutcome`
- `voided`
- created/updated actor and timestamp metadata

Reference prices are normalized probabilities in the inclusive range **0..1**. V1 binary YES + NO reference prices must sum to 1. One winning share settles to one virtual credit; therefore a share bought at 0.62 costs 0.62 credits and, if it wins, settles to 1.00 credit.

External prices are reference prices only. PATTC is the virtual counterparty. A PATTC player's buy or sell does not move the external/reference price.

## 4. Provider abstraction

The contract supports provider descriptors for:

- `MANUAL`
- `KALSHI`
- `POLYMARKET`
- `DIRECTOR_APPROVED`

This does **not** activate or authorize any provider integration.

A provider adapter must expose the internal capabilities:

- `getReferencePrices(market)`
- `getResolution(market)`

The trade engine consumes normalized reference prices/resolution, not provider-specific response shapes. Credentials, provider secrets, paid services, and live network adapters are outside R1.

Manual Admin entry is a first-class provider path so V1 is not blocked on an external vendor.

## 5. Market lifecycle

Authoritative states:

`DRAFT → OPEN → LOCKED → RESOLVED`

and VOID escape paths:

- `DRAFT → VOID`
- `OPEN → VOID`
- `LOCKED → VOID`

`RESOLVED` and `VOID` are terminal.

### Trading rules

- Trades are permitted only while status is `OPEN`.
- `DRAFT` cannot trade.
- At `LOCKED`, no new buy/sell may commit.
- A scheduled job may advance an eligible OPEN market to LOCKED at `lockTime`, but R2 must re-check status/time inside the same authoritative write path used by trades.
- R1 defines no automatic provider polling schedule.

### Resolution

Resolution may be performed by an authorized Admin/manual source or a future approved provider adapter through the same normalized resolution contract.

- YES resolution: YES positions pay 1 credit per share; NO positions pay 0.
- NO resolution: NO positions pay 1 credit per share; YES positions pay 0.
- VOID: open position cost basis is returned. There is no win/loss payout.

Settlement must not be coupled to whether a browser is open.

## 6. Virtual-credit and portfolio model

### Wallet

A wallet has:

- `playerId`
- `availableCredits`
- `reservedCredits`
- `totalCashCredits`
- monotonic `version`

`availableCredits` and `reservedCredits` may never be negative.

Reserved credits are permitted for the R2 implementation if the server needs a short-lived reservation during an atomic mutation; they are not a player-visible second currency.

### Transaction / trade

A trade intent has:

- `transactionId`
- `playerId`
- `marketId`
- `BUY` or `SELL`
- `YES` or `NO`
- quantity
- immutable reference price used for that execution
- gross credits
- request timestamp
- expected wallet version when applicable

`transactionId` is the idempotency key for a trade. A committed transaction replay returns the original committed result. Reusing the same ID for a different fingerprint is an idempotency conflict, not a second trade.

### Position

A position has:

- `playerId`
- `marketId`
- outcome
- quantity
- cost basis credits
- average cost credits
- realized credits
- settled credits

Mark-to-reference market value is `quantity × current reference price`.

Unrealized value is `market value - remaining cost basis`.

R2 must define the exact FIFO/weighted-average mutation rule for partial sells before enabling player execution. R1 chooses weighted average as the intended simple V1 direction but does not implement a persistent sell engine yet.

### Portfolio and leaderboard

Portfolio value is:

`available credits + reserved credits + marked open-position value`

V1 leaderboard value equals portfolio value. This prevents a leaderboard from treating spent cash as permanently lost while the player still owns a marked position.

## 7. Atomicity and idempotency

R2 persistence must enforce the following as server-side invariants:

1. `transactionId` is unique within Prediction Market.
2. Trade idempotency fingerprint includes player, market, side, outcome, quantity and execution reference price.
3. A committed duplicate returns the original result without a second wallet/position mutation.
4. A duplicate ID with a changed fingerprint is rejected.
5. Wallet mutation uses compare-and-set/version validation.
6. Funds/position validation and transaction + wallet + position commit occur in one player/market critical section.
7. The market status/time is re-read inside that critical section before commit.
8. Available credits cannot become negative.
9. A sell cannot make position quantity negative.
10. Settlement uses a unique `marketId:playerId` settlement key for the V1 aggregate player-market settlement operation.
11. Settlement ledger + wallet payout + position settled state are committed in one critical section.
12. A repeated committed settlement returns the original settlement instead of paying again.

Frontend disabled buttons may improve UX but are not an atomicity mechanism.

## 8. Persistence plan

R1 deliberately does not create/migrate production sheets.

R2 should add isolated Prediction Market persistence rather than extending `Bets` or overloading ordinary Games rows. Logical stores are expected to cover:

- Markets
- Wallets
- Transactions
- Positions
- Settlements
- optional provider/reference-price snapshots

Exact sheet/table names and headers should be finalized in R2 after checking current Apps Script storage/migration helpers. Any schema creation must be explicit Admin/setup or migration work and must never run implicitly from a read request.

## 9. Admin placement

Intended authoritative surface:

`Admin → Games & Design → Prediction Market`

Destinations:

- Market Builder
- Manage Markets
- Providers & Reference Prices
- Resolution & Settlement
- Operations

Prediction Market controls do not belong inside ordinary `Manage Games`, and R1 does not alter Sports navigation or restore old Sports focus helpers.

The R1 contract records:

- `usesOrdinaryManageGames: false`
- `changesSportsNavigation: false`
- `canonicalGeneralCustomType: false`

No new Admin UI route is wired in R1.

## 10. Error / retry behavior

R2 APIs should separate:

- validation errors — malformed market/trade request
- lifecycle conflicts — market no longer OPEN
- stale-version conflicts — wallet changed since request was prepared
- insufficient-credit/position conflicts
- idempotent replay — successful original result returned
- idempotency conflict — same ID, different payload
- provider unavailable/stale — reference data cannot be trusted for a new execution

Retries must be safe because the same transaction ID is reused by the client for the same logical trade.

## 11. Background work

Existing PATTC scoring/result automation provides precedent for scheduled/background processing, but Prediction Market settlement requires its own idempotency boundary.

R2 may add scheduled functions for:

- locking markets at/after `lockTime`
- refreshing approved reference prices
- discovering a provider resolution
- settling RESOLVED/VOID markets

Every job must be re-entrant: rerunning it must not create duplicate transitions, transactions, or payouts.

## 12. R1 tests

`tests/prediction_market_foundation_r9_tests.js` protects:

1. the exact eight accepted General / Custom canonical types,
2. absence of Prediction Market registration in `GamesEngine`,
3. continued Sports Wager / BettingEngine authority,
4. accepted game-builder routing markers,
5. lifecycle transitions,
6. binary market contract,
7. duplicate transaction behavior,
8. negative-credit / stale-wallet protections,
9. idempotent settlement and void cost-basis return,
10. provider-source independence,
11. isolated Admin placement and atomicity contract.

## 13. Deferred R2 engine work

R2 should implement, in order:

1. isolated persistence schema and migration/setup path,
2. server-side wallet bootstrap/funding policy for virtual PATTC credits,
3. transaction repository with uniqueness enforcement,
4. player/market lock + wallet compare-and-set transaction boundary,
5. BUY execution and weighted-average position updates,
6. SELL execution with authoritative cost-basis/realized-value rule,
7. manual provider adapter first,
8. reference-price freshness policy,
9. authorized market open/lock/resolve/void APIs,
10. idempotent settlement worker,
11. portfolio/leaderboard query model,
12. only then a minimal Admin/player UI,
13. optional Kalshi/Polymarket adapters only after Director approval and a legal/technical source review.

R2 must not expand into AMM, liquidity, order books, P2P matching, real money, or player-created prices.

## 14. R1 limitations

This pass is intentionally not a complete market engine. It does not persist trades, mutate a real wallet, create Admin/player UI, run timers, fetch provider prices, resolve live markets, or settle production positions. Those omissions are deliberate: R1 establishes the contracts that those components must obey before execution logic is introduced.
