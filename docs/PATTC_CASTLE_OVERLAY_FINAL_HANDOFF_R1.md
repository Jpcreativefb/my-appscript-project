# PATTC SPECIALIST CONTINUATION — CASTLE OVERLAY FINAL REVIEW/HANDOFF R1

Continue on `feature/castle-image-overlays-r1`.

Current verified branch HEAD before this assignment: `ca6325b5712d0b5e2a465169a3e88a798aa6c09e`.

Director has verified actual production overlay SVGs already exist on this branch, including `frontend/assets/castle/overlays/portrait-normal.svg` and `portrait-hidden-traitor.svg`, using the shared 320×420 / `viewBox="0 0 320 420"` geometry.

Do NOT rebuild the approved overlays from scratch.

Do NOT merge. Do NOT deploy. Do NOT touch backend/rules/routing/production data.

## Remaining work only

1. Verify all ten required main overlay SVGs exist and use the identical 320×420 geometry.
2. Verify portrait opening, nameplate position, and role-label position align across swappable states.
3. Verify hidden-Traitor asset contains no real portrait/identity.
4. Create the missing review directory/files:
   - `frontend/assets/castle/overlays/review/castle-overlay-contact-sheet.html`
   - optional PNG/WebP contact sheet
5. Include an alignment-proof row using the SAME placeholder portrait under Normal / Castle Five / Suspect / Revealed Traitor / Eliminated / Shield.
6. Review at 360 / 390 / 430px.
7. Run `git diff --check` and return clean/intended status.

## Handoff

Return branch, ending HEAD, exact main asset paths, badge paths if any, contact-sheet path, geometry confirmation, mobile review, and `git status --short` + `git log -1 --oneline`.

Do not alter the approved visual direction unless a concrete alignment/privacy defect requires a narrow correction.