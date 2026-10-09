# PATTC CASTLE DUEL — CANONICAL RULEBOOK R2

**Date:** 2026-10-09
**Status:** PRODUCTION RULES LOCKED — IMPLEMENTATION/END-TO-END VALIDATION PENDING

This file is the gameplay authority for Castle Duel. It supersedes `PATTC_CASTLE_DUEL_CANONICAL_RULEBOOK_R1.md` and the earlier rule-decision brief wherever they differ.

The rules below are locked unless Joel explicitly approves a change. Presentation work may change appearance, pacing, art, layout, animation, typography, and responsive behavior, but may not redefine gameplay.

A production release is still blocked until backend/frontend implementation matches this rulebook and the required end-to-end season tests pass.

---

## 1. Core game concept

Castle Duel is a season-long Reality TV trust/prediction/survival game played alongside the configured TV season.

The Castle follows the TV show approximately one episode behind because Traitor membership can only be updated after the episode airs. Castle uses only currently known TV-show Traitors supplied by the configured season/admin role mapping.

Players:

- choose an original five-contestant Castle Five
- start with Castle lives
- play sealed encounters each episode
- predict the opponent action and choose their own action
- earn Castle Score
- maintain a separate spendable Castle Bank/Wallet
- face Banish pressure
- may be murdered by a TV Traitor or a human Murderer Card
- may receive Host rewards / protection
- may earn Murder Credits
- may qualify for the Final Three
- may buy/prepare Finale advantages before entering the Throne Room
- compete for the shared Castle Jackpot in the Final Three

The randomizer/spinner is theatrical presentation only. Encounter identity, role, answer, match ID, attacker, and result are frozen server-side when the round is opened.

---

## 2. The four Castle ledgers / resources

These are separate concepts and must be labeled distinctly in player-facing UI.

### Castle Score

`player.points`

- leaderboard / season performance
- qualification tiebreak metric for the Final Three
- source for Finale Token allowance
- not spendable

### Castle Bank / Wallet

`player.wallet`

- spendable wager balance
- used for Masked Hall wagers
- does not determine Final Three qualification
- regular duel scoring must not silently add/subtract Bank unless a rule explicitly says so

### Castle Lives

- survival / Final Three eligibility
- 0 lives means eliminated from the Castle championship / Jackpot competition
- a 0-life player may continue participating in the separately approved parallel points game under that game's own rules
- Castle elimination does not resurrect or restore Castle Final Three eligibility

### Castle Jackpot

Shared championship prize.

- increased by configured weekly contribution
- may also receive approved Masked Hall wager contributions
- does not determine who qualifies for the Final Three
- winner of the Castle Final Three receives the Jackpot

---

## 3. Join / Castle Five

A player joining Castle Duel must select exactly five distinct TV contestants.

For a late entrant:

- the five must be active contestants at the time the player joins
- already-eliminated TV contestants cannot be newly selected
- once selected, the player's Castle Five remains stored even if those contestants are later eliminated

Castle Five does not mean those contestants are Faithful. It is the player's alliance/trusted-circle mechanic.

---

## 4. Regular episode order

Canonical order:

1. Previous episode is settled.
2. Admin opens the next Castle episode with a future lock deadline.
3. Backend freezes all encounter identities, roles, answers, wagers, and special branches for that round.
4. Player opens Castle Duel and sees the prior public result/announcement if applicable.
5. Encounter 1 is theatrically revealed.
6. Player completes the exact branch required by that encounter.
7. Player seals the encounter.
8. Continue through the configured encounter count.
9. At deadline, submissions lock.
10. Admin settles the episode once.
11. Duel scoring is calculated.
12. Incorrect-read Banish is added.
13. Missed-episode state is determined.
14. Banish threshold loss is resolved.
15. Murder consequences are resolved independently.
16. Eligible Banish recovery is applied.
17. Results are persisted.
18. The next episode may reveal the prior public announcement.

Settlement must be idempotent.

---

## 5. Normal trust duel

For a normal TV/Human/Faithful encounter the player does two things:

1. predict opponent action: COOPERATE or BETRAY
2. choose own action: COOPERATE or BETRAY

Base matrix:

- COOPERATE / COOPERATE = +20
- BETRAY / COOPERATE = +30
- COOPERATE / BETRAY = 0
- BETRAY / BETRAY = -10

Prediction rule:

- wrong prediction = 0 encounter points +1 Banish
- correct prediction = base matrix + Correct Read Bonus
- correct allied/Castle-Five encounter also receives the configured Alliance Bonus

### Correct Read Bonus

Current R1 locked value: **+5**.

This replaces the misleading term `bonusClue`. A clue is information; the +5 is earned for a correct read whether or not a clue was shown.

---

## 6. Banish pressure

Banish is separate from Murder.

Regular-season thresholds:

- Episodes 1–3: 5
- Episodes 4–6: 4
- Episodes 7–9: 3
- Episode 10+: 2

When the threshold is reached at settlement:

1. lose 1 Castle life
2. Secret Shield cannot block Banish
3. Banish resets to 0

If the player survives the episode and did not trigger a Banish life loss, existing Banish pressure recovers by 1, down to 0.

---

## 7. Banish and Murder in the same episode

They are independent consequences.

Resolve in this order:

1. Banish threshold consequence first: lose 1 life, Shield untouched.
2. If the player still has at least 1 life, resolve Murder.
3. If a Secret Shield exists, consume the Shield and block the Murder life loss.
4. Otherwise lose 1 additional life.
5. Lives never go below 0.

Therefore a player with enough lives can lose two lives in one settlement from Banish + Murder.

If Banish already reduces the player to 0 lives, the player is eliminated; record the murder attempt/source if needed for history, but do not consume a Shield or reduce lives below 0.

---

## 8. Missed episode

A player who makes no qualifying participation in the round receives the existing missed-episode attack/life-loss consequence.

A Shield does not protect the missed-episode penalty.

Missed-episode behavior remains distinct from Banish and Murder and must be tested with combined conditions before production.

---

## 9. TV Traitor encounter — known-Traitor model

R1 Castle uses only **actual currently known TV-show Traitors**.

Castle follows the show approximately one episode behind; admin/season role mapping is updated only after the TV episode has established a Traitor/recruitment/change.

When a Traitor encounter is generated, the backend secretly predefines which currently known Traitor is attacking that player.

### When 2 or more known Traitors remain

The screen shows the currently known Traitors (normally 2–3).

The player answers:

**Which Traitor is after you?**

- choosing the predefined attacker = correct identity guess
- choosing another real known Traitor = wrong identity guess

Correct identity guess:

1. player is safe from that Traitor's murder for this encounter
2. attacker may be revealed as authorized for that player
3. proceed to the regular Traitor Duel

Wrong identity guess:

1. actual attacker remains hidden
2. proceed to the sealed Fate game

R1 does **not** use Faithful decoys/suspect pools. A broader suspect-pool mode may be designed later as an optional future feature.

### When only 1 known Traitor remains

Do not reveal the identity in the encounter UI.

- display only `A Traitor`
- skip the identity-choice step
- proceed directly to Fate

---

## 10. Traitor Duel

After a correct identity guess, the player completes the normal prediction + own-decision duel.

Scoring:

- wrong action prediction = 0 +1 Banish
- correct prediction = `max(10, base matrix × 2, 0)`
- murder safety from the correct identity guess remains in force for that encounter

---

## 11. Traitor Fate game

Used when:

- the player picked the wrong known Traitor, or
- only one known Traitor remains and identity is skipped

Player chooses one of two sealed Fate cards.

Result is server-predefined:

- SAFE
- MURDERED

If MURDERED, the encounter creates a TV murder attempt for settlement.

Secret Shield can protect the murder at settlement.

The safe slot / answer must never leak through DOM, classes, alt text, hidden fields, image URLs, preloaded assets, or client state.

---

## 12. Human encounter

A Human encounter pairs two PATTC players for the same encounter position when generated.

Each player predicts the other's final action and chooses their own action.

If the counterpart did not lock a choice, the existing Castle Guard substitute behavior may be used for settlement.

Human opponent identity is not secret.

---

## 13. Masked Hall

Player sees the sealed wager before accepting.

Player may:

- DECLINE
- ACCEPT

Decline:

- wager is not charged
- encounter ends with no special branch reward

Accept:

1. wager is deducted from Castle Bank once
2. approved portion contributes to Jackpot under configured rule (current regular-season behavior: half the accepted wager)
3. one available server-selected branch is revealed

Regular-season branches:

- FAITHFUL
- TRAITOR
- HOST
- MURDERER

The result is selected server-side after acceptance and may not be rerolled by refresh/retry.

---

## 14. Masked Faithful branch

Player completes a normal prediction + own-decision duel against the revealed Faithful.

Score follows normal duel rules.

Any Bank return/reward must follow the implementation-alignment specification and remain separate from Castle Score.

---

## 15. Masked Traitor branch

No identity guessing.

Proceed directly to the two-card Fate game.

SAFE / MURDERED result is predefined server-side and follows normal Secret Shield murder protection at settlement.

---

## 16. Masked Host branch

Player chooses one of three sealed Host envelopes prepared server-side:

- GOLD
- PROTECTION
- MERCY

Locked R1 effects:

- GOLD: Castle Bank reward only; does not directly alter qualification Score unless a later explicit rule change is approved
- PROTECTION: if below starting-life cap and still alive, restore 1 life; otherwise grant/upgrade to a Secret Shield up to configured limit
- MERCY: reset Banish pressure to 0

Host cannot resurrect a player already at 0 Castle lives.

---

## 17. Masked Murderer branch

Player receives a Murderer Card and must target a different eligible active PATTC player before the round settles.

- target identity is private until authorized reveal
- murderer identity remains secret until the postgame/finale reveal rule permits it
- if unresolved by settlement, backend may use the approved auto-resolution fallback
- successful human murder may earn Murder Credit

---

## 18. Secret Shield

Secret Shield protects against Murder only.

It does not protect against:

- Banish life loss
- missed-episode penalty

If both Banish and Murder hit in the same settlement, Banish resolves first and Murder then consumes the Shield if the player still has lives.

---

## 19. Zero lives / elimination

At 0 Castle lives:

- player is eliminated from Castle championship / Final Three / Jackpot eligibility
- Castle lives cannot go negative
- Host cannot resurrect them
- they may continue the separately approved parallel points game under that game's own rules
- their Castle history/results remain visible

Whether the parallel game reuses any Castle UI or choices is an integration concern for that separate game and must not alter Castle eligibility.

---

## 20. Final Three qualification gate

The Castle Finale is always a **Final Three**.

### Eligibility

At the Final Cut, a player must:

- have at least 1 Castle life
- meet the configured minimum episode participation requirement

### Early automatic Final Three lock

If exactly three eligible players remain before the configured Final Cut episode, those three are locked as finalists and no further regular Castle elimination round should be opened.

### Final Cut with more than three eligible players

Rank eligible players in this order:

1. most remaining Castle lives
2. highest average Castle Score per completed episode
3. highest total Castle Score
4. most correct reads
5. most episodes completed
6. deterministic final fallback: username ascending, used only if all gameplay metrics above are exactly tied

Take the top three.

### Fewer than three eligible players

Do not silently run a Final One/Two and do not resurrect eliminated players.

The Finale must not open. Admin must correct season/configuration state before proceeding.

### Production balancing requirement

Before a real season launches, starting lives + Final Cut timing + configured murder/mask/human probabilities must pass a survival simulation showing at least a **99% target probability of 3 or more eligible players** at the Final Cut.

`finalCutEpisode` must become an explicit Castle configuration value for production.

---

## 21. Jackpot and the Final Three

The shared Castle Jackpot is the championship prize.

- Jackpot does not qualify a player
- only the locked Final Three compete for it
- Castle elimination before qualification removes Jackpot eligibility
- winner of the settled Finale receives the Jackpot
- Jackpot is then reset according to existing completion behavior

---

## 22. Finale structure

R1 Finale:

- exactly 3 finalists
- 10 private encounters per finalist
- finalists do not face one another
- no early stop because one player loses a Finale life
- Finale Mask encounter count is locked to **0** for R1
- all finale choices remain private until authorized reveal/settlement

Former-player slots may continue using the approved Castle Guard/fallback behavior unless separately redesigned.

---

## 23. Pre-Finale Armory / Finale Shop

After Final Three qualification is frozen and before a finalist submits any Finale encounter, each finalist enters the **Finale Armory**.

This is the locked version of the previously discussed ability to buy/prepare advantages before entering the Finale.

### Finale Token allowance

Regular-season Castle Score creates a token allowance using the configured conversion.

Current R1 defaults remain:

- `pointsPerToken = 100`
- `maxTokens = 5`

Formula:

`min(maxTokens, floor(max(0, Castle Score) / pointsPerToken))`

Tokens are an allowance to spend in the Armory; they are not Castle Bank currency.

### Token purchases

Current R1 costs:

- CLUE = 1 token
- DOUBLE = 1 token
- SHIELD = 2 tokens

SHIELD maximum: 1 active Finale Shield.

Unspent tokens have no Jackpot value/refund unless later explicitly approved.

### Purchased item use

- CLUE and DOUBLE are bought before entering the Finale and may then be assigned to eligible Finale encounters according to UI/backend restrictions
- SHIELD activates Finale protection
- one encounter may not receive conflicting/duplicate power use beyond the locked token rules

The implementation must prevent spending more tokens than the frozen allowance and must be idempotent across reload/retry.

---

## 24. Murder Advantages in the Armory

Murder Credits are separate from Finale Tokens.

Current R1 conversion remains:

- `creditsPerMurderAdvantage = 2`
- `maxMurderAdvantages = 2`

Available powers:

### BANISH

Before any Finale encounter is submitted, replace one eligible Traitor encounter with an eligible Faithful encounter.

### RECRUIT

Before any Finale encounter is submitted, add one eligible contestant to the player's Castle Five/Alliance for Finale purposes, subject to the existing alliance-size limit and eligibility checks.

Murder Advantages must be used/locked before the finalist begins submitting Finale encounters.

---

## 25. Finale scoring

There is no regular-season Banish accumulation in the Finale.

### Faithful / normal Finale encounter

- wrong prediction = 0
- correct prediction = base matrix + Correct Read Bonus
- correct allied encounter also receives Alliance Bonus

### Traitor Finale encounter

- wrong prediction = 0 and counts as a Traitor hit
- correct prediction = `max(10, base matrix × 2, 0)`

### DOUBLE

DOUBLE applies only to an otherwise valid positive earned score after correctness is established.

It cannot turn an incorrect read into points.

### Finale life state

If a finalist has already lost their Finale life, positive encounter points are halved after normal score/token modifiers.

---

## 26. Finale winner

After all Finale encounters settle, rank finalists by:

1. highest Finale Points
2. remaining Finale life state
3. highest regular-season Castle Score

Winner receives the Castle Jackpot.

Settlement must be idempotent.

---

## 27. Murder Credits / postgame bonus

Murder Credits affect the championship through Murder Advantages before/during the Finale Armory.

The configured postgame `murderBonus` is a season/stat score award only.

It is applied **after** the Finale winner has been selected and must not recalculate or change the Castle champion.

It must not be awarded twice on settlement replay.

---

## 28. Privacy / secrecy contract

Never expose before authorization:

- bot answer/action
- predefined Traitor attacker
- Fate safe slot
- Host envelope contents before choice
- Murderer identity
- Murder target to unrelated players
- hidden Traitor identity when only `A Traitor` is allowed
- future encounter draws
- unearned reward contents

Privacy applies to:

- API JSON
- DOM
- alt text
- hidden inputs
- data attributes
- CSS URLs
- preloaded images
- client-side state
- logs sent to ordinary players

The known-Traitor candidate list in R1 is intentionally the set of Traitors already known from the aired TV show. Candidate membership is not secret; which one is the predefined attacker is secret.

---

## 29. Visual/presentation contract

Presentation may use:

- realistic room backdrops
- spinner/randomizer motion profiles
- portrait overlays
- parchment
- special encounter cards
- dramatic copy

But presentation may never:

- select a different opponent
- reroll a branch
- change scoring
- expose private identity/results
- create a gameplay option the backend does not authorize

The sealed backend match remains authoritative.

---

## 30. Required implementation alignment before production

The current code must be changed/tested to match this R2 rulebook in at least these areas:

1. separate Castle Score from Castle Bank effects
2. rename/implement Correct Read Bonus semantics
3. known-Traitor candidate/attacker behavior exactly as specified
4. single-known-Traitor direct Fate without identity leak
5. independent Banish + Murder settlement
6. 0-life championship elimination while preserving external parallel-game participation
7. active-cast validation for late-entry Castle Five
8. exact Final Three gate / `finalCutEpisode`
9. require exactly three finalists
10. Finale Mask count locked to 0
11. Finale scoring table
12. pre-Finale Armory purchase/inventory flow
13. Murder Advantages locked before Finale submissions
14. Jackpot winner flow
15. murder bonus remains postgame/non-championship

---

## 31. Required end-to-end production test gate

A production candidate must prove a complete season path, not just focused unit tests.

Required scenarios include:

- join + five active Castle Five contestants
- late-entry join validation
- round freeze / no reroll
- Human pairing
- all four normal matrix outcomes
- correct/wrong prediction behavior
- Correct Read Bonus
- Alliance Bonus
- Banish bands 5/4/3/2
- Banish recovery
- missed episode
- TV Traitor correct identity
- TV Traitor wrong known-Traitor identity
- one-known-Traitor direct Fate
- Fate SAFE and MURDERED
- Mask decline
- Mask Faithful
- Mask Traitor
- Mask Host GOLD/PROTECTION/MERCY
- Mask Murderer target
- human murder
- TV murder
- Shield block
- Banish + Murder with Shield
- Banish + Murder without Shield
- 0-life championship elimination
- Final Cut with exactly 3
- Final Cut with >3 ranking
- Final Cut with <3 block
- Finale exactly 10 non-Mask encounters per finalist
- Armory token allowance
- CLUE purchase/use
- DOUBLE purchase/use
- SHIELD purchase/use
- Murder Advantage BANISH
- Murder Advantage RECRUIT
- all Finale scoring correctness cases
- Finale life-loss halving
- winner tiebreak order
- Jackpot award/reset
- postgame murder bonus after winner selection
- settlement replay/idempotency
- privacy checks for every secret state

Before a season configuration is approved, run the survival simulation and verify the chosen starting lives / Final Cut / probability settings meet the 99% Final-Three-availability target.

---

## 32. Change-control rule

Any future gameplay change requires:

1. Joel approval
2. update to this canonical rulebook
3. focused regression tests
4. end-to-end test impact review
5. player-facing How To / Rules update
6. Director status/handoff update

If code, UI, concept art, or a specialist handoff conflicts with this rulebook, the implementation is wrong until Joel explicitly changes the rule.
