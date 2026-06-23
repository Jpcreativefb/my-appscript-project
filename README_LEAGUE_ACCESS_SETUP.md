# League Access System Setup

This package adds private games, multi-league membership, and feature-level access control.

## What this supports

- A member can be in multiple leagues for the same game.
- Picks/wagers remain one set per user per game.
- Each league gets its own leaderboard view by filtering the same game data to league members.
- Games with no `LeagueGames` row remain public.
- Games with one or more active `LeagueGames` rows become league-controlled and only visible to members of assigned leagues.
- Compare Pick + Wager is league-scoped, so users compare only with members of the selected league.

## New backend file

Added:

```txt
backend/engines/LeagueAccessEngine.js
```

## New sheets created by setup

Run this API action once after `clasp push` and redeploy:

```txt
?action=adminSetupLeagueAccessSystem&username=YOUR_ADMIN_USERNAME&token=YOUR_TOKEN
```

It creates these sheets:

### Leagues

```txt
LeagueId | LeagueName | OwnerUsername | Visibility | JoinMode | JoinCode | Active | CreatedAt | UpdatedAt | Notes
```

### LeagueMembers

```txt
LeagueId | Username | Role | Status | InvitedBy | JoinedAt | UpdatedAt
```

Roles:

```txt
owner
admin
member
viewer
blocked
```

### LeagueGames

```txt
LeagueId | GameId | Active | CreatedAt | AddedBy
```

### GameFeatureAccess

```txt
GameId | LeagueId | Feature | AccessRule | RolesAllowed | UsersAllowed | UsersBlocked | Active | UpdatedAt
```

## How privacy works

### Public game

If a game has no rows in `LeagueGames`, it is public and works like before.

### Private / league game

Once you add this row:

```txt
family | fifa-world-cup-2026 | TRUE | ...
```

only active members of the `family` league can see `fifa-world-cup-2026`.

## Multiple leagues for the same game

Example `LeagueGames`:

```txt
family  | fifa-world-cup-2026 | TRUE
work    | fifa-world-cup-2026 | TRUE
friends | fifa-world-cup-2026 | TRUE
```

Example `LeagueMembers`:

```txt
family  | Juan | owner  | active
work    | Juan | member | active
friends | Juan | member | active
```

Juan appears in all three league leaderboards, but only makes one set of picks/wagers for the game.

## New API actions

```txt
adminSetupLeagueAccessSystem
getMyLeagues
createLeague
addLeagueMember
removeLeagueMember
assignGameToLeague
saveLeagueFeatureAccess
getLeagueMembers
```

## Updated API actions

These now respect `leagueId`:

```txt
getDashboardGamesHub
getActiveGames
getStartupPayload
getCategories
getCategorySettings
getMyPicks
savePick
leaderboard
liveLeaderboard
liveResults
liveGameState
getBettingOptions
getMyBets
saveBet
removeBet
bettingLeaderboard
compareUserPicks
```

## Frontend changes

Dashboard game cards now show:

- Public Game badge for public games
- League badge for single-league games
- League selector for games where the user is in multiple leagues

When a user enters a game or opens the leaderboard, the selected `leagueId` is saved and sent to the backend.

## Install steps

1. Copy/replace the full project files.
2. Push backend to Apps Script:

```bash
clasp push
```

3. Redeploy Apps Script:

```txt
Deploy > Manage deployments > Edit pencil > Version > New version > Deploy
```

4. Run setup action once:

```txt
?action=adminSetupLeagueAccessSystem&username=YOUR_ADMIN_USERNAME&token=YOUR_TOKEN
```

5. Push frontend:

```bash
git add .
git commit -m "Add league access and private game permissions"
git push
```

6. Hard refresh the app after deployment.

## First manual test

Create a league:

```txt
?action=createLeague&username=Juan&token=TOKEN&leagueName=Family%20League&gameId=fifa-world-cup-2026
```

Add a member:

```txt
?action=addLeagueMember&username=Juan&token=TOKEN&leagueId=family-league&memberUsername=Stacey&role=member
```

Assign game to league:

```txt
?action=assignGameToLeague&username=Juan&token=TOKEN&leagueId=family-league&gameId=fifa-world-cup-2026
```

Then the game is league-controlled. Only league members/admins should see it.

## Feature access examples

Allow only owners/admins to view other users' wagers:

```txt
?action=saveLeagueFeatureAccess&username=Juan&token=TOKEN&leagueId=family-league&gameId=fifa-world-cup-2026&feature=comparePicks&accessRule=league-members&rolesAllowed=owner,admin
```

Allow all members to compare:

```txt
?action=saveLeagueFeatureAccess&username=Juan&token=TOKEN&leagueId=family-league&gameId=fifa-world-cup-2026&feature=comparePicks&accessRule=league-members&rolesAllowed=owner,admin,member
```

## Important

Do not add `LeagueId` to the Picks or Bets sheets yet.

This version intentionally keeps picks/wagers as:

```txt
Username + GameId
```

and uses leagues only to filter who can see the game and who appears in that league leaderboard.
