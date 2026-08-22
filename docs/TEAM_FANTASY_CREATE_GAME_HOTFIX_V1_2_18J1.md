# Team Fantasy Football v1.2.18j1 — Manage Games Create-Type Hotfix

## Fix
v1.2.18j correctly added `team-fantasy` to the backend game-type registry, but the Manage Games create form renders a separate fixed `orderedTypes` list. Because that frontend list did not include Team Fantasy, the option was silently omitted from **Create New Game → Game Type**.

v1.2.18j1:
- adds **Team Fantasy Football** to the Manage Games Game Type dropdown;
- gives Team Fantasy the correct gameplay summary (Team Fantasy engine on, generic predictions/wagers off);
- preserves the intended all-generic-scoring-flags-off defaults;
- bumps the service-worker cache marker;
- adds a focused regression test.

No Team Fantasy data or scoring rules are changed by this hotfix.
