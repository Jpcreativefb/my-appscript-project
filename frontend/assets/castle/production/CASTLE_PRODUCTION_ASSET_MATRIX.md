# PATTC Castle Production Asset Matrix — R4

**Status:** DIRECTOR APPROVAL REQUIRED — DEFINE FIRST, BUILD SECOND  
**Clean baseline:** `7ca981733439824cd5e306c24a27e94da6339c9c`  
**Specialist branch:** `fix/castle-controlled-production-reconstruction-r3`  
**Scope of this checkpoint:** matrix only. No production art is rebuilt, integrated, merged, or deployed by this checkpoint.

## 1. Authoritative runtime architecture

All production compositions must follow this order where a portrait is present:

`static frame/card` → `dynamic portrait` → `state/reward overlay` → `live HTML text`

Rules:

- Interchangeable Host, TV contestant, and PATTC player portraits are **never baked into static art**.
- Names, scores, Lives, wagers, places, bonus amounts, selected-result explanations, and other changing values remain **live HTML/text**.
- Selected, faded, danger, alliance, reward, and similar states use a reusable transparent overlay or CSS whenever practical. Do not duplicate a full raster card only to express a state.
- Every new raster asset is authored natively at the exact size listed below. No upscaling from review/contact boards and no perspective correction of an angled crop.
- Review boards/contact sheets are visual references only; they are not pixel sources for a rebuild.
- Every runtime raster must decode independently. No atlas, SVG-to-raster indirection, runtime crop coordinates, or external raster dependency is allowed.
- Final raster default is **WebP** for opaque standalone art and **PNG** where true alpha/transparency is required. Existing lightweight vector overlays may remain SVG when they are already approved and contain no raster dependency.
- `image-gen-1(7).png` at **1254×1254** is the genuine recovered Murder Wheel master. It is protected; the complete wheel is not to be reconstructed.

## 2. Dynamic/live-area conventions

| Area ID | Exact area | Runtime ownership | Rule |
|---|---:|---|---|
| `PORTRAIT_320x420` | 320×420 | Dynamic image layer | Host/contestant/PATTC portrait supplied at runtime; never part of static production raster. |
| `CARD_480x720` | 480×720 | Static card/shell canvas | Native card family geometry. Portrait/state/text layers are composed above this canvas where applicable. |
| `RESULT_480x720` | 480×720 | Static result shell | Result illustration/shell only; changing person/value/result explanation is HTML. |
| `TARGET_320x420` | 320×420 | Dynamic player portrait + overlay | PATTC target image is runtime data; Lives/Score/Place are HTML. |
| `WHEEL_1254` | 1254×1254 | Recovered static master | Protected recovered complete Murder Wheel. No portrait/live text is baked in. |
| `SYMBOL_512` | 512×512 | Static prop/symbol | Standalone wheel/encounter object. Alpha used when the object must float over a runtime background. |
| `RESULT_PANEL_900x300` | 900×300 | Static transparent shell + HTML | Selected wheel result name/explanation is HTML. |
| `CONFIRM_960x720` | 960×720 | Static result shell + HTML | Target/result/secrecy copy remains HTML. |

> Placement rule: matrix dimensions define the native layer boxes. Exact responsive on-screen placement belongs to Integration/CSS and must not be baked into the image pixels.

## 3. Production asset matrix

### A. Regular Host

| Asset name | Encounter | Native size | Static artwork | Interchangeable / dynamic image area | Live HTML / text area | Reusable overlays / states | Transparency | Authoritative visual reference | Existing / recovered / rebuild status | Final runtime format | Final repository path | Director approval |
|---|---|---:|---|---|---|---|---|---|---|---|---|---|
| Host teal/show source | Regular Host | 450×600 | Approved teal Host/show treatment only | Host portrait remains separate; use approved Host portrait treatment, not a baked portrait | Host name, encounter copy, wager/status if shown | `portrait-host` and shared portrait states | No alpha required | R3 production contact sheet + approved Host treatment | **EXISTING — source/reference; current wrapper architecture not final** | WebP if retained as runtime art | `frontend/assets/castle/production/host/host-teal-source.webp` | PENDING R4 MATRIX APPROVAL |
| Host portrait treatment | Regular Host / Masked Host | 320×420 | Frame/treatment only | `PORTRAIT_320x420` Host portrait beneath/within treatment | Host name/title if shown | selected/faded/reward states layer separately | Yes | Existing approved `portrait-host.svg` | **EXISTING APPROVED OVERLAY — KEEP** | SVG | `frontend/assets/castle/overlays/portrait-host.svg` | PENDING R4 MATRIX APPROVAL |

### B. Masked Hall

| Asset name | Encounter | Native size | Static artwork | Dynamic image area | Live HTML / text area | Reusable overlays / states | Transparency | Authoritative visual reference | Status | Final format | Final repository path | Director approval |
|---|---|---:|---|---|---|---|---|---|---|---|---|---|
| Masked Hall entrance hero | Masked Hall | 1200×1040 | Room-first three-mask entrance composition | None; any user/Host portrait is a separate runtime layer outside this artwork | Wager prompt, choices, countdown/status | None required in base image | Opaque | Approved R3 production contact sheet / Masked Hall review family | **REBUILD REQUIRED** — current atlas-backed wrapper is not acceptable | WebP | `frontend/assets/castle/production/masked-hall/masked-hall-entrance-hero.webp` | PENDING R4 MATRIX APPROVAL |
| Sealed wager envelope | Masked Hall | 900×450 | Straight-on sealed Castle envelope prop | None | Wager amount and instructions are HTML; never printed onto envelope art | Can receive CSS hover/selected glow | **Yes** | Approved Masked Hall envelope reference | **CHECKPOINT 1 REBUILD REQUIRED** | PNG | `frontend/assets/castle/production/masked-hall/sealed-wager-envelope.png` | PENDING R4 MATRIX APPROVAL |

### C. Masked Host — Checkpoint 1 family

| Asset name | Encounter | Native size | Static artwork | Dynamic image area | Live HTML / text area | Reusable overlays / states | Transparency | Authoritative visual reference | Status | Final format | Final repository path | Director approval |
|---|---|---:|---|---|---|---|---|---|---|---|---|---|
| Host card template | Masked Host | 480×720 | Straight-on common Host card face/frame geometry | `PORTRAIT_320x420`; approved Host portrait supplied dynamically | Host name/title and any changing encounter copy | selected overlay; faded CSS/overlay; reward overlay/shell | No alpha required for base | Approved Host card family / R3 contact sheet | **CHECKPOINT 1 REBUILD REQUIRED** | WebP | `frontend/assets/castle/production/host/host-card-template.webp` | PENDING R4 MATRIX APPROVAL |
| Host card back | Masked Host | 480×720 | Common facedown Host card back; no portrait | None | None | selected/faded may be CSS or shared overlay | No | Approved Host card-back reference | **CHECKPOINT 1 REBUILD REQUIRED** | WebP | `frontend/assets/castle/production/host/host-card-back.webp` | PENDING R4 MATRIX APPROVAL |
| Life Shield card | Masked Host | 480×720 | Life Shield reward illustration/card face | None | Award value/detail if variable remains HTML | selected/faded overlay shared across family | No | Approved Host reward card reference | **CHECKPOINT 1 REBUILD REQUIRED** | WebP | `frontend/assets/castle/production/host/host-life-shield.webp` | PENDING R4 MATRIX APPROVAL |
| Big Bonus card | Masked Host | 480×720 | Big Bonus reward illustration/card face | None | Bonus amount/multiplier is HTML because value may change | selected/faded overlay shared across family | No | Approved Host reward card reference | **CHECKPOINT 1 REBUILD REQUIRED** | WebP | `frontend/assets/castle/production/host/host-big-bonus.webp` | PENDING R4 MATRIX APPROVAL |
| Banish Reduction card | Masked Host | 480×720 | Banish Reduction reward illustration/card face | None | Reduction amount/rule explanation is HTML | selected/faded overlay shared across family | No | Approved Host reward card reference | **CHECKPOINT 1 REBUILD REQUIRED** | WebP | `frontend/assets/castle/production/host/host-banish-reduction.webp` | PENDING R4 MATRIX APPROVAL |
| Selected Host overlay | Masked Host | 480×720 | Selection ring/glow/emphasis only | Base card + dynamic portrait remain visible beneath | None | Reused by Host template/back/reward faces as applicable | **Yes** | Approved selected Host state | **CHECKPOINT 1 REBUILD REQUIRED** | PNG | `frontend/assets/castle/production/host/host-selected-overlay.png` | PENDING R4 MATRIX APPROVAL |
| Faded Host state | Masked Host | 480×720 visual box | No duplicate card pixels | Base card remains the source | None | Preferred `opacity`/grayscale CSS; transparent overlay only if Director rejects CSS match | CSS preferred | Approved faded/unselected Host state | **CHECKPOINT 1 SPEC — NO RASTER UNLESS REQUIRED** | CSS | Integration stylesheet; no production raster path unless separately approved | PENDING R4 MATRIX APPROVAL |
| Final Host reward shell | Masked Host | 480×720 | Final reward frame/shell only | If Host portrait is shown, reuse `PORTRAIT_320x420` dynamically | Reward name, variable amount, rule/result explanation | Can reuse selected glow; reward-specific emblem may be static | No alpha required for base shell | Approved final Host reward treatment | **CHECKPOINT 1 REBUILD REQUIRED** | WebP | `frontend/assets/castle/production/host/host-final-reward-shell.webp` | PENDING R4 MATRIX APPROVAL |

### D. Masked Faithful

| Asset name | Encounter | Native size | Static artwork | Dynamic image area | Live HTML / text area | Reusable overlays / states | Transparency | Authoritative visual reference | Status | Final format | Final repository path | Director approval |
|---|---|---:|---|---|---|---|---|---|---|---|---|---|
| Facedown contestant card | Masked Faithful | 480×720 | Common facedown contestant card | None until reveal | None | selected/faded via shared state treatment | No | Approved Masked Faithful card family | **REBUILD REQUIRED** — atlas-backed wrapper not final | WebP | `frontend/assets/castle/production/masked-faithful/facedown-contestant-card.webp` | PENDING R4 MATRIX APPROVAL |
| Selected contestant treatment | Masked Faithful | 320×420 | Border/glow/state only | `PORTRAIT_320x420` contestant photo underneath | Contestant name/status HTML | Reusable across contestant choices | Yes | Existing approved overlay | **EXISTING APPROVED OVERLAY — KEEP** | SVG | `frontend/assets/castle/overlays/portrait-masked-faithful-selected.svg` | PENDING R4 MATRIX APPROVAL |
| Unselected/faded contestant | Masked Faithful | 320×420 visual box | No duplicate portrait/card | `PORTRAIT_320x420` | None | Existing faded overlay or CSS grayscale/opacity | Yes / CSS | Existing approved `portrait-unselected-faded.svg` | **EXISTING APPROVED OVERLAY — KEEP** | SVG/CSS | `frontend/assets/castle/overlays/portrait-unselected-faded.svg` | PENDING R4 MATRIX APPROVAL |
| Castle 5 member treatment | Masked Faithful | 320×420 | Alliance/Castle 5 treatment only | Same contestant portrait remains dynamic | Contestant name and live wager/result | Reusable portrait state | Yes | Existing approved overlay | **EXISTING APPROVED OVERLAY — KEEP** | SVG | `frontend/assets/castle/overlays/portrait-castle-five.svg` | PENDING R4 MATRIX APPROVAL |
| New Alliance member treatment | Masked Faithful | 320×420 | New-member treatment only | Same contestant portrait remains dynamic | Contestant name/result text | Reusable portrait state | Yes | Existing approved overlay | **EXISTING APPROVED OVERLAY — KEEP** | SVG | `frontend/assets/castle/overlays/portrait-alliance-new-member.svg` | PENDING R4 MATRIX APPROVAL |
| Castle 5 welcome/result treatment | Masked Faithful | 320×420 | Welcome/result treatment only | Same contestant portrait remains dynamic | Result explanation HTML | Reusable portrait state | Yes | Existing approved overlay | **EXISTING APPROVED OVERLAY — KEEP** | SVG | `frontend/assets/castle/overlays/portrait-castle-five-welcome.svg` | PENDING R4 MATRIX APPROVAL |
| Normal / non-Alliance Faithful treatment | Masked Faithful | 320×420 | Normal portrait frame only | Same contestant portrait remains dynamic | Contestant name/status HTML | Optional non-alliance badge above | Yes | Existing approved normal overlay | **EXISTING APPROVED OVERLAY — KEEP** | SVG | `frontend/assets/castle/overlays/portrait-normal.svg` | PENDING R4 MATRIX APPROVAL |
| Non-Alliance Faithful badge | Masked Faithful | 320×420 | Badge/state graphics only | Same contestant portrait remains dynamic | None | Stacks over normal portrait treatment | Yes | Approved Masked Faithful overlay reference | **EXISTING — KEEP / VERIFY INDEPENDENT** | SVG | `frontend/assets/castle/production/masked-faithful/faithful-non-alliance-badge.svg` | PENDING R4 MATRIX APPROVAL |
| 2× wager reward overlay | Masked Faithful | 320×420 | Reward treatment only | Same contestant portrait remains dynamic | Actual wager and payout values HTML | Reusable reward overlay | Yes | Approved Masked Faithful reward family | **EXISTING — KEEP / VERIFY** | SVG | `frontend/assets/castle/production/masked-faithful/wager-2x.svg` | PENDING R4 MATRIX APPROVAL |
| 3× wager reward overlay | Masked Faithful | 320×420 | Reward treatment only | Same contestant portrait remains dynamic | Actual wager and payout values HTML | Reusable reward overlay | Yes | Approved Masked Faithful reward family | **EXISTING — KEEP / VERIFY** | SVG | `frontend/assets/castle/production/masked-faithful/wager-3x.svg` | PENDING R4 MATRIX APPROVAL |
| Wager returned overlay | Masked Faithful | 320×420 | Reward-return treatment only | Same contestant portrait remains dynamic | Actual returned wager value HTML | Reusable reward overlay | Yes | Approved Masked Faithful reward family | **EXISTING — KEEP / VERIFY** | SVG | `frontend/assets/castle/production/masked-faithful/wager-returned.svg` | PENDING R4 MATRIX APPROVAL |

### E. Murder Wheel

| Asset name | Encounter | Native size | Static artwork | Dynamic image area | Live HTML / text area | Reusable overlays / states | Transparency | Authoritative visual reference | Status | Final format | Final repository path | Director approval |
|---|---|---:|---|---|---|---|---|---|---|---|---|---|
| Complete Murder Wheel | Murder Wheel | **1254×1254** | Complete approved wheel composition | None | Spin count/result copy stays HTML outside wheel pixels | Pointer may remain independently animatable if Integration chooses | Preserve recovered alpha/opaque characteristics; do not alter pixels | **Genuine recovered `image-gen-1(7).png`** | **RECOVERED MASTER — PROTECTED; DO NOT REBUILD** | PNG | `frontend/assets/castle/production/murder-wheel/murder-wheel-r3.png` (byte-faithful use of recovered master) | PENDING R4 MATRIX APPROVAL |
| Murder Wheel pointer | Murder Wheel | 512×480 | Pointer object only | None | None | Optional rotation/position handled by CSS/JS | Yes when separated | Approved wheel family / R3 contact sheet | **REBUILD/RECOVER LATER — NOT CHECKPOINT 1** | PNG | `frontend/assets/castle/production/murder-wheel/murder-wheel-pointer.png` | PENDING R4 MATRIX APPROVAL |
| Technology symbol | Murder Wheel | 512×512 | Standalone technology object | None | Result label/explanation HTML | Shared result highlight can be CSS | Yes preferred | Approved wheel symbol family | **REBUILD/RECOVER LATER** | PNG | `frontend/assets/castle/production/murder-wheel/symbols/technology.png` | PENDING R4 MATRIX APPROVAL |
| Dagger symbol | Murder Wheel | 512×512 | Standalone dagger object | None | HTML result text | Shared state | Yes preferred | Approved wheel symbol family | **REBUILD/RECOVER LATER** | PNG | `frontend/assets/castle/production/murder-wheel/symbols/dagger.png` | PENDING R4 MATRIX APPROVAL |
| Poison symbol | Murder Wheel | 512×512 | Standalone poison object | None | HTML result text | Shared state | Yes preferred | Approved wheel symbol family | **REBUILD/RECOVER LATER** | PNG | `frontend/assets/castle/production/murder-wheel/symbols/poison.png` | PENDING R4 MATRIX APPROVAL |
| Rope symbol | Murder Wheel | 512×512 | Standalone rope object | None | HTML result text | Shared state | Yes preferred | Approved wheel symbol family | **REBUILD/RECOVER LATER** | PNG | `frontend/assets/castle/production/murder-wheel/symbols/rope.png` | PENDING R4 MATRIX APPROVAL |
| Skull symbol | Murder Wheel | 512×512 | Standalone skull object | None | HTML result text | Shared state | **Yes** | Approved skull on Murder Wheel / R3 production reference | **CHECKPOINT 1 REBUILD REQUIRED** | PNG | `frontend/assets/castle/production/murder-wheel/symbols/skull.png` | PENDING R4 MATRIX APPROVAL |
| Wrench symbol | Murder Wheel | 512×512 | Standalone wrench object | None | HTML result text | Shared state | Yes preferred | Approved wheel symbol family | **REBUILD/RECOVER LATER** | PNG | `frontend/assets/castle/production/murder-wheel/symbols/wrench.png` | PENDING R4 MATRIX APPROVAL |
| Toaster symbol | Murder Wheel | 512×512 | Standalone toaster object | None | HTML result text | Shared state | Yes preferred | Approved wheel symbol family | **REBUILD/RECOVER LATER** | PNG | `frontend/assets/castle/production/murder-wheel/symbols/toaster.png` | PENDING R4 MATRIX APPROVAL |
| Murderer Card symbol | Murder Wheel | 512×512 | Standalone Murderer Card object | None | HTML result text | Shared state | Yes preferred | Approved wheel symbol family | **REBUILD/RECOVER LATER** | PNG | `frontend/assets/castle/production/murder-wheel/symbols/murderer-card.png` | PENDING R4 MATRIX APPROVAL |
| Murder Key symbol | Murder Wheel | 512×512 | Standalone Murder Key object | None | HTML result text | Shared state | Yes preferred | Approved wheel symbol family | **REBUILD/RECOVER LATER** | PNG | `frontend/assets/castle/production/murder-wheel/symbols/murder-key.png` | PENDING R4 MATRIX APPROVAL |
| Candlestick symbol | Murder Wheel | 512×512 | Standalone candlestick object | None | HTML result text | Shared state | Yes preferred | Approved wheel symbol family | **REBUILD/RECOVER LATER** | PNG | `frontend/assets/castle/production/murder-wheel/symbols/candlestick.png` | PENDING R4 MATRIX APPROVAL |
| Wheel result panel shell | Murder Wheel | 900×300 | Decorative result shell only | Optional selected symbol can be layered separately | **Selected result name + explanation are HTML** | Success/danger class may be CSS | Yes | Existing approved result-panel shell | **EXISTING VECTOR — KEEP** | SVG | `frontend/assets/castle/production/murder-wheel/result-panel-shell.svg` | PENDING R4 MATRIX APPROVAL |

### F. Masked Murderer

| Asset name | Encounter | Native size | Static artwork | Dynamic image area | Live HTML / text area | Reusable overlays / states | Transparency | Authoritative visual reference | Status | Final format | Final repository path | Director approval |
|---|---|---:|---|---|---|---|---|---|---|---|---|---|
| Standard Murder card | Masked Murderer | 480×720 | Benefit/card illustration only | None | Gameplay effect/result copy HTML | selected/faded shared treatment | No | Approved Masked Murderer card family | **REBUILD/RECOVER LATER — DO NOT START YET** | WebP | `frontend/assets/castle/production/masked-murderer/standard-murder.webp` | PENDING R4 MATRIX APPROVAL |
| Weapon Match card | Masked Murderer | 480×720 | Benefit/card illustration only | None | Matched weapon/result HTML | selected/faded shared treatment | No | Approved Masked Murderer card family | **REBUILD/RECOVER LATER — DO NOT START YET** | WebP | `frontend/assets/castle/production/masked-murderer/weapon-match.webp` | PENDING R4 MATRIX APPROVAL |
| Murder Key card | Masked Murderer | 480×720 | Benefit/card illustration only | None | Live effect copy HTML | selected/faded shared treatment | No | Approved Masked Murderer card family | **REBUILD/RECOVER LATER — DO NOT START YET** | WebP | `frontend/assets/castle/production/masked-murderer/murder-key.webp` | PENDING R4 MATRIX APPROVAL |
| Murderer Card benefit | Masked Murderer | 480×720 | Benefit/card illustration only | None | Live effect copy HTML | selected/faded shared treatment | No | Approved Masked Murderer card family | **REBUILD/RECOVER LATER — DO NOT START YET** | WebP | `frontend/assets/castle/production/masked-murderer/murderer-card.webp` | PENDING R4 MATRIX APPROVAL |
| Murder confirmation shell | Masked Murderer | 960×720 | Dark/mischievous result frame/art only | Selected target portrait may be a separate `TARGET_320x420` layer if shown | Target name, secrecy copy, result explanation HTML | danger/success emphasis CSS/overlay | No alpha required for base | Approved YOU MURDERER / YOU KILLED IT result treatment | **REBUILD/RECOVER LATER — DO NOT START YET** | WebP | `frontend/assets/castle/production/masked-murderer/murder-confirmation.webp` | PENDING R4 MATRIX APPROVAL |

### G. Murder target

| Asset name | Encounter | Native size | Static artwork | Dynamic image area | Live HTML / text area | Reusable overlays / states | Transparency | Authoritative visual reference | Status | Final format | Final repository path | Director approval |
|---|---|---:|---|---|---|---|---|---|---|---|---|---|
| PATTC target normal/selectable treatment | Murder target | 320×420 | Target frame treatment only | **Full `TARGET_320x420` PATTC player portrait remains dynamic** | **Player name, Lives, Score, Place are HTML** | Can receive selected danger overlay | Yes | Existing approved target overlay | **EXISTING APPROVED OVERLAY — KEEP** | SVG | `frontend/assets/castle/overlays/portrait-murder-target.svg` | PENDING R4 MATRIX APPROVAL |
| Selected target danger treatment | Murder target | 320×420 | Red/danger treatment only | Same dynamic PATTC portrait remains beneath | Same player stats remain HTML | Reusable selected/danger state | Yes | Existing approved danger overlay | **EXISTING APPROVED OVERLAY — KEEP** | SVG | `frontend/assets/castle/overlays/portrait-murder-danger.svg` | PENDING R4 MATRIX APPROVAL |
| Supplemental selected-target red overlay | Murder target | 320×420 | Optional extra emphasis only | Same dynamic portrait | None | Use only if existing danger overlay cannot reproduce approved state | Yes | Approved R3 supplemental selection state | **EXISTING OPTIONAL — DIRECTOR DECISION NEEDED** | SVG | `frontend/assets/castle/production/masked-murderer/selected-target-overlay.svg` | PENDING R4 MATRIX APPROVAL |

### H. Masked Traitor / Fate

| Asset name | Encounter | Native size | Static artwork | Dynamic image area | Live HTML / text area | Reusable overlays / states | Transparency | Authoritative visual reference | Status | Final format | Final repository path | Director approval |
|---|---|---:|---|---|---|---|---|---|---|---|---|---|
| Sealed Fate card/back | Masked Traitor / Fate | 480×720 | Common sealed Fate card/back | None | None | selected/faded/danger overlays | Alpha edge optional | Approved Fate card family | **EXISTING VECTOR / VERIFY; DO NOT REBUILD YET** | SVG or standalone WebP if raster art required | `frontend/assets/castle/production/fate/cards/fate-sealed.svg` | PENDING R4 MATRIX APPROVAL |
| Dagger Fate card | Fate | 480×720 | Dagger Fate card face | None | Changing wager/value/result HTML | selected/faded/danger overlays | No | Approved Fate family | **REBUILD/RECOVER LATER — DO NOT START YET** | WebP | `frontend/assets/castle/production/fate/cards/fate-dagger.webp` | PENDING R4 MATRIX APPROVAL |
| Poison Fate card | Fate | 480×720 | Poison Fate card face | None | Changing wager/value/result HTML | selected/faded/danger overlays | No | Approved Fate family | **REBUILD/RECOVER LATER — DO NOT START YET** | WebP | `frontend/assets/castle/production/fate/cards/fate-poison.webp` | PENDING R4 MATRIX APPROVAL |
| Rope Fate card | Fate | 480×720 | Rope Fate card face | None | Changing wager/value/result HTML | selected/faded/danger overlays | No | Approved Fate family | **REBUILD/RECOVER LATER — DO NOT START YET** | WebP | `frontend/assets/castle/production/fate/cards/fate-rope.webp` | PENDING R4 MATRIX APPROVAL |
| Wrench Fate card | Fate | 480×720 | Wrench Fate card face | None | Changing wager/value/result HTML | selected/faded/danger overlays | No | Approved Fate family | **REBUILD/RECOVER LATER — DO NOT START YET** | WebP | `frontend/assets/castle/production/fate/cards/fate-wrench.webp` | PENDING R4 MATRIX APPROVAL |
| Toaster Fate card | Fate | 480×720 | Toaster Fate card face | None | Changing wager/value/result HTML | selected/faded/danger overlays | No | Approved Fate family | **REBUILD/RECOVER LATER — DO NOT START YET** | WebP | `frontend/assets/castle/production/fate/cards/fate-toaster.webp` | PENDING R4 MATRIX APPROVAL |
| Technology Fate card | Fate | 480×720 | Technology Fate card face | None | Changing wager/value/result HTML | selected/faded/danger overlays | No | Approved Fate family | **REBUILD/RECOVER LATER — DO NOT START YET** | WebP | `frontend/assets/castle/production/fate/cards/fate-technology.webp` | PENDING R4 MATRIX APPROVAL |
| Safe Fate card — lifesaver | Fate | 480×720 | Safe/lifesaver Fate card face | None | Changing wager/value/result HTML | selected/faded/danger overlays | No | Approved Fate family | **REBUILD/RECOVER LATER — DO NOT START YET** | WebP | `frontend/assets/castle/production/fate/cards/fate-safe.webp` | PENDING R4 MATRIX APPROVAL |
| Safe Fate card — duck | Fate | 480×720 | Alternate safe/duck card face | None | Changing wager/value/result HTML | selected/faded/danger overlays | No | Approved Fate family | **REBUILD/RECOVER LATER — DO NOT START YET** | WebP | `frontend/assets/castle/production/fate/cards/fate-safe-duck.webp` | PENDING R4 MATRIX APPROVAL |
| Fate selected/revealed overlay | Fate | 480×720 | State treatment only | Underlying Fate card unchanged | None | Reusable on every Fate card | Yes | Existing approved state | **EXISTING VECTOR — KEEP** | SVG | `frontend/assets/castle/production/fate/states/fate-selected-overlay.svg` | PENDING R4 MATRIX APPROVAL |
| Fate faded/unselected overlay | Fate | 480×720 | State treatment only | Underlying Fate card unchanged | None | Reusable on every Fate card; CSS acceptable if exact visual matches | Yes | Existing approved state | **EXISTING VECTOR — KEEP / CSS MAY REPLACE AT INTEGRATION** | SVG/CSS | `frontend/assets/castle/production/fate/states/fate-unselected-faded-overlay.svg` | PENDING R4 MATRIX APPROVAL |
| Fate danger-progression overlay | Fate | 480×720 | Danger/progression treatment only | Underlying Fate card unchanged | Live progression values/copy HTML | Reusable on Fate card family | Yes | Existing approved state | **EXISTING VECTOR — KEEP** | SVG | `frontend/assets/castle/production/fate/states/fate-danger-progression-overlay.svg` | PENDING R4 MATRIX APPROVAL |
| Traitor portrait treatment | Fate | 320×420 | Traitor portrait frame/state only | `PORTRAIT_320x420` live TV Traitor portrait | Traitor name/Lives HTML | Can combine with Fate danger/result state | Yes | Existing approved Fate Traitor overlay | **EXISTING APPROVED OVERLAY — KEEP** | SVG | `frontend/assets/castle/overlays/portrait-fate-traitor.svg` | PENDING R4 MATRIX APPROVAL |

### I. Fate results

All Fate result assets share one geometry and the same rule: **the result illustration/shell may be static; Traitor name, Lives, wager, changing values, and explanatory/result copy remain HTML.** No Fate result rebuild begins until Director approves this matrix.

| Asset name | Native size | Dynamic image area | Live text | Transparency | Authoritative reference | Status | Final format | Final repository path | Director approval |
|---|---:|---|---|---|---|---|---|---|---|
| SAFE — lifesaver result shell | 480×720 | Optional separate Traitor `PORTRAIT_320x420` if layout calls for portrait | Traitor name/Lives/result explanation | Opaque base with reserved live area | Approved Fate results family | REBUILD/RECOVER LATER | WebP | `frontend/assets/castle/production/fate/results/safe-lifesaver.webp` | PENDING R4 MATRIX APPROVAL |
| SAFE — duck result shell | 480×720 | Optional separate Traitor portrait | Traitor name/Lives/result explanation | Opaque base with reserved live area | Approved Fate results family | REBUILD/RECOVER LATER | WebP | `frontend/assets/castle/production/fate/results/safe-duck.webp` | PENDING R4 MATRIX APPROVAL |
| MURDERED result shell | 480×720 | Optional separate Traitor portrait | Traitor name/Lives/result explanation | Opaque base with reserved live area | Approved Fate results family | REBUILD/RECOVER LATER | WebP | `frontend/assets/castle/production/fate/results/murdered.webp` | PENDING R4 MATRIX APPROVAL |
| DEATH BY DAGGER result shell | 480×720 | Optional separate Traitor portrait | Traitor name/Lives/result explanation | Opaque base with reserved live area | Approved Fate results family | REBUILD/RECOVER LATER | WebP | `frontend/assets/castle/production/fate/results/death-dagger.webp` | PENDING R4 MATRIX APPROVAL |
| DEATH BY POISON result shell | 480×720 | Optional separate Traitor portrait | Traitor name/Lives/result explanation | Opaque base with reserved live area | Approved Fate results family | REBUILD/RECOVER LATER | WebP | `frontend/assets/castle/production/fate/results/death-poison.webp` | PENDING R4 MATRIX APPROVAL |
| DEATH BY ROPE result shell | 480×720 | Optional separate Traitor portrait | Traitor name/Lives/result explanation | Opaque base with reserved live area | Approved Fate results family | REBUILD/RECOVER LATER | WebP | `frontend/assets/castle/production/fate/results/death-rope.webp` | PENDING R4 MATRIX APPROVAL |
| DEATH BY WRENCH result shell | 480×720 | Optional separate Traitor portrait | Traitor name/Lives/result explanation | Opaque base with reserved live area | Approved Fate results family | REBUILD/RECOVER LATER | WebP | `frontend/assets/castle/production/fate/results/death-wrench.webp` | PENDING R4 MATRIX APPROVAL |
| DEATH BY TOASTER result shell | 480×720 | Optional separate Traitor portrait | Traitor name/Lives/result explanation | Opaque base with reserved live area | Approved Fate results family | REBUILD/RECOVER LATER | WebP | `frontend/assets/castle/production/fate/results/death-toaster.webp` | PENDING R4 MATRIX APPROVAL |
| DEATH BY TECHNOLOGY result shell | 480×720 | Optional separate Traitor portrait | Traitor name/Lives/result explanation | Opaque base with reserved live area | Approved Fate results family | REBUILD/RECOVER LATER | WebP | `frontend/assets/castle/production/fate/results/death-technology.webp` | PENDING R4 MATRIX APPROVAL |

### J. Shared portrait / state overlays

| Asset name | Used by | Native size | Static artwork | Dynamic image area | Live text | Reusable state | Transparency | Reference / status | Final format/path | Director approval |
|---|---|---:|---|---|---|---|---|---|---|---|
| Normal portrait frame | Contestants | 320×420 | Frame only | Full runtime portrait | Name/status HTML | Base state | Yes | Existing approved `portrait-normal.svg` | SVG — `frontend/assets/castle/overlays/portrait-normal.svg` | PENDING R4 MATRIX APPROVAL |
| Host portrait frame | Host | 320×420 | Frame/treatment only | Full runtime Host portrait | Name/title HTML | Host base state | Yes | Existing approved `portrait-host.svg` | SVG — `frontend/assets/castle/overlays/portrait-host.svg` | PENDING R4 MATRIX APPROVAL |
| Masked Faithful selected | Contestants | 320×420 | State only | Same runtime portrait | Name/status HTML | Selected | Yes | Existing approved | SVG — `frontend/assets/castle/overlays/portrait-masked-faithful-selected.svg` | PENDING R4 MATRIX APPROVAL |
| Unselected/faded | Contestants | 320×420 | State only | Same runtime portrait | None | Faded/grayscale | Yes | Existing approved | SVG/CSS — `frontend/assets/castle/overlays/portrait-unselected-faded.svg` | PENDING R4 MATRIX APPROVAL |
| Castle 5 | Contestants | 320×420 | State only | Same runtime portrait | Name/result HTML | Alliance | Yes | Existing approved | SVG — `frontend/assets/castle/overlays/portrait-castle-five.svg` | PENDING R4 MATRIX APPROVAL |
| Alliance new member | Contestants | 320×420 | State only | Same runtime portrait | Name/result HTML | Alliance new-member | Yes | Existing approved | SVG — `frontend/assets/castle/overlays/portrait-alliance-new-member.svg` | PENDING R4 MATRIX APPROVAL |
| Castle 5 welcome | Contestants | 320×420 | State only | Same runtime portrait | Result HTML | Welcome/result | Yes | Existing approved | SVG — `frontend/assets/castle/overlays/portrait-castle-five-welcome.svg` | PENDING R4 MATRIX APPROVAL |
| Fate Traitor | TV Traitor | 320×420 | State/frame only | Same runtime TV portrait | Name/Lives HTML | Fate Traitor | Yes | Existing approved | SVG — `frontend/assets/castle/overlays/portrait-fate-traitor.svg` | PENDING R4 MATRIX APPROVAL |
| Murder target | PATTC player | 320×420 | State/frame only | Same runtime PATTC portrait | Name/Lives/Score/Place HTML | Target available | Yes | Existing approved | SVG — `frontend/assets/castle/overlays/portrait-murder-target.svg` | PENDING R4 MATRIX APPROVAL |
| Murder danger | PATTC player | 320×420 | State/frame only | Same runtime PATTC portrait | Name/Lives/Score/Place HTML | Selected/danger | Yes | Existing approved | SVG — `frontend/assets/castle/overlays/portrait-murder-danger.svg` | PENDING R4 MATRIX APPROVAL |
| Host selected | Masked Host | 480×720 | State only | Base Host card/portrait underneath | None | Selected | Yes | Checkpoint 1 rebuild | PNG — `frontend/assets/castle/production/host/host-selected-overlay.png` | PENDING R4 MATRIX APPROVAL |
| Host faded | Masked Host | 480×720 visual box | No raster preferred | Base Host card/portrait underneath | None | Faded/unselected | CSS preferred | Approved faded Host state | CSS; no raster unless Director requires | PENDING R4 MATRIX APPROVAL |

## 4. Checkpoint 1 build queue — locked until Director approval

No files in this section are to be created until this matrix receives Director approval.

1. Host card template — **480×720** — WebP — dynamic Host portrait separate.
2. Host card back — **480×720** — WebP.
3. Life Shield card — **480×720** — WebP.
4. Big Bonus card — **480×720** — WebP; variable bonus amount remains HTML.
5. Banish Reduction card — **480×720** — WebP; variable reduction remains HTML.
6. Selected Host overlay — **480×720** — transparent PNG.
7. Faded Host state — **480×720 visual state** — CSS preferred; transparent PNG only if required to match approved art.
8. Final Host reward shell — **480×720** — WebP; portrait/variable reward copy separate.
9. Sealed wager envelope — **900×450** — transparent PNG.
10. Standalone Skull — **512×512** — transparent PNG.

Protected but **not rebuilt** in Checkpoint 1:

- Complete Murder Wheel — **1254×1254** — recovered `image-gen-1(7).png` master.
- Existing approved Host portrait — dynamically reused; no Host portrait reconstruction.

## 5. Per-asset production acceptance checklist

Every rebuilt/recovered runtime asset must pass all items below before it can move from `PENDING` to `READY FOR DIRECTOR REVIEW`:

- [ ] Native file dimensions exactly match the matrix.
- [ ] Straight-on geometry; no perspective-distorted card/window.
- [ ] Sharp at 100% native size.
- [ ] No enlarged contact-sheet/review-board pixels.
- [ ] No interchangeable Host/contestant/PATTC portrait baked in.
- [ ] No changing names, scores, Lives, wagers, places, bonus amounts, or result explanations baked in.
- [ ] Alpha/transparency matches the matrix.
- [ ] File decodes independently with no atlas/external image dependency.
- [ ] Approved visual reference is identified.
- [ ] Asset has been reviewed individually at 100%.
- [ ] Asset is included in the later Checkpoint contact sheet.
- [ ] Final repository path matches the matrix.

## 6. R4 stop condition

This file is the entire deliverable for this checkpoint. **Stop here.**

Do not create Checkpoint 1 artwork, Fate artwork, Masked Murderer artwork, integration changes, merges, or deployments until the Director approves the matrix.