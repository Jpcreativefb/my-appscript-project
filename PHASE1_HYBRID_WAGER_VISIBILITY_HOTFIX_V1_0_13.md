# Phase 1 Hybrid Wager Visibility Hotfix v1.0.13

## Problem

A Hybrid game could show its fixed-point question under Make Picks but show no question under Place Wagers, even though Game Setup showed the second question as Score Mode `wager`.

The Wager page was reading the player-facing category projection while Game Setup writes to canonical Questions, QuestionOptions, and raw CategorySettings. A stale or incomplete projection could therefore hide the newly saved wager question.

## Correction

- Hybrid wager options now read the same canonical Game Setup source used by the editor.
- Active questions and active answers are rebuilt from the canonical setup before wager filtering.
- Raw CategorySettings overrides stale player projections.
- `sports-wager` and `wager-odds` are normalized to `wager` for backward compatibility.
- Manual wagers continue to use default even odds when no sports/external odds source is attached.

## Deployment

This is an Apps Script backend change.

1. Copy the changed files into the repository.
2. Run the focused and existing regression tests.
3. Run `clasp push`.
4. Update the fixed Apps Script web-app deployment to a new version when applicable.
5. Commit and push to GitHub.

No Cloudflare cache change is required because no frontend file changed.
