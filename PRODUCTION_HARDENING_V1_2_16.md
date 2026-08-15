# v1.2.16 Fall Production Hardening

## Purpose

This release hardens the existing Awards App platform for Fall 2026 use with friends and private groups. It intentionally prioritizes security, release reliability, data protection, and simple player feedback over adding a new scoring mode.

## Security boundary

`backend/core/ApiSecurity.js` is now the API authorization gate used by both `doGet` and `doPost`.

Rules:

- Explicit public actions may run without a session.
- Every other route requires a valid, unexpired persisted session.
- Any action whose name starts with `admin` requires the authenticated session user to be an administrator.
- Player-owned actions derive `username` from the authenticated session and reject username impersonation attempts.
- The boundary is independent of whether an older write function contains its own `requireAdmin_()` call, so legacy routes inherit the protection too.

## Credential storage

New/updated PINs use a versioned salted HMAC-SHA256 storage value. The HMAC secret (pepper) is kept in Apps Script Script Properties. Existing four-digit plaintext PINs remain login-compatible long enough to migrate and are rewritten to the hardened representation.

New sessions persist only a SHA-256 token hash in the Users sheet. The browser still holds the random bearer token required to authenticate. Existing raw persisted session tokens remain temporarily compatible and are rewritten after validation.

The migration is designed to preserve existing user PINs and sessions rather than forcing a Fall-season account reset.

## Abuse controls

- Repeated failed logins are temporarily throttled.
- PIN-reset email requests are rate limited.
- Resetting a PIN revokes the existing session.
- Admin deactivation revokes the existing session.

These controls are deliberately lightweight so they work within Apps Script without adding another authentication service.

## Request transport

Credential actions, player writes, notification preference changes, and league-management writes now use POST. The frontend API layer attaches session credentials automatically for protected actions, reducing the chance that a future page forgets to send authentication.

## Release reliability

- One release marker drives frontend app/cache compatibility checks.
- Historic regression tests no longer fail simply because a newer cache version exists.
- `tests/production_hardening_v1216_tests.js` protects the v1.2.16 security/release contract.
- `tools/run_production_checks.sh` is the local release gate.
- `.github/workflows/production-checks.yml` runs the same release gate in GitHub Actions.
- `tools/sync_frontend_mirrors.sh` keeps legacy frontend compatibility mirrors synchronized intentionally.

## Safe cleanup policy

Large working Sports, Reality TV, Racing, Awards, and admin engines were **not** rewritten merely to reduce line count. This release removes maintenance traps and stale release clutter without risking major functional regressions immediately before the Fall season.

Historical root release documents are retained under `docs/archive/releases/`.

## Player UX improvement

Dashboard cards now expose actionable completion text such as remaining picks/wagers and distinguish Complete, In Progress, and Not Started states. Larger visual polish should follow after the v1.2.16 production smoke matrix passes.

## Known intentional gaps

Generic Ranking and generic Survivor / Elimination game modes remain preflight-blocked. They are the next planned game-development phase after this release is validated.
