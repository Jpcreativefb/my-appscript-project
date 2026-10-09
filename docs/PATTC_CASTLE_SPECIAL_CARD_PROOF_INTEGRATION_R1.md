# PATTC DIRECTOR ASSIGNMENT — INTEGRATE ACCEPTED SPECIAL CARD PACK INTO PROOF

## Status

**INTEGRATE NOW — DO NOT WAIT FOR FINAL BACKEND OR GRAND ENTRANCE ART**

Destination branch:

`feature/castle-presentation-proof-r1`

Accepted Special Card source implementation:

`ff0060e8d9d6d156592999352672eec2b7c0ec54`

Source branch:

`feature/castle-special-card-pack-r1`

Director acceptance is recorded in:

`docs/PATTC_CASTLE_SPECIAL_CARD_PACK_R2_DIRECTOR_ACCEPTANCE.md`

## Required transplant

Bring only the accepted proof-integration pieces from the Special Card source:

- `frontend/js/pages/castleDuelSpecialCardsR1.js`
- `frontend/assets/castle/special/**`

Do not wholesale merge the specialist branch.

Do not duplicate room or overlay assets if identical approved files already exist in this proof branch.

## Wiring

Wire the accepted Special Card renderers into the existing `?castleProof=1` flow for the matching authorized states:

- Traitor Guess
- correct-Traitor reveal
- wrong-Traitor / Fate
- single-known-Traitor Fate
- Masked Hall wager
- Masked Faithful
- Masked Traitor
- Host sealed/reveal
- Murderer Card
- murder target selection
- Human encounter hook
- Decision Sealed
- Final Three
- Finale Armory
- Winner / Jackpot

Existing backend/state/handlers remain authoritative. The special-card module is presentation only.

## Do not change

- scoring
- encounter selection
- sealed outcomes
- backend
- API routing
- Cloudflare routing
- production data
- R2 rules

## Immediate visual checkpoint

After wiring, stop and return a visual checkpoint before polishing anything else.

Required real-browser 390px screenshots or Preview evidence:

1. Grand Entrance / Previous Castle Reveal
2. normal contestant encounter
3. Traitor Guess
4. Fate sealed
5. Fate result
6. Masked Hall
7. Host envelopes
8. Murderer target selection
9. Decision Sealed
10. Final Three
11. Finale Armory
12. Throne Room / Winner if authorized by available TEST state

Also return:

- 360px entrance
- 430px encounter
- exact branch HEAD
- changed files
- exact test results
- Preview URL with `?castleProof=1` if available
- clear list of any screens still using presentation-shell data because R2 backend fields are not yet available

No merge. No production deploy.
