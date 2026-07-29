# Sports All-League Player Stats v1.4.0 — Install and Test

## 1. Update the separate Sports Scores Engine project

Copy or deploy these files to the separate Sports Scores Engine Apps Script project:

- `external-engines/sports-scoring-engine/src/SportsScoresEngine.js`
- `external-engines/sports-scoring-engine/src/SportsPlayersEngine.js`
- `external-engines/sports-scoring-engine/src/SportsAdvancedStatsEngine.js`

Run once from the Sports Scores Engine editor:

```javascript
setupSportsScoresSheet();
setupSportsPlayersSystem();
setupSportsAdvancedStatsSystem();
```

`setupSportsScoresSheet()` adds missing league settings and sheet columns without deleting existing settings. Newly added soccer library rows start Off.

Create a new version of the Sports Scores Engine web-app deployment.

## 2. Sync player rosters

In Awards App Admin → Sports Controls, open the league card and run **Sync Players** once for each league you plan to use.

Recommended first test order:

1. NBA
2. NHL
3. One NCAA league
4. MLS or another soccer competition
5. WNBA when in season

For soccer, enable only the competitions you want before running normal Smart Sports Sync. Roster sync can still be run for an Off league while preparing it.

Manual Sports Scores Engine helpers are also included:

```javascript
testSyncNBAPlayers();
testSyncWNBAPlayers();
testSyncNHLPlayers();
testSyncCollegeFootballPlayers();
testSyncMensCollegeBasketballPlayers();
testSyncWomensCollegeBasketballPlayers();
testSyncMLSPlayers();
testSyncSoccerLeaguePlayers("eng.1");
```

## 3. Update the Awards App backend

Deploy these backend files through the normal clasp project:

- `backend/engines/SportsPlayerPropEngine.js`
- `backend/engines/SportsAdvancedQuestionEngine.js`

From the repository root:

```bash
clasp status
clasp push
```

Then create a new version of the Awards App web-app deployment.

## 4. Deploy the frontend

The frontend update includes league-aware support, labels, player selectors, and cache busting.

```bash
git add .
git commit -m "Add all-league player stats and expanded soccer support"
git push origin "$(git branch --show-current)"
```

After Cloudflare finishes, hard refresh:

```text
Command + Shift + R
```

## 5. Validate each league

For each enabled test league:

1. Open Sports Controls.
2. Run **Sync Players**.
3. Confirm `SportsPlayers` contains player name, team, team abbreviation, and position where available.
4. Load a live or recently final game.
5. Run **Refresh Current Game Stats** for the first validation.
6. Confirm `SportsPlayerGameStats` and `SportsTeamGameStats` receive rows.
7. Open the Sports page.
8. Create a Player Prop or Stat Comparison.
9. Confirm the player selector shows `Name · TEAM · POS`.
10. Confirm live/final values appear in the Games/Wagers section.

After the first validation, normal Sports Scores polling should update live and final stats automatically.

## 6. Soccer validation

Use one league first, such as MLS:

```javascript
testSyncSoccerLeaguePlayers("usa.1");
testRefreshSoccerCurrentPlayerStats("usa.1");
```

Confirm soccer player rows include available values such as goals, assists, shots, shots on target, cards, passes, or saves.

Source coverage varies by competition and match. When a match does not publish lineups or an individual statistic, that player/stat will remain unavailable instead of receiving a guessed zero.

## 7. Add another soccer competition

Add a `SportsSettings` row using:

- `Sport`: `soccer`
- `League`: the ESPN league slug
- `ESPNScoreboardUrl`: `https://site.api.espn.com/apis/site/v2/sports/soccer/<league>/scoreboard`

No parser code change is required. Then run Sync Players for that league and enable the league when ready.
