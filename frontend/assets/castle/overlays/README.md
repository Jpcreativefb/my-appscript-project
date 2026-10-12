# Castle Portrait Overlay Geometry

All production overlays use `width="320" height="420" viewBox="0 0 320 420"`.

Shared geometry:
- Outer canvas: 320 × 420
- Portrait opening / visible image zone: x=13, y=13, width=294, height=329
- Nameplate: x=13, y=340, width=294, height=68
- Recommended HTML name baseline: y≈369
- Recommended HTML role baseline: y≈397
- Center accent anchor: x=160, y=335

Recommended DOM layering:
1. Card container (320:420 aspect ratio)
2. Google Drive portrait `<img>` using `object-fit: cover`
3. Optional state photo filter only when explicitly approved by the Director
4. SVG overlay asset positioned absolute inset 0
5. Optional badge/status treatment
6. HTML name text positioned over nameplate
7. HTML role/status label positioned beneath name
8. Room/encounter controls remain separate from the portrait asset

## Director-locked portrait source rule

Accepted Castle Encounter Overlays R2 source: `23745a1a27d25b9330b4f58d3ac0b30a2ba140fb`.

Do not alter the source contestant or PATTC user portrait between Castle states.

Portraits must remain interchangeable. Keep the same:
- source image
- crop
- portrait opening
- 320 × 420 geometry

State changes must come only from:
- transparent overlay/frame
- badge
- glow/fade/danger treatment
- live HTML name/status
- room backdrop behind the portrait system

Do not recolor, relight, regenerate, replace, or change the background of the contestant or PATTC user portrait for individual encounters.

One portrait source must work across:
- Normal
- Castle 5
- New Alliance
- Masked Faithful
- Fate Traitor
- Murder Target
- Eliminated
- Suspect
- Revealed Traitor

Hidden Traitor is the only exception because it intentionally supplies generic mystery art and must not render or preload an identifying portrait beneath it.

## Castle visual tone — locked

Foundation: modern luxury manor. Use contemporary upscale interiors, dark wood, brass, blackened metal, velvet, stone, glass, candlelight, fireplaces, dramatic halls, galleries and studies.

Selective old-world mystery may appear through antique masks, aged portrait frames, wax seals, ceremonial envelopes, unusual keys, antique murder objects and similarly unsettling details. The target feeling is: beautiful, cinematic and slightly uncomfortable.

Goofy elements are allowed only sparingly and must be rendered with the same serious cinematic treatment as everything else. Do not switch to cartoon styling.

TV contestant imagery and PATTC player imagery must share the same Castle visual language. Preserve the real portrait and build the Castle treatment around it rather than changing the portrait itself.

No further overlay asset work unless the Director reopens this scope.
