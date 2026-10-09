# PATTC CASTLE DUEL — CURRENT DIRECTOR STATUS

**Date:** 2026-10-09

## Rule authority

Gameplay rules are now locked in:

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
- Final Three qualifies first; then finalists enter a pre-Finale Armory.
- Token allowance comes from regular-season Castle Score; R1 costs remain CLUE=1, DOUBLE=1, SHIELD=2.
- Murder Credits separately unlock BANISH/RECRUIT Murder Advantages before Finale submissions.
- Castle Jackpot is the championship prize and does not determine qualification.
- Murder bonus is postgame/stat score only and cannot change the champion.
- Late entrants choose Castle Five from contestants active at join time.

## Implementation still required

Current Castle engine does not yet fully match R2. Production is blocked until a rules-alignment specialist corrects and tests at least:

1. Score vs Bank separation
2. Correct Read Bonus naming/behavior
3. known-Traitor attacker flow
4. one-Traitor direct Fate privacy
5. independent Banish + Murder settlement
6. 0-life Castle championship elimination handling
7. late-entry active-cast Castle Five validation
8. Final Cut / exactly-three finalist gate
9. Finale Mask=0 enforcement
10. Finale scoring table
11. pre-Finale Armory purchase/inventory flow
12. Murder Advantage pre-Finale lock
13. Jackpot winner flow
14. postgame murder bonus ordering/idempotency
15. survival simulator and full-season E2E test matrix

## Presentation work

Presentation/backdrop/overlay work remains separate. Visual specialists must implement R2 rather than redefine gameplay.

Important active branches still include:

- `feature/castle-mobile-presentation-r1`
- `feature/castle-presentation-proof-r1`
- `feature/castle-realistic-room-backdrops-r1`
- `feature/castle-image-overlays-r1`
- `feature/castle-special-card-pack-r1`

Do not merge/deploy specialist branches directly to production.

## Next Director action

Use a dedicated rules-alignment branch from the current Castle Director baseline. Implement R2 backend/tests first, then run the full-season TEST gate before declaring Castle gameplay production-ready.
