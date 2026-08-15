# Awards App Production Status

Current release candidate: **v1.2.16 — Fall Production Hardening**

Release asset marker: **323-awards-batch-builder-v1216**

## Release state

v1.2.16 is the first release candidate focused primarily on production engineering rather than adding another game mode. It is intended to become the stable Fall 2026 baseline after deployment and smoke testing.

### Ready for Fall smoke testing

- Standard prediction games
- Head-to-head games
- Confidence games
- Staked prediction games
- Wager / chips games
- Hybrid games
- Awards Manager v1.2.16 batch builder with event-first provider search, Official Website references, per-market answer controls, and Hub mapping
- Reality TV seasons, episodes, extra questions, contestant/tribe workflows, durable approvals, historical results, and Season Survivor picks
- Sports score/wager integrations
- Racing score/wager integrations
- Private leagues, profiles, archives, leaderboards, and career/history surfaces
- External Results Hub review-first settlement flow

### Deliberately not production-enabled yet

- Generic **Ranking** game mode
- Generic **Survivor / Elimination** game mode

Those two modes remain blocked by production preflight until their dedicated entry/scoring/advancement workflows are finished. The specialized Reality TV Survivor workflow is separate and remains available.

## v1.2.16 hardening completed in code

- Added a centralized API authorization boundary in `backend/core/ApiSecurity.js`.
- Every `admin...` API action is now classified as administrator-only automatically.
- Player-owned API actions derive the acting username from the authenticated session instead of trusting a browser-supplied username.
- Credential actions (`login`, `signup`, PIN reset request, PIN reset) require POST.
- Player writes (picks, bets, profile changes, Reality TV Season Survivor picks), notification preferences, and league-management writes use POST.
- Frontend API helpers automatically attach the current session to authenticated GET and POST requests.
- PINs are stored using versioned salted HMAC-SHA256 credentials instead of new plaintext values.
- Persisted session tokens are stored as hashes rather than new raw bearer tokens.
- Existing legacy PIN/session values migrate in place without requiring users to change their PIN.
- Login failure throttling and PIN-reset request throttling were added.
- Deactivating a user revokes their current session.
- User Active / AccountStatus compatibility was normalized.
- Dashboard/Home progress now reads the logged-in user’s actual saved picks/wagers and tells players how many selections remain.
- Awards Manager `View Event` now scrolls/focuses the Build/Link workspace with visible loading/error feedback so provider-event selection cannot appear to do nothing.
- Awards Manager now supports a preferred Official Website URL, auto-detects non-provider settlement URLs when available, and preserves Kalshi/Polymarket as secondary market-data references.
- Awards Manager uses a staged batch builder: choose game/source defaults once, multi-select events, load them into an editable question grid, choose individual markets/answers, then build all selected questions. `View Event` still expands Build/Link inline under the event.
- Awards-created questions inherit the target Game Type scoring; Hybrid games can choose Fixed, Confidence, Staked, Wager, or Ranking per question.
- New Awards pick questions default to unlimited changes until lock, and admins can choose a fixed change limit.
- Non-Reality-TV games no longer render the deferred Season Survivor placeholder.
- External probability labels use `K` / `P`; admins can hide probabilities game-wide, per question, or per answer without discarding market data. Awards Wager questions persist provider-derived decimal odds per answer.
- Awards question display now supports Text, Compact, and Image plus explicit question order, section, points, and pick-change controls in the batch grid.
- Disabled Awards markets/outcomes are excluded from both created answers and External Results Hub mappings.
- Release/cache markers are unified at v1.2.16.
- Brittle old version-marker regression assertions were replaced with a current-release contract.
- GitHub Actions production checks were added.
- Repository release-note clutter is archived under `docs/archive/releases/` rather than deleted.

## Automated release gate

Run:

```bash
./tools/run_production_checks.sh
```

Expected v1.2.16 result before packaging/deployment:

```txt
PASS: 117 JavaScript files
PASS: API/app mirrors synchronized
PASS: 83 regression tests
PASS: v1.2.16 release/security contract
ALL PRODUCTION CHECKS PASSED
```

## Deployment requirement

This release changes both backend API authorization and frontend request behavior. Stage the Apps Script files/version first (`clasp push` + `clasp version`), publish the frontend, then immediately redeploy the existing Apps Script production deployment to that staged version. This minimizes the short mixed-version window without changing the web-app URL.

After deployment, complete `PRODUCTION_SMOKE_TEST_V1_2_16.md` before declaring v1.2.16 the production baseline.

## Next development phase after v1.2.16 validation

1. Finish and certify generic Survivor / Elimination games.
2. Finish and certify Ranking games.
3. Build reusable Fall game templates for football, Emmys/awards, and recurring Reality TV seasons.
4. Continue reducing normal admin workflows to Create → Configure → Test → Activate → Approve Results → Archive while keeping repair tools under Advanced/Diagnostics.
