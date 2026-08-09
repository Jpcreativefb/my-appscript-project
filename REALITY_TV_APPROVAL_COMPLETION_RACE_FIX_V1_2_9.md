# Reality TV Approval Completion Race Fix — v1.2.9

## What failed

A long Reality TV episode settlement could run longer than the old two-minute processing lease. The watchdog could then reclaim the same `SETTLE` stage while the first worker was still alive.

If the newer worker completed `FINALIZE_CURRENT` first, the older `SETTLE` worker could later write its stale checkpoint back over the queue. That produced an inconsistent row such as:

- `ReviewStatus = APPROVED`
- `PushStatus = EPISODE SETTLED`
- `ApprovalStage = FINALIZE_CURRENT`

The episode itself could already be `FINAL` and the next episode could already exist, while the Reality TV Manager continued to display an in-progress percentage.

## Fixes

1. Main episode approval processing lease increased from 2 minutes to 7 minutes so a live Apps Script worker is not reclaimed prematurely.
2. Stage claiming re-reads `ReviewStatus` and `ApprovalStage` under the approval lock and refuses to reclaim an already-approved/completed queue.
3. The long `SETTLE` stage re-checks its `ApprovalAttemptCount`, stage, and review status before advancing. A stale worker can no longer overwrite a newer checkpoint.
4. `apiAdminGetRealityTvApprovalState` repairs an already-approved mixed-state queue to canonical values when its episode is already `FINAL`:
   - `PushStatus = PUSHED`
   - `ApprovalStage = COMPLETE`
5. Backend progress treats `ReviewStatus = APPROVED` as authoritative and reports 100% even if an older stage value remains.
6. Frontend progress also forces an approved queue to `COMPLETE`, preventing 62%/88% stale displays.
7. Frontend route and service-worker cache versions were bumped so the corrected Reality TV Manager loads immediately after deployment.

## Existing Episode 8 repair

No manual sheet edit should be needed.

After deploying v1.2.9, open or refresh Reality TV Manager. The approval-status endpoint will detect the already-approved Episode 8 queue whose episode is `FINAL` and normalize the queue to `PUSHED / COMPLETE`.

Expected `RealityResultQueue` state afterward:

```text
QueueId: rt-queue-712dcf8dda0445a1aa
ReviewStatus: APPROVED
PushStatus: PUSHED
ApprovalStage: COMPLETE
```

Then use:

**Admin → External Results Inbox → Sync Reality Status**

The Hub elimination batch should become `APPLIED`.

## Files changed

- `backend/engines/RealityTvSeasonEngine.js`
- `frontend/js/pages/adminRealityTv.js`
- `frontend/js/app.js`
- `frontend/app.js`
- `frontend/app.html`
- `frontend/sw.js`
- `tests/reality_tv_approval_progress_v1116_tests.js`
- `tests/reality_tv_approval_completion_race_v129_tests.js`

## Validation

- 70 / 70 JavaScript regression test files passed.
- 96 / 96 backend/frontend JavaScript syntax checks passed.
- Dedicated v1.2.9 race test reproduces `APPROVED + FINALIZE_CURRENT + EPISODE SETTLED` and verifies it reports 100% complete.
