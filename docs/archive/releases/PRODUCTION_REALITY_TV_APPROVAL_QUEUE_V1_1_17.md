# Reality TV Approval Queue and Checkpoints v1.1.17

## Problem corrected

v1.1.16 could run two show approvals at the same time. Survivor and MasterChef use the same Apps Script project, Game Setup sheets, result tables, and document locks, so their long write operations could block one another. The frontend also animated percentages between persisted stages. A long request could therefore display 86%, return no completed question, and redraw at the real 57% / 0 of 4 state.

A browser interruption could leave an approval at Create Next Episode because main approval continuation was primarily browser-driven. The separate question-pack trigger could also compete with the approval while both attempted to build the same next episode.

## v1.1.17 behavior

### One approval writer

Only the oldest fresh main-elimination approval writes to shared game sheets. A second show displays **Waiting for another approval** and continues automatically when the first one finishes. A stale processing heartbeat older than three minutes is excluded from ownership so it cannot block the queue forever.

### Server continuation

Queuing, advancing, or resetting an approval schedules `realityTvContinuePendingApprovals`. The trigger continues the oldest approval even if the browser closes. Browser requests and the worker use the same brief stage claim and cannot intentionally execute the same stage twice.

### Real next-episode checkpoints

Create Next Episode now persists:

1. Preparing next episode
2. Creating main elimination question
3. Adding active contestants or teams
4. Saving the episode and season link

The normal new-episode path avoids unnecessary complete Game Setup reloads. Recovery remains idempotent if a request stops after creating the category but before saving the episode row.

### Extra Question ownership

Approval-created question-pack jobs store `ManagedBy = APPROVAL`. The generic question trigger skips those jobs. The approval worker builds one template at a time and links progress to the exact build ID.

Existing v1.1.16 jobs are migrated to approval ownership the first time Resume Approval processes them.

### Honest progress

The manager polls a read-only approval-state endpoint every three seconds. The displayed percentage uses saved server checkpoints and cannot move backward. The shimmer and elapsed timer indicate activity without inventing extra percentage. The card also shows the age of the last server checkpoint.

## Recovery for the currently reported rows

After deployment:

1. Allow the active MasterChef approval to finish or select Resume Approval once.
2. Open Survivor.
3. If Survivor shows no new checkpoint for more than two minutes, select **Reset Stuck Approval** once.
4. Select **Resume Approval** once.
5. Do not start another main-elimination approval until the first live smoke test completes. v1.1.17 will queue later approvals visibly, but the first test is easier to verify one at a time.

The reset is stage-aware. If the next episode or some questions already exist, it resumes from the first incomplete stage rather than intentionally rebuilding or settling them twice.
