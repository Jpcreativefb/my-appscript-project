const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const season = fs.readFileSync(path.join(root, 'backend/engines/RealityTvSeasonEngine.js'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'frontend/js/pages/adminRealityTv.js'), 'utf8');
const app = fs.readFileSync(path.join(root, 'frontend/js/app.js'), 'utf8');
const appCompat = fs.readFileSync(path.join(root, 'frontend/app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'frontend/app.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'frontend/sw.js'), 'utf8');

assert(season.includes('const processingLeaseMs = 420000;'), 'Main episode approval worker lease must be long enough to prevent two-minute overlap');
assert(season.includes('reviewStatus === "APPROVED" || currentStage === "COMPLETE"'), 'Stage claim must refuse an already-complete queue');
assert(season.includes('const currentAfterSettlement = realityTvSpreadsheetRetry_("Verify Reality TV settlement claim"'), 'SETTLE must re-check its claim before advancing');
assert(season.includes('realityTvNumber_(currentAfterSettlement.ApprovalAttemptCount, 0) !== realityTvNumber_(attempts, 0)'), 'A stale SETTLE worker must not overwrite a newer attempt');
assert(season.includes('Approved is authoritative; normalize the'), 'Approval-state polling must repair mixed approved/stale checkpoints');
assert(season.includes('PushStatus: "PUSHED"') && season.includes('ApprovalStage: "COMPLETE"'), 'Approved queue repair must canonicalize PUSHED/COMPLETE');
assert(ui.includes('if (reviewStatus === "APPROVED") stage = "COMPLETE";'), 'Frontend must always render approved queues as complete');
assert(ui.includes('kind === "question" ? 120 : 420'), 'Main approval stall UI must use the longer episode lease');
assert(app.includes('APP_ROUTE_HOTFIX_VERSION = "v1290-reality-tv-approval-race-fix"'), 'Route cache marker must be bumped');
assert.strictEqual(app, appCompat, 'Both app loader copies must match');
assert(html.includes('hotfix=v1290-reality-tv-approval-race-fix'), 'App shell must load the new route cache marker');
assert(sw.includes('awards-app-v314-reality-tv-approval-race-fix'), 'Service worker cache must be bumped');

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
