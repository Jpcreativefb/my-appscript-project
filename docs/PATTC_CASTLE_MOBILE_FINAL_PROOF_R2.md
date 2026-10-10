# PATTC DIRECTOR — CASTLE MOBILE FINAL PROOF R2

Status: DIRECTOR ASSIGNMENT — EXECUTE NOW

Branch: `feature/castle-presentation-proof-r1`

Do not merge. Do not deploy production. Do not modify production data. Do not change Castle rules, scoring, Apps Script routing, Cloudflare routing, or `.clasp.json`.

## Goal

Deliver the first real integrated mobile Castle Duel review in `?castleProof=1` using the approved modern room backdrops, approved portrait overlays, accepted Special Encounter Card R2 pack, and the existing Mobile Final Gameplay proof.

The Director/user must be able to see the game now. Do not wait for unrelated work before assembling what is ready.

## 1. Grand Entrance / Previous Castle Reveal is required

The first screen after `Enter the Castle` must be the dramatic previous-episode recap, not a generic stats page.

Use the existing proof entrance/history architecture already present in `frontend/js/pages/castleDuelMobileFinalGameplayR1.js`.

Required presentation:

- `PREVIOUS CASTLE REVEAL`
- previous settled episode number
- Castle Jackpot
- affected TV contestant/player portraits when supplied by authorized state
- TV contestant eliminated / removed where supported by real Reality data
- player lost 1 Castle life
- player lost final Castle life and is out of Castle championship eligibility
- murder succeeded when public/authorized
- murder avoided
- Secret Shield used
- Banish-related life consequence when public/authorized
- event/history ledger beneath the portraits
- `Earlier Castle Reveals` control for prior settled episodes
- `STEP INTO TONIGHT'S ENCOUNTERS` when encounters are open
- intentional waiting/sealed state when encounters are not open

Do not fabricate recap events. If required fields are missing, render the intentional unavailable state and report the exact missing backend field.

The screen should feel like a dramatic `Previously in the Castle...` opening while remaining based entirely on real authorized state.

## 2. Grand Entrance room art

Preferred asset:

`frontend/assets/castle/rooms/grand-entrance-modern.webp`

If that file is not yet present, use the already-approved fallback:

`frontend/assets/castle/rooms/strategy-chamber-modern.webp`

Do not delay the review while waiting for the dedicated Grand Entrance image. Do not create a replacement yourself.

## 3. Approved overlay integration

Accepted overlay source commit:

`ca6325b5712d0b5e2a465169a3e88a798aa6c09e`

Transplant and use the ten approved production SVGs:

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

All main overlays use the locked 320x420 / `viewBox="0 0 320 420"` geometry.

The current proof's `data-overlay-state` mapping is not sufficient by itself. The actual SVG must be visibly layered over the real portrait.

Layer order:

1. room backdrop
2. actual person portrait
3. approved overlay SVG
4. live HTML name/status
5. encounter content

Hidden Traitor is a privacy exception: no real portrait, identifying URL, name, alt text, or hidden DOM identity may exist underneath the generic hidden-Traitor presentation.

## 4. Accepted Special Encounter Card R2 integration

Accepted implementation source commit:

`ff0060e8d9d6d156592999352672eec2b7c0ec54`

Transplant only:

- `frontend/js/pages/castleDuelSpecialCardsR1.js`
- `frontend/assets/castle/special/**`

Do not wholesale merge the specialist branch.

Use the existing Castle backend/state/handlers as authority. The Special Card module is presentation only and must not choose attackers, Fate outcomes, Host rewards, eligible targets, Mask results, scoring, winners, or reroll encounters.

Integrate the accepted presentation for:

- Traitor Guess
- authorized Traitor reveal
- direct Fate for one-known-Traitor state
- Fate sealed / Safe / Murdered
- Masked Hall and authorized reveal
- Host sealed envelopes and authorized reward
- Murderer Card and authorized target selection
- Human encounter
- compact Decision Sealed
- Final Three
- Finale Armory
- Throne Room
- Winner / Jackpot when authorized state exists

## 5. Player journey

Regular season:

`Enter the Castle -> Previous Castle Reveal -> Earlier Reveals (optional) -> STEP INTO TONIGHT'S ENCOUNTERS -> encounter -> Decision Sealed -> next encounter -> Round Complete`

Next episode begins again at the newest Previous Castle Reveal.

Finale:

`Final Three -> Finale Armory -> Throne Room -> supplied Finale encounters -> sealed/waiting -> Winner / Jackpot when authorized`

No dead-end demo screens.

## 6. Proof-only protection

All richer integrated presentation remains behind:

`?castleProof=1`

Without that flag, the accepted normal Castle renderer must remain unchanged.

## 7. Mobile authority

390px is design authority. Also verify 360px and 430px.

Requirements:

- no horizontal scrolling
- room backgrounds visible
- portraits meaningful size
- overlays aligned exactly with portraits
- names/status readable
- minimum practical touch targets
- parchment readable
- no generic giant dark rectangles
- no emoji production fallbacks
- small architectural radii
- no clipped controls

## 8. Immediate visual checkpoint

After integration, stop development and return real browser evidence from `?castleProof=1`.

Required 390px screenshots where legitimate TEST state exists:

1. Grand Entrance / Previous Castle Reveal
2. Earlier Castle Reveals open
3. Normal TV contestant with approved overlay
4. PATTC Human with approved overlay
5. Traitor Guess
6. authorized Revealed Traitor
7. Hidden one-Traitor state if reachable
8. Fate sealed
9. authorized Fate result
10. Masked Hall
11. Host sealed envelopes
12. authorized Host reward
13. Murderer Card
14. Murder target selection
15. Decision Sealed
16. Round Complete
17. Final Three
18. Finale Armory
19. Throne Room
20. Winner / Jackpot if authorized

Also return one 360px entrance screenshot and one 430px encounter screenshot.

If a state cannot legitimately be reached from current TEST state, label it `PRESENTATION SHELL / FIXTURE ONLY` or `AWAITING R2 BACKEND STATE`. Do not call it live TEST data.

## 9. Validation

Run:

```bash
ls -1 tests | grep -i castle
node tests/castle_duel_tests.js
node tests/castle_duel_r3_rules_tests.js
node tests/castle_special_card_pack_r2_tests.js
node --check frontend/js/pages/castleDuelMobileFinalGameplayR1.js
node --check frontend/js/pages/castleDuelSpecialCardsR1.js
git diff --check
```

Run any additional Castle Mobile/Presentation/Proof tests discovered by the first command.

Do not weaken unrelated release gates. If the known canonical PATTC release-marker assertion is the only repository-wide failure, report it separately.

## 10. Handoff

Return:

- starting HEAD
- ending HEAD
- exact changed files
- overlay state -> SVG mapping actually wired
- Special Card components actually wired
- Entrance/history status
- exact TEST data fields used for the Previous Castle Reveal
- any missing R2 backend fields
- exact tests and results
- privacy review
- 390 / 360 / 430 real browser screenshots
- Cloudflare Preview URL if one exists
- exact `?castleProof=1` URL
- which screens are real TEST data vs fixture/shell
- `git status --short`
- `git log -1 --oneline`

Then STOP for Director/user visual review.
