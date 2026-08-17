# Confidence Review + Live Scoreboard v1.2.17b

This checkpoint adds the second stage of the Confidence player experience without changing the batch-save architecture introduced in v1.2.17a.

## Player experience
- Game Time and Confidence sort controls are available in the sticky Confidence toolbar.
- Confidence sorting is a working view: edit values without rows jumping, then press Confidence again to re-sort.
- The compact weekly card polls the Sports Scores Engine every 30 seconds and updates score, state, quarter/period, clock, records, and default team logos in memory.
- Pregame, live, and final states use the same compact game row.
- Final games infer the winning side from the live final score while normal settled Category results remain authoritative when already available.
- A correct selection receives the existing green result treatment; an incorrect selection receives the existing red treatment. The actual winner is restored to full color even when it was not selected.
- Confidence points earned are shown beside final results (+value for a correct pick, 0 for a Win Only loss, or -value in Risk Penalty mode).
- Odds / Records / Favorite is collapsed by default. Opening one game loads that game's cached Sports Odds data on demand instead of loading odds for the entire slate.

## Performance / safety
- Live score requests are grouped by league/date when possible, so an NFL weekly slate generally refreshes with one score request instead of one request per game.
- Odds are fetched only for expanded rows.
- Live refreshes never overwrite the local winner/confidence draft maps.
- While a player is actively interacting with a Confidence row, live data is applied in memory and the visible slate waits for the next safe render instead of jumping under the player's finger/cursor.
- The v1.2.17a Save All endpoint and batch validation are unchanged.

## Scope
This checkpoint intentionally does not add Image Packs or Theme Packs. Those remain v1.2.17c/d.
