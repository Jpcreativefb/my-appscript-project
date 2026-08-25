# PATTC Predicts / Awards App — Production Status

Current release candidate: **v1.2.19-rc1 — Production Readiness**

Release asset marker: **v1219rc1-production-readiness**

## Status

**Code gate: PASS. Live certification: REQUIRED AFTER DEPLOYMENT.**

This release freezes new gameplay development and focuses on production hardening of the complete current feature set. No game engine is intentionally removed.

### Production-candidate game systems

- Standard Prediction / Head-to-Head
- Confidence
- Staked Prediction
- Sports Wager and Racing Wager
- Hybrid games
- Ranking
- Manual Survivor / Elimination
- Sports Survivor
- Streak Survivor
- King of the Hill
- Team Fantasy Football
- Voting / Competition participant entry and ballots
- Awards Manager workflows
- Reality TV seasons, cast, episodes, approvals and automation
- Parent / mini-game season hubs, private leagues, profiles, leaderboards and archives

## v1.2.19-rc1 hardening

### API and session transport

- Adds repo-owned Cloudflare Pages Function `/api/app` as the primary generic POST bridge.
- Authenticated frontend reads and all writes use POST so session tokens do not need to appear in URLs.
- All state-changing actions are POST-only. Legacy authenticated read-only GET routes remain temporarily accepted for mixed-deployment/backward compatibility, while the current frontend sends authenticated reads by POST so steady-state session tokens stay out of URLs.
- `doPost` safely reuses the established Apps Script route table internally, avoiding a risky duplicate router.
- Standalone Sports admin calls now use the same POST bridge instead of authenticated JSONP.
- The legacy external POST Worker remains only as a short mixed-deployment compatibility fallback when `/api/app` returns 404/405.

### Admin simplification and startup performance

- Admin Home is reorganized into five areas: Games & Design, Results & Scoring, Players & Leagues, System & Automation, and Advanced / Repair.
- Admin Home requests a compact summary instead of loading every user, category and nominee during startup.
- User controls and manual category result controls load only when explicitly opened.
- External Results Inbox no longer auto-polls merely because Admin Home opened.
- Existing advanced features remain reachable; they are no longer all displayed at once.

### Game templates

Create New Game includes built-in starting templates for:

- Standard Prediction
- NFL Confidence Pool
- Sports Wager
- Ranking
- Manual Survivor / Elimination
- NFL Survivor
- NFL Streak Survivor
- King of the Hill
- Team Fantasy Football
- Voting / Competition
- Awards Show
- Reality Competition
- Hybrid / Multi-Mode

Templates configure the existing engines; they do not create parallel copies of gameplay code.

### Automation health

- Adds a central Apps Script trigger inventory.
- Displays trigger-slot usage against the 20-trigger project limit.
- Separates durable workers, temporary Reality TV continuation workers and other triggers.
- Detects duplicates.
- Offers safe duplicate cleanup only for durable workers that are designed to have one installed trigger.
- Temporary Reality TV continuation triggers are never removed by duplicate cleanup.

## Automated release gate

Run:

```bash
bash tools/run_production_checks.sh
```

The gate checks:

1. JavaScript syntax across backend, frontend, external engines and Cloudflare Functions.
2. Frontend compatibility mirrors.
3. Complete regression suite.
4. Legacy production-hardening/security regression contract.
5. v1.2.19-rc1 production-readiness contract.

## What remains before declaring LIVE

Local tests cannot prove Google Sheets latency, Cloudflare propagation, browser/PWA caching, real trigger execution or concurrent-user behavior. After deployment, complete `PRODUCTION_SMOKE_TEST_V1_2_19_RC1.md` and do not declare the release production-certified until its P0/P1 sections pass.

## Release rule until launch

No new game modes or large architecture rewrites. Only launch blockers, measured performance fixes, UI simplification and production reliability fixes should enter this candidate.
