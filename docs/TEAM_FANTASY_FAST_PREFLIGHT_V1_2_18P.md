# Team Fantasy Fast Preflight v1.2.18p

Restores the Team Fantasy-specific production preflight path before the normal Game Setup category/question loader.

## Why
Team Fantasy is intentionally category-free. The generic `adminGetGameSetup()` path can scan normal Questions/Categories and time out even though Team Fantasy has its own saved settings and scoring rules.

## Behavior
- Team Fantasy Run Check uses `teamFantasyPreflightIssues_()`.
- Validates active scoring rules, all lineup positions, team-use limit, and AFC/NFC entry settings.
- Skips `adminGetGameSetup()` entirely for Team Fantasy.
- Normal games keep the existing full preflight path.
- No Team Fantasy data, picks, settings, leagues, trigger, or scoring rules are cleared.

## Release-control safeguards
- Package is intended to be extracted outside the repository.
- Installer requires a clean `architecture-cleanup` working tree.
- Local HEAD must exactly match `origin/architecture-cleanup` before patching.
- Team Fantasy prerequisites are verified before modification.
- Full production checks run before commit/deployment and again after deployment.
- GitHub is pushed only after the Apps Script deployment succeeds, then verified by SHA.
