# Phase 1 Staked ScoreMode Persistence Hotfix v1.0.5

## Problem

A Staked Prediction question could appear to save `ScoreMode = staked-points`, but Run Check could later report that no active staked-points question existed and the editor could show Fixed Points again.

## Root cause

Legacy projects can contain more than one `CategorySettings` row for the same `GameId + CategoryId`.

The previous code behaved inconsistently:

- Save Question updated the first matching row.
- Admin setup and Run Check processed all matching rows, so the last duplicate row became the visible/preflight value.

If the first row was changed to `staked-points` while a later duplicate still contained `fixed-points`, Run Check saw the later fixed-points row.

## Fix

- Added `adminCatFindSettingsRows_()` to identify every matching settings row.
- Save Question now applies intentionally supplied settings to every matching duplicate row.
- The legacy single-row helper now returns the final matching row, matching the existing setup/preflight read order.
- Added an automated duplicate-row persistence regression test.

## Stake rules

Game-level Min Stake, Max Stake, and Stake Increment are the defaults for all staked questions.

Question-level values are optional overrides:

- `0` or blank = inherit the game-level rule.
- A positive value = override that rule for this question.

These values never select or change Score Mode.

## Deployment

This is an Apps Script backend change.

```bash
clasp push
```

If the web app uses fixed deployment versions, create a new deployment version afterward.

Then commit and push to GitHub.

## Retest

1. Open the Staked Prediction question.
2. Select `Staked Points`.
3. Leave question-level stake overrides at zero unless a question truly needs different limits.
4. Click Save Question once after this hotfix is deployed.
5. Return to Manage Games and run Run Check.

Expected result: the missing `staked-points` error is gone. The `No default game is currently set` warning may remain and does not block this temporary test game.
