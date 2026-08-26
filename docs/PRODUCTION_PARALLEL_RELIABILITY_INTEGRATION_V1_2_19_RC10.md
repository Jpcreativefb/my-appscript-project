# PATTC Predicts v1.2.19-rc10 — Parallel Reliability Integration

Authoritative baseline: `0bea2aa491c73db0e024e51753ff4668cf5d9273`.

This integration combines the current isolated checkpoints from Kent, Ted, and Sport after RC9.

## Kent
- Sports Survivor / Streak Survivor delayed ATS-line settlement remains chronological.
- KOTH automatic pacing converges to one survivor at the configured final week.
- Voting scoring configuration freezes after the first ballot.

## Ted
- Reality multi-winner scoring is canonicalized between result display and leaderboard scoring.
- Sole Survivor / Season Anchor multiplier, elimination/replacement and Home Hub completion behavior are hardened.
- Reality episode questions support per-episode enable/disable and ordering while preserving season defaults.
- Spoiler Shield hides unrevealed Reality results per user/game/episode without delaying scoring or original lock times.
- Prior Reality/Awards RC9-next recovery, Awards retry/relink and result-flow hardening is retained.

## Sport
- Sports Engine Controls first paint is lightweight with large diagnostics deferred/cached.
- Manual Smart Sports Sync is queue-only.
- Sports Builder browser JSONP transport is replaced by authenticated Awards App server-bridge reads.
- Odds provider errors preserve and surface useful detail.
- Starting-pitcher ingestion handles side-keyed ESPN probable data plus conservative starter-roster fallback.
- Sports Engine v48 workbook/odds protections remain intact.

## Deployment
This release changes the main Awards App Apps Script project, the separate Sports Scores Engine Apps Script project, and Cloudflare Pages frontend files. The installer deploys both Apps Script projects. Pushing the integrated commit to GitHub triggers the configured Cloudflare Pages deployment.

No Sports-specific Cloudflare Worker source is changed by this release.
