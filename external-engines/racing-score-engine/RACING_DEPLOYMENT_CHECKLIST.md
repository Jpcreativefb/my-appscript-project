# Racing Deployment Checklist

1. Copy the updated backend files into the Awards App Apps Script project.
2. Copy the updated `RacingApi.js` into the Racing Score Engine Apps Script project.
3. In the Racing Score Engine project, set Script Property:
   - `RACING_SCORE_ENGINE_API_KEY`
4. Deploy the Racing Score Engine as a web app that the Awards App can call.
5. In the Awards App backend project, set Script Properties:
   - `RACING_SCORE_ENGINE_API_URL`
   - `RACING_SCORE_ENGINE_API_KEY`
6. Run in the Awards App backend project:

```javascript
setupUniversalQuestionSystem()
setupRacingWagerSystem()
```

7. Create or update a Games row with:

```text
Type = racing-wager
WagerEnabled = TRUE
ScoringEngine = racing
RacingLeague = nascar-premier
RacingSeriesId = 1
RacingMarket = race-winner
```

8. Create a racing wager using `adminCreateRacingWager`.
9. Confirm `Categories` has one row per driver.
10. Confirm `CategorySettings` has one row for the race category.
11. After results are final, run `adminSettleRacingWagers`.
12. Confirm `CategorySettings.WinnerNomineeId` and `CategoryResults` are populated.
13. Confirm betting leaderboard/payout behavior.
