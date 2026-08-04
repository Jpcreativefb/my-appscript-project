# Sports Live Comparisons v1.3.0 — Install and Test

## 1. Copy the changed files

Extract the changed-files zip over the repository root. Preserve the folder structure.

## 2. Deploy the Awards App Apps Script backend

From the repository root:

```bash
clasp status
clasp push
```

Then create a new Apps Script web-app deployment version:

1. Open the Awards App Apps Script project.
2. Select **Deploy > Manage deployments**.
3. Edit the active web app.
4. Select **New version**.
5. Deploy.
6. Keep the existing web-app URL unless Apps Script explicitly creates a different deployment.

The new backend file is:

```text
backend/engines/SportsLiveDisplayEngine.js
```

It must be present in the Apps Script project before testing.

## 3. Verify the separate Sports Scores Engine

Its current web-app deployment must support:

```text
getSportsPlayerGameStats
getSportsTeamGameStats
```

The source is included at:

```text
external-engines/sports-scoring-engine/src/SportsScoresEngine.js
```

No new Sports Scores Engine source change is required by this package, but an old deployment must be redeployed.

## 4. Deploy the Cloudflare frontend

```bash
git add .
git commit -m "Add Sports live comparisons and MLB starters"
git push origin "$(git branch --show-current)"
```

Wait for the normal Cloudflare Pages deployment to finish, then hard-refresh:

```text
Command + Shift + R
```

## 5. Admin Sports-page test

1. Open the Sports page as an admin.
2. Load a date range containing at least two MLB games.
3. Confirm MLB game cards show probable pitchers or `TBD`.
4. Confirm the old **Create Player Matchup** card button is gone.
5. Select **Create Stat Comparison**.
6. Verify the help circles open and remain inside the viewport.
7. Select Teams only.
8. Select the Cubs from one game and White Sox from another.
9. Choose Runs or Team Strikeouts.
10. Create the question as a wager or prediction.
11. Repeat with an MLB division filter and 2–12 loaded teams.
12. Repeat with Players only and players from two different games.

## 6. Games / Wagers live-display test

1. Open the destination Awards Game.
2. Expand the new category.
3. Confirm the live comparison panel lists every selected entity.
4. Confirm each entity shows its underlying game score and status.
5. Confirm the current leader updates after the next Sports refresh.
6. Place a test selection and confirm the panel reports Ahead, Behind, or Tied.
7. Confirm the result remains marked unofficial until all source games are final.

## 7. Starting-pitcher test

Before first pitch:

- The card should show the published probable pitcher or `TBD`.

After first pitch and box-score availability:

- The probable label should become Confirmed Starter.
- The live line should show innings pitched, strikeouts, and earned runs when supplied by the feed.

## 8. Failure messages

- `Unknown action: getSportsPlayerGameStats` or `getSportsTeamGameStats`: redeploy the current Sports Scores Engine web app.
- `Unknown action: getSportsLiveQuestionStatus`: redeploy the Awards App Apps Script web app.
- Old frontend still visible: verify Cloudflare deployed the pushed branch and hard-refresh.
- Starter displays `TBD`: the source has not published a probable starter yet; this is not treated as an error.
