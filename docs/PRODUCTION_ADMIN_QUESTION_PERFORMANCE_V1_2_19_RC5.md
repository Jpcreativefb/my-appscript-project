# PATTC Predicts v1.2.19-rc5 — Admin Question Performance Certification

## Live blocker measured

During functional production certification on the Standard Prediction test game:

- Categories / Questions / Nominees first load: **20+ seconds**
- Create one question: **~30 seconds** plus another setup refresh
- Add first answer: **~75 seconds**
- Add second answer: **~75 seconds**

The question and both answers were saved correctly, so this was a latency/blocking defect rather than a data-loss defect.

## Root cause

The Admin setup path was bypassing the normalized DataIndex, forcing legacy synchronization / full GameId scans, rereading the entire CategorySettings sheet, and rebuilding whole-sheet normalized indexes during single-row writes. Each successful question/answer save then navigated back through the same expensive setup loader.

## RC5 correction

RC5 keeps normalized Questions / QuestionOptions as the canonical admin source and uses game-scoped indexed reads. Single-row mutations update only the affected game index entry. CategorySettings uses a GameId TextFinder fast path with legacy compatibility fallback. Question/answer create actions avoid full Admin setup construction when only duplicate/category validation is required. Same-page refreshes suppress the full-screen loader.

## Live acceptance target

Re-test the same disposable Standard Prediction game:

1. Open Categories / Questions / Nominees.
2. Create one new question.
3. Add two answers individually.

Target: each ordinary operation should complete in a few seconds, with no 20–75 second blocking operation and no full-screen loader during the same-page question/answer refresh.
