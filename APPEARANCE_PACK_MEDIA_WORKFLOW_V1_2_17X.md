# Appearance Pack Media Workflow v1.2.17x

## Scope
Final Appearance Studio fine-tuning before moving to the start-screen pass.

## Changes
- Duplicate/Create Image Pack immediately selects and opens the new pack for editing.
- Theme/Image Pack action buttons are compact to reduce vertical space.
- Image Pack and game-only image editors now separate the media choices clearly:
  - **Use External URL** keeps the original website URL.
  - **Import URL to Drive** downloads a Drive-owned copy into the existing Awards App image folder.
  - **Choose Photo** uploads a local photo/file through the existing image optimization path.
  - **Take Photo** uses a camera-friendly `capture="environment"` input and the same Drive upload path.
- Each saved image records its source type (`external-url`, `drive-import`, `drive-upload`) and original source URL when applicable.
- Image Pack duplication preserves source metadata along with image mappings.
- Normal UI shows friendly source chips; technical IDs/source URLs remain under Advanced / Technical.

## Storage behavior
- External URL: no Drive copy is created.
- Import URL to Drive: Apps Script fetches the image and writes it to the configured Admin image-upload Drive folder.
- Choose Photo / Take Photo: file is optimized when useful, then written to the same Drive image folder.

## Release intent
Freeze Appearance Studio feature work after this patch and move to the app start-screen refinement.
