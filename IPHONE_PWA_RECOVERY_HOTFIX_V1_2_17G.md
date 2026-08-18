# v1.2.17g — iPhone PWA Recovery Hotfix

Scope is intentionally limited to mobile/PWA startup reliability.

- Bumps the service-worker registration URL so iPhone home-screen installs fetch the new worker immediately.
- Uses a dedicated v1.2.17g cache.
- Refreshes the existing app-shell cache under a new mobile recovery version.
- Caches shell files independently so one missing optional request cannot abort the whole install.
- Makes versioned asset requests fall back to unversioned cached assets with `ignoreSearch`.
- Fixes navigation fallback so `app.html` falls back to the authenticated app shell rather than `index.html`.
- Forces a one-time reload when the new worker takes control.

No Apps Script backend changes are included.
