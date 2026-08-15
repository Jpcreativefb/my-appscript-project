# External Results Hub Queued Bridge v1.2.0

## Purpose

This release begins the production integration between the Awards App and the existing External Results Hub for:

- Awards shows
- Reality TV
- Read-only Kalshi and Polymarket results

Sports and ESPN data do not use this Hub.

## Main change

The Awards App no longer opens and writes to the External Results Hub during Reality TV manager actions or approval. It writes a small local job to `ExternalResultsHubOutbox`. A separate trigger processes those cross-spreadsheet writes afterward.

This keeps Hub availability, permissions, and temporary Google Sheets errors out of the Reality TV approval critical path.

## New Awards App sheets

- `ExternalResultsHubOutbox`
- `ExternalResultsInbox`

The setup code creates these sheets and their headers automatically.

## Outbound workflow

1. The Awards App completes its local operation.
2. Hub work is saved in `ExternalResultsHubOutbox`.
3. A one-time trigger runs `externalResultsProcessHubOutbox`.
4. The worker opens the Hub once and performs the queued upserts.
5. Temporary Sheets or lock failures retry with bounded backoff.
6. Permanent failures remain visible as `ERROR` and can be retried from the Reality TV Manager.

## Inbound workflow in this phase

The Hub no longer writes directly to `CategoryResults`.

Approved Hub results are delivered to the Awards App's `ExternalResultsInbox` with status `READY`. Automatic settlement is intentionally disabled in v1.2.0. This provides a safe verification checkpoint before the next phase enables game-specific application and scoring.

## Hub review behavior

- Results approved locally in the Reality TV Manager are mirrored to the Hub as an audit record and marked pushed there.
- Results originating from manual awards, manual Reality TV, Kalshi, or Polymarket are reviewed in the Hub and delivered to the Awards App inbox.
- Multiple winners are normalized into `WinnersJSON`.

## Manager health controls

The Reality TV Manager Hub card now shows:

- Connected or needs attention
- Queued outbound jobs
- Failed outbound jobs
- READY inbound result rows

It also provides:

- `Sync Queue Now`
- `Retry Failed`

## Deferred to the next phase

- Applying `ExternalResultsInbox` rows through Awards App settlement engines
- Awards Show Manager UI and mapping workflow
- Automatic polling triggers for Kalshi and Polymarket
- Hub-wide review dashboard enhancements

## Safety boundary

The Awards App remains authoritative for game configuration, scoring, Reality TV roster updates, and next-episode creation. The External Results Hub is an intake, mapping, review, and delivery system.
