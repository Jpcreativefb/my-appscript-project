# Production Smoke Test v1.1.6

## Deployment

1. Push the backend with `clasp push -f`.
2. Create a new version of the existing Apps Script web-app deployment.
3. Commit and push the frontend to GitHub.
4. Confirm Cloudflare Pages deploys the same commit successfully.
5. Hard-refresh the app twice.

## Reality TV Manager

1. Open **Admin → Reality TV Season Manager**.
2. Expand the affected season.
3. Open **Player Pick Rules**.
4. Turn **Allow pick changes before lock** on.
5. Leave **Maximum changes** blank for unlimited changes.
6. Leave **Penalty per change** at `0` unless a penalty is desired.
7. Select **Save Player Pick Rules**.
8. Confirm the action reports how many existing categories were updated.

## Episode question pack

1. Confirm the selected extra-question types are correct.
2. If the button shows **Resume Build (3/4)**, select it once.
3. Confirm the counter advances and the build completes.
4. Confirm existing built/verified questions are not duplicated.
5. Confirm Hub mapping can remain deferred without blocking the local build.
6. Open Categories/Questions/Nominees and confirm every enabled question has its expected answers.

## Season Survivor Pick

1. Confirm the Season Survivor feature is enabled for the season.
2. Sign in as a normal player.
3. Open the Reality TV game.
4. Confirm the page order is:
   - score/leaderboard summary
   - Season Survivor Pick
   - episode questions
5. Confirm a visible Survivor loading placeholder appears briefly if the optional payload is still loading.

## Pick saving and changing

1. Select an answer on an unlocked Reality TV question.
2. Confirm the save completes without the old long pause.
3. Confirm the question remains open briefly, then collapses.
4. Confirm the page scrolls to and opens the next unanswered unlocked question.
5. Return to the saved question and choose another answer before lock.
6. Confirm the changed pick saves.
7. Confirm no `Penalty` or `0 changes left` text appears when the penalty is zero and maximum changes is unlimited.

## Mobile layout

1. Test at approximately 320–390 CSS pixels wide.
2. Confirm long question titles wrap to multiple lines.
3. Confirm titles, points, and controls remain within the screen.
4. Confirm answer cards remain selectable and do not create horizontal page scrolling.

## Loader

1. Enter a game from the dashboard.
2. Confirm the progress bar does not begin at 50 percent.
3. Confirm it advances while the server request is running instead of staying static.
4. Confirm the player loader shows a simple percentage.
5. Confirm admin pages still show descriptive loading text.

## Failure information to capture

If a test fails, record:

- Exact on-screen message
- Browser console error
- Network request/action name
- Apps Script execution error and duration
- Game ID, season ID, episode number, category ID, and username used
