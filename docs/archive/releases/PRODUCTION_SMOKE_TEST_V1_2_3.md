# Production Smoke Test — v1.2.3

## 1. Deploy

- Copy the v1.2.3 changed files into the project root.
- From the main Awards App project run `clasp status` and `clasp push`.
- Create a new version of the existing Awards App web deployment.
- Push `architecture-cleanup` to GitHub and allow Cloudflare to deploy.
- Hard refresh the app.
- Do not push the separate External Results Hub Apps Script project for this release.

## 2. Existing failed Hub jobs

Open Reality TV Manager -> External Results Hub.

1. Select **Repair / Retry Failed** once.
2. Select **Sync Queue Now**.
3. Confirm valid jobs complete.
4. Confirm truly obsolete dependency errors become `ARCHIVED` rather than repeatedly returning to `ERROR`.

## 3. Complete question-pack mirror

Use an open Reality TV episode with the main elimination question plus at least two Extra Questions.

1. Build/update the episode question plan.
2. Select **Sync Queue Now** if the trigger has not already completed.
3. Confirm `ExternalResultsHubOutbox` contains a verified `UPSERT_REALITY_QUESTION_PACK` job.
4. Open the Hub `ExternalMarkets` sheet.
5. Confirm the episode has one main elimination market plus one market for every Extra Question.
6. Confirm `AppMappings` contains mappings for the answers to each Extra Question.

## 4. Hub mirror health

Return to Reality TV Manager.

The Hub card should show the current episode with:

- check mark for Event
- markets found equal to markets expected
- contestants found equal to contestants expected
- mappings found at least equal to mappings expected
- `Hub mirror complete`

## 5. Extra Question result dependency test

1. Enter an Extra Question result.
2. Immediately approve/finalize the episode without manually waiting for Hub synchronization.
3. Inspect `ExternalResultsHubOutbox`.
4. Confirm `CREATE_RESULT_REVIEW` completes before its matching `UPDATE_REVIEW`.
5. Confirm the update does not fail with `ReviewQueue row has not been created yet`.
6. Confirm the Hub `ImportedResults` and `ReviewQueue` rows are present and updated.

## 6. Main elimination resolution

Finalize a test episode.

Confirm a verified `UPSERT_MARKET_RESOLUTION` job appears in the outbox and the Hub elimination market has a resolved status and winning outcome.

For a multiple-elimination test, confirm the winning outcome preserves both names.

## 7. Schedule propagation

On an open episode, change its lock time.

After Hub sync, confirm the `ClosingTime` changes for:

- the main elimination market; and
- every Extra Question market for that episode.

## 8. Removed question cleanup

On an open episode with no picks/results on the target Extra Question:

1. Remove one Extra Question using Update This Episode Only.
2. Sync the Hub queue.
3. Confirm its supplemental `AppMappings` rows are inactive.
4. Confirm its `ExternalMarket` row is marked inactive.
5. Confirm the main elimination market/mappings remain active.

## Pass criteria

The release passes when all normal Reality TV Hub work uses verified outbox jobs, every current episode question is represented in the Hub, dependency errors do not recur, and the local Reality TV approval/finalization flow remains independent of Hub availability.
