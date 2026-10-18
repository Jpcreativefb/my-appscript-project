# PATTC Prediction Market R9 — Engine / Persistence R2

**Status:** isolated engine implementation; not wired to production player/Admin UX  
**Starting R1:** `0d4988b3ea1727ce75c7cb7d6394c439e6e548c2`  
**Branch:** `feature/prediction-market-r9-engine-r2`

This document implements the R2 layer behind `docs/PREDICTION_MARKET_R9_ARCHITECTURE_R1.md`. Prediction Market remains a separate Games & Design product area. It is not registered in `GamesEngine`, does not modify the eight accepted General / Custom canonical types, and does not replace `BettingEngine` or `SportsWagerEngine`.

## 1. Reused PATTC patterns

R2 follows existing repository conventions for Apps Script sheet/header setup, normalized row reads, `LockService` critical sections, explicit Admin/player authorization boundaries, timestamped records, and idempotent server-side writes. It does not reuse incompatible wager persistence or ordinary scoring rows.

## 2. Isolated persistence schema

The Apps Script adapter uses five Prediction Market-only stores:

- `PredictionMarketMarkets`
- `PredictionMarketWallets`
- `PredictionMarketTransactions`
- `PredictionMarketPositions`
- `PredictionMarketSettlements`

The position key is `playerId + marketId + outcome`, so one player may independently hold YES and NO positions in the same market.

The settlement key is intentionally aggregate: `marketId:playerId`. Settlement loads and processes all YES/NO position rows for that player-market inside one protected operation. This preserves exactly-once player-market payout while avoiding the R1 risk that one outcome-specific settlement could suppress the other.

Ordinary read methods never create a sheet or add headers. `engine.setup(context)` is the only schema/setup entry point, requires Admin/system authorization, and delegates to explicit repository setup. R2 does not invoke that path against production.

## 3. Wallet bootstrap

Default bootstrap is **1000 virtual PATTC credits**, centralized as `PREDICTION_MARKET_R2_CONFIG.defaultBootstrapCredits` and overrideable when the engine is constructed.

Wallet fields include player ID, available credits, reserved credits, version, and created/updated metadata. Existing wallets are returned unchanged by bootstrap; they are never silently reset. Version begins at 0 and increments on every committed trade or settlement mutation.

There are no deposits, withdrawals, cash redemption, real-money conversion, or player-to-player transfers.

## 4. Transaction uniqueness and locking

Each trade requires a Prediction Market-unique `transactionId`. Its fingerprint covers player, market, side, outcome, quantity, proposed client reference price, and expected wallet version.

Execution occurs inside the repository critical section. The Apps Script repository uses `DocumentLock` when available, otherwise `ScriptLock`, with a bounded lock timeout. The server then re-reads market, wallet, transaction, price state, lock time, position quantity, and expected wallet version before calculating any mutation.

An identical committed transaction retry returns the original committed result. Reusing the ID with a changed fingerprint fails. The sheet repository writes a PENDING journal record containing the deterministic committed result before wallet/position changes, then marks the transaction COMMITTED. If an Apps Script interruption leaves a PENDING transaction, the identical retry can replay the stored target wallet/position state and complete the journal rather than double-spending.

Settlement uses the same PENDING→COMMITTED recovery concept with the full wallet and both-outcome position result embedded in the settlement journal.

## 5. Reference price and freshness

The first provider is `MANUAL`. The engine consumes provider methods rather than hard-wiring a future network source.

A usable price must:

- provide normalized YES and NO values from 0 through 1;
- have YES + NO = 1;
- be explicitly trusted;
- include a parseable `asOf` timestamp;
- be no older than the configured freshness limit.

The R2 default freshness limit is **15 minutes** and is centralized/configurable. A missing, untrusted, malformed, or stale price rejects opening/trading rather than guessing.

The client may include a proposed reference price for idempotency/fingerprint purposes, but execution always uses the current server-side provider price. Player trades never move the market reference price.

No Kalshi or Polymarket network access is implemented in R2.

## 6. BUY

BUY is allowed only when the market is OPEN, current time is before `lockTime`, the server-side reference price is valid/fresh, wallet version matches, and available credits cover the purchase.

`grossCredits = quantity × acceptedReferencePrice`

The purchase subtracts gross credits from available credits, increases outcome quantity, increases cost basis by gross credits, recalculates weighted average cost, increments the wallet version, and commits the immutable transaction result. Zero/negative quantity and any negative resulting wallet balance are rejected.

## 7. SELL and weighted-average cost basis

SELL requires sufficient owned quantity in the exact `playerId + marketId + outcome` position.

For a sale quantity `q` from current quantity `Q` and current cost basis `C`:

`averageCost = C / Q`

`removedCostBasis = averageCost × q`

`saleProceeds = q × acceptedReferencePrice`

`realizedGainLossDelta = saleProceeds - removedCostBasis`

`remainingCostBasis = C - removedCostBasis`

The wallet receives sale proceeds. Remaining quantity and cost basis cannot become negative. A full exit normalizes remaining quantity/cost basis to zero. The position's `realizedCredits` field is R2's cumulative realized gain/loss, not cumulative gross sale proceeds.

## 8. Lifecycle

Authoritative transitions are:

- `DRAFT → OPEN`
- `OPEN → LOCKED`
- `LOCKED → RESOLVED`
- `DRAFT | OPEN | LOCKED → VOID`

OPEN requires title/identity, future lock time, and usable fresh pricing. RESOLVED requires YES or NO. VOID clears the winning outcome. RESOLVED and VOID are terminal and cannot reopen.

Manual Admin/system resolution is exposed through the same provider-neutral engine boundary; R2 does not build the finished Admin screen.

## 9. Settlement

RESOLVED settlement pays **1 virtual credit per winning share** and 0 for losing shares. VOID returns each remaining position's open cost basis.

One settlement operation loads all player positions for the market, calculates both outcome rows, updates the wallet once, marks all relevant rows settled, zeroes open quantity/cost basis, and stores one aggregate player-market settlement record. Re-running settlement returns the original committed result without another wallet mutation.

Settlement P/L is added to cumulative realized gain/loss. VOID therefore adds zero P/L for returned open basis, while a resolved winning/losing position realizes payout minus remaining cost basis.

## 10. Portfolio and leaderboard

Portfolio query returns:

- available credits
- reserved credits
- current marked open-position value
- unrealized gain/loss
- cumulative realized gain/loss
- settled value (informational historical payout/return)
- total portfolio value

V1 total/leaderboard value is:

`available credits + reserved credits + current marked open-position value`

Settled value is not added again because its payout is already in wallet cash.

Prediction Market leaderboard ranks descending by portfolio value. Ties are stable by case-insensitive display name, then player ID. Ordinary game points and ordinary leaderboard scoring are untouched.

## 11. Authorization boundary

Player-capable engine operations are market reads, own wallet reads, own portfolio reads, wallet bootstrap for the same authenticated player, and trade submission for the same player.

Admin/system-only operations are storage setup, create/edit market, manual price entry, lifecycle transitions, resolution/void, settlement, and Prediction Market leaderboard administration/query.

The default R2 authorizer is deliberately explicit and injectable so future API wiring can use PATTC's existing session/Admin authorization before calling the engine. UI visibility alone is never treated as authorization.

## 12. Test architecture

`tests/prediction_market_engine_r2_tests.js` uses the in-memory repository. It does not touch `SpreadsheetApp`, production sheets, production identities, or external services.

Coverage includes wallet bootstrap/version safety, YES/NO buys, server-authoritative price selection, stale wallet and stale-price rejection, duplicate transaction replay/conflict, lock-time and lifecycle enforcement, weighted-average partial/full sells, oversell rejection, YES/NO/VOID settlement, both-outcome settlement, repeated settlement idempotency, portfolio valuation, leaderboard ordering, authorization, and isolation from Games/Betting/Sports Wager ownership.

## 13. Deferred R3 work

R3 remains UI/integration work and should not weaken these engine boundaries. Deferred work includes finalized API wrappers using PATTC session/Admin authorization, Admin market-management UX, player market/portfolio/trading UX, explicit production migration authorization, operational settlement scheduling, richer audit/diagnostic surfaces, and any Director-approved future external provider adapters.

No AMM, liquidity pool, bonding curve, order book, peer-to-peer matching, real-money behavior, Kalshi network call, or Polymarket network call is introduced by R2.
