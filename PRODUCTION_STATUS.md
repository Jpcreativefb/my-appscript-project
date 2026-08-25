# PATTC Predicts / Awards App — Production Status

Current release candidate: **v1.2.19-rc7 — Pick Lock Integrity Certification**

Release asset marker: **v1219rc7-pick-lock-integrity**

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


## v1.2.19-rc4 cache persistence certification

The final live timing test exposed a deterministic ten-minute browser fast-path expiry: standard games returned to 14 seconds and Reality TV to 18 seconds after the page snapshot aged out. RC4 fixes that specific production blocker without changing game rules:

- Stores only the last three successful per-player game startup payloads on the device, capped by size and cleared for that user on logout.
- A stored startup payload can paint the real Picks renderer for up to six hours; after five minutes it refreshes quietly in the background rather than blocking navigation.
- Successful pick and Sole Survivor writes remove the stored startup payload immediately, so a changed pick is never restored from the old device snapshot.
- Keeps Games, categories, user picks, appearance and Reality TV read caches warm longer only where matching write invalidation already exists.
- Extends the cheap Reality TV season-detection cache from two minutes to thirty minutes so non-Reality games do not repeatedly reopen the Reality TV season sheet.
- Keeps session authorization caching short (five minutes) and preserves explicit revocation cleanup.
- No scheduled cache-warmer trigger is added; the fix reduces Apps Script work rather than adding another recurring job.


## v1.2.19-rc6 Admin question UX performance certification

Live RC5 retest still measured 19 seconds to open Categories / Questions, 27 seconds to create a question, and 23–24 seconds to add an answer. RC6 removes the mandatory full Game Setup reload after successful question/answer creates and removes remaining global compatibility work from ordinary game-scoped Admin setup paths. New questions/answers render in the open editor immediately; backend reads now defer legacy map work, scope question-mode invalidation, skip ranking-only result decoration for non-ranking games, and avoid forced flushes on ordinary creates.

Production gate: 142 JavaScript files, 184 regression tests, and ten release contracts must pass before deployment.

## v1.2.19-rc5 admin question performance certification

Functional production testing exposed a separate Admin Game Setup bottleneck even after player navigation was fast: opening Categories / Questions / Nominees took more than 20 seconds, creating one question took about 30 seconds, and adding a single answer could take about 75 seconds. RC5 targets only that administrative CRUD path:

- Admin Game Setup now reads CategorySettings with the existing game-scoped reader instead of loading the entire settings sheet.
- Normalized Questions / QuestionOptions use their maintained DataIndex for normal admin reads instead of forcing a full GameId rescan on every page load.
- The Admin setup projection no longer runs legacy-to-normalized synchronization on every editor open; normalized storage is already the canonical admin source and all admin writes invalidate the affected caches.
- Creating a question checks normalized Questions directly instead of building the entire Admin Game Setup payload just to detect duplicates.
- Adding an answer checks the normalized question/options directly and reads only the Categories header row before appending the legacy compatibility row.
- Single question/answer upserts update only that game’s DataIndex entry instead of rebuilding the index for every game in the Questions or QuestionOptions sheet.
- Current CategorySettings rows use an exact GameId TextFinder fast path; the older blank-GameId compatibility scan remains available only as a fallback.
- After a question or answer save, the existing setup page remains visible while the refreshed editor is fetched; the full-screen Admin loader no longer takes over for these same-page saves.

Game rules, scoring, picks, results, and player-facing cache behavior are unchanged.

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
8. v1.2.19-rc4 cache-persistence contract.
9. v1.2.19-rc5 admin-question-performance contract.
10. v1.2.19-rc6 admin-question-UX-performance contract.

## What remains before declaring LIVE

Local tests cannot prove Google Sheets latency, Cloudflare propagation, browser/PWA caching, real trigger execution or concurrent-user behavior. After deployment, complete the v1.2.19 production smoke test, including the RC4 10+ minute cache-persistence retest and the RC5 Admin question/answer CRUD timing check and do not declare the release production-certified until its P0/P1 sections pass.

## Release rule until launch

No new game modes or large architecture rewrites. Only launch blockers, measured performance fixes, UI simplification and production reliability fixes should enter this candidate.


## v1.2.19-rc7 pick lock integrity certification

Functional certification found a production-critical lock/state defect after a Standard Prediction game was switched from Live/Open to Live/Locked: the player page could restore an older device snapshot that showed no saved pick, and the standard batched save path did not enforce the game-wide `LockAllPicks` control on the server. RC7 repairs that integrity boundary without changing scoring rules:

- Server-side single-pick, batched standard-pick, and Confidence batch writes reject game-wide locked, Draft, Setup, Preview, archived, or finalized states.
- The Picks UI treats the game-wide Player Entries lock as authoritative in addition to each question's own lock time.
- Home/dashboard now carries `lockAllPicks`, allowing a newly locked game to override a warm Picks snapshot before rendering controls.
- Successful standard autosaves persist the updated pick into the durable startup snapshot, preventing an older no-pick snapshot from reappearing after navigation.
- The durable startup snapshot namespace is advanced for RC7 so pre-fix snapshots are retired once.
- Choosing the regular display profile is dismissed locally before its server round-trip, preventing the new-game profile prompt from immediately reopening on a slow request.

Live certification must re-test: saved pick remains visible after locking, locked controls cannot be changed, a locked save attempt cannot mutate the Picks sheet, unlocking restores editability, and the regular-profile prompt stays dismissed.
