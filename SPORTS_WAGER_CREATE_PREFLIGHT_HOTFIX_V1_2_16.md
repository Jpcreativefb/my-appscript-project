# Sports Wager Create / Preflight Hotfix v1.2.16

## Fixes

- Wager creation no longer forces a Sports Scores Engine window refresh before every single or bulk create. The selected Sports page data and normal Sports Engine updater remain the source; admins can still use the explicit Refresh Scores control. This prevents a harmless Sports trigger lock collision from surfacing as `Another update is already running` after a wager is saved.
- `adminGetGameSetup` now exposes SportsGameId, ESPNEventId, SportsMarket, SportsLeague, WagerResultType, MaxSelections, MinSelections, AllowDraw, and AllowPush from CategorySettings. Run Check therefore sees the Sports identifiers that the wager creator already stored and no longer emits a false missing-Sports-ID warning.
- No Sports Scores Engine deployment change is required.
