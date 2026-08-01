# Phase 1 Canonical Question Mode Hotfix v1.0.15

## Why this is a different fix

Earlier builds stored question `ScoreMode` only in `CategorySettings`, while the visible question itself lived in `Questions`. Several loaders, duplicate rows, game-type defaults, and compatibility projections could disagree and replace `wager` with `fixed-points`.

v1.0.15 removes that conflict:

- `Questions.ScoreMode` is now the single source of truth.
- `CategorySettings.ScoreMode` remains only as a compatibility mirror for older scoring engines.
- Game Type supplies the default only when a new question is created.
- Saving, renaming, editing answers, bulk saving, preflight, and reopening Game Setup cannot rewrite an explicit question mode.
- Answers/nominees inherit the parent question mode and do not store their own mode.

## Automatic sheet change

The next backend use automatically appends a `ScoreMode` column to the `Questions` sheet if it does not exist. No manual header edit is required.

## Deployment

1. Copy the changed files into the repository.
2. Run the tests.
3. Run `clasp push`.
4. Update the Apps Script web-app deployment to a New version if fixed versions are used.
5. Push the frontend to GitHub and wait for Cloudflare.
6. Hard-refresh and fully reopen the PWA.

Service-worker cache: `awards-app-v263-canonical-question-scoremode`

## One-time Hybrid repair test

After deployment:

1. Open the Hybrid game in Game Setup.
2. Open the intended wager question.
3. Set Score Mode to `Wager` once.
4. Save Question.
5. Open the `Questions` sheet and confirm that question's `ScoreMode` cell says `wager`.
6. Close Game Setup completely and reopen it.
7. Confirm it still says `Wager`.
8. Edit and save an answer. Reopen again and confirm the parent question remains `Wager`.
9. Open the Hybrid game as a player and select Place Wagers.

Do not expect `QuestionOptions` or nominee/answer rows to have a separate ScoreMode. They inherit the question's mode.
