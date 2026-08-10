# Awards Manager v1.2.14 — Event-first selection

## Changes
- Search results are grouped by provider event instead of a flat list of binary markets.
- `View Event` replaces the non-writing `Create Question` search button.
- Opening an event fetches the full live event directly from Kalshi or Polymarket.
- All live markets in the selected event are shown as checkable answers.
- Answer labels remain editable before creating the Awards App question.
- The Awards App question defaults to the provider event title.
- The search-result batch no longer limits how many answers are available inside a selected event.
- Single-market events continue to create normal Yes/No questions.
- Multi-market events create one question with one answer per selected market.
- Hub mappings remain admin-reviewed; automatic settlement stays off.

## Example
Provider event: Who will be #3 on the Pro Football Top 100 List?

Markets:
- Will Danielle Hunter be #3?
- Will Will Anderson Jr. be #3?
- Will Tristan Wirfs be #3?

Awards App question:
- Who will be #3 on the NFL Top 100?

Answers:
- Danielle Hunter
- Will Anderson Jr.
- Tristan Wirfs

Each answer retains its own provider market and live probability.
