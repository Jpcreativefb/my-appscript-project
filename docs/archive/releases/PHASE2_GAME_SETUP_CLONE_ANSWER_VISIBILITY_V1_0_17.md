# Phase 2 Game Setup Clone / Answer Visibility v1.0.17

## Purpose

This update prepares the main Awards App Game Setup page for Reality TV and other repeat-question workflows.

It fixes the confusing behavior where a clone, newly created answer, or deleted answer completed successfully but the page reloaded with every card collapsed.

## What changed

### 1. Permanent clone identification

A cloned question now stores its origin in the normalized `Questions.PayloadJSON` record:

- `CloneSourceGameId`
- `CloneSourceCategoryId`
- `ClonedAt`
- `SourceSystem = admin-clone`

The Game Setup question summary displays a permanent:

`Clone of <source-question-id>`

label. This does not add columns to `Categories`, `CategorySettings`, or `Questions`.

Immediately after cloning, the card also displays a temporary `JUST CLONED` badge.

### 2. Answers are visible immediately

After these actions, Game Setup automatically reopens and scrolls to the affected question:

- Create question
- Clone question
- Add one answer
- Bulk add answers
- Clone answer
- Delete answer

The `Nominees / Answers` section opens automatically. New or cloned answers are highlighted with a `NEW` badge.

### 3. Visible answer deletion

Every answer summary now has a visible `Delete` button. The administrator no longer needs to expand the full answer editor to find deletion.

Deletion still uses the existing two confirmations. The backend continues to block permanent deletion when picks, wagers, or result history require the answer to be archived instead.

After a successful deletion, the question and remaining answer list reopen automatically.

## Files changed

- `backend/admin/AdminCategories.js`
- `frontend/js/pages/adminGameSetup.js`
- `frontend/css/styles.css`
- `frontend/sw.js`
- `tests/game_setup_clone_answer_visibility_tests.js`

## Installation

### Backend

Copy or merge:

- `backend/admin/AdminCategories.js`

Then run:

```bash
clasp push
```

Redeploy the Apps Script web app if your deployment does not automatically use the latest code.

### Frontend

Deploy these files to Cloudflare Pages through the normal GitHub workflow:

- `frontend/js/pages/adminGameSetup.js`
- `frontend/css/styles.css`
- `frontend/sw.js`

The service-worker cache name was changed so browsers load the updated Game Setup page.

## Focused test

1. Open a test game in Game Setup.
2. Clone one question with `Copy answers / nominees` checked.
3. Confirm the cloned question opens automatically.
4. Confirm it displays `JUST CLONED` and `Clone of <source ID>`.
5. Confirm the copied answers are immediately visible and marked `NEW`.
6. Refresh the page.
7. Confirm `JUST CLONED` is gone but `Clone of <source ID>` remains.
8. Click the visible `Delete` button beside a test answer.
9. Complete both confirmations.
10. Confirm the same question reopens and the deleted answer is gone.
11. Add one answer and bulk-add several answers.
12. Confirm each action reopens the answer list and highlights the new rows.

## Data safety

- No game, question, answer, pick, wager, balance, result, or leaderboard schema was replaced.
- Clone origin is stored in normalized question `PayloadJSON` rather than new sheet columns.
- Existing delete protections remain active.
