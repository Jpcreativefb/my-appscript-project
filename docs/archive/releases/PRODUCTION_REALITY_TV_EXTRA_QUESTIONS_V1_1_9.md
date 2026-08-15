# Production Reality TV Extra Questions — v1.1.9

## Goal

Finalize the Reality TV Manager’s Extra Questions workflow so every selected preset or custom question appears in the current episode reliably, without cross-theme templates, permanent `BUILD_LOCAL` stalls, duplicate rows, or External Results Hub dependency.

## Production changes

### Theme-scoped presets

A season now loads and saves only the preset definitions compatible with its `ShowFormat`.

- Survivor / Tribal: immunity, Tribal attendee, reward, idol finder
- Cooking: individual challenge, team challenge, safety, bottom finish
- Amazing Race: leg winner, last place, non-elimination, Fast Forward, U-Turn, time penalty
- Performance: highest score, lowest score, perfect score, bottom finish
- Social Deduction: shield, murdered, banished, Traitor banished, mission winner
- Team Competition and General Elimination use only their declared compatible definitions

Saving or repairing the pack deletes unrelated **preset** rows for that season. Custom rows are preserved.

### Automatic and resumable local build

A saved build uses `EnabledQuestionTypesJSON` as the authoritative work list. The server immediately advances several local stages before returning. When work remains, a one-time Apps Script trigger resumes the saved job independently of the browser.

The trigger never waits for External Results Hub mappings. Local Game Setup questions and answers are authoritative for player readiness.

### Master current-episode status

The manager now exposes one expandable status control with these stages:

1. Current episode exists
2. Main elimination question is linked
3. Extra-question selection is saved
4. Selected questions are inserted into Game Setup
5. Answers are verified
6. Episode question pack is ready

Every compatible question displays one state:

- Available
- Needs build
- Building
- Needs verification
- Needs attention
- Ready in episode

### Custom questions

Saving a custom question automatically enables it and includes it in the current episode build. It remains available for future episodes.

Each saved custom question has an individual Delete action. Deletion removes the reusable template and removes the current-episode question only when no picks, wagers, or results depend on it. Played history is preserved.

### Request reliability

`adminUpdateRealityTvQuestionPack` now uses POST rather than a long query-string request. Both `frontend/api.js` and the deployed `frontend/js/api.js` are synchronized.

## External Results Hub boundary

The app reaches local `READY` status without Hub mappings. The next phase is the dedicated External Results Hub queue and retry dashboard, followed by the Awards Show Manager.
