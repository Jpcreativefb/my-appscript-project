# v1.2.17j Appearance Direct Write Routes Hotfix

Fixes `Unknown action: adminSaveAppearanceImagePackItem` after a successful Appearance Manager image upload.

The v1.2.17h image-upload fix intentionally moved small Appearance metadata writes from the upload proxy to the direct Apps Script JSONP/GET transport. The POST dispatcher already supported those actions, but the GET dispatcher only exposed setup/dashboard/read actions.

This hotfix exposes the five Appearance metadata write actions on the direct GET dispatcher:

- `adminSaveAppearanceImagePack`
- `adminSaveAppearanceImagePackItem`
- `adminSaveAppearanceThemePack`
- `adminSaveGameAppearance`
- `adminSaveAppearanceOverride`

No image bytes travel through these routes; uploads continue to use the existing image upload path. This patch only saves the resulting image URL/file ID and Appearance metadata.
