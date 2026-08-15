# Awards Manager Mobile Workflow — v1.2.16

## Purpose

This release simplifies the Awards Manager for fast Fall game setup on desktop and phone without changing the existing review-first settlement architecture.

## Awards Manager workflow

1. **Game & Default Settings** — choose the Awards App game and set defaults for official source, play/scoring type, Text/Compact/Image display, market-odds visibility, pick changes, section, points, and starting order.
2. **Find & Choose Events** — search Kalshi/Polymarket, filter by provider category, check the events to include, and configure only the events that need overrides.
3. **Review, Sort & Build Questions** — review the staged questions, reorder them, adjust individual settings/answers, then build only the unbuilt questions with overall and per-question status.
4. **Result Safety** — keeps result/reference controls separate from the normal build path.

All four sections are collapsible. Completed sections can be collapsed so the manager remains usable on smaller screens.

## Compact event editor

The normal event configuration view now emphasizes:

- Question text
- **Advanced Settings** (collapsed by default)
- **Markets / Answers** (collapsed/expandable)
- Per-answer Include / Show Odds / Answer Text controls

The old large View Event workspace is no longer the primary workflow. Existing-question provider linking remains available under an explicit Advanced Tool.

## Mobile behavior

- Awards questions/events render as stacked cards on narrow screens rather than a wide spreadsheet grid.
- Up/down buttons provide reliable ordering on touch devices.
- Desktop drag/drop ordering is also supported.
- Market/answer controls wrap to full-width mobile fields.

## Pick changes

New Awards pick questions still use the configured `MaxChanges` value (`-1` = unlimited until lock). Player pick cards now explicitly show **Tap to change until lock** or the remaining change count after a saved pick so the change affordance is visible.

## Build behavior

- **Build All Unbuilt Questions** skips rows already marked Built.
- One overall progress bar plus per-question Building / Built / Error status is shown.
- The current batch build remains client-driven; the Awards Manager page must stay open while it runs. Successfully built rows are retained so a retry can focus on unbuilt/error rows.

## Manage Games ordering

Manage Games now includes question-level up/down ordering controls that swap persisted category `DisplayOrder` values.

Nominee/answer reordering is intentionally not included in this release. The normalized option table supports ordering, but legacy compatibility storage needs a dedicated migration-safe implementation before exposing that control.
