# PATTC Predicts v1.2.18n — Reality TV Production Automation

Release-control rebase of the Reality TV production automation candidate.

Adds:
- pre-season RealityCastImport staging for a season that does not exist yet;
- bulk tribe/team/group moves with historical assignment preservation;
- automatic or planned team/tribe → individual play transition;
- per-contestant exit reasons for multiple exits/finale episodes;
- Survivor fire-making winner question preset;
- clearer “Approve, Finalize & Advance” production flow;
- richer contestant profile fields carried into season creation.

Release-control protections:
- does not reuse v1.2.18i manifests or installer filenames;
- does not fast-forward/merge a different GitHub baseline;
- requires local HEAD == origin/architecture-cleanup before patching;
- applies the cast foundation idempotently without changing release/cache markers;
- performs one v1.2.18n release marker bump;
- preserves the existing service-worker cache format instead of inventing one;
- verifies Notifications + Team Fantasy compatibility before and after the Reality patch;
- full production checks must pass before commit or deployment.
