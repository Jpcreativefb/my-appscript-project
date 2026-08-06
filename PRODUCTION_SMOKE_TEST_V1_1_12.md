# Production Smoke Test — Reality TV v1.1.12

## Deploy

1. Push the complete `backend` folder with clasp.
2. Deploy the Apps Script web app using the current deployment settings.
3. Deploy the complete `frontend` folder to Cloudflare Pages.
4. Hard-refresh the browser.

## Manual results

1. Open Reality TV Manager and expand a season.
2. Submit one supplemental question result.
3. Confirm the season stays open and the next question remains in view.
4. Approve the result and confirm the season still stays open.
5. Select `Multiple winners` for a reward or immunity question and choose two answers.
6. Approve it and confirm both answers are winners in Game Setup / CategoryResults.
7. Submit a `Multiple elimination` with two or more contestants.
8. Confirm the prediction is pushed and every selected contestant becomes inactive after approval.

## Episode votes

1. Open `Episode Vote Details`.
2. Add a valid vote, a nullified vote, a lost vote, and a revote.
3. Confirm the live tally shows valid / cast totals and nullified details.
4. Confirm the table shows voter, target, round, status, and value.
5. Edit one vote and delete another without leaving the season.
6. Before finalization, confirm players cannot see vote details.
7. Finalize the episode and confirm players can expand `Episode Vote Details` on the Picks page.

## Schedule changes

1. Open `Episode Schedule & Delays`.
2. Move the current episode to a new date and lock time.
3. Confirm the main elimination question and every supplemental question use the new lock.
4. Check `Shift every later open episode by the same amount` and save.
5. Confirm existing later episodes move by the same amount.
6. Create another future episode and confirm it uses the shifted cadence.
7. Mark an open episode `TBA`.
8. Confirm its dates clear, its questions remain, and player text reads `Air date TBA · picks remain open`.
9. Save a replacement date and confirm all question locks update without rebuilding or duplicating questions.

## Pass condition

The release passes when all result selections can be completed without returning to the manager start, multi-winner/multi-elimination results settle correctly, vote history is accurate and private until finalization, and schedule changes preserve every existing episode object and player record.
