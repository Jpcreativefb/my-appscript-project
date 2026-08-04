# Sports Player Props v1 Release Notes

## Scope

Sports Player Props v1 connects the Awards App to the `SportsPlayers` and `SportsPlayerGameStats` data already working in the separate Sports Scores Engine.

The first release supports:

- MLB
- NFL
- Over / Under player props
- Manual decimal odds at creation
- Automatic settlement from completed ESPN player-game statistics
- Push/refund when the final value equals the line

## Admin workflow

On the Sports page, an administrator can open an MLB or NFL score card and select **Create Player Prop**. The workflow asks for:

1. Awards App destination game
2. Player from one of the two teams
3. Supported statistic
4. Over / Under line
5. Over and Under decimal odds

The player list is read from the separate Sports Scores Engine. The Awards App saves only references and question details; it does not copy the entire roster or box score into `Categories`.

## Settlement flow

The existing Smart Sports Sync now:

1. Refreshes relevant team scores.
2. Refreshes MLB/NFL player-game stats through the secure Sports Admin bridge.
3. Updates normal team wagers.
4. Settles player props from final `SportsPlayerGameStats` rows.
5. Writes `WinnerNomineeId`, `WagerResultType`, `SettlementStatus`, locking, and `CategoryResults`.

Normal team moneyline, spread, and total settlement paths skip `player-prop` categories so the systems do not overwrite each other.

## New Awards App fields

Added to `Categories` and `CategorySettings` as needed:

- `SportsPlayerId`
- `SportsPlayerName`
- `SportsStatType`
- `SportsPropLine`
- `SportsPropSide`

Existing generic result-source fields are also populated for forward compatibility.

## New API actions

- `adminGetSportsPlayerPropPlayers`
- `adminGetSportsPlayerPropStatTypes`
- `adminCreateSportsPlayerProp`
- `adminSettleSportsPlayerProps`

## Safety behavior

- Only MLB and NFL expose the Create Player Prop button in v1.
- A selected player must match the home or away team.
- Duplicate event/player/stat/line questions are blocked within the same Awards App game.
- Missing or incomplete stats remain pending rather than being guessed.
- Non-numeric final stats are marked for review.
- Equal final value and line produce a push/refund.
- Sports Scores Engine admin credentials remain server-side.
