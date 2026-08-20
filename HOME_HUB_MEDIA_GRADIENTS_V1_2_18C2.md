# Awards App v1.2.18c2 — Hub Media + Gradients

## Scope
Small Appearance/Home consistency patch requested after v1.2.18c1.

## Hub + Navigation Appearance
Every Hub/League Image and Hub/Bottom Nav Icon now has the same source choices:

- Use Web URL — keeps the externally hosted image URL.
- Import URL to Drive — downloads a direct web image URL into the Awards App Google Drive upload folder, then uses the Drive copy.
- Choose Image/Icon — uploads a local/device image into Google Drive.
- Take Photo — opens a camera-friendly file input and uploads the captured image into Google Drive.
- Clear/Use Fallback — removes the custom asset.

The saved hub setting also records whether an asset is an external URL, Drive import, or Drive upload.

## Hub colors
Hub, league/show/event, hub-page header, subhub header, and active bottom-navigation identity can now use either:

- Solid color
- Two-color linear gradient with configurable angle

Existing saved solid colors remain compatible. The new AppearanceHubSettings columns are added automatically by the existing Appearance setup migration.

## Notes
The URL importer accepts a direct image URL (`http://` or `https://`) that returns JPEG, PNG, WebP, or GIF. A normal webpage/HTML URL is not treated as an image.
