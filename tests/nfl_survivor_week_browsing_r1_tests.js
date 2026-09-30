'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=process.argv[2]||process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const be=read('backend/engines/SportsSurvivorEngine.js');
const r4=read('frontend/js/pages/survivorR4.js');
const css=read('frontend/css/survivor-r4.css');

assert(be.includes('NFL_SURVIVOR_WEEK_BROWSER_R1'));
assert(r4.includes('NFL_SURVIVOR_WEEK_BROWSER_UI_R1'));
assert(css.includes('NFL_SURVIVOR_WEEK_BROWSER_NAV_R1'));

// Week browsing is derived from the already-resolved official NFL week.
assert(be.includes('const resolvedWeek = Math.max'));
assert(be.includes('state.resolvedWeek'));
assert(be.includes('relation === "past"'));
assert(be.includes('relation === "future"'));
assert(be.includes('state.weekRounds'));
assert(!be.includes('NFL_SURVIVOR_WEEK_BROWSER_R1_MONDAY'));
assert(be.includes('pattcNflResolveCurrentWeek_')); // existing engine contract remains present.

// Past/current/future picker semantics and default current week.
assert(r4.includes('— CURRENT'));
assert(r4.includes('— PAST'));
assert(r4.includes('— UPCOMING'));
assert(r4.includes('selectedWeek=official'));
assert(r4.includes('payload.resolvedWeek'));
assert(r4.includes('Past weeks are read-only. Future built weeks can be picked in advance.'));

// Advance saves are no longer restricted to currentRound only.
assert(be.includes('const targetRound = (state.weekRounds || []).find'));
assert(be.includes('if (!targetRound.canPick)'));
assert(be.includes('week:targetRound.week'));

// Cross-week one-use protection reuses evaluation.usage on backend and is refreshed locally after save/clear.
assert(be.includes('sportsSurvivorOptionEligible_(meta, rules, evaluation.usage, selected, settings)'));
assert(r4.includes('function recalcUsage(payload)'));
assert(r4.includes('usedElsewhere>=limit'));
assert(r4.includes('team.unavailableReason="used"'));

// Clear Pick: editable current/future only; no AutoPick preference mutation.
assert(be.includes('NFL_SURVIVOR_WEEK_BROWSER_CLEAR_SENTINEL_ = "__clear__"'));
assert(be.includes('sportsSurvivorSavePickMeta_(gameId, username, categoryId, [], [], 0)'));
assert(be.includes('autoPickPreferencePreserved:true'));
assert(r4.includes('survivorRecoveryR5ClearPick_'));
assert(r4.includes('round.canPick===true&&round.relation!=="past"'));
assert(r4.includes('nomineeId:"__clear__"'));
assert(r4.includes('AutoPick settings stay unchanged.'));
assert(r4.includes('root.confirm("Clear your saved Survivor pick for Week "'));

// Started picks remain locked by the existing team-kickoff contract.
assert(be.includes('settings.pickLockMode === "team-kickoff"'));
assert(be.includes('Date.now() >= kickoff.getTime()'));
assert(be.includes('selectedStarted'));

// AutoPick stays preference-only and controls are interactively enabled even with admin execution gate off.
assert(r4.includes('Auto Pick is your missed-pick protection preference'));
assert(r4.includes('["survivorR4AutoTrigger","survivorR3AutoScope"]'));
assert(r4.includes('node.disabled=false'));
assert(r4.includes('survivorR3AutoStrategy'));
assert(r4.includes('save.disabled=false'));
assert(r4.includes('Use Random Pick on the Survivor page when you want an immediate random choice.'));

// Navigation arrows remain existing carousel controls; presentation is enlarged/outward only.
assert(css.includes('grid-template-columns:56px minmax(130px,1fr) 56px'));
assert(css.includes('width:54px!important'));
assert(css.includes('height:54px!important'));
assert(css.includes('font-size:.82rem!important'));
assert(r4.includes('survivorRecoveryR3RestoreMatchupIndex_(0)'));

// The accepted performance wrapper remains after the week wrapper so it surrounds all state reads.
const weekIndex=be.indexOf('NFL_SURVIVOR_WEEK_BROWSER_R1');
const cacheIndex=be.indexOf('NFL SURVIVOR PLAYER EXPERIENCE R1');
assert(weekIndex>=0&&cacheIndex>weekIndex);
assert(be.includes('NFL_SURVIVOR_PLAYER_R1_REQUEST_CACHE'));

console.log('NFL Survivor week browsing / clear / AutoPick / navigation R1: PASS');
