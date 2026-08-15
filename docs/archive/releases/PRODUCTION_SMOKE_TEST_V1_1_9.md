# Production Smoke Test — v1.1.9

## Deploy

1. Push the `backend` folder with clasp.
2. Create a new Apps Script web-app deployment version.
3. Update the frontend API URL only if the deployment URL changed.
4. Deploy the complete `frontend` folder to Cloudflare Pages.
5. Hard refresh once. The asset version is `309-reality-tv-extra-question-readiness`.

## Existing MasterChef repair

1. Open Reality TV Manager and expand MasterChef 16.
2. Open **Extra Episode Questions**.
3. Confirm the master status button appears.
4. Click it and review the stages.
5. Select the four cooking questions.
6. Click **Build / Repair Now** or **Save Format & Build Current Episode** once.
7. Confirm the status progresses to `READY · 4/4`.
8. Confirm `RealityQuestionTemplates` contains only the four cooking presets plus legitimate MasterChef custom questions.
9. Confirm the old invalid judge custom question can be deleted individually.

## Survivor regression

1. Expand Survivor.
2. Confirm only Survivor presets plus Survivor custom questions are visible.
3. Select Idol Finder and build.
4. Confirm it is inserted rather than skipped due to an old disabled flag.
5. Unselect it, save again, and confirm it remains out of future builds.

## Custom-question test

1. Create a manual-answer question with three judge names.
2. Save once.
3. Confirm it appears automatically in the current episode and shows **Ready in episode**.
4. Confirm the master status count includes it.
5. Delete it before any player picks.
6. Confirm its current episode category and reusable template are removed.

## Interruption test

1. Start a build and close or refresh the browser immediately.
2. Reopen the manager after the continuation trigger runs.
3. Confirm the build advanced or completed without duplicate questions.
4. If a question lacks enough answers, confirm the master status shows **Needs attention** rather than falsely reporting ready.

## Completion criteria

- MasterChef current episode: green `READY` status.
- Survivor current episode: green `READY` status.
- No cross-theme preset rows are used by either season.
- Every selected question has at least two verified answers.
- Custom delete works and protects played history.
- Hub mapping failures do not block local readiness.
