# Phase 1 Publish Controls Hotfix v1.0.1

## Problem corrected

The Phase 1 Publish Controls were implemented in `frontend/js/pages/adminGames.js`, but the live **Admin → Manage Games** page is rendered by `renderAdminGameForm()` in `frontend/js/pages/admin.js`. The controls therefore existed in code but were not displayed in the Game Settings card shown in the browser.

## Changes

- Displays **Run Check** beneath each existing Game Settings form.
- Displays **Publish Controls** beneath each existing game:
  - Draft
  - Setup
  - Preview
  - Activate
  - Make Default
- Makes all publish-control buttons explicit `type="button"` buttons.
- Reloads Manage Games after a publish attempt is blocked, so the Active checkbox correctly returns to the saved inactive/locked state.
- Bumps the service-worker cache to `awards-app-v252-phase1-publish-controls`.
- Adds regression coverage for the actual live Manage Games renderer.

## Deployment

This hotfix is frontend-only. Copy the included files into the repository, commit, and push the Cloudflare deployment branch. No `clasp push` is required for this hotfix.

After Cloudflare finishes deploying:

1. Hard-refresh the normal browser page with Command+Shift+R.
2. Fully quit and reopen the installed PWA.
3. Open Admin → Manage Games.
4. Expand an existing game.
5. The Run Check and Publish Controls sections should appear below the Save/Archive buttons.
