# Phase 2 Reality TV Staged Approval v1.0.23

## Problem fixed

The previous `Approve & Build Next Episode` action performed all work in one request:

1. Write all CategoryResults rows.
2. Settle and lock the episode question.
3. Update eliminated contestant status.
4. Create the next episode and copy active contestants.
5. Sync the External Results Hub.

Large rosters could exceed the Cloudflare request window and return HTTP 524 before the browser received a response.

## New retry-safe workflow

Approval is now split into persisted stages:

- `SETTLE` — writes results and finalizes the current episode.
- `BUILD_NEXT` — creates the next episode using active contestants.
- `SYNC_HUB` — finishes External Results Hub records.
- `COMPLETE` — marks the queue row approved and pushed.

The current stage is stored in `RealityResultQueue`. A timeout or page refresh does not restart completed stages. The admin page shows `Resume Approval` when an approval is incomplete.

## Performance changes

- CategoryResults rows are written using a bulk helper.
- Reality TV row patches now use one row write instead of one write per field.
- Next-episode creation skips Hub synchronization until the separate Hub stage.
- Small approval-stage calls use the normal read-only API request path instead of the large-upload POST proxy.
- Non-JSON HTTP 524 POST responses now display a useful message instead of a JSON parse error.

## Safety

- Administrator approval is still required.
- Auto-settlement remains disabled.
- All stages are idempotent and safe to retry.
- Existing Episode 1 results, eliminated status, and Episode 2 creation are reused rather than duplicated.
