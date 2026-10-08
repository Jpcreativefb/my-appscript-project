# PATTC CASTLE DUEL — RULE DECISION BRIEF R1

**Date:** 2026-10-08
**Purpose:** Resolve the 11 remaining pre-production Castle Duel rule blockers before promoting the canonical rulebook to **PRODUCTION LOCKED**.

Each item below states the current implementation, the recommended locked rule, the player-facing effect, and the exact regression test required.

---

## 1. Players at 0 lives still receiving regular encounters

**Current implementation**  
`apiAdminCastleDuelOpenRound()` includes all players whose `joinedRound <= number`; it does not currently exclude `lives <= 0`.

**Locked recommendation**  
A player at **0 lives is eliminated from regular Castle play** and receives **no new regular-season encounters**. Their historical results remain visible, and they may still appear in postgame/history views, but they do not re-enter regular play unless a future explicit resurrection rule is separately approved.

**Player-facing effect**  
Elimination becomes final and understandable. A player who loses their last life will not unexpectedly receive the next episode's rooms.

**Exact test required**  
Create three players, set one player's lives to 0 before opening the next regular episode, open the episode, and assert:
- eliminated player receives `0` matches
- active players each receive configured encounter count
- eliminated player remains present in standings/history
- Host reward logic cannot resurrect the eliminated player

---

## 2. Traitor candidate list currently exposes real Traitors

**Current implementation**  
`cdPrepareTraitorMatch_()` builds `traitorCandidates` from contestants whose effective role is actually `TRAITOR`, so the candidate list itself can reveal hidden-role information.

**Locked recommendation**  
The Traitor Guess screen must receive a **backend-authorized suspect pool**, not a list of actual Traitors. The pool must contain the real attacker plus plausible active contestant decoys. Candidate membership must never imply role truth. The backend keeps the actual attacker ID private and compares the submitted guess server-side.

**Player-facing effect**  
The guess is a real deduction choice instead of a disguised reveal of who the Traitors are.

**Exact test required**  
With at least two hidden Traitors and several active Faithfuls:
- create a Traitor encounter
- assert suspect pool contains the real attacker
- assert suspect pool also contains at least one non-Traitor decoy when eligible decoys exist
- assert public state contains no field identifying which candidate is the real attacker
- submit every candidate in separate fixtures and verify only the actual attacker produces `identityCorrect=true`

---

## 3. Last remaining Traitor is currently revealed automatically

**Current implementation**  
When only one active Traitor remains, `cdPrepareTraitorMatch_()` sets the encounter directly to Fate and sets `identityRevealed=true`; public rendering can therefore expose that contestant before the player makes any deduction.

**Locked recommendation**  
The **last remaining Traitor stays hidden**. When only one remains, skip the identity-guess step but present the attacker only as **`A Traitor`** and move directly to sealed Fate. Do not reveal the identity until an authorized later reveal/settlement rule explicitly permits it.

**Player-facing effect**  
Players do not receive a free role reveal simply because the season is down to one Traitor.

**Exact test required**  
Configure exactly one active hidden Traitor and create a Traitor encounter. Assert:
- status goes to Fate without an identity-guess step
- public opponent is `A Traitor`
- no contestant ID, name, image URL, alt text, candidate marker, or hidden DOM/client field exposes the identity
- resolving Fate still does not reveal identity early

---

## 4. Banish + Murder in the same episode currently resolves as one consequence

**Current implementation**  
During settlement, if `banishHit` is true, the code applies the Banish life loss first and does not separately consume a Shield or apply a second murder loss for the same episode.

**Locked recommendation**  
**Banish and Murder are independent consequences.** Resolve them in this order:
1. Banish threshold loss: lose 1 life; Shield cannot prevent it.
2. Murder attempt: Secret Shield blocks the murder if available; otherwise lose 1 additional life.

A player can therefore lose two lives in one episode if both occur and no Shield protects the murder.

**Player-facing effect**  
The player can clearly understand that Banish pressure and assassination are separate dangers.

**Exact test required**  
Three fixtures:
- lives=3, shield=1, Banish threshold reached + murder attack → final lives=2, shield=0
- lives=3, shield=0, Banish threshold reached + murder attack → final lives=1
- lives=3, shield=1, Banish only → final lives=2, shield=1

Also assert settlement announcement/source identifies both consequences without revealing a secret murderer.

---

## 5. Wallet and standings points are currently mixed inconsistently

**Current implementation**  
Regular duel points can alter both `wallet` and `points`, while Mask branches separately deduct/return wagers and sometimes add score. The two values therefore act partly like one currency and partly like separate systems.

**Locked recommendation**  
Make them explicitly separate:
- **Score / Castle Score (`player.points`)** = leaderboard/season performance
- **Wallet / Castle Bank (`player.wallet`)** = spendable wager balance

Regular encounter scoring changes **Score only**. Wagers/rewards change **Wallet only**, except a reward explicitly defined as score (for example Gold if approved as a score award). Player-facing labels must use distinct names.

**Player-facing effect**  
Players can immediately tell what they are risking versus what determines standings.

**Exact test required**  
Run a sequence covering:
- normal duel win/loss: score changes, wallet unchanged
- Mask accept: wallet decreases by wager, score unchanged at acceptance
- Faithful Mask success: wallet return/reward follows rule, encounter score updates only by explicit duel score
- Host Gold: assert exactly which ledger changes according to the final approved Gold definition
- settlement replay remains idempotent for both ledgers

---

## 6. The current +5 `bonusClue` is awarded on every correct read

**Current implementation**  
`cdSettleDuel_()` adds `c.bonusClue` whenever the prediction is correct, even if the player never received a clue.

**Locked recommendation**  
Preserve the current scoring behavior but rename it conceptually to **Correct Read Bonus: +5**. A clue is information, not the source of the +5. Castle Five/ally success keeps its separate alliance bonus.

**Player-facing effect**  
Scoring copy becomes truthful: every correct prediction earns the +5 read bonus, whether or not a clue appeared.

**Exact test required**  
Assert:
- correct non-allied encounter with no clue = base matrix score +5
- wrong read = 0 +1 Banish, no +5
- correct allied encounter = base matrix score +5 + alliance bonus
- config/UI no longer describe the +5 as requiring a clue

---

## 7. Finale can currently open with fewer than three eligible players

**Current implementation**  
`apiAdminCastleDuelOpenFinale()` sorts eligible players, takes `.slice(0,3)`, and only asserts that at least one finalist exists.

**Locked recommendation**  
The game has a true **Final Three**. The Finale may not open unless **exactly three eligible finalists** can be selected. If fewer than three qualify, admin must resolve eligibility/season state before opening the Finale; there is no silent Final One/Two fallback in R1.

**Player-facing effect**  
The advertised Final Three always means three players.

**Exact test required**  
- 2 eligible players → opening Finale throws/returns clear error and phase remains REGULAR
- 3 eligible players → Finale opens with exactly 3 unique finalists
- 4+ eligible players → top 3 are chosen by the documented lives/average-points ranking rule

---

## 8. Finale scoring currently differs from regular duel scoring

**Current implementation**  
In Finale settlement, a wrong Faithful read can still receive the base cooperate/betray matrix result; regular-season wrong reads instead score 0. Traitor Finale encounters have their own hit logic.

**Locked recommendation**  
Use one clear Finale table:
- **Faithful/normal encounter:** wrong prediction = 0; correct prediction = base matrix + Correct Read Bonus (+ Alliance bonus if applicable)
- **Traitor encounter:** wrong prediction = 0 + Traitor hit; correct prediction = `max(10, base matrix ×2, 0)`
- `DOUBLE` token applies only to positive, otherwise-valid earned points after correctness is established
- if Finale life is already lost, positive points are halved after normal scoring/token modifiers
- no regular-season Banish accumulation in the Finale

**Player-facing effect**  
Players do not have to learn a contradictory prediction rule for the Finale; wrong reads remain wrong reads.

**Exact test required**  
A table-driven Finale test covering:
- all four cooperate/betray matrix outcomes with correct and incorrect prediction
- allied correct bonus
- Traitor correct and wrong outcomes
- DOUBLE token on valid positive score
- DOUBLE does not rescue an incorrect read
- eliminated/finaleLives=0 positive-score halving occurs after modifiers
- no Banish increment in Finale

---

## 9. Finale Mask encounters exist in code but are not fully proven

**Current implementation**  
Default `finaleCounts.mask` is 0, but configuration can theoretically assign Mask encounters and backend contains special Finale handling such as converting Murderer to `SOLO_SHIELD`.

**Locked recommendation**  
For **R1 production, Finale Mask count is locked to 0**. Do not allow Mask encounters in the Final Three until a separate Finale-Mask design and complete E2E test are approved.

**Player-facing effect**  
The Finale stays understandable and avoids an unproven branch changing the championship outcome.

**Exact test required**  
- configuration with `finaleCounts.mask > 0` is rejected for R1
- valid Finale configuration with mask=0 opens successfully
- all 10 Finale encounters per finalist contain no `MASK` kind

---

## 10. Murder bonus is added after the winner is selected

**Current implementation**  
`apiAdminCastleDuelSettleFinale()` selects the winner using Finale points/lives/season points, then later adds `murderCredits × murderBonus` to each player's season `points`. The murder bonus therefore does not change the winner.

**Locked recommendation**  
Keep that separation explicit: **Murder credits affect the Finale through Murder Advantages; the postgame murder bonus is a season/stat bonus only and does not alter the Finale winner.** Player-facing copy must not imply the bonus can change the champion.

**Player-facing effect**  
Players know the winner is decided by the Final Three competition, while successful secret murders still receive a postgame scoring reward/stat.

**Exact test required**  
Create a fixture where Player A loses the Finale ranking but has enough murder credits that adding the bonus would otherwise overtake Player B's season points. Assert:
- Player B remains winner
- Player A receives the configured postgame murder bonus in final season score
- repeating settlement does not award the bonus twice

---

## 11. Late entrants can currently choose eliminated contestants for Castle Five

**Current implementation**  
`apiCastleDuelJoin()` calls `cdEligibleCast_(c,next,true)`, which allows original/past contestants, including contestants already eliminated from the TV season.

**Locked recommendation**  
A late entrant must choose their five Castle Five members from **contestants active at the player's join episode**. Once chosen, those five remain the player's original Castle Five even if one or more are eliminated later.

**Player-facing effect**  
Late entrants start with a usable alliance rather than being allowed to choose already-gone contestants, while their original selections remain historically meaningful afterward.

**Exact test required**  
At a late-entry episode with known eliminated contestants:
- joining with an already-eliminated contestant ID is rejected
- joining with five currently active contestants succeeds
- after one selected contestant is later eliminated, the stored Castle Five still contains that contestant and the UI may show them as eliminated

---

# Director approval sequence

Recommended approval order because later rules depend on earlier ones:

1. 0-life elimination
2. Traitor suspect-pool privacy
3. last-Traitor secrecy
4. Banish + Murder independence
5. wallet vs score separation
6. Correct Read Bonus naming
7. exact Final Three requirement
8. Finale scoring table
9. no Finale Mask in R1
10. postgame murder bonus does not affect winner
11. late-entry Castle Five uses active contestants

Once all 11 are explicitly approved, update `PATTC_CASTLE_DUEL_CANONICAL_RULEBOOK_R1.md` from **PRE-PRODUCTION RULE LOCK** to **PRODUCTION LOCKED**, then implement/test only the deltas required to match the approved rules.
