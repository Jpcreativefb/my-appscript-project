# PATTC Director + Specialist Workflow

## One source of truth
The Director owns:
- production baseline
- current priority
- branch/commit decisions
- release/integration/deploy decisions
- `docs/PATTC-CURRENT-STATE.md`

Specialists own only their assigned scope and report back to the Director.

## Current specialist lanes
- Reality TV Specialist
- Football Specialist
- Awards Specialist
- Visual Studio Specialist — PARKED

## Standard specialist rules
1. Start from the exact branch/commit named by the Director.
2. Do not merge, deploy, clasp push, reset, clean, or change unrelated files.
3. Do not redesign outside the requested scope.
4. Run focused tests while iterating.
5. Return:
   - changed files
   - test results
   - remaining blockers
   - patch/commit only when requested
6. Director reviews and decides the next action.

## Release flow
Edit → focused tests → Joel visual approval → full gate once → integrate/deploy.

## New-chat resume line
> Continue PATTC. Read `docs/PATTC-CURRENT-STATE.md` on branch `coordination/pattc-current-state` and continue from NEXT ACTION.
