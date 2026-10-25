# Digit Clock

Multi-sport scoring game (timed sports and MLB outs) at `frontend/digit-clock.html`, linked from the player Sports hub, Admin, and Sports workspace.

## Preview and deploy

Run `node tools/serve_digit_clock.js` from the repository root, then open http://127.0.0.1:8788/digit-clock.html. Use **Try example** for a disconnected demo, or select NFL, college football, NBA, WNBA, men’s or women’s college basketball, MLB, or NHL, then find games by date / ESPN event ID. Historical example: `401547417` (Packers 24, Falcons 25).

Deploy `frontend/` and the existing root `functions/` directory together using the repository's Cloudflare Pages deployment flow. The new `/api/digit-clock` Pages Function is required for live data; a static-only server supports the example but cannot fetch games. No Apps Script sheet migration or browser-visible proxy token is needed. This change does not deploy itself.

## Rules and storage

### Leagues, weeks, seasons, and admin formats

The league section saves independent leagues with stable player IDs, seasons, and week labels. Select the sport and track a game, then use **Add tracked game to this season**. The same ESPN game can appear in different leagues with independent lineups and point rules; duplicate games within the same league season are rejected. Moving a game between weeks updates weekly standings without duplicating season results. Games can change digit assignments without changing a player's season identity. Roster renaming preserves all prior results.

Use **Admin: default game format, points & ties** for season defaults, or open a saved game and select **Admin: game format & custom points** for a game override. Presets:

- **Quarter points:** 1 point for each Q1–Q4 winner.
- **Four quarters · different values:** Q1 = 1, Q2 = 2, Q3 = 3, Q4 = 4; each editable.
- **Half & final only:** quarter awards disabled, first-half winner = 1, final winner = 3; each editable.
- **Time bank only:** no points; all accumulated seconds still tracked.
- **Custom:** independently edit Q1–Q4, half, OT, and game bonuses. Zero disables an award.

All formats retain accumulated time. Awards can use the person with the most time in the period or the score holder at the period's end. Final includes overtime, whereas Q4 stops at regulation. Split/full tied awards are configurable. If one player owns multiple digits, their times are combined before determining a time winner. Unassigned digits still compete; they do not give points to the runner-up.

The standings show confirmed points, projected points, accumulated time, time in verified final games, baseball outs (and outs in verified finals), period / inning wins, and game wins. Filter by week and rank by points, seconds, or baseball outs. Outs and seconds are never added together. Projected points include ongoing period leaders and configured bonuses; confirmed points require completed periods and clean data. Failed refreshes retain snapshots, mark data stale, and hold confirmed awards until verified again. OT final clocks require the explicit **I verified this final OT clock** checkbox to clear OT-specific warnings; other feed warnings still block awards. Quarter win counts include tied winners and are displayed even if that period awards zero points. Rules and lineup changes recalculate historical standings immediately.

Saved games refresh on demand; unfinished games in the selected season also refresh every 45 seconds while the page is visible and auto-refresh is enabled. Identical ESPN event IDs share fetched snapshots across leagues, but never assignments or point rules. The single-game clock refresh remains every 15 seconds. Historical final corrections can be picked up with **Refresh saved games**.

League data is stored in browser local storage under `pattc-digit-clock-leagues-v1`; other tabs on the same origin receive storage updates. **Export league backup** exports leagues, rosters, settings, assignments, and score snapshots as JSON. **Import league backup** validates and adds new leagues; it refuses to overwrite existing league IDs. Standings also export as CSV. Browser/device storage is not a hosted database: devices do not automatically synchronize, and clearing site data removes leagues unless backed up. Admin labels are local setup controls in this preview, not a separate authorization boundary or account role. A hosted league/permissions service is required before restricting configuration to authenticated commissioners across devices.

- Winning digit is `(homeScore + awayScore) % 10`, regardless of which team scores.
- Names are stored per ESPN event in this browser's local storage. They are separate from existing app accounts/game rosters. **Copy game link** puts a snapshot of the names in the URL fragment. Recipients receive independent copies; subsequent name edits do not synchronize.
- Number 0 starts at kickoff. Each scoring timestamp credits the previous holder, then changes ownership. All elapsed time comes from reported game clocks, never from wall-clock timers.
- Q1–Q4, first half (Q1 + Q2), OT, and whole-game totals are available. First-half totals overlap Q1/Q2 and must not be added to those columns again. Tied time leaders are shown together.
- Polls every 15 seconds while enabled and visible. Final games stop automatic polling; Refresh now still replays corrected data. Visibility changes trigger a refresh for unfinished games.
- Quarter/halftime boundaries split intervals; stopped game clocks add no time. Each snapshot is rebuilt from zero, so corrections, duplicate events, and missed polls do not compound totals.
- ESPN game summary provides scoring plays; detailed scoring plays are preferred if they cover the summary IDs and reconcile to the scoreboard. Otherwise bundled TD/conversion entries remain bundled. Do not invent intermediate conversion clocks.
- Score/clock mismatches, missing live clocks, and suspicious score jumps produce provisional warnings. Invalid scoring timestamps prevent a replacement tally; stale/failing fetches retain the last good snapshot with a visible warning.
- A matching score does not prove that ESPN supplied every intermediate play. Feed corrections and missing same-score history remain provider limitations.

## Overtime

Regular-season NFL OT uses 10-minute periods; postseason uses 15-minute periods. The ESPN season type selects the period length, with Q5 representing the first OT. Regulation totals remain intact; additional periods accumulate in OT and overall columns. No time is awarded for the unused portion of an early OT finish. Final OT uses the last substantive reported play rather than an end-of-game clock reset and displays a verification warning. College football OT is supported as an untimed phase: score-holder awards continue, but no OT seconds are invented. Other sport timing rules are described below.

## Scoring paths and probabilities

All ten digits show legal complete scoring sequences of up to three events (TD + explicit conversion outcome, FG, safety). Separate conditional outcomes include made/missed PATs, two-point conversions, defensive conversion returns, and rare one-point conversion safeties. A failed kick/try adds zero only if no return score occurs.

Probabilities are illustrative, editable assumptions, **not ESPN odds or calibrated NFL predictions**. Defaults: 5 combined TDs, 3 made FGs, 0.05 safeties per 60 minutes; PAT success 94%; two-point attempt share 8%; two-point success 48%; FG attempt success 82%. All values are starter assumptions, not sourced league averages.

The model splits TDs into 6/7/8-point outcomes and convolves independent Poisson event counts modulo ten. It estimates ending-digit chances to the end of regulation or the current OT period. It does not model future OT, early OT stopping rules, possession, field position, teams, or game strategy. A pending conversion is not a separate modeled initial state. Rare conversion returns/safeties are excluded. FG attempt success is conditional on a kick attempt; made-FG count rates are separate assumptions. Next-score type probabilities are conditional on a further TD/FG/safety event, excluding conversions.

Each scoring path also shows the chance of **at least** its listed event counts within the horizon, permitting other scoring events. These overlapping probabilities must not be summed and do not mean that the digit will be held at the horizon. No probability is claimed for the accumulated-time winner.

## Validation

```
node tests/digit_clock_tests.js
node tests/digit_clock_competition_tests.js
node tests/digit_clock_sports_tests.js
node tests/digit_clock_proxy_tests.js
node tools/verify_digit_clock_ui.js
```

The browser check requires Playwright available on `NODE_PATH` and an installed Chromium browser. `DIGIT_CLOCK_CHROME` can specify an executable. It serves local fixture data and never requires ESPN. Screenshots go to `/tmp/digit-clock-desktop.png` and `/tmp/digit-clock-mobile.png`.

The sanitized ESPN fixture records event 401547417, fetched October 25, 2026, from `https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=401547417`. It preserves only team names, scores, status, and relevant plays. Expected whole-game times by digit are: 0 = 21:37, 3 = 11:49, 6 = 18:45, 9 = 7:49; the others are 0:00. They total 60:00.

## Multi-sport profiles and MLB outs

Supported ESPN route profiles: `nfl`, `cfb`, `nba`, `wnba`, `ncaam`, `ncaaw`, `mlb`, `nhl`. The browser carries `league` alongside each ESPN event ID; saved entries use `sport` so different sports cannot collide even if event IDs match. Existing saved NFL entries without this field continue to work. The endpoint permits only these fixed sport/league paths; callers cannot supply arbitrary upstream URLs.

- NBA: four 12-minute quarters, 5-minute OT. Basketball clock fractions are preserved.
- WNBA / women’s college basketball: four 10-minute quarters, 5-minute OT.
- Men’s college basketball: two 20-minute halves, 5-minute OT.
- College football: four 15-minute quarters; OT is untimed. Scoring changes continue at the regulation elapsed boundary, with no OT time added.
- NHL: three 20-minute periods; regular-season OT is 5 minutes, playoff OT periods are 20 minutes and stop on the reported winning goal. ESPN’s play-by-play clock is elapsed, while the scoreboard clock is remaining; each is interpreted accordingly. Regular-season shootout attempts use a separate score and are excluded from timed scoring. The official final scoreboard adds the shootout’s single winning goal at zero additional timed seconds.
- MLB: progress is **outs held**, never minutes. The top of inning N begins at `(N - 1) * 6`; the bottom starts three outs later. A top-third, two-out scoring event is at 14 completed outs. On a play that scores and records an out, the **previous digit receives the out(s)**; the new digit starts after that play. End-of-inning records reset the feed’s out count to zero, so the parser resolves the preceding half-inning before applying the third out. Duplicate annotations with unchanged scores do not create another ownership change.

Baseball inning awards cover the actually played innings, including extra innings. Admins can configure innings 1–9 individually and a per-extra-inning award. Walk-offs, home wins after the top of the ninth, shortened games, and extra innings use the reported completed outs; no unused outs are awarded. MLB has no first-half or timed OT bonus. Half-and-final presets therefore yield a final-only bonus for sports without a half; applicable game inputs hide inapplicable awards.

Non-football scoring paths use free throws / two- and three-point baskets, hockey goals, or one- to four-run scoring plays. Each sport has editable illustrative Poisson scoring rates per regulation game (both teams combined). Baseball rates are per 54 outs. Probabilities are explicitly not calibrated league rates or ESPN odds. They exclude early OT endings, walk-offs, and future extra periods. Untimed college football OT and unfinished hockey shootouts pause probability estimates.

Additional replay fixtures, fetched October 25, 2026, retain only the necessary ESPN team, clock, outs, score, and play fields:

- NBA 401809955: Bulls 110–Magic 98; 2,880 seconds, including fractional-second scoring intervals.
- MLB 401809298: Dodgers 5–Blue Jays 1; 54 outs. Outs by digit 0–9: `[2, 15, 20, 1, 4, 2, 10, 0, 0, 0]`.
- NHL 401802478: Islanders 3–Flyers 4 after a shootout; 3,900 timed seconds; the final winning digit receives zero shootout seconds.

Rule references: [NBA scoring and timing](https://official.nba.com/rule-no-5-scoring-and-timing), [NCAA football statistics manual](https://fs.ncaa.org/Docs/stats/Stats_Manuals/Football.pdf), [NCAA women’s rules](https://ncaaorg.s3.amazonaws.com/championships/sports/basketball/rules/women/PRWBB_RulesBook.pdf), [NHL official rulebook](https://media.nhl.com/site/asset/public/ext/2022-23/2022-23Rulebook.pdf).
