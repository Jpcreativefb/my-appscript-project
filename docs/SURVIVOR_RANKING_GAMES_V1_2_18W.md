# PATTC Predicts v1.2.18w — Survivor + Ranking Games

This release completes the two remaining generic game types that were previously blocked from production publishing.

## Survivor / Elimination

- Survivor games now open a dedicated player page instead of the generic Picks page.
- Ordered categories/questions act as rounds.
- A player chooses one currently available entry they expect to survive the round.
- The admin records the entry eliminated in that round.
- Picking the eliminated entry, or missing a settled round, eliminates the player from later rounds.
- Safe picks earn the configured question/round points.
- Survivor standings put active players first, then order eliminated players by rounds survived and points.
- Previously eliminated choices are removed from later-round choices.
- Future-round results are ignored until all earlier rounds are settled, preventing accidental out-of-order elimination.
- Manage Game Setup relabels the result control as **Elimination Result / Eliminated Entry** for Survivor games.

## Ranking

- Ranking games now open a dedicated ordered-ballot player page.
- Players must rank every active answer exactly once from 1 through N.
- Ballots can be changed until the question locks or is settled.
- Manage Game Setup now accepts the complete official final order.
- Rank 1 is also mirrored as the compatibility winner while all ranks are stored in CategoryResults FinalRank / FinalPosition.
- Scoring uses the configured question Points as the maximum score:
  - exact position: 100% credit
  - 1 position away: 80%
  - 2 positions away: 60%
  - 3 positions away: 40%
  - 4 positions away: 20%
  - 5+ positions away: 0%
- Position credits are averaged across the full ballot and multiplied by the question's Points value.
- Ranking has its own leaderboard scoring and user scoring details.

## Admin / production readiness

- Removed the old unconditional Survivor and Ranking Run Check blockers.
- Ranking Run Check now requires at least one active Ranking-mode question and requires every active question in a pure Ranking game to use Ranking score mode.
- Ranking is production-ready as a standalone game type; Hybrid games with Ranking questions remain blocked until combined Ranking + Picks/Wagers leaderboard math is added.
- Survivor Run Check warns when fewer than two rounds exist but no longer blocks publishing.
- Ranking point fields are available in Game Setup.
- Awards Manager no longer labels Ranking as an unfinished engine.
- App routes, API routes, cache markers, and PWA assets are updated for the new pages.

## Regression coverage

`tests/survivor_ranking_games_v1218w_tests.js` verifies routing, API contracts, admin controls, scoring integration, Ranking partial-credit math, Survivor elimination logic, out-of-order round safety, mirrors, and release markers.
