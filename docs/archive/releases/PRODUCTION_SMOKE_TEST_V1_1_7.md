# Production Smoke Test v1.1.7

## Deployment confirmation

- [ ] `clasp push -f` completed.
- [ ] Existing Apps Script web deployment was updated to a new version.
- [ ] Git commit was pushed.
- [ ] Cloudflare Pages deployment succeeded.
- [ ] Browser was hard-refreshed twice.
- [ ] Console shows assets using `307-reality-tv-survivor-comparison`.

## Sole Survivor Pick

- [ ] Score & Standings appears first.
- [ ] Sole Survivor Pick appears immediately below it.
- [ ] Portrait stays inside its card and does not overlap the compact leaderboard.
- [ ] Before selection, the image box shows a safe placeholder rather than a random contestant.
- [ ] Choosing a contestant updates the portrait immediately.
- [ ] Bio & details reflect the selected contestant.
- [ ] Browse contestant bios opens and each preview works.
- [ ] **Finalize Pick** is red and requires confirmation.
- [ ] After finalization, the dropdown disappears.
- [ ] Attempting to change the finalized active pick is rejected.

## Elimination replacement

- [ ] Settle an episode that eliminates the saved Sole Survivor Pick.
- [ ] Eliminated portrait becomes grayscale.
- [ ] **ELIMINATED** appears over the portrait.
- [ ] Dropdown returns with only active contestants.
- [ ] Replacement preview and finalization work.

## Stats and mobile

- [ ] Survivor stats display multiple items per row.
- [ ] Current Episode is one full-width row.
- [ ] At 320–390 px width, portrait, dropdown, button, stats, and long titles stay inside the screen.

## Weekly picks

- [ ] Select an answer.
- [ ] Selection shows immediately with a saving state.
- [ ] Save succeeds without a full page reload.
- [ ] Saved question collapses after the short delay.
- [ ] Next unanswered unlocked question opens and scrolls into view.
- [ ] Changing an ordinary weekly answer before lock works according to Reality TV Player Pick Rules.

## Extra questions

- [ ] Select the desired extra-question templates.
- [ ] Select **Save Format & Build Current Episode** once.
- [ ] Confirm every selected question is Built or Verified.
- [ ] Confirm every playable question has its expected answers.
- [ ] When a question or answer is missing, select **Verify & Repair Extra Questions**.
- [ ] Confirm the repair reuses valid rows and restores only missing records.
- [ ] Confirm Hub mapping status does not block the local question build.

## Locked comparison

- [ ] Before episode lock, the group comparison is not shown.
- [ ] After episode lock, reload or revisit the game.
- [ ] Open the locked episode comparison.
- [ ] Confirm player names, Sole Survivor Picks, and weekly answers are present.
- [ ] Confirm the grid scrolls horizontally on mobile.

## Performance evidence

- [ ] Record one normal pick-save Apps Script execution duration.
- [ ] Confirm no broad full-app cache clear occurs.
- [ ] Confirm no player page request times out.
