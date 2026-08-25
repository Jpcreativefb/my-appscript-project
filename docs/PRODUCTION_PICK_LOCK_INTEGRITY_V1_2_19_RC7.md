# PATTC Predicts v1.2.19-rc7 — Pick Lock Integrity Certification

## Scope

RC7 is a targeted production-integrity correction found during live Standard Prediction certification. It does not change scoring formulas or game templates.

## Correctness changes

- `LockAllPicks` is enforced server-side by standard single-pick, standard batch, and Confidence batch writes.
- Draft, Setup, Preview, archive, and finalized states are also non-editable at the server boundary.
- Picks UI applies the global game lock as well as per-question locks.
- Dashboard lock state can override a warm startup snapshot immediately on normal Home → Game navigation.
- Standard autosaves update the durable local startup payload after confirmed success.
- RC7 uses a new durable snapshot namespace to retire any pre-fix snapshot.
- The regular-profile choice is remembered locally before waiting on the profile-prompt server write.

## Live retest

1. Confirm the existing Team Alpha pick is still visible after the game is globally locked.
2. Confirm both answers are disabled and a change cannot be saved.
3. Confirm the Picks sheet timestamp/nominee does not change during the locked attempt.
4. Unlock Player Entries and confirm the saved pick remains visible and can be changed.
5. Re-enter a fresh test game and confirm Use Regular Profile does not reopen the prompt.
