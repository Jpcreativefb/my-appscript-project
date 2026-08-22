# PATTC Predicts v1.2.18h — Outstanding Pick Reminders

## Purpose
Adds a push audience that sends only to players in a selected game who still owe one or more currently open picks.

## Audience logic
- Player roster comes from the existing game-participant resolver (UserGameProfiles + Picks + Bets).
- Required picks are active, unlocked, non-wager, non-ranking questions with at least one active answer.
- Picks whose lock time has passed are excluded.
- If the whole game is locked/finished, no pick reminder is sent.
- A player is Complete when every currently open pick question has a saved Pick.
- A player is Incomplete when at least one, but not all, open questions has a saved Pick.
- A player has No Picks when none of the currently open questions has a saved Pick.
- Only No Picks + Incomplete players are reminder candidates.
- Notification preferences are applied after missing-pick detection.

## TEST safety
Global TEST mode and per-game Test Only continue to deliver only to the signed-in admin. Audience preview still reports the real missing-pick counts.

## Admin preview
The Notification Center now reports:
- players in game
- open pick questions
- no-pick users
- incomplete users
- complete users
- users who still owe picks
- eligible reminder users
- active devices

## Push destination
Missing-pick reminders route directly to the Picks page when opened.
