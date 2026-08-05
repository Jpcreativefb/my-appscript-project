# Production Smoke Test v1.1.5

## Deploy

1. Replace the changed frontend, test, tool, and documentation files.
2. Do not run `clasp push`; this release has no Apps Script backend changes.
3. Commit and push to GitHub.
4. Confirm the Cloudflare Pages deployment succeeds.
5. Hard-refresh twice with Command + Shift + R.

## General image checks

1. Open DevTools > Network.
2. Select the Img filter.
3. Reload the page.
4. Confirm only visible or near-visible images begin loading immediately.
5. Scroll down and confirm additional images load as they approach the viewport.
6. Confirm broken optimized-provider URLs retry the original image.

## Reality TV

1. Open a Reality TV game as a player.
2. Confirm the top Season Survivor image appears promptly.
3. Confirm contestant images below the fold load while scrolling.
4. Expand an older episode and confirm its contestant images load then.
5. Open the Reality TV Manager and confirm contestant/group previews appear.

## Awards

1. Open a standard awards game.
2. Confirm nominee cards and selected-pick summaries render.
3. Open leaderboard comparison and archive history image views.

## Sports and racing

1. Open Sports.
2. Confirm league and team logos render.
3. Open player comparison/prop controls and confirm headshots load.
4. Open a wager card and confirm team/player images render.

## Dashboard, admin, and profile

1. Confirm game hero backgrounds load as their cards approach the viewport.
2. Open Manage Games and confirm the hero preview loads.
3. Confirm profile and leaderboard avatars render.

## Local optimized asset test

1. Add one permission-cleared source file under `media-source/reality/test-person.jpg`.
2. Run `python3 tools/optimize_local_images.py`.
3. Use `asset:reality/test-person` in one test image field.
4. Commit and deploy generated assets.
5. Confirm the app chooses a small WebP file in DevTools.

## Console diagnostics

Run:

```js
PlatformImageEngine.metrics()
```

Expected:

- `discovered` increases as image elements are rendered.
- `requested` increases as lazy images approach the viewport.
- `failed` remains zero for valid URLs.
