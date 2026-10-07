# PATTC CASTLE DUEL — CANONICAL RULEBOOK + GAME FLOW R1

**Date:** 2026-10-07

**Status:** PRE-PRODUCTION RULE LOCK

This file is the gameplay authority for Castle Duel. It exists so future Director chats, specialists, UI work, tests, and production integration do not silently change how the game works.

Sections marked **LOCKED** are canonical unless Joel explicitly approves a rule change. Any code or UI that disagrees with a LOCKED rule is a defect, not a reason to rewrite the rulebook.

Sections marked **DECISION REQUIRED** must be resolved before the rulebook can be promoted to **PRODUCTION LOCKED**.

Sections marked **E2E REQUIRED** exist in code but have not yet been proven through a complete real player/admin season flow.

Every future gameplay-rule change must update:

1. this rulebook
2. focused tests
3. Director handoff/current-status note
4. any player-facing How To / Rules copy

Presentation-only work must never redefine these rules.

---

# 1. Core game concept — LOCKED

Castle Duel is a season-long Reality TV social-prediction / trust game played alongside a configured Reality TV season.

Players:

- start with Castle lives
- maintain Castle Points / scoring state
- choose an original five-person TV-contestant alliance (`Castle Five`)
- receive a fixed set of encounters each episode
- predict what an opponent will do
- choose their own action
- face Banish pressure for bad reads
- can be attacked by TV Traitors or human Murderer Cards
- may gain protection / life / other Host rewards
- may survive into a private Final Three finale

The backend freezes encounter identity and secret answers when a round opens. The randomizer/spinner is presentation only and may never change the sealed opponent, type, role, answer, or result.

---

# 2. Authoritative terms — LOCKED

## Castle Five

The five distinct TV contestants a player chooses when joining Castle Duel.

Current backend field: `player.alliance`.

Castle Five is not a declaration that those contestants are Faithful. It is the player's selected alliance/trusted-circle mechanic.

## Lives

Regular-season survival state. A player at 0 lives is considered eliminated from Castle survival.

## Secret Shield

Protects against a murder attack. It does not protect against Banish life loss or a missed-episode penalty.

## Banish

Pressure accumulated from incorrect opponent reads. Banish is separate from murder.

## Wallet / Castle Points

Spendable in-game balance currently stored in `player.wallet`.

## Score / standings points

Season performance total currently stored in `player.points`.

**DECISION REQUIRED:** see Economy section. Current code does not treat wallet and score identically in every Mask branch.

## Encounter

One sealed matchup/card assigned to a player for a round.

## Round / Episode

One regular Castle episode (`E1`, `E2`, etc.) or the `FINAL` round.

---

# 3. Admin setup order — LOCKED

Before players can play:

1. Admin creates/configures Castle Duel against a valid Reality TV season game.
2. Castle stores the season identity permanently for that Castle game.
3. Admin sets contestant role mapping used by Castle (`TRAITOR`, `FAITHFUL`, or `UNKNOWN`).
4. Admin configures allowed gameplay parameters.
5. Players join while registration is open.
6. Admin opens Episode 1 with a future lock deadline.

A Castle game cannot silently switch to a different Reality TV season after configuration.

---

# 4. Configurable gameplay parameters — LOCKED AS CONFIGURABLE

These values are game settings, not universal constants:

- encounters per regular episode
- starting lives
- starting wallet / points balance setting
- weekly jackpot contribution
- starting jackpot
- Mask encounter chance
- Host encounter chance
- human pairing chance
- late-entry cutoff
- minimum episodes for finale eligibility
- maximum Secret Shields
- murder bonus
- finale encounter composition

Current engine defaults are fallback values only. TEST values may differ from defaults.

Banish thresholds are currently represented as four season bands and are treated as gameplay rules below.

---

# 5. Joining Castle Duel — LOCKED except one late-entry item

## 5.1 Initial join

A new player must:

1. be logged in
2. join while Castle phase is `REGULAR`
3. be no later than the configured late-entry cutoff
4. choose exactly five distinct TV contestants for Castle Five

Duplicate contestants are not allowed.

A player who already joined cannot create a duplicate Castle player row by joining again.

## 5.2 Join timing

If a round is already open when someone joins, the new player begins with the **next** round. Existing round draws do not change.

## 5.3 Late-entry lives

A late entrant starts with the median/central value of currently active players' lives. If no active player exists, configured starting lives are used.

This prevents a late entrant from automatically receiving a large survival advantage over the current field.

## 5.4 Castle Five eligibility for late entrants — DECISION REQUIRED

Current implementation allows the five selections to come from the season cast even if a contestant was already eliminated from the TV season.

Before production, choose one canonical rule:

A. Late entrants may choose any original season contestant, including eliminated contestants.

B. Late entrants may choose only contestants still active when they join.

No specialist should guess this rule.

---

# 6. Opening a regular episode — LOCKED with one implementation blocker

Admin may open the next regular episode only when:

- Castle phase is `REGULAR`
- previous episode, if any, is `SETTLED`
- lock deadline is in the future

When the episode opens:

1. round key/number is fixed (`E1`, `E2`, etc.)
2. eligible player set is determined
3. encounter assignments are generated and saved
4. opponent identities/secret answers are frozen
5. weekly jackpot amount is added once
6. late joins after this point do not alter the round

Repeated player state loads must return the same frozen encounters.

## Eliminated players — LOCKED RULE / CURRENT IMPLEMENTATION BLOCKER

A player at **0 lives is eliminated and must not receive future regular-season encounters or human pairings**.

Current `apiAdminCastleDuelOpenRound` includes joined players without filtering `lives > 0`. This must be repaired before production and covered by a regression test.

Host rewards must never resurrect a player who is already at 0 lives.

---

# 7. Regular episode encounter generation — LOCKED

Current canonical regular-round model:

1. Each eligible player receives the configured number of encounters.
2. Human pairing is attempted for Encounter 1 only.
3. Players are shuffled and paired in twos for the human-pairing roll.
4. If the human-pairing roll succeeds, paired players face each other in Encounter 1.
5. Remaining/non-human encounters are selected among:
   - TV contestant
   - Masked encounter
   - standalone Host encounter
6. Mask and Host chances are applied before ordinary TV fallback.
7. A TV contestant should not normally repeat within the same player's episode while unused eligible cast remains.
8. If a requested role/category has no eligible contestant, the engine falls back safely to Castle Guard rather than inventing a false role.

Human encounters use the other PATTC player's real submitted choice when available at settlement. If the paired opponent did not submit that encounter, the engine uses a Castle Guard substitute answer for settlement.

---

# 8. Player-facing episode order — LOCKED

The intended player flow for every regular episode is:

## Step 1 — Load episode

Show:

- player lives
- Secret Shield count
- Banish pressure and current threshold
- jackpot / relevant game status
- previous public Castle announcement when available
- private notice for the current player when applicable

## Step 2 — Encounter progress

Player moves through the sealed encounters in encounter-number order.

The UI may allow revisiting already-open/unsubmitted screens, but the underlying encounter identities do not change.

## Step 3 — Randomizer / reveal

For each encounter:

1. show theatrical Castle reveal/randomizer
2. animation may vary speed/style
3. final card must come from the already-sealed match
4. randomizer may not call backend per animation frame
5. hidden information must remain hidden

## Step 4 — Resolve the encounter-specific branch

Branch by encounter kind/state:

- HUMAN → normal Trust Duel
- ordinary TV Faithful/unknown → normal Trust Duel
- TV Traitor special state → Traitor flow
- HOST standalone → Host Trust Duel
- MASK → Masked Hall flow

## Step 5 — Seal response

Once the applicable final choice is submitted/locked, that encounter cannot be changed.

## Step 6 — Continue to next encounter

After all encounters are locked/declined/resolved, player waits for episode settlement.

---

# 9. Normal Trust Duel — LOCKED

Applies to:

- HUMAN encounters
- ordinary TV contestant encounters
- standalone Host encounters
- Masked Faithful branch after the Mask reveal
- correct hidden-Traitor identification followed by Traitor Duel (with Traitor scoring modifications)

Player makes **two decisions**:

1. **Prediction** — what the opponent will do:
   - COOPERATE
   - BETRAY

2. **Own decision** — what the player will do:
   - COOPERATE
   - BETRAY

Both are sealed together for the duel.

The UI may present prediction first and own decision second, but both values are required before the normal duel is locked.

---

# 10. Base duel score matrix — LOCKED

If the player's own action is compared with the opponent's actual action:

| Player action | Opponent action | Base score |
|---|---|---:|
| COOPERATE | COOPERATE | +20 |
| BETRAY | COOPERATE | +30 |
| COOPERATE | BETRAY | 0 |
| BETRAY | BETRAY | -10 |

This matrix is already protected by focused tests.

---

# 11. Regular-season read gate / Banish — LOCKED

In a regular normal duel, the prediction is a scoring gate.

## Wrong prediction

If player predicts the opponent incorrectly:

- encounter score becomes **0**
- add **+1 Banish**
- do not award the positive/base duel score for that encounter

## Correct prediction

If prediction is correct:

- use the applicable duel score
- apply the regular correct-read bonus currently represented by `bonusClue`
- apply Castle Five ally bonus when applicable

Current defaults:

- correct-read / `bonusClue`: +5
- Castle Five ally bonus: +10

### Naming mismatch — DECISION REQUIRED

The implementation adds `bonusClue` on every correct normal read, even if no actual clue was displayed.

Before production, decide whether this rule is intended to be:

A. a universal **Correct Read bonus** (+5), and rename player-facing wording accordingly; or

B. a true **Clue bonus** awarded only when an actual clue existed.

Current code behaves like option A.

---

# 12. Castle Five clue / ally behavior — LOCKED

When the encounter contestant is in the player's Castle Five:

- encounter is marked allied
- backend may provide a clue about the opponent answer
- current clue generator is 75% accurate
- a correct read receives the configured alliance bonus

The clue itself does not change the sealed opponent answer.

Castle Five does not expose secret Traitor status.

No `trusted`, `caution`, or similar invented trust rating exists unless a future approved rule explicitly adds one.

---

# 13. Standalone Host encounter — LOCKED

A standalone Host encounter is different from a Host result inside the Masked Hall.

Standalone Host:

1. behaves as a normal Trust Duel
2. player predicts and chooses Cooperate/Betray
3. normal regular scoring/read-gate applies
4. if Host encounter produces positive points, reward one life if below configured max lives
5. if already at max lives, reward a Secret Shield up to configured shield cap
6. Host reward cannot resurrect a player who is already eliminated at 0 lives

---

# 14. Hidden TV Traitor encounter — PRE-PRODUCTION LOCK WITH PRIVACY REPAIR REQUIRED

A TV encounter whose actual contestant role is TRAITOR enters the special Traitor flow outside the finale.

## 14.1 Multiple active Traitors

Intended sequence:

1. Player is told a hidden Traitor is after them.
2. Actual attacker identity remains hidden.
3. Player sees an authorized **suspect/candidate pool**.
4. Player selects who they think is the Traitor targeting them.
5. If correct:
   - reveal only the authorized actual opponent to that player
   - player becomes safe from Traitor murder for this encounter
   - proceed to Traitor Trust Duel
6. If wrong:
   - actual identity stays hidden
   - proceed to two sealed Fate cards
   - Fate result is SAFE or MURDERED

## 14.2 Candidate privacy — LOCKED RULE / CURRENT IMPLEMENTATION BLOCKER

The candidate list must **not certify that every candidate is actually a Traitor**.

Current code builds `traitorCandidates` from actual active Traitors only and exposes those candidates during `IDENTIFY_REQUIRED`. This can reveal secret role information and conflicts with the intended suspect-card presentation.

Before production, backend must provide an authorized suspect pool that includes the actual target plus plausible decoys without revealing secret roles.

The true hidden identity must never be exposed in:

- DOM
- hidden elements
- alt text
- data attributes
- CSS image URLs
- preload lists
- client state not authorized for the player

## 14.3 Correct identity → Traitor Duel — LOCKED

After a correct identity guess:

- Traitor is revealed to that player
- player is murder-safe for that encounter
- player still predicts COOPERATE/BETRAY
- player still chooses COOPERATE/BETRAY
- an incorrect duel prediction still gives 0 points +1 Banish
- a correct read uses Traitor scoring

Current Traitor duel score on a correct read:

`max(10, base duel score × 2, 0)`

Castle Five ally bonus may still apply when applicable.

## 14.4 Wrong identity → Fate — LOCKED

Player chooses one of two sealed Fate cards.

One is safe and one represents murder danger, assigned before selection.

Result:

- SAFE → no Traitor attack from this encounter
- MURDERED → Traitor attack is pending for episode settlement

The client may never know which slot is safe before selection.

## 14.5 One active Traitor remaining — DECISION REQUIRED / PRIVACY-SENSITIVE

Current implementation skips identity guessing and sets the identity as revealed before direct Fate flow when one active Traitor remains.

Before production, explicitly choose:

A. reveal the last active Traitor and go directly to Fate; or

B. keep identity hidden (`A Traitor`) and go directly to Fate unless that contestant is already publicly revealed by an approved show/game state.

No visual specialist may decide this.

---

# 15. Masked Hall encounter — LOCKED core flow; E2E REQUIRED

The Masked encounter begins with a wager offer that is shown **before** the player accepts.

Available wager is selected from configured wager options the player can afford.

## 15.1 Decline

If player declines:

- no wager is deducted
- encounter ends as DECLINED
- no normal duel follows

## 15.2 Accept

If player accepts:

1. wager is deducted from wallet once
2. during regular season, half the wager is added to jackpot once
3. Mask outcome is selected from available branches
4. outcome determines the next interaction

Eligible Mask outcomes currently include:

- FAITHFUL
- TRAITOR
- HOST
- MURDERER

Faithful/Traitor are included only when an eligible contestant of that role exists.

Outcome selection is random among the available outcomes under current engine behavior.

Repeated requests must not charge the wager or jackpot twice.

---

# 16. Masked Faithful branch — LOCKED core; ECONOMY DECISION REQUIRED

Sequence:

1. reveal/authorize Faithful branch
2. identify the selected contestant as allowed by backend state
3. perform a normal prediction + Cooperate/Betray Trust Duel
4. regular read/Banish rules apply

Current implementation refunds the Mask wager when the prediction is correct.

**DECISION REQUIRED:** confirm whether that exact wager-refund rule is intended and whether duel points should also change the spendable wallet the same way ordinary duel points do.

Current code does not handle wallet identically across all Mask branches.

---

# 17. Masked Traitor branch — LOCKED

Sequence:

1. no normal Trust Duel
2. player chooses one of two sealed Fate cards
3. result is SAFE or MURDERED
4. MURDERED creates a pending TV Traitor attack
5. Secret Shield is not consumed until settlement
6. wager remains resolved according to Mask economy rules

The safe slot must never leak before selection.

---

# 18. Masked Host branch — LOCKED core; E2E REQUIRED

Sequence:

1. Host outcome is revealed
2. three sealed envelopes are presented
3. rewards are shuffled across the three envelope slots
4. player chooses one envelope
5. chosen reward applies immediately/authoritatively

Canonical rewards:

- **GOLD** — award Mask reward points equal to wager under current implementation
- **PROTECTION** — gain one life if below max; otherwise gain a Secret Shield up to cap
- **MERCY** — reset Banish to 0

Current implementation refunds the wager when the Host envelope is chosen.

Host cannot resurrect an already eliminated player.

Full wallet/score accounting must be covered by end-to-end tests before production.

---

# 19. Masked Murderer branch — LOCKED core; E2E REQUIRED

Sequence:

1. player receives Murderer Card
2. player must choose a different active eligible PATTC player
3. target selection is secret
4. selected target is attacked at episode settlement
5. murderer identity remains secret until authorized finale/postgame reveal

Player cannot target self.

Target must:

- exist in Castle Duel
- be active/alive
- have joined by the current round

If player does not select a target before settlement, backend may auto-select an eligible target.

If no eligible target exists, current backend converts the branch to a solo protection/life reward (`SOLO_SHIELD`).

Current backend returns the wager to the Murderer at settlement.

A successful human murder earns murder credit only if the target actually loses a life from the murder resolution.

A shielded murder does not earn murder credit.

---

# 20. Encounter submission / lock behavior — LOCKED

- A locked encounter cannot be resubmitted.
- One player cannot submit another player's encounter.
- All actions must occur before round lock.
- After the deadline, player actions are rejected.
- Admin cannot settle before the deadline.
- Re-settling an already-settled round must be idempotent and must not double-score, double-jackpot, or double-kill.

---

# 21. Missed encounters vs missed episode — LOCKED

A player is considered to have **missed the entire episode** only if they did not participate in any of their episode's encounters.

Participation includes an actual decision/action such as:

- normal duel choice
- Traitor identity/fate action
- Mask outcome/decline
- Host reward choice
- Murderer target

If player participates in at least one encounter but leaves others unresolved:

- unresolved encounters score 0 / settle as applicable
- player is not treated as fully absent

If player participates in none:

- mark episode missed
- apply absence attack/life penalty at settlement
- episodesPlayed does not increment

If player participated:

- episodesPlayed increments by 1

---

# 22. Banish thresholds — LOCKED

Regular-season threshold by episode:

- Episodes 1–3: 5
- Episodes 4–6: 4
- Episodes 7–9: 3
- Episode 10+: 2

When Banish reaches/exceeds the current threshold during settlement:

- lose one life under current implementation
- Banish resets to 0
- Secret Shield does not protect this Banish life loss

If player survives the episode, participated, did not trigger Banish life loss, remains alive, and still has Banish > 0:

- remove 1 Banish after settlement

---

# 23. Settlement attack priority — PARTLY LOCKED / ONE CRITICAL DECISION REQUIRED

Current code resolves a player's episode consequence in this order:

1. Banish threshold life loss
2. otherwise missed-episode life loss
3. otherwise murder attempt can consume Secret Shield
4. otherwise murder attempt costs one life

A Secret Shield does not protect Banish or absence.

## Multiple murder sources — LOCKED

If a human Murderer Card and TV Traitor attack hit the same victim in the same episode:

- victim loses at most one life from the current murder resolution
- public source can be represented as BOTH without revealing killer identity
- human murderer gets credit if victim actually loses a life and the loss was not superseded by Banish

## Simultaneous Banish + murder — DECISION REQUIRED

Current code gives Banish priority and applies only one life loss; murder does not additionally consume a shield or second life in that settlement.

Earlier design language says Banish and murder are separate mechanics, which could also be interpreted as two independent consequences.

Before production, choose explicitly:

A. **Current behavior:** Banish dominates the episode consequence; only one life is lost and shield remains.

B. **Independent behavior:** Banish costs one life and murder is then separately resolved (shield or additional life loss).

This must be decided and tested before production.

---

# 24. Public announcements and privacy timing — LOCKED

On settlement:

- current victim can receive a private notice about their own result
- killer identity remains hidden
- the just-settled round's public announcement is not immediately exposed as the normal public header
- when the next round opens, the prior round announcement becomes the public previous-Castle reveal

Public event data may identify the victim and whether a shield saved them, but must not reveal secret human murderer identity.

Full murder history may become available only after Castle phase is COMPLETE under current implementation.

---

# 25. Elimination — LOCKED

At 0 regular lives:

- player is eliminated from Castle survival
- player must not receive future regular encounters
- player cannot be a valid Murderer target
- Host rewards cannot resurrect them
- they are not eligible for Final Three

**Current round-opening code must be repaired to enforce the first bullet.**

---

# 26. Final Three qualification — LOCKED with implementation blocker

Finale may open only after the last regular episode is settled.

Eligible players:

- lives > 0
- episodesPlayed >= configured minimum

Ranking for finalist selection:

1. more regular lives
2. higher average regular points per episode

Top **three** are the Final Three.

## CURRENT IMPLEMENTATION BLOCKER

Current code slices up to three but only asserts at least one eligible finalist exists. Production rule requires **exactly three eligible finalists** before opening Final Three, or an explicitly approved fallback rule.

Before production, add a guard/test so the finale cannot silently open as a Final One/Two.

---

# 27. Finale setup — LOCKED core; E2E REQUIRED

Each finalist receives:

- 10 private finale encounters
- finaleLives = 1
- finalePoints = 0
- finaleTokens based on regular points
- up to one carried finaleShield from existing regular shield state

Finale encounter composition is controlled by `finaleCounts` and must total exactly 10.

Current default composition:

- 2 Faithful
- 2 Traitor
- 1 Alliance Faithful
- 1 Alliance Traitor
- 1 Alliance Any
- 2 Former / Guard-style
- 1 Host
- 0 Mask by default

Finalists do not face each other as Human encounters in the finale.

Former-player type currently resolves to Castle Guard presentation/logic.

Traitor special identity/fate stages are removed from finale encounters; finale uses its own risk/scoring model.

---

# 28. Finale tokens — LOCKED

Token earning under current configuration:

- `floor(max(0, regular points) / pointsPerToken)`
- capped at configured max tokens

Current default:

- 1 token per 100 regular points
- max 5 tokens

Token powers:

## CLUE

- costs 1 token
- adds a clue to one open finale encounter

## DOUBLE

- costs 1 token
- if finale settlement conditions are met, doubles eligible positive points on that encounter

## SHIELD

- costs 2 tokens
- gives finaleShield = 1

Only one token power may be attached to an encounter.

Token must be used before that encounter is submitted.

---

# 29. Murder-credit finale advantages — LOCKED core

Murder credits can create finale advantages.

Current defaults:

- 2 murder credits per advantage
- maximum 2 advantages

Advantages must be used **before any finale encounter for that player is submitted**.

Current powers:

## BANISH

Replace one of the player's finale Traitor encounters with an eligible Faithful contestant/encounter.

## RECRUIT

Add one eligible contestant to the player's Castle Five/alliance for finale purposes, up to alliance-size limit enforced by backend.

These powers are private player advantages and do not reveal secret data to other finalists.

---

# 30. Finale scoring — E2E REQUIRED / NOT YET PRODUCTION LOCKED

The current backend has a distinct finale settlement model. It has not yet been tested through every encounter branch end-to-end.

Current implemented behavior includes:

- Traitor wrong read can create a finale hit
- Traitor correct read uses doubled-style Traitor scoring
- Faithful/non-Traitor finale encounter can still receive base matrix points even if prediction is incorrect, unlike the regular-season zero-point Banish gate
- ally bonus applies on correct read
- DOUBLE can double eligible positive correct points
- Host positive normal result can create finaleShield
- a finale hit consumes finaleShield first; otherwise finaleLives becomes 0
- once finaleLives is 0, positive points are halved under current settlement logic

## PRODUCTION BLOCKER

The finale scoring/read rule is materially different from regular-season read/Banish behavior and has not been explicitly approved as the intended player-facing rule.

Before production:

1. Decide whether finale intentionally changes the prediction gate.
2. Write a complete finale score table.
3. Test every encounter type and token combination.

No UI copy should claim a finale scoring rule until this is locked.

---

# 31. Mask behavior in Finale — E2E REQUIRED / PRODUCTION BLOCKER

`finaleCounts.mask` is configurable even though the default is 0.

Current engine contains special finale Mask settlement behavior, including converting Murderer to `SOLO_SHIELD` and simplified wager-based outcomes.

This path has not been fully exercised against the interactive Masked Faithful / Traitor / Host branches.

Before production choose one:

A. Finale Masks remain disabled (`mask = 0`) and code path is treated as unsupported for R1 production.

B. Finale Masks are supported and every Mask branch receives a full, explicit finale rule/test matrix.

Recommended R1 safety choice: keep Finale Mask count at 0 until a separate full test/approval exists.

---

# 32. Finale winner — LOCKED core; one bonus-timing decision required

Current winner sort:

1. highest finalePoints
2. higher remaining finaleLives
3. higher regular `points`

Winner receives the current Castle jackpot. Jackpot is then reset to 0.

## Murder bonus timing — DECISION REQUIRED

Current backend applies `murderCredits × murderBonus` to players' regular points **after the finale winner has already been selected**.

Choose before production:

A. Murder bonus is postgame/season-stat bonus only and does not influence the Castle winner.

B. Murder bonus should influence winner/tiebreak and must be applied before winner determination.

---

# 33. Hidden-information contract — LOCKED

Never expose before authorization:

- bot/TV answer
- human opponent choice before appropriate settlement/use
- actual hidden Traitor identity
- safe Fate slot
- Host envelope mapping before chosen
- Murderer target to unrelated players
- Murderer identity
- unearned rewards
- other users' private choices
- murderCredits in public leaderboard before authorized reveal

The presentation layer must consume only public/authorized state.

Presentation tricks may never preload hidden identities/images.

---

# 34. Exact regular-season admin/player order — LOCKED

For each episode:

1. Previous episode must be settled.
2. Admin sets future deadline and opens next episode.
3. Backend freezes player encounters and secret data.
4. Weekly jackpot is added once.
5. Players load new round and see previous public reveal.
6. Player completes Encounter 1.
7. Player completes Encounter 2.
8. Player completes Encounter 3 / configured final encounter.
9. Every submitted encounter becomes locked and immutable.
10. Deadline arrives.
11. Admin settles round once.
12. Backend calculates duel scores / Mask outcomes.
13. Backend adds Banish from wrong reads.
14. Backend determines missed episode.
15. Backend determines Banish threshold hit.
16. Backend combines TV and human murder attempts.
17. Backend resolves life/shield consequence according to the locked priority rule.
18. Backend recovers one Banish for eligible survivors.
19. Backend saves all player/match results.
20. Round becomes SETTLED.
21. Player can receive private notice.
22. Next episode opening carries prior public announcement forward.
23. Repeat until admin opens Final Three.

---

# 35. Exact Final Three order — PRE-PRODUCTION LOCK

1. Last regular episode settles.
2. Admin opens Final Three only when exactly three eligible finalists are available under final rule.
3. Backend freezes 10 private encounters per finalist.
4. Regular points determine finaleTokens.
5. Existing shield may carry as at most one finaleShield.
6. Before any finale pick, player may use available murder-credit advantage(s).
7. Player may attach permitted token power to an open encounter.
8. Player completes/seals all 10 private encounters.
9. Finale deadline arrives.
10. Admin settles finale once.
11. Finale attacks/shields/lives/points resolve under the final approved finale scoring matrix.
12. Winner is determined by locked winner hierarchy.
13. Winner receives jackpot.
14. Castle phase becomes COMPLETE.
15. Authorized postgame murder history / final reveal may become visible.

Items in Steps 10–12 remain **E2E REQUIRED** until the production finale score matrix is approved and fully tested.

---

# 36. Presentation order — LOCKED AS PRESENTATION CONTRACT

Presentation may change style, but not logical order.

Recommended encounter presentation:

1. room/progress context
2. theatrical randomizer/reveal
3. opponent/card presentation
4. authorized clue/history context
5. question on parchment
6. prediction selection
7. own decision selection
8. confirmation / seal
9. Decision Sealed feedback
10. Next encounter

Special encounters replace Steps 5–8 with their required branch flow (Traitor Identify/Fate, Mask accept/branch, Host envelopes, Murderer target) but may not bypass backend-required actions.

---

# 37. Production end-to-end acceptance matrix — REQUIRED

Castle is not production-ready until these scenarios have been run from join/open through settlement and verified in UI + backend state.

## Joining / round lifecycle

- J1 first player joins with five unique contestants
- J2 duplicate alliance rejected
- J3 late join enters next round only
- J4 eliminated player receives no new round
- J5 registration closes after cutoff
- J6 exactly frozen encounters survive repeated reloads

## Normal duel

- N1 Coop/Coop correct read
- N2 Betray/Coop correct read
- N3 Coop/Betray correct read
- N4 Betray/Betray correct read
- N5 each matrix combination with wrong prediction → 0 + Banish
- N6 Castle Five clue + bonus
- N7 Human opponent both submit
- N8 Human opponent fails to submit → Guard substitute
- N9 standalone Host positive result → life/shield

## Banish / lives

- B1 threshold episode 1–3
- B2 threshold episode 4–6
- B3 threshold episode 7–9
- B4 threshold episode 10+
- B5 survivor Banish recovery -1
- B6 Banish life loss ignores shield
- B7 simultaneous Banish + murder according to final approved rule
- B8 player reaches 0 lives and is excluded next episode

## TV Traitor

- T1 multiple-Traitor candidate pool does not leak roles
- T2 correct identity → reveal + murder safety + duel
- T3 correct identity + wrong duel read → Banish
- T4 wrong identity → SAFE Fate card
- T5 wrong identity → MURDERED Fate card
- T6 Secret Shield protects Traitor murder at settlement
- T7 one-active-Traitor behavior after explicit rule decision

## Mask

- M1 wager visible before accept
- M2 decline no charge
- M3 accept charges once + regular jackpot half once
- M4 Faithful branch correct read
- M5 Faithful branch wrong read/Banish
- M6 Traitor branch SAFE
- M7 Traitor branch MURDERED
- M8 Host Gold
- M9 Host Protection below max life
- M10 Host Protection at max life → shield
- M11 Host Mercy → Banish 0
- M12 Murderer valid target
- M13 Murderer self-target rejected
- M14 Murderer no target submitted → auto target
- M15 no eligible Murderer target → Solo Shield behavior

## Murder / shield / announcements

- A1 human murder unshielded
- A2 human murder shielded
- A3 TV murder unshielded
- A4 TV murder shielded
- A5 human + TV same victim
- A6 killer remains private
- A7 current victim gets private notice
- A8 public prior-round announcement appears next round
- A9 murder credit only when murder actually costs life

## Missed episode

- X1 zero participation → one absence life loss
- X2 partial participation → no full-absence life loss; unresolved encounters 0

## Final Three

- F1 cannot open with fewer than required finalists
- F2 exactly three finalists selected in correct order
- F3 each gets exactly 10 private encounters
- F4 token calculation/cap
- F5 CLUE token
- F6 DOUBLE token
- F7 SHIELD token
- F8 only one token per encounter
- F9 murder advantage BANISH before picks
- F10 murder advantage RECRUIT before picks
- F11 advantages blocked after first finale submit
- F12 every Faithful score case
- F13 every Traitor score/hit case
- F14 finale shield consume
- F15 finaleLives 0 positive-score penalty
- F16 winner tiebreak hierarchy
- F17 jackpot awarded once / settlement idempotent
- F18 murder bonus timing according to approved rule
- F19 Finale Mask either disabled or fully tested per final decision

## Privacy

- P1 no answer leaked in open round
- P2 no hidden Traitor identity/image leaked
- P3 no safe Fate slot leaked
- P4 no Host envelope reward mapping leaked early
- P5 no Murderer target/killer leaked
- P6 other players cannot submit/inspect private actions

---

# 38. Current production blockers discovered while writing this rulebook

These are not cosmetic. They must be resolved before production:

1. **Eliminated players can currently be included when a new regular round opens.**
2. **Traitor candidate list currently consists of actual active Traitors and can leak role information.**
3. **One-remaining-Traitor identity behavior is not explicitly product-locked.**
4. **Simultaneous Banish + murder consequence needs explicit one-life-vs-independent resolution decision.**
5. **Wallet vs score accounting across Mask branches is not fully specified.**
6. **`bonusClue` currently behaves as a universal correct-read bonus even without a clue; name/rule needs confirmation.**
7. **Final Three can currently open with fewer than three eligible players.**
8. **Finale scoring differs from regular scoring and is not yet fully approved/tested.**
9. **Finale Mask path is not fully proven; default is 0 Mask encounters and should remain 0 until approved.**
10. **Murder bonus is currently applied after winner selection; effect on winning needs explicit decision.**
11. **Late-entry Castle Five eligibility for already-eliminated TV contestants needs explicit decision.**

Until these are resolved, Castle Duel may remain in TEST/Preview but is **not production-rule locked**.

---

# 39. Change-control rule — LOCKED

After this document reaches `PRODUCTION LOCKED`:

- visual specialists may change appearance only
- gameplay specialists must cite the exact rule section being implemented
- any proposed rule change requires explicit Joel approval
- Director must update this document and tests before accepting the code change
- production release must prove the acceptance matrix relevant to changed rules

If code and this rulebook disagree after Production Lock, **the rulebook wins until Joel explicitly changes it**.

---

# 40. Immediate next gameplay step

Before further production-readiness claims:

1. Joel/Director resolves the 11 blockers/decisions in Section 38.
2. Update this rulebook to `PRODUCTION LOCKED` rules.
3. Assign narrow backend corrections for any code mismatches.
4. Add missing focused regression tests.
5. Build a deterministic TEST season script/checklist covering the full acceptance matrix.
6. Run at least one complete TEST season from join through Final Three and postgame reveal.
7. Only then treat gameplay as production-ready.
