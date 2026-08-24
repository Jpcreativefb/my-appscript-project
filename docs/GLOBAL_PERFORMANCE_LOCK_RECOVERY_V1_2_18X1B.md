# PATTC Predicts v1.2.18x1b — Global Performance + Lock Contention Recovery

## Problem
Interactive page loads and saves had regressed to roughly 20–30 seconds with frequent lock timeouts. Background Sports jobs and notification reminders shared the same long-held ScriptLock used by player/admin writes. Several write paths also cleared broad application caches, forcing repeated cold Google Sheets reads on subsequent navigation.

## Recovery
- Sports score/smart automation and automatic pick reminders use short atomic leases. The global ScriptLock is held only while claiming/releasing the lease, not while doing external/network/Sheet work.
- Interactive Picks, Wagers, Ranking, Voting, Settings, Appearance, Game Setup and Confidence writes prefer the document lock with safe script-lock fallback.
- Player/admin lock waits are capped at approximately 2.5–5 seconds instead of 10–30 seconds.
- Wager validation runs before acquiring the write lock; the lock is released immediately after the Sheet mutation and before summary rebuild/cache work.
- Ranking updates only the current ballot's rows instead of clearing and rewriting RankingEntries.
- Sports automation batches suppress repeated cache clears and invalidate affected game data once per run.
- App cache TTL increases from 120 to 600 seconds; write paths explicitly invalidate affected data.
- Public play/dashboard pages retain an in-memory DOM snapshot. Revisited pages paint immediately; stale snapshots refresh quietly without another full-screen loader.
- Sports Scores & Game Builder is restored from Admin and is gated to admin sessions.

## Performance target
Normal interactive saves should ordinarily complete below 5 seconds, with lock contention itself capped below 5 seconds. Actual production time still depends on Google Apps Script/Sheets latency, so post-deploy timing should be verified from the player UI.
