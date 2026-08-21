# Awards App v1.2.18e1 — Profile Polish

This patch completes the profile polish found during 18e testing.

- Notifications now appear above Career History on Profile.
- Saved profile gradients now render on Home and the header avatar instead of falling back to Color 1 only.
- Emoji guidance explains phone/tablet, Mac, and Windows emoji entry; compound emoji storage is expanded.
- Internet-image mode explains how to copy/paste a direct HTTPS image link.
- Upload Photo keeps the native mobile picker (camera / photo library / files), prepares large images in-browser, targets a maximum 1200px dimension, compresses before upload, shows Preparing / Uploading / Uploaded states, and provides a full uncropped preview.
- Global app bottom spacing now includes extra room plus the device safe-area inset so the final card/button can scroll fully above the fixed bottom navigation.
- Upload preview rendering stays on the shared Platform Image Engine (`platformImgHtml`) so profile images follow the same validation/optimization path as the rest of the app.
