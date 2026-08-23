# PATTC Predicts v1.2.18j4 — Automatic Reminder / Team Fantasy Compatibility

Fixes the v1.2.18j automatic-pick-reminder release so it preserves Team Fantasy Football notification integration already committed in v1.2.18j/j2.

The failed v1.2.18j attempt replaced backend/engines/NotificationsEngine.js with a pre-Team-Fantasy copy. This package combines both notification paths and adds a regression contract requiring them together.
