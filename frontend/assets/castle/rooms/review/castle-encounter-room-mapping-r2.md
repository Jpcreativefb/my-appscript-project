# PATTC Castle Encounter Room Backdrops R2

Branch: `feature/castle-realistic-room-backdrops-r1`

Approved visual source: `3ec4591411cc37701af0f04181355ec41a6f1e40`

## Decision

No new room image is required for these encounter sequences. The approved modern manor room set already covers them convincingly.

The seven approved room WebP files remain unchanged.

## Encounter mapping

| Encounter | Existing room asset | Presentation use |
|---|---|---|
| Regular Host | `host-study-modern.webp` | Host encounter and Host reward presentation |
| Masked Hall entrance | `masked-hall-modern.webp` | Shared masked entrance before the outcome branch |
| Masked Host | `host-study-modern.webp` | Transition from the shared masked reveal into Host reward play |
| Masked Faithful | `portrait-gallery-modern.webp` | Contestant-card reveal, Cooperate/Betray result, and Alliance-related portrait presentation |
| Masked Murderer | `murder-passage-modern.webp` | Murderer branch after the shared masked reveal |
| Masked Traitor / Fate | `murder-passage-modern.webp` | Fate/danger branch after the shared masked reveal |
| Murder target selection | `murder-passage-modern.webp` | Eligible target selection and murder-result sequence |
| Castle 5 Alliance welcome | `portrait-gallery-modern.webp` | TV contestant joins the Castle 5 Alliance; portrait-forward welcome presentation |

## Sequence note

All Masked outcomes begin in `masked-hall-modern.webp`. After the masked identity is revealed, the presentation may transition to the existing room that matches that branch: Host Study, Portrait Gallery, or Murder Passage.

## Review artifacts

- `frontend/assets/castle/rooms/review/castle-encounter-contact-sheet-390.html`

Each contact-sheet preview is exactly 390 px wide.

## Scope confirmation

- No approved room asset replaced or redesigned.
- No new production room image added.
- No backend changes.
- No Castle rule/scoring/secrecy changes.
- No routing changes.
- No merge.
- No deploy.
