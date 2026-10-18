# Release Candidate Smoke Checklist R1

This checklist is the release-candidate smoke record for the PATTC application. It separates repository-only automated checks from browser validation and from tests that can mutate persistent data.

## 1. Automated Code-Level Smoke

Run from the repository root:

```bash
node tests/release_candidate_smoke_harness_r1_tests.js
git diff --check
bash tools/run_production_checks.sh
```

The focused Node smoke test is non-destructive and repository-source only. It does not use production access, browser automation, external network calls, Google Sheets writes, or Apps Script mutation.

It proves that the checked-out source still represents the accepted release contracts for:

- the exact eight General / Custom canonical game types, with Prediction Market excluded;
- the accepted Sports manager routes and NFL season/setup route;
- the five Sports organization areas and five Game Builder choices;
- the Home Hub saved-profile initialization/preservation path;
- saved Appearance integration and the shared Appearance runtime;
- the configurable bottom-navigation source of truth and its app integration;
- the current Loading bootstrap and first-use profile/onboarding entrypoints; and
- exact compatibility synchronization of `frontend/js/api.js` ↔ `frontend/api.js` and `frontend/js/app.js` → `frontend/app.js`.

The automated smoke does **not** prove that a deployed RC renders correctly, that authentication succeeds, that live backend reads are healthy, that responsive layouts are usable, or that persistent create/edit/save flows work. Those require the following RC/staging checks.

Automated result record:

- Commit SHA: ____________________
- Focused Node smoke: PASS / FAIL
- `git diff --check`: PASS / FAIL
- Full production checks: PASS / FAIL
- Notes / failure classification: ____________________

## 2. Manual Non-Destructive RC / Staging Browser Smoke

Use an RC/staging deployment and non-production test account. Do not use these browser checks to modify persistent production data.

### Test record

- Commit SHA: ____________________
- Environment: ____________________
- Environment URL: ____________________
- Confirmed NOT production: YES / NO
- Tester: ____________________
- Date: ____________________
- Browser: ____________________
- OS: ____________________
- Viewport / device: ____________________
- Test account: ____________________

For every failed item, record exactly one failure classification from the Failure Classification section below.

### Player / Home Hub

- [ ] Login succeeds for the test account.
- [ ] Home Hub loads.
- [ ] No blocking fetch error prevents normal Home Hub use.
- [ ] The correct saved player profile appears.
- [ ] A generic/default profile does not incorrectly replace an existing saved profile.
- [ ] Saved Appearance settings are applied.
- [ ] Bottom navigation renders and remains usable.
- [ ] Bottom-nav destinations open the intended surfaces.
- [ ] Refresh preserves the expected profile, Appearance, navigation, and Home Hub behavior.

### Loading / How-To

- [ ] Initial Loading behavior completes normally.
- [ ] First-use users receive the accepted How-To/onboarding flow where applicable.
- [ ] Returning users are not incorrectly forced back through first-use How-To/onboarding.
- [ ] Dismiss/navigation from the first-use flow works.
- [ ] Loading / How-To never enters a permanent blocking loop.

### Admin

- [ ] Admin opens.
- [ ] Games & Design opens.
- [ ] Sports is reachable.
- [ ] Reality TV is reachable.
- [ ] Awards is reachable.
- [ ] General / Custom is reachable independently.
- [ ] Appearance / Visual Design is reachable.
- [ ] Generic Manage Existing Games remains a clean generic manager.
- [ ] Specialized Sports managers remain separate and do not overwrite generic Manage Existing Games.

### Sports → NFL → 2026

Verify the accepted lifecycle organization:

- [ ] Game Builder
- [ ] Manage Existing Games
- [ ] Competitions
- [ ] League / Season Data
- [ ] Operations

Verify dedicated manager navigation:

- [ ] Team Fantasy opens its dedicated manager.
- [ ] NFL Cup opens its dedicated manager.
- [ ] Playoff Race / Forecast opens its dedicated manager.
- [ ] NFL season/setup opens the accepted season/setup manager.
- [ ] Sports Engine Controls opens its dedicated manager.

Verify Game Builder choices remain represented:

- [ ] Confidence
- [ ] Survivor
- [ ] Team Fantasy
- [ ] Playoff / Forecast
- [ ] Other Game

### General / Custom

Verify the presented canonical set is exactly:

- [ ] `prediction`
- [ ] `head-to-head`
- [ ] `staked-prediction`
- [ ] `wager`
- [ ] `racing-wager`
- [ ] `mixed`
- [ ] `voting`
- [ ] `ranking`
- [ ] Exactly eight canonical types are presented.
- [ ] `prediction-market` is **not** presented as a General / Custom type.

### Mobile

Repeat the important Player/Home Hub, navigation, Admin, Sports manager, and modal/dialog smoke at each viewport:

- [ ] 360px
- [ ] 390px
- [ ] 430px

At every viewport verify:

- [ ] No destructive horizontal overflow prevents use.
- [ ] Bottom navigation does not cover important controls.
- [ ] Final page content remains reachable.
- [ ] Buttons/cards remain tappable.
- [ ] Admin navigation/pages remain usable.
- [ ] Modals/dialogs remain reachable.
- [ ] Text is not materially unreadable.
- [ ] Dedicated manager pages remain usable.

### Manual non-destructive RC result

- No RELEASE BLOCKER: YES / NO
- Core Player/Admin/Sports navigation complete: YES / NO
- 360px / 390px / 430px smoke complete: YES / NO
- Regressions documented: YES / NO
- Notes: ____________________

## Failure Classification

Every failed checklist item must receive one of these classifications.

### RELEASE BLOCKER

Examples include:

- app fails to load;
- critical route is dead;
- saved profile is replaced by the wrong/generic profile;
- specialized manager routes to the wrong authority;
- core navigation prevents required use;
- blocking uncaught error;
- persistent state corruption; or
- Admin cannot reach core configuration surfaces.

### REGRESSION — INVESTIGATE BEFORE RELEASE

Examples include:

- intermittent Appearance failure;
- intermittent profile fallback;
- dedicated-manager routing inconsistency;
- incorrect returning-user How-To/onboarding behavior; or
- important mobile interaction is impaired.

### COSMETIC / NON-BLOCKING

Examples include:

- spacing;
- minor alignment;
- harmless copy inconsistency; or
- other non-blocking visual polish.

## 3. Mutating RC / Staging Only

# RC/STAGING ONLY — DO NOT RUN AGAINST PRODUCTION

These checks change persistent state. They are never required for production smoke and must only be run against a safe RC/staging target with test data and appropriate non-production credentials.

Potential mutating checks include:

- create a game;
- edit/save a game;
- alter a persistent player profile;
- save Appearance settings;
- create/edit a competition;
- change schedule or season data;
- enter scores/results;
- submit/settle a wager;
- change persistent Admin configuration; or
- create/delete other persistent test records.

If no safe RC/staging target exists, record exactly:

`NOT RUN — NO SAFE MUTATING RC TARGET`

Do not substitute production.

Mutating RC result: ____________________
Target environment: ____________________
Test data/account: ____________________
Cleanup completed: YES / NO / NOT APPLICABLE
Notes / failure classification: ____________________

## Exit Criteria

**AUTOMATED SMOKE PASS** requires the focused Node smoke test, `git diff --check`, and the complete production checks to pass.

**MANUAL NON-DESTRUCTIVE RC PASS** requires no RELEASE BLOCKER, completion of core Player/Admin/Sports navigation, completion of the 360px/390px/430px smoke, and documentation of any regressions.

**MUTATING RC PASS** is optional until a safe RC/staging target exists. A release must not be blocked merely because mutating checks were correctly withheld from production; record the limitation instead.
