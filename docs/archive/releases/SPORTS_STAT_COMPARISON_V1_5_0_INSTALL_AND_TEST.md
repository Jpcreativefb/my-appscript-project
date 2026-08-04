# Sports Stat Comparison v1.5.0 — Install and Test

## 1. Update the separate Sports Scores Engine

Copy this file into the Sports Scores Engine Apps Script project:

- `external-engines/sports-scoring-engine/src/SportsScoresEngine.js`

Deploy a new web-app version. No setup function is required for this update.

This deployment is required for server-side multiple-team, season, and week filters.

## 2. Deploy the frontend

Deploy these files through GitHub / Cloudflare Pages:

- `frontend/sports.html`
- `frontend/js/sports.js`
- `frontend/css/sports.css`
- `frontend/sw.js`

No Awards App backend deployment is required for v1.5.0.

After Cloudflare finishes, hard refresh with Command + Shift + R.

## 3. Test the Sports page Team field

Enter:

`Cubs, White Sox`

Press Enter or Reload. Games containing either team should be shown.

Also test abbreviations:

`CHC, CWS`

## 4. Test the standalone comparison section

Log in as an admin and open the Sports page.

A standalone Create Stat Comparison section should appear above the score status.

### Date Range test

1. Choose MLB.
2. Choose Date Range.
3. Enter dates containing a Cubs game and a White Sox game.
4. Select Open Comparison Builder.
5. Search for `Cubs, White Sox`.
6. Both teams should remain visible and selectable.

### Week test

1. Choose NFL or College Football.
2. Choose League Week.
3. Choose Season Year, optional Season Phase, and Week.
4. Open the builder.
5. Every stored game in that league/week should load.

Week mode should be unavailable for leagues that do not use the stored football Week field.

## 5. Test player labels and positions

Player rows should display:

`Name · Position · Team`

For NFL, test OFF, DEF, and WR/TE/RB. Select more than one individual position and verify all matching players remain visible.

For MLB, test Pitchers, Infield, and individual positions such as SP, 1B, and C when those positions are supplied by the roster source.

## 6. Regression test

Run:

```bash
for f in tests/*.js; do node "$f" || exit 1; done
```

Expected result: all 15 test suites pass.
