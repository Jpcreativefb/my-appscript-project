# PATTC DIRECTOR HANDOFF / CURRENT STATUS — 2026-10-17

## Purpose

This file is the authoritative handoff for the next PATTC Director.

The next Director should continue from the exact current Director branch and preserve the accepted architecture, scope controls, release safety rules, and specialist-review discipline documented below.

Do not restart completed phases. Do not re-open rejected architecture unless the user explicitly requests it.

---

## 1. Authoritative Director state

- Repository: `Jpcreativefb/my-appscript-project`
- Director branch: `director/app-behavior-rescue-r1`
- Latest runtime/integration checkpoint before this documentation-only handoff update: `5127a4f8d7b187508ed9a67b287b8ab62a0d998d`
- Previous accepted R8 checkpoint: `5b505aca0c54448c9cc3cc3afab28f2401750c06`
- Production deployment: **NOT AUTHORIZED / NOT PERFORMED from this Director work**
- Current operating mode: **feature freeze / go-live readiness / release-candidate cleanup**
- R9 Prediction Market: **ON HOLD by explicit user request**

Cross-Mac source of truth is GitHub. Do not assume another worktree is newer than the pushed Director branch.

---

## 2. Director operating rules

Every specialist handoff must be independently reviewed against the actual GitHub branch, diff, implementation, and tests before the Director marks it:

- `ACCEPTED`
- `SEND BACK`
- `REJECTED`

Never accept a specialist based only on a written summary.

Specialists must not merge or deploy.

The Director must not merge or deploy production without explicit user approval.

Do not modify production data during development or review.

Prefer focused, meaningful regression tests over broad speculative rewrites.

Do not resurrect stale architecture merely to satisfy an obsolete test. Update stale regression expectations when the accepted implementation has intentionally moved on.

---

## 3. Completed rescue / integration work

The Director branch has already integrated the accepted app-behavior rescue work for:

- Bottom Navigation consistency
- Home Hub profile / appearance authority
- Loading / How-To behavior
- Visual Studio accepted rescue / invariant work
- Admin read-retry protection
- Admin Games & Design organization
- Sports/Admin organization
- dedicated Sports manager pages
- shared Game Builder navigation shell
- Sports builder routing and preview polish
- Competition Builder shell
- Reality adaptation
- Weekly Reality Question Pool
- Awards adaptation
- shared Create-only game creation contract hardening
- General / Custom builder adaptation
- go-live compatibility / stale-test cleanup

The ordinary player-facing game/scoring engines were not replaced by these organization and builder phases.

---

## 4. Accepted integration chronology

### Foundation / rescue

- `3504c7b63ade5b9f8b018d5a3f72684c1337fb90` — Integrate Admin specialized manager pages R3
- `81716050d90ba2e293c64bf0c73e617be00c1b17` — Document Game Creation Architecture Audit R1
- `e39f22fc63eb201cc38e0d18444893dfca06fa48` — Consolidate Director operating docs / status

### Shared Builder / Sports

- `3153a7be493a9ce46c20a79484b20be1b1b3dbec` — Shared Game Builder Navigation Shell R2
- `49f591de282e7c703cacea9b5db74e11d23bb37b` — first R3B
- `9fe8a0bf4b68c498a4a5cc71bd9ad7cf3e89a648` — R3B regression correction
- `633b67fbb1c3706b71509137cc96d781678f475e` — R3C preview layout polish
- `e90f32fff3dbc1ba5ba27471bd9fe3abdccbb3e9` — R3D selector polish
- `c404e44b5624319eb3526d9131b4b3966f883609` — R4 accepted correction

### Competitions / Reality / Awards / General

- `077d208d6c3b4253f6968e27b908382b0ff6f416` — R5 Competition Builder shell
- `ca6125e845fc5c9d4858885e2b0c7bf5f6495aa2` — R6 Reality adaptation + Weekly Question Pool
- `9183c41614259837691db80e78e638888d7afd68` — R7 Awards adaptation + Create-only contract hardening
- `5b505aca0c54448c9cc3cc3afab28f2401750c06` — R8 General / Custom adaptation

### Go-live readiness

- `5127a4f8d7b187508ed9a67b287b8ab62a0d998d` — Prepare go-live readiness cleanup R1

R9 Prediction Market is intentionally not in this chronology because it is **not approved for implementation and remains on hold**.

---

## 5. Current Admin lifecycle architecture

The accepted shared lifecycle is:

`Game Builder | Manage Existing Games | Competitions | Data | Operations`

Sports currently follows:

`Admin → Games & Design → Sports → NFL → 2026`

with these destinations:

### Game Builder

- Confidence
- Survivor
- Team Fantasy
- Playoff / Forecast
- Other Game

### Manage Existing Games

Ordinary Manage Games remains the authoritative ordinary game-management surface.

### Competitions

- Cups
- Series
- Tournaments

Only implemented / authoritative competition behavior may be exposed as active UI. Do not fabricate backend support merely because a destination exists in the lifecycle model.

### League / Season Data

- Teams
- Schedule
- Scores
- Standings
- Odds
- Season Timing

### Operations

- Sports Engine Controls

---

## 6. Current Sports Admin routing contracts

Accepted routing behavior:

- Confidence → ordinary `admin-games`
- Survivor → ordinary `admin-games`
- Team Fantasy → dedicated `admin-team-fantasy`
- Playoff Race → dedicated `admin-playoff-race`
- NFL Cup → dedicated `admin-nfl-cup`
- NFL Sports Pack / Season Setup → dedicated `admin-nfl-season-setup`
- Sports Engine Controls → dedicated `admin-sports-engine`
- Sports Scores & Game Builder → existing `./sports.html`

Do not restore the obsolete R2 focus-helper architecture:

- `adminOpenSportsManageGamesR2_`
- `adminManageGamesApplyFocusR2_`
- `adminManageGamesScheduleFocusR2_`

Those helpers are intentionally absent from the accepted architecture.

---

## 7. Game creation architecture source of truth

`docs/GAME_CREATION_ARCHITECTURE_AUDIT_R1.md` remains the architecture source of truth.

Central rule:

> **Builders create games. Managers edit games. Engines support games. Hub / League / Show / Ceremony / Season defines scope. Competitions combine existing authoritative games.**

Important consequences:

1. Hub / League / Show / Ceremony / Season is scope, not a replacement for canonical `GamesEngine.type`.
2. Builders should orchestrate the existing authoritative create path instead of inventing a second game-persistence system.
3. Managers remain the authority for editing the created game.
4. Specialized engines remain specialized engines; do not consolidate them into a generic replacement engine.
5. Missing optional setup can allow a Draft to exist, but Preview / Active may require specialized preflight.
6. Do not remove New Game from Manage Games until true feature parity is intentionally approved.

---

## 8. Authoritative game-creation API contract

Continue to reuse:

- `apiAdminCreateGame`
- `apiAdminCloneGame`
- `apiAdminUpdateGame`
- `apiAdminArchiveGame`
- `apiAdminRunGamePreflight`
- `adminGetGames`
- `admin-game-setup:<gameId>`

The accepted R7 shared Create-only contract is important:

`apiAdminCreateGame(payload)` forces `createOnly: true` into the request before it reaches the backend.

The backend create-only path delegates to the authoritative create behavior and does not persist `createOnly` as a Games-row field.

A caller must not be able to override this guard with `createOnly:false`.

Duplicate protection remains authoritative on the backend.

---

## 9. Canonical game types

Current canonical Games types that the Director should treat as supported architecture:

- `prediction`
- `head-to-head`
- `confidence`
- `staked-prediction`
- `wager`
- `racing-wager`
- `team-fantasy`
- `season-cup`
- `mixed`
- `combo` as legacy alias to mixed
- `survivor`
- `voting`
- `ranking`

Unsupported values fall back through existing authoritative behavior rather than creating a new type casually.

Do **not** invent canonical types such as:

- `playoff-race`
- `forecast`
- `traitors`
- `dwts`
- `castle`
- `series`
- `tournament`
- `amazing-race`
- `survivor-tv`
- `cookoff`
- `prediction-market`
- `awards`
- `oscars`
- `emmys`
- `grammys`

unless a later architecture decision explicitly approves them.

---

## 10. R3 Sports Builder behavior

Accepted create behavior uses the normal Draft game payload and four-digit year validation.

Sports Other Game uses the approved generic-type allowlist rather than inventing Sports-only backend types.

Accepted post-create destinations:

- Confidence → `admin-game-setup:<gameId>`
- Survivor → `admin-game-setup:<gameId>`
- Other Game → `admin-game-setup:<gameId>`
- Team Fantasy → set frontend game id, then `admin-team-fantasy`
- Playoff / Forecast → no generic create; use the dedicated existing manager

Double-submit protection is required.

No separate game initializer was introduced.

---

## 11. R4 scope rules

The accepted scope model is explicit.

Use explicit family / group / season / scope data.

Do not infer architecture from names, IDs, labels, or keywords when an explicit scope is available.

Team Fantasy routing remains dedicated.

---

## 12. R5 Competition Builder

R5 is an orchestration shell, not a replacement competition engine.

Accepted behavior:

- Cup is the implemented/default competition path
- NFL Cup workspace reuses `admin-nfl-cup`
- Series and Tournament are not silently given invented persistence
- Manage Existing goes to `admin-games`
- Sports Scores reuses `./sports.html`
- NFL Pack reuses `admin-nfl-season-setup`
- Sports Engine reuses `admin-sports-engine`

Cup / Series / Tournament should conceptually sit over authoritative games / relationships rather than forcing a schema migration without a separate architecture decision.

---

## 13. R6 Reality adaptation

Accepted Reality work uses existing Reality authorities and adds the Weekly Question Pool without inventing new canonical show types.

Question-pool behavior includes:

- `TemplateId` provenance
- `RequiredCore`
- `RandomEligible`
- pool OFF → all enabled templates
- pool ON → required templates + configured random eligible templates
- preserve already-saved selected IDs when appropriate
- admin-only regenerate / protection behavior

The Weekly Question Pool belongs inside the existing Reality Manager workflow.

Reality show names are scope / show identity, not automatically Games engine types.

---

## 14. R7 Awards adaptation

Awards Builder creates an ordinary authoritative game and then routes into the existing Awards Manager workflow.

Approved Awards Builder types:

- `prediction`
- `confidence`
- `staked-prediction`
- `wager`
- `ranking`
- `mixed`

The builder does not create `awards`, `oscars`, `emmys`, or `grammys` Games types.

Event identity belongs at Awards category / question / result-source level.

Accepted flow:

`Create Awards Game → Awards Manager`

No new settlement/scoring engine was invented by the builder.

---

## 15. R8 General / Custom adaptation

R8 is complete and accepted.

Approved General / Custom canonical types are exactly:

- `prediction`
- `head-to-head`
- `staked-prediction`
- `wager`
- `racing-wager`
- `voting`
- `ranking`
- `mixed`

Generic create payload remains a normal Draft:

```js
{
  name,
  gameId,
  year,
  type,
  active: false,
  archived: false,
  defaultGame: false,
  status: "Draft",
  lockAllPicks: true
}
```

Year validation is four digits within the accepted builder range.

Generic success route:

`admin-game-setup:<gameId>`

Manage Existing route:

`admin-games`

Do not expose `prediction-market` as a canonical R8 type.

---

## 16. R9 Prediction Market

**ON HOLD.**

This was an explicit user decision.

Do not advance R9, create a Prediction Market engine, expose a Prediction Market game type, or infer a new architecture from exploratory notes.

When the user later resumes R9, perform a fresh source audit before implementation.

---

## 17. Important existing engine notes for future architecture work

### Community voting / Cookoff-like use cases

`backend/engines/VotingCompetitionEngine.js` is the existing authority for community competition behavior such as:

- participant self-entry
- per-user entry reuse
- entry metadata
- photo URL
- custom entry fields
- admin approval / publication
- number / color assignment
- Favorite / Top-N / Rank-All
- Borda or custom positional points
- editable ballots while voting is open
- result-visibility modes
- scoring contract lock after first ballot

Do not confuse this with `RankingGameEngine.js`, which is an official-order prediction/scoring engine.

Features such as criteria scorecards, tasted eligibility, divisions, separate People's Choice, coverage weighting, combined criteria + ranking, or criterion-weighted reveal require a new architecture decision.

### Movies

`backend/engines/MovieEngine.js` contains persistent Seen Movies behavior.

Existing movie vote weighting includes a coverage-based helper, but current `ResultsEngine.js` usage effectively neutralizes that intended coverage distinction for non-empty ballots.

Do not silently change this scoring math during unrelated work. It requires explicit architecture approval.

---

## 18. Go-live readiness cleanup R1

Latest cleanup commit:

`5127a4f8d7b187508ed9a67b287b8ab62a0d998d`

It is one commit ahead of accepted R8 `5b505aca0c54448c9cc3cc3afab28f2401750c06`.

The cleanup intentionally addressed compatibility and stale regression expectations discovered by production checks.

Changed files in that cleanup commit are limited to:

- `frontend/app.js`
- `tests/admin_sports_game_organization_r2_tests.js`
- `tests/competition_builder_shell_r5_tests.js`
- `tests/global_performance_lock_v1218x1b_tests.js`
- `tests/home_player_hubs_v1218c_tests.js`
- `tests/hub_media_gradients_v1218c2_tests.js`
- `tests/nfl_cup_control_r1_tests.js`
- `tests/nfl_cup_weekly_season_r2_tests.js`
- `tests/player_ux_rc20_postdeploy_performance_r2_tests.js`
- `tests/shared_game_builder_navigation_shell_r2_tests.js`

### Compatibility mirror decision

`frontend/js/app.js` is the authoritative newer app-router source.

`frontend/app.js` is a compatibility mirror.

The correct sync direction is:

`frontend/js/app.js` → `frontend/app.js`

Do not reverse that direction and overwrite accepted newer routes with stale compatibility code.

The cleanup mirror includes accepted dedicated Admin Sports routes such as:

- `admin-nfl-cup`
- `admin-nfl-season-setup`
- `admin-playoff-race`
- `admin-sports-engine`

### Stale-test principle confirmed during cleanup

Several release checks were failing because regression tests still asserted superseded implementation strings or old UI wording.

The Director independently verified the current accepted runtime source before changing those tests.

Examples included:

- old plural `Cups` wording
- first-occurrence source-position assumptions in the R5 test
- old Admin Sports R2 focus helpers
- escaped `Sports Scores &amp; Game Builder` rendering
- old Dashboard `apiGetEditableProfile(username, "")` profile path after the accepted saved-general authority repair

The accepted Dashboard implementation now uses the lightweight saved general-profile authority and marks the payload with:

`profileAuthority: "saved-general"`

Do not change accepted production logic merely to satisfy the superseded literal assertions.

---

## 19. Home Hub profile / appearance authority

The accepted Home Hub rescue uses the saved general profile as the Dashboard profile authority.

The backend Dashboard path uses the current lightweight general-profile helper and saved-general authority marker rather than the old editable-profile request path.

The frontend Dashboard resolver honors that authority.

If this area regresses, inspect the current saved-general authority chain before introducing new fetches or fallback state.

Do not expand unrelated work into Home Hub profile logic during other feature changes.

---

## 20. Bottom Navigation authority

Bottom Navigation must resolve from one accepted appearance/navigation authority.

Required behavior remains:

- Icon OFF → no icon, no emoji fallback, no generic-symbol fallback
- Label OFF → no label and no stale prior label
- page transitions must not preserve stale nav state
- saved Appearance settings must control the rendered nav

Do not reintroduce arbitrary emoji or generic symbol fallbacks.

---

## 21. Production / release safety

Production remains protected.

No Director or specialist branch should deploy automatically.

Before release:

1. Verify the exact Director branch and HEAD.
2. Review any new diff against its accepted parent.
3. Run `git diff --check`.
4. Run focused tests for touched behavior.
5. Run `bash tools/run_production_checks.sh .`.
6. Smoke-test core player and Admin routes in the intended release environment.
7. Confirm no production data mutation occurred during testing.
8. Obtain explicit user approval before production deployment.

If a production check fails, determine whether it is a real runtime regression or a stale regression assertion before modifying source.

Do not weaken a real safety test merely to make the suite green.

---

## 22. Production-check / regression expectations

The production check script explicitly protects compatibility mirrors, including:

- `frontend/js/api.js` vs `frontend/api.js`
- `frontend/js/app.js` vs `frontend/app.js`

Keep those mirrors synchronized in the accepted direction.

Go-live cleanup already corrected known stale regression tests uncovered during the release-readiness pass.

A new Director should still independently rerun the full production checks before any release action rather than assuming a historical local result is sufficient.

---

## 23. Source / worktree discipline

Primary historical Director worktree:

`$HOME/PATTC-App-Behavior-Rescue-R1`

Authoritative branch:

`director/app-behavior-rescue-r1`

Do not clean, reset, or overwrite unrelated worktrees.

Do not assume a local Mac copy is authoritative over GitHub.

Use exact SHAs in specialist assignments and handoffs.

---

## 24. What the new Director must not do

Do not:

- restart completed R1–R8 phases
- advance R9 unless the user resumes it
- merge or deploy without approval
- modify production data
- touch Team Fantasy as collateral work
- invent canonical game types
- replace existing engines unnecessarily
- move specialized Sports controls back into ordinary Manage Games
- restore obsolete Admin Sports R2 focus helpers
- reverse the app compatibility-mirror sync direction
- alter accepted Home Hub profile authority to satisfy stale tests
- change scoring math during unrelated cleanup
- infer scope from names when explicit scope exists
- accept a specialist solely from their self-report

---

## 25. Current exact next action

The application is no longer waiting for another builder phase.

The next Director should treat the current branch as a **release-candidate / go-live-readiness branch**, not as an invitation to continue feature expansion.

Immediate priorities are:

1. independently verify the latest Director HEAD and this handoff document
2. rerun the complete production checks from the exact current branch
3. perform focused smoke tests of Home Hub, Bottom Nav, Admin Games & Design, Manage Games, dedicated Sports managers, Reality, Awards, and General / Custom builder navigation
4. investigate only genuine regressions
5. keep R9 on hold
6. prepare a release recommendation for the user
7. deploy only after explicit user approval

If the user chooses to resume feature development instead, establish a new specialist assignment from the exact verified Director HEAD and preserve all boundaries in this handoff.
