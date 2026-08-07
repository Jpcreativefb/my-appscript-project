# Production Smoke Test v1.2.1

1. Deploy Awards App backend and frontend.
2. Open Reality TV Manager > External Results Hub.
3. Confirm the card names the expected External Results Hub spreadsheet.
4. Confirm old v1.2.0 COMPLETE jobs appear as unverified complete.
5. Click Requeue Unverified once.
6. Click Sync Queue Now if jobs remain queued.
7. Confirm each processed outbox row contains TargetSpreadsheetId, TargetSpreadsheetName, WriteReceiptJSON, and VerifiedAt.
8. Open the named Hub spreadsheet and confirm rows exist in ExternalEvents / ExternalMarkets and, for episode bundles, ExternalSubjects / AppMappings.
9. Confirm the outbox job remains COMPLETE only after the Hub rows are visible.
10. If the configured Hub name is wrong, reconnect the correct Hub before requeueing.
