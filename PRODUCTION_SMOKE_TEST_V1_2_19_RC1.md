# PATTC Predicts v1.2.19-rc1 — Production Smoke Test

Run this against the deployed production candidate. Record failures before making the release live to outside users.

## P0 — must pass

- [ ] Login on normal Safari/Chrome; refresh; session remains valid.
- [ ] Confirm browser requests for authenticated API actions use `/api/app` POST and do not put the session token in the request URL.
- [ ] Admin Home opens and shows current game/counts without loading Users, Categories/Nominees or External Results Inbox automatically.
- [ ] Admin → System & Automation → Check Automation Health loads successfully and reports fewer than 20 triggers.
- [ ] If safe duplicate durable triggers are reported, run cleanup and confirm one durable trigger remains for each worker.
- [ ] Manage Games opens.
- [ ] Create a test game from a built-in template; save; Run Check; Preview; activate only after check passes.
- [ ] Standard Prediction: make/change pick before lock; locked pick cannot change; settle; leaderboard updates.
- [ ] Confidence: build a week, submit confidence values, change before lock, settle, leaderboard updates.
- [ ] Ranking: rank answers, save/reload exact order, settle, leaderboard updates.
- [ ] Manual Survivor: make pick/advance/eliminate path works.
- [ ] Sports Survivor: week loads teams/schedule, pick saves, settlement advances/eliminates correctly.
- [ ] Streak Survivor: win/loss changes streak/multiplier correctly.
- [ ] King of the Hill: source scores load, lowest scores receive expected strikes, strike limit eliminates correctly.
- [ ] Team Fantasy: weekly selection page loads all positions; save/reload; score sync works.
- [ ] Voting / Competition: participant submits entry + phone photo; admin sees entry; ballot saves using configured ranking method.
- [ ] Awards Manager: search/load event, build/link questions, save, result enters expected approval flow.
- [ ] Reality TV Manager: cast/episode loads, result approval/resume works, next-episode automation completes.
- [ ] External Results Inbox loads on demand, validates, applies/stages correctly.
- [ ] No normal interactive save produces a 10–30 second UI lock or timeout.
- [ ] Git tag/commit, Apps Script deployed version and Cloudflare commit all point to the same release candidate.

## P1 — performance / concurrency

Target timings are user-perceived wall-clock timings on a normal connection.

- [ ] Home warm load: target <1.5s; cold load <3s.
- [ ] Open normal game: target <3s.
- [ ] Save one pick: target <2s preferred; <5s maximum.
- [ ] Batch pick/confidence save: target <3s preferred; <5s maximum.
- [ ] Leaderboard: target <3s.
- [ ] Admin Home: target <3s.
- [ ] Manage Games: target <4s.
- [ ] Run Check/simple Admin save: target <5s.
- [ ] With Sports + Survivor/KOTH + Team Fantasy + Confidence + Reality automation active together, player saves still meet the <5s maximum.
- [ ] Two browsers/users saving simultaneously do not overwrite one another or show repeated lock-timeout errors.
- [ ] Apps Script Executions dashboard shows no repeating failed worker and no execution approaching the 6-minute hard limit during normal operation.

## P1 — PWA/mobile

- [ ] iPhone Safari.
- [ ] Installed iPhone PWA.
- [ ] Android Chrome / installed PWA if available.
- [ ] Desktop Chrome.
- [ ] Desktop Safari.
- [ ] New deployment refreshes to the `v1219rc1-production-readiness` asset marker without requiring an incognito window.
- [ ] Ranking drag/drop or arrow fallback is usable on mobile.
- [ ] Voting photo upload works from phone camera/library.
- [ ] Team Fantasy weekly selection is readable and usable on phone.
- [ ] Push permission/subscription and targeted game notification test work on a supported installed PWA/browser.

## P1 — recovery

- [ ] Record current Git commit/tag.
- [ ] Record current Apps Script deployment ID + version.
- [ ] Confirm Cloudflare deployment from the same commit.
- [ ] Make a pre-launch spreadsheet backup/copy.
- [ ] Record Automation Health trigger inventory.
- [ ] Confirm previous known-good Apps Script version remains available for rollback.
- [ ] Confirm previous known-good Git commit can be redeployed to Cloudflare.

## Certification

Do not mark v1.2.19-rc1 as production-certified until all P0 items and all applicable P1 items pass. Minor visual polish may remain after certification only if it cannot affect scoring, saving, locks, access, automation or recovery.
