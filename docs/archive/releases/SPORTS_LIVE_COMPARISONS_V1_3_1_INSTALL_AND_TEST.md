# Sports Live Comparisons v1.3.1 — Install and Test

## 1. Copy the changed files

Extract the changed-files zip over the repository root and preserve the folder structure.

## 2. Deploy the separate Sports Scores Engine

Copy/push these files to the Sports Scores Engine Apps Script project:

- `external-engines/sports-scoring-engine/src/SportsScoresEngine.js`
- `external-engines/sports-scoring-engine/src/SportsAdvancedStatsEngine.js`

Run once in the Sports Scores Engine editor:

1. `setupSportsScoresSheet`
2. `setupSportsAdvancedStatsSystem`

Then create a new web-app deployment version.

For NCAA conference selection, confirm `SportsCollegeTeams` contains `ESPNTeamId`, `Abbreviation`, and `ConferenceName` values. Refresh the college schedule/scores after deployment so the new metadata is written to `SportsScores`.

## 3. Deploy the Awards App backend

Push/deploy:

- `backend/engines/SportsAdvancedQuestionEngine.js`
- `backend/engines/SportsLiveDisplayEngine.js`

Create a new Awards App web-app deployment version.

## 4. Deploy the frontend

Commit and push the frontend files. After Cloudflare finishes, hard refresh with Command + Shift + R.

## 5. Test

### Multiple search

1. Open Create Stat Comparison on an MLB game.
2. Enter `Cubs, White Sox` in Search.
3. Confirm both matching teams remain visible.
4. Try `CHC, CWS` and confirm abbreviation search works.

### League grouping

1. MLB should show `MLB Division`.
2. NFL should show `NFL Division`.
3. NHL should show `NHL Division`.
4. NBA should show `NBA Conference`.
5. NCAA should show `NCAA Conference` when conference metadata is present.
6. Choosing a group should select only loaded teams from that group.

### Player labels

On MLB or NFL, confirm player rows display in this pattern when data exists:

`Player Name · TEAM · POS — Away @ Home — Date`

### Team-only leagues

Open NHL, NBA, or NCAA Create Stat Comparison and confirm Show Entities contains Teams Only and valid team statistics are available.
