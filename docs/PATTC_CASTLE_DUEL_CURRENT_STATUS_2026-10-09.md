# PATTC CASTLE DUEL — CURRENT DIRECTOR STATUS

**Date:** 2026-10-09

## Rule authority

Gameplay rules are locked in:

`docs/PATTC_CASTLE_DUEL_CANONICAL_RULEBOOK_R2.md`

Status:

**PRODUCTION RULES LOCKED — IMPLEMENTATION / END-TO-END VALIDATION PENDING**

R2 supersedes R1 and the earlier decision brief wherever they differ.

## Key locked decisions

- 0 Castle lives removes a player from Castle Final Three/Jackpot eligibility; separate parallel-game participation remains available under that game's own rules.
- R1 Traitor Guess uses only TV-show Traitors currently known from aired episodes; one predefined attacker is secret.
- Correct attacker choice → Traitor Duel; wrong known-Traitor choice → Fate.
- One remaining known Traitor → `A Traitor` + direct Fate, no identity reveal.
- Banish and Murder are independent consequences; Banish resolves first, Murder then uses Shield or costs another life if the player still has lives.
- Castle Score, Castle Bank/Wallet, Castle Lives, and shared Castle Jackpot are separate ledgers/resources.
- +5 is Correct Read Bonus.
- Final Three always requires exactly three eligible players.
- Final Cut uses lives first, then average Castle Score, total Castle Score, correct reads, episodes completed, deterministic username fallback.
- Production season configuration must meet a 99% target probability of at least three eligible players at Final Cut via survival simulation.
- R1 Finale has 10 private non-Mask encounters per finalist.
- Finale scoring uses wrong-read=0 consistency and no regular-season Banish.
- Final Three qualifies first; finalists then enter a pre-Finale Armory.
- Token allowance comes from regular-season Castle Score; R1 costs remain CLUE=1, DOUBLE=1, SHIELD=2.
- Murder Credits separately unlock BANISH/RECRUIT Murder Advantages before Finale submissions.
- Castle Jackpot is the championship prize and does not determine qualification.
- Murder bonus is postgame/stat score only and cannot change the champion.
- Late entrants choose Castle Five from contestants active at join time.

## Rules alignment specialist — ACTIVE

Branch:

`fix/castle-production-rule-alignment-r1`

Assignment:

`docs/PATTC_CASTLE_DUEL_RULE_ALIGNMENT_ASSIGNMENT_R1.md`

Owns backend implementation/testing of R2, Final Three gate, Armory logic, Jackpot flow, survival simulator, and full-season rule validation.

No presentation redesign.

## Mobile final gameplay specialist — ACTIVE

Branch:

`feature/castle-presentation-proof-r1`

The Director fast-forwarded this branch from stale `4b7c597...` to the accepted modern-room mobile baseline:

`094888437ffff0528332b0420639c7c0d4b670e2`

Assignment committed on that branch:

`docs/PATTC_CASTLE_MOBILE_FINAL_GAMEPLAY_INTEGRATION_R1.md`

Owns the complete proof-mode mobile journey behind `?castleProof=1`:

- new Grand Entrance / Previous Castle Reveal opening screen
- Castle Jackpot display
- affected TV contestant/PATTC-player portraits
- life-loss / murder / shield event ledger
- Earlier Castle Reveals running history
- `STEP INTO TONIGHT'S ENCOUNTERS` CTA
- integration through actual encounter flow
- compact Decision Sealed
- round-complete state
- Final Three / Armory / Throne Room / Winner presentation shells using authorized supplied state
- hooks for approved overlay and special-card packs

Without `castleProof=1`, existing renderer must remain unchanged.

## Backdrop specialist — ACTIVE narrow continuation

Branch:

`feature/castle-realistic-room-backdrops-r1`

Approved existing room asset HEAD before continuation:

`3ec4591411cc37701af0f04181355ec41a6f1e40`

Assignment committed:

`docs/PATTC_CASTLE_GRAND_ENTRANCE_BACKDROP_R1.md`

Owns exactly one new production asset:

`frontend/assets/castle/rooms/grand-entrance-modern.webp`

Modern luxury-manor foyer/entrance, portrait/mobile geometry consistent with the existing room pack.

## Overlay specialist — ACTIVE narrow finalization

Branch:

`feature/castle-image-overlays-r1`

Verified asset HEAD before continuation:

`ca6325b5712d0b5e2a465169a3e88a798aa6c09e`

Director verified actual production SVGs are already present on this branch, including `portrait-normal.svg` and `portrait-hidden-traitor.svg`, using shared 320×420 / `0 0 320 420` geometry.

Assignment committed:

`docs/PATTC_CASTLE_OVERLAY_FINAL_HANDOFF_R1.md`

Do not rebuild the overlay pack. Remaining work is geometry/privacy verification, review/contact sheet, 360/390/430 review, and final branch handoff.

## Special Encounter Card specialist — ACTIVE R2 continuation

Branch:

`feature/castle-special-card-pack-r1`

Prior branch HEAD before R2 continuation:

`343530bd8455600a506310e44d21a371964b8c9b`

Assignment committed:

`docs/PATTC_CASTLE_SPECIAL_CARD_PACK_R2_ASSIGNMENT.md`

Owns actual reusable presentation components/assets for:

- Traitor Guess
- Fate
- Masked Hall
- Masked Faithful/Traitor transition
- Host envelopes/reveals
- Murderer Card / target selection
- Human encounter presentation hook
- randomizer visual skin
- Decision Sealed
- Final Three intro
- Finale Armory
- Winner / Jackpot reveal

No backend/gameplay/routing changes.

## Existing mobile presentation baseline

`feature/castle-mobile-presentation-r1`

Current verified remote HEAD:

`094888437ffff0528332b0420639c7c0d4b670e2`

This includes the approved modern room assets and room-registry wiring. It remains the protected known-good mobile presentation source while richer final integration happens in proof mode.

## Production state

Castle remains isolated from live PATTC production.

Do not merge/deploy specialist branches directly to production.

Do not deploy Apps Script or Cloudflare production during these specialist phases.

## Director next actions

1. Receive Rules Alignment specialist handoff and review actual backend/tests against R2.
2. Receive Grand Entrance backdrop asset.
3. Receive Overlay final review/handoff.
4. Receive Special Card Pack R2 handoff.
5. Receive Mobile Final Gameplay proof handoff/screenshots.
6. Transplant only accepted assets/components into the proof branch as needed; do not wholesale-merge specialist branches.
7. Run combined Castle focused tests and live TEST proof review at 360/390/430.
8. Only after the full mobile journey and R2 engine align, run the full-season E2E/survival gate.
9. Castle does not move toward PATTC production until the Director accepts those gates.
