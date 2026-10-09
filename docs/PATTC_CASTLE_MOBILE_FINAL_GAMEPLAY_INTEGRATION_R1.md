# PATTC SPECIALIST ASSIGNMENT — CASTLE MOBILE FINAL GAMEPLAY INTEGRATION R1

## Director status

**BUILD THE COMPLETE MOBILE PLAYER JOURNEY IN PROOF MODE**

Branch:

`feature/castle-presentation-proof-r1`

Director fast-forwarded this proof branch to the current accepted mobile-presentation room baseline:

`094888437ffff0528332b0420639c7c0d4b670e2`

That baseline already contains the approved modern room assets and room registry wiring.

Do not merge. Do not deploy. Do not touch production. Do not modify `.clasp.json`.

Gameplay authority is `docs/PATTC_CASTLE_DUEL_CANONICAL_RULEBOOK_R2.md` on the Castle Director baseline.

The Rules Alignment specialist owns backend/game rules. This specialist owns the **mobile player journey and presentation integration only**.

## Critical isolation rule

The richer final presentation must remain opt-in behind:

`?castleProof=1`

Without that query flag, the existing accepted Castle presentation must remain unchanged and authoritative.

Do not replace the default renderer yet.

## Goal

Turn the existing Castle screens and approved visual systems into one coherent mobile-first game flow that can be live-tested end to end in TEST.

Primary design size: 390px.

Also support 360px and 430px.

The user should experience one continuous Castle journey rather than a collection of disconnected specialist demos.

## Locked player journey

### Regular season

`Enter the Castle`
→ Grand Entrance / Previous Castle Reveal
→ optional Earlier Castle Reveals history
→ `STEP INTO TONIGHT'S ENCOUNTERS`
→ Encounter reveal/randomizer
→ encounter-specific gameplay
→ Decision Sealed
→ next encounter
→ repeat configured encounter count
→ round complete / waiting state
→ next settled episode begins again at Previous Castle Reveal

### Finale

Final Three announcement
→ Finale Armory
→ lock/prepare allowed advantages
→ enter Throne Room
→ 10 private Finale encounters
→ Finale complete/waiting
→ winner / Castle Jackpot reveal when authorized

Do not change the number or order of gameplay steps defined by backend/R2.

# PART A — NEW GRAND ENTRANCE / PREVIOUS CASTLE REVEAL

This is now the FIRST major section after the player presses Enter the Castle for an active/returning season.

Use a new asset hook:

`./assets/castle/rooms/grand-entrance-modern.webp`

The Backdrop specialist owns creation of that image. Until it arrives, use an intentional local fallback from the existing modern room pack; do not add a remote dependency.

## Visual direction

Use the approved Alliance / Previous Castle Reveal quality bar:

- realistic modern-manor entrance behind everything
- elegant gold/bronze trim
- translucent charcoal/black panels
- real contestant/PATTC portraits where authorized
- serif typography
- compact status chips/icons
- very small architectural radii
- no giant opaque cards
- no cartoon medieval treatment

## Header

Show:

`PREVIOUS CASTLE REVEAL`

`EPISODE X`

Prominent but compact shared:

`CASTLE JACKPOT`
`<authorized amount>`

The Jackpot amount comes from supplied Castle state only.

## Featured portrait section

Show meaningful people affected by the previous settled episode.

TV-show side, only when real Reality data/state supports it:

- contestant removed/eliminated from the show
- contestant murdered/banished on the show only if that result exists in authorized Reality data

PATTC Castle side:

- player lost a Castle life
- player lost final Castle life / eliminated from Castle championship
- Secret Shield prevented a murder
- other authorized survival events supplied by Castle state

Do NOT invent events merely to fill the design.

Do NOT reveal secret murderer identity unless R2/backend explicitly authorizes it.

Use real portraits + approved overlay hooks when assets are available.

If an image is unavailable, use the intentional Castle fallback—not a broken image or emoji.

## Episode event ledger / scroll section

Below the featured portraits show a compact scrollable event history for that episode.

Examples of allowed lines when supported by state:

- `castle1 — Lost 1 Castle life`
- `castle2 — Murder avoided — Secret Shield used`
- `castle3 — Lost final Castle life — Out of Castle championship`
- `Sherry — Eliminated from the TV season`
- `No Castle lives were lost`
- `No murder attempts succeeded`

Do not expose attacker/murderer identities before authorized reveal.

Use human-readable mixed-case copy, not internal enums.

# PART B — RUNNING CASTLE REVEAL HISTORY

The entrance must become a running season history, not a one-time recap.

Default selection:

most recent settled episode available.

Add a compact expandable control:

`Earlier Castle Reveals ▾`

or equivalent.

When opened, show settled episodes in reverse order:

Episode 5
Episode 4
Episode 3
...

Selecting an episode redraws the reveal card/events for that settled episode without navigating away from Castle.

## Data rule

Use already-loaded historical round/announcement data when available.

If the current backend does not yet return sufficient historical reveal data:

- DO NOT invent it
- DO NOT add backend APIs in this branch
- define the exact sanitized frontend data contract required from the Rules Alignment backend
- render an intentional `History becomes available after settlement` / no-history state as appropriate
- report the missing fields clearly in handoff

Opening the history dropdown must not trigger an API request per episode if the payload already contains the history.

# PART C — ENTRANCE CTA

At the bottom of the current episode reveal, show one clear action:

`STEP INTO TONIGHT'S ENCOUNTERS`

This is the preferred wording.

When no current open encounters are available, replace it with the correct supplied-state message/action rather than showing a dead button.

Examples:

- `THE CASTLE AWAITS THE NEXT EPISODE`
- `YOUR NIGHT IS SEALED`
- Finale-specific transition if authorized

Do not navigate to a fabricated encounter.

# PART D — ENCOUNTER FLOW INTEGRATION

Keep the accepted randomizer motion logic from the current presentation baseline.

For each supplied real match:

1. reveal room / atmospheric intro
2. use theatrical randomizer only as presentation
3. final card must be the sealed supplied match
4. render the correct gameplay branch
5. use the existing authoritative handler for choice/submission
6. show Decision Sealed after successful submission
7. move to next active encounter

Never add an API call per animation frame/tick.

Never let animation select opponent/outcome.

## Branch compatibility

Prepare integration hooks for the Special Card Pack:

- Traitor Guess
- Fate
- Masked Hall
- Host envelopes
- Murderer card / targets
- Human/PATTC encounter
- Final Three
- Armory
- Winner

Until the special-card branch is accepted, preserve existing functional gameplay for any branch not yet visually upgraded.

Do NOT block working gameplay waiting for an asset.

# PART E — PORTRAIT OVERLAY INTEGRATION HOOK

Overlay source branch:

`feature/castle-image-overlays-r1`

Known current branch HEAD at Director review:

`ca6325b5712d0b5e2a465169a3e88a798aa6c09e`

At least the actual 320×420 production SVG files exist on that branch.

Do not merge that branch wholesale.

Implement one centralized portrait renderer / state-to-overlay mapping so accepted overlays can be transplanted cleanly.

Expected states:

- normal TV contestant
- PATTC player
- Castle Five ally
- suspect
- hidden Traitor
- revealed Traitor
- eliminated
- Shield/protection
- murder danger
- Host

Layering contract:

1. room backdrop
2. real portrait / intentional fallback
3. overlay SVG
4. optional badge
5. live HTML name
6. live HTML role/status
7. parchment / controls

Do not bake names into images.

# PART F — MOBILE VISUAL CONSISTENCY

The whole proof must feel like one game.

Preserve/standardize:

- serif Castle headings
- same gold/bronze line language
- same smoky translucent panels
- same parchment family
- same small 2–5px architectural radii
- same button language
- same progress-dot treatment
- same portrait dimensions where practical
- room visible around portraits/parchment

Avoid:

- giant rounded cards
- bright generic blue app UI
- emoji fallbacks
- giant text blocks
- full-screen opaque panels hiding room art
- radically different typography by encounter

# PART G — DECISION SEALED

Use the upgraded compact direction:

`Decision`
`Sealed`

small realistic wax seal

`Your Prediction: ...`
`Your Decision: ...`

Keep the current room visible.

The card should be roughly 55–65% of the previous oversized envelope height.

Do not change the two-step confirm/save behavior.

# PART H — ROUND COMPLETE

After the last required encounter is sealed:

Do not throw the player back into an empty encounter screen.

Show a concise Castle-complete state:

`YOUR NIGHT IS SEALED`

Then supplied round/deadline status.

If settlement has not occurred, show a waiting state.

If next settled reveal is available, next Castle entry should start at the Previous Castle Reveal screen.

# PART I — FINAL THREE / ARMORY / FINALE SHELL

The Rules Alignment specialist owns calculation and APIs. This specialist owns mobile presentation/integration hooks.

When supplied state says the player is a finalist:

### Final Three

Show three authorized finalist portraits + authorized Jackpot.

### Armory

Render supplied token allowance/inventory and Murder Advantage inventory through the accepted special-card component when available.

Do not calculate prices/eligibility client-side as authority.

### Throne Room

After Armory is locked/authorized, enter the 10 supplied private Finale encounters.

Do not create Mask encounters in R1 Finale.

### Winner

Only show winner/Jackpot reveal when supplied state authorizes it.

# PART J — PROOF FLAG / REGRESSION PROTECTION

All new final presentation behavior must be gated by `castleProof=1`.

Add tests proving:

- no query flag → existing renderer path remains unchanged
- `castleProof=1` → new entrance/final-flow renderer enabled
- proof renderer consumes the same real Castle state/handlers
- no alternate scoring/routing/backend path is introduced

# PART K — TESTS

Create/update focused tests such as:

`tests/castle_mobile_final_gameplay_r1_tests.js`

Cover at minimum:

1. proof mode gating
2. default renderer unchanged without flag
3. entrance is first proof screen after Enter Castle
4. current settled episode selected by default
5. history is reverse chronological and dynamic
6. history uses supplied state, not hardcoded episodes
7. Jackpot uses supplied state
8. no fake event generation
9. secret murderer/attacker fields not rendered
10. CTA enters actual supplied active encounters
11. no API-per-history-selection if already loaded
12. no API/randomizer outcome selection
13. Decision Sealed compact treatment present
14. round-complete state after final encounter
15. Final Three/Armory/Finale shells render only from authorized supplied state
16. 360/390/430 mobile protections
17. no giant-radius regression
18. room remains visible around primary content

Continue to run existing Castle presentation tests as well.

Minimum gate:

`node tests/castle_duel_tests.js`

`node tests/castle_duel_r3_rules_tests.js`

`node tests/castle_mobile_presentation_r1_tests.js`

`node tests/castle_mobile_final_gameplay_r1_tests.js`

`node --check frontend/js/pages/castleDuelRevealR2.js`

`node --check frontend/js/pages/castleDuelRevealR2Swipe.js`

`node --check frontend/js/pages/castleDuelMobilePresentationR1.js`

plus any new proof module syntax checks

`git diff --check`

# PART L — LIVE REVIEW SCREENSHOTS

Return 390px screenshots of the REAL proof path for:

1. Grand Entrance / Previous Castle Reveal
2. Earlier Castle Reveals dropdown open
3. one historical episode selected
4. Step Into Tonight's Encounters CTA
5. real TV contestant reveal
6. real Human/PATTC encounter
7. Decision Sealed
8. Round Complete
9. Final Three shell if test state supports it
10. Armory shell if test state supports it

Also return one 360px and one 430px view.

# HANDOFF

Return:

- branch
- starting HEAD
- ending HEAD
- exact changed files
- new modules/components
- exact data fields consumed by Previous Castle Reveal/history
- exact missing backend fields, if any
- asset dependencies and source branch/HEAD
- tests and exact PASS/FAIL output
- screenshot paths
- privacy review
- mobile review
- known limitations

Confirm explicitly:

- no backend/game rules changed
- no scoring changed
- no routing changed
- default renderer unchanged without proof flag
- no production data changed
- no merge
- no deploy
