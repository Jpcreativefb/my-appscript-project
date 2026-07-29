# Sports Live Comparisons v1.3.0

## Purpose

This release finishes the user-facing live display for the newer Sports statistics features and consolidates duplicate admin creation controls.

## Admin Sports page

- Replaces the visible **Create Player Matchup** action with one **Create Stat Comparison** workflow.
- Keeps the legacy Player Matchup backend and settlement code so existing categories continue to work.
- Supports team or player comparisons across different loaded games.
- Supports 2–12 selected entities.
- Adds quick filters for Teams + Players, Teams only, Players only, loaded teams, search, and MLB division.
- Corrects player loading so players from all loaded games in the selected league are available, not only the first game.
- Adds circular help controls beside every adjustable Player Prop and Stat Comparison field.
- Adds viewport-aware help popovers with outside-click and Escape-key close behavior.

## MLB game cards

- Displays probable starting pitchers when ESPN publishes them.
- Changes the label to confirmed starter when the live box score identifies the starter.
- Shows the active starter's current innings pitched, strikeouts, and earned runs after stats are available.
- Displays `TBD` rather than guessing when no starter has been published.

## Games / Wagers page

- Adds one batched live-status request for stat-based categories.
- Displays current values and the current leader for:
  - Player props
  - Existing Player Matchups
  - Cross-game team comparisons
  - Multi-team comparisons
  - Advanced player comparisons
  - Yes/No threshold questions
- Displays the underlying live game score and status for every selected player or team.
- Shows whether the signed-in user's current selection is ahead, behind, or tied.
- Marks live results as unofficial until every source game is final.
- Displays MLB probable/confirmed starters on ordinary MLB wager cards too.

## Cross-game examples now supported

- Cubs vs. White Sox — most runs
- Cubs vs. White Sox — most team strikeouts
- Starting pitcher from one game vs. starting pitcher from another — most strikeouts
- Every loaded NL Central team — most runs
- Any 2–12 same-league teams or players using a common supported statistic

## Settlement behavior

This release does not replace the existing settlement engine. It adds the live presentation layer and continues to use the existing Player Prop, Player Matchup, and Advanced Question settlement paths.

Recommended rules remain:

- Lock at the earliest source-game start time.
- Do not settle until all required source games are final.
- Treat tied wager comparisons as a push/refund according to the existing settlement configuration.
- Send postponed, canceled, or incomplete-source questions to the existing review/void path.

## New backend endpoints

- `getSportsGameDetails`
- `getSportsLiveQuestionStatus`

The Sports Scores Engine admin key stays on the Awards App backend and is not sent to the browser.

## Source requirements

The configured Sports Scores Engine deployment must expose:

- `getSportsPlayerGameStats`
- `getSportsTeamGameStats`

Those actions already exist in the included external Sports Scores Engine source. Deploy that engine's current web-app version if the live tracker reports an unknown action.

## Cache version

- Service worker: `awards-app-v219-sports-live-comparisons`
- Sports page asset: `sports.js?v=219-sports-live-comparisons`
- Games page betting assets also use the v219 cache-buster.

## Validation

All JavaScript syntax checks passed and all 12 repository tests passed, including the new live-display integration test.
