# Phase 1 Game Setup Canonical Reload + Delete Answer Hotfix v1.0.9

## Corrected behavior

### Saved names now remain after leaving and reopening Game Setup

The Game Setup editor now reloads Questions and QuestionOptions directly from the canonical normalized sheets with runtime cache bypass and full game-row lookup. Saving also clears the normalized-storage cache layer.

This addresses the case where Google Sheets contained the new question/answer wording but reopening Game Setup displayed the previous wording.

Legacy duplicate answer rows are also updated together so compatibility data cannot keep an older answer name.

### Individual answer deletion

Each answer now has two separate actions:

- **Archive Answer** — marks the answer inactive and preserves history.
- **Delete Answer** — permanently removes that individual answer from Categories and QuestionOptions.

Permanent deletion is blocked when the answer is referenced by saved picks, wagers, votes, winner settings, or result history. In that case, use **Archive Answer**.

QuestionId/CategoryId and NomineeId/AnswerId remain permanent identifiers and do not change when visible wording is renamed.

## Deployment

This hotfix changes both Apps Script and the Cloudflare frontend.

1. Copy the hotfix files into the repository.
2. Run the tests.
3. Run `clasp push`.
4. If the web app uses fixed Apps Script versions, create a new deployment version.
5. Commit and push the frontend to GitHub/Cloudflare.
6. Hard-refresh the browser and fully quit/reopen the installed PWA.

Service worker cache: `awards-app-v258-canonical-game-setup-delete-answer`

## Focused retest

1. Open Game Setup.
2. Rename one question and one answer.
3. Save the changes.
4. Leave Game Setup completely.
5. Reopen it and confirm both new names remain.
6. On an unused test answer, click **Delete Answer** and confirm it disappears after reload.
7. On an answer with picks/results, confirm permanent deletion is blocked and Archive Answer remains available.
