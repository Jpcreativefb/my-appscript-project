# Awards App v1.2.18f1 — Global Notification Mode Persistence

## Fix
Corrects the Admin Notification Center safety switch reverting from TEST back to OFF after Save Global Mode.

## Behavior
- `PUSH_GLOBAL_MODE` in Apps Script Script Properties is now the canonical OFF / TEST / LIVE value.
- `NotificationSystemSettings` remains an audit/readable mirror.
- Save Global Mode now writes, flushes, reads back, and verifies the requested mode before returning success.
- The frontend then performs a second fresh Admin Control Center read before repainting.
- A mismatch is shown as an error instead of silently reverting.
- PWA/app cache markers are bumped so installed phones receive the corrected handler.
- Default remains OFF until the Admin explicitly changes it.
