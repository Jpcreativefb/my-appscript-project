# Awards Manager View Event Hotfix — v1.2.16

## Problem

Provider event search returned valid Kalshi and Polymarket event cards, and the external provider links worked, but selecting **View Event** appeared to do nothing.

The event-detail request and builder were rendered in Section 2, which sits below the entire provider search-results list. With multiple search results on screen, the button updated an off-screen section without scrolling or visible button feedback.

## Fix

- Added a stable `awardsEventWorkspace` target to the Build/Link card.
- `View Event` passes its button to the open-event handler.
- The button shows `Loading Event…` and is disabled while the provider event loads.
- The app scrolls immediately to the Build/Link workspace and focuses it.
- Success renders all live provider markets in the same workspace.
- Failure leaves the admin at the workspace with the provider/API error visible.
- Asset/cache marker advanced to `320-awards-view-event-v1216`.

This is a UX/navigation hotfix; provider search, provider-event APIs, Hub mapping, and settlement behavior are unchanged.
