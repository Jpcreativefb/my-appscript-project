# Phase 1 Game Setup Bulk Save Hotfix v1.0.8

## Corrected behavior

- `CategoryId` and `NomineeId` are permanent database keys. Renaming a question or answer changes only its visible name and does not change its ID.
- The Game Setup screen now labels these values as permanent Question ID and Answer ID.
- Saved question and answer names update immediately in the collapsed card heading; leaving and reopening the page is no longer required to see the new label.
- `SAVE ALL CHANGES` first calls `adminBulkUpdateGameSetup`.
- When the deployed Apps Script web app is older and responds with `Unknown action: adminBulkUpdateGameSetup`, the frontend automatically falls back to the existing individual `adminUpdateCategory` and `adminUpdateNominee` actions. Edits are no longer discarded.
- The success message identifies when compatibility save mode was used.
- Service-worker cache: `awards-app-v257-game-setup-save-compatibility`.

## Root cause of the reported failure

The frontend had the new bulk-save button, but the Apps Script deployment serving the API was still on an older web-app version. The source repository contained the bulk action, but the deployed endpoint returned `Unknown action`.

The attempted rename to `Sleep Saturday Night 3` was part of the failed bulk request, so it was never persisted. The earlier individual save to `Sleep Saturday Night 2` succeeded.

## Install

Copy the hotfix files into the current repository, then push the frontend to GitHub/Cloudflare.

The frontend now works even before the Apps Script deployment catches up. Still update the backend deployment so permanent question deletion and all current actions are available:

```bash
clasp push
```

Then open Apps Script:

1. Deploy → Manage deployments.
2. Edit the active web-app deployment.
3. Select **New version**.
4. Deploy.

After Cloudflare deploys, hard-refresh the browser and fully close/reopen the PWA.

## Retest

1. Open Game Setup.
2. Rename the question to `Sleep Saturday Night 3`.
3. Rename one answer.
4. Confirm Save All turns orange.
5. Click **CHANGES MADE — SAVE ALL NOW**.
6. Confirm the button turns green.
7. Confirm the collapsed question and answer headings immediately show the new names.
8. Leave Game Setup and reopen it.
9. Confirm the new names remain.
10. Confirm the Question ID and Answer ID remain unchanged; this is expected and required.
