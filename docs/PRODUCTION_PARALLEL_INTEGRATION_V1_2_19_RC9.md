# PATTC Predicts v1.2.19-rc9 — Parallel Hardening Integration

Baseline: `ba38ccd` (v1.2.19-rc8 Sports Wager Integrity Certification)

This release integrates three independently isolated work streams:

- Kent: Ranking, Voting, and Sports Survivor hardening plus regression coverage for KOTH pacing/tie safeguards.
- Ted: Reality TV cast/result hardening and resumable Awards question building.
- Roy: Sports Scores Engine v48 production hardening and integration certification.

Sports Engine v48 adds workbook-capacity protection, SportsLogs retention/grid maintenance, operational odds-limit migration, safer odds logging/locking, and local-timezone score-window filtering. During combined regression testing Roy also added a Node-safe timezone formatter fallback so the Apps Script timezone fix remains compatible with the repository's Node regression harness.

No frontend files changed in this release, so Cloudflare deployment is not required. The main Awards App Apps Script backend and the separate Sports Scores Engine Apps Script project both require deployment.

Production gate at package build:

- 143 JavaScript files syntax-checked.
- Frontend API/app mirrors synchronized.
- 189 regression test files passed.
- Legacy v1.2.16 and v1.2.19 RC1–RC9 certification contracts passed.
- Sports Engine v48 hardening: 15/15 checks passed.
- `git diff --check`: passed.
