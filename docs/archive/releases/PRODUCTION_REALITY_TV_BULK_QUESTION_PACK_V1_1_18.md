# Reality TV Bulk Extra Question Materializer v1.1.18

## Problem removed

The approval process previously built each enabled Extra Question separately. Every question repeated large Game Setup reads and individual Sheet writes, which caused long `0 of 4` stalls, lock contention, timeouts, and misleading progress.

## New production path

Main-elimination approval now creates the next episode, compiles all enabled Extra Questions and their answers in memory, and writes them in a small number of bulk operations. The generic background question worker does not compete with approval-owned builds.

Real checkpoints are shown for compiling, writing, and verification. The percentage cannot move backward. Only one Reality TV approval owns shared Game Setup writes at a time; later approvals visibly wait and continue automatically.

## Recovery

The bulk pass is idempotent and wrapped in bounded retries. After a temporary Sheets or lock failure, use **Resume Approval**. Use **Reset Stuck Approval** only when the saved checkpoint is older than two minutes and Resume returns the same error.

## Deployment

This release changes Apps Script backend and Cloudflare frontend files. Run `clasp push`, create a new version of the existing Apps Script web deployment, push to GitHub, allow Cloudflare Pages to deploy, and hard-refresh the app.
