# PATTC Predicts v1.2.18i — Notification Test Lab

## Purpose
Provide a safe way to validate notification targeting before games and the user base are fully built.

## Added
- Admin Notification Test Lab inside Notification Center.
- Synthetic 5-player simulation with no spreadsheet writes:
  - no picks + active device
  - incomplete picks + active device
  - complete picks
  - missing picks + no device
  - missing picks + Make Picks alerts disabled
- Real Game Dry Run showing each actual game player:
  - answered / required picks
  - no-picks, incomplete, complete state
  - preference eligibility
  - active device count
  - INCLUDE / EXCLUDE / ELIGIBLE-NO-DEVICE result and reason
- TEST Push to Me button.
  - Requires Global Mode = TEST.
  - Delivers only to the signed-in admin account.
  - Can deep-link to Picks for a selected unfinished game.
  - Does not require the selected game's LIVE notification switch to be enabled.

## Safety
- Dry runs never write Picks.
- Dry runs never create users or subscriptions.
- Dry runs never send push notifications.
- Synthetic players exist only in memory.
- Test Lab phone delivery is blocked unless Global Mode is TEST.
- Existing 18g game-player targeting and 18h outstanding-pick targeting remain in place.

## Production validation
Before commit/deploy:
- v1.2.18g targeting regression
- v1.2.18h outstanding-pick regression
- v1.2.18i Test Lab regression
- full v1.2.18f through f6 push regression chain
- project-wide production checks

## Recommended first test
1. Keep Global Mode = TEST.
2. Open Notification Center -> Admin Push Controls -> Notification Test Lab.
3. Run Synthetic mode with 5 required picks.
4. Confirm five synthetic rows show the expected include/exclude reasons.
5. Choose any existing game and run Real Game Dry Run.
6. Press Send TEST Push to Me and confirm only the admin phone receives it.
