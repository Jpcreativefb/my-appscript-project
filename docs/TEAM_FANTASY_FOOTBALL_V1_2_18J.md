# Team Fantasy Football v1.2.18j

## What this release adds

A new `team-fantasy` game type for NFL team-unit fantasy play.

### Weekly lineup
- QB
- RB
- WR/TE
- K
- OL
- DL
- LB
- DB

Players choose **NFL teams**, not individual players. Multiple users may choose the same NFL team without conflict.

### Entry model
Admin chooses the entry mode. v1.2.18j deliberately exposes only these controlled choices:
- **Single Entry** — one eight-slot lineup per user.
- **AFC + NFC Entries** — exactly two controlled entries per user; the AFC lineup can select only AFC teams and the NFC lineup only NFC teams.

Picks are stored by `EntryId`, not `LeagueId`. Therefore one entry makes its lineup once and that exact result can count in the **Complete League** and any subleagues to which the entry belongs.

### Team usage limits
The admin chooses the maximum uses of the same NFL team **per entry + position** during the regular season. Example: Chicago may be exhausted at RB while still available at QB. Other users are unaffected.

### Schedule-aware picks
- Bye teams are removed for that week.
- Teams whose game has already started are not offered for a new pick.
- A saved pick locks when that NFL team's game starts.
- Teams playing later remain editable/selectable.

The engine first attempts the existing Sports Scores Engine schedule and falls back to ESPN's NFL scoreboard source.

### Rankings and Auto Pick
Eligible teams are ordered by their historical average fantasy-unit score for that position. Week 1 has no prior Team Fantasy scoring history, so there is no fabricated ranking; eligible teams are simply available until completed-week data exists.

Admin may independently allow:
- Random Pick
- Ranked Auto Pick

Both obey conference restrictions, bye weeks, kickoff locks and team-use limits.

### Configurable scoring
`TeamFantasyScoringRules` stores points per stat and bonus thresholds. The initial preset covers passing/rushing/receiving, kicking, OL team production, and DL/LB/DB defensive production. Every rule is editable and can be disabled.

NFL game scoring is pulled from completed/live ESPN game summaries. Team Fantasy stores the source stats and score detail for audit/recalculation.

### Standings
Every completed weekly score is compared with every other competitor in that league:
- higher score = win
- lower score = loss
- identical score = tie

Regular-season standings sort by All-Play win percentage and then fantasy points.

### True Head to Head
The player page can choose two competitors and view their direct W-L-T history and weekly scores.

### Complete League + subleagues
- `Complete League` is created automatically when enabled.
- Admin can create subleagues.
- The same entry can be assigned to multiple subleagues without making new picks.
- Each league can use combined-player or separate-entry standings and its own playoff field size.

### Playoffs
Overall Complete League qualifiers and each subleague's qualifiers are determined independently from that league's regular-season standings.

The default postseason mode is **Cumulative Postseason**. Wild Card, Divisional, Conference Championship and Super Bowl fantasy points accumulate. This prevents the championship from becoming meaningless when the Super Bowl has only two NFL teams and finalists choose identical units.

For AFC + NFC entry mode, the Complete League may combine both conference entries into one player score or show entries separately, controlled by admin. Users cannot create arbitrary extra entries in this release.

### Missing-pick reminders
The existing push-notification audience is extended so a Team Fantasy game uses slot completion instead of normal question completion. A dedicated Team Fantasy reminder can tell an incomplete user exactly which slots remain open. Slots whose eligible teams are already gone are not falsely counted as actionable missing picks.

## Admin setup

1. Deploy v1.2.18j.
2. Open **Admin > Manage Games**.
3. Create an NFL season game with type **Team Fantasy Football**.
4. Open **Admin > Team Fantasy Football**.
5. Set the season year/current week, entry mode, team-use limit, playoff sizes and scoring.
6. Optionally create subleagues and assign users.
7. Use **Install 15-min Sync** once for automatic live/final score refreshes.
8. Run **Run Check** in Manage Games. Team Fantasy has its own readiness check and intentionally does not require normal Categories/Questions.

## First production checks

Before opening Week 1 broadly:
- Open the Team Fantasy game as two test users.
- Confirm both users can choose the same NFL team at the same position.
- Confirm AFC/NFC restrictions if that mode is enabled.
- Confirm a bye team is absent.
- Confirm a started team cannot be selected and an already-started saved pick is locked.
- Use a low test use-limit and confirm the same team disappears only for that entry/position after the limit.
- Complete a test scoring week and verify All-Play and True H2H results.
- Create a subleague and confirm the same entry/picks appear in Complete League and the subleague.
- Preview missing-pick reminders before sending.

## Source-data note

The scoring UI exposes the supported Team Fantasy stat keys. ESPN box-score availability can vary by game/feed. The engine stores the raw normalized stats used for each scored unit so a result can be audited and rescored after an admin scoring-rule change or source correction.
