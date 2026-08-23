# PATTC Predicts v1.2.18s — Team Fantasy Compact Game-Day UX

Production-polish release built on verified v1.2.18r1 (`f99f9a1`).

## Player lineup
- Replaces the native team select with a compact logo/abbreviation picker that works consistently on mobile.
- Picker rows show NFL logo, abbreviation, opponent, and a small usage count.
- Teams that are no longer eligible (including a position-specific usage limit) are omitted; the current saved team remains visible.
- Removes the separate `Current:` line and the always-visible eligible-team count from each lineup slot.
- Auto Pick and Random picks show compact `AP` / `R` badges.
- Mobile lineup rows are reduced in height so most/all eight positions can be viewed with much less scrolling.

## Game-day comparison
- Adds current-week position rank beside live/final points, calculated within the selected Team Fantasy league and position.
- Adds selected-league standing rank plus current regular-season W-L-T record to each competitor header.
- Keeps opponent picks hidden until kickoff.
- Final = blue border, Live = green border, Upcoming = gray border.
- Removes repeated per-slot status words; one compact status legend appears above the comparison.
- Comparison headers are sticky while the contained board scrolls.
- Supports head-to-head or 2–6 competitors.
- A compact league selector appears in the comparison when the user belongs to multiple leagues.

## Safety
- Does not alter scoring rules, picks, leagues, sync triggers, Sports Scores Engine routing, Notifications, or Reality TV.
- Keeps the five-minute cached game-day architecture from v1.2.18r1.
- Extends the synthetic Test Lab to verify weekly slot rank, league rank/record, and AP/R method tags.
- Transactional installer restores the verified baseline if a pre-deployment check fails.
