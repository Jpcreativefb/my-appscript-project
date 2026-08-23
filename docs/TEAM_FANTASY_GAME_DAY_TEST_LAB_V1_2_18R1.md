# PATTC Predicts v1.2.18r1 — Team Fantasy Game Day + Test Lab

Production baseline: `181e58a8cb6537a91895b05ffe881daefe987609`.

## What this release adds

- A six-player **synthetic Team Fantasy Test Lab** available to admins from the Team Fantasy player page.
- The Test Lab is in-memory only and writes **no** Team Fantasy Sheet rows.
- Test coverage for the season rule: NFL team usage is counted **per team, per position**. Example: BUF can be 3/3 at QB and still 1/3 at RB.
- An in-memory probe runs the **real Team Fantasy scoring function** and verifies 325 passing yards + 3 passing TD + the 300-yard bonus scores 28 points.
- A live **Compare Lineups** view for 2–6 league entries.
- Compact NFL team logos, per-slot fantasy points, current total points, and Final / Live / Upcoming counts.
- Opponent picks remain hidden until the selected NFL team's kickoff; the viewer's own upcoming picks stay visible.
- Upcoming, Live, and Final slots have distinct visual states plus text labels.
- Lightweight comparison refresh every five minutes reads cached Team Fantasy score rows; player browsers do not call ESPN.
- The existing central Team Fantasy scorer remains the live-data writer and continues using the separate Sports Scores Engine / authenticated ESPN proxy.
- The Team Fantasy sync installer now installs a **5-minute** trigger and the central handler skips work outside NFL game windows.
- Random / Auto Pick now suppresses per-slot Spreadsheet flushes, performs one final flush, stays on the Team Fantasy screen, and shows inline progress instead of the global navigation loader.

## Important trigger note

An existing 15-minute Apps Script trigger keeps its old cadence until it is replaced. After v1.2.18r1 is deployed and the Test Lab passes, open Team Fantasy Admin and click **Install / Update 5-min Sync** once. The installer deletes the old Team Fantasy trigger and creates exactly one new 5-minute trigger.

## Test Lab pass criteria

The in-app Test Lab must show all checks passed:

1. Six synthetic players.
2. Eight positions per player.
3. Per-position team-use limit works (BUF QB 3/3 blocked while BUF RB 1/3 remains available).
4. Opponent upcoming picks are hidden.
5. Viewer's own upcoming picks are visible.
6. Opponent live picks reveal after kickoff.
7. Team totals reconcile to slot points.
8. Final / Live / Upcoming are all exercised.
9. Comparison supports head-to-head through six teams.

The release installer also runs the source-level Test Lab, the existing Team Fantasy regression chain, Notification/Reality compatibility tests, and the full production check before commit or deployment.
