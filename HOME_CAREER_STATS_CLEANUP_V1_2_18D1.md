# Awards App v1.2.18d1 — Home Career Stats Cleanup

Frontend-only visual cleanup for the Player Profile block on the main Home hub.

## Changes

- Keeps `Career Stats` as a fixed label outside the expandable disclosure row.
- Roughly doubles the visual weight of the primary Games / Wins / Top 3 values.
- Keeps all three primary stats on a single mobile row.
- Adds visible white separator lines between primary stats.
- Replaces the large disclosure affordance with a tiny centered `⌄ more` control.
- Expands Avg Finish / Accuracy below the primary row with matching separator treatment.
- Keeps the Career Stats surface integrated into the dark Profile card instead of introducing another white header/card.
- Bumps frontend/PWA cache markers so the cleanup appears immediately after Cloudflare deployment.

No Apps Script deployment is required.
