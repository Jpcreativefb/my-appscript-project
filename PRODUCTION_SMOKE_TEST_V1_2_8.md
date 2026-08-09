# Production Smoke Test — External Results Hub v1.2.8

## A. Deploy — AWARDS APP CLASP

Use the main Awards App folder:

```bash
cd /Users/joel/my-appscript-project
pwd
clasp status
```

`clasp status` must show many `backend/...` files.

Then:

```bash
clasp push
```

In the **Awards App Apps Script** project:

1. Deploy → Manage deployments
2. Edit the production deployment
3. New version
4. Description: `External Results Hub end-to-end v1.2.8`
5. Keep the same production URL

## B. Deploy — EXTERNAL RESULTS HUB CLASP

Use the separate Hub folder:

```bash
cd /Users/joel/my-appscript-project/external-engines/external-results-hub
pwd
clasp status
```

`clasp status` must show only the Hub files such as:

```text
HubCore.js
ProviderAdapters.js
ReviewAndBridge.js
Diagnostics.js
appsscript.json
```

Then:

```bash
clasp push
```

No Awards App backend files should appear in this `clasp status`.

Refresh the External Results Hub spreadsheet after the push.

## C. Deploy frontend / GitHub

```bash
cd /Users/joel/my-appscript-project
git status
git add .
git commit -m "Finish External Results Hub end-to-end reliability"
git pull --rebase origin architecture-cleanup
git push origin architecture-cleanup
```

If a rebase conflict appears, stop and resolve it before pushing. Do not force-push.

After Cloudflare finishes, hard refresh the Awards App with `Command + Shift + R`.

## D. Verify new Hub menu

Open the External Results Hub spreadsheet and verify these menu items exist:

```text
Sync Kalshi Discovery
Sync Polymarket Discovery
Sync Mapped Kalshi Results
Sync Mapped Polymarket Results
Sync All Mapped Results
Install Hourly Mapped Result Watch
Remove Mapped Result Watch
Deliver Approved Results to App Inbox
```

## E. Duplicate/idempotency test

Use the already-settled Manual Awards test result that maps to:

```text
GameId: winn-2026
CategoryId: cool-dude
Winner: tkaiya
```

Re-deliver the same approved Hub review.

Expected:

- Hub must not add duplicate Inbox rows when the same DeliveryIds already exist.
- If a clean re-delivery is created, `Validate Ready` must recognize the already-settled identical local result and mark it `APPLIED` without another settlement write.
- `CategoryResults` must still contain only one canonical row per nominee for this category.

## F. Reality TV Extra Question test

Choose one OPEN current Reality TV Extra Question that does not already have a submitted result.

1. Create/import the matching `manual-reality-tv` result in the Hub.
2. Confirm complete active AppMappings exist for every answer in that question.
3. Approve the Hub ReviewQueue row.
4. Deliver to App Inbox.
5. In Awards App Admin → External Results Inbox: `Validate Ready`.
6. `Apply Validated`.

Expected Inbox state:

```text
STAGED_REALITY
NativeRoute = REALITY_QUESTION
NativeQueueId = <real RealityQuestionResultQueue QueueId>
NativeStatus = PENDING
```

Open Reality TV Manager and approve/finalize the native question result normally.

Then return to Admin → External Results Inbox and use **Refresh Status** or **Sync Reality Status**.

Expected:

```text
Status = APPLIED
NativeStatus = APPROVED
```

No second RealityQuestionResultQueue row may be created for the same Hub review.

## G. Reality TV elimination test

After the Extra Question path passes, repeat using one controlled `manual-reality-tv` elimination result for an open episode.

Expected after Apply Validated:

```text
STAGED_REALITY
NativeRoute = REALITY_MAIN
```

The normal durable Reality episode finalizer remains responsible for:

- Extra Question settlement
- episode score recalculation
- elimination settlement
- episode FINAL
- roster changes
- next-episode preparation

After the native queue reaches APPROVED, refresh/sync the Inbox and verify the Hub batch becomes `APPLIED`.

## H. Provider watch test

Do not use broad discovery for the recurring watch.

Create at least one active Kalshi or Polymarket AppMapping, then run:

```text
External Results Hub → Sync All Mapped Results
```

Verify only mapped targets are polled/imported.

Then install:

```text
External Results Hub → Install Hourly Mapped Result Watch
```

Run Health Check. Expected:

```text
providerWatchInstalled = true
mappedTargets.kalshi = <active count>
mappedTargets.polymarket = <active count>
```

Automatic settlement must remain disabled and all imported results must still require administrator review.

## I. Release validation

Before packaging, the release passed:

```text
69 / 69 regression test files
182 / 182 JavaScript syntax checks
Frontend app copies match
Frontend API copies match
```
