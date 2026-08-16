# Sports Confidence POST Transport Hotfix v1.2.16

## Problem
The Confidence week builder still used `sportsAwardsApi_()`, which is JSONP. That meant the week loader, destination picker, and especially the large selected-week payload were sent as `<script src=...>` requests. A 16-game NFL week could fail with `Sports API script failed to load`.

## Fix
- Added `sportsAwardsPost_()` in `frontend/js/sports.js`.
- Confidence-only admin calls now POST JSON through the existing Awards POST proxy.
- Added POST handlers in `backend/Api.js` for:
  - `adminGetSportsConfidenceGames`
  - `adminGetSportsConfidenceBuilderScores`
  - `adminCreateSportsConfidenceQuestionsBulk`
- Bumped the Sports asset version in `frontend/sports.html`.

The standalone Sports scoreboard and comparison tools keep their existing transport.
