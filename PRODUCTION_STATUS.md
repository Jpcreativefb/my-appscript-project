# PATTC Predicts / Awards App — Production Status

Current release candidate: **v1.2.19-rc3 — Final Performance Certification**

Release asset marker: **v1219rc3-final-performance**

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


## v1.2.19-rc2 performance certification

Measured live testing found Home rendering in under one second but game navigation was being delayed by optional Home background work. RC2 keeps the same features while reducing Apps Script contention:

- Home waits briefly before starting optional career, league and standings hydration so a player can enter a game without competing requests.
- Dashboard standings hydrate serially and stop when the player leaves Home instead of launching up to 20 leaderboard executions at once.
- League cards no longer launch leaderboard and appearance requests in parallel across every league.
- Session username validation uses a short, revocation-aware cache during a navigation burst instead of re-reading UserSessions and Users on every API request.
- League access sheets use a short cross-execution cache and invalidate on league/access writes.
- Game appearance runtime bundles use a generation-based cache and invalidate when appearance rows change.
- Reality TV core/player-stat caches are extended to five minutes; existing player-action/game invalidation continues to clear the affected player stats.


## v1.2.19-rc3 final performance certification

RC3 is the final measured performance pass before the production tag. It keeps all game rules unchanged and targets the remaining live bottlenecks measured after RC2:

- `getStartupPayload` is protected by a short user/game response cache and a separately invalidated user-picks cache so repeat game navigation does not rebuild the same payload.
- Pick saves invalidate both caches immediately, preserving current-pick correctness.
- Home reuses its already-loaded Games Hub payload for two minutes rather than quietly starting another expensive `getDashboardGamesHub` request during navigation.
- Home career/archive history is moved to the end of optional hydration and delayed again; the measured 30+ second archive request no longer competes with game or Admin navigation.
- Optional Reality TV comparison/stats enhancements wait until the core picks page has had five seconds to become usable, and their safe read caches are extended to 15 minutes.
- Admin renders its complete navigation/control shell immediately and hydrates informational counts in the background. The compact Admin summary also has a short server cache.

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
6. v1.2.19-rc2 performance-certification contract.
7. v1.2.19-rc3 final-performance contract.

## What remains before declaring LIVE

Local tests cannot prove Google Sheets latency, Cloudflare propagation, browser/PWA caching, real trigger execution or concurrent-user behavior. After deployment, complete the v1.2.19 production smoke test, including the RC3 final performance retest and do not declare the release production-certified until its P0/P1 sections pass.

## Release rule until launch

No new game modes or large architecture rewrites. Only launch blockers, measured performance fixes, UI simplification and production reliability fixes should enter this candidate.
