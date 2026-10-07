# PATTC DIRECTOR HANDOFF — CASTLE DUEL / THE TRAITORS

**Date:** 2026-10-07

**Purpose:** Durable handoff for a new PATTC Director chat. Read this file together with `docs/PATTC_DIRECTOR_OPERATING_STANDARD.md` before issuing commands. Do not restart completed Castle work and do not merge/deploy anything from Castle specialists without Director review.

---

## 1. Director operating rules to preserve

The PATTC Director is the integration/release owner. Specialists are isolated contributors. Preserve production, isolate work, require branch/HEAD/tests/handoff, review before integration, use preview/live checkpoints, and require explicit Joel approval for production release.

Important working style:

- Give Joel short, exact Terminal commands, usually one next action at a time.
- Prefer quick live review checkpoints over long unverified batches.
- Do not repeatedly run the full release cycle after every tiny change.
- Do not casually redesign unrelated systems.
- Do not force-push/reset/clean unrelated worktrees.
- Do not mutate production Sheets/data during specialist work.
- Do not deploy Apps Script or Cloudflare production from specialist branches.
- Protect Visual Studio/Appearance and existing PATTC production behavior.
- Use GitHub branches/SHAs as the shared source of truth between Macs.
- Main Home Mac is preferred for heavier Cloudflare/release work; older Work Mac is fine for Git/tests/remote previews but Wrangler is unreliable there.
- Older Mac/network commands may require `NODE_EXTRA_CA_CERTS=/etc/ssl/cert.pem`.

The durable operating standard lives on the PATTC Director branch as `docs/PATTC_DIRECTOR_OPERATING_STANDARD.md`. New Director chats must read that standard and this Castle handoff before continuing.

---

## 2. Castle Duel project status

Castle Duel is an isolated Reality-TV mini-game inspired by The Traitors. It is **not yet integrated into live PATTC Predicts production**.

Safe architecture path remains:

1. build/accept Castle work in isolated Castle branches
2. prove behavior in isolated TEST Apps Script + TEST Sheet + Cloudflare Preview
3. accept only verified Castle pieces
4. later transplant accepted pieces onto the then-current PATTC Director baseline
5. resolve shared files carefully
6. run Castle + normal PATTC regression tests
7. live-review PATTC Preview
8. only then release Apps Script/Cloudflare production with explicit approval

**Never wholesale-merge the isolated Castle branch into a newer PATTC Director branch.**

---

## 3. Repository / Castle branches and known checkpoints

Repository:

`Jpcreativefb/my-appscript-project`

### Castle Director baseline

Branch:

`director/castle-duel-r3-baseline`

Original shared Castle baseline commit before this handoff-doc commit:

`068d342e3e397d677338a0c173a2e0f5c90a6330`

That baseline contains the accepted Castle engine state used by specialists, including Google Drive contestant-image normalization and the earlier removal of the slow PATTC profile lookup from the Castle hot path.

### Original Castle player branch history

Main isolated Castle branch:

`feature/castle-duel-player-reveal-r2`

Important historical commits:

- `496a0a...` Add Castle Duel R2 encounter reveal experience
- `e1cbe76` Enable Castle Duel R2 encounter reveal experience
- `096892f...` Add Castle Duel R2 swipe rooms and sealed decisions
- `8d9a88a` Enable Castle Duel R2 swipe rooms and sealed decisions
- `d66a4e5` Add Castle Duel R3 Banish and Traitor encounter rules
- `8e16256` Add Castle Duel R3 Traitor and Masked Hall player flow
- `c8b6a65` Add Castle Duel R3 Banish and Traitor rules tests
- `028452c` Tighten Castle Duel room and decision styling
- `56e2627` Use saved Castle opponent names and images

A local commit `15fbe89` normalized Drive images but repeatedly failed normal Git transport with GitHub Internal Server Error. Its exact engine file was then published safely through GitHub's contents API, producing Director baseline commit `068d342...`.

### Current mobile presentation branch

Branch:

`feature/castle-mobile-presentation-r1`

Latest reviewed/tested HEAD:

`4b7c5973de252351c1711e311ffa62a910e350d9`

This branch includes:

- seven-room presentation registry
- theatrical randomizer
- intentional portrait fallback
- hidden-Traitor visual privacy protections
- mobile framing polish
- softer serif typography
- smaller/transparent navigation controls
- very small architectural corner radii
- centered encounter-progress dots
- removal of separate `Encounter X of Y` text on encounter screens
- more room visible around portrait/parchment

### Mobile presentation prior milestones

- `695bbb24b9f9228a4d38a537a9e6eb1bcc1aae8a` initial mobile presentation implementation
- `ec9a11c5b224804ccb7a2df96cf69688721c70eb` fixed room-theme `theme.sub` renderer contract
- `c5e08e438d987897f9ff9e1d7ded5a679f791725` randomizer experience + portrait fallback correction
- `4b7c5973de252351c1711e311ffa62a910e350d9` mobile room framing + typography/radius polish

### Presentation proof branch

Branch already created:

`feature/castle-presentation-proof-r1`

Created from:

`4b7c5973de252351c1711e311ffa62a910e350d9`

Purpose: build a richer concept-quality presentation **without replacing the current renderer by default**. Enable proof only with `?castleProof=1`; without the flag, existing Castle presentation must remain authoritative.

The proof must use the same real TEST state, same match IDs, same opponents, same decision handlers, same save endpoints, same scoring and same backend. It is a presentation proof only.

### Realistic room backdrop specialist

Branch:

`feature/castle-realistic-room-backdrops-r1`

Approved asset HEAD:

`3ec4591411cc37701af0f04181355ec41a6f1e40`

Actual committed WebP assets:

- `frontend/assets/castle/rooms/strategy-chamber-modern.webp`
- `frontend/assets/castle/rooms/portrait-gallery-modern.webp`
- `frontend/assets/castle/rooms/masked-hall-modern.webp`
- `frontend/assets/castle/rooms/traitor-gallery-modern.webp`
- `frontend/assets/castle/rooms/murder-passage-modern.webp`
- `frontend/assets/castle/rooms/host-study-modern.webp`
- `frontend/assets/castle/rooms/throne-room-modern.webp`

All seven are 432×768 portrait WebP files intended for lightweight mobile use/review.

Review gallery:

`frontend/assets/castle/rooms/review/castle-modern-room-contact-sheet.html`

The modern room look is deliberately less medieval-fantasy and closer to a contemporary luxury manor / reality-TV castle atmosphere.

### Overlay specialist

Branch:

`feature/castle-image-overlays-r1`

Current approved visual direction is a standardized portrait-overlay system with identical outer dimensions/height for every state. The **top-row card height is the dimensional reference**.

Required overlay states:

1. Normal TV contestant
2. PATTC player
3. Castle Five ally
4. Suspected Traitor
5. Hidden Traitor
6. Revealed Traitor
7. Eliminated
8. Shield / Protection
9. Murder Danger
10. Host

Visual direction:

- ornate but readable border
- semi-transparent black nameplate/background areas
- elegant serif type
- small architectural radii, not rounded app cards
- actual Google Drive portrait remains underneath; overlays must be reusable transparent assets
- live contestant/player name and role text should preferably be HTML/CSS, not baked into art
- hidden Traitor must use generic silhouette/mystery art and must not preload real identity
- every overlay must use the same canvas/viewBox, portrait opening, nameplate position and role-label position so changing state does not resize/jump the card

The latest concept sheet is the visual specification, but the specialist still needs to return actual reusable production overlay assets and HEAD before integration.

### Special encounter card specialist

Branch:

`feature/castle-special-card-pack-r1`

Assignment exists to create reusable visual components for:

- randomizer/reveal card
- Traitor Guess candidate card
- Revealed Traitor card
- Masked Hall card
- Fate cards
- Murderer card
- Host reward envelopes
- Castle Five ally card
- repeat-encounter history row/card
- Decision Sealed card
- Finale card

Important: generated concept art is style reference only. It must be adapted to actual Castle rules; do not change gameplay to fit concept art.

---

## 4. TEST environment and production safety

TEST Google Sheet exact name:

`PATTC Castle Duel R1 TEST ONLY`

Castle local TEST Apps Script ID:

`1HmNzkgSP5Wa_XnEdkjhoUcFQcjRKpzeFn2rfmlXksg9XiXqEBskVEdVm`

Production repo Apps Script ID:

`1KdBY1vvNGgdl9khWfb8G7mSqG_kbWvLc_vKbubEoB8knIwy83tAkvB_3`

They must remain different.

Castle TEST web deployment ID / URL token:

`AKfycbwNjBT0FUpKmxHggQZ5tDJ3fQC6lxF92Zd_-QgshFa4TGEbQdDd3wk7DppKQFIaAXs0vA`

Castle TEST deployment was updated in place and last known at version **@3**, description `Castle Duel R3 Drive Images`.

Important deployment lesson:

`clasp push` updates source but does not automatically update the existing web-app deployment version. After any TEST backend push, update the **existing** TEST deployment in place; do not unnecessarily create a new URL.

Known working form:

`NODE_EXTRA_CA_CERTS=/etc/ssl/cert.pem clasp deploy --deploymentId AKfycbwNjBT0FUpKmxHggQZ5tDJ3fQC6lxF92Zd_-QgshFa4TGEbQdDd3wk7DppKQFIaAXs0vA --description "..."`

Castle branch `functions/api/app.js` points normal Castle traffic to this isolated TEST Apps Script deployment. Production must not be targeted during Castle specialist work.

Never commit local TEST `.clasp.json` changes.

---

## 5. Google Drive contestant-image behavior

Reality contestant photos remain in Google Drive / Sheet data; do not copy changing contestant/player photos into GitHub.

Problem found: normal Drive share links such as `/file/d/.../view?usp=drive_link` are viewer pages, not direct image resources.

Castle engine added `cdPublicImageUrl_` normalization that converts supported Drive share links to a thumbnail URL:

`https://drive.google.com/thumbnail?id=<ID>&sz=w1200`

This was tested live with **Sherry** and her real contestant image displayed correctly.

Static Castle room/backdrop/overlay art belongs in GitHub/Cloudflare. Dynamic contestant/player photos remain Drive-backed.

Current TEST Castle backend intentionally removed the slow PATTC editable-profile lookup from the Castle hot path. Therefore HUMAN/PATTC-player encounters may still use the intentional silhouette unless public profile data is already supplied in loaded state. Do not casually reintroduce the slow profile lookup merely for visuals.

---

## 6. Core Castle Duel TEST data / tabs

Castle tabs:

- `CastleDuelGames`
- `CastleDuelPlayers`
- `CastleDuelRounds`
- `CastleDuelMatches`

Primary TEST game:

- gameId: `castle-duel-r1-test`
- seasonId: `castle-duel-r1-test-season`
- show: The Traitors
- season label: Castle Duel R1 Test

Known TEST users:

- `castleadmin / 9000` — admin
- `castle1 / 1111`
- `castle2 / 2222`
- `castle3 / 3333`

Test config historically used:

- encounters: 3
- lives: 3
- startingPoints: 100
- weeklyJackpot: 100
- maskChance: 30
- hostChance: 20
- humanChance: 100
- lateEntryCutoff: 5
- minEpisodesFinale: 1
- maxShields: 1
- murderBonus: 20

Initial fake cast seed existed only for TEST scaffolding; real `RealityContestants` data has since been imported into TEST and should drive TV contestant name/image presentation.

---

## 7. Core game rules that must not drift

### Banish pressure

- Wrong read = 0 points +1 Banish.
- Surviving an episode removes 1 Banish, down to 0.
- Threshold tightens as season advances:
  - Episodes 1–3: 5
  - Episodes 4–6: 4
  - Episodes 7–9: 3
  - Episode 10+: 2
- Reaching threshold costs 1 life and resets Banish to 0.
- Banish life loss does **not** consume Secret Shield.
- Murder and Banish remain separate mechanics.

### Hidden TV Traitor encounter

When multiple active Traitors remain:

- player sees generic `A Traitor is after you`
- player guesses identity from authorized candidates
- correct identity: Traitor may be revealed to that player, player is safe from murder for that encounter, then normal duel continues
- wrong duel read after a correct identity can still add Banish
- wrong identity: actual Traitor remains hidden and flow goes to Fate / Murdered-or-Not-Murdered resolution

Privacy is mandatory: hidden identity/image may not leak in DOM, alt text, hidden inputs, data attributes, CSS URLs, preloaded images or client state.

### Masked Hall

Player may accept/decline the Masked wager. Half accepted wager contributes to jackpot under current rules.

Possible card branches:

- Traitor → Fate flow, no normal duel
- Faithful → normal duel
- Host → one of three sealed reward envelopes
- Murderer → player targets eligible PATTC human; killer identity stays secret until finale

### Host rewards

Three sealed reward envelopes:

- Gold
- Protection
- Mercy

Backend/rules decide result; visual layer only presents it.

### Murderer card

Murderer target must be an eligible human target in current round. Identity remains secret until authorized reveal/finale.

### Secret Shield

Shield protects against murder only, not Banish life loss.

### Finale

Final Three each receive 10 private encounters. No early stop. Finalists do not face each other. Existing former-player fallback/guard behavior must remain unless separately reviewed.

---

## 8. Existing focused tests / accepted rule contracts

`node tests/castle_duel_tests.js`

Known accepted result:

**PASS 16/16**

Coverage includes configuration, scoped Reality game counts, safe role fallback, eliminated Host behavior, join/Castle Five rules, frozen draws, late entry, duplicate-submission prevention, masked wager commitment, masked Murderer targeting, choice/murder privacy, settlement/replay safety, score matrix, overlapping murder credit, shield privacy/behavior, and Final Three private encounters.

`node tests/castle_duel_r3_rules_tests.js`

Known accepted result:

**PASS 5/5**

Coverage:

1. Banish threshold tightens
2. multiple Traitors stay hidden
3. correct identity grants murder safety; wrong duel read still adds Banish
4. Banish threshold life loss/reset, shield unaffected
5. Masked Traitor fate + Host envelopes

`node tests/castle_mobile_presentation_r1_tests.js`

Known accepted result on current mobile-presentation branch:

**PASS**

The full local gate was run successfully at `4b7c597...`:

- Castle focused 16/16 PASS
- R3 rules 5/5 PASS
- mobile-presentation test PASS
- syntax checks PASS
- `git diff --check` PASS
- clean worktree

Do not claim newer specialist branches pass until their current HEAD has been checked on a real checkout.

---

## 9. Current mobile presentation implementation

Main presentation files:

- `frontend/js/pages/castleDuelRevealR2.js`
- `frontend/js/pages/castleDuelRevealR2Swipe.js`
- `frontend/js/pages/castleDuelMobilePresentationR1.js`

The mobile presentation layer is deliberately presentation-only; existing R2/R3 modules remain authoritative for rules, scoring, secrets, submissions, routing and backend state.

### Seven-room registry

Current keys:

- STRATEGY
- PORTRAIT
- MASKED
- TRAITOR
- MURDER
- HOST
- FINALE

The renderer contract includes `theme.cls`, `theme.title`, and `theme.sub`; a prior defect caused by using only `subtitle` was fixed at `ec9a11c...`. Preserve the `theme.sub` contract.

### Randomizer / reveal

Accepted five reveal motion profiles:

- SLOW_CREEP
- RAPID_SNAP
- FALSE_STOP
- HEARTBEAT
- CHAOTIC_BURST

Approximate profile behavior:

- Slow Creep ~1.37s before final card
- Rapid Snap ~0.55s
- False Stop ~1.37s
- Heartbeat ~1.04s
- Chaotic Burst ~0.69s

Final-stop effects:

- Slow Landing
- Snap
- Shadow Reveal
- Door Slam

The final card remains sourced from sealed match `m`. Motion profile must never select/replace opponent identity.

Randomizer uses already-loaded state and must make no Castle/API call per animation frame/tick.

Reduced-motion users get a short simple reveal.

Atmospheric copy replaced developer/debug copy. Examples:

- `The Castle has made its choice.`
- `Someone is waiting.`
- `The door knows who stands behind it.`
- `Not every face in the Castle can be trusted.`

Button states may include:

- `THE CASTLE IS WATCHING…`
- `THE DOOR IS OPENING…`
- `WHO CAN YOU TRUST?`
- `THE CASTLE HAS CHOSEN…`

### Portrait fallback

A live defect showed Sherry's valid image and fallback `S` simultaneously. Fixed with explicit hidden-state protection:

`.castle-mobile-fallback-slot[hidden]{display:none!important}`

Valid portrait = portrait only.

Failed remote portrait = broken image hidden, intentional fallback shown.

Hidden Traitor = no identifying portrait URL.

### Mobile framing / typography at `4b7c597...`

Accepted code/test direction:

- portrait inset so room shows on both sides
- parchment inset so room remains visible beside/below note
- smaller transparent/ghost Next/Back controls with 44px tap height
- separate `Encounter X of Y` label hidden on encounter screens
- progress dots centered/overlaid at top of room
- room art starts higher behind dots
- Georgia/Times-style serif treatment for Castle headings/names/supporting copy
- lighter control weights
- rectangular Castle surfaces approximately 4–5px radius
- true circles remain circular
- framing transparency scoped to actual encounter/spinner stages, not announcements/unrelated stages

Live phone review of this exact latest framing version was still pending when concept-proof work began.

---

## 10. Visual direction now preferred by Joel

The generated concept renders are **visual references, not gameplay specifications**.

Joel strongly likes:

- realistic modern-manor/castle backdrops
- room visible around the card and parchment
- ornate thin gold/black/red borders
- semi-transparent black card/nameplate backgrounds
- elegant serif typography
- aged parchment questions/notes
- portrait cards that keep the source photo's own background rather than trying to cut the person out
- small/architectural radii
- smaller translucent controls
- cinematic/mysterious tone that is fun and slightly scary, not gore/horror
- less blocky, less generic/computer-generated UI

Important: some concept screens do **not** match actual Castle gameplay. Do not rewrite gameplay to match the picture.

Examples:

- Traitor-guess candidate count must be dynamic/authorized, not hardcoded to three.
- Masked Hall is not simply a direct `Murdered / Spared` player choice; actual Mask rules must drive branches.
- Alliance concepts must not invent trust levels/intel that backend does not provide.

Preserve style, adapt layout/content to real mechanics.

---

## 11. Realistic room backdrop integration assignment

The original mobile-presentation specialist has been assigned a narrow integration task to pull **only** the seven approved modern WebP room assets from `feature/castle-realistic-room-backdrops-r1` into `feature/castle-mobile-presentation-r1` and wire the existing seven-room registry to them.

Do not wholesale-merge the backdrop branch.

Intended mapping:

- STRATEGY → `./assets/castle/rooms/strategy-chamber-modern.webp`
- PORTRAIT → `./assets/castle/rooms/portrait-gallery-modern.webp`
- MASKED → `./assets/castle/rooms/masked-hall-modern.webp`
- TRAITOR → `./assets/castle/rooms/traitor-gallery-modern.webp`
- MURDER → `./assets/castle/rooms/murder-passage-modern.webp`
- HOST → `./assets/castle/rooms/host-study-modern.webp`
- FINALE → `./assets/castle/rooms/throne-room-modern.webp`

Old SVG room assets should remain available as fallback/reference; do not delete them in the narrow integration task.

Need per-room `background-position` tuning if required; avoid one blind crop rule for all seven rooms.

Do not cover realistic rooms with giant opaque panels.

---

## 12. Presentation Proof R1 — exact purpose

Branch:

`feature/castle-presentation-proof-r1`

Goal: prove that richer concept-quality presentation can run on **real Castle TEST gameplay** without risking the existing version.

Proof mode should be enabled only with:

`?castleProof=1`

Without the flag, existing renderer must remain authoritative.

First proof should focus on a real end-to-end encounter, not every game screen:

1. Randomizer / reveal
2. Normal TV contestant encounter using actual Drive-backed image/name
3. Human/PATTC player encounter using actual available profile/silhouette behavior
4. Decision Sealed screen using actual prediction/decision state

Proof must use:

- same `CASTLE_DUEL_STATE`
- same matches/round/leaderboard/cast
- same match IDs
- same opponent
- same existing save/submit/target handlers
- same scoring/rules
- same backend/API

Only presentation changes.

Proof acceptance requires side-by-side normal vs `?castleProof=1` screenshots for the same real TEST encounter and tests proving default behavior remains unchanged.

---

## 13. Parchment / card / overlay design requirements

### Parchment

Preferred:

- aged cream parchment
- subtle paper texture
- thin ornament lines
- readable dark brown/black serif type
- small radius (2–4px)
- question and short instruction on parchment
- do not turn every panel into parchment

### Portrait cards

Keep source photo's own background visible.

Layering direction:

1. realistic room backdrop
2. Drive/player portrait image
3. transparent overlay frame/badges
4. live HTML/CSS name + role text
5. parchment/game controls

This keeps assets reusable across seasons and people.

### Overlay geometry

All overlay variants must have identical outer height/dimensions. The top row of the approved overlay concept is the reference height; lower-row states must be made the same height or slightly taller uniformly if necessary.

Required live nameplate structure:

- larger contestant/player name
- smaller one-line role label

Nameplate must remain in the same vertical position for every state.

---

## 14. Castle Five / Alliance and repeat-history work still pending

Planned specialist scope (not yet accepted/integrated):

- compact Castle Five / Alliance button or pill
- mobile overlay/bottom sheet
- original five selected contestants
- image/name
- active/eliminated status
- encounter count
- ally badge
- no secret role/murderer/future-draw leaks
- repeat encounter history from settled prior CastleDuelMatches for current user only
- compact expandable history, not a giant permanent table

Do not invent trust/caution ratings unless backend explicitly supplies a real game concept for them.

---

## 15. Special encounter presentation still pending

Need real-game-compatible presentation for:

- Traitor Guess candidate grid
- suspect vs revealed-Traitor states
- Masked Hall wager/branch screens
- Fate cards
- Murderer Card target selection
- Host Gold/Protection/Mercy envelopes
- Decision Sealed refinement
- Finale / Throne Room treatment

Strict rule: backend remains authorization source. Presentation may not expose hidden answers/roles/results early.

---

## 16. Decision Sealed desired refinement

Earlier live screenshot looked too large/blocky.

Desired final direction:

- `YOU` → `You`, slightly bolder
- title should be mixed case on two lines:
  - `Decision`
  - `Sealed`
- much smaller than prior giant all-caps treatment
- envelope roughly 55–65% of prior mobile visual height
- compact one-line rows when possible:
  - `Your Prediction: Cooperate`
  - `Your Decision: Betray`
- prediction/decision rows closer together
- embossed red wax seal near title
- dark red outer ring, lighter red center, pressed letter/icon in same red family
- smaller/translucent Next / Enter Encounter control
- room/parchment remains visible around the sealed card

Do not change two-step confirmation or save behavior.

---

## 17. Admin UX items still pending

Separate from current visual work:

- admin action busy/disable state to prevent double-click
- `.castle-ok` success text contrast is poor (white inherited on light green)

Do not mix these into presentation proof unless separately assigned.

---

## 18. Known live screenshots / acceptance observations

Previously observed and accepted direction:

- Sherry TV contestant Drive image successfully loads in Portrait Gallery.
- Human encounter currently may show `castle1` with intentional blue/player silhouette because profile lookup was removed from hot path.
- Current mobile room/card layout was visibly improved before newer concept work.
- User wants more room visible at sides and below parchment.
- User wants less blocky typography and much smaller corner radii.
- User wants randomizer more fun/scary, with variable pacing and different Castle palette movement.

The user specifically asked for proof because prior visual mockups have disappointed when they could not be implemented faithfully. Do not promise concept art can be copied exactly. Prove behavior in a live Preview with actual state before replacement.

---

## 19. GitHub failure lesson

Normal `git push` of local Castle commit `15fbe89` repeatedly failed with GitHub `Internal Server Error`, even with `--no-thin`.

The safe workaround used was GitHub Contents API with the existing credential and `/etc/ssl/cert.pem`, updating only the verified `backend/engines/CastleDuelEngine.js` file onto a Director baseline branch.

Do not keep retrying a failing push indefinitely. Verify local objects are safe and use a controlled alternate path when necessary.

---

## 20. Next priorities / exact continuation order

At handoff time, use this order unless Joel changes priority:

1. **Finish/receive the realistic room backdrop integration** on `feature/castle-mobile-presentation-r1` and run full Castle local gate.
2. **Receive actual reusable portrait overlay assets** from `feature/castle-image-overlays-r1`; verify identical dimensions/height and privacy behavior.
3. **Build `feature/castle-presentation-proof-r1`** using current real Castle state, accepted modern room assets, approved overlay system, parchment, and current spinner/decision handlers. Keep it opt-in with `?castleProof=1`.
4. Live-review proof on phone at 360/390/430, especially same real encounter normal vs proof.
5. Accept/reject visual proof before touching default Castle renderer.
6. Finish Castle Five/Alliance + repeat-history presentation.
7. Finish special encounter presentation pack (Traitor Guess, Masked, Murderer, Host envelopes, Decision Sealed, Finale) while preserving actual rules.
8. Run combined Castle regression and privacy checks.
9. Only after Castle is accepted in isolated Preview, plan transplant of accepted pieces onto the then-current PATTC Director baseline.
10. Full PATTC Preview/regression before any production release.

---

## 21. New Director chat startup checklist for Castle

Before issuing commands:

1. Read `docs/PATTC_DIRECTOR_OPERATING_STANDARD.md`.
2. Read this handoff.
3. Verify current remote HEADs for:
   - `director/castle-duel-r3-baseline`
   - `feature/castle-mobile-presentation-r1`
   - `feature/castle-presentation-proof-r1`
   - `feature/castle-realistic-room-backdrops-r1`
   - `feature/castle-image-overlays-r1`
   - `feature/castle-special-card-pack-r1`
4. Do not assume branch SHAs in this handoff remain current after later specialist work.
5. Verify TEST Apps Script ID before any `clasp push/deploy`.
6. Never commit `.clasp.json` TEST targeting.
7. Do not deploy production.
8. Continue from the latest verified specialist handoff rather than restarting Castle.
9. Give Joel one exact next action at a time.
10. After a meaningful accepted integration milestone, update this handoff/current-status note.

---

## 22. Bottom line

The game logic/rules are substantially built and protected by focused tests. The current work is primarily **presentation proof, realistic room integration, reusable portrait overlays, special encounter visuals, and final mobile polish**.

The user's target is not a static concept image. The target is a real, mobile-first Castle Duel experience that keeps the actual game rules/data/hidden information intact while reaching the approved cinematic manor/castle look.

Protect the working game first. Prove visual changes with real TEST data. Integrate only accepted pieces. Do not make the rules conform to a mockup.
