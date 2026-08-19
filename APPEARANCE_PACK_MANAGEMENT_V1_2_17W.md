# v1.2.17w — Appearance Pack Management Cleanup

Makes Theme Pack and Image Pack management explicit and safe.

## Theme Packs
- `Theme to Edit` clearly selects an existing reusable theme.
- `Save Changes` updates the selected theme and preserves its Theme ID even when renamed.
- `Duplicate Theme` asks for a new name, generates a new Theme ID automatically, and leaves the original unchanged.
- `Create New Theme` creates a separate blank/default-based theme with an automatically generated ID.
- Technical Theme ID/Base Theme fields live under `Advanced / Technical Details`.

## Image Packs
- `Image Pack to Edit` clearly selects the reusable pack being modified.
- `Save Changes` updates/renames the selected custom pack without changing its Pack ID.
- `Duplicate Pack` performs one backend operation that copies every custom image mapping into a newly generated Pack ID.
- `Create New Pack` creates a blank custom pack with an automatically generated ID.
- Built-in Sports Default Logos are protected; duplicate them to customize while untouched entities continue to fall back to their normal sports images.
- Entity Type/ID details are hidden under per-entity `Advanced / Technical` sections.

## Game Assignment
`Game Appearance` is deliberately separate from editing. `Apply Selected Packs to Game` only assigns the chosen Theme Pack and Image Pack to the selected game.
