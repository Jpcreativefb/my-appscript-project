# Production Smoke Test — Reality TV v1.1.14

Run this test after the Apps Script and Cloudflare deployments are complete.

## 1. Deployment and cache

1. Confirm the existing Apps Script web-app deployment was updated to a new version.
2. Confirm the Cloudflare Pages production deployment completed successfully.
3. Hard-refresh the application.
4. Open Reality TV Manager and expand one season.

Expected: the parent Show Format & Episode Questions panel and all five numbered sections begin closed.

## 2. Tribe-restricted mass voting

1. Open a Survivor episode with at least two active tribes.
2. Record or confirm the Tribe Going to Tribal Council result.
3. Open Episode Vote Details.
4. Select the detected voting tribe/council.

Expected:

- one ballot row appears for every active member of that tribe;
- voter rows do not automatically include contestants from other tribes;
- every target dropdown contains only members of the voting tribe.

5. Fill in the full round and select Save Entire Vote Round.
6. Confirm the tally and ballot history update without leaving the open season.

## 3. Outside voter exception

1. Select Add Outside Voter.
2. Choose a contestant from another tribe.
3. Choose a target.

Expected: the outside contestant is permitted as the voter, but the target dropdown remains restricted to the selected voting tribe.

4. Save the round and confirm the outside ballot appears once.

## 4. Multiple councils

1. Use an episode where two tribes attend separate councils, or manually select the first voting tribe.
2. Save its voting round.
3. Select the second tribe and save its voting round.

Expected: each council retains its own voters, targets, round name, and tallies.

## 5. Approval resilience

1. Approve the main elimination result.
2. Approve at least one supplemental episode-question result.
3. While an approval is active, avoid repeated clicks; then confirm the interface reports processing rather than starting a second job.

Expected:

- no Lock timeout error;
- the season remains open;
- approval stages advance to completion;
- temporary Spreadsheet service failures, if encountered, are retried automatically;
- Resume Approval can continue a genuinely interrupted job.

## 6. Regression checks

1. Edit and delete one saved ballot.
2. Confirm finalized player vote history remains hidden before episode finalization and visible afterward.
3. Open section 4 Extra Episode Questions directly.
4. Save or verify the question pack.
5. Confirm no full-screen Loading Admin Tools overlay appears for these in-page actions.
