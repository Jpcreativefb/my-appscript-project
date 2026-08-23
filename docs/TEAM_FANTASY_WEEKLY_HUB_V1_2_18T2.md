# PATTC Predicts v1.2.18t2 — Team Fantasy Weekly Hub

Builds on the deployed v1.2.18s compact game-day experience.

## Weekly Picks
- Renames each lineup header to **Weekly Picks** with the entry/conference + week as the subtitle.
- Completed lineups collapse by default after reload; Show/Hide remains available.
- Explicit dark header + white text fixes the invisible white-on-white header seen in v1.2.18s.

## Weekly League
- Replaces the duplicate standalone Standings + H2H sections with one game-day hub containing **League View** and **Compare**.
- League View supports Complete League and any sub-leagues available to the player.
- Shows current-week rank, accumulated live points, Final/Live/Upcoming counts, points behind leader, points needed to pass the next team above, and cushion over the next team below.
- League switching refreshes only the cached game-day payload instead of reloading the whole page.

## Compare
- Starts with the viewer + one opponent.
- Removes the old H2H and 2–6 preset buttons.
- Uses one **+ Add Team** control to grow the comparison up to six teams.
- Opponent picks remain hidden until kickoff.
- Sticky competitor headers use explicit high-contrast styling.

## Preserved
- v1.2.18s logo picker, team abbreviations, exhausted-team filtering, AP/R tags, weekly slot ranks, league rank/record, Final=blue, Live=green, Upcoming=gray.
- v1.2.18r1 in-memory six-team Test Lab and five-minute cached game-day scoring architecture.
- No scoring rule, pick-data, trigger, Sports Scores Engine, Notification, or Reality TV changes.

Release-control repair: the historical v1.2.18s CSS-cache regression now accepts later cache-busted Team Fantasy stylesheet versions while still rejecting the pre-18s 1218r1 marker.

Release-control repair: historical v1.2.18r1 comparison regression now accepts the single + Add Team flow while still requiring a hard cap of six teams.
