# PATTC Visual Studio R3 — reusable game-page templates (Phase 1)

Status: source integration candidate ONLY. Not deployed or production-accepted.

## What it does

Open an existing game in Studio, customize its page, and choose **Game Templates → Save as Template** with a name and family (Reality TV / Sports / Awards / General). Click **Load Game Templates**, then on another game *of the same page type* select and **Use Selected Template**. The target game's old Draft is first saved as a version; the copied template saves as that game's new Draft. Its Published layout is NOT changed until explicit **Publish Page**.

Only Visual Studio appearance manifest data is copied: section styling, headers, groups, generated sections, hide/collapse settings and Desktop/Tablet/Mobile overrides. Contestants, show episodes, picks, league membership, scoring rules, images uploaded as game content, and game settings are NOT copied.

Templates are private admin-only AppearanceOverrides rows under `__pattc_global__` with `EntityType=visual-studio-template`; no new Sheet, Apps Script endpoint or backend version is required because the existing production admin read/write route is used. Public appearance filtering already excludes all Visual Studio rows except `visual-studio-published`; an explicit Cloudflare preview write guard was added for templates.

Template application is manual after creating the new game; it is *not yet* a selector on the game-creation form. A template covers one matching page type, not all pages of an entire game. Existing games are never automatically updated if a template is saved or changed. Only explicitly selected template + clicked Apply can replace the current game's Draft, after user confirmation.

The UI never automatically publishes anything. Applying a template backs up the target's previous Draft into Version History and verifies the new Draft persisted. If the template is for a different page type, applying is blocked to avoid styling unrelated DOM elements.

## Installation (new isolated feature worktree only)

From an existing work-Mac football Git checkout, ensure `origin/architecture-cleanup` is still the approved Visual Studio production commit `5ee7215`. Create an isolated worktree from it, then use `python3 apply.py --check <worktree>` and `python3 apply.py --apply <worktree>`. Stop on any mismatch; the installer is intentionally fail-closed. It never edits the football working tree, the production branch, Google Sheets or Apps Script HEAD.

Run focused tests from the new worktree:

```
node tests/owner_visual_studio_r3_game_templates_p1_tests.js
node tests/owner_visual_studio_r3_production_integration_tests.js
node tests/owner_visual_studio_r3_owner_acceptance_tests.js
node --check frontend/js/ownerVisualStudioR3.js
node --check functions/api/app.js
git diff --check
```

Before ANY deployment: inspect new feature branch, preserve production release `5ee7215` / Apps Script `406` / Cloudflare Studio production rollback, check current football integration candidate, and get explicit owner approval. This feature can ship as a frontend/Pages proxy update without changing Apps Script version 406 **only after** a controlled browser acceptance on a new game using the real production admin and a non-admin player session.

## Quick Reality TV setup later

1. Create each Reality TV season/game with its own new GameId, cast and episode schedule using the existing Reality TV Manager.
2. Open the new game page in PATTC as admin, open Visual Studio, load saved templates matching that page, apply one, save its Draft.
3. Inspect cast/cards and mobile view, then explicitly Publish Page for that new game only.

Do not reuse game IDs between seasons. Do not assume the same template fits structurally different pages (e.g. contestant page vs leaderboard).
