# v1.2.17i — Appearance Runtime Image Hotfix

Fixes the case where an Image Pack upload succeeds in Appearance Manager but the Confidence player card continues to show the previous/default team logo.

Changes:
- Confidence resolves Image Pack rows by exact typed identity first, then stable EntityId, then legacy EntityName.
- Sports Confidence rows infer `team` identity when legacy category payloads omit EntryType.
- Appearance Manager uses the same Sports team inference for future pack rows.
- Uploaded pack/override records persist both the public thumbnail URL and Drive file ID.
- `getGameAppearance` reads carry a nonce so a stale browser/intermediary response cannot hide a newly assigned pack.
- Existing nominee image shapes (`image`, `img`, `imageUrl`, `logoUrl`) remain valid fallbacks.
- Frontend/PWA cache versions are bumped.

No backend Apps Script files are changed in this hotfix.
