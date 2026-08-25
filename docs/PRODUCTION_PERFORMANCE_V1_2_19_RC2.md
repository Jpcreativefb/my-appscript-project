# PATTC Predicts v1.2.19-rc2 — Performance Certification

Live RC1 certification found:

- Home cold load: under 1 second after the Cloudflare `/api/app` route fix.
- Return Home: under 1 second.
- Standard game open: about 18 seconds.
- Reality TV game open: about 22 seconds.
- Admin open: about 9 seconds.
- Observed background calls included `getMyLeagues` around 8.9 seconds and `getGameAppearance` around 6.8 seconds, while Reality TV player statistics could take about 16 seconds.

The Network trace showed that Home rendered quickly and then immediately started optional league/career/leaderboard/appearance work. Those calls remained in flight when the player entered a game and competed with the game startup request.

RC2 keeps the same features and changes the execution pattern:

1. Optional Home hydration waits 1.8 seconds and does not start if the player has already left Home.
2. Game standings on Home hydrate serially and stop when the route changes instead of launching up to 20 Apps Script calls concurrently.
3. League standing cards hydrate serially; appearance is decoration after the score data, not a parallel burst.
4. Session-to-username validation uses a revocation-aware two-minute ScriptCache entry, warmed on login and cleared on logout/device revocation.
5. League access sheet objects use a five-minute cross-execution ScriptCache entry and invalidate on writes.
6. Appearance runtime bundles use a five-minute generation-keyed cache and invalidate whenever appearance records change.
7. Reality TV core and player-stat caches are extended to five minutes. Existing pick/game invalidation already removes the affected player-stat key.

No gameplay scoring rule, question rule, template, Survivor rule, KOTH rule, Voting rule, Team Fantasy rule, or Awards workflow is intentionally changed by this release.

## Retest targets

After deployment, repeat these on `https://my-appscript-project.pages.dev`:

- Home fresh load: target < 3 seconds.
- Open a standard Prediction/Confidence game immediately after Home appears: target < 5 seconds.
- Return Home: target < 2 seconds.
- Open Admin: target < 5 seconds.
- Open the Survivor 50 Reality TV test: core picks target < 5 seconds; optional Reality stats may hydrate later without blocking the page.

If the first game open remains slow, capture only the `getStartupPayload` Timing/Payload request. Do not chase optional Home requests unless they are still starting after navigation.
