# Awards App v1.2.16 — Game Load + Question Controls Hotfix

## Why this patch exists

Smoke testing showed two production issues after the Awards batch work: game pages could sit at the loader pulse ceiling (90%) for too long, and Manage Games question ↑/↓ controls did not reliably persist ordering. Admins also needed a clear way to control how many times a saved pick may be changed before the existing Lock Date / Time.

## Startup fix

Normal player/game category reads are now read-only. They no longer call the legacy→normalized synchronization routine. Explicit Admin Game Setup and migration tools retain the synchronization path.

A compact cached Reality TV season lookup also prevents ordinary Awards/Sports/prediction games from opening the full Reality TV support tables just to determine that no season exists.

The visible 90% value is the loader pulse ceiling, not a discrete backend stage; the long request behind it is what this patch reduces.

## Manage Games question ordering

Question ↑/↓ now calls one adminReorderQuestion backend action. The server holds one script lock, moves the selected question in the canonical ordered list, rewrites DisplayOrder values for the complete game, flushes once, and clears caches once. This replaces the prior two-request swap.

## Pick Changes Before Lock

Question Settings now places **Pick Changes Before Lock** beside **Lock Date / Time**. Options are:

- Unlimited until lock (`MaxChanges = -1`)
- No changes after the first saved pick (`MaxChanges = 0`)
- Limit number of changes (any positive whole number)

The first saved pick is not counted as a change. The existing manual Locked switch and Lock Date / Time still close the question. New questions created directly in Manage Games default to Unlimited until lock; existing questions keep their stored value until an admin changes it.

## Release gate

Expected result:

```text
PASS: 117 JavaScript files
PASS: API/app mirrors synchronized
PASS: 89 regression tests
PASS: v1.2.16 release/security contract
ALL PRODUCTION CHECKS PASSED
```
