# PATTC Predicts v1.2.19-rc14 — Team Fantasy + Sports Certification Fixes

Baseline: `8ec8ed5b43b83037effe32f46820d9a17dc99f71` (RC13)

This Roy integration release combines two isolated, non-overlapping handoffs:

- Kent — Team Fantasy Home Hub + notification/reminder reliability.
- Sport — RC13 small Sports reliability follow-up.

## Kent
- Home Hub Team Fantasy picks-remaining count for 8-position and AFC/NFC lineups.
- TEST/Test Only safety for Team Fantasy manual reminders.
- Thursday/Sunday/final-window reminder execution.
- Kickoff-aware automatic reminders.
- Team Fantasy + Notification Center reminder AND-gate.
- Correct 5-minute sync label.

## Sport
- Odds `commenceTimeFrom` / `commenceTimeTo` exact UTC-second formatting.
- Operational Odds error separated from diagnostic logging warnings.
- MLB probable starting-pitcher ingestion from ESPN scoreboard data.
- Smart Sync result message persistence.
- No risky redesign of remaining cross-project games-load latency.

## Deployment
Roy installer deploys:
1. Main Awards App Apps Script.
2. Separate Sports Scores Engine Apps Script.
3. GitHub `architecture-cleanup`, which triggers Cloudflare Pages for changed frontend assets.

Parallel streams did not deploy production directly.
