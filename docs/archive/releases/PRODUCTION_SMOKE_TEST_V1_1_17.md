# Production Smoke Test — Reality TV Approval Queue v1.1.17

## Deploy first

1. Copy the changed files into the current project.
2. Run `clasp push`.
3. Update the existing Apps Script web-app deployment to a new version.
4. Push the frontend to GitHub and wait for Cloudflare Pages.
5. Hard-refresh the application.

## Recover current approvals

1. Open MasterChef and note its saved stage, percentage, Extra Question count, and Last checkpoint age.
2. Select Resume Approval once if it is still approving.
3. Confirm the percentage never decreases.
4. Confirm Extra Questions advance `0 of 4 → 1 of 4 → 2 of 4 → 3 of 4 → 4 of 4`.
5. Confirm the approval reaches Ready.
6. Open Survivor.
7. If its Last checkpoint age exceeds two minutes, select Reset Stuck Approval once, then Resume Approval once.
8. Confirm it resumes from the first unfinished stage and reaches Ready.

## Real next-episode checkpoints

Approve a test main elimination and confirm the progress labels move through:

```txt
Settling episode result
Preparing the next episode
Creating the main elimination question
Adding next-episode contestants
Saving the next episode
Building Extra Questions N of N
Finalizing approval
Approval complete
```

Confirm Episode 2 has one main question, the correct active answer roster, and no duplicate categories or nominees.

## Concurrent show test

1. Start one main-elimination approval in a test season.
2. While it is running, start another test season's main approval.
3. Confirm the second displays **Waiting for another approval**.
4. Confirm it does not show a stalled warning while waiting.
5. Confirm it begins automatically after the first approval reaches Ready.

## Progress accuracy

1. Confirm the percentage does not move backward.
2. Confirm the bar does not climb through a stage without a saved checkpoint.
3. Confirm Last checkpoint age resets after every server checkpoint.
4. Confirm a processing checkpoint older than 150 seconds displays the stalled warning.
5. Confirm a waiting approval does not display the stalled warning.

## Browser independence

1. Start a test approval.
2. Close or reload the manager after one stage.
3. Reopen the season after the server trigger runs.
4. Confirm the approval advanced or completed without repeating settlement.

## External Results Hub

Perform this smoke test with the Hub unconfigured. Confirm Finalize skips Hub work. Hub integration should be tested separately after local approval timing is stable.
