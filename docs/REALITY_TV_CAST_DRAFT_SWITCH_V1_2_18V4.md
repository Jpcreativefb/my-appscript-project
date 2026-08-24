# Reality TV Cast Draft Switching — v1.2.18v4

Production hotfix for the shared `RealityCastImport` staging sheet.

## Fixes
- A stale browser `draftSeasonId` can no longer make a Survivor draft reuse Amazing Race rows.
- Draft identity is based on Game ID + Show + Season + Year + Show Format.
- Returning to the same draft reuses its existing staging block.
- Previous show draft rows remain in the sheet and are not deleted.
- Prepare/Open deep-links directly to the first row of the current draft block.
- Frontend and service-worker cache markers are bumped so the revised Reality Manager loads after deployment.

## Expected test
Create `Survivor Test`, press **Prepare / Open New Season Cast Sheet**, and the link should open on the Survivor block. Existing Amazing Race rows may still exist elsewhere in `RealityCastImport`, but they must not be selected as the Survivor draft.
