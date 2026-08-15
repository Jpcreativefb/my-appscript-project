# Production Smoke Test — Reality TV Approval Progress v1.1.16

## Before testing

1. Copy the changed files into the current project.
2. Run `clasp push`.
3. Update the existing Apps Script web-app deployment to a new version.
4. Push the frontend to GitHub and wait for Cloudflare Pages.
5. Hard-refresh the app.

## Main elimination approval

1. Submit a valid main elimination result.
2. Select **Approve & Build Next Episode**.
3. Confirm the progress card immediately shows **Settle Result** and a moving bar.
4. Confirm elapsed time increases while the request is active.
5. Confirm the UI advances to **Create Next Episode**.
6. Confirm **Build Extra Questions** shows a real count such as `1 of 4`, `2 of 4`, and so on.
7. Confirm **Finalize** appears before **Ready**.
8. Confirm the final value is 100%.
9. Confirm the next episode and all enabled questions exist without duplicates.

## Remaining-time behavior

1. Confirm the progress card displays `Estimated remaining: about ...`.
2. If a stage exceeds its estimate, confirm the text changes to `Taking longer than estimated — still working`.
3. Do not require the estimate to be exact; verify it changes after stage checkpoints.

## Recovery

1. Refresh during an approval and reopen the season.
2. Confirm the saved stage and elapsed time are still visible.
3. If no heartbeat has changed for more than 150 seconds, confirm the stalled warning appears.
4. Use **Reset Stuck Approval**, then **Resume Approval**.
5. Confirm completed stages are not intentionally repeated.

## Supplemental question approval

1. Approve one Extra Question result.
2. Confirm its card shows **Settle question → Finalize → Ready** progress.
3. Confirm it does not create another episode.

## External Results Hub

With no Hub configured, confirm Finalize completes without an External Results Hub access delay. Hub integration will be validated separately when that phase is connected.
