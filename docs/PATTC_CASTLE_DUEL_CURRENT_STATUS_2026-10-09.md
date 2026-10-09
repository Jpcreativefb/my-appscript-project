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

The proof branch was brought forward to the accepted modern-room mobile baseline and is the integration/proof owner.

Assignment:

`docs/PATTC_CASTLE_MOBILE_FINAL_GAMEPLAY_INTEGRATION_R1.md`

Owns the complete proof-mode mobile journey behind `?castleProof=1`:

- Grand Entrance / Previous Castle Reveal opening screen
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

Without `castleProof=1`, existing renderer remains unchanged.

## Backdrop asset status — ACCEPTED / ALREADY DISTRIBUTED

Source branch:

`feature/castle-realistic-room-backdrops-r1`

Approved production asset commit:

`3ec4591411cc37701af0f04181355ec41a6f1e40`

The seven approved WebP room assets are complete and were already transplanted/wired into the accepted mobile-presentation line. They are not waiting on another review pass.

Accepted files:

- `frontend/assets/castle/rooms/strategy-chamber-modern.webp`
- `frontend/assets/castle/rooms/portrait-gallery-modern.webp`
- `frontend/assets/castle/rooms/masked-hall-modern.webp`
- `frontend/assets/castle/rooms/traitor-gallery-modern.webp`
- `frontend/assets/castle/rooms/murder-passage-modern.webp`
- `frontend/assets/castle/rooms/host-study-modern.webp`
- `frontend/assets/castle/rooms/throne-room-modern.webp`

The accepted mobile-presentation branch at `094888437ffff0528332b0420639c7c0d4b670e2` references those exact modern WebPs in the room registry.

Do NOT ask the backdrop specialist to recreate or recommit these seven rooms.

The only new backdrop request is the separately assigned **Grand Entrance** asset for the new Previous Castle Reveal opening screen:

`frontend/assets/castle/rooms/grand-entrance-modern.webp`

That new asset is additive and is not a correction to the approved seven-room pack.

## Overlay asset status — ACCEPTED FOR PROOF INTEGRATION

Source branch:

`feature/castle-image-overlays-r1`

Production asset commit:

`ca6325b5712d0b5e2a465169a3e88a798aa6c09e`

The Director verified the actual reusable production SVG files are present. The main portrait assets use shared `320×420` / `viewBox="0 0 320 420"` geometry, and the hidden-Traitor overlay is generic/non-identifying.

Main assets accepted for proof use:

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

The source branch also contains reusable supporting overlay/badge assets and `review-gallery.svg`.

Do NOT ask the overlay specialist to rebuild the production pack. Future overlay-specialist work, if any, is limited to refinements discovered by actual proof/mobile review.

The approved main overlay assets have been selected for transplant into `feature/castle-presentation-proof-r1` so the Mobile specialist can wire them into real proof-mode gameplay.

## Special Encounter Card specialist — ACTIVE R2 continuation

Branch:

`feature/castle-special-card-pack-r1`

Owns actual reusable presentation components/assets for Traitor Guess, Fate, Masked Hall, Host envelopes, Murderer, Decision Sealed, Final Three, Armory and Winner/Jackpot presentation, while obeying the locked R2 gameplay contract.

No backend/scoring/routing changes.

## Director integration order

1. Keep the accepted seven modern room backdrops as-is.
2. Use the accepted portrait overlay SVG pack in proof mode; do not restart overlay creation.
3. Receive the one new Grand Entrance backdrop.
4. Receive the Special Encounter Card R2 component pack.
5. Receive Rules Alignment R2 backend/test handoff.
6. Assemble/review all pieces in `feature/castle-presentation-proof-r1` with real TEST state.
7. Run mobile live review at 360/390/430.
8. Run complete Castle season E2E/privacy gate.
9. Only after acceptance plan transplant to the then-current PATTC Director baseline.

Do not merge/deploy specialist branches directly to production.
