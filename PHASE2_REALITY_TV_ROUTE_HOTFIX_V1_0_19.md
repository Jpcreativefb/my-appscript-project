# Phase 2 Reality TV Route Hotfix v1.0.19

## Problem
The Admin page linked to `admin-reality-tv`, but `app.html` loads `frontend/js/app.js`. The v1.0.18 route was mistakenly added only to the unused duplicate `frontend/app.js`, so the live router displayed **Page not found**.

## Fix
- Registered `admin-reality-tv` in `frontend/js/app.js`.
- Kept `frontend/app.js` synchronized without removing the existing Leagues route.
- Added the Reality TV page to Admin active-navigation handling.
- Added a version query to the loaded router script.
- Bumped the service-worker cache to v267.

## Deployment
Replace the included files, commit/push the frontend, allow Cloudflare Pages to deploy, then hard-refresh once. No Apps Script deployment is required for this route-only hotfix if v1.0.18 backend files are already deployed.
