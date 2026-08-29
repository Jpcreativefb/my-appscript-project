const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { assertCurrentReleaseMarkers } = require('../tools/release_test_helpers');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const season = fs.readFileSync(path.join(root, 'backend/engines/RealityTvSeasonEngine.js'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'frontend/js/pages/adminRealityTv.js'), 'utf8');
const app = fs.readFileSync(path.join(root, 'frontend/js/app.js'), 'utf8');
const appCompat = fs.readFileSync(path.join(root, 'frontend/app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'frontend/app.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'frontend/sw.js'), 'utf8');

// RC18 live-finalization contract: a dead claimed stage becomes reclaimable after
// two minutes. Race safety is no longer provided by a seven-minute lease; it is
// provided by the claim lock, ApprovalAttemptCount fencing, FINAL episode replay
// checks, and idempotent settlement writes.
assert(season.includes('const processingLeaseMs = 120000;'), 'RC18 must reclaim a dead approval worker after two minutes');
assert(season.includes('return heartbeat && (now - heartbeat) < 120000 ? 0 : 2;'), 'approval queue ownership must use the same two-minute recovery threshold');
assert(season.includes('stalledAfterSeconds: 120'), 'approval progress must expose the two-minute stale threshold');
assert(season.includes('ApprovalAttemptCount'), 'approval recovery must retain attempt fencing');
assert(season.includes('realityTvNumber_(currentAfterSettlement.ApprovalAttemptCount, 0) !== realityTvNumber_(attempts, 0)'), 'a reclaimed worker must not overwrite a newer settlement attempt');
assert(season.includes('Episode is already FINAL with a different result. Automatic recovery stopped to prevent duplicate roster mutation.'), 'FINAL episode recovery must fail closed on conflicting results');
assert(ui.includes('(reviewStatus === "APPROVING" && heartbeatAge >= 120)'), 'main approval stall UI must follow the two-minute server recovery lease');
assert(ui.includes('No new checkpoint has been saved for more than two minutes.'), 'stalled approval UI must describe the current two-minute recovery contract');

assert(season.includes('reviewStatus === "APPROVED" || currentStage === "COMPLETE"'), 'Stage claim must refuse an already-complete queue');
assert(season.includes('const currentAfterSettlement = realityTvSpreadsheetRetry_("Verify Reality TV settlement claim"'), 'SETTLE must re-check its claim before advancing');
assert(season.includes('realityTvNumber_(currentAfterSettlement.ApprovalAttemptCount, 0) !== realityTvNumber_(attempts, 0)'), 'A stale SETTLE worker must not overwrite a newer attempt');
assert(season.includes('Approved is authoritative; normalize the'), 'Approval-state polling must repair mixed approved/stale checkpoints');
assert(season.includes('PushStatus: "PUSHED"') && season.includes('ApprovalStage: "COMPLETE"'), 'Approved queue repair must canonicalize PUSHED/COMPLETE');
assert(ui.includes('if (reviewStatus === "APPROVED") stage = "COMPLETE";'), 'Frontend must always render approved queues as complete');
assertCurrentReleaseMarkers(assert, app, html, sw);
assert.strictEqual(app, appCompat, 'Both app loader copies must match');

const runtime = { console, Date, JSON, Math, Number, String, Array, Object, Error };
vm.createContext(runtime);
vm.runInContext(season, runtime);
runtime.realityTvQuestionTemplatesForSeason_ = () => [];
runtime.realityTvLatestQuestionBuildStateForSeason_ = () => null;
runtime.realityTvLatestCompletedQuestionBuildStateForSeason_ = () => null;

const mixedApproved = runtime.realityTvApprovalProgress_({
  ReviewStatus: 'APPROVED',
  ApprovalStage: 'FINALIZE_CURRENT',
  PushStatus: 'EPISODE SETTLED',
  EpisodeFinalizeMode: 'ALL_RESULTS',
  ApprovalStartedAt: new Date(Date.now() - 600000),
  ApprovalHeartbeatAt: new Date(Date.now() - 600000)
});
assert.strictEqual(mixedApproved.percent, 100, 'Approved mixed-state rows must report 100 percent');
assert.strictEqual(mixedApproved.stalled, false, 'Approved mixed-state rows must not be reported as stalled');

console.log('Reality TV approval completion race v1.2.9 tests passed.');
