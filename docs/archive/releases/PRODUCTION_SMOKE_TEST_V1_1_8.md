# Production Smoke Test v1.1.8

## Deploy

1. Copy the v1.1.8 changed files over v1.1.7.
2. Run `clasp push -f`.
3. Create a new Apps Script web-app deployment version.
4. Commit and push the frontend to GitHub.
5. Wait for Cloudflare Pages to succeed.
6. Hard-refresh twice.

## Missing current episode recovery

1. Open Reality TV Season Manager.
2. Expand the affected season.
3. If the current normalized episode is missing, confirm the yellow warning appears.
4. Select `Save Format & Build Current Episode`.
5. Confirm the operation no longer reports `Current Reality TV episode not found`.
6. Confirm a row exists in `RealityEpisodes` for `CurrentEpisodeNumber`.
7. Confirm its `LockDateTime` matches the existing main Game Setup question lock time.

## Sole Survivor before lock

1. Sign in as a user before the episode lock.
2. Open the Reality TV game.
3. Select an active contestant.
4. Confirm `Finalize Pick` works while the lock time is still in the future.
5. Confirm the selector disappears after finalization.

## Individual question collapse

1. Open a weekly question.
2. Select an answer and save.
3. Confirm the complete answer area collapses after the successful save.
4. Confirm the next unanswered question opens and scrolls into view.
5. Select a question header manually and confirm that individual question opens/closes without collapsing the entire episode.

## Custom questions

1. Open `5. Custom Questions`.
2. Confirm saved custom questions are listed.
3. Choose `Active individuals / teams from roster` and confirm names appear in Answer Preview.
4. Choose `Active groups / tribes` and confirm group names appear.
5. Choose `Manual answers / judges / special choices`.
6. Enter at least two names, one per line, and confirm they appear in Answer Preview.
7. Select `Save & Build This Custom Question`.
8. Confirm the question and answers appear in the current episode.
9. Return to the form and create a second different custom question.
10. Confirm both remain listed under Saved Custom Questions.
