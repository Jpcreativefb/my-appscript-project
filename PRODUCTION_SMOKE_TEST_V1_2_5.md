# Production Smoke Test — v1.2.5

1. Open a Reality TV game and expand a FINAL historical episode.
2. Expand the main elimination question. Confirm only the actual eliminated winner(s) are grayscale and display **ELIMINATED**.
3. Expand a non-elimination question from that same episode. Confirm the eliminated contestant is not automatically grayscale merely because they left that episode.
4. Check an immunity/reward/safety/challenge question. Confirm the settled answer is highlighted with the appropriate result badge/overlay.
5. Check a question settled with two or more winners. Confirm every winning answer is highlighted.
6. Confirm the collapsed question header lists all winner names, separated by commas.
7. If the user's pick matches any winner in a multi-winner result, confirm the question shows correct/winner status.
8. Check an open/current episode. Confirm unsettled nominees have no result overlay.
9. Verify normal pick selection remains disabled only by existing lock/settlement rules.
10. Hard refresh once after Cloudflare deployment to ensure v310 assets are active.
