# Sports Player Prop Bet Save v1.0.1

## Important behavior

Player props are wager categories. User selections are written to the `Bets` sheet, not the `Picks` sheet.

## Fixes

- The player-prop destination picker now returns only active wager-enabled Awards Games.
- Player-prop creation now stops with a clear error when the selected Awards Game does not have wagering enabled.
- The setup helper now ensures the essential wager-mode headers used by player props.
- Added `testLatestSportsPlayerPropWagerReadiness()` for live diagnostics.
- Added a true save-path integration test that confirms an Over/Under player-prop wager appends a valid `Bets` row.
- Bumped the frontend service-worker cache.

## Existing prop created before this fix

Open the `Games` sheet and find the prop's destination `GameId`.

Confirm:

- `WagerEnabled = TRUE`
- The game is active and available to the user.
- The prop's `LockDateTime` has not passed.

Then run this from the Awards App Apps Script editor:

```javascript
testLatestSportsPlayerPropWagerReadiness()
```

A ready prop returns:

```text
success: true
expectedSheet: Bets
writesToPicks: false
wagerEnabled: true
scoreMode: wager
layoutType: wager
locked: false
overOdds: <positive number>
underOdds: <positive number>
problems: []
```

If `wagerEnabled` is false, turn `WagerEnabled` ON in the destination game's `Games` row.

If `locked` is true, the source game has already started (or `Locked` is true). Create a new test prop for an upcoming game.
