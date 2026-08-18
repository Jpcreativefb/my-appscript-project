# v1.2.17h — Appearance Image Upload + Pack Display Hotfix

Scope is intentionally limited to the Appearance Manager image workflow.

## Fixes
- Sends small Appearance metadata writes directly to the live Apps Script deployment instead of the upload Worker.
- Keeps the upload Worker only for the actual binary/base64 image transfer.
- Serializes Theme Pack/theme override objects correctly when using direct Apps Script transport.
- Resizes/compresses large browser/iPhone images to WebP before upload; HEIC/HEIF selections can be browser-converted when supported.
- Shows upload progress through prepare → upload → pack/override save.
- Updates the uploaded preview immediately after Drive confirms the file.
- Reloads only Appearance data after an image save instead of reloading the full game setup.
- Bumps the PWA/page-module cache so iPhone and installed PWAs receive the updated Appearance Manager.

## Test
1. Open Admin → Appearance Manager.
2. Select the Confidence game and a custom Image Pack.
3. Upload one team image and wait for the confirmation message.
4. Confirm the new image appears in the Appearance Manager preview.
5. Save that Image Pack on the game.
6. Open the Confidence player page and hard refresh once.
7. Confirm the customized team uses the pack image while untouched teams retain default sports logos.
