# PATTC Predicts v1.2.18v3 — Reality Forward + Team Fantasy Compare Restore

This release resolves the version-order collision between the Reality TV v1.2.18v2
cast-forward update and the Team Fantasy Compare restoration that was initially also
numbered v1.2.18v2.

## Reality TV preserved / carried forward

- New-season and existing-season Reality cast prepare/preview/load/import calls use
  authenticated Apps Script JSONP transport instead of the generic POST upload bridge.
- Direct doGet routes remain available for the six Reality cast staging actions.
- RealityCastImport staging-row recovery preserves checked rows with contestant/team
  identity even when routing metadata is blank.
- Server-owned routing columns remain hidden.
- The current season/draft keeps a visible 24-row prepared block.
- Checkbox validation is limited to owned rows and existing TRUE selections survive.
- The Reality frontend cache marker remains on the cast-forward build.

## Team Fantasy restored

- Compare remains a major player feature next to Weekly Standings.
- Compare supports 2–6 league teams with a single + Add Team control.
- The viewer/user column remains frozen on the left.
- The viewer header gets a higher stacking layer so scrolling team headers disappear
  behind it rather than covering the viewer team name/points.
- Past-week selection remains available in Weekly Standings and Compare.
- Weekly Picks keeps Rules and Scoring & Position Stats near the top.
- Position order remains QB, RB, WR/TE, OL, K, DL, LB, DB.
- Two-column Weekly Picks keeps QB/RB/WR-TE/OL on the left and K/DL/LB/DB on the right.
- Admin Team Fantasy Test Lab remains available while testing continues.

## Release ordering

v1.2.18v3 deliberately uses a new release number. It does not overwrite the existing
v1.2.18v2 Reality release metadata, and its installer can safely run whether the Reality
cast-forward patch has already been deployed or still needs to be carried forward.
