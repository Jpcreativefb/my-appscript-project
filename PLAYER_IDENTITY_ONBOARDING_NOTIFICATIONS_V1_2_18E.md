# Awards App v1.2.18e — Player Identity, Onboarding + Notification Center

## Purpose
Finish the player-profile workflow before production smoke testing and establish the in-app notification foundation that the later Cloudflare Web Push sender will use.

## Player profile workflow
- First registration routes directly into General Profile setup.
- General Profile is the only editable scope during onboarding.
- General Profile save returns to the Main Hub.
- Choosing a custom profile when entering a new game opens Profile with that exact game already selected/locked.
- Saving a game-specific or league/season profile returns directly to the selected game.
- Leaving a custom-profile flow without saving does not permanently dismiss the first-game profile prompt.
- Career History is shown after the Profile to Edit section.

## Profile identity designer
- Solid or two-color gradient profile background.
- Gradient angle control.
- App, Leaderboard and Compact live previews.
- Display name, profile image, optional short note and profile colors move together as a reusable identity.
- Reuse an Old Profile copies a General, league/season or game-specific profile into the current editor without permanently linking the two profiles.
- Player gradient identity is also carried into leaderboard avatar presentation.

## Admin profile scope
Each game can choose:
- General profile only.
- League / season shared profile.
- Game-specific profile.

League/season mode uses an Admin-defined shared key and label, allowing games such as an entire NFL season to share one public player identity while all scoring/career history remains attached to the permanent username.

## Notification preferences
Profile now includes an app-notification preference panel with:
- Master Receive app notifications switch.
- Make your picks / new questions.
- Game lock approaching.
- Final results available.
- New games added.

These preferences are stored in `NotificationPreferences`.

## Notification Center
A new in-app Notification Center is available from:
- Header bell + unread badge.
- More menu.
- Profile notification settings.

Notifications are stored in `UserNotifications` with read/unread state and optional GameId/route deep links. The page supports opening a notification and Mark All Read.

This release intentionally establishes the in-app center and preference storage. Actual phone Web Push subscription/sending, VAPID configuration, Cloudflare Worker sender, and automatic pick/lock/final/new-game triggers are the next notification transport phase (v1.2.18f).

## Home Career Stats cleanup
The secondary expanded Career Stats area is reduced to roughly half the previous height while the fixed Career Stats title and the large Games / Wins / Top 3 row remain unchanged.

## Storage added automatically
- `UserProfileScopes`
- `NotificationPreferences`
- `UserNotifications`

The backend creates/extends these tables when used; no manual sheet setup is required.
