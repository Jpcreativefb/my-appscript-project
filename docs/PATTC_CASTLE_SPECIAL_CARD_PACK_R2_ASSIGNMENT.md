# PATTC SPECIALIST CONTINUATION — CASTLE SPECIAL ENCOUNTER CARD PACK R2

Continue on `feature/castle-special-card-pack-r1`.

Current branch HEAD before this assignment: `343530bd8455600a506310e44d21a371964b8c9b`.

Gameplay authority: `docs/PATTC_CASTLE_DUEL_CANONICAL_RULEBOOK_R2.md` on the Castle Director baseline.

Do not merge. Do not deploy. Do not touch backend, routing, scoring, settlement, production data, or `.clasp.json`.

This is NOT concept art. Deliver actual reusable presentation components/assets.

## Visual contract

Use the approved Castle style:

- realistic modern-manor rooms
- translucent charcoal/black presentation surfaces
- thin gold/bronze trim
- deep burgundy/crimson for danger
- elegant serif typography
- parchment where a written choice/decision is appropriate
- very small architectural radii, not rounded app cards
- no generic emoji
- no cartoon fantasy art
- no gore
- mobile-first at 360 / 390 / 430px

Approved room references already exist:

- Strategy: `frontend/assets/castle/rooms/strategy-chamber-modern.webp`
- Portrait: `portrait-gallery-modern.webp`
- Masked: `masked-hall-modern.webp`
- Traitor: `traitor-gallery-modern.webp`
- Murder/Fate: `murder-passage-modern.webp`
- Host: `host-study-modern.webp`
- Finale: `throne-room-modern.webp`

A separate overlay branch owns portrait-state SVGs. Special cards must accept those later and must not create a competing portrait geometry system.

## Required reusable component module

Create/finish a presentation-only module such as:

`frontend/js/pages/castleDuelSpecialCardsR1.js`

It may render sanitized supplied state, but MUST NOT:

- call Castle APIs
- call `castleCall_`
- call `fetch`
- call `google.script.run`
- choose/randomize outcomes
- determine attacker
- determine Fate result
- determine Host reward
- determine eligible targets
- determine winner

Backend/authoritative handlers remain outside this module.

## Required components

### 1. Traitor Guess

Room: Traitor Gallery.

Copy direction:

`A TRAITOR IS AFTER YOU`

`Which Traitor is hunting you tonight?`

Render 2–3 equal real known-Traitor portrait candidates from supplied state. All candidates must look equally plausible. No CSS/class/data/alt/src difference may reveal the predefined attacker. After local selection, show only selected-state styling; correctness is shown only after authorized backend response.

### 2. Correct Traitor reveal / Traitor Duel transition

After authorized `identityCorrect=true`, show a short reveal such as `YOU FOUND THEM`, then hand off to the normal duel presentation. Do not implement scoring.

### 3. Fate Game

Room: Murder Passage.

Render two visually identical sealed Fate cards before choice. No pre-choice difference may encode SAFE/MURDERED.

Authorized reveal states:

- SAFE → `YOU SURVIVED THE NIGHT`
- MURDERED → `THE TRAITOR STRUCK`

No gore. Do not reveal hidden attacker identity.

### 4. Single-known-Traitor Fate state

Show generic `A Traitor` / mystery silhouette only, then direct Fate. No name/image leak.

### 5. Masked Hall intro / wager

Room: Masked Hall.

Show wager before Accept/Decline. Distinct purple/black/silver masquerade presentation. No branch leak before authorized result.

### 6. Masked reveal transition

`THE MASK IS LIFTED`

Render only the branch supplied by state: Faithful / Traitor / Host / Murderer.

### 7. Masked Faithful

Show authorized contestant portrait and normal duel handoff.

### 8. Masked Traitor

Show authorized Traitor reveal, then Fate. No identity-guess step.

### 9. Host envelopes

Room: Host Study.

Three identical sealed envelopes before selection, distinguished only as 1/2/3 if needed. Do not encode GOLD / PROTECTION / MERCY before choice.

Authorized reveal treatments:

- GOLD → warm gold / Castle Bank reward
- PROTECTION → blue/gold / Life Restored or Secret Shield Gained according to supplied result
- MERCY → Banish Pressure Cleared

### 10. Murderer Card

Room: Murder Passage.

Dramatic black/burgundy/crimson card, elegant dagger/sword/wax-mark motif, no gore. Copy direction: `MURDERER CARD` / `CHOOSE A MARK`.

### 11. Murder target selection

Render only supplied eligible PATTC players, dynamically. Use portrait overlay hooks. Selected target gets thin red/gold treatment. Confirmation copy: `SEAL THE MARK`.

### 12. Human/PATTC encounter presentation

Room: Strategy Chamber. Use standard PATTC portrait overlay hook + normal duel parchment. No new gameplay.

### 13. Randomizer/reveal skin

Do not rewrite existing randomizer timing. Provide visual card skin compatible with TV contestant / PATTC player / Host / Mask / hidden silhouette. Final card must display supplied sealed match only.

### 14. Decision Sealed

Compact redesign:

`Decision`
`Sealed`

small realistic red wax seal

`Your Prediction: ...`
`Your Decision: ...`

Target roughly 55–65% of prior oversized envelope height. Mixed case. Small translucent navigation control. No giant block card.

### 15. Final Three intro

Room: Throne Room.

Show three supplied finalists + supplied Jackpot.

`THE FINAL THREE`

`Three remain. One will leave with the Castle Jackpot.`

This component displays finalists; it does not calculate qualification.

### 16. Finale Armory

Room: Throne Room.

Render supplied inventory/allowance for:

Token powers:
- CLUE
- DOUBLE
- SHIELD

Murder Advantages:
- BANISH
- RECRUIT

Show supplied cost / available / purchased / unavailable / remaining state. Do not calculate allowance or eligibility.

### 17. Winner / Jackpot reveal

Room: Throne Room.

Show supplied winner portrait/name and supplied Jackpot amount. Elegant formal reveal, no casino/confetti look.

## Production assets

Create only the reusable local assets genuinely needed under:

`frontend/assets/castle/special/`

Suggested items:

- `fate-card-sealed.svg`
- `fate-card-safe.svg`
- `fate-card-murdered.svg`
- `masked-hall-mask.svg`
- `host-envelope-sealed.svg`
- `host-gold.svg`
- `host-protection.svg`
- `host-mercy.svg`
- `murderer-card.svg`
- `traitor-choice-frame.svg`
- `decision-wax-seal.svg`
- `armory-clue.svg`
- `armory-double.svg`
- `armory-shield.svg`
- `armory-banish.svg`
- `armory-recruit.svg`
- `final-three-mark.svg`
- `castle-winner-mark.svg`

SVG preferred. No remote asset dependency.

## Sealed-state privacy contract

Before selection, Fate cards and Host envelopes must be visually and structurally identical. Never encode the answer/reward in filename, src, class, id, inline style, opacity, alt/title, data attributes, order, CSS variable, hidden text, or preloaded asset choice.

## Review gallery

Create:

`frontend/assets/castle/special/review/castle-special-card-review.html`

Show at minimum:

- Traitor Guess with 2 candidates
- Traitor Guess with 3 candidates
- Fate sealed / Safe / Murdered
- Masked intro / Faithful / Traitor
- Host envelopes + each reveal
- Murderer card / target selection
- Human encounter
- Randomizer final card
- Decision Sealed
- Final Three
- Finale Armory
- Winner / Jackpot

Everything should look like the same game.

## Tests

Create/update `tests/castle_special_card_pack_r2_tests.js` to verify:

- production assets/module exist
- no backend/API calls
- no outcome randomization
- identical sealed Fate/Host states
- no answer/reward leak
- dynamic Traitor candidate count
- dynamic murder target count
- no hardcoded production names
- no emoji production icons
- compact Decision Sealed structure
- Armory renders supplied state only
- mobile protections for 360/390/430
- small architectural radius contract

Run:

`node tests/castle_special_card_pack_r2_tests.js`

`node --check frontend/js/pages/castleDuelSpecialCardsR1.js`

`git diff --check`

## Handoff

Return branch, starting HEAD, ending HEAD, exact changed files, exact production assets, component API list, review-gallery path, screenshot paths, exact tests/results, privacy review, mobile review, dependencies/limitations.

Explicitly confirm: no backend, no scoring, no routing, no production data, no merge, no deploy.