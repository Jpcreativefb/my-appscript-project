'use strict';
const fs = require('fs');
const assert = require('assert');
function read(p) { return fs.readFileSync(p, 'utf8'); }

const front = read('frontend/js/pages/adminRealityTv.js');
const engine = read('backend/engines/RealityTvSeasonEngine.js');
const pack = read('backend/engines/RealityTvQuestionPackEngine.js');
const api = read('backend/Api.js');
const frontApi = read('frontend/js/api.js');

assert(front.includes('New Season Cast Sheet'), 'new-season cast staging card missing');
assert(front.includes('Prepare / Open New Season Cast Sheet'), 'new-season prepare button missing');
assert(front.includes('Load Selected Cast Into Season'), 'new-season load cast button missing');
assert(front.includes('castDraftSeasonId'), 'draft season id must flow into create payload');
assert(engine.includes('function apiAdminPrepareRealityCastDraft'), 'draft prepare backend missing');
assert(engine.includes('function apiAdminLoadRealityCastDraft'), 'draft load backend missing');
assert(engine.includes('realityTvFinalizeCastDraftForSeason_'), 'draft rows must become real season rows');

assert(front.includes('Bulk Group / Tribe Change'), 'bulk group UI missing');
assert(front.includes('Move Selected Participants'), 'bulk group action missing');
assert(engine.includes('function apiAdminBulkUpdateRealityTvContestantGroups'), 'bulk group backend missing');
assert(engine.includes('Historical assignments were preserved'), 'bulk group history preservation contract missing');

assert(front.includes('Team / Tribe → Individual Play'), 'individual play automation UI missing');
assert(front.includes('Start Next ${adminRealityTvEscape_(season.PeriodLabel || "Episode")}'), 'next-period individual play action missing');
assert(engine.includes('function apiAdminSetRealityTvIndividualPlay'), 'individual play backend missing');
assert(pack.includes('automaticIndividualPlay = individualStart === 0 && groups.length < 2'), 'automatic group-to-individual transition missing');
assert(pack.includes('fewer than two active groups remain'), 'automatic transition skip reason missing');

assert(front.includes('fire-making-winner'), 'Survivor fire-making UI template missing');
assert(pack.includes('templateId: "fire-making-winner"'), 'Survivor fire-making backend template missing');
assert(pack.includes('No fire-making challenge'), 'fire-making no-outcome option missing');

assert(engine.includes('"ExitReason"'), 'contestant exit reason storage missing');
assert(engine.includes('"ExitReasonsJSON"'), 'per-contestant exit reason storage missing');
assert(front.includes('data-exit-reason-for'), 'per-contestant exit reason selector missing');
assert(front.includes('fire-making-loss'), 'fire-making exit reason missing');
assert(front.includes('banished'), 'banishment exit reason missing');
assert(front.includes('murdered'), 'murder exit reason missing');
assert(front.includes('race-elimination'), 'race exit reason missing');
assert(engine.includes('realityTvStatusForExitReason_'), 'exit reason status mapper missing');
assert(engine.includes('Status: realityTvStatusForExitReason_'), 'settlement must use per-contestant exit reason');
assert(engine.includes('ExitReasonsJSON: JSON.stringify(exitReasons)'), 'exit reasons must persist in queue/episode');

assert(front.includes('Approve, Finalize &amp; Advance'), 'finalize/advance production label missing');
assert(front.includes('queue the next episode separately when automatic next-period creation is enabled'), 'advance confirmation missing');

['adminPrepareRealityCastDraft','adminPreviewRealityCastDraft','adminLoadRealityCastDraft','adminBulkUpdateRealityTvContestantGroups','adminSetRealityTvIndividualPlay'].forEach(action => {
  assert(api.includes('action === "' + action + '"'), action + ' backend route missing');
  assert(frontApi.includes('"' + action + '"'), action + ' frontend wrapper missing');
});

assert(front.includes('rt-roster-known-for'), 'Known For create-season field missing');
assert(front.includes('rt-roster-original-show'), 'Original Show/Sport create-season field missing');
assert(front.includes('rt-roster-recruit-number'), 'Recruit Number create-season field missing');
assert(front.includes('rt-roster-source-url'), 'source URL create-season field missing');
assert(engine.includes('KnownFor: realityTvString_(item.knownFor || item.KnownFor)'), 'Known For must survive season creation');
assert(engine.includes('OriginalShowOrSport: realityTvString_(item.originalShowOrSport || item.OriginalShowOrSport)'), 'Original Show/Sport must survive season creation');

console.log('Reality TV production automation v1.2.18n tests passed.');


const notifications = read('backend/engines/NotificationsEngine.js');
const teamFantasy = read('backend/engines/SportsTeamFantasyEngine.js');
assert(notifications.includes('teamFantasyNotificationOutstandingSummary_'), 'Team Fantasy notification bridge must remain present');
assert(notifications.includes('v1.2.18j AUTOMATIC OUTSTANDING-PICK REMINDER SCHEDULING'), 'automatic pick reminder scheduler must remain present');
assert(teamFantasy.includes('function teamFantasyNotificationOutstandingSummary_('), 'Team Fantasy outstanding-pick helper must remain present');

const app = read('frontend/js/app.js');
const appMirror = read('frontend/app.js');
assert(app.includes('v1218n-reality-production-automation'), '18n app marker missing');
assert(appMirror.includes('v1218n-reality-production-automation'), '18n app mirror marker missing');
