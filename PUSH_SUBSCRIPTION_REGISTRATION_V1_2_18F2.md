# v1.2.18f2 — Push Subscription Registration Repair

## Problem
A device could have browser push permission and a PushManager subscription while the Awards App backend still reported `0 user(s) · 0 active device subscription(s)`. The Profile status treated the browser subscription alone as complete, so there was no clear repair path.

## Fix
- Adds a dedicated same-origin Cloudflare Pages Function at `/api/push-subscription` for register/remove operations.
- Forwards only the two allowed push-subscription actions to the existing Apps Script production web app.
- Avoids relying on the older generic upload proxy for Web Push device registration.
- Backend push summary now reports whether the exact current `deviceId` is active.
- Profile status distinguishes browser subscription from stored Awards App registration.
- Existing browser subscriptions can be repaired without asking for permission again.
- Registration is write-then-read verified before the UI reports success.
- Adds `/api/push-subscription` to the existing Cloudflare `_routes.json` without replacing any current routes.
- Bumps PWA cache marker to `v1218f2-push-registration`.

## Expected test result
After deployment and PWA restart, a browser-subscribed but unregistered phone shows **Repair Push Registration**. Tapping it should change the admin count from `0/0` to at least `1 user(s) · 1 active device subscription(s)`.
