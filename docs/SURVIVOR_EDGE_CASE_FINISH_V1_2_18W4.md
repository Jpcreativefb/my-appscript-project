# PATTC Predicts v1.2.18w4 — Survivor Edge-Case Finish

This release completes the remaining standalone Survivor / Elimination game edge cases on top of v1.2.18w3.

- Known game participants remain visible in Survivor standings even if they have not saved a Survivor pick yet.
- A participant who misses a settled round is marked `Missed — Eliminated` at that round.
- The current viewer is included in Survivor state/standings before their first saved pick.
- Final surviving entries are promoted from `ALIVE` to `WINNER` after all Survivor rounds are settled.
- Multiple final survivors are supported as co-winners.
- Standings keep active/winner entries above eliminated entries, then sort eliminated entries by rounds survived and points.
- Existing round-order protection, eliminated-choice filtering, points, and lock behavior are preserved.
