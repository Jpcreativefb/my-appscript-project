# Production Reality TV Durable Approval Watchdog v1.2.4

## Purpose

v1.2.4 fixes the long-running Reality TV episode finalizer that could remain on
`SETTLE_QUESTIONS` for tens of minutes or hours and require repeated Reset/Resume actions.

## Root causes fixed

1. The master episode finalizer tried to settle every Extra Question and recalculate scores
   inside one Apps Script execution. If Google terminated that execution, the master queue
   had no durable per-question checkpoint.
2. The approval continuation used a one-shot trigger. If that execution was terminated,
   there could be no trigger left to continue the job.
3. Stale processing rows could fall out of the approval-owner query, leaving an APPROVING
   episode with no server worker.
4. Stage ownership freshness used general `UpdatedAt` rather than the approval heartbeat.
5. Old v1.2.2/v1.2.3 stalled approvals had no durable Extra Question counters.

## New workflow

- One Extra Question is settled per durable worker pass.
- After each question, the question queue and main episode queue are checkpointed.
- A separate `SCORE_QUESTIONS` stage recalculates episode scores once.
- Elimination settlement and current-episode finalization remain separate stages.
- A fast ~10-second continuation trigger advances normal work quickly.
- A persistent one-minute watchdog remains installed while approval work exists.
- If a fast execution is killed, the watchdog reclaims the stale stage automatically.
- Reopening/polling an old stalled approval restores the missing watchdog and upgrades
  the old queue in place. No Reset is required for the normal recovery path.
- Reset is retained only as an emergency **Force Recovery** action.
- Hub synchronization remains outside the local finalization critical path.

## Durable main-queue fields

The existing `RealityResultQueue` sheet automatically gains:

- `ApprovalQuestionCompletedCount`
- `ApprovalQuestionTotalCount`
- `ApprovalCurrentQuestionQueueId`
- `ApprovalCurrentQuestionLabel`
- `ApprovalQuestionScoresRecalculated`

No manual sheet edits are required.

## Existing stalled Episode recovery

After deploying v1.2.4, reopen the season containing the stalled episode. The approval-state
poll automatically detects a legacy stale `SETTLE_QUESTIONS` job, converts it to the durable
queue format, restores the fast continuation and watchdog, and continues from the first
unfinished Extra Question.

The historical **Total elapsed** value is preserved, so an approval that already waited
105 minutes will still show that total. Progress should now advance by saved question counts
instead of remaining at a fixed percentage.

Only use **Force Recovery** if no saved checkpoint changes for more than five minutes after
v1.2.4 is deployed and the page has been reopened.

## Deployment

Awards App backend and frontend deployment are required.

The separate External Results Hub Apps Script source is unchanged and does not need `clasp push`.
