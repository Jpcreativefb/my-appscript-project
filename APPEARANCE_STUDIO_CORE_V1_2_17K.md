# v1.2.17k — Appearance Studio Core

## Scope
This release turns the existing Theme Pack editor into the first visual Appearance Studio for Confidence games. It is appearance-only: picks, scoring, schedules, Sports data, and Image Pack assignment logic are unchanged.

## Appearance Studio controls
- Layout: row height, padding, team gap, VS width, Confidence width, row radius, shadow.
- Typography: city size/weight/opacity, team-name size/weight/letter spacing/case, score size, Confidence number size.
- Images: image size, opacity, shape, vertical alignment, optional oversize treatment.
- Selection/results: selected border and tint, tint opacity, unselected grayscale/dim/full-color modes, grayscale strength, unselected opacity, correct/wrong colors, result border width.
- Background/overlay: solid or gradient, start/end colors, gradient angle, dark overlay strength, primary/muted text colors.
- Scoreboard/Confidence: live/final colors and badge styles, filled/outline/minimal Confidence box, Confidence background/text/border/radius/locked opacity.

## Visual preview
The editor uses the first two entities from the selected game when possible and supports four preview states:
- Pregame
- Live
- Final Win
- Final Loss

Controls update the preview immediately without saving or reloading the page.

## Theme actions
- Save Theme
- Duplicate Theme
- Save As New
- Apply to This Game
- Reset Theme Controls
- New blank theme

## Confidence runtime
The compact weekly Confidence card consumes the saved Appearance Studio settings through ThemeJSON. Existing themes remain compatible because missing studio fields use safe defaults.

## Deferred intentionally
The following remain for the next planned stages:
- Full-image / full-bleed team buttons and advanced image positioning.
- Freeform text/score anchor placement and layer ordering.
- Expanded Odds/Records area designer and question-area/page-section controls.
- Device-specific theme overrides and desktop/tablet/mobile preview modes.
