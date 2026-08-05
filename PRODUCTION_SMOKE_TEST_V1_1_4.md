# Production Smoke Test v1.1.4

## Deployment

1. Push Apps Script with `clasp push -f`.
2. Edit the existing web-app deployment and choose **New version**.
3. Push frontend changes to GitHub.
4. Wait for the Cloudflare Pages deployment.
5. Hard-refresh the browser with Command + Shift + R.

## Player Reality TV test

1. Sign in as a normal user.
2. Open a Reality TV game.
3. Confirm the questions and saved picks appear without waiting for the season leaderboard.
4. Confirm the gold player loader does not remain for two minutes.
5. Confirm the score summary, compact leaderboard, and Season Survivor card may populate shortly after the questions.
6. Select an answer before the optional statistics finish and confirm the selected UI is not erased.
7. Save a pick, refresh, and confirm it remains saved.
8. Switch to another page and return to Picks; confirm the return is faster.

## Console expectations

There should be no `PICKS STARTUP PAYLOAD ERROR` timeout.

A warning such as `Reality TV player statistics loaded later or were skipped` means only an optional enhancement failed; the player must still be able to use and save the Picks page.

## Regression checks

- Open a non-Reality fixed-points game.
- Open a hybrid game.
- Save a normal fixed pick.
- Save a Season Survivor Pick.
- Confirm the Reality TV episode sections remain grouped correctly.
- Confirm weekly header statistics update when the deferred statistics response finishes.
