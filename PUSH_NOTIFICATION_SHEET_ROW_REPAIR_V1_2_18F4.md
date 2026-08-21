# Awards App v1.2.18f4 — Notification Sheet Row Repair

This hotfix repairs a durability bug in the notification storage layer. Earlier notification writers created a blank row and then used `getLastRow()` to locate it. A fully blank row is not a safe row locator in Google Sheets, so the next writes could target row 1 and overwrite sheet headers.

## Fix
- Restores canonical notification headers automatically if row 1 was overwritten.
- Salvages a corrupted row-1 subscription/settings record into row 2.
- Removes all blank-row append patterns from notification preference, global settings, per-game settings, and push subscription saves.
- Writes each record as one row operation.
- Push registration reads the exact stored row back in the same Apps Script execution and refuses to report success unless username, device ID, endpoint, subscription ID, and Enabled state match.
- Includes the v1.2.18f3 verification bridge changes and bumps the PWA cache marker.

Global notification mode should remain TEST until a single-device push test succeeds.
