# PATTC DIRECTOR CURRENT STATUS — 2026-10-15

## Director state

- Director branch: `director/app-behavior-rescue-r1`
- Runtime integration checkpoint before documentation sync: `3504c7b63ade5b9f8b018d5a3f72684c1337fb90`
- Architecture Audit R1 commit: `81716050d90ba2e293c64bf0c73e617be00c1b17`
- Current phase: documentation consolidation, then Shared Game Builder Navigation Shell R2
- Production deployment: **NOT AUTHORIZED / NOT PERFORMED** from this branch

## Completed rescue/integration work

The current Director batch has already integrated and live-reviewed:

- Bottom Navigation consistency rescue
- Home Hub profile / appearance rescue
- Loading / How-To rescue
- Visual Studio accepted rescue / invariant work
- Admin read-retry protection
- Admin Games & Design organization R1
- Sports/Admin organization R2
- Specialized Sports manager pages R3

Admin R3 moved large specialized panels out of ordinary Manage Games:

- NFL Cup/Futures → dedicated Admin destination
- NFL Sports Pack → Season / Sports Setup
- Playoff Race timing → dedicated Playoff Race destination
- Sports Engine Controls → dedicated Admin page
- Team Fantasy → existing dedicated manager
- ordinary Manage Games → ordinary game administration

## Architecture source of truth

`docs/GAME_CREATION_ARCHITECTURE_AUDIT_R1.md` is the source of truth for the next Admin phase.

Central rule:

> **Builders create games. Managers edit games. Engines support games. Hub / League / Show / Ceremony / Season defines scope. Competitions combine existing authoritative games.**

Do not consolidate or replace existing engine families. The solution is orchestration around existing authoritative APIs and engines.

## Confirmed lifecycle model

Shared Admin lifecycle:

`Game Builder | Manage Existing Games | Competitions | Data | Operations`

Sports working shell:

`Admin → Games & Design → Sports → NFL → 2026`

with:

- Game Builder
  - Confidence
  - Survivor
  - Team Fantasy
  - Playoff / Forecast
  - Other Game
- Manage Existing Games
- Competitions
  - Cups
  - Series
  - Tournaments
- League / Season Data
  - Teams
  - Schedule
  - Scores
  - Standings
  - Odds
  - Season Timing
- Operations
  - Sports Engine Controls

Reality and Awards should later use the same lifecycle pattern with their own scope/data concepts rather than Sports concepts.

## Existing APIs / engines to preserve

Reuse rather than replace:

- `apiAdminCreateGame`
- `apiAdminCloneGame`
- `apiAdminUpdateGame`
- `apiAdminArchiveGame`
- `apiAdminRunGamePreflight`
- `adminGetGames`
- `admin-game-setup:<gameId>`
- Team Fantasy APIs
- Sports Confidence engines
- Sports Survivor engines
- `NflPlayoffRaceEngine`
- `NflSeasonPackEngine`
- `SportsAdminBridgeEngine`
- Awards Manager APIs / engine
- Reality season / question-pack APIs / engines
- current NFL Cup engines and parent / child fields

`adminCreateGameFromForm()` already creates the authoritative Draft Games record through `apiAdminCreateGame()`. Future builders should orchestrate that path rather than replace it.

## Director decisions already made

1. Hub / League / Show / Ceremony / Season is **scope**.
2. `GamesEngine.type` remains a canonical actual game / engine type.
3. Continue using `apiAdminCreateGame()` as the authoritative Games-row creator.
4. Do not remove New Game from Manage Games until the new builder has feature parity.
5. Missing source data may allow a Draft to exist, but Preview / Active should require successful specialized preflight.
6. Do not invent a `playoff-race` backend type merely for navigation.
7. Full League Forecast and Bottom Dwellers must be verified before exposing builders.
8. Cup / Series / Tournament should initially sit over existing parent relationships rather than force a schema migration.
9. NFL Sports Pack belongs under Season Data / Operations.
10. Awards should use `Create Awards Game → Awards Manager`.
11. Do not invent DWTS / Castle canonical engine types until implementation supports them.

## Controlled rollout

- R1 — Architecture Audit: **COMPLETE**
- R2 — Shared Game Builder Navigation Shell: **NEXT**
- R3 — Sports Builder Routing using existing engines
- R4 — Manage Existing Games cleanup
- R5 — Competition Builder shell
- R6 — Reality adaptation
- R7 — Awards adaptation
- R8 — General / Custom adaptation

Do not skip directly to R3.

## R2 assignment boundary

R2 is **navigation / presentation only**. It should prove the shared lifecycle and Sports/NFL/2026 shell before engine-specific orchestration.

R2 must not:

- change game creation backend behavior
- remove New Game from Manage Games
- migrate schema
- change scoring
- change engines
- modify production data
- generalize Cup backend
- expose unsupported Reality / Awards builders
- deploy

## Production safety

- Production Apps Script deployment remains protected.
- Specialist branches must never deploy directly.
- Preview can share production data in important areas; live Preview review should remain read-only unless a write is specifically known safe.
- Production requires explicit Joel approval.

## Worktree / Mac rules

Primary Director worktree:

`$HOME/PATTC-App-Behavior-Rescue-R1`

Current Director branch:

`director/app-behavior-rescue-r1`

Do not clean/reset unrelated worktrees.

Use GitHub branches and commits as the cross-Mac source of truth. Main/Home Mac is preferred for heavier release work; Work Mac is fine for Git, focused tests, specialist worktrees, and remote Preview review.

## Next exact action

Start one isolated specialist assignment:

**PATTC SPECIALIST — SHARED GAME BUILDER NAVIGATION SHELL R2**

The specialist starts from the current Director documentation-consolidated HEAD, not from a stale earlier branch state.

The assignment must anchor branch, baseline, scope, forbidden scope, tests, and no-merge / no-deploy status before work begins.
