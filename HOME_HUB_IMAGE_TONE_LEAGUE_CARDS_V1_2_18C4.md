# v1.2.18c4 — Hub Image Tone + League Card Appearance

## Goal
Finish the Home/Hub appearance controls with immediate image readability controls and let each user league have its own visual identity instead of inheriting the current game's card color.

## Changes
- Added **Image Opacity** to Hub + Navigation Appearance.
- Added **Darken Image** to place an adjustable dark layer over hub/league artwork.
- Both controls update the live preview immediately and save with the Hub Appearance row.
- Main hub cards, hub headers and subhub headers consume the saved image opacity/darken values.
- Every active league is now exposed automatically in Appearance Manager as **League Card — <League Name>**.
- League cards receive stable distinct default gradients, so multiple league memberships are visually different out of the box.
- Admin can override each league card with the same solid/gradient colors, image, icon, opacity and darken controls used by hubs.
- League card appearance labels do not rename the underlying league.
- League cards prefer a league-specific image; if none is assigned they can continue using the active game's artwork.

## Storage
League visual settings reuse `AppearanceHubSettings` with keys shaped like `league:<league-id>`. No new sheet is required.

## Deployment
Backend schema/runtime changed, so this release requires Apps Script push/version/deployment plus the normal Cloudflare/GitHub frontend push.
