# PATTC Predicts v1.2.18y — Sports Survivor + King of the Hill Score Strikes

## What this release adds

The existing **Survivor / Elimination** game type now supports four modes without changing classic manual Survivor games:

- **Manual / Reality Elimination** — the existing ordered elimination-question game.
- **Sports Survivor** — players actively choose teams each week and survive straight-up or ATS results.
- **Streak Survivor** — the active Sports Survivor variation where consecutive wins build a multiplier. This is the mechanic that was previously called King of the Hill during design.
- **King of the Hill — Score Strikes** — the passive last-man-standing side game. Players make no extra KOTH pick. Final weekly scores from one or more configured source games are ranked and the lowest scorers receive strikes.

## Sports Survivor

Admin options include league, start/end week, straight-up or against-the-spread grading, allowed losses/lives, maximum uses per team, team-kickoff or first-game lock, missed-pick behavior, push behavior, and odds freeze rules.

Player matchup cards can show team/opponent records, home/away status, kickoff, spread/moneyline, used-team status, and an expandable team schedule. A used team remains visible but disabled when its use limit is reached.

Weekly twists include Safe Weeks, ATS Weeks, Underdogs Only, Road Teams Only, Division Weeks, Double Pick Weeks, Redemption Weeks, Second Chance Weeks, and Confidence/Risk Weeks. Extra lives can also be earned from configured win streaks.

## Streak Survivor

Streak Survivor uses the same active weekly team-selection flow as Sports Survivor. Consecutive wins grow the configured multiplier. Admin can set base points, multiplier step, maximum multiplier, and whether a loss resets, drops, or halves the streak.

The name **King of the Hill** is no longer used for this mechanic.

## King of the Hill — Score Strikes

KOTH attaches to existing scored games as a passive elimination game.

Every processed week:

1. Wait for finalized source-game weekly values.
2. Build one KOTH score per player.
3. If multiple source games are selected, combine them using **Sum, Average, Highest, or Lowest**.
4. Sort active KOTH players by weekly score.
5. Award one strike to the configured number of lowest scorers.
6. Eliminate a player from KOTH when the strike limit is reached (normally 3).
7. Leave that player's original fantasy/source game untouched.
8. Repeat until one KOTH player remains.

Each KOTH week is idempotent: once it is processed, running automation again cannot issue duplicate strikes.

### Configurable score sources

Admin can select one or multiple source games and may change the source selection later. Each processed KOTH history row stores the individual source values that produced the combined KOTH score.

**Team Fantasy** sources use native `TeamFantasyWeekScores` finalized weekly totals and can be processed automatically. If a user has multiple entries in one Team Fantasy source, Admin can combine those entries by Sum, Average, Best Entry, or Lowest Entry.

Other game types can be used through a leaderboard-delta snapshot when Admin chooses **Run Now** after that source period is final. The first generic snapshot uses the current source total; later KOTH periods use the change from the prior stored snapshot.

### Automatic strike pacing

Automatic pacing recalculates from the field that is still alive, current strike counts, strike limit, and weeks remaining.

For a new game with everyone at zero strikes, the target pressure is approximately the number of strikes still required to eliminate all but one player divided across the remaining weeks.

Examples with 3 strikes to eliminate:

- 14 players / 14 weeks: `(13 × 3) ÷ 14 = 2.79` → about **3 strike recipients** initially.
- 20 players / 14 weeks: `(19 × 3) ÷ 14 = 4.07` → about **4 strike recipients** initially.

Because the engine uses current strike counts on every pass, the target corrects itself during the season. When the field is small enough and players are near elimination, automatic pacing narrows toward one strike recipient so the final stretch tends toward one elimination at a time.

Admin can instead choose:

- **Fixed** — the same number of lowest scorers every week.
- **Custom** — for example `1-4:4, 5-8:3, 9-12:2, 13-17:1`.

### Tie handling

Admin options are:

- **Include All Ties** — tied players at the normal cutoff all receive a strike.
- **Lower Previous-Week Score** — breaks the cutoff tie using the prior KOTH week.
- **Lower Season Average** — breaks the cutoff tie using KOTH season average.

During the final stretch, the engine can narrow a tied cutoff so a tie cannot accidentally eliminate multiple brink-of-elimination users when the pacing target is one. A final-survivor safeguard also prevents a tie expansion from eliminating the entire active field.

### Start Fresh and Backfill

- **Start Fresh** — for native Team Fantasy sources, the first automatic KOTH run begins with the most recently finalized common week in the configured range.
- **Backfill Previous Weeks** — processes finalized native weekly scores beginning at the configured Start Week, in order.

## Automation

The existing Survivor 15-minute automation trigger is shared by Sports Survivor, Streak Survivor, and KOTH.

Sports Survivor/Streak Survivor automation refreshes schedules/results, grades picks, applies lives/twists, and builds the next week.

KOTH automation checks the configured source games and processes finalized native weekly scores exactly once. A manual **Process / Recheck KOTH Week** control is also available.

## Data sheets created automatically

Sports Survivor uses:

- `SurvivorSettings`
- `SurvivorPickMeta`
- `SurvivorSportsResults`

King of the Hill additionally uses:

- `KingOfHillHistory`
- `KingOfHillSourceSnapshots`

No manual sheet setup is required.

## Recommended NFL setup

### Traditional Survivor

- Mode: Sports Survivor
- League: NFL
- Win Condition: Straight Up
- Allowed Losses: 0
- Maximum Uses Per Team: 1
- Pick Lock: Each Team at Its Kickoff
- Game Ends: One Sole Survivor Remains
- Auto Grade / Auto Build / 15-Minute Automation: enabled

### King of the Hill

- Mode: King of the Hill — Score Strikes
- Score Source Game(s): select the Team Fantasy game(s)
- Combine Multiple Games: Sum or Average as desired
- Strikes to Eliminate: 3
- Distribution: Automatic — Recommended
- Tie at Strike Line: Include All Ties
- Start Behavior: Start Fresh or Backfill Previous Weeks
- Auto Process Final Weeks / 15-Minute Automation: enabled
