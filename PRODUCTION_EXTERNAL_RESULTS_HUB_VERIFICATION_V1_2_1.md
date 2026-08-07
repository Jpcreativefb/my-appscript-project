# External Results Hub Bridge Verification v1.2.1

## Purpose
v1.2.0 could mark an outbox job COMPLETE after a bridge handler returned even if the payload produced no usable Hub rows or the operator was looking at a different Hub spreadsheet. v1.2.1 requires read-after-write verification and records a receipt identifying the exact target spreadsheet.

## Changes
- Added target spreadsheet ID/name, write receipt JSON, and verified timestamp to ExternalResultsHubOutbox.
- Hub upserts now validate required key fields.
- Every write is read back by its unique key before the job may become COMPLETE.
- Zero-row bridge jobs fail instead of silently completing.
- Hub health reports row counts and unverified legacy COMPLETE jobs.
- Added Requeue Unverified recovery action for v1.2.0 COMPLETE jobs.
- UI identifies the configured Hub spreadsheet by name.

## Recovery
After deployment, open Reality TV Manager > External Results Hub. If unverified complete is greater than zero, use Requeue Unverified once, then Sync Queue Now. The writes are idempotent upserts.
