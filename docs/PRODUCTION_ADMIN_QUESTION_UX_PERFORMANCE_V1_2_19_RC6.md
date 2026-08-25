# PATTC Predicts v1.2.19-rc6 — Admin Question UX Performance Certification

## Live RC5 retest

The RC5 data-path optimization improved answer creation substantially but did not meet production usability targets:

- Categories / Questions open: **19 seconds**
- Create question: **27 seconds**
- Add answer: **23–24 seconds**

The answer-create time dropping from ~75 seconds to ~23 seconds confirmed the RC5 storage change helped, but the editor was still waiting on a full 19-second Game Setup reload after every successful create.

## Root cause confirmed

The create-question and create-answer frontend handlers still navigated back to `admin-game-setup:<gameId>` after a successful write. That forced `adminGetGameSetup` to run again before the administrator could continue. The backend loader also still performed compatibility work that ordinary Prediction setup pages did not need: global question/game-map reconstruction, all-game question-mode cache invalidation, ranking-result decoration, and repeated schema checks.

## RC6 correction

- New questions and answers update the already-open Admin editor in place. Full page navigation is fallback-only.
- Question/answer create calls no longer force `SpreadsheetApp.flush()` before responding.
- Normalized writes can defer duplicate cache invalidation until the outer Admin transaction finishes.
- CategorySettings uses its direct `GameId` path before building legacy question/game compatibility metadata.
- Game-scoped cache invalidation no longer discards the global question/game map after every answer edit.
- Question mode reads are cached by game; question-mode writes invalidate only the affected game rather than the whole application.
- Ordinary Prediction setup loads skip CategoryResults ranking decoration.
- Repeated schema-header verification is cached for six hours.

## Acceptance target

On the existing disposable Standard Prediction game:

1. Open Categories / Questions.
2. Create a new question.
3. Add two answers individually.

Expected: the first editor open should be materially below the prior 19 seconds, while successful question/answer creates should leave the editor immediately usable without waiting for another full Game Setup reload. Ordinary writes should complete within a few seconds.
