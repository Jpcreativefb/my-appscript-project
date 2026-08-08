# External Results Inbox v1.2.6

## Purpose

Complete the first safe Hub-to-Awards-App application path without allowing the separate Hub spreadsheet to write directly to scoring sheets.

## Routing

- Manual Awards, Kalshi, Polymarket: validate and manually apply through CategoryResults and normal category settlement metadata.
- Manual Reality TV Extra Questions: stage into RealityQuestionResultQueue.
- Manual Reality TV elimination: stage into RealityResultQueue so roster updates, episode finalization, and next-episode preparation remain owned by the Reality TV engine.
- Sports/Racing: rejected from this path.

## Safety gates

Every batch must be FINAL, map to an existing game/category, cover every current category nominee, contain only valid nominee IDs, and not conflict with an already-settled local result. Multiple winners are preserved. Matching already-settled results are treated as idempotent success.

Automatic apply remains disabled. An administrator uses Validate Ready and Apply Validated from the main Admin page.
