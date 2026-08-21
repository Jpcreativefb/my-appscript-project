# v1.2.18c6 — Hub Navigation Cleanup

Focused cleanup for crowded Home and Hub screens.

## Player flow
- A game appears in one working bucket at a time: `What Needs Your Attention` OR `My Current Games`.
- When unfinished/new picks are completed, the game naturally drops out of Attention and returns to Current Games.
- Empty hub sections are omitted.
- Available and archived sections are collapsed by default.
- Current games become a swipe/snap carousel on phones instead of a long vertical wall.
- My Leagues and Discover are collapsed on Home by default.

## Game state + standings
- Compact cards recognize Week / Episode / Round labels from game metadata/name.
- Status text uses useful states such as Live, In Progress, Picks Open, Picks Locked, Caught Up and Final.
- Attention and Current Game cards include Standings buttons.
- Rank, score and current leader hydrate in the background so the hub itself is not blocked by leaderboard calls.

## Hub ordering
Subhubs sort by priority:
1. Needs attention
2. Live / in progress
3. Games the user is currently playing
4. Available current games
5. Archive/offseason only

Only attention subhubs plus the highest-priority running subhub auto-open, reducing visual overload.

## Subhub appearance
Appearance Manager now calls out entries explicitly as `Subhub Card — Sports / NFL`, `Subhub Card — Reality / Survivor`, etc.
- Existing solid/gradient controls style the collapsed subhub card.
- Existing image/icon controls style that subhub card.
- New `Expanded Area Tint` controls how strongly the same identity carries into the opened content area.

This patch intentionally does not auto-rotate important game cards. Phone Current Games use user-controlled swipe/snap navigation instead.
