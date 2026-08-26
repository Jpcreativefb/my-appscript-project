# PATTC Predicts v1.2.19-rc13 — Sports Live Reliability

Roy integration release built on the deployed RC12 baseline:

- Branch: `architecture-cleanup`
- Required Git baseline: `2d959a13f3136e9eecb34f517c60e4b50348ac05`
- Starting Awards App Apps Script: v370
- Starting Sports Scores Engine: v50

Source checkpoint: Sport RC11 Live Sports Reliability handoff based on RC11 `86a724b172321585ae4fb013c671148a76cd6e89`.
RC12 Team Fantasy changed no files touched by the Sport checkpoint, so the Sport payload is integrated unchanged onto RC12.

## Fixes integrated

1. MLB probable-pitcher transport and diagnostics
   - narrow MLB summary HTTP 403 fallback through ESPN web API
   - safe proxy trace propagation
   - home/away roster-order fallback when explicit side metadata is absent
   - distinguishes missing event ID, transport failure, parser failure, and genuine TBD

2. MLB odds reliability
   - controlled odds refresh uses odds-only preparation instead of full Admin setup
   - `SportsOddsApiLog` / `OddsApiLog` setup is best-effort and nonfatal
   - diagnostic logging failure cannot turn a successful provider response into an odds refresh ERROR
   - 5/day and 100/month quota protections remain intact

3. Sports Controls startup
   - first paint skips write-heavy settings/odds/archive setup
   - trigger enumeration reused
   - Awards wager automation status deferred until after first paint

4. Sports Builder startup
   - league and score reads run concurrently
   - score cards render before supplemental usage/pitcher annotations complete

5. Smart Sync first-click feedback
   - immediate `Queueing` UI state is painted before the Apps Script request begins

## Runtime layers changed

- Awards App Apps Script
- Sports Scores Engine Apps Script
- Cloudflare Pages / Pages Function via GitHub push

No separate Sports Worker deployment is required.

## Live certification after deploy

- time Sports Controls cold first paint
- time Sports Builder first score-card paint
- verify announced MLB probable starters and inspect event/proxy diagnostics if still TBD
- run one controlled MLB odds refresh only when quota policy permits; diagnostic log contention must not produce ERROR
- click Smart Sync once and confirm immediate Queueing acknowledgement
