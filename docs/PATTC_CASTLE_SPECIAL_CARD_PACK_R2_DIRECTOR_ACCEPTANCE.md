# PATTC DIRECTOR REVIEW — CASTLE SPECIAL ENCOUNTER CARD PACK R2

**Status: ACCEPTED FOR PRESENTATION-PROOF INTEGRATION**

Accepted specialist implementation HEAD:

`ff0060e8d9d6d156592999352672eec2b7c0ec54`

The visual-correction commit is accepted for integration into the Castle presentation proof.

## Accepted

- Existing `CastleSpecialEncounterCardsR2` component architecture remains unchanged.
- Sealed Fate and Host privacy contracts remain intact.
- Candidate/target lists remain state-driven.
- No backend/network/randomization authority was introduced.
- Special-card visual assets have been upgraded from placeholder line art to coordinated Castle/manor treatments.
- Fate, Masked Hall, Host, Murderer, Decision Sealed, Final Three, Armory, and Winner visual families are acceptable for the first integrated mobile proof.
- Existing approved room blobs and portrait/player frame hooks are present for review consistency.

## Important qualification

The specialist-supplied PNGs are review renders, not authoritative browser screenshots. This is **not** a reason to send the asset pack back again.

The final acceptance surface is the integrated `?castleProof=1` mobile game running in the real frontend. Any remaining visual corrections should now be made after seeing these accepted assets in context with the real room, portrait, overlay, parchment, navigation, and TEST state.

## Integration rule

Do not wholesale merge this specialist branch.

The Mobile Presentation specialist should transplant only the accepted Special Card R2 component/assets needed by the proof, preserving its current proof branch and existing approved modern-room/portrait systems.

Source implementation:

- `frontend/js/pages/castleDuelSpecialCardsR1.js`
- `frontend/assets/castle/special/**`

Do not duplicate room or overlay files when the destination branch already contains the identical approved assets.

## Next Director gate

After integration, provide real 390px browser screenshots / Preview evidence for:

1. Traitor Guess
2. Fate sealed
3. Fate Safe / Murdered
4. Masked Hall wager
5. Host envelopes
6. Murderer target selection
7. Decision Sealed
8. Final Three
9. Finale Armory

No merge. No production deploy.
