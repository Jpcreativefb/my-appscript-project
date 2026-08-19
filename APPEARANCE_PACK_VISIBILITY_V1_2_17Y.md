# v1.2.17y — Appearance Image Pack Visibility Fix

Fixes newly created or duplicated Image Packs not appearing reliably in **Image Pack to Edit** and **Game Appearance**.

- Backend flushes the AppearanceImagePacks write and returns the persisted pack row.
- Frontend adopts the returned row immediately.
- Newly created pack is selected in both Image Pack editor and Game Appearance selector.
- Game Appearance clearly says the new pack is selected but not applied until **Apply Selected Packs to Game** is clicked.
- Dashboard confirmation retries briefly so a delayed read cannot make a newly created pack disappear.
- PWA/frontend cache markers are bumped.

Image Pack metadata is stored in `AppearanceImagePacks`; per-entity image mappings are stored in `AppearanceImagePackItems`.
