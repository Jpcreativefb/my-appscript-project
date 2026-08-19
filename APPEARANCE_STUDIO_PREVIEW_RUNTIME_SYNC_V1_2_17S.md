# v1.2.17s — Appearance Studio Preview / Runtime Sync

Fixes the v1.2.17r regression where Page/Question controls could change without a visible preview response and where the Confidence Studio preview could drift from the real Confidence game.

## Changes
- Adds one shared `appearanceThemeRuntime.js` serializer for both Appearance Studio and live Picks/Confidence rendering.
- Rebuilds the Studio matchup preview with the same Confidence runtime classes/markup used by the player page.
- Rebuilds question previews with real Picks card/layout classes.
- Page/Header/Sort/Save controls are now visible in the preview shell and update live.
- Preview surfaces now include Matchup, Text, Compact, Image, List, Short Answer, and Wager.
- Changing Game Default Question Layout automatically switches the preview to that layout.
- Image question text-overlay setting now applies to the actual Picks page as well as the Studio preview.
- Keeps Desktop/Tablet/Mobile preview controls and result-state previews.

## Safety
Appearance only. No scoring, pick-save, sports schedule, wager settlement, or Image Pack persistence logic changed.
