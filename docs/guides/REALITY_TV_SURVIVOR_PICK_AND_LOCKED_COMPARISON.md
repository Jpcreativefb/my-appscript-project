# Reality TV Sole Survivor Pick and Locked Comparison

## Player workflow

The Sole Survivor Pick is a finalized season-long selection, not a normal weekly question.

1. Open the Reality TV game.
2. Review the active contestant bios.
3. Choose a contestant from the dropdown.
4. The portrait and biography preview update immediately in the browser.
5. Select **Finalize Pick**.
6. Confirm the finalization message.

After finalization, the dropdown disappears. The active pick cannot be switched while the contestant remains active.

## What happens after elimination

When the selected contestant is eliminated:

- The saved portrait becomes black and white.
- An **ELIMINATED** banner appears over the portrait.
- The existing streak/multiplier settlement is applied.
- The dropdown returns.
- Only active contestants are available for the replacement pick.
- The replacement is finalized using the same workflow.

The previous eliminated selection remains visible until the user previews or finalizes a replacement.

## Contestant bios

Before finalizing, open **Browse contestant bios before finalizing**.

Available details can include:

- Image
- Full name
- Age
- Hometown
- Occupation
- Biography
- Starting tribe/team/group
- Current tribe/team/group
- Final/latest group
- Episode-by-episode group history

Selecting a contestant from the bio browser also updates the main portrait preview.

## Stats layout

Sole Survivor statistics use a condensed grid. Multiple statistics share each row. The Current Episode and lock time use one full-width row.

## Locked episode comparison

After an episode locks, the player page can display a collapsible group comparison grid containing:

- Player name
- Finalized Sole Survivor Pick
- Every weekly answer for the locked episode

The comparison is intentionally unavailable before the episode lock time so players cannot copy open picks.

The grid displays the most recently locked episode. It scrolls horizontally on small screens while keeping the player column visible.

## Administrator settings

Open:

**Admin → Reality TV Season Manager → Season Survivor Pick**

Available settings include:

- Enable Season Survivor Pick
- Display label
- Starting multiplier
- Growth per survival
- Maximum multiplier cap
- Weekly eligible-points cap
- Loss penalty
- Quit/medical withdrawal behavior

A finalized pick cannot be manually switched. The player selector returns only after elimination.

## Troubleshooting images

If a portrait is blank:

1. Open the contestant in Reality TV Manager.
2. Confirm the contestant has an Image URL.
3. Open the URL directly in a browser.
4. Confirm the URL returns an image rather than an HTML page or blocked hotlink response.
5. Use the Platform Image Optimization guide for locally hosted `asset:` images when appropriate.

The player card includes an initials fallback and contains the image so it cannot overlap the leaderboard or neighboring sections.
