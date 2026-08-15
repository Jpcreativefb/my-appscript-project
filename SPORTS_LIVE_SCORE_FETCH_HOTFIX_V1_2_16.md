# v1.2.16 Sports Live Score Fetch Hotfix

## Problem

On August 15, 2026 the external Sports Scores Engine was reachable, but live score refreshes failed for both NFL and MLB with ESPN HTTP 403 responses. The failing URL pattern was a broad season scoreboard request such as:

`.../scoreboard?season=2026&limit=500`

This left previously loaded SportsScores rows stale while the public Sports API itself continued to respond successfully.

## Fix

- Smart live score polling now fetches a small yesterday/today/tomorrow date window instead of a season-wide scoreboard.
- Date-scoped professional-league requests omit unnecessary season, season-type, and large-result-limit parameters.
- College date-scoped requests retain the configured limit when broad group coverage requires it.
- Games from the three-day live window are de-duplicated by GameId before snapshots/upsert.
- ESPN fetches explicitly request JSON and include a clearer HTTP 403 diagnostic.
- Season/schedule builders remain separate and continue using their existing season/week/date job logic.

## Deployment scope

This hotfix changes the separate external Sports Scores Engine:

`external-engines/sports-scoring-engine/src/SportsScoresEngine.js`

It is NOT deployed by updating the main Awards App web deployment version. The Sports Scores Engine Apps Script project must receive this file and be redeployed at its existing web-app URL.

## Runtime validation

After deploying the Sports Scores Engine, call:

`?action=runSportsScoresUpdate`

Expected result: NFL/MLB should report successful league checks instead of season-wide 403 errors. Then query today's NFL scores and confirm `LastUpdated`, `State`, and scores are current.
