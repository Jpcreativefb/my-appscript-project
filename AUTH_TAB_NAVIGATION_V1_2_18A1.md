# v1.2.18a1 — Sign Up / Reset PIN Navigation Hotfix

The login refresh changed the login panel ID to `loginForm`, while the shared view switcher still looked for `loginView`. Clicking **Sign Up** or **Reset PIN** therefore threw before the target panel could open.

This hotfix:

- maps each auth tab to its real panel ID;
- makes tab switching null-safe;
- replaces inline `onclick` handlers with explicit event listeners;
- marks auth tabs as `type="button"`;
- updates selected-tab accessibility state; and
- bumps the PWA/service-worker cache so iPhone installs receive the repair immediately.

Frontend only. No Apps Script deployment is required.
