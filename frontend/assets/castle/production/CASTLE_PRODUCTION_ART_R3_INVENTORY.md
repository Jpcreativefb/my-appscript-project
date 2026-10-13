# PATTC Castle Production Art R3 — Authoritative Asset Inventory

Starting branch checkpoint: `feature/castle-special-card-pack-r1` @ `672960658c32e05e2200a2d44de3dd998224f963`.

Individual raster compositions are exported as small SVG runtime files backed by one shared WebP atlas. This keeps every asset independently addressable while avoiding dozens of duplicate raster payloads. Dynamic TV contestant and PATTC player photographs remain interchangeable and are never baked into portrait-state overlays.

| Encounter | Asset | Repository path | Dimensions | Format | Transparent / Opaque | Runtime purpose | Status |
|---|---|---|---:|---|---|---|---|
| Shared | Production raster atlas | `frontend/assets/castle/production/castle-production-r3-atlas.webp` | 4096×5414 | WebP | Alpha supported | Shared backing pixels for individual SVG runtime exports; individual files remain addressable by path. | **READY** |
| Regular Host | Host teal source | `frontend/assets/castle/production/host/host-teal-source.svg` | 450×600 | SVG wrapper → shared WebP atlas | Opaque | Approved Host/show source image; pair with accepted portrait-host overlay. | **READY** |
| Masked Hall | Masked Hall entrance hero | `frontend/assets/castle/production/masked-hall/masked-hall-entrance-hero.svg` | 1200×1040 | SVG wrapper → shared WebP atlas | Opaque | Room-first three-mask entrance hero with center envelope offer. | **READY** |
| Masked Hall | Sealed wager envelope | `frontend/assets/castle/production/masked-hall/sealed-wager-envelope.svg` | 900×450 | SVG wrapper → shared WebP atlas | Opaque | Physical wager offer prop / close-up option. | **READY** |
| Masked Host | Host card back | `frontend/assets/castle/production/host/host-card-back.svg` | 480×720 | SVG wrapper → shared WebP atlas | Opaque | Physical Host card/runtime presentation. | **READY** |
| Masked Host | Life Shield | `frontend/assets/castle/production/host/host-life-shield.svg` | 480×720 | SVG wrapper → shared WebP atlas | Opaque | Physical Host card/runtime presentation. | **READY** |
| Masked Host | Big Bonus | `frontend/assets/castle/production/host/host-big-bonus.svg` | 480×720 | SVG wrapper → shared WebP atlas | Opaque | Physical Host card/runtime presentation. | **READY** |
| Masked Host | Banish Reduction | `frontend/assets/castle/production/host/host-banish-reduction.svg` | 480×720 | SVG wrapper → shared WebP atlas | Opaque | Physical Host card/runtime presentation. | **READY** |
| Masked Host | Selected Host card state | `frontend/assets/castle/production/host/host-selected.svg` | 480×720 | SVG wrapper → shared WebP atlas | Opaque | Physical Host card/runtime presentation. | **READY** |
| Masked Host | Faded Host card state | `frontend/assets/castle/production/host/host-unselected-faded.svg` | 480×720 | SVG wrapper → shared WebP atlas | Opaque | Physical Host card/runtime presentation. | **READY** |
| Masked Host | Final Host reward treatment | `frontend/assets/castle/production/host/host-final-reward.svg` | 480×720 | SVG wrapper → shared WebP atlas | Opaque | Physical Host card/runtime presentation. | **READY** |
| Murder Wheel | Complete Murder Wheel | `frontend/assets/castle/production/murder-wheel/murder-wheel-r3.svg` | 1254×1254 | SVG wrapper → shared WebP atlas | Opaque | Approved complete wheel composition; do not reconstruct from CSS. | **READY** |
| Murder Wheel | Pointer | `frontend/assets/castle/production/murder-wheel/murder-wheel-pointer.svg` | 512×480 | SVG wrapper → shared WebP atlas | Opaque | Optional pointer export if Integration separates pointer animation. | **READY** |
| Murder Wheel | Technology | `frontend/assets/castle/production/murder-wheel/symbols/technology.svg` | 512×512 | SVG wrapper → shared WebP atlas | Opaque | Individual approved wheel object/tile export. | **READY** |
| Murder Wheel | Dagger | `frontend/assets/castle/production/murder-wheel/symbols/dagger.svg` | 512×512 | SVG wrapper → shared WebP atlas | Opaque | Individual approved wheel object/tile export. | **READY** |
| Murder Wheel | Poison | `frontend/assets/castle/production/murder-wheel/symbols/poison.svg` | 512×512 | SVG wrapper → shared WebP atlas | Opaque | Individual approved wheel object/tile export. | **READY** |
| Murder Wheel | Rope | `frontend/assets/castle/production/murder-wheel/symbols/rope.svg` | 512×512 | SVG wrapper → shared WebP atlas | Opaque | Individual approved wheel object/tile export. | **READY** |
| Murder Wheel | Skull | `frontend/assets/castle/production/murder-wheel/symbols/skull.svg` | 512×512 | SVG wrapper → shared WebP atlas | Opaque | Individual approved wheel object/tile export. | **READY** |
| Murder Wheel | Wrench | `frontend/assets/castle/production/murder-wheel/symbols/wrench.svg` | 512×512 | SVG wrapper → shared WebP atlas | Opaque | Individual approved wheel object/tile export. | **READY** |
| Murder Wheel | Toaster | `frontend/assets/castle/production/murder-wheel/symbols/toaster.svg` | 512×512 | SVG wrapper → shared WebP atlas | Opaque | Individual approved wheel object/tile export. | **READY** |
| Murder Wheel | Murderer Card | `frontend/assets/castle/production/murder-wheel/symbols/murderer-card.svg` | 512×512 | SVG wrapper → shared WebP atlas | Opaque | Individual approved wheel object/tile export. | **READY** |
| Murder Wheel | Murder Key | `frontend/assets/castle/production/murder-wheel/symbols/murder-key.svg` | 512×512 | SVG wrapper → shared WebP atlas | Opaque | Individual approved wheel object/tile export. | **READY** |
| Murder Wheel | Candlestick | `frontend/assets/castle/production/murder-wheel/symbols/candlestick.svg` | 512×512 | SVG wrapper → shared WebP atlas | Opaque | Individual approved wheel object/tile export. | **READY** |
| Murder Wheel | Result panel shell | `frontend/assets/castle/production/murder-wheel/result-panel-shell.svg` | 900×300 | SVG | Transparent | Live selected-result name/explanation shell. | **READY** |
| Masked Faithful | Facedown contestant card | `frontend/assets/castle/production/masked-faithful/facedown-contestant-card.svg` | 480×720 | SVG wrapper → shared WebP atlas | Opaque | Physical facedown card; no contestant photo. | **READY** |
| Masked Faithful | Selected contestant treatment | `frontend/assets/castle/overlays/portrait-masked-faithful-selected.svg` | 320×420 | SVG | Transparent | Accepted dynamic portrait overlay. | **READY** |
| Masked Faithful | Unselected grayscale treatment | `frontend/assets/castle/overlays/portrait-unselected-faded.svg` | 320×420 | SVG | Transparent | Accepted faded/unselected dynamic portrait overlay. | **READY** |
| Masked Faithful | Castle 5 member reward treatment | `frontend/assets/castle/overlays/portrait-castle-five.svg` | 320×420 | SVG | Transparent | Accepted Castle 5 portrait overlay. | **READY** |
| Masked Faithful | New Alliance member treatment | `frontend/assets/castle/overlays/portrait-alliance-new-member.svg` | 320×420 | SVG | Transparent | Accepted new Alliance overlay. | **READY** |
| Masked Faithful | Castle 5 welcome/result treatment | `frontend/assets/castle/overlays/portrait-castle-five-welcome.svg` | 320×420 | SVG | Transparent | Accepted welcome/result overlay. | **READY** |
| Masked Faithful | Non-Alliance Faithful base | `frontend/assets/castle/overlays/portrait-normal.svg` | 320×420 | SVG | Transparent | Accepted normal contestant portrait overlay. | **READY** |
| Masked Faithful | Non-Alliance Faithful badge | `frontend/assets/castle/production/masked-faithful/faithful-non-alliance-badge.svg` | 320×420 | SVG | Transparent | Layer over the same interchangeable contestant portrait. | **READY** |
| Masked Faithful | 2× wager reward | `frontend/assets/castle/production/masked-faithful/wager-2x.svg` | 320×420 | SVG | Transparent | Layer over the same interchangeable contestant portrait. | **READY** |
| Masked Faithful | 3× wager reward | `frontend/assets/castle/production/masked-faithful/wager-3x.svg` | 320×420 | SVG | Transparent | Layer over the same interchangeable contestant portrait. | **READY** |
| Masked Faithful | Wager returned | `frontend/assets/castle/production/masked-faithful/wager-returned.svg` | 320×420 | SVG | Transparent | Layer over the same interchangeable contestant portrait. | **READY** |
| Masked Traitor / Fate | Sealed Fate card/back | `frontend/assets/castle/production/fate/cards/fate-sealed.svg` | 480×720 | SVG | Opaque/transparent edge | Common sealed card; identical before reveal. | **READY** |
| Masked Traitor / Fate | Dagger Fate card | `frontend/assets/castle/production/fate/cards/fate-dagger.svg` | 480×720 | SVG wrapper → shared WebP atlas | Opaque | Physical Fate card face. | **READY** |
| Masked Traitor / Fate | Poison Fate card | `frontend/assets/castle/production/fate/cards/fate-poison.svg` | 480×720 | SVG wrapper → shared WebP atlas | Opaque | Physical Fate card face. | **READY** |
| Masked Traitor / Fate | Rope Fate card | `frontend/assets/castle/production/fate/cards/fate-rope.svg` | 480×720 | SVG wrapper → shared WebP atlas | Opaque | Physical Fate card face. | **READY** |
| Masked Traitor / Fate | Wrench Fate card | `frontend/assets/castle/production/fate/cards/fate-wrench.svg` | 480×720 | SVG wrapper → shared WebP atlas | Opaque | Physical Fate card face. | **READY** |
| Masked Traitor / Fate | Toaster Fate card | `frontend/assets/castle/production/fate/cards/fate-toaster.svg` | 480×720 | SVG wrapper → shared WebP atlas | Opaque | Physical Fate card face. | **READY** |
| Masked Traitor / Fate | Technology Fate card | `frontend/assets/castle/production/fate/cards/fate-technology.svg` | 480×720 | SVG wrapper → shared WebP atlas | Opaque | Physical Fate card face. | **READY** |
| Masked Traitor / Fate | Safe Fate card (lifesaver) | `frontend/assets/castle/production/fate/cards/fate-safe.svg` | 480×720 | SVG wrapper → shared WebP atlas | Opaque | Physical Fate card face. | **READY** |
| Masked Traitor / Fate | Alternate Safe Fate card (duck) | `frontend/assets/castle/production/fate/cards/fate-safe-duck.svg` | 480×720 | SVG wrapper → shared WebP atlas | Opaque | Physical Fate card face. | **READY** |
| Masked Traitor / Fate | Selected/revealed state | `frontend/assets/castle/production/fate/states/fate-selected-overlay.svg` | 480×720 | SVG | Transparent | Layered Fate card state treatment. | **READY** |
| Masked Traitor / Fate | Faded/unselected state | `frontend/assets/castle/production/fate/states/fate-unselected-faded-overlay.svg` | 480×720 | SVG | Transparent | Layered Fate card state treatment. | **READY** |
| Masked Traitor / Fate | Danger progression treatment | `frontend/assets/castle/production/fate/states/fate-danger-progression-overlay.svg` | 480×720 | SVG | Transparent | Layered Fate card state treatment. | **READY** |
| Masked Traitor / Fate | Traitor portrait overlay | `frontend/assets/castle/overlays/portrait-fate-traitor.svg` | 320×420 | SVG | Transparent | Accepted live TV Traitor portrait treatment. | **READY** |
| Masked Traitor / Fate | SAFE — lifesaver | `frontend/assets/castle/production/fate/results/safe-lifesaver.svg` | 480×720 | SVG wrapper → shared WebP atlas | Opaque with reserved live area | Result art; lower live area reserved for Traitor name/Lives. | **READY** |
| Masked Traitor / Fate | SAFE — duck | `frontend/assets/castle/production/fate/results/safe-duck.svg` | 480×720 | SVG wrapper → shared WebP atlas | Opaque with reserved live area | Result art; lower live area reserved for Traitor name/Lives. | **READY** |
| Masked Traitor / Fate | MURDERED | `frontend/assets/castle/production/fate/results/murdered.svg` | 480×720 | SVG wrapper → shared WebP atlas | Opaque with reserved live area | Result art; lower live area reserved for Traitor name/Lives. | **READY** |
| Masked Traitor / Fate | DEATH BY DAGGER | `frontend/assets/castle/production/fate/results/death-dagger.svg` | 480×720 | SVG wrapper → shared WebP atlas | Opaque with reserved live area | Result art; lower live area reserved for Traitor name/Lives. | **READY** |
| Masked Traitor / Fate | DEATH BY POISON | `frontend/assets/castle/production/fate/results/death-poison.svg` | 480×720 | SVG wrapper → shared WebP atlas | Opaque with reserved live area | Result art; lower live area reserved for Traitor name/Lives. | **READY** |
| Masked Traitor / Fate | DEATH BY ROPE | `frontend/assets/castle/production/fate/results/death-rope.svg` | 480×720 | SVG wrapper → shared WebP atlas | Opaque with reserved live area | Result art; lower live area reserved for Traitor name/Lives. | **READY** |
| Masked Traitor / Fate | DEATH BY WRENCH | `frontend/assets/castle/production/fate/results/death-wrench.svg` | 480×720 | SVG wrapper → shared WebP atlas | Opaque with reserved live area | Result art; lower live area reserved for Traitor name/Lives. | **READY** |
| Masked Traitor / Fate | DEATH BY TOASTER | `frontend/assets/castle/production/fate/results/death-toaster.svg` | 480×720 | SVG wrapper → shared WebP atlas | Opaque with reserved live area | Result art; lower live area reserved for Traitor name/Lives. | **READY** |
| Masked Traitor / Fate | DEATH BY TECHNOLOGY | `frontend/assets/castle/production/fate/results/death-technology.svg` | 480×720 | SVG wrapper → shared WebP atlas | Opaque with reserved live area | Result art; lower live area reserved for Traitor name/Lives. | **READY** |
| Masked Murderer | Standard Murder | `frontend/assets/castle/production/masked-murderer/standard-murder.svg` | 480×720 | SVG wrapper → shared WebP atlas | Opaque | Post-wheel benefit art; gameplay effect remains live. | **READY** |
| Masked Murderer | Weapon Match | `frontend/assets/castle/production/masked-murderer/weapon-match.svg` | 480×720 | SVG wrapper → shared WebP atlas | Opaque | Post-wheel benefit art; gameplay effect remains live. | **READY** |
| Masked Murderer | Murder Key | `frontend/assets/castle/production/masked-murderer/murder-key.svg` | 480×720 | SVG wrapper → shared WebP atlas | Opaque | Post-wheel benefit art; gameplay effect remains live. | **READY** |
| Masked Murderer | Murderer Card | `frontend/assets/castle/production/masked-murderer/murderer-card.svg` | 480×720 | SVG wrapper → shared WebP atlas | Opaque | Post-wheel benefit art; gameplay effect remains live. | **READY** |
| Murder Target | PATTC target normal/selectable overlay | `frontend/assets/castle/overlays/portrait-murder-target.svg` | 320×420 | SVG | Transparent | Accepted PATTC target overlay; Lives/Score/Place live. | **READY** |
| Murder Target | Selected target danger overlay | `frontend/assets/castle/overlays/portrait-murder-danger.svg` | 320×420 | SVG | Transparent | Accepted selected/danger target state. | **READY** |
| Murder Target | Selected target supplemental red treatment | `frontend/assets/castle/production/masked-murderer/selected-target-overlay.svg` | 320×420 | SVG | Transparent | Optional selection emphasis if accepted target overlay needs extra red state. | **READY** |
| Masked Murderer | Murder confirmation treatment | `frontend/assets/castle/production/masked-murderer/murder-confirmation.svg` | 960×720 | SVG wrapper → shared WebP atlas | Opaque with reserved live area | Dark/mischievous YOU MURDERER / YOU KILLED IT result shell; secrecy copy live. | **READY** |
| Regular Host / Masked Host | Host portrait overlay | `frontend/assets/castle/overlays/portrait-host.svg` | 320×420 | SVG | Transparent | Accepted Host-specific overlay for approved source image. | **READY** |
| PATTC Portrait | PATTC player overlay | `frontend/assets/castle/overlays/portrait-pattc-player.svg` | 320×420 | SVG | Transparent | Accepted player portrait geometry. | **READY** |

## Host source

`frontend/assets/castle/production/host/host-teal-source.svg` is the approved supplied Host/show source export. It preserves the supplied teal background exactly inside the atlas-backed export and is paired with `frontend/assets/castle/overlays/portrait-host.svg`.

## Existing room assets used by Integration

- `frontend/assets/castle/rooms/masked-hall-modern.webp`
- `frontend/assets/castle/rooms/host-study-modern.webp`
- `frontend/assets/castle/rooms/portrait-gallery-modern.webp`
- `frontend/assets/castle/rooms/murder-passage-modern.webp`

## Final gap audit

- Regular Host — READY: supplied Host source + accepted Host overlay + Host Study room.
- Masked Hall — READY: entrance hero + sealed wager envelope + Masked Hall room.
- Masked Host — READY: card back, three reward faces, selected, faded, final reward + Host source/overlay.
- Masked Faithful — READY: facedown card + accepted dynamic portrait overlays + wager/reward badges + Castle 5 welcome treatment.
- Masked Murderer — READY: approved complete wheel + ten individual objects + pointer + result shell + post-wheel benefit art + confirmation.
- Murder target — READY: accepted target/danger overlays + live Lives/Score/Place.
- Masked Traitor / Fate — READY: sealed card, Dagger/Poison/Rope/Wrench/Toaster/Technology/Safe faces, selected/faded/danger states, full result family, accepted Fate Traitor overlay.

**PRODUCTION ART LIBRARY COMPLETE FOR CURRENT CASTLE ENCOUNTERS**

Gameplay effects, scoring, encounter probabilities, target eligibility, Traitor authority, and Fate outcomes remain runtime/backend authority and are not encoded in these art files.