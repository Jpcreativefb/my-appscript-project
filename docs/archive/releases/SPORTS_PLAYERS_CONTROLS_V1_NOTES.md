# Sports Players Controls v1

This Awards App update connects the existing Sports Scores Engine player backend to the Sports Controls UI.

## Added

- Secure Awards App bridge actions for player roster sync, current-game stat refresh, and status.
- Awards App API routes that preserve admin token checks and keep the Sports Engine admin key server-side.
- A Players section inside every Sports Controls league card.
- Working MLB and NFL buttons:
  - Sync Players
  - Refresh Current Game Stats
- Player count, active-player count, stat-row count, roster last-updated, and stats last-updated.
- Unsupported leagues show a disabled v1 message rather than calling the backend.

## Files changed

- backend/engines/SportsAdminBridgeEngine.js
- backend/Api.js
- frontend/js/api.js
- frontend/api.js
- frontend/js/pages/admin.js
- frontend/sw.js

## Test order

1. Deploy the Awards App backend.
2. Deploy the frontend.
3. Open Admin > Sports Controls.
4. Expand MLB or NFL > Players.
5. Click Sync Players.
6. Click Refresh Current Game Stats.
7. Confirm counts and last-updated values refresh without closing the league card.
