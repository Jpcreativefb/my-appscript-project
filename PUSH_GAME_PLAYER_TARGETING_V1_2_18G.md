# PATTC Predicts v1.2.18g — Game Player Push Targeting

## What this release adds

- Keeps the existing `Players in this game only` audience and hardens its resolver.
- Game participants are resolved from `UserGameProfiles`, `Picks`, and `Bets` for the selected `GameId`.
- Adds a no-send audience preview before delivery:
  - players entered in the selected game
  - users eligible for the selected notification type
  - active subscribed users/devices
  - whether Global OFF, game OFF, game pause, TEST mode, or game Test Only affects delivery
- Global TEST and per-game Test Only remain admin-only delivery modes.
- LIVE game delivery respects each player's notification preferences.
- Multiple devices per user remain supported.
- Duplicate/stale subscription endpoints are deduplicated; the newest registration owns the device.
- A LIVE game send is blocked if no players have entered or if no entered player is eligible for that alert type.
- Send results show the resolved game audience counts.
- Adds a notification-page-only route cache-buster without changing the global service-worker cache marker.

## No new Cloudflare secrets

The existing working VAPID and push gateway configuration is reused unchanged.

## Intended test sequence

1. Leave Global mode on TEST.
2. Choose a game with at least one player who has entered/picked/wagered.
3. Set Audience to `Players in this game only`.
4. Confirm the preview shows the game's player and device counts.
5. Send a TEST notification and verify only the signed-in admin receives the phone push.
6. After that passes, a later step can move an individual game from Test Only to normal LIVE delivery.
