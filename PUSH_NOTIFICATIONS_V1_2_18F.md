# Awards App v1.2.18f — Push Notifications + Admin Controls

## Safety defaults

- Global notifications start **OFF**.
- Every game starts with push **disabled** and **Test Only** enabled.
- Global **TEST** mode always forces the audience to the signed-in admin only.
- **LIVE** mode is required before normal game-player/all-user targeting can send.
- A paused or disabled game cannot send.

## Player/device flow

- Profile > Notifications has **Enable Push on This Device** and **Disable on This Device**.
- Permission is requested only from the explicit Enable button.
- Subscriptions are stored in `PushSubscriptions` and tied to username + device.
- User notification-category preferences are enforced before live push delivery.
- iPhone/iPad uses standards-based Home Screen Web Push.

## Admin flow

Notification Center shows an admin-only Push Notification System panel:

1. Global OFF / TEST / LIVE switch.
2. Cloudflare gateway setup/status.
3. Per-game enabled / paused / test-only controls.
4. Manual notification composer with self, game-player, and all-user audiences.
5. Recent push delivery history.

## Cloudflare Pages Functions

- `/api/push-public-key` returns the VAPID public key to the installed app.
- `/api/push-send` requires a bearer `PUSH_GATEWAY_TOKEN` and delivers encrypted Web Push using `@pushforge/builder`.
- VAPID private material never ships to the browser or Apps Script spreadsheet.

## Apps Script / Cloudflare bridge

The admin saves the Cloudflare gateway URL and matching shared token once. Apps Script stores them in Script Properties, chooses recipients, and sends only the needed subscriptions to the Cloudflare gateway.

## Audience definition

`Players in this game only` is built from users present for that `GameId` in `UserGameProfiles`, `Picks`, or `Bets`.
