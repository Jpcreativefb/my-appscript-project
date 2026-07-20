# Sports Scores Engine College Coverage + ESPN Season Types Patch

This patch updates the external Sports Scores Engine and Sports Controls UI.

## Main changes

- `SportsGames` now populates whenever score rows are fetched/written.
- `SportsSeasonJobs` now supports `SeasonYear`, `SeasonType`, `SeasonPhase`, `Source`, `GroupId`, `TeamId`, and `FetchMode`.
- College football and college basketball can use broader ESPN group pulls instead of default/top-25-only scoreboards.
- Selected smaller schools can be included by entering ESPN team IDs and choosing `Selected Schools`.
- ESPN season types are supported:
  - `1` preseason
  - `2` regular season
  - `3` postseason
- Manual dates remain available as a fallback or safety window.
- Odds API logs now write to both `SportsOddsApiLog` and `OddsApiLog`.

## Setup after copying files

In the Sports Scores Engine Apps Script project, run:

```js
setupSportsScoresSheet
setupAllSportsOddsSheets
```

Then use Admin > Sports Controls > Season > Build Schedule.

## College smaller-school workflow

For college football, men's college basketball, or women's college basketball:

1. Open the league card.
2. Open Season > Advanced dates / college coverage.
3. Choose one of:
   - `All D1 / FBS`
   - `Selected groups`
   - `Selected schools`
4. For selected schools, enter comma-separated ESPN team IDs.
5. Save.
6. Build Schedule.
7. Run Season Batch.

If a school exists in ESPN, the team schedule mode can pull it even when the default scoreboard does not show it.
