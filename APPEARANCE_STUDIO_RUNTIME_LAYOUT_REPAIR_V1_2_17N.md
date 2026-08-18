# v1.2.17n — Appearance Studio Runtime Layout Repair

Focused frontend repair after the v1.2.17m Studio canvas upgrade.

## Fixes

- Full Button is now one deterministic mode: the selected team image fills the complete team button as the bottom layer and city/name/score/result layers remain above it.
- Full Button automatically forces the background image layer so image-fit and layer settings cannot fight each other.
- Home and Away can now independently control text alignment, text vertical placement, text X/Y offsets, score anchor, and image X/Y focal point.
- Shared typography continues to control font size/weight/color only; it no longer overrides side-specific positioning.
- The Studio preview canvas stays sticky while scrolling through the desktop control panel. Full Preview still hides the control rail.
- iPhone/mobile confidence selectors suppress Safari's native black spinner/chevron, keep the number centered, and use a theme-controlled arrow size/color. Set arrow size to 0px to hide it.

## Scope

Frontend only. No changes to picks, scoring, schedules, Sports Engine data, Image Pack storage, or Apps Script APIs.
