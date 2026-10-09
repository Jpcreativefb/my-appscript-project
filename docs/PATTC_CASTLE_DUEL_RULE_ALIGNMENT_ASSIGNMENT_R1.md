# PATTC SPECIALIST ASSIGNMENT — CASTLE DUEL PRODUCTION RULE ALIGNMENT R1

## Director status

**IMPLEMENT THE LOCKED R2 RULEBOOK — DO NOT REDESIGN**

Branch:

`fix/castle-production-rule-alignment-r1`

Starting Director baseline:

`2ea79fe20845c5f6e95cb5f469772afbda6a6eb6`

Authoritative gameplay specification:

`docs/PATTC_CASTLE_DUEL_CANONICAL_RULEBOOK_R2.md`

Do not merge.
Do not deploy.
Do not modify production data.
Do not modify `.clasp.json`.
Do not change presentation/art except where player-facing rule labels/tests require a narrow change.

## Protected systems

Do not change unrelated PATTC games, Sports, Reality engines, Visual Studio, Home Hub, navigation, Apps Script routing, Cloudflare routing, or production deployments.

Primary backend owner:

`backend/engines/CastleDuelEngine.js`

Primary existing tests:

- `tests/castle_duel_tests.js`
- `tests/castle_duel_r3_rules_tests.js`

Add focused R2 tests rather than weakening existing contracts.

## Required implementation

Implement the R2 rulebook exactly.

### A. Economy separation

- `player.points` = Castle Score / leaderboard / qualification
- `player.wallet` = Castle Bank / wagers
- regular duel scoring changes Score only
- Mask/Host Bank transactions change Bank only unless R2 explicitly awards Score
- Host GOLD is Bank reward only in R2
- settlement replay must not duplicate either ledger

### B. Correct Read Bonus

- preserve locked +5 behavior
- stop treating the +5 as clue-dependent
- introduce clear internal/config naming while preserving safe migration/backward compatibility for existing Castle TEST config if needed
- wrong prediction remains 0 +1 Banish
- Alliance Bonus remains separate

### C. Known-TV-Traitor attacker flow

- R1 candidate list is intentionally the currently known TV Traitors, not Faithful decoys
- one attacker is predefined server-side and remains secret
- with 2+ known Traitors: player chooses which known Traitor is attacking
- correct predefined attacker → safe from that murder + Traitor Duel
- wrong known Traitor → Fate
- do not expose `traitorActualId` / attacker marker publicly

### D. One remaining known Traitor

- show only `A Traitor`
- skip identity-choice step
- go directly to Fate
- never expose contestant name/id/image before authorized reveal

### E. Banish + Murder independence

Settlement order:

1. Banish threshold life loss
2. if player still has lives, resolve Murder independently
3. Shield blocks Murder only
4. without Shield, Murder costs an additional life
5. lives never below 0
6. if Banish already reduced lives to 0, record attack/history as appropriate but do not consume Shield or subtract another life

### F. Zero-life Castle elimination

- 0 lives removes Castle Final Three/Jackpot eligibility
- Host cannot resurrect
- Castle engine must expose the eliminated state cleanly
- do not attempt to implement the separate parallel points game's rules here
- Castle elimination must not prevent unrelated PATTC game access

### G. Late-entry Castle Five

- new join must choose exactly five contestants active at that player's join episode
- reject already-eliminated contestants at join
- later contestant elimination does not rewrite/remove the stored Castle Five

### H. Final Cut / exactly-three gate

Add explicit `finalCutEpisode` configuration.

Eligibility at Final Cut:

- lives >= 1
- minimum episodes requirement satisfied

If exactly three eligible players remain before Final Cut:

- allow/require Final Three lock; no further regular Castle elimination round should open

If more than three at Final Cut, rank:

1. lives desc
2. average Castle Score / completed episode desc
3. total Castle Score desc
4. correct reads desc
5. episodes completed desc
6. username ascending only as final deterministic fallback

If fewer than three:

- block Finale
- do not resurrect
- do not run Final One/Two

### I. Finale R1 encounter rules

- exactly three finalists
- exactly ten private encounters each
- `finaleCounts.mask` must be 0 and config with Mask >0 must be rejected for R1
- no regular-season Banish in Finale

Finale scoring:

Normal/Faithful:
- wrong prediction = 0
- correct = base matrix + Correct Read Bonus
- Alliance Bonus when applicable

Traitor:
- wrong = 0 + Traitor hit
- correct = `max(10, base matrix * 2, 0)`

DOUBLE:
- only doubles otherwise valid positive earned points
- cannot rescue an incorrect read

If Finale life already lost:
- halve positive points after normal scoring/token modifiers

### J. Pre-Finale Armory

Final Three qualification must be frozen before Armory actions.

Token allowance:

`min(maxTokens, floor(max(0, Castle Score) / pointsPerToken))`

R1 defaults:
- pointsPerToken=100
- maxTokens=5

Purchases:
- CLUE = 1
- DOUBLE = 1
- SHIELD = 2

Requirements:
- buy/prepare before first Finale submission
- purchases survive reload
- no overspend
- no duplicate spend on retry
- CLUE/DOUBLE can later be assigned to eligible Finale encounters
- SHIELD maximum 1 active Finale Shield

Do not use Castle Bank for these purchases.

### K. Murder Advantages

Separate from tokens.

R1 defaults:
- creditsPerMurderAdvantage=2
- maxMurderAdvantages=2

Available:
- BANISH
- RECRUIT

They must be used/locked before any Finale encounter submission.

BANISH:
- replace one eligible Traitor Finale encounter with an eligible Faithful encounter

RECRUIT:
- add one eligible contestant to Castle Five/Alliance for Finale purposes, subject to current size/eligibility limits

### L. Jackpot / winner / murder bonus

- Jackpot never determines qualification
- locked Final Three compete for it
- winner receives Jackpot
- winner ranking: Finale Points, then Finale life state, then regular Castle Score
- postgame murder bonus is added only after winner selection
- postgame murder bonus cannot change champion
- replay cannot award Jackpot or murder bonus twice

### M. Survival simulation

Add a deterministic/testable Castle season survival simulator or test harness that can run many synthetic seasons using configurable:

- player count
- starting lives
- encounters
- maskChance
- hostChance
- humanChance
- Banish thresholds
- Shield availability
- Final Cut episode

The production readiness report must show whether a candidate configuration reaches the R2 target:

**>=99% probability of at least three eligible players at Final Cut.**

Do not hardcode production settings merely to make the simulation pass. Report the tested configurations/results.

## Required tests

Preserve all existing focused tests and add R2 tests covering at minimum:

1. Score vs Bank separation
2. Correct Read Bonus with/without ally
3. wrong read = 0 + Banish
4. 2–3 known Traitors candidate flow with predefined attacker
5. wrong known-Traitor guess → Fate
6. correct attacker guess → Traitor Duel + murder safety
7. one-known-Traitor direct Fate with no identity/image leak
8. Banish + Murder with Shield
9. Banish + Murder without Shield
10. Banish-only leaves Shield intact
11. 0-life Host cannot resurrect
12. late join rejects eliminated contestant
13. later cast elimination preserves Castle Five
14. Final Cut exactly three
15. Final Cut >3 ranking order
16. Final Cut <3 blocked
17. Finale Mask >0 rejected
18. 10 non-Mask Finale encounters per finalist
19. Finale normal correct/wrong scoring matrix
20. Finale Traitor correct/wrong
21. DOUBLE valid/invalid cases
22. no Finale Banish
23. Finale lost-life halving order
24. Armory token allowance
25. CLUE/DOUBLE/SHIELD purchase accounting and idempotency
26. Murder Advantage BANISH
27. Murder Advantage RECRUIT
28. advantages blocked after first Finale submission
29. winner tiebreak order
30. Jackpot award/reset idempotency
31. murder bonus applied after winner selection and only once
32. secret/private-field regression checks
33. survival simulator result report

## Test gate

Run at minimum:

`node tests/castle_duel_tests.js`

`node tests/castle_duel_r3_rules_tests.js`

new R2 focused tests

new season/E2E simulation tests

`node --check backend/engines/CastleDuelEngine.js`

`git diff --check`

Do not weaken an existing real scoring/privacy/idempotency contract to make the new work pass.

## Handoff

Return:

- branch
- starting SHA
- ending SHA
- exact changed files
- implementation summary by sections A–M
- exact test commands/results
- survival simulation configurations/results
- migrations/backward-compatibility notes for existing TEST data/config
- risks/open items

Do not merge.
Do not deploy.
