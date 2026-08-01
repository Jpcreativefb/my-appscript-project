# Phase 1 Hybrid Question ScoreMode Hotfix v1.0.14

## Problem
Hybrid games could be returned to the Game Setup editor with `type: hybrid` or legacy hybrid flags. The editor only recognized `mixed` and `combo`, so it treated the game as a non-Hybrid Prediction game and rendered each question as locked `fixed-points`. Saving then submitted that default and replaced a Wager question's mode.

## Fix
- Canonicalizes `hybrid`, `mixed`, `combo`, `MixedGame`, `GameFormat=hybrid`, and `ScoringMode=hybrid` as the same Hybrid type.
- Keeps Score Mode editable per question for Hybrid games.
- Preserves requested Hybrid question ScoreMode in the backend even when an older type normalizer falls back to Prediction.
- Bumps the PWA cache to `awards-app-v262-hybrid-question-scoremode`.

## Expected behavior
A Hybrid question saved as Wager remains Wager after Save, closing Game Setup, reopening it, running Check, and opening Place Wagers. Answer/Nominee records do not have their own Score Mode; they inherit the question's mode.
