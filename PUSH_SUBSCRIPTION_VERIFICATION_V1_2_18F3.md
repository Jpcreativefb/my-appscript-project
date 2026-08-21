# Awards App v1.2.18f3 — Push Subscription Verification

## Fix

- Uses the same-origin Cloudflare `/api/push-subscription` bridge for registration status reads as well as writes.
- Verifies the current browser by both persistent device ID and the exact Web Push endpoint.
- Keeps the older GET summary route compatible while adding endpoint matching.
- Prevents an older asynchronous Profile status request from overwriting a newer successful registration result.
- Includes the v1.2.18f1 global OFF / TEST / LIVE persistence fix and v1.2.18f2 registration bridge work.

## Expected result

After Repair Push Registration succeeds, Profile remains at `Push enabled and registered on this device ✓` and Admin subscription counts include the device.
