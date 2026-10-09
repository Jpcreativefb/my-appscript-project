# PATTC DIRECTOR ASSIGNMENT — CASTLE OVERLAY PROOF INTEGRATION R1

## Status

**ACCEPTED OVERLAY ART — INTEGRATE INTO MOBILE PROOF NOW**

Branch:

`feature/castle-presentation-proof-r1`

Accepted overlay source branch:

`feature/castle-image-overlays-r1`

Accepted production asset commit:

`ca6325b5712d0b5e2a465169a3e88a798aa6c09e`

Current overlay specialist branch head contains only the later Director review assignment commit on top of that asset commit. Use the asset files from the accepted production commit/branch; do not recreate them.

Do NOT merge the overlay specialist branch wholesale.
Do NOT redesign the overlays.
Do NOT modify backend, scoring, rules, routing, or production data.

## Director finding

The mobile proof already has logical overlay-state hooks in `castleDuelMobileFinalGameplayR1.js` via `PROOF_OVERLAY_STATES` and `data-overlay-state`, but the accepted production SVG overlay assets are not yet present in this proof branch and are not yet actually layered over portraits.

This assignment completes that integration.

## Required asset transplant

Bring the accepted production overlay files into:

`frontend/assets/castle/overlays/`

Required main assets:

- `portrait-normal.svg`
- `portrait-pattc-player.svg`
- `portrait-castle-five.svg`
- `portrait-suspect.svg`
- `portrait-hidden-traitor.svg`
- `portrait-revealed-traitor.svg`
- `portrait-eliminated.svg`
- `portrait-shield.svg`
- `portrait-murder-danger.svg`
- `portrait-host.svg`

Also bring only reusable supporting badge/frame assets actually needed by proof rendering. Do not duplicate equivalent art already present from accepted Special Card work.

All main overlays use locked geometry:

- width 320
- height 420
- viewBox `0 0 320 420`

## Required rendering behavior

For every proof portrait, render in this order:

1. real room backdrop
2. real contestant/PATTC portrait image
3. accepted state overlay SVG
4. optional accepted badge
5. live HTML name
6. live HTML role/status
7. encounter parchment/controls

Do NOT bake names into overlay files.

The portrait must not move or resize when state changes.

## State mapping

Map current proof states to actual SVG files:

- `normal-tv` → `portrait-normal.svg`
- `pattc-player` → `portrait-pattc-player.svg`
- `castle-five-ally` → `portrait-castle-five.svg`
- `suspect` → `portrait-suspect.svg`
- `hidden-traitor` → `portrait-hidden-traitor.svg`
- `revealed-traitor` → `portrait-revealed-traitor.svg`
- `eliminated` → `portrait-eliminated.svg`
- `shield` → `portrait-shield.svg`
- `murder-danger` → `portrait-murder-danger.svg`
- `host` → `portrait-host.svg`

## Hidden Traitor privacy

`portrait-hidden-traitor.svg` must render without loading or placing the real contestant image beneath it.

Do not place identifying name, id, image URL, alt text, CSS class, data field, or preload behind the hidden treatment.

Player-facing name remains:

`A Traitor`

until backend authorization permits reveal.

## Where overlays must appear in proof

At minimum:

- Previous Castle Reveal featured portraits
- normal contestant encounters
- PATTC Human encounters
- Castle Five ally state
- Traitor Guess candidates
- authorized Revealed Traitor
- eliminated/final-life-lost players in history
- Secret Shield/protection state
- Murder danger/target state
- Host portrait treatment where used
- Final Three portraits
- Winner portrait where authorized

## Special Card integration compatibility

The accepted Special Encounter Card R2 pack is being integrated separately.

Do not create a second portrait-frame system inside the Special Card renderer.

Where Special Card components display a contestant/player portrait, use the same accepted overlay mapping or leave a clean integration hook that the mobile proof wrapper supplies.

## Mobile acceptance

Review at 360 / 390 / 430.

Required screenshots at 390:

1. normal TV contestant
2. PATTC Human player
3. Castle Five ally
4. Traitor Guess candidate row
5. Revealed Traitor
6. Eliminated player
7. Shield state
8. Murder danger state
9. Previous Castle Reveal with at least two different overlay states
10. Final Three with three portraits

Also return one 360px and one 430px portrait screen.

Acceptance requires:

- actual SVG visible, not only `data-overlay-state`
- same portrait geometry across state switches
- name/status readable
- no face obstruction
- no clipping/horizontal overflow
- hidden Traitor privacy preserved
- no duplicate portrait-frame stack

## Tests

Add or update focused proof tests to confirm:

- all ten accepted overlay paths exist in proof branch
- mapping covers all ten states
- rendered portrait markup includes actual overlay asset path
- hidden Traitor renderer does not include real image source
- normal state does include supplied real portrait beneath overlay
- 320x420 geometry remains consistent
- no remote overlay dependency

Run existing Castle mobile proof tests and `git diff --check`.

## Handoff

Return:

- branch
- starting HEAD
- ending HEAD
- exact transplanted overlay asset paths
- changed integration files
- tests/results
- 390px real browser screenshots
- 360/430 checks
- explicit privacy confirmation

Do not merge.
Do not deploy production.
