# External Results Hub Bridge v1.2.0 Smoke Test

## A. Deploy the Awards App backend

1. Copy the changed files into the project root.
2. From the main project folder run `clasp status`.
3. Run `clasp push`.
4. Update the existing Apps Script web-app deployment with a new version.
5. Keep the existing production web-app URL.

## B. Deploy the Hub script

1. Open `external-engines/external-results-hub` in Terminal.
2. Run `clasp status` and confirm it references the Hub Script ID.
3. Run `clasp push`.
4. Open the External Results Hub spreadsheet.
5. Run `External Results Hub → 1. Setup / Repair Hub`.
6. Run `External Results Hub → Run Health Check`.

## C. Deploy the frontend

1. Push the repository branch to GitHub.
2. Wait for the Cloudflare Pages production deployment.
3. Hard-refresh the app.

## D. Verify the bridge

1. Open Reality TV Manager.
2. Confirm the Hub card shows the connected spreadsheet and bridge counts.
3. Create or update an episode.
4. Confirm `ExternalResultsHubOutbox` receives a `QUEUED` job.
5. Select `Sync Queue Now`.
6. Confirm the job becomes `COMPLETE`.
7. Confirm the Hub receives or updates the event, market, subject, and mapping rows.
8. Confirm the Reality TV action itself completes without waiting for the Hub sync.

## E. Verify retries

1. Temporarily disconnect or use an inaccessible Hub ID in a test copy only.
2. Queue one Hub job.
3. Run `Sync Queue Now`.
4. Confirm the outbox job becomes `RETRY` or `ERROR` with a visible error.
5. Restore the correct Hub ID.
6. Select `Retry Failed`, then `Sync Queue Now`.
7. Confirm the job becomes `COMPLETE`.

## F. Verify inbound delivery without settlement

1. In the Hub, use a mapped test result.
2. Approve the ReviewQueue row.
3. Run `Deliver Approved Results to App Inbox`.
4. Confirm one or more rows appear in the Awards App `ExternalResultsInbox` with `Status = READY`.
5. Confirm no new `CategoryResults` rows are written by the Hub.
6. Do not manually change the inbox status. Automatic application is part of the next phase.

## Pass criteria

- Reality TV approval remains fully local and completes even if the Hub is unavailable.
- Outbound Hub jobs retry safely and are duplicate-resistant.
- Hub-approved results arrive in `ExternalResultsInbox` rather than `CategoryResults`.
- Existing v1.1.18 Reality TV approvals, question builds, voting, and scheduling remain functional.
