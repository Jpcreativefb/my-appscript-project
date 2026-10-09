# PATTC DIRECTOR REVIEW — CASTLE SPECIAL ENCOUNTER CARD PACK R2

## Status

**SEND BACK — VISUAL QUALITY CORRECTION ONLY**

Current specialist HEAD reviewed:

`5a478d6360efecf08ed1285a317c17ceaa52f55d`

The component architecture, scope boundaries, privacy handling, sealed-card structure, dynamic candidate/target handling, and focused tests are directionally accepted.

Do **not** redesign gameplay or rewrite the component API unless a visual fix requires a narrow presentation change.

The problem is visual quality.

The current review PNGs are not merely throwaway screenshots; they are rendering the actual production HTML/CSS/SVG treatment. The screenshots therefore exposed a real issue: the special-card assets and presentation are too flat, generic, and diagram-like for the approved Castle visual standard.

## What is accepted and must be preserved

Preserve:

- `window.CastleSpecialEncounterCardsR2`
- existing renderer API names
- no backend/API/network calls
- no outcome randomization
- identical sealed Fate structures
- identical sealed Host envelope structures
- single-known-Traitor privacy behavior
- dynamic Traitor candidate count
- dynamic Murder target count
- no hardcoded production names
- small architectural radii
- 360/390/430 responsive protections
- all R2 gameplay boundaries
- existing tests unless a visual-contract assertion needs to be added

Do not weaken privacy or rule tests.

## Visual quality problem

The approved Castle visual bar is the realistic modern-manor presentation already established in:

- the modern room backdrop pack
- the approved portrait-overlay pack
- the approved Alliance screen concept
- the approved Previous Castle Reveal concept
- the approved Sherry / Portrait Gallery presentation

The current R2 special pack uses very simple line-art SVGs such as circles, rectangles, flat shields, magnifying glasses, basic crowns, and diagram-like cards. That is not the production style.

Examples from the current implementation include assets composed almost entirely of primitive SVG geometry with flat strokes/fills. These are acceptable placeholders, but not accepted production art.

## Required correction

Upgrade the **visual treatment only** so the special encounters look like the same premium Castle game.

### Global art direction

Use:

- realistic / premium manor styling
- deep black / charcoal / burgundy surfaces
- aged parchment where appropriate
- thin antique-gold architectural trim
- engraved / embossed seals and crests
- subtle metallic texture / shadow / highlight
- restrained candlelight glow
- layered depth
- premium serif typography
- real contestant/player portraits where state authorizes them
- room backdrop visible around the component

Avoid:

- flat iconography
- clip-art appearance
- generic UI glyphs
- simple circles/boxes as final art
- cartoon shields/crowns
- oversized opaque panels
- fantasy-game inventory styling that does not match the approved manor aesthetic

### Fate cards

Current sealed/safe/murdered SVGs are too basic.

Make them look like physical Castle artifacts:

- aged black or parchment card/envelope
- ornate gold edge
- realistic wax seal
- deep shadow
- subtle paper grain
- SAFE reveal in warm gold/candlelight
- MURDERED reveal in dark burgundy/crimson, elegant and non-gory

Before choice the two cards must still be visually identical.

### Host envelopes

Replace flat envelope treatment with realistic premium sealed envelopes:

- parchment / dark vellum
- antique-gold edge or embossing
- realistic wax seal
- equal/identical pre-choice treatment

After authorized reveal:

- GOLD should look like a refined gold reward, not an icon
- PROTECTION should use an elegant heraldic shield/crest
- MERCY should use a refined broken-chain / cleared-banish treatment

### Masked Hall

The mask should be a premium masquerade object with believable metallic detail, shadow, and dimensionality — not flat line art.

### Murderer Card

Make this a dramatic physical card/edict:

- black/burgundy parchment
- embossed dagger/sword or Castle murder crest
- wax seal
- premium gold/crimson edge
- no gore

### Traitor Guess frame

Use a thin ornate Traitor frame/crest treatment compatible with the accepted 320×420 portrait overlay system.

Do not create a competing portrait geometry.

### Decision Sealed

The current wax/seal treatment must look like a real pressed wax seal/envelope, consistent with the previously approved compact Decision Sealed direction.

### Finale Armory

The five power assets must look like collectible Castle relics, not flat toolbar icons.

CLUE:
- sealed scroll / parchment / eye motif

DOUBLE:
- paired engraved marks / double-crown / twin-gold emblem

SHIELD:
- premium blue/gold heraldic shield

BANISH:
- broken Traitor crest / red-black seal

RECRUIT:
- alliance/Castle Five crest

Keep all five in one coherent visual family.

### Final Three / Winner

Use premium heraldic marks/crests that match the Castle Duel logo/manor system.

## Review requirement

Do not return only a technical HTML strip.

Return a new review gallery that demonstrates the components **over the approved modern room backdrops** at realistic mobile scale.

Required 390px review captures:

1. Traitor Guess with real-style portrait placeholders
2. Fate sealed
3. Fate Safe
4. Fate Murdered
5. Masked Hall wager
6. Host sealed envelopes
7. Host Gold / Protection / Mercy
8. Murderer Card
9. Murder target selection
10. Decision Sealed
11. Final Three
12. Finale Armory
13. Winner / Jackpot

Also one 360px and one 430px whole-flow sample.

The screenshots should look like the approved Castle game, not a component test harness.

## Production asset requirement

The upgraded assets must remain local reusable production files under:

`frontend/assets/castle/special/`

SVG is fine where it can achieve the premium result. Transparent WebP/PNG is also acceptable for richer dimensional artwork.

No remote dependencies. No paid service. No person-specific baked imagery.

## Tests

Preserve existing tests and add/adjust visual-contract tests where practical.

Run:

`node tests/castle_special_card_pack_r2_tests.js`

`node --check frontend/js/pages/castleDuelSpecialCardsR1.js`

`git diff --check`

## Handoff

Return:

- branch
- starting HEAD (`5a478d6360efecf08ed1285a317c17ceaa52f55d`)
- ending HEAD
- exact changed visual assets
- any component/CSS changes
- 390px review screenshots listed above
- one 360px sample
- one 430px sample
- exact test results

Confirm:

- no gameplay changes
- no backend changes
- no scoring changes
- no routing changes
- no merge
- no deploy
