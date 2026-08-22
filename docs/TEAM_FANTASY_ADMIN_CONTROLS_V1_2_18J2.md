# Team Fantasy Football v1.2.18j2 — Admin Control Reliability

This hotfix makes Team Fantasy write actions use a repository-owned Cloudflare Pages bridge instead of the legacy external upload worker and makes admin actions visibly auditable.

## Fixes

- Team Fantasy player/admin POST actions use `/api/team-fantasy`.
- Save Game Rules stays on the page and confirms the values were persisted.
- Run Team Fantasy Sync Now stays on the page and reports schedule games, picks, scored, pending, errors and last-sync time.
- Install 15-min Sync verifies an actual `teamFantasySyncTriggerHandler` installable trigger exists and reports the trigger count.
- Admin dashboard shows Game Saved, settings state, 15-minute trigger state and last sync result.
- Trigger/manual sync activity is persisted on `TeamFantasySettings` with LastSyncAt/Status/Message.
- Existing Team Fantasy sheets are upgraded in place by adding missing headers only; no rows are cleared.
