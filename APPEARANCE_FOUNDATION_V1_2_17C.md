# v1.2.17c — Appearance Foundation

This checkpoint adds the shared data/runtime foundation for reusable Image Packs and Theme Packs across all Awards App game types.

## Added
- Generic Image Packs keyed by `EntityType` + `EntityId`.
- Generic Theme Packs using semantic JSON tokens and optional base-theme inheritance.
- Per-game Image Pack and Theme Pack assignments.
- Per-game/entity image and theme overrides.
- Safe fallback order: individual override → image pack → existing/default image → frontend fallback.
- Theme order: default/base theme → assigned theme → game override → entity override.
- Seed definitions for `Sports Default Logos`, `App Default`, and `Confidence Pro`.
- Admin API routes for setup and save operations.
- Authenticated runtime `getGameAppearance` route for game UIs.

## Intentionally not included yet
The visual Appearance Manager UI is v1.2.17d. Confidence does not consume the new packs until that checkpoint.
