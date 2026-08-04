# Production Admin Games Module Loader Fix v1.1.3

## Problem fixed

Manage Games could remain on "Loading admin Games tools" and the browser console showed:

- `js/pages/adminGames.js ... net::ERR_FAILED`
- `Could not load the adminGames page module`

The file existed, but VS Code Live Server could still be controlled by an older localhost service worker/cache. The lazy loader also built page-module URLs relative to the document instead of the actual loaded `app.js` file.

## Changes

- Page module URLs are now resolved from the loaded `app.js` URL.
- A failed page module receives one cache-busting retry.
- Loader errors now show the exact expected file path.
- Localhost/127.0.0.1 service workers and Awards App caches are automatically removed.
- Production continues to use the PWA service worker.
- `adminGames.js` is included in the production app-shell cache.
- Reality TV question-pack tests now follow the staged/resumable build contract.

## Reality TV repair after deployment

Open Manage Games, run the game check, then use **Repair Reality TV Setup**. The repair resumes the staged extra-question build and adds missing answers without duplicating existing questions.
