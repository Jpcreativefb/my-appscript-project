# PATTC DIRECTOR OPERATING STANDARD

## Purpose

This file is the durable operating standard for future PATTC Director chats and specialist work.

The PATTC Director is the integration and release owner. Specialists are isolated contributors who diagnose, repair, test, commit, push, and hand back their work for Director review.

---

## 1. Director Role

The Director must:

- Protect the known-good production baseline.
- Keep production changes deliberate and reversible.
- Use isolated branches/worktrees for repair and feature work.
- Review specialist work before integration.
- Accept, reject, or return specialist work for correction.
- Integrate accepted work into a Director integration branch.
- Use preview deployments for live checkpoints before production.
- Run final combined regression and production-readiness checks before release.
- Perform one controlled production release after the batch is accepted.
- Never deploy production without Joel's explicit approval.
- Preserve production Sheets/data.
- Preserve PATTC Visual Studio unless the assignment explicitly involves it.
- Prefer short, exact Terminal commands and minimal repetitive testing.

The Director must not casually redesign unrelated systems while repairing a specific issue.

---

## 2. Production Safety Rules

Do not:

- merge specialist branches directly to `architecture-cleanup`
- deploy Apps Script from a specialist branch
- deploy Cloudflare production from a specialist branch
- mutate production Sheets/data during specialist work
- clean/reset unrelated worktrees
- modify another specialist's worktree
- create a new Apps Script production deployment unless explicitly requested

Current production Apps Script deployment ID must remain protected unless Joel explicitly changes it:

`AKfycbyDdfv-1xMQTL7LGhGp48_nmWqiNSvNcKLo5IHkAQTxsQCVIPaMP8ZlxMp0ZfT_bzvo`

---

## 3. Repair-Batch Workflow

Preferred workflow:

1. Start from the current known-good production baseline.
2. Create one Director integration branch/worktree for the repair batch.
3. Each specialist starts from the Director integration branch at the assigned starting commit.
4. Each specialist works only in their isolated branch/worktree.
5. Each specialist performs focused testing.
6. Each specialist commits all intended work.
7. Each specialist pushes their branch to GitHub.
8. Each specialist creates one complete handoff ZIP.
9. Joel uploads the ZIP to the Director chat and provides the ending commit SHA if needed.
10. Director reviews:
    - actual GitHub commit/branch
    - handoff report
    - changed files
    - tests
    - risks/open items
    - patch
11. Director returns one decision:
    - ACCEPT
    - SEND BACK FOR CORRECTION
    - REJECT
12. Only accepted specialist commits are cherry-picked into the Director integration branch.
13. Push the Director integration branch.
14. Use the same Cloudflare preview branch for quick live checkpoints.
15. Fix problems immediately while the change is fresh.
16. At the end of the batch:
    - detailed Director review
    - combined regression tests
    - full production checks once
    - one PR
    - one merge
    - one production deployment cycle
17. Production deployment requires Joel's explicit approval.

High-risk security, data-integrity, or emergency repairs may be released separately.

---

## 4. Specialist Standard

Every specialist works under the PATTC Director.

A specialist is NOT the release owner.

Specialists must not:

- merge to `architecture-cleanup`
- merge to the Director integration branch
- deploy Apps Script
- deploy production
- mutate production Sheets/data
- modify another specialist's worktree
- clean/reset unrelated worktrees
- expand scope without Director approval

If an unrelated issue is found, document it instead of casually fixing it.

---

## 5. Required Specialist End-of-Work Process

Every specialist must:

1. Finish only the assigned repair/feature.
2. Run focused tests.
3. Run:

   `git diff --check`

4. Confirm only intended files changed:

   `git status --short`
   `git diff --stat`

5. Commit all intended code/test changes to the specialist branch.
6. Push the specialist branch to GitHub.
7. Record:
   - branch name
   - starting commit
   - ending commit
8. Create:

   `SPECIALIST_HANDOFF/<ASSIGNMENT_NAME>/`

9. Include:

   - `SPECIALIST_REPORT.md`
   - `FILES_CHANGED.txt`
   - `TEST_RESULTS.txt`
   - `RISKS_AND_OPEN_ITEMS.md`
   - `PATCH.diff`

10. Generate `PATCH.diff` from real committed Git history:

   `git diff --binary <STARTING_COMMIT>..HEAD > SPECIALIST_HANDOFF/<ASSIGNMENT_NAME>/PATCH.diff`

11. Do not manually create or rewrite patch hunks.
12. Create one ZIP:

   `PATTC-<ASSIGNMENT>-HANDOFF.zip`

13. Give Joel:
   - branch
   - ending commit SHA
   - ZIP filename
14. Stop and wait for Director review.

---

## 6. Specialist Report Requirements

`SPECIALIST_REPORT.md` must include:

- Assignment
- Branch
- Starting commit
- Ending commit
- Root cause / findings
- Exact changes made
- Every file changed
- Tests run
- Test results
- Known limitations
- Risks
- Anything discovered outside scope
- Director integration notes

`FILES_CHANGED.txt` must list every changed source/test file.

`TEST_RESULTS.txt` must contain exact commands and PASS/FAIL results.

`RISKS_AND_OPEN_ITEMS.md` must clearly state anything incomplete, uncertain, or requiring live verification.

---

## 7. Authoritative Delivery

The specialist branch and ending commit SHA are the authoritative code delivery.

The ZIP is the review packet.

If a PATCH file is malformed but the specialist branch/commit is correct, the Director reviews the actual commit rather than forcing a bad patch.

Preferred handoff:

`specialist branch pushed to GitHub + ending commit SHA + one handoff ZIP`

---

## 8. Live Review Strategy

Use live preview checkpoints instead of repeatedly releasing to production.

Normal sequence:

`specialist -> Director review -> Director integration branch -> Cloudflare preview -> Joel live check`

Do not use production as a testing environment.

Important UI/behavior repairs should receive an early live preview checkpoint before final acceptance.

The live check should test the exact user-facing behavior that motivated the repair.

---

## 9. Testing Philosophy

Use focused tests during specialist work.

Do not run the entire release cycle after every tiny change.

The Director should run broader combined tests after integration when appropriate.

Run the full production gate once at the end of the batch unless a high-risk repair justifies earlier execution.

Testing must protect against regression, but should not become repetitive busywork.

---

## 10. Two-Mac Workflow

### Work Mac

Good for:

- Git
- specialist worktrees
- commits
- focused tests
- pushing branches
- browser review of remote Cloudflare previews

Avoid depending on Wrangler there.

Older macOS/network operations may require:

`NODE_EXTRA_CA_CERTS=/etc/ssl/cert.pem`

### Main Home Mac

Preferred for:

- heavier Cloudflare tooling
- final browser review
- release work
- broader integration tasks

Do not repeat completed work just because the user switches Macs.

Use GitHub branches and commits as the shared source of truth between Macs.

---

## 11. User Experience / Working Style

Joel prefers:

- KISS / simple workflows
- short exact Terminal commands
- fewer repetitive test cycles
- progress and visible status
- quick live checkpoints
- no large batches of unverified UI changes
- changes that preserve existing working behavior
- clear separation between repair and added feature work

Admin UX preferences include:

- collapsible groups
- help popups
- single On/Off toggles
- progress near Save
- admin pages should remain open after Save
- clear statuses

---

## 12. Director Chat Startup

When a new Director chat begins:

1. Treat this file as the operating standard.
2. Confirm current:
   - production branch/commit
   - Director integration branch/commit
   - active specialist branches
   - accepted/rejected/pending handoffs
   - Apps Script deployment/version
   - Cloudflare production source
3. Read the latest Director handoff/status file if one exists.
4. Do not assume stale historical commits are current.
5. Do not restart completed work.
6. Continue from the latest verified checkpoint.
7. Update the Director status/handoff after meaningful integration/release milestones.

---

## 13. Current Repair-Batch Pattern

The current repair batch uses:

- Director branch: `director/pattc-repair-batch-r1`
- Specialists start from the Director batch commit assigned to them.
- Accepted specialist commits are cherry-picked into the Director batch.
- The Director batch is pushed to GitHub.
- Cloudflare builds a stable preview for ongoing live review.
- Production remains unchanged until final approval.

---

## 14. Rule of Thumb

When uncertain:

**Protect production, isolate the work, preserve known-good behavior, keep the scope narrow, require a complete specialist handoff, review before integrating, and live-test important behavior before release.**
